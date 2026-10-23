import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {openDatabase,createIndexedRepository,createDraftRepository,INITIALIZED} from '../src/infrastructure/indexed-db.mjs';
import {createDurableDrafts} from '../src/controllers/durable-drafts.mjs';
import {seed,transition} from '../src/model/domain.mjs';
import {KEY} from '../src/infrastructure/local-storage.mjs';
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
const rename=title=>({type:'page.rename',pageId:'welcome',title});
async function setup(){const factory=new IDBFactory(),db=await openDatabase(factory),storage=memory(),repo=createIndexedRepository(db,'a');await repo.initialize(storage);return {factory,db,storage,repo};}
test('IndexedDB: migration preserves v1 source and retry does not overwrite edits',async()=>{
 const factory=new IDBFactory(),db=await openDatabase(factory),storage=memory();
 const old=transition(seed(),rename('Original'));storage.setItem(KEY,JSON.stringify(old));
 const repo=createIndexedRepository(db,'a');assert.deepEqual(await repo.initialize(storage),old);
 const next=transition(old,rename('New'));await repo.save(next,old.revision);
 assert.deepEqual(await repo.initialize(storage),next);assert.equal(storage.getItem(KEY),JSON.stringify(old));db.close();
});
test('IndexedDB: malformed legacy source aborts initialization, allowing corrected retry',async()=>{
 const db=await openDatabase(new IDBFactory()),storage=memory(),repo=createIndexedRepository(db,'a');storage.setItem(KEY,'broken');
 await assert.rejects(repo.initialize(storage));await assert.rejects(repo.load());
 assert.equal(storage.getItem(KEY),'broken');storage.setItem(KEY,JSON.stringify(seed()));assert.deepEqual(await repo.initialize(storage),seed());db.close();
});
test('IndexedDB: concurrent transactions admit exactly one writer per expected revision',async()=>{
 const h=await setup(),other=createIndexedRepository(h.db,'b'),base=await h.repo.load();
 const result=await Promise.allSettled([h.repo.save(transition(base,rename('A')),0),other.save(transition(base,rename('B')),0)]);
 assert.equal(result.filter(x=>x.status==='fulfilled').length,1);assert.equal((await h.repo.load()).revision,1);h.db.close();
});
test('IndexedDB: abort after put rolls back workspace and preserves draft',async()=>{
 const h=await setup(),drafts=createDraftRepository(h.db,'a');await drafts.put(rename('Draft'));
 const wrapper={transaction(...args){const tx=h.db.transaction(...args);tx.addEventListener('complete',()=>assert.fail('Must abort'),{once:true});const original=tx.objectStore.bind(tx);tx.objectStore=name=>{const store=original(name);if(name==='meta'){const put=store.put.bind(store);store.put=(...values)=>{const request=put(...values);request.addEventListener('success',()=>tx.abort());return request;};}return store;};return tx;}};
 const faulty=createIndexedRepository(wrapper,'a');await assert.rejects(faulty.save(transition(seed(),rename('Draft')),0,rename('Draft')));
 assert.equal((await h.repo.load()).revision,0);assert.equal((await drafts.list()).length,1);h.db.close();
});
test('IndexedDB: commit atomically ACKs exact draft but retains a newer draft',async()=>{
 const h=await setup(),drafts=createDraftRepository(h.db,'a');await drafts.put(rename('Newer'));
 const first=transition(seed(),rename('Older'));await h.repo.save(first,0,rename('Older'));assert.equal((await drafts.list())[0].action.title,'Newer');
 await h.repo.save(transition(first,rename('Newer')),1,rename('Newer'));assert.equal((await drafts.list()).length,0);h.db.close();
});
test('IndexedDB: drafts survive close/reopen and sessions cannot erase each other',async()=>{
 const h=await setup(),a=createDraftRepository(h.db,'a'),b=createDraftRepository(h.db,'b');await a.put(rename('A'));await b.put(rename('B'));h.db.close();
 const db=await openDatabase(h.factory),again=createDraftRepository(db,'a');assert.equal((await again.list()).length,2);
 await again.clearOwn();assert.deepEqual((await again.list()).map(x=>x.action.title),['B']);db.close();
});
test('IndexedDB: legacy draft import is idempotent even after its rows are removed',async()=>{
 const h=await setup(),d=createDraftRepository(h.db,'a');await d.importLegacy([rename('Legacy')],'abc');await d.importLegacy([rename('Legacy')],'abc');
 const rows=await d.list();assert.equal(rows.length,1);await d.removeExact(rows[0]);await d.importLegacy([rename('Legacy')],'abc');assert.equal((await d.list()).length,0);h.db.close();
});
test('IndexedDB: deletion sentinel prevents silent resurrection of obsolete v1',async()=>{
 const db=await openDatabase(new IDBFactory()),storage=memory();storage.setItem(INITIALIZED,'1');
 await assert.rejects(createIndexedRepository(db,'a').initialize(storage),/rimosso/);db.close();
});
test('IndexedDB: writes by legacy client are detected on reopening',async()=>{
 const h=await setup();h.storage.setItem(KEY,JSON.stringify(seed()));await assert.rejects(h.repo.initialize(h.storage),/precedente modificato/);h.db.close();
});
test('Durable buffer: failed storage keeps latest text in memory; ready retries before commit',async()=>{
 let fail=true,stored;
 const drafts=createDurableDrafts({put:async a=>{if(fail)throw new Error('quota');stored=a;},removeExact:async()=>{}},'a');
 drafts.put(rename('Kept'));await assert.rejects(drafts.settled(),/quota/);assert.equal(drafts.all()[0].title,'Kept');
 fail=false;await drafts.ready();assert.equal(stored.title,'Kept');await drafts.acknowledge(rename('Kept'));assert.equal(drafts.all().length,0);
});
test('Durable buffer: an older ACK never removes subsequent typing',async()=>{
 const h=await setup(),drafts=createDurableDrafts(createDraftRepository(h.db,'a'),'a');
 drafts.put(rename('A'));await drafts.ready();const ack=drafts.acknowledge(rename('A'));drafts.put(rename('AB'));await ack;await drafts.ready();
 assert.equal(drafts.all()[0].title,'AB');assert.equal((await createDraftRepository(h.db,'a').list())[0].action.title,'AB');h.db.close();
});
