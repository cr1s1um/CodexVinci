// Serializzazione dei commit: un errore non interrompe la coda successiva.
export function createQueue(){
  let tail=Promise.resolve(),pending=0;
  return {
    get pending(){return pending;},
    run(operation){
      pending++;
      const result=tail.then(operation);
      tail=result.catch(()=>{}).finally(()=>{pending--;});
      return result;
    },
    idle(){return tail;}
  };
}
export const DRAFT_KEY='codexvinci-drafts-v1';
export function draftKey(action){
  if(action.type==='page.rename')return `page:${action.pageId}`;
  if(action.type==='block.update' && typeof action.text==='string')return `block:${action.pageId}:${action.id}`;
  if(action.type==='task.update' && typeof action.title==='string')return `task:${action.id}`;
  throw new Error('Tipo bozza non supportato.');
}
function cleanAction(a){
  if(!a || typeof a!=='object')throw new Error('Bozza non valida.');
  const key=draftKey(a),validId=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(v);
  if(a.type==='page.rename'&&validId(a.pageId)&&typeof a.title==='string'&&a.title.length<=200)
    return {type:a.type,pageId:a.pageId,title:a.title};
  if(a.type==='block.update'&&validId(a.pageId)&&validId(a.id)&&a.text.length<=20000)
    return {type:a.type,pageId:a.pageId,id:a.id,text:a.text};
  if(a.type==='task.update'&&validId(a.id)&&a.title.length<=300)return {type:a.type,id:a.id,title:a.title};
  throw new Error('Bozza non valida: '+key.split(':')[0]);
}
export function createDrafts(storage){
  const raw=storage.getItem(DRAFT_KEY);
  if(raw && raw.length>2_000_000)throw new Error('Archivio bozze troppo grande.');
  const parsed=raw===null?[]:JSON.parse(raw);
  if(!Array.isArray(parsed)||parsed.length>1000)throw new Error('Archivio bozze non valido.');
  let values=new Map(parsed.map(a=>{const clean=cleanAction(a);return [draftKey(clean),clean];}));
  function write(next){
    const data=JSON.stringify([...next.values()]);
    if(data.length>2_000_000||next.size>1000)throw new Error('Limite bozze raggiunto.');
    storage.setItem(DRAFT_KEY,data);values=next;
  }
  return {
    all:()=>structuredClone([...values.values()]),
    get:a=>structuredClone(values.get(draftKey(a))),
    put(a){const clean=cleanAction(a),next=new Map(values);next.set(draftKey(clean),clean);write(next);},
    acknowledge(a){
      const clean=cleanAction(a),key=draftKey(clean);
      // Un vecchio commit non deve cancellare un input più recente.
      if(JSON.stringify(values.get(key))!==JSON.stringify(clean))return;
      const next=new Map(values);next.delete(key);write(next);
    },
    clear(){write(new Map());}
  };
}
