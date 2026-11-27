# Fondo celeste brumoso (#CFE0EA) para las fotos de producto

Noviembre de 2026: todas las fotos de producto pasan del fondo beige a un fondo plano #CFE0EA.
El producto no se retoca: se recorta de la foto publicada y se pone sobre el color, centrado y
con las mismas dimensiones de la imagen original.

1. `seg.py` saca la máscara de cada imagen de `list.json` con rembg (`isnet-general-use`) en `cut/`.
2. `compose.py` limpia motas, corrige el halo de los bordes (descontaminación del color del fondo
   viejo), pasa al celeste el fondo que se ve a través de partes transparentes (`tint` en
   `cfg.json`: bandeja del carro, burbujas, frasco, licuadora, cable de la aspiradora), centra el
   producto y guarda en `out/`. `cfg.json` también borra restos del remolino dorado de dos fotos de
   ENGORILATE (`erase_out`, `hull_dark`).
3. Se exporta a WebP sobre los mismos archivos (grande y `-sm`).

No se procesaron las 8 fotos publicitarias o de uso de la galería (3 de la guadaña con textos y
logo, 5 de la licuadora con frutas y manos): no tienen un fondo liso que cambiar.

Las rutas de `seg.py` y `compose.py` apuntan a /home/claude/bg; ajustarlas antes de volver a correr.
