"""Collect guide data from The Angler Wiki (theangler.org) into data/*.json.

Usage:  python3 tools/wiki-data.py [cache-dir]

Writes:
  data/legendary.json    16 legendary fish: story, facts, baits, traits, location map
  data/missions.json     every mission per reserve, grouped by type, with objectives and rewards
  data/collectibles.json every collectible per reserve, grouped by type
  data/gear.json         rods, reels, lines and hooks with their stats
  data/fish-refresh.json latest facts for each fish page the app links to, including
                         the weight range of every rank (merged into index.html by
                         tools/apply-fish-refresh.py)

Pages are cached in <cache-dir> (default .wiki-cache/) so re-runs don't hit the wiki again.
Needs requests-free stdlib only plus beautifulsoup4 + lxml.
"""
import json, os, re, sys, time, hashlib, urllib.request
from concurrent.futures import ThreadPoolExecutor
from bs4 import BeautifulSoup

BASE = 'https://theangler.org'
CACHE = sys.argv[1] if len(sys.argv) > 1 else '.wiki-cache'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'data')
RESERVES = {
    'golden-ridge-reserve': 'Golden Ridge Reserve',
    'trollsporet-nature-reserve': 'Trollsporet Nature Reserve',
    'aguas-claras-municipio': 'Aguas Claras Municipio',
    'izilo-zasendulo': 'Izilo Zasendulo',
    'kamuibetsu-national-park': 'Kamuibetsu National Park',
}
os.makedirs(CACHE, exist_ok=True); os.makedirs(OUT, exist_ok=True)


def get(url):
    path = os.path.join(CACHE, hashlib.sha1(url.encode()).hexdigest() + '.html')
    if os.path.exists(path):
        return open(path, encoding='utf-8').read()
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'AnglerGuideApp/3.1 (fan app data refresh)'})
            html = urllib.request.urlopen(req, timeout=30).read().decode('utf-8', 'replace')
            open(path, 'w', encoding='utf-8').write(html)
            time.sleep(.2)
            return html
        except Exception as e:  # retry transient failures
            if attempt == 3: raise RuntimeError(f'{url}: {e}')
            time.sleep(2 ** attempt)


def soup(url): return BeautifulSoup(get(url), 'lxml')
def txt(el): return re.sub(r'\s+', ' ', el.get_text(' ', strip=True)).strip() if el else ''
def clean(s): return re.sub(r'\s+([,.;:!?])', r'\1', re.sub(r'\s+', ' ', s)).strip()
def pmap(fn, items, n=6):
    with ThreadPoolExecutor(n) as ex: return list(ex.map(fn, items))


def img_url(el):
    """Full-size image URL from an <img> (lazy-loaded) or the link around it."""
    if not el: return None
    a = el.find_parent('a')
    if a and re.search(r'\.(webp|png|jpe?g)$', a.get('href', '')): return a['href']
    src = el.get('data-src') or el.get('src') or ''
    return None if src.startswith('data:') else re.sub(r'-\d+x\d+(\.\w+)$', r'\1', src)


def specs(root):
    """Key/value pairs from the wiki's .taw-specs blocks; alt (imperial) values dropped."""
    out = {}
    for row in root.select('.taw-specs > div'):
        k, v = row.select_one('.taw-k'), row.select_one('.taw-v')
        if not k or not v: continue
        for alt in v.select('.taw-alt'): alt.decompose()
        out[txt(k)] = txt(v)
    return out


def kg(s):
    """'29.23kg' / '450g' / '2 kg' -> kilograms as float."""
    m = re.search(r'([\d.,]+)\s*(kg|g)\b', s or '')
    if not m: return None
    v = float(m.group(1).replace(',', ''))
    return round(v / 1000 if m.group(2) == 'g' else v, 4)


def baits(root):
    out = []
    for a in root.select('.taw-baits a, p a[href*="/baits-and-lures/"]'):
        m = re.match(r'(.+?)\s*\((\d+)%\)', txt(a))
        if m and m.group(1) not in [b[0] for b in out]: out.append([m.group(1), int(m.group(2))])
    return out


def traits(root):
    out = []
    for li in root.select('.taw-traits li'):
        name = txt(li.find('strong')).rstrip(':')
        desc = txt(li.find('p'))
        if name: out.append({'name': name, 'desc': desc})
    return out


# ------------------------------------------------------------------ legendary fish
def legendary():
    # The index page misses one legendary, so also take the links from the home page.
    urls = sorted({a['href'].rstrip('/') for page in (BASE + '/fish-species/legendary-fish', BASE + '/')
                   for a in soup(page).select('a[href*="/legendary-fish/"]')
                   if re.search(r'/legendary-fish/[a-z0-9-]+/?$', a['href'])})
    def one(url):
        s = soup(url); body = s.select_one('.taw.entry-content')
        sp = specs(body)
        story_box = body.select_one('.taw-split > div')
        story = [clean(txt(p)) for p in story_box.find_all('p') if txt(p)] if story_box else []
        fig = body.select_one('figure.taw-fig a')
        return {
            'name': txt(s.select_one('h1.page-title')),
            'species': sp.get('Species'), 'weight': kg(sp.get('Weight')), 'length': sp.get('Length'),
            'spawnDepth': sp.get('Spawn Depth'), 'time': sp.get('Time of Day'),
            'hooks': [h.strip() for h in re.split(r',|\band\b', sp.get('Hook Sizes', '')) if h.strip()],
            'preferred': sp.get('Preferred Bait'),
            'reserves': [txt(a) for a in body.select('.taw-chips a')],
            'story': story, 'baits': baits(body), 'traits': traits(body),
            'image': img_url(s.select_one('.ct-featured-image img')),
            'map': fig['href'] if fig else None, 'source': url,
        }
    data = pmap(one, urls)
    data.sort(key=lambda d: (list(RESERVES.values()).index(d['reserves'][0]) if d['reserves'] and d['reserves'][0] in RESERVES.values() else 9, d['name']))
    return data


# ------------------------------------------------------------------------ missions
def missions():
    out = {}
    for slug, name in RESERVES.items():
        s = soup(f'{BASE}/missions/{slug}')
        groups = []
        for sec in s.select('section.taw-group'):
            h2 = sec.find('h2')
            for sub in h2.select('.taw-chip-sub'): sub.decompose()
            items = [{'name': clean(txt(li.find('a'))), 'url': li.find('a')['href']} for li in sec.select('ul.taw-cols li') if li.find('a')]
            groups.append({'type': txt(h2), 'about': txt(sec.find('p')), 'missions': items})
        out[name] = groups
    def detail(m):
        s = soup(m['url']); body = s.select_one('.taw.entry-content')
        desc = body.select_one('.taw-split em') if body else None
        rw = specs(body) if body else {}
        def num(k):
            v = re.sub(r'[^\d]', '', rw.get(k, ''))
            return int(v) if v else 0
        objs = []
        for h in (body.select('.taw-obj h3') if body else []):
            for loc in h.select('.taw-loc'): loc.decompose()
            t = clean(txt(h).lstrip('✅').strip())
            if t: objs.append(t)
        return {'name': m['name'], 'desc': clean(txt(desc)), 'xp': num('⭐ XP'), 'credits': num('💰 Credits'),
                'rep': num('🎖️ Reputation'), 'objectives': objs}
    flat = [m for groups in out.values() for g in groups for m in g['missions']]
    det = dict(zip([m['url'] for m in flat], pmap(detail, flat)))
    for groups in out.values():
        for g in groups: g['missions'] = [det[m['url']] for m in g['missions']]
    return out


# -------------------------------------------------------------------- collectibles
def collectibles():
    out = {}
    for slug, name in RESERVES.items():
        s = soup(f'{BASE}/collectibles/{slug}')
        groups = []
        for sec in s.select('section.taw-group'):
            h2 = sec.find('h2')
            for sub in h2.select('.taw-chip-sub'): sub.decompose()
            groups.append({'type': txt(h2), 'about': txt(sec.find('p')),
                           'items': [clean(txt(a)) for a in sec.select('ul.taw-cols li a')]})
        out[name] = groups
    return out


# ---------------------------------------------------------------------------- gear
def gear():
    cats = {'rods': 'Rods', 'reels': 'Reels', 'fishing-lines': 'Lines', 'hooks': 'Hooks'}
    out = {}
    for slug, label in cats.items():
        idx = soup(f'{BASE}/equipment/{slug}')
        intro = [clean(txt(p)) for p in idx.select('.entry-content > p.wp-block-paragraph')][:4]
        urls = []
        for a in idx.select('li.gspbgrid_item h3 a'):
            u = a['href'].rstrip('/')
            if u not in urls: urls.append(u)
        def one(url):
            s = soup(url); body = s.select_one('.taw.entry-content') or s.select_one('.entry-content')
            sp = specs(body)
            about = body.find('p') if body else None
            return {'name': txt(s.select_one('h1.page-title')), 'about': clean(txt(about)), 'stats': sp}
        out[label] = {'intro': intro, 'items': pmap(one, urls)}
    return out


# ---------------------------------------------------------------------- fish refresh
def fish_refresh(sources):
    def one(url):
        s = soup(url); body = s.select_one('.entry-content')
        sp = specs(body)
        ranks = []
        for tr in body.select('table tr'):
            cells = [txt(td) for td in tr.find_all(['td', 'th'])]
            if len(cells) != 3 or cells[0] == 'Rank': continue
            rank = re.sub(r'^[^A-Za-z]+', '', cells[0])
            w = re.findall(r'([\d.,]+\s*(?:kg|g))\b', cells[1])
            hooks = [h.strip() for h in re.split(r',|\band\b', cells[2]) if h.strip()]
            ranks.append({'rank': rank, 'min': kg(w[0]) if w else None, 'max': kg(w[-1]) if w else None, 'hooks': hooks})
        fig = body.select('figure a[href$=".webp"]')
        hot = [a['href'] for a in fig if 'hotspot' in a['href']]
        hab = re.search(r'can be found in (.+?)\.', txt(body))
        return url, {
            'ranks': ranks, 'baits': baits(body), 'traits': [t['name'] for t in traits(body)],
            'temp': sp.get('Water Temp Range'), 'ideal': sp.get('Ideal Water Temp'),
            'time': re.sub(r'^[^A-Za-z]+', '', sp.get('Time of Day', '')),
            'habitats': [h.strip() for h in re.split(r',|\band\b', hab.group(1)) if h.strip()] if hab else None,
            'hotspotMap': hot[0] if hot else None,
        }
    return dict(pmap(one, sources))


if __name__ == '__main__':
    html = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read().split('\n')
    line = next(l for l in html if l.startswith('const DATA='))
    DATA = json.loads(line[len('const DATA='):line.index(';const RIMG=')])
    sources = sorted({r['source'] for res in DATA['reserves'].values() for r in res['records'].values()})
    jobs = [('legendary', legendary), ('missions', missions), ('collectibles', collectibles), ('gear', gear),
            ('fish-refresh', lambda: fish_refresh(sources))]
    for name, fn in jobs:
        data = fn()
        json.dump(data, open(os.path.join(OUT, name + '.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
        print(name, 'ok', len(data))
