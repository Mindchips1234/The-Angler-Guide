// Angler Guide app. Screens: Home, Reserves (reserve → fish), Log, Guides, plus the Settings sheet.
// Fish data lives in data/fish-data.js (DATA, RIMG); guide data is loaded from data/*.json when needed.
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)],esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const store={get(k,d){try{return localStorage.getItem('ag2.'+k)||d}catch(e){return d}},set(k,v){try{localStorage.setItem('ag2.'+k,v)}catch(e){}}};
const jget=(k,d)=>{try{const v=JSON.parse(store.get(k,''));return v==null?d:v}catch(e){return d}},jset=(k,v)=>store.set(k,JSON.stringify(v));
const REGION={'Izilo Zasendulo':'Mpumalanga, South Africa'};
const APP_VERSION='3.3',reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let unit=store.get('unit','metric'),tu=store.get('temp','celsius'),R=null,lastFish=null,built=null,scrollRv=0,hmap=null;
const home=$('#home'),rv=$('#rv'),fv=$('#fv'),lv=$('#lv'),gv=$('#gv'),back=$('#back'),sel=$('#rsel');
const haptic=(ms=10)=>{try{navigator.vibrate&&navigator.vibrate(ms)}catch(e){}};
let viewer3d=null,screen=null;const navStack=[];
const RESERVES=Object.keys(DATA.reserves);

// ---------------------------------------------------------------- units and formatting
const fmt=v=>(+v).toFixed(1).replace(/\.0$/,''),cf=v=>v*9/5+32;
const wt=w=>!w?'—':unit==='metric'?w:w.replace(/(\d+(?:\.\d+)?)\s*(kg|g)\b/g,(_,v,u)=>{const kg=u==='kg'?+v:v/1000,lb=kg*2.20462;return lb<1?fmt(kg*35.274)+' oz':fmt(lb)+' lb'});
const kgfmt=kg=>kg==null?'—':unit==='metric'?(kg<1?Math.round(kg*1000)+' g':(+kg.toFixed(2))+' kg'):(kg*2.20462<1?fmt(kg*35.274)+' oz':(+(kg*2.20462).toFixed(2))+' lb');
const sd=s=>!s?'—':unit==='metric'?s:String(s).replace(/\s*m$/,'').replace(/\d+(\.\d+)?/g,v=>fmt(v*3.28084))+' ft';
const dn=n=>n==null?'—':unit==='metric'?n+' m':fmt(n*3.28084)+' ft';
const tc=v=>v==null?'—':tu==='celsius'?fmt(v)+' °C':fmt(cf(v))+' °F';
const trange=t=>!t||t.min==null?'—':tu==='celsius'?`${fmt(t.min)}–${fmt(t.max)} °C`:`${fmt(cf(t.min))}–${fmt(cf(t.max))} °F`;
const rec=()=>DATA.reserves[R].records;
const match=(d,n,q)=>[n,...d.baits.map(b=>b[0]),...d.habitats,...(d.traits||[])].some(x=>x.toLowerCase().includes(q));
const imgFail=i=>{const f=document.createElement('div');f.className='imgFallback';f.textContent='🐟';i.replaceWith(f)};
const go=(r,f)=>{location.hash='/'+encodeURIComponent(r)+(f?'/'+encodeURIComponent(f):'')};
const nav=h=>{location.hash=h};
function goHome(){location.hash='/'}
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const opts=(a,selv)=>a.map(x=>`<option${x===selv?' selected':''}>${esc(x)}</option>`).join('');
const toastEl=$('#toast');let toastTimer=0;
function toast(msg){toastEl.textContent=msg;toastEl.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{toastEl.hidden=true},3200)}

// ---------------------------------------------------------------- ranks
const RANKS=['Juvenile','Bronze','Silver','Gold','Diamond'],RANK_ICON={Juvenile:'👶',Bronze:'🥉',Silver:'🥈',Gold:'🥇',Diamond:'💎',Legendary:'👑'};
const rankBadge=r=>r?`<span class="rank rank-${esc(r)}">${RANK_ICON[r]||''} ${esc(r)}</span>`:'';
function rankFor(rn,fn,kg){
  const rs=(DATA.reserves[rn]?.records[fn]?.ranks)||[];if(kg==null||!rs.length)return null;
  let best=rs[0].rank;for(const r of rs)if(r.min!=null&&kg>r.min-1e-9)best=r.rank;return best;
}
// Heaviest weight a fish can reach (top of its Diamond range), used to reject impossible catches.
function maxKgFor(rn,fn){const d=DATA.reserves[rn]?.records[fn];if(!d)return null;const rs=d.ranks||[];
  if(rs.length&&rs[rs.length-1].max!=null)return rs[rs.length-1].max;
  const m=[...String(d.weight||'').matchAll(/([\d.]+)\s*(kg|g)\b/g)].pop();return m?(m[2]==='g'?+m[1]/1000:+m[1]):null}
const HOOK_NOT_SOLD=new Set(['5/0','6/0','7/0','8/0','9/0','10/0']);

// ---------------------------------------------------------------- guide data (loaded on demand)
const GD={};
function guide(name){return GD[name]||(GD[name]=fetch('./data/'+name+'.json').then(r=>{if(!r.ok)throw new Error(r.status);return r.json()}).catch(e=>{delete GD[name];throw e}))}
const loadFail='<div class="mutedBox">This guide could not be loaded. It needs the app opened from a web address, or a connection the first time.</div>';

// ---------------------------------------------------------------- saved progress (this device)
// Log entry: {id, r: reserve, f: fish, w: weight in kg or null, rank, d: 'YYYY-MM-DD', n: note}
function getLog(){
  let log=jget('log',null);
  if(!Array.isArray(log)){ // first run of 3.1: turn the old "caught" list into log entries
    log=jget('caught',[]).map((k,i)=>{const [r,...p]=String(k).split('::');return{id:'m'+i,r,f:p.join('::'),w:null,rank:null,d:null,n:''}}).filter(e=>DATA.reserves[e.r]?.records[e.f]);
    jset('log',log);
  }
  return log;
}
const saveLog=l=>jset('log',l);
const LEGENDS_TOTAL=15; // legendary fish in data/legendary.json
const legendsCaught=()=>new Set(jget('legends',[]).filter(n=>n!=='Rubbert Ducky Junior'));
const toggleLegend=n=>{const s=legendsCaught();s.has(n)?s.delete(n):s.add(n);jset('legends',[...s]);return s.has(n)};
function bestFor(rn,fn,log=getLog()){ // best rank and heaviest weight logged for a fish
  let rank=null,w=null,s=null,any=false;
  for(const e of log)if(e.r===rn&&e.f===fn){any=true;if(e.s!=null&&(s==null||e.s>s))s=e.s;if(e.rank&&(rank==null||RANKS.indexOf(e.rank)>RANKS.indexOf(rank)))rank=e.rank;if(e.w!=null&&(w==null||e.w>w))w=e.w}
  return any?{rank,w,s}:null;
}

// ---------------------------------------------------------------- zoomable map
function mkMap(host,base){
  host.innerHTML=`<div class="mapviewport"><div class="mapcanvas"><img src="${base}" alt="Map"><div class="hotspotLayer hidden"><img alt="Hotspot overlay"></div></div></div><div class="maptools"><button data-z="in" aria-label="Zoom in">+</button><button data-z="out" aria-label="Zoom out">−</button><button data-z="reset" aria-label="Reset view">⌂</button><a class="mapfull" href="${base}" target="_blank" rel="noopener" aria-label="Open full map">↗</a></div>`;
  const vp=$('.mapviewport',host),cv=$('.mapcanvas',host),ly=$('.hotspotLayer',host),oi=$('img',ly),s={k:1,x:0,y:0},pts=new Map();let d0=1,k0=1;
  const ap=()=>cv.style.transform=`translate(${s.x}px,${s.y}px) scale(${s.k})`,cl=k=>Math.max(.75,Math.min(4,k)),dist=()=>{const [a,b]=[...pts.values()];return Math.hypot(a[0]-b[0],a[1]-b[1])||1};
  vp.onpointerdown=e=>{vp.setPointerCapture(e.pointerId);pts.set(e.pointerId,[e.clientX,e.clientY]);if(pts.size==2){d0=dist();k0=s.k}};
  vp.onpointermove=e=>{const p=pts.get(e.pointerId);if(!p)return;if(pts.size==1){s.x+=e.clientX-p[0];s.y+=e.clientY-p[1]}pts.set(e.pointerId,[e.clientX,e.clientY]);if(pts.size==2)s.k=cl(k0*dist()/d0);ap()};
  vp.onpointerup=vp.onpointercancel=e=>pts.delete(e.pointerId);
  vp.onwheel=e=>{if(!(e.ctrlKey||e.metaKey))return;e.preventDefault();s.k=cl(s.k*(e.deltaY<0?1.15:.87));ap()};
  host.onclick=e=>{const z=e.target.closest('[data-z]');if(!z)return;if(z.dataset.z==='reset'){s.k=1;s.x=s.y=0}else s.k=cl(s.k*(z.dataset.z==='in'?1.25:.8));ap()};
  const clear=()=>{ly.classList.add('hidden');cv.classList.remove('hotspot-active')};
  return{clear,show(url,fail){cv.classList.add('hotspot-active');oi.onload=()=>ly.classList.remove('hidden');oi.onerror=()=>{clear();fail&&fail()};oi.src=url}};
}

// ================================================================ HOME
function buildHome(){
  const fishTotal=RESERVES.reduce((sum,n)=>sum+DATA.reserves[n].fish.length,0);
  home.innerHTML=`<section class="homeHero">
    <div class="eyebrow">Your fishing companion</div>
    <h1>Find your next<br>great catch.</h1>
    <p>Every reserve, fish, legendary, mission and piece of gear in <em>The Angler</em>, plus a log for everything you catch.</p>
    <div class="stats"><span class="pill">🗺️ ${RESERVES.length} reserves</span><span class="pill">🐟 ${fishTotal} fish</span><span class="pill">👑 ${LEGENDS_TOTAL} legendaries</span></div>
    <div class="homeActions"><button class="primaryAction" id="browseReserves">Browse reserves <span aria-hidden="true">→</span></button><button class="secondaryAction" id="randomFish">Surprise me with a fish</button></div>
  </section>
  <section class="section toolCard thisWeek" id="thisWeek" aria-live="polite">
    <h2>👑 This week's legendaries</h2><p class="note" id="twWhen"></p>
    <div id="twList" class="twList"><div class="mutedBox">Loading…</div></div>
  </section>
  <section class="homeSearch">
    <label for="homeQuery">Looking for a specific fish?</label>
    <input class="input" id="homeQuery" type="search" placeholder="Search fish by name…" autocomplete="off">
    <div class="homeSearchControls"><select class="select" id="homeReserveFilter" aria-label="Filter fish by reserve"><option value="">All reserves</option>${opts(RESERVES)}</select></div>
    <div class="homeResultsMeta"><span id="homeResultsCount">Search across all reserves</span><button class="homeClear" id="clearHomeSearch" type="button">Clear</button></div>
    <div class="homeResults" id="homeResults" aria-live="polite"></div>
  </section>
  <section class="section toolCard biting" id="biting">
    <h2>🎣 What's biting?</h2><p>Tell it where and when you're fishing. It ranks the fish most likely to bite, using each fish's activity time, water temperature and bait preferences.</p>
    <div class="toolFields bitingFields">
      <label>Reserve<select id="bReserve" class="select">${opts(RESERVES,store.get('reserve',RESERVES[0]))}</select></label>
      <label>Time of day<select id="bTime" class="select"><option>Daytime</option><option>Nighttime</option></select></label>
      <label><span>Water temperature <span class="muted" id="bTempUnit"></span></span><input id="bTemp" class="input" type="number" inputmode="decimal" step="0.5" placeholder="Optional"></label>
      <label>Bait on your line<select id="bBait" class="select"></select></label>
    </div>
    <div id="bOut" class="bitingOut" aria-live="polite"></div>
  </section>
  <section class="section" id="reserveDirectory">
    <div class="homeSectionHead"><div><h2>Explore reserves</h2><p>Choose a destination to browse its fish, map and fishing information.</p></div></div>
    <div class="homeReserveGrid">${RESERVES.map(n=>{const r=DATA.reserves[n];return `<button class="homeReserve" data-home-reserve="${esc(n)}"><img src="${RIMG[n]||''}" alt="" loading="lazy" onerror="this.style.visibility='hidden'"><h3>${esc(n)}</h3><p>${esc(REGION[n]||r.region)}</p><div class="mini">${esc(r.stats.join(' · '))}</div><span class="linkbtn">Open reserve →</span></button>`}).join('')}</div>
  </section>`;
  home.oninput=e=>{if(e.target.id==='homeQuery')renderHomeResults(e.target.value);if(e.target.id==='bTemp')renderBiting()};
  home.onchange=e=>{if(e.target.id==='homeReserveFilter')renderHomeResults($('#homeQuery').value);if(e.target.id==='bReserve')fillBaits();if(/^b(Time|Bait)$/.test(e.target.id))renderBiting()};
  home.onclick=e=>{
    const card=e.target.closest('[data-home-reserve]');if(card)go(card.dataset.homeReserve);
    if(e.target.closest('#browseReserves'))$('#reserveDirectory').scrollIntoView({behavior:'smooth',block:'start'});
    if(e.target.closest('#randomFish')){const rname=RESERVES[Math.floor(Math.random()*RESERVES.length)],fish=DATA.reserves[rname].fish;go(rname,fish[Math.floor(Math.random()*fish.length)])}
    if(e.target.closest('#clearHomeSearch')){$('#homeQuery').value='';$('#homeReserveFilter').value='';renderHomeResults('');$('#homeQuery').focus()}
    const lg=e.target.closest('[data-legend]');if(lg)return nav('/guides/legendary/'+encodeURIComponent(lg.dataset.legend));
    const result=e.target.closest('[data-home-fish]');if(result){const [rname,...parts]=result.dataset.homeFish.split('::');go(rname,parts.join('::'))}
  };
  fillBaits();renderHomeResults('');renderThisWeek();
}
function renderHomeResults(query){
  const target=$('#homeResults');if(!target)return;
  const q=query.trim().toLowerCase(),selected=$('#homeReserveFilter').value;
  const names=selected?[selected]:RESERVES,matches=[];
  for(const rn of names){const r=DATA.reserves[rn];for(const n of r.fish){if(!q||n.toLowerCase().includes(q)){const d=r.records[n]||{};matches.push({reserve:rn,fish:n,bait:d.preferred||(d.baits&&d.baits[0]&&d.baits[0][0])||'See fish guide'})}}}
  $('#homeResultsCount').textContent=(q||selected)?(matches.length+' fish found'):'Search across all reserves';
  if(!q&&!selected){target.innerHTML='<div class="homeHint">Type a fish name or choose a reserve to browse its fish. Select any result to open its full guide.</div>';return}
  const shown=matches.slice(0,24);
  target.innerHTML=shown.length?shown.map(x=>'<button class="homeResult" data-home-fish="'+esc(x.reserve+'::'+x.fish)+'"><span><strong>'+esc(x.fish)+'</strong><small>'+esc(x.reserve)+'</small><small class="homeBait">Preferred bait: '+esc(x.bait)+'</small></span><span aria-hidden="true">→</span></button>').join('')+(matches.length>shown.length?'<div class="homeHint">Showing the first '+shown.length+' of '+matches.length+' results. Add more letters to narrow your search.</div>':''):'<div class="mutedBox">No fish found. Try another name or select a different reserve.</div>';
}

// ------------------------------------------------------------ this week's legendaries
// Each reserve has one legendary active per week, at one of its known spawn spots. The game picks
// them at random, so the app can't work them out: data/this-week.json lists the confirmed ones and
// is re-checked whenever the app opens. The week turns over every Wednesday at 10 pm US Eastern time.
const ROT_TZ='America/New_York',WD=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
function tzParts(t){
  const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:ROT_TZ,hourCycle:'h23',weekday:'short',year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'numeric',second:'numeric'}).formatToParts(t).map(x=>[x.type,x.value]));
  return{y:+p.year,m:+p.month,d:+p.day,h:+p.hour%24,min:+p.minute,s:+p.second,wd:WD.indexOf(p.weekday)};
}
function tzToUtc(y,m,d,h){ // wall-clock time in ROT_TZ -> timestamp (two passes settle the DST offset)
  const guess=Date.UTC(y,m-1,d,h);let t=guess;
  for(let i=0;i<2;i++){const p=tzParts(t);t=guess-(Date.UTC(p.y,p.m-1,p.d,p.h,p.min,p.s)-t)}
  return t;
}
function rotation(now=Date.now()){
  try{
    const p=tzParts(now);let back=(p.wd-3+7)%7;if(back===0&&p.h<22)back=7;
    const s=new Date(Date.UTC(p.y,p.m-1,p.d-back)),e=new Date(Date.UTC(p.y,p.m-1,p.d-back+7));
    return{key:s.toISOString().slice(0,10),start:tzToUtc(s.getUTCFullYear(),s.getUTCMonth()+1,s.getUTCDate(),22),end:tzToUtc(e.getUTCFullYear(),e.getUTCMonth()+1,e.getUTCDate(),22)};
  }catch(e){ // no time zone support: assume US Eastern standard time (UTC-5)
    const w=7*864e5,base=Date.UTC(2024,0,4,3),start=base+Math.floor((now-base)/w)*w;
    return{key:new Date(start-864e5).toISOString().slice(0,10),start,end:start+w};
  }
}
let TW=null,TWat=0,twTimer=0;
function thisWeek(){ // the shared file, fetched fresh at most every 10 minutes
  if(!TW||Date.now()-TWat>6e5){TWat=Date.now();TW=fetch('./data/this-week.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error(r.status);return r.json()}).catch(()=>{TWat=0;return{}})}
  return TW;
}
// Confirmed legendary and spot per reserve for the current week ({} until someone confirms them).
async function activeLegends(){const d=await thisWeek(),rot=rotation();return d&&d.week===rot.key&&d.reserves?d.reserves:{}}
function untilText(ms){const m=Math.max(1,Math.round(ms/6e4)),d=Math.floor(m/1440),h=Math.floor(m%1440/60),mm=m%60;return d?`${d}d ${h}h`:h?`${h}h ${mm}m`:`${mm}m`}
function renderTwWhen(){
  const el=$('#twWhen');if(!el)return;const r=rotation(),day=t=>new Date(t).toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short'});
  el.textContent=`This rotation: ${day(r.start)} to ${day(r.end)}. Next change ${new Date(r.end).toLocaleString(undefined,{weekday:'short',hour:'numeric',minute:'2-digit'})} your time (in ${untilText(r.end-Date.now())}).`;
}
async function renderThisWeek(){
  const box=$('#twList');if(!box)return;renderTwWhen();
  let L=[];try{L=await guide('legendary')}catch(e){}
  const act=await activeLegends(),got=legendsCaught();if(!$('#twList'))return;
  box.innerHTML=RESERVES.map(rn=>{
    const here=L.filter(l=>l.reserves[0]===rn),a=act[rn],l=a&&here.find(x=>x.name===a.legendary);
    if(l)return `<button class="twRow" data-legend="${esc(l.name)}"><img src="${l.image||''}" alt="" loading="lazy" onerror="imgFail(this)"><span><strong>${esc(l.name)}</strong><small>${esc(rn)}</small><small class="twSpot">📍 ${esc(a.spot||'Spot not confirmed yet')}</small></span>${got.has(l.name)?'<em>✓ Caught</em>':'<span aria-hidden="true">→</span>'}</button>`;
    return `<a class="twRow pending" href="#/guides/legendary"><img class="twLogo" src="${RIMG[rn]||''}" alt="" loading="lazy" onerror="this.style.visibility='hidden'"><span><strong>${esc(rn)}</strong><small>Not confirmed yet${here.length?': one of '+esc(here.map(x=>x.name).join(', ')):''}</small></span><span aria-hidden="true">→</span></a>`;
  }).join('');
  clearTimeout(twTimer);twTimer=setTimeout(()=>{TW=null;renderThisWeek()},Math.min(rotation().end-Date.now()+5e3,864e5));
}
setInterval(renderTwWhen,6e4);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&$('#twList')){TWat=0;renderThisWeek()}});

// "What's biting?": scores every fish in the reserve against time, water temperature and bait.
function fillBaits(){
  const rn=$('#bReserve').value,all=Object.values(DATA.reserves[rn].records),prior=$('#bBait').value;
  const baits=[...new Set(all.flatMap(d=>d.baits.map(b=>b[0])))].sort();
  $('#bBait').innerHTML='<option value="">Any bait</option>'+opts(baits,prior);renderBiting();
}
function renderBiting(){
  const out=$('#bOut');if(!out)return;
  const rn=$('#bReserve').value,tm=$('#bTime').value,bait=$('#bBait').value,raw=$('#bTemp').value.trim();
  $('#bTempUnit').textContent=tu==='celsius'?'(°C)':'(°F)';
  const t=raw===''||isNaN(+raw)?null:(tu==='celsius'?+raw:(+raw-32)*5/9);
  const res=DATA.reserves[rn],rows=[];
  for(const f of res.fish){
    const d=res.records[f];let s=50;const why=[];
    if(d.time.includes(tm)){s+=20;why.push(tm==='Daytime'?'☀️ Active by day':'🌙 Active at night')}else{s-=35;why.push(tm==='Daytime'?'Mostly bites at night':'Mostly bites by day')}
    if(t!=null){const T=d.temperature;
      if(t>=T.min&&t<=T.max){const span=Math.max(T.ideal-T.min,T.max-T.ideal)||1;s+=10+25*(1-Math.abs(t-T.ideal)/span);why.push(`🌡️ ${tc(t)} is in range (ideal ${tc(T.ideal)})`)}
      else{s-=45;why.push(`Water too ${t<T.min?'cold':'warm'} (likes ${trange(T)})`)}}
    if(bait){const b=d.baits.find(x=>x[0]===bait);if(!b)continue;s+=b[1]*.35;why.push(`🪝 Takes ${bait} (${b[1]}%)`)}
    rows.push({f,s,why,d});
  }
  rows.sort((a,b)=>b.s-a.s);
  const label=s=>s>=85?['Great','great']:s>=65?['Good','good']:s>=40?['Possible','ok']:['Unlikely','low'];
  out.innerHTML=rows.length?rows.slice(0,8).map(x=>{const [l,c]=label(x.s),dia=(x.d.ranks||[]).find(r=>r.rank==='Diamond');
    return `<button class="bitingRow" data-bf="${esc(x.f)}"><span class="fit fit-${c}">${l}</span><span><strong>${esc(x.f)}</strong><small>${x.why.map(esc).join(' · ')}</small>${dia?`<small class="muted">💎 Diamond over ${kgfmt(dia.min)} · hook ${esc(dia.hooks.join(', '))}</small>`:''}</span><span aria-hidden="true">→</span></button>`}).join('')
    +(rows.length>8?`<div class="homeHint">Top 8 of ${rows.length} fish that match.</div>`:''):'<div class="mutedBox">No fish in this reserve take that bait.</div>';
  out.onclick=e=>{const b=e.target.closest('[data-bf]');if(b)go(rn,b.dataset.bf)};
}

// ================================================================ RESERVE
function buildReserve(){
  const r=DATA.reserves[R],all=Object.values(r.records),baits=[...new Set(all.flatMap(d=>d.baits.map(b=>b[0])))].sort(),hab=[...new Set(all.flatMap(d=>d.habitats))].sort();
  rv.innerHTML=`<div class="hero"><div class="reserveHeroTop"><img class="reserveLogo" src="${RIMG[R]||''}" alt="" onerror="this.style.display='none'"><div><div class="eyebrow">Reserve guide · ${esc(REGION[R]||r.region)}</div><h1>${esc(R)}</h1></div></div><div class="stats">${r.stats.map(x=>`<div class="pill">${esc(x)}</div>`).join('')}</div></div>
<div class="section"><h2>Interactive map</h2><div class="searchbar"><input id="mq" class="input" placeholder="Find a fish, bait or habitat on the map…"><button class="switch" id="mclr" hidden>Clear overlay</button></div><div id="mres" class="note"></div><div class="hotspotChips" id="mchips"></div><div class="map" id="hmap"></div><div class="note">Drag to pan, pinch or +/− to zoom (Ctrl + scroll on desktop). Map art from The Angler Wiki.</div></div>
<div class="section" id="rLegends"></div>
<div class="section"><h2>Fish in ${esc(R)}</h2><div class="searchbar"><input id="q" class="input" placeholder="Search fish, bait, habitat or trait…"><select class="select" id="ftime"><option value="">Any time</option><option>Daytime</option><option>Nighttime</option></select><select class="select" id="ftemp"><option value="">Any temperature</option><option value="cool"></option><option value="warm"></option></select><select class="select" id="fbait"><option value="">Any bait</option>${opts(baits)}</select><select class="select" id="fhab"><option value="">Any habitat</option>${opts(hab)}</select></div><div id="fcount" class="note"></div><div class="grid" id="grid"></div></div>
<div class="section"><h2>Other reserves</h2><div class="reserveCards">${RESERVES.filter(n=>n!==R).map(n=>`<button class="reserveCard" data-r="${esc(n)}"><img class="reserveCardImg" src="${RIMG[n]||''}" alt="" loading="lazy" onerror="this.style.display='none'"><h3>${esc(n)}</h3><p>${esc(REGION[n]||DATA.reserves[n].region)}</p><div class="mini">${esc(DATA.reserves[n].stats.join(' · '))}</div></button>`).join('')}</div></div>`;
  hmap=mkMap($('#hmap'),r.map);
  const rn=R;guide('legendary').then(L=>{const here=L.filter(l=>l.reserves.includes(rn));if(R!==rn||!here.length)return;const got=legendsCaught();
    $('#rLegends').innerHTML=`<h2>Legendary fish here</h2><div class="legendGrid">${here.map(l=>legendCard(l,got)).join('')}</div>`}).catch(()=>{});
  rv.oninput=e=>{if(e.target.id==='mq')mapSearch();else renderGrid()};rv.onchange=e=>{if(e.target.id!=='mq')renderGrid()};
  rv.onclick=e=>{const f=e.target.closest('[data-f]'),o=e.target.closest('[data-r]'),c=e.target.closest('#mclr'),lg=e.target.closest('[data-legend]');
    if(c){hmap.clear();c.hidden=true;$('#mres').textContent='Overlay cleared.'}
    else if(lg)nav('/guides/legendary/'+encodeURIComponent(lg.dataset.legend));
    else if(o)go(o.dataset.r);
    else if(f){const n=f.dataset.f,d=r.records[n];if(f.closest('#mchips')&&d.hotspotMap){hmap.show(d.hotspotMap,()=>$('#mres').textContent=n+': hotspot image could not be loaded.');$('#mres').textContent=n+': wiki hotspot map shown. Other ranks can also be caught there; it is not a Diamond guarantee.';$('#mclr').hidden=false}else go(R,n)}};
  mapSearch();refresh();
}
function mapSearch(){
  const q=$('#mq').value.trim().toLowerCase(),r=DATA.reserves[R],list=r.fish.filter(n=>q?match(r.records[n],n,q):r.records[n].hotspotMap),has=r.fish.some(n=>r.records[n].hotspotMap);
  $('#mres').textContent=q?(list.length?`${list.length} match${list.length>1?'es':''} — tap a fish`:'No match in this reserve.'):has?'Tap a fish to overlay its hotspot map.':"Hotspot maps aren't published for this reserve yet. Zoom the full map or open a fish guide.";
  $('#mchips').innerHTML=list.map(n=>`<button class="hotspotChip" data-f="${esc(n)}">${esc(n)}${r.records[n].hotspotMap?'':' ↗'}</button>`).join('');
}
function renderGrid(){
  const r=DATA.reserves[R],q=$('#q').value.trim().toLowerCase(),tm=$('#ftime').value,tp=$('#ftemp').value,bt=$('#fbait').value,hb=$('#fhab').value,log=getLog();
  let list=r.fish.filter(n=>{const d=r.records[n];return(!q||match(d,n,q))&&(!tm||d.time.includes(tm))&&(!tp||(tp==='cool'?d.temperature.ideal<=10:d.temperature.ideal>10))&&(!bt||d.baits.some(b=>b[0]===bt))&&(!hb||d.habitats.includes(hb))});
  const pct=d=>(d.baits.find(b=>b[0]===bt)||[0,0])[1];if(bt)list.sort((a,b)=>pct(r.records[b])-pct(r.records[a]));
  $('#fcount').textContent=`${list.length} of ${r.fish.length} fish`;
  $('#grid').innerHTML=list.map(n=>{const d=r.records[n],b=bestFor(R,n,log);return`<button class="fish" data-f="${esc(n)}"><div class="fishpic"><img src="${d.image}" alt="" loading="lazy" decoding="async" onerror="imgFail(this)">${b?`<span class="caughtTag">${b.rank?RANK_ICON[b.rank]:'✓'}</span>`:''}</div><div class="fishbody"><h3>${esc(n)}</h3><p>${esc(wt(d.weight))} · Ideal ${tc(d.temperature.ideal)}</p>${bt?`<div class="hit">${esc(bt)} · ${pct(d)}%</div>`:''}</div></button>`}).join('')||'<div class="mutedBox">No fish match those filters.</div>';
}
function refresh(){
  $$('[data-u]').forEach(b=>b.classList.toggle('active',b.dataset.u===unit));$$('[data-t]').forEach(b=>b.classList.toggle('active',b.dataset.t===tu));
  $$('[data-theme-pick]').forEach(b=>b.classList.toggle('active',b.dataset.themePick===theme));
  const t=$('#ftemp');if(t&&!rv.hidden){t.options[1].text='Cool: ideal ≤ '+(tu==='celsius'?'10 °C':'50 °F');t.options[2].text='Warm: ideal > '+(tu==='celsius'?'10 °C':'50 °F');renderGrid()}
  if(lastFish&&!fv.hidden)fishDyn(lastFish);
  if(!home.hidden)renderBiting();
  if(screen==='log')buildLog();
  if(screen==='legend'||screen==='guide')route();
}

// ================================================================ FISH PAGE
function fishDyn(f){
  const d=rec()[f],F=(a,b)=>`<div class="row"><small>${a}</small><strong>${esc(b)}</strong></div>`;
  $('#fpills').innerHTML=`<div class="pill">🐟 ${esc(wt(d.weight))}</div><div class="pill">🌡️ Ideal ${tc(d.temperature.ideal)}</div><div class="pill">🕐 ${esc(d.time)}</div>`;
  $('#ffacts').innerHTML=F('Preferred bait',d.preferred)+F('Best time',d.time)+F('Max weight',wt(d.weight))+F('Water temp',trange(d.temperature))+F('Ideal temp',tc(d.temperature.ideal))+F('Spawn depth',sd(d.spawnDepth))+F('Max water depth',dn(d.maxDepth));
  const ranks=d.ranks||(d.hookRanks||[]).map(x=>({rank:x.rank,hooks:x.hooks})),lg=(DATA.legendaryHooks[R]||{})[f]||{};let unsold=false;
  const hooks=h=>h.length?h.map(x=>HOOK_NOT_SOLD.has(x)?(unsold=true,esc(x)+'*'):esc(x)).join(', '):'—';
  $('#franks').innerHTML=`<table class="hooks"><thead><tr><th>Rank</th><th>Weight</th><th>Hook</th></tr></thead><tbody>${ranks.map(x=>`<tr><td>${rankBadge(x.rank)}</td><td>${x.min!=null?`${kgfmt(x.min)} – ${kgfmt(x.max)}`:'—'}</td><td>${hooks(x.hooks)}</td></tr>`).join('')}${Object.entries(lg).map(([n,h])=>`<tr class="legendary-row"><td>${rankBadge('Legendary')}</td><td><a href="#/guides/legendary/${encodeURIComponent(n)}">${esc(n)}</a></td><td>${hooks(h)}</td></tr>`).join('')}</tbody></table>${unsold?'<div class="note">* Hook sizes above 4/0 are listed by the wiki but not sold in the shop.</div>':''}`;
  const b=bestFor(R,f);$('#fbest').innerHTML=b?`Your best: ${b.rank?rankBadge(b.rank):'caught'}${b.w!=null?' · '+kgfmt(b.w):''}${b.s!=null?' · ⭐ '+b.s.toLocaleString()+' pts':''}`:'';
}
function fishPage(f){
  const r=DATA.reserves[R],d=r.records[f],key=R+'/'+f;rv.hidden=true;fv.hidden=false;
  if(built!==key){built=key;
    const tag=a=>(a&&a.length?a:[]).map(x=>`<span class="tag">${esc(x)}</span>`).join('')||'<div class="mutedBox">Not listed.</div>',
    tiers=[...new Set(d.baits.map(b=>b[1]))].sort((a,b)=>b-a),
    baits=tiers.map(p=>`<div class="tier">${p}%</div>`+d.baits.filter(b=>b[1]===p).map(b=>`<span class="tag${b[0]===d.preferred?' pref':''}">${b[0]===d.preferred?'★ ':''}${esc(b[0])}</span>`).join('')).join('');
    fv.innerHTML=`<div class="hero"><div class="eyebrow">${esc(R)} · Fish guide</div><h1>${esc(f)}</h1><div class="stats" id="fpills"></div><div class="fishTools"><button class="toolAction primary" id="logThis">＋ Log a catch</button><button class="toolAction" id="copyFishSetup">Copy fishing setup</button></div><div id="fbest" class="note"></div><div id="fishActionNote" class="note" aria-live="polite"></div></div><div class="detailgrid section"><div><div class="card"><button type="button" class="imageWrap open3d" id="open3d" aria-label="View ${esc(f)} in 3D" aria-haspopup="dialog"><img class="heroimg" src="${d.image}" alt="${esc(f)}" onerror="imgFail(this)"><span class="badge3d" aria-hidden="true">3D · Tap to view</span></button><div class="rows" id="ffacts" style="margin-top:12px"></div><div class="section"><h2>Habitat</h2>${tag(d.habitats)}</div></div><div class="card" style="margin-top:18px"><h2>Hotspot map</h2>${d.hotspotMap?`<div class="map" id="fmap"></div><div class="note">${esc(d.hotspotStatus||'')} Drag to pan, pinch or +/− to zoom.</div>`:'<div class="mutedBox">No hotspot map is published for this species yet.</div>'}</div></div><div><div class="card"><h2>Ranks, weights &amp; hooks</h2><div id="franks"></div></div><div class="card" style="margin-top:18px"><h2>Bait &amp; lure preferences</h2>${baits}</div><div class="card" style="margin-top:18px"><h2>Traits</h2>${tag(d.traits)}</div></div></div><div class="source">Source: <a href="${d.source}" target="_blank" rel="noopener">The Angler Wiki</a> (community-maintained; may contain errors).</div>`;
    if(d.hotspotMap)mkMap($('#fmap'),r.map).show(d.hotspotMap);
    import('./fish3d.js').catch(()=>{}); // warm up so the 3D pop-up opens quickly
  }
  fishDyn(f);
}
async function copyFishSetup(rn,fn){
  const d=DATA.reserves[rn]?.records[fn];if(!d)return;
  const textOut='Angler Guide fishing setup\nReserve: '+rn+'\nTarget fish: '+fn+'\nPreferred bait: '+(d.preferred||'Not listed')+'\nBest time: '+(d.time||'Not listed')+'\nTop listed baits: '+d.baits.slice().sort((a,b)=>b[1]-a[1]).slice(0,5).map(b=>b[0]+' ('+b[1]+'%)').join(', ')+'\nHabitat: '+(d.habitats||[]).join(', ')+'\nSource: '+(d.source||'Angler Guide');
  const note=$('#fishActionNote');
  try{await navigator.clipboard.writeText(textOut);if(note)note.textContent='Fishing setup copied.'}
  catch(e){const area=document.createElement('textarea');area.value=textOut;area.style.position='fixed';area.style.opacity='0';document.body.appendChild(area);area.select();let ok=false;try{ok=document.execCommand('copy')}catch(_){}area.remove();if(note)note.textContent=ok?'Fishing setup copied.':'Copy is blocked by this browser. You can copy the setup from the fish guide manually.'}
}
function showFish(f){
  if(f){if(!lastFish)scrollRv=scrollY;fishPage(f);if(f!==lastFish)scrollTo(0,0)}
  else{rv.hidden=false;fv.hidden=true;if(lastFish)scrollTo(0,scrollRv)}
  lastFish=f;document.title=(f||R)+' · Angler Guide';
  if(f)fv.onclick=e=>{
    if(e.target.closest('#logThis'))openLogSheet(R,f);
    if(e.target.closest('#copyFishSetup')){copyFishSetup(R,f);haptic()}
    if(e.target.closest('#open3d'))open3d(f);
  };
}

// ---------------------------------------------------------------- 3D pop-up
// Opened from the fish picture; closed with ✕, Esc, a tap outside or the back button.
const dlg3d=$('#m3dDlg'),host3d=$('#m3d');
let open3dId=0,skipPop=0;
function open3d(f){
  if(dlg3d.open)return;
  const id=++open3dId;
  $('#m3dTitle').textContent=f;host3d.innerHTML='<div class="m3dMsg">Loading 3D model…</div>';
  dlg3d.showModal();haptic();
  if(!skipPop)history.pushState({m3d:1},''); // a pending back() re-adds the entry when it lands
  import('./fish3d.js').then(m=>{if(id!==open3dId||!dlg3d.open)return;if(viewer3d)viewer3d.dispose();viewer3d=m.mount(host3d,f)})
    .catch(()=>{if(id===open3dId)host3d.innerHTML='<div class="m3dMsg">The 3D model needs the app to be opened from a web address, not from a file on this device.</div>'});
}
// Tear the 3D view down as soon as the pop-up starts closing (the 'close' event can arrive a frame later).
function teardown3d(){open3dId++;if(viewer3d){viewer3d.dispose();viewer3d=null}host3d.innerHTML='';delete host3d.dataset.model}
function close3d(){if(dlg3d.open){teardown3d();dlg3d.close()}}
dlg3d.addEventListener('cancel',teardown3d);
dlg3d.addEventListener('close',()=>{teardown3d();if(history.state&&history.state.m3d){skipPop++;history.back()}});
dlg3d.addEventListener('click',e=>{const r=dlg3d.getBoundingClientRect(),out=e.target===dlg3d&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom);if(out||e.target.closest('#m3dClose'))close3d()});
// Back button closes the pop-up. Our own back() after closing is skipped (and if the
// pop-up was reopened meanwhile, its history entry is put back).
addEventListener('popstate',()=>{if(skipPop){skipPop--;if(dlg3d.open&&!skipPop)history.pushState({m3d:1},'');return}if(dlg3d.open)close3d()});

// ================================================================ LOG
const logDlg=$('#logDlg');
function openLogSheet(rn,fn){
  rn=rn||store.get('logReserve',R||RESERVES[0]);
  $('#lgReserve').innerHTML=opts(RESERVES,rn);fillLogFish(fn);
  $('#lgWeight').value='';$('#lgScore').value='';$('#lgWUnit').value=store.get('logWUnit',unit==='metric'?'kg':'lb');$('#lgDate').value=today();$('#lgNote').value='';$('#lgRank').value='';
  updateLogRank();logDlg.showModal();setTimeout(()=>$('#lgWeight').focus(),60);
}
function fillLogFish(fn){const rn=$('#lgReserve').value,fish=DATA.reserves[rn].fish;$('#lgFish').innerHTML=opts(fish,fn&&fish.includes(fn)?fn:fish[0]);updateLogRank()}
// Weight units in the log sheet: kilograms per unit, and how many decimals to show.
const W_UNITS={kg:[1,2],g:[.001,0],lb:[1/2.20462,2],oz:[1/35.274,1]};
const wUnit=()=>W_UNITS[$('#lgWUnit').value]?$('#lgWUnit').value:'kg';
const inUnit=(kg,u)=>+(kg/W_UNITS[u][0]).toFixed(W_UNITS[u][1]),fmtIn=(kg,u)=>inUnit(kg,u)+' '+u;
function logWeightKg(){const v=parseFloat(String($('#lgWeight').value).replace(',','.'));return isNaN(v)||v<=0?null:v*W_UNITS[wUnit()][0]}
// Live checks for the log sheet. Returns an error message for the weight, or '' when it's fine.
function weightError(){
  const raw=String($('#lgWeight').value).trim();if(raw==='')return '';
  const v=parseFloat(raw.replace(',','.'));if(isNaN(v)||v<=0)return 'Invalid weight: enter a number above 0.';
  const rn=$('#lgReserve').value,fn=$('#lgFish').value,max=maxKgFor(rn,fn),u=wUnit();
  // Compared in the chosen unit, rounded the same way as the message, so typing the maximum shown is accepted.
  return max!=null&&v>inUnit(max,u)?`Invalid weight: a ${fn} can't weigh more than ${fmtIn(max,u)}.`:'';
}
function scoreValue(){const raw=String($('#lgScore').value).trim();if(raw==='')return{v:null,err:''};const v=Number(raw);
  return Number.isInteger(v)&&v>=0?{v,err:''}:{v:null,err:'Invalid score: enter a whole number of points (0 or more).'}}
function showFieldError(id,input,msg){const el=$(id);el.textContent=msg;el.hidden=!msg;input.setAttribute('aria-invalid',msg?'true':'false')}
function updateLogRank(){
  const rn=$('#lgReserve').value,fn=$('#lgFish').value,werr=weightError(),kg=werr?null:logWeightKg(),auto=rankFor(rn,fn,kg),d=DATA.reserves[rn].records[fn];
  showFieldError('#lgError',$('#lgWeight'),werr);showFieldError('#lgScoreError',$('#lgScore'),scoreValue().err);
  $('#lgAuto').innerHTML=werr?'':auto?`Rank from weight: ${rankBadge(auto)}`:'Enter a weight to work out the rank, or pick it below.';
  $('#lgRankWrap').hidden=!!auto||!!werr;
  const max=(d.ranks||[]).slice(-1)[0];const u=wUnit();$('#lgHint').textContent=max?`${fn}: ${fmtIn(d.ranks[0].min,u)} to ${fmtIn(max.max,u)}. Diamond from ${fmtIn(max.min,u)}.`:'';
}
logDlg.addEventListener('input',e=>{if(e.target.id==='lgWeight'||e.target.id==='lgScore')updateLogRank()});
logDlg.addEventListener('change',e=>{if(e.target.id==='lgReserve')fillLogFish();if(e.target.id==='lgFish')updateLogRank();if(e.target.id==='lgWUnit'){store.set('logWUnit',e.target.value);updateLogRank()}});
logDlg.addEventListener('click',e=>{if(e.target.closest('#lgCancel'))logDlg.close()});
$('#logForm').addEventListener('submit',e=>{
  e.preventDefault();
  updateLogRank();const werr=weightError(),sc=scoreValue();
  if(werr||sc.err){haptic([30,40,30]);(werr?$('#lgWeight'):$('#lgScore')).focus();return}
  const rn=$('#lgReserve').value,fn=$('#lgFish').value,kg=logWeightKg(),rank=rankFor(rn,fn,kg)||$('#lgRank').value||null;
  const log=getLog(),prev=bestFor(rn,fn,log),entry={id:Date.now().toString(36),r:rn,f:fn,w:kg==null?null:+kg.toFixed(3),rank,s:sc.v,d:$('#lgDate').value||today(),n:$('#lgNote').value.trim()};
  log.push(entry);saveLog(log);store.set('logReserve',rn);logDlg.close();
  const pb=kg!=null&&(!prev||prev.w==null||kg>prev.w)&&prev;
  haptic(rank==='Diamond'?[20,40,20]:15);
  toast(`Logged ${fn}${rank?' · '+RANK_ICON[rank]+' '+rank:''}${pb?' · New personal best!':''}`);
  if(lastFish&&!fv.hidden)fishDyn(lastFish);if(!rv.hidden)renderGrid();if(screen==='log')buildLog();
});

function buildLog(){
  const log=getLog(),legends=legendsCaught(),species=new Map();
  for(const rn of RESERVES)for(const f of DATA.reserves[rn].fish){const b=bestFor(rn,f,log);if(b)species.set(rn+'::'+f,b)}
  const total=RESERVES.reduce((a,rn)=>a+DATA.reserves[rn].fish.length,0),dia=[...species.values()].filter(b=>b.rank==='Diamond').length;
  const lr=store.get('logFilterReserve',''),lf=store.get('logFilter','all');
  const recent=log.slice().sort((a,b)=>(b.d||'').localeCompare(a.d||'')||String(b.id).localeCompare(String(a.id))).slice(0,30);
  const tile=(n,of,label,icon)=>`<div class="statTile"><span>${icon}</span><strong>${n}${of?`<small>/${of}</small>`:''}</strong><em>${label}</em></div>`;
  lv.innerHTML=`<div class="hero"><div class="eyebrow">Saved on this device</div><h1>My log</h1>
    <div class="statTiles">${tile(species.size,total,'Fish caught','🐟')}${tile(dia,total,'Diamonds','💎')}${tile(legends.size,LEGENDS_TOTAL,'Legendaries','👑')}${tile(log.length,0,'Catches logged','📒')}</div>
    <div class="homeActions"><button class="primaryAction" id="lgNew">＋ Log a catch</button><button class="secondaryAction" id="lgBackup">Back up my log</button></div></div>
  <div class="section"><h2>Recent catches</h2>${recent.length?`<div class="logList">${recent.map(e=>{const d=DATA.reserves[e.r]?.records[e.f];if(!d)return'';
      return `<div class="logRow"><button class="logOpen" data-lo="${esc(e.r+'::'+e.f)}"><img src="${d.image}" alt="" loading="lazy" onerror="imgFail(this)"><span><strong>${esc(e.f)}</strong><small>${esc(e.r)}${e.d?' · '+esc(e.d):''}</small>${e.n?`<small class="muted">${esc(e.n)}</small>`:''}</span></button><span class="logMeta">${e.w!=null?`<b>${kgfmt(e.w)}</b>`:''}${rankBadge(e.rank)}${e.s!=null?`<span class="logScore">⭐ ${e.s.toLocaleString()} pts</span>`:''}</span><span class="logBtns"><button class="iconBtn" data-share="${esc(e.id)}" aria-label="Share this catch">⤴</button><button class="iconBtn" data-del="${esc(e.id)}" aria-label="Delete this catch">✕</button></span></div>`}).join('')}</div>`:'<div class="mutedBox">Nothing logged yet. Tap “Log a catch” after you land a fish, or use the button on any fish page.</div>'}</div>
  <div class="section"><h2>Collection</h2><p class="note">Your best rank for every fish. Tap one to open its guide.</p>
    <div class="chipRow" id="lgReserveChips"><button class="chip${lr?'':' active'}" data-lr="">All</button>${RESERVES.map(n=>`<button class="chip${lr===n?' active':''}" data-lr="${esc(n)}">${esc(n.replace(/ (Reserve|Nature Reserve|National Park|Municipio)$/,''))}</button>`).join('')}</div>
    <div class="chipRow">${[['all','All'],['caught','Caught'],['missing','Not caught'],['diamond','💎 Diamond'],['nodiamond','No Diamond yet']].map(([k,l])=>`<button class="chip small${lf===k?' active':''}" data-lf="${k}">${l}</button>`).join('')}</div>
    <div class="collGrid">${(lr?[lr]:RESERVES).flatMap(rn=>DATA.reserves[rn].fish.map(f=>[rn,f])).filter(([rn,f])=>{const b=species.get(rn+'::'+f);return lf==='all'||(lf==='caught'&&b)||(lf==='missing'&&!b)||(lf==='diamond'&&b&&b.rank==='Diamond')||(lf==='nodiamond'&&(!b||b.rank!=='Diamond'))}).map(([rn,f])=>{const b=species.get(rn+'::'+f),d=DATA.reserves[rn].records[f];
      return `<button class="collItem${b?' got':''}" data-lo="${esc(rn+'::'+f)}"><img src="${d.image}" alt="" loading="lazy" onerror="imgFail(this)"><strong>${esc(f)}</strong><small>${lr?'':esc(rn.split(' ')[0])+' · '}${b?(b.rank?RANK_ICON[b.rank]+' '+b.rank:'Caught')+(b.w!=null?' · '+kgfmt(b.w):''):'Not caught'}</small></button>`}).join('')||'<div class="mutedBox">Nothing here with this filter.</div>'}</div></div>
  <div class="section"><h2>Legendaries</h2><p class="note">Tick them off on each legendary's page in Guides.</p><div id="lgLegends" class="legendGrid"><div class="mutedBox">Loading…</div></div></div>`;
  guide('legendary').then(L=>{const box=$('#lgLegends');if(box)box.innerHTML=L.map(l=>legendCard(l,legends,true)).join('')}).catch(()=>{const box=$('#lgLegends');if(box)box.innerHTML=loadFail});
}
lv.onclick=e=>{
  const t=e.target;
  if(t.closest('#lgNew'))return openLogSheet();
  if(t.closest('#lgBackup'))return exportBackup();
  const lo=t.closest('[data-lo]');if(lo){const [rn,...p]=lo.dataset.lo.split('::');return go(rn,p.join('::'))}
  const lr=t.closest('[data-lr]');if(lr){store.set('logFilterReserve',lr.dataset.lr);return buildLog()}
  const lf=t.closest('[data-lf]');if(lf){store.set('logFilter',lf.dataset.lf);return buildLog()}
  const lg=t.closest('[data-legend]');if(lg)return nav('/guides/legendary/'+encodeURIComponent(lg.dataset.legend));
  const del=t.closest('[data-del]');if(del&&confirm('Delete this catch from your log?')){saveLog(getLog().filter(x=>String(x.id)!==del.dataset.del));haptic();return buildLog()}
  const sh=t.closest('[data-share]');if(sh){const e2=getLog().find(x=>String(x.id)===sh.dataset.share);if(e2)shareCatch(e2)}
};

// Share card: a picture of the catch made on a canvas, shared with the phone's share sheet or downloaded.
async function shareCatch(e){
  const d=DATA.reserves[e.r]?.records[e.f];if(!d)return;
  const W=1080,H=1350,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');
  const bg=g.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#123236');bg.addColorStop(1,'#071012');g.fillStyle=bg;g.fillRect(0,0,W,H);
  const img=await new Promise(res=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>res(null);i.src=d.image});
  if(img){const h=W*img.height/img.width;g.drawImage(img,0,170,W,h)}
  g.fillStyle='#55c2a0';g.font='700 40px system-ui,sans-serif';g.fillText('🎣 ANGLER GUIDE',60,100);
  g.fillStyle='#edf7f3';g.font='800 84px system-ui,sans-serif';g.fillText(e.f,60,800,W-120);
  g.fillStyle='#9bb0ad';g.font='500 40px system-ui,sans-serif';g.fillText(e.r+(e.d?'  ·  '+e.d:''),60,870,W-120);
  if(e.rank){g.fillStyle={Diamond:'#8fe3ff',Gold:'#e5c96e',Silver:'#d5dde3',Bronze:'#d39a62',Juvenile:'#9bb0ad'}[e.rank]||'#fff';g.font='800 96px system-ui,sans-serif';g.fillText((RANK_ICON[e.rank]||'')+' '+e.rank,60,1040)}
  if(e.w!=null){g.fillStyle='#edf7f3';g.font='800 120px system-ui,sans-serif';g.fillText(kgfmt(e.w),60,e.rank?1180:1060)}
  if(e.s!=null){g.fillStyle='#e5c96e';g.font='700 52px system-ui,sans-serif';g.textAlign='right';g.fillText('⭐ '+e.s.toLocaleString()+' pts',W-60,e.w!=null?(e.rank?1180:1060):(e.rank?1180:1040));g.textAlign='left'}
  g.fillStyle='#5d7472';g.font='500 30px system-ui,sans-serif';g.fillText('Call of the Wild: The Angler · Vanderholst Studios',60,H-60);
  const blob=await new Promise(res=>c.toBlob(res,'image/png'));if(!blob)return toast('Could not make the picture.');
  const file=new File([blob],(e.f+'-'+(e.d||'catch')).replace(/[^\w-]+/g,'-')+'.png',{type:'image/png'});
  try{if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:'My '+e.f});return}}catch(err){if(err.name==='AbortError')return}
  const a=document.createElement('a');a.href=URL.createObjectURL(file);a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);toast('Picture saved to your downloads.');
}

// ---------------------------------------------------------------- backup and restore
const BACKUP_KEYS=['log','legends','missions','collect','unit','temp','theme','reserve'];
function exportBackup(){
  const data={};for(const k of BACKUP_KEYS){const v=store.get(k,null);if(v!=null)data[k]=v}
  const blob=new Blob([JSON.stringify({app:'angler-guide',version:1,exported:new Date().toISOString(),data},null,1)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='angler-guide-backup-'+today()+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);
  toast('Backup saved. Keep the file somewhere safe.');
}
$('#importFile').addEventListener('change',async e=>{
  const f=e.target.files[0];e.target.value='';if(!f)return;
  try{const b=JSON.parse(await f.text());if(b.app!=='angler-guide'||!b.data)throw 0;
    if(!confirm('Replace your log, legendaries, missions and collectibles on this device with this backup?'))return;
    for(const k of BACKUP_KEYS)if(b.data[k]!=null)store.set(k,b.data[k]);
    toast('Backup restored.');setTimeout(()=>location.reload(),700);
  }catch(err){alert('That file is not an Angler Guide backup.')}
});

// ================================================================ GUIDES
function legendCard(l,got,small){
  return `<button class="legendCard${got.has(l.name)?' got':''}${small?' small':''}" data-legend="${esc(l.name)}"><img src="${l.image||''}" alt="" loading="lazy" onerror="imgFail(this)"><span><strong>${esc(l.name)}</strong><small>${esc(l.species||'Mystery')} · ${kgfmt(l.weight)}</small></span>${got.has(l.name)?'<em>✓ Caught</em>':''}</button>`;
}
async function buildGuides(){
  gv.innerHTML=`<div class="hero"><div class="eyebrow">Guides</div><h1>Everything to chase</h1><p>Legendary fish, every mission and collectible with tick-off lists, and the gear to land them.</p></div><div class="guideCards" id="guideCards"></div>`;
  let L=[],M={},C={};try{[L,M,C]=await Promise.all([guide('legendary'),guide('missions'),guide('collectibles')])}catch(e){}
  if(screen!=='guides'||!$('#guideCards'))return;
  const md=jget('missions',{}),cd=jget('collect',{});
  const mTotal=Object.values(M).flat().reduce((a,g)=>a+g.missions.length,0),cTotal=Object.values(C).flat().reduce((a,g)=>a+g.items.length,0);
  const card=(href,icon,title,desc,done,total)=>`<a class="guideCard" href="#${href}"><span class="gIcon">${icon}</span><span><strong>${title}</strong><small>${desc}</small>${total?`<span class="bar"><i style="width:${done/total*100}%"></i></span><small class="muted">${done} of ${total} done</small>`:''}</span><span aria-hidden="true">→</span></a>`;
  $('#guideCards').innerHTML=card('/guides/legendary','👑','Legendary fish',`Story, bait, hooks and location map for all ${LEGENDS_TOTAL}`,legendsCaught().size,L.length||LEGENDS_TOTAL)
    +card('/guides/missions','📋','Missions',`${mTotal||'All'} missions with objectives and rewards, ready to tick off`,Object.keys(md).length,mTotal)
    +card('/guides/collectibles','🧭','Collectibles',`${cTotal||'All'} coins, figures, notes and more to find`,Object.keys(cd).length,cTotal)
    +card('/guides/gear','🎣','Gear guide','Rods, reels, lines and hooks, plus a setup helper for any fish')
    +`<a class="guideCard" href="https://hub.theangler.org" target="_blank" rel="noopener"><span class="gIcon">🏆</span><span><strong>Community records</strong><small>Biggest catches and leaderboards on The Angler Hub (opens the website)</small></span><span aria-hidden="true">↗</span></a>`
    +`<a class="guideCard" href="https://theangler.org" target="_blank" rel="noopener"><span class="gIcon">📖</span><span><strong>The Angler Wiki</strong><small>Where this app's data comes from (opens the website)</small></span><span aria-hidden="true">↗</span></a>`;
}
function guideTitle(eyebrow,title,p){return `<div class="hero slim"><div class="eyebrow">${eyebrow}</div><h1>${title}</h1>${p?`<p>${p}</p>`:''}</div>`}
async function buildGuide(sub){
  gv.innerHTML=guideTitle('Guides','Loading…');
  try{
    if(sub==='legendary'){const L=await guide('legendary');if(screen!=='guide')return;const got=legendsCaught();
      gv.innerHTML=guideTitle('Guides','Legendary fish',`${got.size} of ${L.length} caught. Legendaries are active in rotating weeks, each with several possible spawn spots.`)
        +RESERVES.map(rn=>{const here=L.filter(l=>l.reserves.includes(rn));return here.length?`<div class="section"><h2>${esc(rn)}</h2><div class="legendGrid">${here.map(l=>legendCard(l,got)).join('')}</div></div>`:''}).join('');
      document.title='Legendary fish · Angler Guide';
    }else if(sub==='missions'||sub==='collectibles')await buildChecklist(sub);
    else if(sub==='gear')await buildGear();
    else nav('/guides');
  }catch(e){gv.innerHTML=guideTitle('Guides','Guides')+loadFail}
}
gv.onclick=e=>{
  const t=e.target,lg=t.closest('[data-legend]');if(lg)return nav('/guides/legendary/'+encodeURIComponent(lg.dataset.legend));
  const fishLink=t.closest('[data-fishlink]');if(fishLink){const [rn,...p]=fishLink.dataset.fishlink.split('::');return go(rn,p.join('::'))}
  const lc=t.closest('#legendToggle');if(lc){const on=toggleLegend(lc.dataset.name);haptic(on?[15,30,15]:10);lc.classList.toggle('primary',!on);lc.textContent=on?'✓ Caught':'＋ Mark as caught';toast(on?lc.dataset.name+' marked as caught 👑':'Unmarked');return}
};

async function buildLegend(name){
  gv.innerHTML=guideTitle('Legendary fish','Loading…');
  let L;try{L=await guide('legendary')}catch(e){gv.innerHTML=guideTitle('Legendary fish',esc(name))+loadFail;return}
  if(screen!=='legend')return;
  const l=L.find(x=>x.name===name);if(!l){nav('/guides/legendary');return}
  const got=legendsCaught().has(l.name),rn=l.reserves[0],fishHere=l.species&&DATA.reserves[rn]?.records[l.species]?l.species:null;
  const F=(a,b)=>`<div class="row"><small>${a}</small><strong>${esc(b||'—')}</strong></div>`;
  const tiers=[...new Set(l.baits.map(b=>b[1]))].sort((a,b)=>b-a);
  document.title=l.name+' · Angler Guide';
  gv.innerHTML=`<div class="hero"><div class="eyebrow">${esc(l.reserves.join(', '))} · Legendary fish</div><h1>👑 ${esc(l.name)}</h1>
    <div class="stats">${l.species?`<div class="pill">🐟 ${esc(l.species)}</div>`:''}<div class="pill">⚖️ ${kgfmt(l.weight)}</div>${l.time?`<div class="pill">🕐 ${esc(l.time)}</div>`:''}</div>
    <div class="fishTools"><button class="toolAction${got?'':' primary'}" id="legendToggle" data-name="${esc(l.name)}">${got?'✓ Caught':'＋ Mark as caught'}</button>${fishHere?`<button class="toolAction" data-fishlink="${esc(rn+'::'+fishHere)}">${esc(fishHere)} guide →</button>`:''}</div></div>
  <div class="card section catchGuide" id="catchGuide"><h2>How to catch ${esc(l.name)}</h2><div class="mutedBox">Loading…</div></div>
  <div class="detailgrid section"><div>
    <div class="card"><div class="imageWrap"><img class="heroimg" src="${l.image||''}" alt="${esc(l.name)}" onerror="imgFail(this)"></div>
      <div class="rows" style="margin-top:12px">${F('Weight',kgfmt(l.weight))}${F('Length',l.length)}${F('Spawn depth',sd(l.spawnDepth&&l.spawnDepth.replace(/m/g,'').replace(/\s*—\s*/,' – ')+' m'))}${F('Time of day',l.time)}${F('Preferred bait',l.preferred)}${F('Hook sizes',l.hooks.join(', '))}</div></div>
    <div class="card" style="margin-top:18px"><h2>Where to find it</h2>${l.map?`<div class="map" id="lmap"></div><div class="note">Known spawn spots. Each week it's active, it appears at one of them.</div>`:'<div class="mutedBox">No location map is published for this legendary.</div>'}</div>
  </div><div>
    <div class="card"><h2>The legend</h2>${l.story.map(p=>`<p class="story">${esc(p)}</p>`).join('')}</div>
    <div class="card" style="margin-top:18px"><h2>Bait &amp; lure preferences</h2>${tiers.map(p=>`<div class="tier">${p}%</div>`+l.baits.filter(b=>b[1]===p).map(b=>`<span class="tag${b[0]===l.preferred?' pref':''}">${b[0]===l.preferred?'★ ':''}${esc(b[0])}</span>`).join('')).join('')||'<div class="mutedBox">Not listed.</div>'}</div>
    <div class="card" style="margin-top:18px"><h2>Traits</h2>${l.traits.length?`<ul class="traitList">${l.traits.map(t=>`<li><strong>${esc(t.name)}</strong><span>${esc(t.desc)}</span></li>`).join('')}</ul>`:'<div class="mutedBox">Not listed.</div>'}</div>
  </div></div><div class="source">Source: <a href="${l.source}" target="_blank" rel="noopener">The Angler Wiki</a> (community-maintained; may contain errors).</div>`;
  if(l.map)mkMap($('#lmap'),l.map);
  catchGuide(l,L);
  const a=(await activeLegends())[rn];
  if(a&&a.legendary===l.name&&screen==='legend'){const st=$('.hero .stats',gv);if(st)st.insertAdjacentHTML('afterbegin',`<div class="pill twPill">📍 Active this week${a.spot?': '+esc(a.spot):''}</div>`)}
}

// ------------------------------------------------------------ legendary catching guide
// Turns a legendary's facts (traits, depth, time, baits, hooks, weight) into a step-by-step plan,
// with tackle picked from the gear list for its weight and the rig its best baits need.
const TRAIT_TIPS={
  'Bottom Lurker':'Stays near the bottom. Use a bottom rig, or let a jig or lure sink all the way down before you work it.',
  'Jumper':"Leaps out of the water during the fight. Keep steady tension and stop cranking while it's in the air.",
  'Night Owl':'More active at night, so plan your session after dark.',
  'Hard Fighter':'Fights hard to throw the hook. Set the drag below your line rating and let it run instead of forcing it.',
  'Aggressive':'Strikes without nibbling, so be ready to set the hook the moment the float dips or the rod tip pulls.',
  'Keen Senses':'Senses food from far away and responds well to lures. A lure worked through its spot can pull it in.',
  'Patient Scavenger':'Only bites bait that has been soaking a while. Cast a natural bait, leave it still and wait instead of recasting.',
  'Ambusher':"Only bites lures that have just splashed down. Cast often and start working the lure straight away.",
  'Last Stand':"Fights back hard when it's nearly landed. Don't relax at the end, and keep some drag in reserve.",
  'Social Distancing':'Keeps its distance until hooked. Make long casts to its spot rather than getting close.',
  'Rising Sun':'Comes up near the surface in the day but hides when it sees tackle. Cast well past it and bring the bait into its path.',
  'Daredevil':'Hangs around waterfalls and fast water. Try the spots closest to rapids and falls.',
  'Eagled Eyed':'Ignores every bait and lure until a lure has been twitched. Start with a lure on a Twitching retrieve.',
  'Superiority Complex':'Bites eagerly. The hard part is the fight, not getting the bite.',
  'Deep Speech':'Rises to the surface at night with a deep, gurgling noise. Listen for it after dark and fish shallower then.',
  'Evil Eye':'Spooks nearby fish every so often. If a spot suddenly goes quiet, it may be close.',
  'Siren Song':'Sings a mournful song. Listen for it near its spawn spots.',
  'Run for your Money':'Keeps its distance until hooked. Make long casts to its spot.',
  'Easily Spooked':'Scared off by people. Approach quietly, stay back and make long casts.',
  'Sun Lover':'More active after sunrise, so fish in the morning and through the day.',
  "Otashitonkuru's Rock":'Lore hint: its legend is tied to rocks and islands, so try spots near rocky islands.',
  'The Deepest Reaches':'Lore hint: it waits in deep, cold water, so fish the deep end of its depth range.',
  "Dragon's Gate":'Lore hint: its legend is about climbing a waterfall, so try spots near falls and strong current.',
};
async function catchGuide(l,L){
  const box=$('#catchGuide');if(!box)return;
  let G=null;try{G=await guide('gear')}catch(e){}
  const act=(await activeLegends())[l.reserves[0]];if(!$('#catchGuide'))return;
  const trait=n=>l.traits.some(t=>t.name===n),top=l.baits.length?l.baits.filter(b=>b[1]===l.baits[0][1]):[];
  const isLure=b=>/ - (Constant|Jigging|Stop and Go|Twitching)$/.test(b[0]),lures=top.filter(isLure),naturals=top.filter(b=>!isLure(b));
  // Lures grouped by type with their best retrieves, e.g. "Spinnerbait (Constant, Twitching)".
  const byLure={};for(const [b] of lures){const [t,s]=b.split(' - ');(byLure[t]=byLure[t]||[]).push(s)}
  const lureText=Object.entries(byLure).map(([t,s])=>`${t} (${s.join(', ')})`);
  const [dMin,dMax]=(String(l.spawnDepth||'').match(/[\d.]+/g)||[]).map(Number);
  const deep=dMin>=10;
  const baitRig=trait('Bottom Lurker')||trait('Patient Scavenger')||deep?'Bottom':'Float';
  const lureRig=lures.length&&lures.every(([b])=>/Jigging/.test(b))?'Jig':'Lure';
  const rigs=[...(naturals.length?[[baitRig,'bait']]:[]),...(lures.length?[[lureRig,'lures']]:[])];
  if(trait('Eagled Eyed'))rigs.reverse(); // it needs a twitched lure first
  const rig=rigs.map(r=>r[0]);if(!rig.length)rig.push(baitRig);
  const when=/day/i.test(l.time)&&/night/i.test(l.time)?'Any time of day':l.time==='Nighttime'?'Night only':l.time==='Daytime'?'Daytime only':(l.time||'Any time');
  // Tackle for the main rig: line rated for its weight, a rod that takes that line, a reel with drag to match.
  let tackle='';
  if(G){
    const w=l.weight,uses=x=>String(x.stats['Fishing Rigs']||'').includes(rig[0]),lv=x=>num(x.stats.Level)||0,byLv=(a,b)=>lv(a)-lv(b);
    const rodCap=Math.max(0,...G.Rods.items.filter(uses).map(x=>num(x.stats['Max Line Strength'])||0))||Infinity; // no point in line a rod can't take
    const lines=G.Lines.items.filter(uses).map(x=>({...x,test:num(x.stats['Test Weight'])})).filter(x=>x.test&&x.test<=rodCap).sort((a,b)=>a.test-b.test||lv(a)-lv(b));
    const line=lines.find(x=>x.test>=w)||lines[lines.length-1],over=line&&line.test<w;
    let rods=G.Rods.items.filter(x=>uses(x)&&num(x.stats['Max Line Strength'])>=(line?line.test:0)&&num(x.stats.Strength)>=Math.min(w,line?line.test:w)).sort(byLv);
    const reels=G.Reels.items.filter(x=>uses(x)&&num(x.stats['Max Drag'])>=Math.min(w*.5,line?line.test*.5:w)).sort(byLv);
    const list=a=>`<strong>${a.slice(0,3).map(x=>esc(x.name)+(lv(x)?` (level ${lv(x)})`:'')).join(', ')}</strong>`;
    tackle=`<li><strong>Gear up for a ${kgfmt(w)} fish.</strong><div class="cgRows">
      ${line?`<div class="row"><small>Line</small><strong>${esc(line.name)}${unit==='metric'?'':` (rated ${kgfmt(line.test)})`}</strong></div>`:''}
      <div class="row"><small>Rod</small>${rods.length?list(rods):'<strong>Use your strongest rod</strong>'}</div>
      <div class="row"><small>Reel</small>${reels.length?list(reels):'<strong>Use the reel with the most drag you have</strong>'}</div>
      <div class="row"><small>Hooks</small><strong>${esc(l.hooks.join(', ')||'Not listed')}</strong></div></div>
      ${over?`<p class="note">No ${rig[0].toLowerCase()} rig setup is rated for its full weight, so use the strongest line your rod takes and play it carefully: keep the drag below the line rating and let it tire itself out. Landing a fish heavier than the line multiplies your score.</p>`:''}</li>`;
  }
  const where=act&&act.legendary===l.name?`It's <strong>active this week</strong>${act.spot?` at <strong>${esc(act.spot)}</strong>`:''}.`
    :act&&act.legendary?`This week's ${esc(l.reserves[0])} legendary is ${esc(act.legendary)}, so ${esc(l.name)} isn't active until a later week.`:`This week's legendary in ${esc(l.reserves[0])} isn't confirmed yet. Check the Home screen.`;
  const others=L.filter(x=>x.reserves[0]===l.reserves[0]&&x.name!==l.name).map(x=>x.name);
  box.innerHTML=`<h2>How to catch ${esc(l.name)}</h2><ol class="cgSteps">
    <li><strong>Fish in its week.</strong> Each week one legendary is active in ${esc(l.reserves[0])}, picked at random${others.length?` from ${esc(l.name)}, ${esc(others.join(' and '))}`:''}. It changes every Wednesday at 10 pm US Eastern time, and each active legendary can only be caught once that week. ${where}</li>
    <li><strong>Go to its spawn spots.</strong> ${l.map?'The map below shows the known spots. Each active week it appears at one of them, so work through them until you find it.':'No location map is published, so search its species\' usual water in this reserve.'}</li>
    <li><strong>Pick your time.</strong> ${esc(when)}.${trait('Night Owl')?' It\'s most active at night.':''}${trait('Sun Lover')?' It\'s most active after sunrise.':''}</li>
    <li><strong>Fish the right depth.</strong> It spawns ${dMin!=null?`between ${sd(dMin+' m')} and ${sd((dMax??dMin)+' m')}`:'at an unknown depth'}. ${trait('Bottom Lurker')||deep?'Get your bait down near the bottom.':'Set your float or let your lure sink into that range.'}</li>
    <li><strong>Use its favourite ${naturals.length&&lures.length?'baits and lures':lures.length?'lures':'baits'}.</strong> ${top.length?`These have the best bite chance (${top[0][1]}%):`:'No bait preferences are listed.'}
      ${naturals.length?`<div class="cgBaits"><small>Bait</small> ${naturals.map(b=>`<span class="tag${b[0]===l.preferred?' pref':''}">${b[0]===l.preferred?'★ ':''}${esc(b[0])}</span>`).join('')}</div>`:''}
      ${lureText.length?`<div class="cgBaits"><small>Lures (retrieve)</small> ${lureText.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div>`:''}</li>
    <li><strong>Rig up.</strong> ${rigs.length>1?`Use a <strong>${rigs[0][0]} rig</strong> for ${rigs[0][1]} or a <strong>${rigs[1][0]} rig</strong> for ${rigs[1][1]}. The gear below is for the ${rigs[0][0].toLowerCase()} rig.`:`Use a <strong>${rig[0]} rig</strong>.`}</li>
    ${tackle}
    ${l.traits.length?`<li><strong>Play to its traits.</strong><ul class="cgTraits">${l.traits.map(t=>`<li><strong>${esc(t.name)}:</strong> ${esc(TRAIT_TIPS[t.name]||t.desc)}</li>`).join('')}</ul></li>`:''}
    <li><strong>Land it.</strong> When the tension climbs, stop reeling and let it run. Reel in when it tires${trait('Last Stand')?', and expect one last burst right at the end':''}. Then mark it as caught at the top of this page.</li>
  </ol><p class="note">The plan is built from the wiki's facts for ${esc(l.name)} and the game's gear list. The trait tips are suggestions, not confirmed mechanics.</p>`;
}

// Missions and collectibles share one tick-off list design.
async function buildChecklist(kind){
  const data=await guide(kind);if(screen!=='guide')return;
  const isM=kind==='missions',key=isM?'missions':'collect',done=jget(key,{});
  const rn=DATA.reserves[store.get(key+'Reserve','')]?store.get(key+'Reserve',''):(R||store.get('reserve',RESERVES[0]));
  const hide=store.get(key+'Hide','')==='1',groups=data[rn]||[];
  const id=(g,n)=>rn+'|'+g+'|'+n;
  const items=g=>isM?g.missions.map(m=>m.name):g.items;
  const all=groups.flatMap(g=>items(g).map(n=>id(g.type,n))),doneHere=all.filter(k=>done[k]).length;
  let xp=0,xpAll=0;if(isM)for(const g of groups)for(const m of g.missions){xpAll+=m.xp;if(done[id(g.type,m.name)])xp+=m.xp}
  document.title=(isM?'Missions':'Collectibles')+' · Angler Guide';
  gv.innerHTML=guideTitle('Guides',isM?'Missions':'Collectibles',isM?'Every mission, its objectives and rewards. Tick them off as you go.':'Every collectible in each reserve, grouped by type. Tick them off as you find them.')
  +`<div class="chipRow">${RESERVES.map(n=>`<button class="chip${n===rn?' active':''}" data-ck-reserve="${esc(n)}">${esc(n.replace(/ (Reserve|Nature Reserve|National Park|Municipio)$/,''))}</button>`).join('')}</div>
  <div class="card ckSummary"><div><strong>${doneHere} of ${all.length}</strong> ${isM?'missions':'collectibles'} done in ${esc(rn)}${isM?` · ${xp.toLocaleString()} of ${xpAll.toLocaleString()} XP`:''}</div><span class="bar"><i style="width:${all.length?doneHere/all.length*100:0}%"></i></span>
  <label class="switchLabel"><input type="checkbox" id="ckHide"${hide?' checked':''}> Hide finished</label></div>
  ${groups.length?groups.map(g=>{const its=items(g),gd=its.filter(n=>done[id(g.type,n)]).length;
    const rows=isM?g.missions.filter(m=>!(hide&&done[id(g.type,m.name)])).map(m=>{const k=id(g.type,m.name);
      return `<details class="ckRow${done[k]?' done':''}"><summary><button class="ckBox" data-ck="${esc(k)}" role="checkbox" aria-checked="${!!done[k]}" aria-label="Done: ${esc(m.name)}"></button><span class="ckName">${esc(m.name)}</span><span class="ckMeta">${m.xp?`⭐ ${m.xp} XP`:''}${m.credits?` · 💰 ${m.credits}`:''}${m.rep?` · 🎖️ ${m.rep}`:''}</span></summary>
        <div class="ckBody">${m.desc?`<p>${esc(m.desc)}</p>`:''}${m.objectives.length?`<ol>${m.objectives.map(o=>`<li>${esc(o)}</li>`).join('')}</ol>`:''}</div></details>`}).join('')
      :g.items.filter(n=>!(hide&&done[id(g.type,n)])).map(n=>{const k=id(g.type,n);return `<div class="ckRow plain${done[k]?' done':''}"><button class="ckBox" data-ck="${esc(k)}" role="checkbox" aria-checked="${!!done[k]}" aria-label="Found: ${esc(n)}"></button><span class="ckName">${esc(n)}</span></div>`}).join('');
    return `<section class="card ckGroup"><h2>${esc(g.type)} <span class="muted">${gd}/${its.length}</span></h2>${g.about?`<p class="note">${esc(g.about)}</p>`:''}${rows||'<div class="mutedBox">All done here. 🎉</div>'}</section>`}).join(''):'<div class="mutedBox">Nothing listed for this reserve.</div>'}
  <div class="source">Source: <a href="https://theangler.org/${isM?'missions':'collectibles'}" target="_blank" rel="noopener">The Angler Wiki</a> (community-maintained; may contain errors).</div>`;
  gv.onchange=e=>{if(e.target.id==='ckHide'){store.set(key+'Hide',e.target.checked?'1':'');buildChecklist(kind)}};
  gv.querySelectorAll('[data-ck-reserve]').forEach(b=>b.onclick=()=>{store.set(key+'Reserve',b.dataset.ckReserve);buildChecklist(kind)});
  gv.querySelectorAll('.ckBox').forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();const d=jget(key,{}),k=b.dataset.ck;
    if(d[k])delete d[k];else d[k]=1;jset(key,d);haptic(8);
    const row=b.closest('.ckRow');row.classList.toggle('done',!!d[k]);b.setAttribute('aria-checked',String(!!d[k]));
    if(hide&&d[k])setTimeout(()=>buildChecklist(kind),250);else updateCkCounts(kind,groups,rn,isM)});
}
function updateCkCounts(kind,groups,rn,isM){ // refresh the totals without rebuilding (keeps open objectives open)
  const done=jget(isM?'missions':'collect',{}),id=(g,n)=>rn+'|'+g+'|'+n,items=g=>isM?g.missions.map(m=>m.name):g.items;
  const all=groups.flatMap(g=>items(g).map(n=>id(g.type,n))),d=all.filter(k=>done[k]).length;
  let xp=0,xpAll=0;if(isM)for(const g of groups)for(const m of g.missions){xpAll+=m.xp;if(done[id(g.type,m.name)])xp+=m.xp}
  const s=$('.ckSummary',gv);if(s){s.firstElementChild.innerHTML=`<strong>${d} of ${all.length}</strong> ${isM?'missions':'collectibles'} done in ${esc(rn)}${isM?` · ${xp.toLocaleString()} of ${xpAll.toLocaleString()} XP`:''}`;$('.bar i',s).style.width=(all.length?d/all.length*100:0)+'%'}
  $$('.ckGroup',gv).forEach((sec,i)=>{const g=groups[i];if(!g)return;const its=items(g),gd=its.filter(n=>done[id(g.type,n)]).length;const m=$('h2 .muted',sec);if(m)m.textContent=gd+'/'+its.length});
}

// Gear guide: a setup helper plus searchable lists of rods, reels, lines and hooks.
const num=s=>{const m=String(s||'').replace(/,/g,'').match(/[\d.]+/);return m?+m[0]:null};
async function buildGear(){
  const G=await guide('gear');if(screen!=='guide')return;
  const tab=store.get('gearTab','helper');
  document.title='Gear guide · Angler Guide';
  gv.innerHTML=guideTitle('Guides','Gear guide','Pick a fish for a suggested setup, or browse every rod, reel, line and hook in the game.')
  +`<div class="chipRow" role="tablist">${[['helper','Setup helper'],['Rods','Rods'],['Reels','Reels'],['Lines','Lines'],['Hooks','Hooks']].map(([k,l])=>`<button class="chip${tab===k?' active':''}" data-gtab="${k}" role="tab" aria-selected="${tab===k}">${l}</button>`).join('')}</div><div id="gearBody"></div>
  <div class="source">Source: <a href="https://theangler.org/equipment" target="_blank" rel="noopener">The Angler Wiki</a> (community-maintained; may contain errors).</div>`;
  gv.querySelectorAll('[data-gtab]').forEach(b=>b.onclick=()=>{store.set('gearTab',b.dataset.gtab);buildGear()});
  if(tab==='helper')gearHelper(G);else gearList(G,tab);
}
function gearHelper(G){
  const rn=store.get('gearReserve',R||store.get('reserve',RESERVES[0])),fish=DATA.reserves[rn].fish,fn=fish.includes(store.get('gearFish',''))?store.get('gearFish',''):fish[0],target=store.get('gearRank','Diamond');
  const d=DATA.reserves[rn].records[fn],rk=(d.ranks||[]).find(r=>r.rank===target)||(d.ranks||[]).slice(-1)[0];
  const lines=G.Lines.items.map(x=>({...x,test:num(x.stats['Test Weight'])})).filter(x=>x.test).sort((a,b)=>a.test-b.test);
  const maxW=rk?rk.max:num(d.weight);
  const safe=lines.find(x=>x.test>=maxW)||lines[lines.length-1],bold=[...lines].reverse().find(x=>x.test<maxW*.8&&x.test>=maxW*.5);
  const rods=G.Rods.items.filter(x=>num(x.stats['Max Line Strength'])>=(safe?safe.test:0)).sort((a,b)=>(num(a.stats.Level)||0)-(num(b.stats.Level)||0));
  const reels=G.Reels.items.filter(x=>num(x.stats['Max Drag'])>=maxW*.5).sort((a,b)=>(num(a.stats.Level)||0)-(num(b.stats.Level)||0));
  const lineName=x=>`<strong>${esc(x.name)}</strong> <span class="muted">(${esc(x.stats.Type)}, ${kgfmt(x.test)})</span>`;
  $('#gearBody').innerHTML=`<div class="card gearHelper"><div class="toolFields bitingFields">
      <label>Reserve<select id="ghReserve" class="select">${opts(RESERVES,rn)}</select></label>
      <label>Fish<select id="ghFish" class="select">${opts(fish,fn)}</select></label>
      <label>Target rank<select id="ghRank" class="select">${opts((d.ranks||[]).map(r=>r.rank),rk&&rk.rank)}</select></label></div>
    ${rk?`<div class="ghOut">
      <div class="row"><small>Target</small><strong>${rankBadge(rk.rank)} ${kgfmt(rk.min)} – ${kgfmt(rk.max)}</strong></div>
      <div class="row"><small>Hook size</small><strong>${esc(rk.hooks.join(', ')||'—')}</strong></div>
      <div class="row"><small>Best baits</small><strong>${esc(d.baits.filter(b=>b[1]===d.baits[0][1]).slice(0,4).map(b=>b[0]).join(', '))}</strong></div>
      <div class="row"><small>Safe line (holds the heaviest)</small><span>${safe?lineName(safe):'—'}</span></div>
      ${bold?`<div class="row"><small>Score line (lighter, riskier)</small><span>${lineName(bold)}</span></div>`:''}
      <div class="row"><small>Rods that take the safe line</small><span>${rods.length?`${rods.length} rods, e.g. ${rods.slice(0,4).map(r=>esc(r.name)).join(', ')}`:'None — go lighter'}</span></div>
      <div class="row"><small>Reels with enough drag</small><span>${reels.length?`${reels.length} reels, e.g. ${reels.slice(0,4).map(r=>esc(r.name)).join(', ')}`:'—'}</span></div>
    </div>`:'<div class="mutedBox">No rank table for this fish.</div>'}
    <p class="note">How catches score: each kilogram of fish is worth 1,300 points and each kilogram of line rating costs 300, so the same fish scores more on lighter line. Landing a fish heavier than the line's rating multiplies the score — and snapping off scores nothing. Reel picks are a rough guide: drag of at least half the fish's weight.</p></div>`;
  $('#gearBody').onchange=e=>{const t=e.target.id;if(t==='ghReserve'){store.set('gearReserve',e.target.value);store.set('gearFish','')}if(t==='ghFish')store.set('gearFish',e.target.value);if(t==='ghRank')store.set('gearRank',e.target.value);gearHelper(G)};
}
function gearList(G,tab){
  const cat=G[tab],cols={Rods:['Type','Power','Action','Max Line Strength','Strength','Length'],Reels:['Type','Max Drag','Strength','Gear Ratio','Line Capacity'],Lines:['Type','Test Weight','Thickness','Visibility','Abrasion Resistance'],Hooks:['Hook Size','Fishing Rigs']}[tab];
  const sortKey={Rods:'Max Line Strength',Reels:'Max Drag',Lines:'Test Weight',Hooks:null}[tab];
  const types=[...new Set(cat.items.map(x=>x.stats.Type).filter(Boolean))].sort();
  const price=s=>s.Price||(s['💰 Credits']?s['💰 Credits']+' credits':null)||(s['💎 Diamond Trophy Tokens']?s['💎 Diamond Trophy Tokens']+' 💎 tokens':null)||(s['🥇 Gold Trophy Tokens']?s['🥇 Gold Trophy Tokens']+' 🥇 tokens':null)||(s['👑 Legendary Trophy Tokens']?s['👑 Legendary Trophy Tokens']+' 👑 tokens':null)||(s['🎟️ Event Tokens']?'Event':null)||(s.Reputation?s.Reputation+' rep':null);
  $('#gearBody').innerHTML=`${cat.intro&&cat.intro.length?`<p class="note gearIntro">${esc(cat.intro[0])}</p>`:''}<div class="searchbar"><input class="input" id="gq" placeholder="Search ${tab.toLowerCase()}…">${types.length>1?`<select class="select" id="gtype"><option value="">All types</option>${opts(types)}</select>`:''}</div><div id="gcount" class="note"></div><div class="gearGrid" id="gearGrid"></div>`;
  const draw=()=>{const q=$('#gq').value.trim().toLowerCase(),ty=$('#gtype')?$('#gtype').value:'';
    let list=cat.items.filter(x=>(!q||x.name.toLowerCase().includes(q))&&(!ty||x.stats.Type===ty));
    if(sortKey)list=list.slice().sort((a,b)=>(num(a.stats[sortKey])||0)-(num(b.stats[sortKey])||0));
    $('#gcount').textContent=`${list.length} of ${cat.items.length}`;
    $('#gearGrid').innerHTML=list.map(x=>{const s=x.stats,p=price(s);return `<div class="gearItem"><strong>${esc(x.name)}</strong>${/requires|DLC/i.test(x.about)?`<small class="muted">${esc(x.about)}</small>`:''}<dl>${cols.filter(c=>s[c]).map(c=>`<div><dt>${esc(c)}</dt><dd>${esc(/Strength|Drag|Test Weight/.test(c)?kgfmt(num(s[c])):s[c])}</dd></div>`).join('')}${s.Level?`<div><dt>Level</dt><dd>${esc(s.Level)}</dd></div>`:''}${p?`<div><dt>Price</dt><dd>${esc(p)}</dd></div>`:''}</dl></div>`}).join('')||'<div class="mutedBox">Nothing matches.</div>'};
  $('#gearBody').oninput=draw;$('#gearBody').onchange=draw;draw();
}

// ================================================================ ROUTING
const DEPTH={home:0,log:0,guides:0,reserve:1,guide:1,fish:2,legend:2};
const TAB_OF={home:'home',log:'log',guides:'guides',guide:'guides',legend:'guides',reserve:'reserve',fish:'reserve'};
function setScreen(name){
  const el={home,log:lv,guides:gv,guide:gv,legend:gv,reserve:rv,fish:fv}[name];
  if(screen&&screen!==name&&!reduceMotion){const dir=DEPTH[name]>DEPTH[screen]?'fwd':DEPTH[name]<DEPTH[screen]?'back':'fade';
    el.classList.remove('enter-fwd','enter-back','enter-fade');void el.offsetWidth;el.classList.add('enter-'+dir)}
  screen=name;
  $$('[data-tab]').forEach(b=>{const on=b.dataset.tab===TAB_OF[name];b.classList.toggle('active',on);on?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current')});
  back.hidden=!DEPTH[name]||name==='reserve';sel.hidden=!(name==='reserve'||name==='fish');
}
const showOnly=el=>{for(const s of [home,rv,fv,lv,gv])s.hidden=s!==el};
function route(){
  const raw=location.hash.slice(1);
  if(navStack.length>1&&navStack[navStack.length-2]===location.hash)navStack.pop();else if(navStack[navStack.length-1]!==location.hash)navStack.push(location.hash);
  const path=decodeURIComponent(raw.startsWith('/')?raw.slice(1):raw).split('/'),top=path[0].toLowerCase();
  const fromTop=!home.hidden||!lv.hidden||!gv.hidden;
  if(!raw||raw==='/'||top===''||top==='home'){
    showOnly(home);setScreen('home');
    if(!home.dataset.built){buildHome();home.dataset.built='1'}else{renderBiting();renderThisWeek()}
    document.title='Angler Guide · Home';scrollTo(0,0);return;
  }
  if(top==='log'||top==='catches'){showOnly(lv);setScreen('log');buildLog();document.title='My log · Angler Guide';scrollTo(0,0);return}
  if(top==='guides'){
    showOnly(gv);const sub=path[1]||'',item=path.slice(2).join('/');
    if(!sub){setScreen('guides');buildGuides();document.title='Guides · Angler Guide'}
    else if(sub==='legendary'&&item){setScreen('legend');buildLegend(item)}
    else{setScreen('guide');buildGuide(sub)}
    scrollTo(0,0);return;
  }
  showOnly(rv);if(fromTop){lastFish=null;scrollTo(0,0)}
  let rn=path[0];
  if(!DATA.reserves[rn])rn=DATA.reserves[store.get('reserve','')]?store.get('reserve',''):RESERVES[0];
  if(R!==rn){R=rn;store.set('reserve',rn);lastFish=null;built=null;buildReserve();sel.value=rn;scrollTo(0,0)}
  const f=path[1]&&rec()[path[1]]?path[1]:null;showFish(f);setScreen(f?'fish':'reserve');
}
function parentOf(){ // where "back" goes when there is no in-app history
  if(screen==='fish')return '/'+encodeURIComponent(R);
  if(screen==='legend')return '/guides/legendary';
  if(screen==='guide')return '/guides';
  return '/';
}
function goUp(){if(navStack.length>1)history.back();else nav(parentOf())}
sel.innerHTML=opts(RESERVES);
sel.onchange=()=>go(sel.value);back.onclick=()=>nav(parentOf());$('#homeBtn').onclick=goHome;

// ================================================================ SETTINGS, THEME
let theme=store.get('theme','dark');
function applyTheme(){document.documentElement.dataset.theme=theme;
  const light=theme==='light'||(theme==='auto'&&matchMedia('(prefers-color-scheme: light)').matches);
  $('meta[name=theme-color]').setAttribute('content',light?'#f2f6f5':'#091113')}
matchMedia('(prefers-color-scheme: light)').addEventListener('change',()=>{if(theme==='auto')applyTheme()});
applyTheme();
const openSettings=()=>{if(!$('#set').open)$('#set').showModal()};
$('#gear').onclick=openSettings;$('#logBtn').onclick=()=>nav('/log');$('#guidesBtn').onclick=()=>nav('/guides');$('#close').onclick=()=>$('#set').close();
$('#set').onclick=e=>{const u=e.target.closest('[data-u]'),t=e.target.closest('[data-t]'),th=e.target.closest('[data-theme-pick]');
  if(e.target.id==='set')e.target.close();
  if(u){unit=u.dataset.u;store.set('unit',unit)}if(t){tu=t.dataset.t;store.set('temp',tu)}if(th){theme=th.dataset.themePick;store.set('theme',theme);applyTheme()}
  if(e.target.closest('#exportBtn'))exportBackup();if(e.target.closest('#importBtn'))$('#importFile').click();
  if(u||t||th)refresh()};
addEventListener('hashchange',route);route();refresh();
$('#appVersion').textContent=APP_VERSION;

// Tab bar
$('#tabs').onclick=e=>{const b=e.target.closest('[data-tab]');if(!b)return;haptic(8);const t=b.dataset.tab;
  if(t==='settings')return openSettings();
  if(TAB_OF[screen]===t&&DEPTH[screen]===0||t==='reserve'&&screen==='reserve')return scrollTo({top:0,behavior:'smooth'});
  if(t==='home')goHome();else if(t==='log')nav('/log');else if(t==='guides')nav('/guides');
  else{const rn=R||store.get('reserve','');go(DATA.reserves[rn]?rn:RESERVES[0])}};

// Intro: plays on every launch, tap to skip.
const intro=$('#intro');let introTimer=0;
function endIntro(){if(intro.classList.contains('out'))return;clearTimeout(introTimer);intro.classList.add('out');setTimeout(()=>{intro.hidden=true},450)}
function playIntro(){intro.hidden=false;intro.classList.remove('out','play');void intro.offsetWidth;intro.classList.add('play');clearTimeout(introTimer);introTimer=setTimeout(endIntro,reduceMotion?900:3700)}
intro.onclick=endIntro;introTimer=setTimeout(endIntro,reduceMotion?900:3700);
$('#replayIntro').onclick=()=>{$('#set').close();playIntro()};

// Swipe from the left edge to go back (installed app only; browsers have their own gesture).
if(matchMedia('(display-mode: standalone)').matches||navigator.standalone){
  let sx=0,sy=0,dx=0,el=null;
  addEventListener('touchstart',e=>{const t=e.touches[0];el=null;if(e.touches.length!==1||t.clientX>24||!DEPTH[screen]||dlg3d.open||logDlg.open||e.target.closest('.mapviewport,.m3dCanvas'))return;
    sx=t.clientX;sy=t.clientY;dx=0;el={fish:fv,reserve:rv,guide:gv,legend:gv}[screen]||null},{passive:true});
  addEventListener('touchmove',e=>{if(!el)return;const t=e.touches[0];dx=t.clientX-sx;
    if(Math.abs(t.clientY-sy)>Math.abs(dx)&&dx<24){el.style.transform=el.style.opacity='';el=null;return}
    el.style.transform=`translateX(${Math.max(0,dx)}px)`;el.style.opacity=1-Math.min(.5,Math.max(0,dx)/500)},{passive:true});
  addEventListener('touchend',()=>{if(!el)return;const v=el;el=null;v.style.transition='transform .2s ease,opacity .2s ease';
    if(dx>90){haptic();goUp()}v.style.transform=v.style.opacity='';setTimeout(()=>{v.style.transition=''},220)});
}

// Offline badge
const offline=$('#offline'),net=()=>{offline.hidden=navigator.onLine};addEventListener('online',net);addEventListener('offline',net);net();
// Service worker: offline support plus an "update ready" prompt when a new release is installed.
if('serviceWorker' in navigator)addEventListener('load',()=>{
  let updating=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(updating)location.reload()});
  navigator.serviceWorker.register('./service-worker.js').then(reg=>{
    const offer=w=>{if(!w||!navigator.serviceWorker.controller)return;const u=$('#update');u.hidden=false;
      $('#updateBtn').onclick=()=>{updating=true;u.querySelector('span').textContent='Updating…';w.postMessage('skipWaiting')}};
    offer(reg.waiting);
    reg.addEventListener('updatefound',()=>{const w=reg.installing;w&&w.addEventListener('statechange',()=>{if(w.state==='installed')offer(w)})});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)reg.update().catch(()=>{})});
  }).catch(()=>{});
});
