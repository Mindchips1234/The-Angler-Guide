"""Find the spawn-spot markers on each legendary's location map and save them in data/legendary.json.

Usage:  python3 tools/legend-spots.py [--debug out-dir]

The wiki's location maps mark every known spawn spot with a bright green circle (about 16 px on
the 1200 px maps). In the app those are only a few pixels wide, so the app draws its own numbered
markers instead, using the positions found here: "spots": [[x, y], ...] as fractions of the map's
width and height, numbered from the top-left. --debug saves each map with the found spots circled.
Needs Pillow, numpy and scipy.
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, 'data', 'legendary.json')


def spots(path):
    a = np.asarray(Image.open(path).convert('RGB')).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    green = (g > 170) & (g - r > 90) & (g - b > 90)  # the marker fill; map greens are far duller
    green = ndimage.binary_closing(green, iterations=2)
    lab, n = ndimage.label(green)
    h, w = green.shape
    out = []
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        area = (lab[sl] == i).sum()
        sy, sx = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        if area < 25 or max(sy, sx) > 60 or min(sy, sx) < 5: continue  # specks, or large green areas
        cy, cx = ndimage.center_of_mass(lab == i)
        out.append([round(cx / w, 4), round(cy / h, 4)])
    # number them in reading order (rows about 4% of the map tall)
    return sorted(out, key=lambda p: (round(p[1] / .04), p[0]))


def main(args):
    debug = args[args.index('--debug') + 1] if '--debug' in args else None
    data = json.load(open(PATH, encoding='utf-8'))
    for l in data:
        if not l.get('map'): continue
        path = os.path.join(ROOT, l['map'])
        l['spots'] = spots(path)
        print(f"{l['name']}: {len(l['spots'])} spots")
        if debug:
            os.makedirs(debug, exist_ok=True)
            im = Image.open(path).convert('RGB'); d = ImageDraw.Draw(im)
            for k, (x, y) in enumerate(l['spots'], 1):
                X, Y = x * im.width, y * im.height
                d.ellipse((X - 22, Y - 22, X + 22, Y + 22), outline=(255, 0, 255), width=4)
                d.text((X + 24, Y - 10), str(k), fill=(255, 0, 255))
            im.save(os.path.join(debug, l['name'].replace(' ', '_') + '.png'))
    json.dump(data, open(PATH, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))


if __name__ == '__main__':
    main(sys.argv[1:])
