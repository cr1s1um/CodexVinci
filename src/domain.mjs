// Modello indipendente dalla UI. Tutti gli ingressi vengono validati prima del commit.
export const STATUSES = ['todo', 'doing', 'done'];
export const BLOCKS = ['paragraph', 'heading', 'code', 'checkbox'];
export const MAX_BYTES = 2_000_000;
export const id = () => crypto.randomUUID();
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const text = (v, max, min = 0) => typeof v === 'string' && v.length >= min && v.length <= max;
const validId = v => typeof v === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(v);
export function validate(s) {
  assert(s && s.schemaVersion === 1, 'Versione archivio non supportata.');
  assert(Number.isSafeInteger(s.revision) && s.revision >= 0, 'Revisione non valida.');
  assert(Array.isArray(s.pages) && s.pages.length > 0 && s.pages.length <= 500, 'Numero pagine non valido.');
  assert(Array.isArray(s.tasks) && s.tasks.length <= 5000, 'Numero attività non valido.');
  const ids = new Set();
  const unique = v => { assert(validId(v) && !ids.has(v), 'ID non valido o duplicato.'); ids.add(v); };
  for (const p of s.pages) {
    unique(p.id);
    assert(text(p.title, 200, 1) && p.title.trim(), 'Titolo pagina richiesto (massimo 200 caratteri).');
    assert(p.parentId === null || validId(p.parentId), 'Parent non valido.');
    assert(Array.isArray(p.blocks) && p.blocks.length <= 1000, 'Blocchi non validi.');
    for (const b of p.blocks) {
      unique(b.id);
      assert(BLOCKS.includes(b.type) && text(b.text, 20000) && typeof b.checked === 'boolean', 'Blocco non valido.');
    }
  }
  const pages = new Map(s.pages.map(p => [p.id, p]));
  for (const p of s.pages) {
    const seen = new Set([p.id]);
    let parent = p.parentId;
    while (parent !== null) {
      assert(pages.has(parent) && !seen.has(parent), 'Gerarchia pagine non valida.');
      seen.add(parent); parent = pages.get(parent).parentId;
    }
  }
  for (const t of s.tasks) {
    unique(t.id);
    assert(pages.has(t.pageId), 'Pagina attività inesistente.');
    assert(text(t.title, 300, 1) && t.title.trim(), 'Titolo attività richiesto (massimo 300 caratteri).');
    assert(STATUSES.includes(t.status), 'Stato attività non valido.');
    assert(t.due === '' || (/^\d{4}-\d{2}-\d{2}$/.test(t.due) && Number.isFinite(Date.parse(t.due)) && new Date(t.due).toISOString().slice(0,10) === t.due), 'Data non valida.');
  }
  assert(new TextEncoder().encode(JSON.stringify(s)).length <= MAX_BYTES, 'Archivio troppo grande (2 MB).');
  // Whitelist: non conservare proprietà estranee provenienti da un import.
  return {schemaVersion: 1, revision: s.revision,
    pages: s.pages.map(p => ({id:p.id, title:p.title, parentId:p.parentId, blocks:p.blocks.map(b => ({id:b.id,type:b.type,text:b.text,checked:b.checked}))})),
    tasks: s.tasks.map(t => ({id:t.id,pageId:t.pageId,title:t.title,status:t.status,due:t.due}))};
}
export function parseArchive(raw) {
  assert(typeof raw === 'string' && new TextEncoder().encode(raw).length <= MAX_BYTES, 'File troppo grande.');
  return validate(JSON.parse(raw));
}
export function seed() {
  return validate({schemaVersion:1,revision:0,pages:[{id:'welcome',title:'Progetto sito scuola',parentId:null,blocks:[
    {id:'b1',type:'heading',text:'Uno spazio per pensare. E fare.',checked:false},
    {id:'b2',type:'paragraph',text:'Raccogli gli appunti del progetto e organizza le attività. Tabella e Kanban mostrano gli stessi record. Tutti i dati di esempio sono modificabili.',checked:false},
    {id:'b3',type:'checkbox',text:'Definire i contenuti della homepage',checked:false}
  ]}],tasks:[
    {id:'t1',pageId:'welcome',title:'Raccogliere i requisiti',status:'done',due:''},
    {id:'t2',pageId:'welcome',title:'Progettare la navigazione',status:'doing',due:''},
    {id:'t3',pageId:'welcome',title:'Verificare accessibilità e contrasto',status:'todo',due:''}
  ]});
}
export function transition(state, action) {
  const s = structuredClone(state);
  const page = () => { const p = s.pages.find(p => p.id === action.pageId); assert(p, 'Pagina inesistente.'); return p; };
  switch (action.type) {
    case 'page.add': s.pages.push({id:action.id,title:action.title,parentId:action.parentId ?? null,blocks:[]}); break;
    case 'page.rename': page().title = action.title; break;
    case 'block.add': page().blocks.push({id:action.id,type:action.blockType,text:'',checked:false}); break;
    case 'block.update': {
      const b=page().blocks.find(b=>b.id===action.id); assert(b,'Blocco inesistente.');
      if (action.text !== undefined) b.text=action.text;
      if (action.checked !== undefined) b.checked=action.checked;
      break;
    }
    case 'block.move': {
      const list=page().blocks; const i=list.findIndex(b=>b.id===action.id);
      assert(i>=0 && [-1,1].includes(action.delta),'Spostamento non valido.');
      const j=i+action.delta;
      if(j>=0 && j<list.length) [list[i],list[j]]=[list[j],list[i]];
      break;
    }
    case 'block.delete': page().blocks=page().blocks.filter(b=>b.id!==action.id); break;
    case 'task.add': page(); s.tasks.push({id:action.id,pageId:action.pageId,title:action.title,status:'todo',due:''}); break;
    case 'task.update': {
      const t=s.tasks.find(t=>t.id===action.id); assert(t,'Attività inesistente.');
      for (const key of ['title','status','due']) if(action[key]!==undefined) t[key]=action[key];
      break;
    }
    default: throw new Error('Comando sconosciuto.');
  }
  s.revision++; return validate(s);
}
export function tasksFor(state, pageId, query='') {
  return state.tasks.filter(t=>t.pageId===pageId && t.title.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
}
