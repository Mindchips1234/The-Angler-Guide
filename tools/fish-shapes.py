"""Build the 3D fish textures (fish-tex/) and outlines (fish-shapes.js) from the wiki pictures.

Usage:  python3 tools/fish-shapes.py <pictures-dir> fish-tex fish-shapes.js [preview-dir]

<pictures-dir> holds the 1024x484 wiki pictures saved as <Fish-Name>.webp
(the fish name with every run of non-letters/digits replaced by "-", e.g.
Tiger-Muskie-Muskellunge.webp). Needs numpy, scipy and Pillow. Fish missing from
<pictures-dir> keep their existing outline in fish-shapes.js, so a few can be rebuilt alone.
The app's own copies in img/fish/ work as pictures once renamed (they are re-encoded, so a full
rebuild from them shifts every texture slightly; rebuild only the fish that need it).
For each fish this cuts it out of the navy background, saves a 512 px wide
texture, and traces the body outline with the fins removed.
"""
import sys, os, json, glob
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

src, out_tex, out_js = sys.argv[1:4]; preview = sys.argv[4] if len(sys.argv) > 4 else None
os.makedirs(out_tex, exist_ok=True)
if preview: os.makedirs(preview, exist_ok=True)
SKIP = {'Japanese-Freshwater-Crab', 'Signal-Crayfish'}
N = 56  # profile samples along the body
shapes = {}

def disk(r):
    y, x = np.ogrid[-r:r+1, -r:r+1]
    return x*x + y*y <= r*r

for f in sorted(glob.glob(os.path.join(src, '*.webp'))):
    slug = os.path.basename(f)[:-5]
    if slug in SKIP: continue
    im = Image.open(f).convert('RGB'); a = np.asarray(im).astype(float)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    blue = b - (r + g) / 2; lum = .3*r + .59*g + .11*b
    # Model the background (navy, with a vignette and the odd darker patch) from the pixels that
    # are plainly background, then call anything that stands out from it fish. Colour rules alone
    # lose pale bluish heads and fins and keep dark background patches.
    clear = (lum < 45) & (blue > 10); clear[425:, :560] = True
    w = ndi.gaussian_filter(clear.astype(float), 24)
    bgc = np.dstack([ndi.gaussian_filter(a[..., c] * clear, 24) for c in range(3)]) / np.maximum(w, 1e-6)[..., None]
    diff = np.sqrt(((ndi.median_filter(a, size=(5, 5, 1)) - bgc)**2).sum(-1))  # median drops dither specks
    fg = diff > 16
    # The median also drops barbels and fin rays a pixel or two wide; take back strong, long runs.
    strong = (np.sqrt(((a - bgc)**2).sum(-1)) > 24) | ((blue < 5) & (lum > 22))   # dark barbels: not navy in hue
    ls, ns = ndi.label(strong, np.ones((3, 3)))
    if ns: fg |= np.isin(ls, 1 + np.nonzero(ndi.sum(strong, ls, range(1, ns+1)) >= 40)[0])
    fg[425:, :560] = False                      # species name label
    fg = ndi.binary_opening(fg, disk(1))        # specks
    fg = ndi.binary_closing(fg, disk(3))
    lab, n = ndi.label(fg)
    if not n: print('no fish', slug); continue
    sizes = ndi.sum(fg, lab, range(1, n+1)); main = lab == (np.argmax(sizes) + 1)
    near = ndi.binary_dilation(main, disk(14))
    ids = np.unique(lab[near & fg]); ids = ids[ids > 0]
    ids = [i for i in ids if sizes[i-1] > 250]
    keep = np.isin(lab, ids) | main
    mask = ndi.binary_fill_holes(keep)
    ys, xs = np.nonzero(mask); x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    pad = 6; x0 = max(0, x0-pad); y0 = max(0, y0-pad); x1 = min(1023, x1+pad); y1 = min(483, y1+pad)
    m = mask[y0:y1+1, x0:x1+1]; rgb = a[y0:y1+1, x0:x1+1]; bgm = bgc[y0:y1+1, x0:x1+1]
    # Edge alpha: how far each pixel sits between the background and the nearest solid fish
    # colour, so see-through fin edges fade smoothly instead of breaking into jags, and edge
    # pixels lose their navy tint. Nothing away from the fish is kept.
    core = ndi.binary_erosion(m, disk(3))
    dcore, (iy, ix) = ndi.distance_transform_edt(~core, return_indices=True)
    fc = rgb[iy, ix]; fb = fc - bgm
    cov = ((rgb - bgm) * fb).sum(-1) / np.maximum((fb * fb).sum(-1), 400)
    alpha = np.clip(cov, 0, 1) * ndi.binary_dilation(m, disk(2))
    # Barbels and thin rays are far from any solid part, whose colour says nothing about them.
    alpha = np.where(m & (dcore > 3), np.maximum(alpha, .75), alpha)
    alpha = np.where(core, 1, alpha)
    ak = np.maximum(alpha, .6)[..., None]   # unmix lightly: fins are drawn solid, so faint ones must not turn vivid
    rgb = np.where(core[..., None], rgb, (bgm + (rgb - bgm) / ak).clip(0, 255))
    alpha = ndi.gaussian_filter(alpha, .6) * 255
    # Bleed colours outward so texture filtering never pulls in the background.
    _, (iy, ix) = ndi.distance_transform_edt(alpha < 128, return_indices=True)
    bled = rgb[iy, ix]
    H, W = m.shape
    # Body = mask with thin parts (fins, barbels, tail lobes) opened away.
    rad = max(4, int(.085 * (H - 2*pad)))
    body = ndi.binary_opening(m, disk(rad))
    body = ndi.binary_fill_holes(body)
    lb, nb = ndi.label(body)
    if nb: body = lb == (np.argmax(ndi.sum(body, lb, range(1, nb+1))) + 1)
    cols = np.nonzero(body.any(0))[0]; bx0, bx1 = cols.min(), cols.max()
    top = np.full(W, np.nan); bot = np.full(W, np.nan)
    for x in range(bx0, bx1+1):
        yy = np.nonzero(body[:, x])[0]
        if len(yy): top[x], bot[x] = yy.min(), yy.max()
    hgt = bot - top
    # Tail base: the narrowest point of the whole silhouette (fins included)
    # between the rear fins and the tail fin.
    mc = np.nonzero(m.any(0))[0]; tip, end = int(mc.min()), int(mc.max())
    full = np.array([(np.ptp(np.nonzero(m[:, x])[0]) if m[:, x].any() else 0) for x in range(W)], float)
    lo, hi = int(tip + .6*(end-tip)), int(tip + .93*(end-tip))
    ped = lo + int(np.argmin(full[lo:hi+1]))
    ped = min(ped, bx1)
    xsamp = np.linspace(tip, ped, N)
    def interp(arr):
        idx = np.arange(W); ok = ~np.isnan(arr)
        return np.interp(xsamp, idx[ok], arr[ok])
    t_s, b_s = interp(top), interp(bot)
    # Fins attached along the back and belly leave bumps that are narrow compared with the
    # body's own curve; flatten bumps shorter than about 40% of the body (long catfish fins).
    win = max(5, round(.38 * N))
    t_s = ndi.grey_closing(t_s, size=win, mode='nearest')   # upward bumps (dorsal fins)
    b_s = ndi.grey_opening(b_s, size=win, mode='nearest')   # downward bumps (belly fins)
    # Behind its deepest point a body tapers smoothly to the tail base; anything hanging
    # outside that taper (long anal fins running to the tail, second dorsal fins) is fin.
    front = int(.55 * N); last = N - 1
    ib = int(np.argmax(b_s[:front])); it = int(np.argmin(t_s[:front]))
    for i in range(ib, N):
        u = (i - ib) / max(1, last - ib); cap = b_s[last] + (b_s[ib] - b_s[last]) * np.cos(np.pi/2*u)**.8
        b_s[i] = min(b_s[i], cap)
    for i in range(it, N):
        u = (i - it) / max(1, last - it); cap = t_s[last] - (t_s[last] - t_s[it]) * np.cos(np.pi/2*u)**.8
        t_s[i] = max(t_s[i], cap)
    k = np.ones(5)/5
    t_s = np.convolve(np.pad(t_s, 2, mode='edge'), k, 'valid'); b_s = np.convolve(np.pad(b_s, 2, mode='edge'), k, 'valid')
    # Taper the very tip so the snout closes.
    mid = (t_s + b_s) / 2
    for i in range(3):
        f_ = [.15, .55, .85][i]; t_s[i] = mid[i] - (mid[i]-t_s[i])*f_; b_s[i] = mid[i] + (b_s[i]-mid[i])*f_
    # Save texture at 512 px wide.
    scale = 512 / W
    tex = Image.fromarray(np.dstack([bled, alpha]).clip(0, 255).astype(np.uint8), 'RGBA').resize((512, max(8, round(H*scale))), Image.LANCZOS)
    tex.save(os.path.join(out_tex, slug + '.webp'), 'WEBP', quality=84, method=6)
    shapes[slug] = {'w': W, 'h': H, 'x': [round(v, 1) for v in xsamp], 't': [round(v, 1) for v in t_s], 'b': [round(v, 1) for v in b_s]}
    if not preview: continue
    # Preview: mask outline + body profile + tail base.
    pv = Image.fromarray(rgb.astype(np.uint8)).convert('RGB'); px = pv.load()
    edge = m ^ ndi.binary_erosion(m, disk(1))
    for y, x in zip(*np.nonzero(edge)): px[x, y] = (255, 255, 0)
    for xv, tv, bv in zip(xsamp, t_s, b_s):
        for yv in (tv, bv): 
            xi, yi = int(xv), int(yv)
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    if 0 <= yi+dy < H and 0 <= xi+dx < W: px[xi+dx, yi+dy] = (255, 0, 255)
    for y in range(H):
        for dx in (0, 1): px[min(W-1, int(ped)+dx), y] = (0, 255, 255)
    pv.save(os.path.join(preview, slug + '.png'))
# Pictures not given this run keep their saved outline, so a few fish can be rebuilt on their own.
if os.path.exists(out_js):
    old = json.loads(open(out_js).read().split('export default ', 1)[1].rstrip().rstrip(';'))
    shapes = {**old, **shapes}
shapes = dict(sorted(shapes.items()))
with open(out_js, 'w') as fh:
    fh.write("// Generated by tools/fish-shapes.py from the wiki fish pictures: outline of each fish's body\n")
    fh.write("// in picture pixels (w,h: picture size; x: samples snout to tail base; t,b: top and bottom edges).\n")
    fh.write("export default " + json.dumps(shapes, separators=(",", ":")) + ";\n")
print(len(shapes), 'fish')
