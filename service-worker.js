// Bump V on every release. Installed copies download the new files in the background
// and show an "A new version is ready" banner; tapping Update switches to it.
// Pictures, maps (img/) and 3D textures (fish-tex/) are cached the first time they're viewed.
const V='angler-guide-v3-9',IMG='angler-guide-img-v2',SHELL=['./','./index.html','./app.js','./data/fish-data.js','./data/legendary.json','./data/missions.json','./data/collectibles.json','./data/gear.json','./data/this-week.json','./manifest.webmanifest','./fish3d.js','./fish-shapes.js','./vendor/three.module.min.js','./icon-32.png','./browserconfig.xml','./mstile-150x150.png','./icon-192.png','./icon-512.png','./icon-maskable-512.png','./apple-touch-icon.png','./favicon.ico'];
self.addEventListener('install',e=>e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL.map(u=>new Request(u,{cache:'reload'})))).then(()=>{if(!self.registration.active)return self.skipWaiting()})));
self.addEventListener('message',e=>{if(e.data==='skipWaiting')self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V&&x!==IMG).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);
  if(u.origin===location.origin&&u.pathname.endsWith('/data/this-week.json')){
    // This week's legendaries change weekly: always try the network first, fall back to the cached copy offline.
    e.respondWith(caches.open(V).then(c=>fetch(r).then(res=>{if(res.ok)c.put(r,res.clone());return res}).catch(()=>c.match(r,{ignoreSearch:true}).then(hit=>hit||Response.error()))));
  }else if(u.origin===location.origin){
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
