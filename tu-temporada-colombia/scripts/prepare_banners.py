"""
Prepara los banners publicitarios del carrusel de la portada.

Lee cada imagen de banners-fuente/ (PNG, JPG o WebP) y exporta a assets/img/banners/ tres
anchos en WebP: 640, 1280 y 1920 px (nunca amplía: si el original es más pequeño, el ancho
mayor queda en su tamaño nativo). El navegador elige el más liviano para cada pantalla.

Archivos para móvil (opcional): si existe «<nombre>-movil.png» en banners-fuente/, se exporta
como «<nombre>-movil-<ancho>.webp» y la página lo usa en pantallas de 760 px o menos.

Uso: python3 scripts/prepare_banners.py
Después, registra el banner nuevo en js/data/banners.js (el script imprime la línea).
"""
import os
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = os.path.join(ROOT, 'banners-fuente')
OUT = os.path.join(ROOT, 'assets', 'img', 'banners')
WIDTHS = (640, 1280, 1920)
QUALITY = 84

os.makedirs(OUT, exist_ok=True)
for f in sorted(os.listdir(SRC)):
    name, ext = os.path.splitext(f)
    if ext.lower() not in ('.png', '.jpg', '.jpeg', '.webp'):
        continue
    im = Image.open(os.path.join(SRC, f)).convert('RGB')
    w0, h0 = im.size
    done = set()
    for w in WIDTHS:
        w = min(w, w0)
        if w in done:
            continue
        done.add(w)
        h = round(h0 * w / w0)
        out = im if w == w0 else im.resize((w, h), Image.LANCZOS)
        # El nombre usa el ancho pedido (640/1280/1920) para que las rutas sean predecibles.
        label = next(x for x in WIDTHS if min(x, w0) == w)
        dst = os.path.join(OUT, f'{name}-{label}.webp')
        out.save(dst, 'WEBP', quality=QUALITY, method=6)
        print(f'{dst}  {w}x{h}  {os.path.getsize(dst) // 1024} KB')
    if not name.endswith('-movil'):
        print(f'  → js/data/banners.js: {{ file: "{name}", width: {w0}, height: {h0}, alt: "…" }}')
