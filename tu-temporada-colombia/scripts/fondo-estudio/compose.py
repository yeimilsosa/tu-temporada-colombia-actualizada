import json, sys, os, math
import numpy as np
from PIL import Image, ImageFilter, ImageDraw, ImageFont

TOP = np.array([205, 192, 187], float); BOT = np.array([220, 207, 203], float)

def backdrop(S):
    y = np.linspace(0, 1, S)[:, None]; x = np.linspace(0, 1, S)[None, :]
    base = TOP + (BOT - TOP) * (y[..., None] ** 0.85)
    r = np.sqrt(((x - 0.5) / 0.75) ** 2 + ((y - 0.58) / 0.65) ** 2)
    glow = np.clip(1 - r, 0, 1)[..., None] * 7.0          # zona central un poco más clara
    vig = np.clip(r - 0.75, 0, 1)[..., None] * -10.0       # esquinas un poco más oscuras
    img = np.clip(base + glow + vig, 0, 255)
    noise = np.random.default_rng(7).normal(0, 0.9, img.shape)  # grano fino: evita bandas
    return Image.fromarray(np.clip(img + noise, 0, 255).astype(np.uint8))

def clean_alpha(rgba, keep=None, drop=(), desat=None, noblue=False, opening=None, nowhite=False, light=None):
    a = np.array(rgba.getchannel('A'))
    rgb = np.asarray(rgba.convert('RGB')).astype(int)
    h, w = a.shape
    if desat:  # quita lo saturado (cajas y avisos de color) dentro de una zona
        x0, y0, x1, y1 = desat
        mx, mn = rgb.max(2), rgb.min(2)
        sat = (mx - mn) / np.maximum(mx, 1)
        zone = np.zeros_like(a, bool); zone[int(y0*h):int(y1*h), int(x0*w):int(x1*w)] = True
        a[zone & ((sat > 0.18) | (mx < 120))] = 0
    if noblue:  # agua salpicada: tonos azul/cian claros
        r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
        a[(b > r + 25) & (b >= g - 5)] = 0
    for x0, y0, x1, y1, t in (light or []):  # quita lo que no es oscuro (impresiones de caja junto a un producto negro)
        zone = np.zeros_like(a, bool); zone[int(y0*h):int(y1*h), int(x0*w):int(x1*w)] = True
        a[zone & (rgb.max(2) > t)] = 0
    if nowhite:  # salpicaduras claras semitransparentes
        a[(a < 235) & (rgb.min(2) > 165)] = 0
    a[a < 12] = 0
    # componentes conectados (rápido con scipy si existe)
    try:
        from scipy import ndimage
        lab, n = ndimage.label(a > 40)
        if n > 1:
            sizes = ndimage.sum(np.ones_like(a), lab, range(1, n + 1))
            big = sizes.max()
            ok = [i + 1 for i, s in enumerate(sizes) if (s >= big * (keep if keep else 0.004))]
            mask = np.isin(lab, ok)
            mask = ndimage.binary_dilation(mask, iterations=3)
            a = np.where(mask, a, 0)
    except ImportError:
        pass
    if opening:  # quita aletas finas pegadas al borde: silueta suavizada (huecos rellenos)
        from scipy import ndimage
        x0, y0, x1, y1, sigma = opening[:5]
        zone = np.zeros_like(a, bool); zone[int(y0*h):int(y1*h), int(x0*w):int(x1*w)] = True
        for ex in opening[5:]:  # zonas que se respetan (cables, piezas finas reales)
            zone[int(ex[1]*h):int(ex[3]*h), int(ex[0]*w):int(ex[2]*w)] = False
        solid = ndimage.binary_fill_holes(a > 60).astype(float)
        smooth = ndimage.gaussian_filter(solid, sigma) > 0.5
        a[zone & ~smooth] = 0
        lab, n = ndimage.label(a > 40)  # lo que quedó suelto tras suavizar
        if n > 1:
            sizes = ndimage.sum(np.ones_like(a), lab, range(1, n + 1))
            a[~np.isin(lab, [i + 1 for i, s_ in enumerate(sizes) if s_ >= sizes.max() * 0.02])] = 0
    for (x0, y0, x1, y1) in drop:
        h, w = a.shape; a[int(y0*h):int(y1*h), int(x0*w):int(x1*w)] = 0
    # pasada final: lo que quedó suelto después de los recortes
    from scipy import ndimage
    lab, n = ndimage.label(a > 0)
    if n > 1:
        sizes = ndimage.sum(np.ones_like(a), lab, range(1, n + 1))
        a[~np.isin(lab, [i + 1 for i, s_ in enumerate(sizes) if s_ >= sizes.max() * (keep or 0.004)])] = 0
    rgba.putalpha(Image.fromarray(a))
    return rgba

def compose(cut, fill=0.78, lift=0.04):
    box = cut.getbbox()
    cut = cut.crop(box)
    w, h = cut.size
    S = int(min(1400, max(900, math.ceil(max(w, h) / fill))))
    k = min(S * fill / w, S * fill / h)
    cut = cut.resize((max(1, round(w * k)), max(1, round(h * k))), Image.Resampling.LANCZOS)
    w, h = cut.size
    x = (S - w) // 2; y = int((S - h) / 2 + S * lift)  # un poco bajo el centro: se apoya
    y = min(y, S - h - int(S * 0.06))
    bg = backdrop(S).convert('RGBA')
    a = cut.getchannel('A')
    # sombra de contacto: elipse difusa bajo la base
    sh = Image.new('L', (S, S), 0); d = ImageDraw.Draw(sh)
    cx, base = x + w / 2, y + h
    d.ellipse((cx - w * 0.46, base - h * 0.035, cx + w * 0.46, base + h * 0.035), fill=90)
    sh = sh.filter(ImageFilter.GaussianBlur(S * 0.018))
    # sombra ambiental: la silueta, desplazada y muy difusa
    amb = Image.new('L', (S, S), 0); amb.paste(a.point(lambda v: v * 0.32), (x, y + int(S * 0.012)))
    amb = amb.filter(ImageFilter.GaussianBlur(S * 0.022))
    shadow = Image.fromarray(np.maximum(np.array(sh), np.array(amb)))
    dark = Image.new('RGBA', (S, S), (120, 100, 92, 255))
    bg = Image.composite(dark, bg, shadow.point(lambda v: v * 0.55))
    bg.alpha_composite(cut, (x, y))
    return bg.convert('RGB')

if __name__ == '__main__':
    jobs = json.load(open('jobs.json')); cfg = json.load(open('cfg.json')) if os.path.exists('cfg.json') else {}
    os.makedirs('out', exist_ok=True)
    only = sys.argv[1].split(',') if len(sys.argv) > 1 else None
    for j in jobs:
        k = j['key']
        if only and k not in only: continue
        c = cfg.get(k, {})
        cut = clean_alpha(Image.open(f'cut/{k}.png').convert('RGBA'), c.get('keep'), c.get('drop', []), c.get('desat'), c.get('noblue', False), c.get('opening'), c.get('nowhite', False), c.get('light'))
        compose(cut, c.get('fill', 0.78), c.get('lift', 0.04)).save(f'out/{k}.png')
        print(k, flush=True)
