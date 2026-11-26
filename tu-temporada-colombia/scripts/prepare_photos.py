"""
Prepara las fotografías de estudio (fondo beige) para el catálogo.

- Solo procesa las fotos aprobadas (cuadradas, producto completo, fiel al artículo real).
  Las de las carpetas 02 y 03 no se usan: ver docs/revision-fotos.md.
- Exporta WebP grande (zoom, máx. 1254 px, tamaño nativo: nunca se amplía) y -sm (640 px).
- No aplica filtros de color.

Uso: python3 scripts/prepare_photos.py <carpeta_descomprimida>
"""
import sys, os
from PIL import Image, ImageFilter, ImageChops

SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'img', 'products')

# archivo de origen -> (carpeta destino, nombre)
ACCEPTED = {
    '05_Otros_productos_preparados/nivel_laser.png': 'nivel-laser-16-lineas',
    '05_Otros_productos_preparados/guadana_electrica.png': 'guadana-electrica',
    '05_Otros_productos_preparados/soldador_inverter.png': 'soldador-inverter-3-en-1',
    '05_Otros_productos_preparados/maleta_antirrobo.png': 'maleta-antirrobo',
    '05_Otros_productos_preparados/comedero_mascotas.png': 'comedero-mascotas-rodillo',
    '05_Otros_productos_preparados/intercomunicador_moto.png': 'intercomunicador-moto',
    '05_Otros_productos_preparados/set_arte.png': 'set-de-arte-208-piezas-rosado',
    '04_Set_hombre_4_colores_fondo_beige/negro.png': 'set-reloj-correa-billetera-negro',
    '04_Set_hombre_4_colores_fondo_beige/cafe.png': 'set-reloj-correa-billetera-cafe',
    '04_Set_hombre_4_colores_fondo_beige/azul.png': 'set-reloj-correa-billetera-azul',
    '04_Set_hombre_4_colores_fondo_beige/miel.png': 'set-reloj-correa-billetera-miel',
}
PENDING = {
    '05_Otros_productos_preparados/luces_cortina_led.png': 'luces-cortina-led-3x3',
    '05_Otros_productos_preparados/closet_tela.png': 'closet-de-tela-ref-2',
}

def inner_band(im):
    """Si la foto está pegada sobre un fondo liso, devuelve solo la foto."""
    bg = Image.new('RGB', im.size, im.getpixel((2, 2)))
    diff = ImageChops.difference(im, bg).convert('L').point(lambda v: 255 if v > 6 else 0)
    box = diff.getbbox()
    if not box: return im
    w, h = im.size
    if (box[2] - box[0]) * (box[3] - box[1]) > 0.92 * w * h: return im
    # 2 px hacia dentro para no arrastrar el borde de la unión
    return im.crop((box[0] + 2, box[1] + 2, box[2] - 2, box[3] - 2))

def to_square(im):
    w, h = im.size
    if abs(w - h) <= 2: return im
    s = max(w, h)
    canvas = Image.new('RGB', (s, s))
    # relleno: prolonga la fila/columna del borde y la suaviza
    if w > h:
        top = im.crop((0, 0, w, 1)).resize((w, (s - h) // 2 + 1))
        bot = im.crop((0, h - 1, w, h)).resize((w, s - h - (s - h) // 2 + 1))
        canvas.paste(top, (0, 0)); canvas.paste(bot, (0, (s - h) // 2 + h - 1))
        canvas = canvas.filter(ImageFilter.GaussianBlur(18))
        canvas.paste(im, (0, (s - h) // 2))
        # costura suave: degradado de 24 px sobre el borde de la foto
        mask = Image.new('L', (w, h), 255)
        f = 24
        for y in range(f):
            a = int(255 * y / f)
            for yy in (y, h - 1 - y):
                mask.paste(a, (0, yy, w, yy + 1))
        blurred = canvas.crop((0, (s - h) // 2, w, (s - h) // 2 + h)).filter(ImageFilter.GaussianBlur(10))
        canvas.paste(Image.composite(im, blurred, mask), (0, (s - h) // 2))
    else:
        return to_square(im.transpose(Image.Transpose.TRANSPOSE)).transpose(Image.Transpose.TRANSPOSE)
    return canvas

def export(src, name, folder):
    im = Image.open(os.path.join(SRC, src)).convert('RGB')
    im = to_square(inner_band(im))
    os.makedirs(os.path.join(OUT, folder), exist_ok=True)
    big = im if im.width <= 1254 else im.resize((1254, 1254), Image.Resampling.LANCZOS)
    big.save(os.path.join(OUT, folder, name + '.webp'), 'WEBP', quality=86, method=6)
    sm = im.resize((640, 640), Image.Resampling.LANCZOS) if im.width > 640 else im
    sm.save(os.path.join(OUT, folder, name + '-sm.webp'), 'WEBP', quality=80, method=6)
    print(f'{folder}/{name}.webp', big.size)

for s, n in ACCEPTED.items(): export(s, n, 'estudio')
for s, n in PENDING.items(): export(s, n, 'pendientes')
