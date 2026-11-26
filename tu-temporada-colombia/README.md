# Tu Temporada Colombia — v2

Intro 3D de la Tierra nocturna controlada por scroll que termina en Colombia, y tienda editorial
monocromática con el catálogo original completo. Sin carrito ni checkout (ver "Carrito a futuro").

## Ejecutar localmente

Requiere Node 18 o superior.

```bash
npm install          # una vez: solo instala esbuild
npm run dev          # http://localhost:5173  (código fuente, sin compilar)
```

También sirve cualquier servidor estático (`python3 -m http.server`). Abrir `index.html` con doble clic
**no** funciona en desarrollo: los navegadores bloquean módulos JS y texturas WebGL desde `file://`.

### Publicar

```bash
npm run build        # genera dist/web/: la carpeta que se sube al hosting
npm run preview      # la sirve en http://localhost:5174 para revisarla antes de subirla
```

`dist/web/` tiene un JS y un CSS minificados, y las fotos, texturas y fuentes como archivos aparte. Las
tarjetas fuera de pantalla cargan su foto de forma diferida y las demás fotos de cada producto solo se
piden al navegar. Al abrir la tienda se transfieren unos 3,6 MB (la Tierra se lleva 1,9 MB; las 22 fotos
de tarjeta, unos 0,8 MB).

### Vista previa de un solo archivo

```bash
npm run build:single # genera dist/tu-temporada-colombia.html (~17 MB, todo embebido en Base64)
```

Abre con doble clic, sin servidor. Sirve para revisar o enviar la tienda; para publicar, usa `dist/web/`:
el archivo único obliga a descargar todas las fotos antes de mostrar nada.

Parámetros útiles de prueba: `?quality=low|medium|high` fuerza la calidad gráfica, `?nowebgl` muestra
la versión sin WebGL, `?shot=0.74` congela el recorrido en ese progreso.

## Arquitectura

```
index.html                 Estructura: intro, header, menús, búsqueda, <main id="app">, footer
css/base.css               Tokens (paleta oficial, tipografía), header, footer, botones
css/intro.css              Escenario de la intro, textos, pin y placa de transición
css/shop.css               Portada, catálogo, tarjetas, detalle, galería, visor
js/main.js                 Arranque, enrutador por hash y acciones globales
js/core/env.js             Rutas de recursos, detección de WebGL/calidad, utilidades de easing
js/intro/journey.js        Línea de tiempo por scroll (ScrollTrigger + suavizado) → cámara y CSS
js/intro/earth.js          Escena three.js: Tierra, nubes, atmósfera, estrellas, fronteras
js/intro/shaders.js        Shaders GLSL (Tierra, nubes, atmósfera, estrellas)
js/data/catalog.js         Catálogo (24 productos) y categorías — los datos del negocio
js/data/photos.js          Portadas de estudio (fondo beige) que se anteponen a las fotos originales
js/data/geo/borders.js     Fronteras de Colombia y región (Natural Earth)
js/shop/catalog.js         Búsqueda, filtros, orden, imágenes, SEO
js/shop/store.js           Guardados, vistos recientes y modo de galería (localStorage)
js/shop/views.js           Plantillas del marketplace, guardados y detalle
js/shop/gallery.js         Carrusel, mosaico, miniaturas y visor ampliado
js/shop/motion.js          Aparición sutil de tarjetas y fundidos al filtrar
js/shop/cards.js           Fotos de las tarjetas: flechas, puntos, swipe y teclado
assets/                    Fuentes, texturas, imágenes de productos, respaldo estático
vendor/                    three.js r187 (minificado), GSAP 3.15 + ScrollTrigger
backup/original/           Los dos HTML originales sin modificar
docs/revision-fotos.md     Revisión de cada foto nueva: cuáles se usan y por qué se descartaron las demás
fotos-por-revisar/         Fotos nuevas no publicadas, separadas por motivo (la tienda no las carga)
scripts/                   Servidor, builds (web y archivo único), logo y preparación de fotos
```

Para editar productos: `js/data/catalog.js`. Las imágenes van en `assets/img/products/` en dos tamaños
(`nombre.webp` hasta 1600 px y `nombre-sm.webp` de 640 px para tarjetas):

```
assets/img/products/            fotos originales del catálogo
assets/img/products/estudio/    fotos de estudio aprobadas (fondo beige, 1:1)
assets/img/products/pendientes/ fotos preparadas que esperan confirmación (no se publican)
```

## Fotografías de estudio

Las portadas con fondo beige se definen en `js/data/photos.js`, relacionadas por **nombre de producto y de
variante**, nunca por posición. Al cargar, cada foto de estudio se antepone a las fotos del producto o de
su variante: queda como portada y las fotos originales (detalles, accesorios, ángulos, avisos) siguen en el
carrusel, el mosaico, las miniaturas y el visor. `js/data/catalog.js` no se modificó. Para revertir un
producto basta con borrar su línea.

- En el Set de reloj, cada color (Negro, Café, Azul, Miel) muestra su propia foto de estudio y al elegirlo la
  galería salta a ella. El Kit de maleta conserva las fotos reales de sus 15 diseños.
- Si la foto de una variante ya está en la vista general, la galería no la repite: ese mismo slide
  representa a la variante.
- Las fotos de estudio traen su fondo y ocupan todo el cuadro, sin margen interior (`.is-studio`), con
  `object-fit: contain` en un cuadro 1:1: no se recortan ni se deforman. No se aplicó ningún filtro de color.
- Preparación: `npm run photos -- <carpeta descomprimida>` (Pillow) exporta WebP de 1254 px para el zoom y
  de 640 px para las tarjetas. Solo procesa la lista aprobada.

### Fotos originales sobre el mismo fondo

Los productos sin imagen nueva aprovechable usan su **foto real** recortada y compuesta sobre el mismo
beige, con una sombra de contacto suave (`scripts/fondo-estudio/`). Así 22 de los 24 productos tienen
portada beige, junto con todas las variantes: los 15 diseños del kit de maleta, los 3 colores de la
pistola de burbujas, los 2 de la scooter, los 2 del carro y el set de arte azul. El closet y las luces
no tienen ninguna foto. El producto no se genera ni se retoca: solo se quitan el fondo, las cajas de
otras marcas, las letras de los avisos y los recuadros de detalle.

Revisión completa (qué se usó, qué no y por qué): `docs/revision-fotos.md`.


### El recorrido (progreso 0 → 1 del scroll)

| Tramo | Qué pasa |
|---|---|
| 0 – 0,03 | Tierra nocturna girando sola; título TU TEMPORADA / COLOMBIA |
| 0,03 – 0,46 | La Tierra gira hasta Sudamérica (longitud y latitud interpoladas) |
| 0,30 – 0,77 | Acercamiento logarítmico que desacelera al final; entran fronteras y filtrado bicúbico |
| 0,62 – 0,86 | Pin en Bogotá, "BIENVENIDO A TU TEMPORADA COLOMBIA" y lema |
| 0,78 – 0,94 | Oscurecimiento y máscara circular que nace en el pin y revela la tienda |

El scroll del navegador nunca se bloquea: el contenedor `#journey` es alto y su escenario es `sticky`.
Subir retrocede la animación; al detenerse, la escena se queda quieta. La rotación libre solo ocurre
antes de empezar a bajar.

### Precisión geográfica

Una coordenada (lat, lon) se convierte a 3D con `x = cos(lat)·cos(lon)`, `y = sin(lat)`,
`z = −cos(lat)·sin(lon)`, que coincide con el mapeo UV de `SphereGeometry` y una textura
equirectangular. Girar la Tierra con `Rz(roll)·Rx(lat)·Ry(−lon − 90°)` deja ese punto exactamente
frente a la cámara. El pin no se dibuja sobre la textura: cada cuadro se proyecta la coordenada real de
Bogotá (4,711° N, 74,072° O) a la pantalla.

### Rendimiento y respaldo

- Tres niveles de calidad (texturas 4k/2k, segmentos, estrellas, resolución) según el dispositivo, y
  reducción automática de resolución si la tasa de cuadros cae.
- El render se detiene cuando la intro sale de pantalla, cuando la placa blanca la cubre y en
  pestañas ocultas. three.js solo se carga en la portada.
- Sin WebGL: dos encuadres pre-renderizados (planeta y Colombia) que se funden con el scroll.
- `prefers-reduced-motion`: recorrido corto, planeta quieto encuadrando Colombia, solo fundidos.

## Catálogo conservado

Se verificó por script contra el HTML original: 24 productos, 28 variantes, mismos nombres,
precios, referencias, características y categorías; 93 imágenes únicas convertidas a WebP (los
originales siguen en `backup/original/`). No hay precios anteriores ni descuentos en los datos, así
que no se muestra ninguno; la tarjeta los mostrará si un producto recibe el campo `o`.

Funciones que se mantienen: catálogo, categorías, búsqueda (nombre, referencia, categoría o
variante), filtros de precio, orden, detalle con galería y variantes, guardados, compartir, consulta por WhatsApp con producto, variante y referencia, y SEO por
producto. Las claves de `localStorage` son las mismas, así que los guardados existentes se conservan.
El enlace antiguo `#carrito` redirige al catálogo.

## Carrito a futuro

No hay carrito, botones de compra ni checkout. `js/shop/store.js` expone `FEATURES.cart = false` y es
el lugar para el estado del carrito; las tarjetas y el detalle ya identifican producto, variante y
referencia, que es lo que el carrito necesitará.

## Realismo de la Tierra (v2.1)

- Render en radiancia lineal con tone mapping ACES de three.js, texturas en el espacio de color
  correcto (sRGB para color y luces, lineal para datos) y filtrado anisotrópico.
- Lado diurno con NASA Blue Marble Next Generation (topografía y batimetría): el océano tiene
  variaciones reales de tono. Terminador suave con franja de crepúsculo y brillo solar sobre el mar.
- Lado nocturno iluminado por una luna tenue que revela continentes y relieve; luces de ciudades
  sin halos exagerados y atenuadas por las nubes NASA, que proyectan sombra en el lado diurno.
- Atmósfera delgada calculada por rayo (densidad exponencial según la altura).
- Acercamiento a Colombia: parche de alto detalle (`assets/textures/colombia-detail.jpg`) con relieve
  Natural Earth a 30 px/grado (≈2,6× la textura global), costa 1:10m nítida y luces Black Marble
  reescaladas con núcleos en las ciudades reales de Natural Earth (Bogotá, Medellín, Cali…).

| Archivo | Contenido | Fuente |
|---|---|---|
| `earth-bm-4k/2k.jpg` | Color diurno | NASA Blue Marble Next Generation (dominio público), vía basemap-data |
| `earth-lights-4k/2k.png`, `earth-glow-2k.png` | Luces nocturnas | Solar System Scope (CC BY 4.0), basado en NASA Black Marble |
| `earth-data-2k.jpg` | R relieve, G tierra/agua, B nubes | Natural Earth shaded relief (dominio público), Solar System Scope, nubes NASA (dominio público) |
| `colombia-detail.jpg` | Parche de Colombia | Natural Earth (relieve, costa 1:10m, ciudades) + Black Marble |

## Marketplace (v3.1)

La intro 3D no cambió. Durante el final del recorrido el marketplace se mantiene fijo arriba de la
pantalla, oculto por la máscara circular (`pinMarket` y `clipMarket` en `js/main.js`). Cuando la máscara
se abre desde Bogotá, aparece la tienda ya en su sitio: header, título, categorías, filtros y la
primera fila de productos dentro del primer pantallazo. No hay una segunda portada ni pantallas vacías.

Estructura, de arriba abajo:

1. Header: nombre, buscador visible (filtra el catálogo en vivo), Categorías, Contacto y Guardados.
2. Bienvenida en una sola fila: «Explora nuestra tienda.» (Newsreader) y una línea de descripción.
3. Barra fija con chips de categorías («Todos» + las 10 reales) y herramientas: filtro de precio en un
   panel pequeño y orden (relevancia, precio, nombre). En móvil, una sola fila con íconos.
4. El número de productos va junto a las herramientas; los filtros activos aparecen como pastillas
   que se quitan con un toque (solo cuando hay filtros).
5. Cuadrícula única: 4 columnas en escritorio, 3 en tablet, 2 en móvil; fotos 1:1, nombre en 2 líneas
   como máximo para que todas las tarjetas midan lo mismo, categoría y precio.
6. Footer claro, sin datos repetidos.

Se retiraron las colecciones, la sección «Para descubrir ahora», la banda oscura, la tira de fotos y el
botón flotante de WhatsApp (el contacto sigue en el header, el footer y cada producto). Guardar un
producto se hace desde su página. `#catalogo` y `#cat-N` llevan directo al marketplace filtrado.

## Temas claro y oscuro

- El tema se fija antes de pintar con un script en el `<head>`: preferencia guardada en
  `localStorage` (`ttc-theme`) o, si no hay, `prefers-color-scheme`. Sin elección guardada, el sitio
  sigue al sistema también en vivo. `?theme=light|dark` lo fuerza para pruebas.
- Selector: un círculo mitad lleno que gira media vuelta, en el header y en la barra de la intro
  (`js/core/theme.js`). Al cambiar, los colores se animan 0,6 s y la Tierra hace su propia transición.
- Tokens semánticos en `css/base.css` (`--bg`, `--surface`, `--line`, `--text`, `--text-2`, `--muted`…) y
  `--j-*` para la intro en `css/intro.css`.
  - Claro: `#F7F7F5`, `#FFFFFF`, `#ECECEC`, `#CFCFCF`, `#111111`, `#41454B`.
  - Oscuro: `#08090B`, `#181A1E`, `#41454B`, `#D5D7DA`, `#F7F7F5`. Las fotos quedan contenidas en
    tarjetas carbón con más margen interno.
- Intro: en oscuro, Tierra de noche con luces y atmósfera aditiva sobre negro. En claro, Tierra de día
  (Blue Marble con saturación contenida, nubes blancas, brillo solar suave y halo azul pálido con mezcla
  normal) sobre `#F7F7F5`, sin estrellas ni luces, fronteras en blanco y un velo claro para leer los
  textos de llegada. El cambio interpola `uDayMode` en los shaders durante 1,4 s.
- Respaldo sin WebGL: imágenes pre-renderizadas para cada tema (`earth-far/near[-light].webp`).

## Tarjetas del catálogo: fotos y guardados

- **Fotos:** si un producto tiene más de una foto, la tarjeta muestra flechas finas al pasar el cursor y
  puntos abajo (o un contador «2 / 16» cuando hay más de seis). En táctil se desliza con el dedo y las
  flechas se ocultan para no robar toques; con el foco en la tarjeta, ← y → también cambian de foto. Las
  fotos están apiladas en el cuadro 1:1 y cambian con un fundido, así la tarjeta no se mueve. Solo se
  descarga la primera foto; las demás se piden al navegar y la siguiente se precarga al pasar el cursor
  (`js/shop/cards.js`).
- **Corazón:** arriba a la derecha de cada foto, en un círculo translúcido que se lee sobre fotos claras y
  oscuras. Contorno cuando no está guardado y relleno cuando sí. Reutiliza la lógica de guardados existente
  (clave `fav` en localStorage), se sincroniza con el corazón del detalle y con el contador del header, y en
  Guardados quitarlo retira la tarjeta.
- Flechas y corazón son `<button>` reales con `aria-label` y `aria-pressed`, fuera del enlace de la tarjeta
  y con foco visible.

## Logotipo

Depuración del logo original (`assets/img/brand/logo-original.gif`), con el mismo ADN: «tu» manuscrito,
«temporada» en sans redondeada y gruesa, «COLOMBIA» espaciado entre dos líneas, y el tejado con
chimenea y ventana de cuatro cuadros sobre el nombre. Cambios respecto al original:

- Tejado de un solo trazo continuo, más fino y con pendiente más suave; chimenea y ventana alineadas a la
  misma retícula del trazo.
- Ventana de 2×2 cuadros con esquinas apenas redondeadas, sin marco.
- «tu» en Yellowtail, «temporada» en Montserrat 620 con tracking −0,03, «COLOMBIA» en Montserrat 500 con
  tracking 0,38 y gris al 62 %.
- Un solo arco fino bajo el tejado reemplaza la base gruesa del original.
- Monocromo: negro sobre claro, blanco sobre oscuro, sin sombras ni degradados.

Versiones:

- **Apilada** (`logo-black.svg`, `logo-white.svg`): la principal. Se usa en la intro y en el footer.
- **Horizontal** (`logo-horizontal-*.svg`): casa + «tu temporada» + «COLOMBIA». Se usa en la llegada a Colombia.
- **Compacta** (`logo-compact-*.svg`): horizontal sin «COLOMBIA», para el header y tamaños de 20–30 px.
- **Marca** (`mark-*.svg`, `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png`, `icon-512.png`): solo la
  casa, para favicon e iconos.

Todos los textos están convertidos a trazos y no dependen de fuentes. En la página se insertan en línea
con `currentColor`, así que siguen el tema. Para regenerarlos: `python3 scripts/build_logo.py`
(requiere fontTools y uharfbuzz; fuentes de `@fontsource/yellowtail` y `@fontsource-variable/montserrat`,
ruta configurable con `NODE_MODULES`; salida con `OUT`).

## Tipografía (v3)

Interfaz en **Instrument Sans** (OFL, variable 400–700 y ancho 75–100). **Newsreader** (OFL, subconjunto
de 18 KB) solo en momentos de marca: logotipo, nombre en la intro y título de bienvenida.
Instrument Sans se comparó contra
Inter Tight y Hanken Grotesk en composiciones reales de header, tarjetas y titular. Es la más legible en
nombres y precios y la que tiene más carácter sin llamar la atención. Helvetica Neue requiere licencia
web de Linotype; queda solo como respaldo del sistema en la pila de fuentes.

Escala contenida (13–20 px en interfaz, titular de bienvenida de 28 a 40 px), pesos 400/500/600,
sin mayúsculas sostenidas ni interletrado abierto. Precios en cifras tabulares.

## Créditos y licencias

- Texturas: NASA Blue Marble y nubes (dominio público); luces de [Solar System Scope](https://www.solarsystemscope.com/textures/)
  (CC BY 4.0, basadas en NASA Black Marble). El crédito aparece en el footer, como pide la licencia.
- Relieve, costas, fronteras y ciudades: Natural Earth (dominio público), vía `world-atlas` (ISC) y basemap-data.
- Tipografías: Instrument Sans (OFL) y Newsreader (OFL).
- three.js (MIT). GSAP y ScrollTrigger (licencia estándar sin costo de GSAP).
