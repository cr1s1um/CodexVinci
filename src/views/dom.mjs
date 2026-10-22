// Nessun HTML proveniente dall'utente viene interpretato.
export function el(tag,props={},...children){
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
export const button=(text,fn,cls='')=>el('button',{text,onclick:fn,class:cls,type:'button'});
