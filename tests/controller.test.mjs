import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkspace} from '../src/model/workspace.mjs';
import {seed} from '../src/model/domain.mjs';
import {createWorkspaceController} from '../src/controllers/workspace-controller.mjs';
import {createDrafts} from '../src/controllers/editing.mjs';
import {createLocalRepository} from '../src/infrastructure/local-storage.mjs';
const memory = () => { const m = new Map(); return {getItem:k=>m.get(k)??null, setItem:(k,v)=>m.set(k,v)}; };
async function setup(repository) {
  const storage = memory(), session = memory(), timers = new Map(), snapshots = [], messages = [], downloads = [], logs = [];
  let timerId = 0;
  const model = await createWorkspace(repository ?? createLocalRepository(storage, {request:(_, fn)=>fn()}));
  const drafts = createDrafts(session);
  const clock = {setTimeout(fn, delay) { assert.equal(delay, 600); timers.set(++timerId, fn); return timerId; }, clearTimeout(id) { timers.delete(id); }};
  const ui = {render:s=>snapshots.push(s), status:(...m)=>messages.push(m), confirm:()=>true, prompt:()=>null, download:(...d)=>downloads.push(d)};
  const controller = createWorkspaceController({model, drafts, ui, clock, logger:{warn:m=>logs.push(m)}});
  return {controller, model, drafts, storage, session, timers, snapshots, messages, downloads, logs, ui};
}
const rename = title => ({type:'page.rename', pageId:'welcome', title});
test('MVC: table and board observe the same persisted task; view snapshots are detached', async()=>{
  const h=await setup();
  await h.controller.save({type:'task.update',id:'t3',status:'done'});
  h.controller.selectView('table'); const table=h.snapshots.at(-1);
  h.controller.selectView('board'); const board=h.snapshots.at(-1);
  assert.deepEqual(table.tasks,board.tasks);assert.equal(board.tasks.find(t=>t.id==='t3').status,'done');
  board.state.tasks[0].title='UI mutation'; assert.notEqual(h.model.snapshot().tasks[0].title,'UI mutation');
});
test('MVC: delayed commits are serialized and dispatched commands are immutable',async()=>{
  let release, current=seed(), calls=0;
  const gate=new Promise(r=>release=r);
  const h=await setup({load:()=>current,save:async(next,revision)=>{if(++calls===1)await gate;assert.equal(revision,current.revision);current=next;return next;}});
  const first=h.controller.save(rename('A'));
  const command=rename('B'),second=h.controller.save(command);command.title='Mutated';
  await Promise.resolve();assert.equal(h.model.snapshot().revision,0);
  release();assert.deepEqual(await Promise.all([first,second]),[true,true]);
  assert.equal(h.model.snapshot().pages[0].title,'B');assert.equal(current.revision,2);
});
test('MVC: storage failure preserves model and draft, then queue can retry',async()=>{
  let fail=true;
  const h=await setup({load:seed,save:next=>{if(fail)throw new Error('quota');return next;}});
  h.drafts.put(rename('Retry'));assert.equal(await h.controller.save(rename('Retry')),false);
  assert.equal(h.model.snapshot().revision,0);assert.equal(h.drafts.all().length,1);
  assert.deepEqual(h.logs,['[workspace] operation_failed']);
  fail=false;assert.equal(await h.controller.save(rename('Retry')),true);assert.equal(h.drafts.all().length,0);
});
test('MVC: debounce cancels stale input; composition waits; flush prevents duplicate timer',async()=>{
  const h=await setup();h.controller.stage(rename('A'));h.controller.stage(rename('AB'),true);
  assert.equal(h.timers.size,0);assert.equal(h.model.snapshot().revision,0);
  h.controller.stage(rename('ABC'));assert.equal(h.timers.size,1);
  await h.controller.flush(rename('ABCD'));assert.equal(h.timers.size,0);
  assert.equal(h.model.snapshot().pages[0].title,'ABCD');assert.equal(h.drafts.all().length,0);
  h.controller.stage(rename('Autosave'));
  for(const run of [...h.timers.values()])run();await h.controller.idle();
  assert.equal(h.model.snapshot().pages[0].title,'Autosave');assert.equal(h.controller.hasPending(),false);
});
test('MVC: import backs up confirmed data and keeps local revision sequence',async()=>{
  const h=await setup();await h.controller.save(rename('Before'));
  const incoming=seed();incoming.revision=400;incoming.pages[0].title='Imported';
  const raw=JSON.stringify(incoming);await h.controller.importData({size:raw.length,text:async()=>raw});
  assert.equal(JSON.parse(h.downloads[0][0]).pages[0].title,'Before');
  assert.equal(h.model.snapshot().revision,2);assert.equal(h.model.snapshot().pages[0].title,'Imported');
});
test('MVC: import rechecks edits arriving while a file is read',async()=>{
  const h=await setup();let release;
  const loading=h.controller.importData({size:100,text:()=>new Promise(r=>release=r)});
  h.controller.stage(rename('Unsaved'),true);release(JSON.stringify(seed()));await loading;
  assert.equal(h.downloads.length,0);assert.equal(h.model.snapshot().revision,0);assert.equal(h.drafts.all().length,1);
});
test('MVC: stale tab cannot overwrite another controller commit',async()=>{
  const storage=memory(),repository=createLocalRepository(storage,{request:(_,fn)=>fn()});
  const a=await setup(repository),b=await setup(repository);
  await a.controller.save(rename('A'));assert.equal(await b.controller.save(rename('B')),false);
  assert.equal((await repository.load()).pages[0].title,'A');assert.equal(b.model.snapshot().revision,0);
});
test('MVC: no Web Locks means no writes; archive remains intact',async()=>{
  const storage=memory(),h=await setup(createLocalRepository(storage,null));
  assert.equal(await h.controller.save(rename('Blocked')),false);assert.equal(h.model.snapshot().revision,0);
});
test('MVC: draft discard cancels pending autosave without writing the model',async()=>{
  const h=await setup();h.controller.stage(rename('Discard'));await h.controller.discardDrafts();
  assert.equal(h.timers.size,0);assert.equal(h.drafts.all().length,0);assert.equal(h.model.snapshot().revision,0);
});
