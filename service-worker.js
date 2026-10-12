// Bump V on every release. Installed copies download the new files in the background
// and show an "A new version is ready" banner; tapping Update switches to it.
// Fish textures (fish-tex/) are cached the first time each fish page is opened.
const V='angler-guide-v3-0',IMG='angler-guide-img-v2',SHELL=['./','./index.html','./manifest.webmanifest','./fish3d.js','./fish-shapes.js','./vendor/three.module.min.js','./icon.svg','./icon-192.png','./icon-512.png','./icon-maskable-512.png','./apple-touch-icon.png','./favicon.ico'];
self.addEventListener('install',e=>e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL.map(u=>new Request(u,{cache:'reload'})))).then(()=>{if(!self.registration.active)return self.skipWaiting()})));
self.addEventListener('message',e=>{if(e.data==='skipWaiting')self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V&&x!==IMG).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  if(new URL(r.url).origin===location.origin){
    // Own files: open instantly from the cache, refresh the cached copy in the background.
    e.respondWith(caches.open(V).then(c=>c.match(r,{ignoreSearch:true}).then(hit=>{
      const net=fetch(r).then(res=>{if(res.ok)c.put(r,res.clone());return res});
      if(hit){e.waitUntil(net.catch(()=>{}));return hit}
      return net.catch(()=>r.mode==='navigate'?c.match('./index.html'):Response.error());
    })));
  }else if(r.destination==='image'){
    // Wiki images and maps: cache first so they work offline once seen.
    e.respondWith(caches.open(IMG).then(c=>c.match(r).then(hit=>hit||fetch(r).then(res=>{c.put(r,res.clone()).then(()=>c.keys()).then(k=>{if(k.length>400)c.delete(k[0])});return res}))));
  }
});
