import {el, button} from './dom.mjs';
// View: presentation snapshots and semantic user intents only.
export function createWorkspaceView(root, controller) {
let state, selected, view, query, notice, error, filteredTasks, STATUSES;
const labels={todo:'Da fare',doing:'In corso',done:'Completato'};
function textField(tag, props, base, property) {
  const recovered = controller.draft({...base, [property]: props.value});
  if (recovered) props.value = recovered[property];
  const stage = e => controller.stage({...base, [property]: e.target.value}, e.isComposing);
  return el(tag, {...props, oninput: stage, oncompositionend: stage,
    onchange: e => controller.flush({...base, [property]: e.target.value})});
}
function taskEditor(t){
  return el('div',{class:'task-fields'},
    textField('input',{value:t.title,maxLength:300,'aria-label':'Titolo attività'},{type:'task.update',id:t.id},'title'),
    el('select',{'aria-label':'Stato attività',onchange:e=>controller.save({type:'task.update',id:t.id,status:e.target.value})},...STATUSES.map(s=>el('option',{value:s,text:labels[s],selected:t.status===s}))),
    el('input',{type:'date',value:t.due,'aria-label':'Scadenza attività',onchange:e=>controller.save({type:'task.update',id:t.id,due:e.target.value},false)}));
}
function taskArea(){
  const tasks=filteredTasks;
  const search=el('input',{placeholder:'Filtra attività…',value:query,'aria-label':'Filtra attività',oninput:e=>{const start=e.target.selectionStart;controller.search(e.target.value);const n=document.querySelector('[aria-label="Filtra attività"]');n.focus();n.setSelectionRange(start,start);}});
  const title=el('input',{placeholder:'Aggiungi un’attività concreta…',required:true,maxLength:300,'aria-label':'Nuova attività'});
  const form=el('form',{class:'task-add',onsubmit:e=>{e.preventDefault();if(title.value.trim())controller.save({type:'task.add',pageId:selected,id:controller.newId(),title:title.value.trim()});}},title,el('button',{type:'submit',text:'+ Aggiungi',class:'primary'}));
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
      b.type==='checkbox'?el('input',{type:'checkbox',checked:b.checked,'aria-label':'Completa checkbox',onchange:e=>controller.save({type:'block.update',pageId:selected,id:b.id,checked:e.target.checked},false)}):null,
      field,el('div',{class:'block-tools'},button('↑',()=>controller.save({type:'block.move',pageId:selected,id:b.id,delta:-1})),button('↓',()=>controller.save({type:'block.move',pageId:selected,id:b.id,delta:1})),button('×',()=>{controller.deleteBlock(selected,b.id);})));
    area.append(row);
  }
  area.append(el('div',{class:'block-add'},...Object.entries({paragraph:'Testo',heading:'Titolo',code:'Codice',checkbox:'Checkbox'}).map(([type,label])=>button('+ '+label,()=>controller.save({type:'block.add',pageId:selected,id:controller.newId(),blockType:type})))));
  return area;
}
function render(snapshot){
  ({state,selected,view,query,notice,error,tasks:filteredTasks,statuses:STATUSES}=snapshot);
  const page=state.pages.find(p=>p.id===selected)??state.pages[0];selected=page.id;
  const nav=el('nav',{'aria-label':'Pagine'});
  // Iterazione per evitare stack overflow su archivi con gerarchie profonde.
  const queue=state.pages.filter(p=>p.parentId===null).map(p=>({p,depth:0}));
  while(queue.length){const {p,depth}=queue.shift();nav.append(button(`${depth?'↳ ':''}${p.title}`,()=>{controller.selectPage(p.id);},p.id===selected?'page-link selected':'page-link'));queue.unshift(...state.pages.filter(x=>x.parentId===p.id).map(p=>({p,depth:depth+1})));}
  const importer=el('input',{type:'file',accept:'.json,application/json',hidden:true,onchange:e=>controller.importData(e.target.files[0])});
  const sidebar=el('aside',{},el('div',{class:'brand',text:'CodexVinci'}),el('p',{class:'eyebrow',text:'PERSONAL WORKSPACE · 0.1.3'}),el('div',{class:'sidebar-heading'},el('span',{text:'Le tue pagine'}),button('+',()=>controller.addPage())),nav,
    el('div',{class:'sidebar-bottom'},el('p',{text:'Locale, tuo. Nessun account.'}),button('Esporta backup',controller.exportData),button('Salva bozze',controller.recoverDrafts),button('Esporta bozze',()=>controller.exportDrafts()),button('Elimina bozze',controller.discardDrafts),button('Importa archivio',()=>importer.click()),importer,el('small',{text:'Spike tecnico · Google e sync multidispositivo non implementati.'})));
  const count=state.tasks.filter(t=>t.pageId===selected).length;
  const main=el('main',{},el('header',{},el('span',{class:'breadcrumb',text:'Workspace / '+page.title}),el('span',{class:'badge',text:'LOCAL FIRST'})),
    el('div',{class:'page-heading'},el('p',{class:'eyebrow',text:'IL TUO SPAZIO DI LAVORO'}),textField('input',{class:'page-title',value:page.title,maxLength:200,'aria-label':'Titolo pagina'},{type:'page.rename',pageId:page.id},'title'),el('p',{class:'subtitle',text:'Appunti e attività, nello stesso posto.'}),button('+ Sottopagina',()=>controller.addPage(selected))),
    el('div',{class:'tabs'},...Object.entries({document:'Documento',table:`Tabella · ${count}`,board:'Kanban'}).map(([key,label])=>button(label,()=>{controller.selectView(key);},view===key?'tab active':'tab'))),
    view==='document'?documentArea(page):taskArea(),el('footer',{},el('span',{id:'status',text:notice,class:error?'error':''}),el('span',{text:'Autosave dopo 600 ms · bozze nella sessione della scheda'})));
  root.replaceChildren(sidebar,main);
}
return {render, status(message, error=false) {
  const n=root.querySelector('#status');
  if(n){n.textContent=message;n.className=error?'error':'';}
}};
}
