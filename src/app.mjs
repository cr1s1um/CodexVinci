import {id,seed,transition,parseArchive,tasksFor,STATUSES,MAX_BYTES} from './domain.mjs';
import {load,commit,KEY} from './store.mjs';
import {createQueue,createDrafts,DRAFT_KEY} from './editing.mjs';
const root=document.querySelector('#app');
const labels={todo:'Da fare',doing:'In corso',done:'Completato'};
let state, selected, view='document', query='', notice='Pronto · archivio locale';
const writes=createQueue(), timers=new Map();
let drafts;
// Nessun HTML proveniente dall'utente viene interpretato.
function el(tag,props={},...children){
  const n=document.createElement(tag);
  for(const [k,v] of Object.entries(props)) {
    if(k.startsWith('on')) n.addEventListener(k.slice(2),v);
    else if(k==='class') n.className=v;
    else if(k==='text') n.textContent=v;
    else if(k==='aria-label') n.setAttribute(k,v);
    else n[k]=v;
  }
  n.append(...children.filter(c=>c!==null)); return n;
}
const button=(text,fn,cls='')=>el('button',{text,onclick:fn,class:cls,type:'button'});
function status(message,error=false){notice=message;const n=document.querySelector('#status');if(n){n.textContent=message;n.className=error?'error':'';}}
function report(){console.warn('[workspace] operation_failed');status('Operazione non salvata. Esporta i dati e verifica l’errore mostrato.',true);}
async function save(action,redraw=true){
  return writes.run(async()=>{
    try{
      if(!navigator.locks) throw new Error('Browser privo di Web Locks: modifiche disabilitate per proteggere l’archivio.');
      await navigator.locks.request(KEY,()=>{state=commit(localStorage,transition(state,action),state.revision);});
      if(action.type==='page.rename'||typeof action.text==='string'||(action.type==='task.update'&&typeof action.title==='string')) drafts?.acknowledge(action);
      notice=drafts?.all().length?'Salvataggio parziale: bozze ancora presenti':'Salvato su questo browser';
      if(redraw) render(); else status(notice);
      return true;
    }catch(e){report();status(e.message,true);return false;}
  });
}
function textField(tag,props,base,property){
  const template={...base,[property]:props.value};
  const recovered=drafts?.get(template);
  if(recovered) props.value=recovered[property];
  const token=JSON.stringify(base);
  const stage=e=>{
    const action={...base,[property]:e.target.value};
    try{drafts.put(action);}catch{status('Bozza non conservata: esporta o copia il testo prima di uscire.',true);return;}
    clearTimeout(timers.get(token));
    status('Modifica in bozza · salvataggio in attesa');
    if(!e.isComposing) timers.set(token,setTimeout(()=>{timers.delete(token);save(action,false);},600));
  };
  const flush=e=>{
    clearTimeout(timers.get(token));timers.delete(token);
    const action={...base,[property]:e.target.value};
    try{drafts.put(action);}catch{status('Bozza non conservata; salvataggio diretto in corso.',true);}
    save(action,false);
  };
  return el(tag,{...props,oninput:stage,oncompositionend:stage,onchange:flush});
}
async function recoverDrafts(){
  if(!drafts?.all().length){status('Nessuna bozza da recuperare');return;}
  if(!confirm('Applicare le bozze di questa scheda ai dati caricati? Esporta prima un backup in caso di conflitti.'))return;
  for(const timer of timers.values())clearTimeout(timer);timers.clear();
  for(const action of drafts.all())if(!await save(action,false))return;
  render();
}
function discardDrafts(){
  if(!confirm('Eliminare le bozze non salvate di questa scheda?'))return;
  if(writes.pending){status('Attendi la fine dei salvataggi prima di eliminare le bozze.',true);return;}
  try{for(const timer of timers.values())clearTimeout(timer);timers.clear();drafts.clear();render();}catch(e){status(e.message,true);}
}

function download(raw,name){const url=URL.createObjectURL(new Blob([raw],{type:'application/json'}));const a=el('a',{href:url,download:name});a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function exportData(){download(JSON.stringify(state,null,2),'codexvinci-backup.json');status('Backup esportato');}
async function importData(file){
  if(!file)return;
  if(writes.pending||drafts?.all().length){status('Salva o elimina le bozze prima di importare un archivio.',true);return;}
  try{
    if(file.size>MAX_BYTES)throw new Error('File troppo grande (massimo 2 MB).');
    const imported=parseArchive(await file.text());
    if(writes.pending||drafts?.all().length)throw new Error('Modifiche in corso: completa il salvataggio prima dell’import.');
    if(!confirm('Sostituire l’archivio locale? Verrà scaricato prima un backup dei dati attuali.'))return;
    if(!navigator.locks)throw new Error('Web Locks richiesto.');
    exportData();
    await writes.run(()=>navigator.locks.request(KEY,()=>{
      if(drafts?.all().length)throw new Error('Nuove bozze presenti: import annullato.');
      state=commit(localStorage,{...imported,revision:state.revision+1},state.revision);
    }));
    selected=state.pages[0].id;notice='Archivio importato';render();
  }catch(e){report();status(e.message,true);}
}
function addPage(parentId=null){const title=prompt('Titolo della pagina');if(title?.trim())save({type:'page.add',id:id(),title:title.trim(),parentId});}
function taskEditor(t){
  return el('div',{class:'task-fields'},
    textField('input',{value:t.title,maxLength:300,'aria-label':'Titolo attività'},{type:'task.update',id:t.id},'title'),
    el('select',{'aria-label':'Stato attività',onchange:e=>save({type:'task.update',id:t.id,status:e.target.value})},...STATUSES.map(s=>el('option',{value:s,text:labels[s],selected:t.status===s}))),
    el('input',{type:'date',value:t.due,'aria-label':'Scadenza attività',onchange:e=>save({type:'task.update',id:t.id,due:e.target.value},false)}));
}
function taskArea(){
  const tasks=tasksFor(state,selected,query);
  const search=el('input',{placeholder:'Filtra attività…',value:query,'aria-label':'Filtra attività',oninput:e=>{query=e.target.value;const start=e.target.selectionStart;render();const n=document.querySelector('[aria-label="Filtra attività"]');n.focus();n.setSelectionRange(start,start);}});
  const title=el('input',{placeholder:'Aggiungi un’attività concreta…',required:true,maxLength:300,'aria-label':'Nuova attività'});
  const form=el('form',{class:'task-add',onsubmit:e=>{e.preventDefault();if(title.value.trim())save({type:'task.add',pageId:selected,id:id(),title:title.value.trim()});}},title,el('button',{type:'submit',text:'+ Aggiungi',class:'primary'}));
  const content=el('section',{},el('div',{class:'section-head'},el('h2',{text:'Attività del progetto'}),search),form);
  if(view==='board'){
    const board=el('div',{class:'board'});
    for(const statusKey of STATUSES){
      const items=tasks.filter(t=>t.status===statusKey);
      const column=el('section',{class:'column '+statusKey},el('h3',{text:`${labels[statusKey]} · ${items.length}`}));
      for(const task of items) column.append(el('article',{class:'card'},taskEditor(task)));
      if(!items.length) column.append(el('p',{class:'empty',text:'Nessuna attività'}));
      board.append(column);
    }
    content.append(board);
  }else{
    content.append(el('div',{class:'table-wrap'},el('table',{},el('thead',{},el('tr',{},el('th',{text:'Attività · stato · scadenza'}))),el('tbody',{},...tasks.map(t=>el('tr',{},el('td',{},taskEditor(t))))))));
    if(!tasks.length)content.append(el('p',{class:'empty',text:'Nessuna attività corrispondente.'}));
  }
  return content;
}
function documentArea(page){
  const area=el('section',{class:'document'});
  for(const [index,b] of page.blocks.entries()){
    const field=textField('textarea',{value:b.text,rows:b.type==='heading'?1:b.type==='code'?5:3,maxLength:20000,placeholder:b.type==='heading'?'Un titolo…':'Scrivi qui…','aria-label':`Blocco ${index+1}`,class:'block-text '+b.type},{type:'block.update',pageId:page.id,id:b.id},'text');
    const row=el('div',{class:'block'},el('span',{class:'block-label',text:b.type}),
      b.type==='checkbox'?el('input',{type:'checkbox',checked:b.checked,'aria-label':'Completa checkbox',onchange:e=>save({type:'block.update',pageId:selected,id:b.id,checked:e.target.checked},false)}):null,
      field,el('div',{class:'block-tools'},button('↑',()=>save({type:'block.move',pageId:selected,id:b.id,delta:-1})),button('↓',()=>save({type:'block.move',pageId:selected,id:b.id,delta:1})),button('×',()=>{if(confirm('Eliminare questo blocco?'))save({type:'block.delete',pageId:selected,id:b.id});})));
    area.append(row);
  }
  area.append(el('div',{class:'block-add'},...Object.entries({paragraph:'Testo',heading:'Titolo',code:'Codice',checkbox:'Checkbox'}).map(([type,label])=>button('+ '+label,()=>save({type:'block.add',pageId:selected,id:id(),blockType:type})))));
  return area;
}
function render(){
  const page=state.pages.find(p=>p.id===selected)??state.pages[0];selected=page.id;
  const nav=el('nav',{'aria-label':'Pagine'});
  // Iterazione per evitare stack overflow su archivi con gerarchie profonde.
  const queue=state.pages.filter(p=>p.parentId===null).map(p=>({p,depth:0}));
  while(queue.length){const {p,depth}=queue.shift();nav.append(button(`${depth?'↳ ':''}${p.title}`,()=>{selected=p.id;query='';render();},p.id===selected?'page-link selected':'page-link'));queue.unshift(...state.pages.filter(x=>x.parentId===p.id).map(p=>({p,depth:depth+1})));}
  const importer=el('input',{type:'file',accept:'.json,application/json',hidden:true,onchange:e=>importData(e.target.files[0])});
  const sidebar=el('aside',{},el('div',{class:'brand',text:'CodexVinci'}),el('p',{class:'eyebrow',text:'PERSONAL WORKSPACE · 0.1.2'}),el('div',{class:'sidebar-heading'},el('span',{text:'Le tue pagine'}),button('+',()=>addPage())),nav,
    el('div',{class:'sidebar-bottom'},el('p',{text:'Locale, tuo. Nessun account.'}),button('Esporta backup',exportData),button('Salva bozze',recoverDrafts),button('Esporta bozze',()=>download(JSON.stringify(drafts?.all()??[],null,2),'codexvinci-bozze.json')),button('Elimina bozze',discardDrafts),button('Importa archivio',()=>importer.click()),importer,el('small',{text:'Spike tecnico · Google e sync multidispositivo non implementati.'})));
  const count=state.tasks.filter(t=>t.pageId===selected).length;
  const main=el('main',{},el('header',{},el('span',{class:'breadcrumb',text:'Workspace / '+page.title}),el('span',{class:'badge',text:'LOCAL FIRST'})),
    el('div',{class:'page-heading'},el('p',{class:'eyebrow',text:'IL TUO SPAZIO DI LAVORO'}),textField('input',{class:'page-title',value:page.title,maxLength:200,'aria-label':'Titolo pagina'},{type:'page.rename',pageId:page.id},'title'),el('p',{class:'subtitle',text:'Appunti e attività, nello stesso posto.'}),button('+ Sottopagina',()=>addPage(selected))),
    el('div',{class:'tabs'},...Object.entries({document:'Documento',table:`Tabella · ${count}`,board:'Kanban'}).map(([key,label])=>button(label,()=>{view=key;render();},view===key?'tab active':'tab'))),
    view==='document'?documentArea(page):taskArea(),el('footer',{},el('span',{id:'status',text:notice}),el('span',{text:'Autosave dopo 600 ms · bozze nella sessione della scheda'})));
  root.replaceChildren(sidebar,main);
}
try{
  state=load(localStorage);drafts=createDrafts(sessionStorage);selected=state.pages[0].id;
  if(drafts.all().length)notice='Bozze recuperate nella scheda: controllale e usa Salva bozze.';
  render();
  window.addEventListener('beforeunload',e=>{if(writes.pending||drafts.all().length){e.preventDefault();e.returnValue='';}});
  // Gli archivi corrotti non vengono mai sostituiti automaticamente.
  window.addEventListener('storage',e=>{if(e.key===KEY)status('Modifica da un’altra scheda: ricarica per continuare.',true);});
  if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>status('Cache offline non disponibile; mantieni il server avviato.',true));
}catch{
  console.error('[workspace] load_failed');
  root.replaceChildren(el('main',{},el('h1',{text:'Archivio non leggibile'}),el('p',{text:'I dati non sono stati modificati. Conserva una copia prima di intervenire.'}),button('Scarica archivio originale',()=>download(localStorage.getItem(KEY)??'','archivio-da-recuperare.json')),button('Scarica bozze originali',()=>download(sessionStorage.getItem(DRAFT_KEY)??'','bozze-da-recuperare.json'))));
}
