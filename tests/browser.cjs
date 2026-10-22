const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173');
 await page.getByLabel('Blocco 2',{exact:true}).fill('Appunti verificati nel browser');
 await page.getByLabel('Blocco 2',{exact:true}).blur();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('codexvinci-v1')).pages[0].blocks[1].text==='Appunti verificati nel browser');
 await page.getByRole('button',{name:'Kanban',exact:true}).click();
 await page.getByLabel('Nuova attività').fill('Test sync delle viste');
 await page.getByRole('button',{name:'+ Aggiungi',exact:true}).click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('codexvinci-v1')).tasks.length===4);
 // Il titolo è una proprietà DOM, non un attributo HTML: selezione tramite valore.
 const cards=page.locator('.card');
 for(let i=0;i<await cards.count();i++){if(await cards.nth(i).getByLabel('Titolo attività').inputValue()==='Test sync delle viste'){await cards.nth(i).getByLabel('Stato attività').selectOption('done');break;}}
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('codexvinci-v1')).tasks.at(-1).status==='done');
 await page.getByRole('button',{name:/Tabella/}).click();
 assert.equal(await page.getByLabel('Stato attività').last().inputValue(),'done');
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Esporta backup'}).click();await (await download).saveAs('test-backup.json');
 await page.getByRole('button',{name:'Kanban',exact:true}).click();
 await page.screenshot({path:'desktop-check.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:'mobile-check.png',fullPage:true});
 await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();
 await context.setOffline(true);await page.reload();
 assert.equal(await page.getByLabel('Blocco 2',{exact:true}).inputValue(),'Appunti verificati nel browser');
 await context.setOffline(false);
 const second=await context.newPage();await second.goto('http://127.0.0.1:4173');
 await page.getByLabel('Titolo pagina').fill('Modifica dalla scheda A');await page.getByLabel('Titolo pagina').blur();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('codexvinci-v1')).pages[0].title==='Modifica dalla scheda A');
 await second.getByLabel('Titolo pagina').fill('Modifica obsoleta B');await second.getByLabel('Titolo pagina').blur();
 await second.getByText('Archivio modificato da un’altra scheda. Ricarica prima di salvare.',{exact:true}).waitFor();
 assert.equal(await second.evaluate(()=>JSON.parse(localStorage.getItem('codexvinci-v1')).pages[0].title),'Modifica dalla scheda A');
 // Un payload HTML rimane testo e non esegue codice.
 await page.getByLabel('Blocco 2',{exact:true}).fill('<img src=x onerror="window.pwned=true">');await page.getByLabel('Blocco 2',{exact:true}).blur();
 await page.reload();assert.equal(await page.evaluate(()=>window.pwned),undefined);
 assert.deepEqual(errors,[]);
 console.log('PASS: UI editing, task table/board, export, mobile width, offline reload, concurrent tabs, inert HTML; zero page errors.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
