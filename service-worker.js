// Bump V on every release so installed copies update.
const V='angler-guide-v2-0',IMG='angler-guide-img-v2',SHELL=['./','./index.html','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./icon-maskable-512.png','./apple-touch-icon.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V&&x!==IMG).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  if(new URL(r.url).origin===location.origin){
    // Own files: network first (always the newest version), cache when offline.
    e.respondWith(fetch(r).then(res=>{const c=res.clone();caches.open(V).then(x=>x.put(r,c));return res}).catch(()=>caches.match(r).then(c=>c||caches.match('./index.html'))));
  }else if(r.destination==='image'){
    // Wiki images and maps: cache first so they work offline once seen.
    e.respondWith(caches.open(IMG).then(c=>c.match(r).then(hit=>hit||fetch(r).then(res=>{c.put(r,res.clone()).then(()=>c.keys()).then(k=>{if(k.length>400)c.delete(k[0])});return res}))));
  }
});
