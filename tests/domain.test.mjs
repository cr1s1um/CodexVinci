import test from 'node:test';
import assert from 'node:assert/strict';
import {seed,transition,validate,parseArchive,tasksFor,MAX_BYTES} from '../src/domain.mjs';
import {commit,load,KEY} from '../src/store.mjs';
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
test('tabella e board condividono il record, senza mutare lo stato precedente',()=>{
  const before=seed(),after=transition(before,{type:'task.update',id:'t3',status:'done'});
  assert.equal(tasksFor(after,'welcome').find(t=>t.id==='t3').status,'done');
  assert.equal(before.tasks.find(t=>t.id==='t3').status,'todo');
  assert.equal(after.tasks.length,before.tasks.length);
});
test('export/import conserva tutte le entità',()=>{const s=seed();assert.deepEqual(parseArchive(JSON.stringify(s)),s);});
test('rifiuta gerarchie cicliche e parent mancanti',()=>{
  for(const parentId of ['welcome','missing']){const s=seed();s.pages[0].parentId=parentId;assert.throws(()=>validate(s));}
});
test('rifiuta ID duplicati e task orfani',()=>{
  const s=seed();s.tasks[0].id='welcome';assert.throws(()=>validate(s));
  const t=seed();t.tasks[0].pageId='missing';assert.throws(()=>validate(t));
});
test('rifiuta data impossibile e stato sconosciuto',()=>{
  assert.throws(()=>transition(seed(),{type:'task.update',id:'t1',due:'2026-02-30'}));
  assert.throws(()=>transition(seed(),{type:'task.update',id:'t1',status:'unknown'}));
});
test('import ostile: solo proprietà consentite, limiti e versione',()=>{
  const s=seed();s.pages[0].unexpected={html:'<script>evil()</script>'};assert.equal(validate(s).pages[0].unexpected,undefined);
  assert.throws(()=>parseArchive('x'.repeat(MAX_BYTES+1)));
  assert.throws(()=>validate({...seed(),schemaVersion:99}));
});
test('commit respinge revisione obsoleta senza sovrascrivere',()=>{
  const storage=memory();const a=transition(seed(),{type:'task.update',id:'t1',status:'doing'});
  commit(storage,a,0);
  assert.throws(()=>commit(storage,transition(seed(),{type:'task.update',id:'t2',status:'done'}),0));
  assert.deepEqual(load(storage),a);
});
test('errore quota propagato e stato precedente preservato',()=>{
  const s=seed();const storage={getItem:()=>JSON.stringify(s),setItem:()=>{throw new Error('quota');}};
  assert.throws(()=>commit(storage,transition(s,{type:'task.update',id:'t1',status:'doing'}),0),/quota/);
  assert.deepEqual(load(storage),s);
});
test('archivio corrotto non viene rimpiazzato da seed',()=>{
  const storage=memory();storage.setItem(KEY,'broken');assert.throws(()=>load(storage));assert.equal(storage.getItem(KEY),'broken');
});
test('spostamento blocchi e checkbox mantengono identificatori',()=>{
  let s=transition(seed(),{type:'block.move',pageId:'welcome',id:'b2',delta:-1});assert.equal(s.pages[0].blocks[0].id,'b2');
  s=transition(s,{type:'block.update',pageId:'welcome',id:'b3',checked:true});assert.equal(s.pages[0].blocks[2].checked,true);
});
