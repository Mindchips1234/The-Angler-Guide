"""Save every wiki picture and map the app uses into img/, and point the app at the copies.

Usage:  python3 tools/bundle-images.py [cache-dir]

Covers fish pictures, reserve maps, hotspot maps and reserve logos (data/fish-data.js), and
legendary fish pictures and location maps (data/legendary.json). Images are resized and
re-encoded as WebP so the whole set stays small; a URL that already points into img/
is left alone, so the script can be re-run after tools/wiki-data.py.
Needs Pillow.
"""
import hashlib, io, json, os, re, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, '.wiki-cache')
os.makedirs(CACHE, exist_ok=True)
# kind: (folder, longest side in px, WebP quality)
KINDS = {'fish': ('img/fish', 1024, 78), 'hotspot': ('img/hotspots', 1200, 70), 'map': ('img/maps', 1600, 72),
         'logo': ('img/logos', 400, 85), 'legend': ('img/legendary', 1024, 78), 'legendmap': ('img/legendary-maps', 1200, 70)}


def fetch(url):
    path = os.path.join(CACHE, 'img-' + hashlib.sha1(url.encode()).hexdigest())
    if os.path.exists(path): return open(path, 'rb').read()
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'AnglerGuideApp/3.1 (bundling app images)'})
            data = urllib.request.urlopen(req, timeout=60).read()
            Image.open(io.BytesIO(data)).verify()
            open(path, 'wb').write(data); return data
        except Exception as e:
            if attempt == 3: raise RuntimeError(f'{url}: {e}')
            time.sleep(2 ** attempt)


def local(url, kind):
    if not url or not url.startswith('http'): return url
    folder, size, q = KINDS[kind]
    # The wiki reuses file names across upload months (e.g. Japan's Brook Trout), so keep the month.
    ym = re.search(r'/uploads/(\d{4})/(\d{2})/', url)
    name = re.sub(r'(-\d+x\d+)?\.\w+$', '', url.rsplit('/', 1)[-1]).lower() + (f'-{ym.group(1)}{ym.group(2)}' if ym else '') + '.webp'
    out = os.path.join(ROOT, folder, name)
    if not os.path.exists(out):
        os.makedirs(os.path.dirname(out), exist_ok=True)
        im = Image.open(io.BytesIO(fetch(url)))
        im = im.convert('RGBA' if im.mode in ('RGBA', 'LA', 'P') else 'RGB')
        im.thumbnail((size, size), Image.LANCZOS)
        im.save(out, 'WEBP', quality=q, method=6)
    return './' + folder + '/' + name


path = os.path.join(ROOT, 'data', 'fish-data.js')
lines = open(path, encoding='utf-8').read().split('\n')
i = next(n for n, l in enumerate(lines) if l.startswith('const DATA='))
line = lines[i]; a = line.index(';const RIMG='); b = line.index(';', a + 1)
data = json.loads(line[len('const DATA='):a]); rimg = json.loads(line[a + len(';const RIMG='):b])
legend_path = os.path.join(ROOT, 'data', 'legendary.json')
legend = json.load(open(legend_path, encoding='utf-8'))

jobs = []  # (setter, url, kind)
for res in data['reserves'].values():
    jobs.append((lambda v, r=res: r.__setitem__('map', v), res['map'], 'map'))
    for rec in res['records'].values():
        jobs.append((lambda v, r=rec: r.__setitem__('image', v), rec['image'], 'fish'))
        if rec.get('hotspotMap'): jobs.append((lambda v, r=rec: r.__setitem__('hotspotMap', v), rec['hotspotMap'], 'hotspot'))
for k, u in rimg.items(): jobs.append((lambda v, k=k: rimg.__setitem__(k, v), u, 'logo'))
for L in legend:
    if L.get('image'): jobs.append((lambda v, x=L: x.__setitem__('image', v), L['image'], 'legend'))
    if L.get('map'): jobs.append((lambda v, x=L: x.__setitem__('map', v), L['map'], 'legendmap'))

with ThreadPoolExecutor(6) as ex:
    results = list(ex.map(lambda j: local(j[1], j[2]), jobs))
for (setter, _, _), v in zip(jobs, results): setter(v)

lines[i] = ('const DATA=' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';const RIMG='
            + json.dumps(rimg, ensure_ascii=False) + line[b:])
open(path, 'w', encoding='utf-8').write('\n'.join(lines))
json.dump(legend, open(legend_path, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(len(jobs), 'images bundled')
