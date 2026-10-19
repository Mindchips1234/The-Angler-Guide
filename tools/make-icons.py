"""Build every app icon from tools/icon-src/logo-512.png (the logo on a transparent background).

Usage:  python3 tools/make-icons.py

- favicon.ico, icon-32.png: just the round emblem, since the logo's text is unreadable at tab size.
- icon-192.png, icon-512.png: the full logo on a white rounded tile, so the dark text stays
  readable on dark browser themes, taskbars and Edge's new tab page.
- icon-maskable-512.png, apple-touch-icon.png: full-bleed white with the logo inside the safe zone
  (Android and iOS cut their own shape).
- mstile-150x150.png: the logo for Windows Start tiles (background colour from browserconfig.xml).
Needs Pillow.
"""
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = Image.open(os.path.join(ROOT, 'tools', 'icon-src', 'logo-512.png')).convert('RGBA')
logo = src.crop(src.getchannel('A').getbbox())
WHITE = (255, 255, 255, 255)


def emblem():
    """The round picture at the top of the logo, without the text under it."""
    a = src.getchannel('A')
    rows = [y for y in range(src.height) if sum(a.getpixel((x, y)) > 128 for x in range(0, src.width, 2)) > 0]
    top = rows[0]
    gap = next(y for y in range(top, src.height) if all(a.getpixel((x, y)) <= 128 for x in range(src.width)))
    return src.crop((0, top, src.width, gap)).crop(src.crop((0, top, src.width, gap)).getchannel('A').getbbox())


def fit(img, size, fill):
    """img scaled to fill `fill` of a size x size transparent square, centred."""
    s = fill * size / max(img.size)
    im = img.resize((max(1, round(img.width * s)), max(1, round(img.height * s))), Image.LANCZOS)
    out = Image.new('RGBA', (size, size))
    out.alpha_composite(im, ((size - im.width) // 2, (size - im.height) // 2))
    return out


def tile(size, fill, radius):
    """Full logo on a white square (rounded when radius > 0)."""
    out = Image.new('RGBA', (size, size))
    mask = Image.new('L', (size, size))
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1), radius=round(size * radius), fill=255)
    out.paste(WHITE, (0, 0), mask)
    out.alpha_composite(fit(logo, size, fill))
    return out


def save(img, name, **kw):
    img.save(os.path.join(ROOT, name), optimize=True, **kw)
    print('wrote', name, img.size)


e = emblem()
save(fit(e, 64, 1.0), 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
save(fit(e, 32, 1.0), 'icon-32.png')
save(tile(192, .84, .22), 'icon-192.png')
save(tile(512, .84, .22), 'icon-512.png')
save(tile(512, .66, 0), 'icon-maskable-512.png')
save(tile(180, .80, 0).convert('RGB'), 'apple-touch-icon.png')
save(fit(logo, 150, .78), 'mstile-150x150.png')
