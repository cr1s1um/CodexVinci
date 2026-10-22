// Server di sviluppo: solo loopback, file consentiti, nessuna dipendenza.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
const files=new Map([['/','index.html'],['/index.html','index.html'],['/style.css','style.css'],['/sw.js','sw.js'],...["src/app.mjs", "src/controllers/editing.mjs", "src/controllers/workspace-controller.mjs", "src/domain.mjs", "src/editing.mjs", "src/infrastructure/local-storage.mjs", "src/model/domain.mjs", "src/model/workspace.mjs", "src/store.mjs", "src/views/dom.mjs", "src/views/workspace-view.mjs"].map(path=>[`/${path}`,path])]);
const types={html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',mjs:'text/javascript; charset=utf-8',js:'text/javascript; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
  try {
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
    const path=files.get(new URL(req.url,'http://localhost').pathname);
    if(!path){res.writeHead(404);res.end('Not found');return;}
    const body=await readFile(new URL(path,import.meta.url));
    res.writeHead(200,{'Content-Type':types[path.split('.').pop()], 'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cache-Control':'no-cache',
      'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});
    res.end(req.method==='HEAD'?undefined:body);
  }catch{console.error('[server] request_failed');res.writeHead(500);res.end('Internal error');}
});
server.on('error',e=>{console.error('[server]',e.code);process.exitCode=1;});
server.listen(4173,'127.0.0.1',()=>console.info('CodexVinci: http://127.0.0.1:4173'));
