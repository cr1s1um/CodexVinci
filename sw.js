const CACHE='codexvinci-shell-v3';
const ASSETS=["/", "/index.html", "/style.css", "/src/app.mjs", "/src/controllers/editing.mjs", "/src/controllers/workspace-controller.mjs", "/src/domain.mjs", "/src/editing.mjs", "/src/infrastructure/local-storage.mjs", "/src/model/domain.mjs", "/src/model/workspace.mjs", "/src/store.mjs", "/src/views/dom.mjs", "/src/views/workspace-view.mjs"];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('codexvinci-shell-')&&k!==CACHE).map(k=>caches.delete(k))))])));
self.addEventListener('fetch',event=>{
  const u=new URL(event.request.url);
  if(event.request.method!=='GET'||u.origin!==self.location.origin||!ASSETS.includes(u.pathname))return;
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
});
