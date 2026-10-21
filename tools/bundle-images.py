"""Save every wiki picture and map the app uses into img/, and point the app at the copies.

Usage:  python3 tools/bundle-images.py [cache-dir]

Covers fish pictures, reserve maps, hotspot maps and reserve logos (data/fish-data.js), and
legendary fish pictures and location maps (data/legendary.json). Images are resized and
re-encoded as WebP so the whole set stays small; a URL that already points into img/
is left alone, so the script can be re-run after tools/wiki-data.py.
The wiki's fish pictures carry the fish name in yellow at the bottom left; it is painted
over with the navy background (see strip_caption), including on pictures already in img/.
Needs Pillow and numpy.
"""
import glob, hashlib, io, json, os, re, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor
import numpy as np
from PIL import Image, ImageFilter

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


def strip_caption(im):
    """Paint over the yellow fish name in the bottom left of a wiki fish picture.

    Returns the cleaned picture, or None when there is no caption. Only the box around the
    lettering changes. It is refilled with a mirror image of the backdrop just above it, so the
    navy gradient and its grain carry on unbroken; where a fin hangs into that mirrored strip, a
    smooth fit of the backdrop plus matching grain is used instead, so no fish part is copied.
    Fins above the caption and the "cotw.pro" watermark are untouched.
    """
    a = np.asarray(im.convert('RGB')).astype(float); h, w, _ = a.shape
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    top = int(h * 0.9)  # the caption sits in the bottom ~9%; fish fins stop above it
    yel = (r > 150) & (g > 110) & (b < 110) & (r - b > 80)
    yel[:top] = False; yel[:, w // 2:] = False
    ys, xs = np.nonzero(yel)
    if len(ys) < 150: return None
    y0, x1 = max(top - 4, ys.min() - 5), min(w, xs.max() + 10)
    n = h - y0
    # Smooth fit of the backdrop from the strip above the box and the same rows to its right,
    # minus anything brighter than the navy (fins, specks).
    yy, xx = np.mgrid[0:h, 0:w]
    near = ((yy >= y0 - 2 * n) & (yy < y0) & (xx < x1 + 60)) | ((yy >= y0) & (xx >= x1) & (xx < x1 + 160))
    near &= a.max(axis=2) < np.percentile(a.max(axis=2)[near], 80) + 6
    def terms(y, x):
        y, x = y / h, x / w
        return np.stack([np.ones_like(x), x, y, x * x, x * y, y * y], -1)
    coef, *_ = np.linalg.lstsq(terms(yy[near], xx[near]), a[near], rcond=None)
    # The backdrop's grain is grey (the same in every channel), so the fallback noise is too.
    noise = (a[near] - terms(yy[near], xx[near]) @ coef).mean(axis=1).std()
    by, bx = np.mgrid[y0:h, 0:x1]
    smooth = terms(by, bx) @ coef + np.random.default_rng(0).normal(0, noise, (n, x1, 1))
    mirror = a[y0 - 1:y0 - n - 1:-1, 0:x1]
    # A mirrored pixel counts as fish when it is well above the backdrop; grow that a few px for its soft edge.
    fish = (mirror - (terms(by, bx) @ coef)).max(axis=2) > 6 * noise + 25
    fish = np.asarray(Image.fromarray(fish.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(9))) > 0
    out = a.copy(); out[y0:h, 0:x1] = np.where(fish[..., None], smooth, mirror)
    return Image.fromarray(np.clip(out, 0, 255).round().astype(np.uint8))


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
        if kind in ('fish', 'legend'): im = strip_caption(im) or im
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

# Pictures bundled before captions were stripped; a cleaned picture has no yellow left, so this is a no-op on re-runs.
cleaned = 0
for f in sorted(glob.glob(os.path.join(ROOT, 'img/fish/*.webp')) + glob.glob(os.path.join(ROOT, 'img/legendary/*.webp'))):
    im = strip_caption(Image.open(f))
    if im: im.save(f, 'WEBP', quality=KINDS['legend' if 'legendary' in f else 'fish'][2], method=6); cleaned += 1
print(cleaned, 'fish captions removed')
