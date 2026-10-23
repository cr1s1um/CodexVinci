const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {once}=require('node:events');
const {mkdir,mkdtemp,rm}=require('node:fs/promises');
const {tmpdir}=require('node:os');
const {join}=require('node:path');
const {setTimeout:delay}=require('node:timers/promises');

async function readStore(page,store,key){
 return page.evaluate(({store,key})=>new Promise((resolve,reject)=>{
  const opening=indexedDB.open('codexvinci',1);opening.onerror=()=>reject(opening.error);
  opening.onsuccess=()=>{const db=opening.result,tx=db.transaction(store),request=key===null?tx.objectStore(store).getAll():tx.objectStore(store).get(key);let result;
   request.onsuccess=()=>{result=request.result;};tx.oncomplete=()=>{db.close();resolve(result);};tx.onabort=()=>{db.close();reject(tx.error);};};
 }),{store,key});
}
async function waitForState(page,check){
 for(let i=0;i<100;i++){const state=await readStore(page,'meta','workspace');if(check(state))return state;await delay(50);}
 throw new Error('Persisted state did not satisfy expectation');
}
async function waitForDraft(page,text){
 for(let i=0;i<100;i++){const rows=await readStore(page,'drafts',null);if(rows.some(r=>(r.action.title??r.action.text)===text))return rows;await delay(50);}
 throw new Error('Durable draft missing');
}
(async()=>{
 const server=spawn(process.execPath,['server.mjs'],{stdio:['ignore','pipe','pipe']});let browser;
 try{
  await Promise.race([once(server.stdout,'data'),once(server,'exit').then(()=>{throw new Error('Server exited before startup');}),once(server,'error').then(([e])=>{throw e;})]);
  const launchOptions={headless:true,executablePath:process.env.CODEXVINCI_CHROMIUM_PATH||undefined,args:process.env.CODEXVINCI_CHROMIUM_PATH?['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote']:[]};
  browser=await chromium.launch(launchOptions);
  console.log('Browser:',await browser.version());
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),errors=[];
  context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
  const page=await context.newPage();await page.goto('http://127.0.0.1:4173');
  await page.getByLabel('Blocco 2',{exact:true}).fill('Appunti verificati nel browser');
  await page.getByLabel('Blocco 2',{exact:true}).blur();
  await waitForState(page,s=>s.pages[0].blocks[1].text==='Appunti verificati nel browser');
  await page.getByRole('button',{name:'Kanban',exact:true}).click();
  await page.getByLabel('Nuova attività').fill('Test viste');await page.getByRole('button',{name:'+ Aggiungi',exact:true}).click();
  await waitForState(page,s=>s.tasks.length===4);
  const card=page.locator('.card').filter({has:page.getByRole('textbox',{name:'Titolo attività'})});
  for(let i=0;i<await card.count();i++)if(await card.nth(i).getByLabel('Titolo attività').inputValue()==='Test viste'){await card.nth(i).getByLabel('Stato attività').selectOption('done');break;}
  await waitForState(page,s=>s.tasks.at(-1).status==='done');
  await page.getByRole('button',{name:/Tabella/}).click();assert.equal(await page.getByLabel('Stato attività').last().inputValue(),'done');
  await mkdir('test-results',{recursive:true});
  const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Esporta backup',exact:true}).click();await (await downloaded).saveAs('test-results/backup.json');
  await page.getByRole('button',{name:'Kanban',exact:true}).click();await page.screenshot({path:'test-results/desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:'test-results/mobile.png',fullPage:true});
  await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await context.setOffline(true);await page.reload();
  assert.equal(await page.getByLabel('Blocco 2',{exact:true}).inputValue(),'Appunti verificati nel browser');await context.setOffline(false);

  const second=await context.newPage();await second.goto('http://127.0.0.1:4173');
  await second.getByLabel('Titolo pagina').waitFor();
  await page.getByLabel('Titolo pagina').fill('Scheda A');await page.getByLabel('Titolo pagina').blur();await waitForState(page,s=>s.pages[0].title==='Scheda A');
  await second.getByLabel('Titolo pagina').fill('Scheda B obsoleta');await second.getByLabel('Titolo pagina').blur();
  await second.getByText('Archivio modificato da un’altra scheda. Ricarica prima di salvare.',{exact:true}).waitFor();
  await waitForDraft(second,'Scheda B obsoleta');assert.equal((await readStore(second,'meta','workspace')).pages[0].title,'Scheda A');
  await page.getByRole('button',{name:'Recupera altre sessioni',exact:true}).click();
  await page.getByText('Sessioni attive escluse: chiudi le altre schede prima di recuperarle.',{exact:true}).waitFor();
  await second.close();await page.reload();
  page.on('dialog',d=>d.accept());
  await page.getByRole('button',{name:'Recupera altre sessioni',exact:true}).click();
  await waitForState(page,s=>s.pages[0].title==='Scheda B obsoleta');
  for(let i=0;i<100&&(await readStore(page,'drafts',null)).length;i++)await delay(50);
  assert.equal((await readStore(page,'drafts',null)).length,0);
  await page.getByLabel('Blocco 2',{exact:true}).fill('<img src=x onerror="window.pwned=true">');await page.getByLabel('Blocco 2',{exact:true}).blur();
  await waitForState(page,s=>s.pages[0].blocks[1].text.startsWith('<img'));await page.reload();assert.equal(await page.evaluate(()=>window.pwned),undefined);

  // Exercise actual IndexedDB rollback after a put, not only its in-memory test double.
  assert.equal(await page.evaluate(async()=>{
   const {openDatabase,createIndexedRepository}=await import('/src/infrastructure/indexed-db.mjs');
   const {transition}=await import('/src/model/domain.mjs');const db=await openDatabase(indexedDB),repo=createIndexedRepository(db,'fault-test'),before=await repo.load();
   const proxy={transaction(...args){const tx=db.transaction(...args),original=tx.objectStore.bind(tx);tx.objectStore=name=>{const store=original(name);if(name==='meta'){const put=store.put.bind(store);store.put=(...values)=>{const r=put(...values);r.addEventListener('success',()=>tx.abort());return r;};}return store;};return tx;}};
   let rejected=false;try{await createIndexedRepository(proxy,'fault-test').save(transition(before,{type:'page.rename',pageId:before.pages[0].id,title:'Must rollback'}),before.revision);}catch{rejected=true;}
   const after=await repo.load();db.close();return rejected&&JSON.stringify(before)===JSON.stringify(after);
  }),true);

  // A distinct profile verifies migration and legacy draft recovery without touching real data.
  const migration=await browser.newContext();
  await migration.addInitScript(()=>{
   if(localStorage.getItem('test-setup'))return;
   localStorage.setItem('test-setup','1');
   localStorage.setItem('codexvinci-v1',JSON.stringify({schemaVersion:1,revision:7,pages:[{id:'old',title:'Legacy',parentId:null,blocks:[]}],tasks:[]}));
   sessionStorage.setItem('codexvinci-drafts-v1',JSON.stringify([{type:'page.rename',pageId:'old',title:'Legacy draft'}]));
  });
  const migrated=await migration.newPage();migrated.on('pageerror',e=>errors.push(e.message));migrated.on('dialog',d=>d.accept());
  await migrated.goto('http://127.0.0.1:4173');await migrated.getByLabel('Titolo pagina').waitFor();
  assert.equal((await readStore(migrated,'meta','workspace')).revision,7);
  await migrated.getByRole('button',{name:'Recupera altre sessioni',exact:true}).click();await waitForState(migrated,s=>s.pages[0].title==='Legacy draft');
  await migrated.reload();assert.equal(await migrated.getByLabel('Titolo pagina').inputValue(),'Legacy draft');
  assert.equal(await migrated.evaluate(()=>JSON.parse(localStorage.getItem('codexvinci-v1')).pages[0].title),'Legacy');
  assert.equal((await readStore(migrated,'drafts',null)).length,0);
  await migration.close();assert.deepEqual(errors,[]);
  // Actual browser shutdown/relaunch with an isolated persistent profile.
  const profile=await mkdtemp(join(tmpdir(),'codexvinci-restart-'));let persistent;
  try {
   persistent=await chromium.launchPersistentContext(profile,launchOptions);
   let p=persistent.pages()[0];await p.goto('http://127.0.0.1:4173');
   await p.getByLabel('Blocco 2',{exact:true}).evaluate(field=>{field.value='Draft across browser restart';field.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true}));});
   await waitForDraft(p,'Draft across browser restart');await persistent.close();persistent=null;
   persistent=await chromium.launchPersistentContext(profile,launchOptions);
   p=persistent.pages()[0];p.on('dialog',d=>d.accept());await p.goto('http://127.0.0.1:4173');
   await p.getByRole('button',{name:'Recupera altre sessioni',exact:true}).click();
   await waitForState(p,s=>s.pages[0].blocks[1].text==='Draft across browser restart');
  } finally {await persistent?.close();await rm(profile,{recursive:true,force:true});}

  console.log('PASS: UI, table/board, export, mobile width, offline reload, stale writes, active-session protection, closed-session recovery, inert HTML, real rollback, legacy migration, full browser restart.');
 }finally{await browser?.close();if(server.exitCode===null){server.kill();await once(server,'exit');}}
})().catch(e=>{console.error(e);process.exitCode=1;});
