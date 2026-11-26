# Fondo de estudio para las fotos originales

Pone las fotos reales del catálogo sobre el mismo fondo beige de las fotos de estudio. No genera ni
retoca el producto: solo lo recorta y lo compone en un cuadrado con una sombra suave.

1. `seg.py` recorta el producto de cada foto de `jobs.json` con rembg (modelo `isnet-general-use`) y
   deja el resultado en `cut/`. Un recorte opcional (`crop`) aísla el producto cuando la foto trae
   recuadros o fotos de uso alrededor.
2. `compose.py` limpia restos (cajas, letras de avisos, salpicaduras) con las reglas de `cfg.json`,
   compone el producto sobre el fondo beige (degradado suave, sombra de contacto) y guarda en `out/`.
3. Se exporta a `assets/img/products/estudio/` (WebP de 1254 px y de 640 px) y se relaciona en
   `js/data/photos.js` por nombre de producto y variante.

```bash
pip install rembg onnxruntime scipy pillow
python3 seg.py                 # todas, o: python3 seg.py isnet-general-use clave1,clave2
python3 compose.py             # todas, o: python3 compose.py clave1,clave2
```

El organizador de baúl y el set de arte azul se recortaron por color (fondo blanco puro), porque el
modelo confundía la tela negra y el estuche celeste con el fondo.
