import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {readdir, readFile} from 'node:fs/promises';

test('server: asset allowlist, CSP, method restrictions', {timeout:15000}, async()=>{
  const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),stdio:['ignore','pipe','pipe']});
  try {
    await Promise.race([
      once(child.stdout,'data'),
      once(child,'exit').then(()=>{throw new Error('Server exited before startup');}),
      once(child,'error').then(([error])=>{throw error;})
    ]);
    const modules=(await readdir(new URL('../src/',import.meta.url),{recursive:true})).filter(p=>p.endsWith('.mjs')).map(p=>'/src/'+p);
    const shell=await readFile(new URL('../sw.js',import.meta.url),'utf8');
    for(const module of modules)assert.ok(shell.includes(JSON.stringify(module)), 'Missing offline asset: '+module);
    for(const path of ['/','/index.html','/style.css','/sw.js',...modules]){
      const r=await fetch('http://127.0.0.1:4173'+path);
      assert.equal(r.status,200,path);
      assert.match(r.headers.get('content-security-policy'),/default-src 'self'/);
      assert.equal(r.headers.get('x-content-type-options'),'nosniff');
      assert.ok((await r.text()).length>0);
    }
    for(const path of ['/README.md','/package.json','/src/../server.mjs','/unknown']){
      assert.equal((await fetch('http://127.0.0.1:4173'+path)).status,404);
    }
    assert.equal((await fetch('http://127.0.0.1:4173/',{method:'POST'})).status,405);
    const head=await fetch('http://127.0.0.1:4173/',{method:'HEAD'});
    assert.equal(head.status,200);assert.equal(await head.text(),'');
  } finally {
    if(child.exitCode===null){child.kill();await once(child,'exit');}
  }
});
