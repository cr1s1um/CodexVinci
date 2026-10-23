export function draftKey(action){
  if(action.type==='page.rename')return `page:${action.pageId}`;
  if(action.type==='block.update' && typeof action.text==='string')return `block:${action.pageId}:${action.id}`;
  if(action.type==='task.update' && typeof action.title==='string')return `task:${action.id}`;
  throw new Error('Tipo bozza non supportato.');
}
export function cleanAction(a){
  if(!a || typeof a!=='object')throw new Error('Bozza non valida.');
  const key=draftKey(a),validId=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(v);
  if(a.type==='page.rename'&&validId(a.pageId)&&typeof a.title==='string'&&a.title.length<=200)
    return {type:a.type,pageId:a.pageId,title:a.title};
  if(a.type==='block.update'&&validId(a.pageId)&&validId(a.id)&&a.text.length<=20000)
    return {type:a.type,pageId:a.pageId,id:a.id,text:a.text};
  if(a.type==='task.update'&&validId(a.id)&&a.title.length<=300)return {type:a.type,id:a.id,title:a.title};
  throw new Error('Bozza non valida: '+key.split(':')[0]);
}
