"""Build the 3D fish textures (fish-tex/) and outlines (fish-shapes.js) from the wiki pictures.

Usage:  python3 tools/fish-shapes.py <pictures-dir> fish-tex fish-shapes.js [preview-dir]

<pictures-dir> holds the 1024x484 wiki pictures saved as <Fish-Name>.webp
(the fish name with every run of non-letters/digits replaced by "-", e.g.
Tiger-Muskie-Muskellunge.webp). Needs numpy, scipy and Pillow.
For each fish this cuts it out of the navy background, saves a 512 px wide
texture, and traces the body outline with the fins removed.
"""
import sys, os, json, glob
import numpy as np
from PIL import Image, ImageFilter
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
    fg = (blue < 15) | (lum > 95)
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
    m = mask[y0:y1+1, x0:x1+1]; rgb = a[y0:y1+1, x0:x1+1]
    # Soft edge, and bleed colours outward so texture filtering never pulls in the background.
    alpha = np.asarray(Image.fromarray((m*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(.8))).astype(float)
    alpha = np.where(m, np.maximum(alpha, 200), alpha)
    _, (iy, ix) = ndi.distance_transform_edt(~ndi.binary_erosion(m, disk(1)), return_indices=True)
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
with open(out_js, 'w') as fh:
    fh.write("// Generated by tools/fish-shapes.py from the wiki fish pictures: outline of each fish's body\n")
    fh.write("// in picture pixels (w,h: picture size; x: samples snout to tail base; t,b: top and bottom edges).\n")
    fh.write("export default " + json.dumps(shapes, separators=(",", ":")) + ";\n")
print(len(shapes), 'fish')
