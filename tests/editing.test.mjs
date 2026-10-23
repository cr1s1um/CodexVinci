import test from 'node:test';
import assert from 'node:assert/strict';
import {createQueue,createDrafts,DRAFT_KEY} from '../src/editing.mjs';
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
test('due salvataggi durante un commit lento vengono eseguiti in ordine',async()=>{
  const q=createQueue(),events=[];let release;
  const gate=new Promise(resolve=>release=resolve);
  const a=q.run(async()=>{events.push('a-start');await gate;events.push('a-end');});
  const b=q.run(()=>events.push('b'));await Promise.resolve();
  assert.deepEqual(events,['a-start']);release();await Promise.all([a,b]);await q.idle();
  assert.deepEqual(events,['a-start','a-end','b']);assert.equal(q.pending,0);
});
test('la coda prosegue dopo un errore',async()=>{
  const q=createQueue();await assert.rejects(q.run(()=>{throw new Error('quota');}));
  assert.equal(await q.run(()=>42),42);
});
test('bozza recuperata dopo reload e rimossa dopo conferma esatta',()=>{
  const storage=memory(),drafts=createDrafts(storage);
  const a={type:'page.rename',pageId:'welcome',title:''};drafts.put(a);
  const recovered=createDrafts(storage);assert.deepEqual(recovered.all(),[a]);
  recovered.acknowledge(a);assert.deepEqual(createDrafts(storage).all(),[]);
});
test('un commit precedente non elimina la bozza più recente',()=>{
  const drafts=createDrafts(memory()),a={type:'block.update',pageId:'welcome',id:'b1',text:'A'};
  drafts.put(a);drafts.put({...a,text:'AB'});drafts.acknowledge(a);
  assert.equal(drafts.get(a).text,'AB');
});
test('quota bozze non elimina lo stato precedente',()=>{
  const storage=memory(),drafts=createDrafts(storage),a={type:'task.update',id:'t1',title:'Prima'};
  drafts.put(a);storage.setItem=()=>{throw new Error('quota');};
  assert.throws(()=>drafts.put({...a,title:'Dopo'}),/quota/);assert.equal(drafts.get(a).title,'Prima');
});
test('bozze corrotte rifiutate senza sovrascrittura',()=>{
  const storage=memory();storage.setItem(DRAFT_KEY,'invalid');assert.throws(()=>createDrafts(storage));
  assert.equal(storage.getItem(DRAFT_KEY),'invalid');
});
