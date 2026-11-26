# Contador de visitas — Tu Temporada Colombia

El contador de visitas está integrado en el pie de página de la tienda.

## Dominio configurado

El código quedó configurado para enviar las visitas a:

`https://tutemporadacolombia.goatcounter.com`

El módulo `js/visitor-counter.js` carga el script oficial de GoatCounter (`https://gc.zgo.at/count.js`) y consulta el contador público para mostrar el total en el pie de página.

## Publicación

1. Descomprime este ZIP.
2. Publica la carpeta `tu-temporada-colombia` o ejecuta `npm run build` y publica el contenido de `dist/web/`.
3. Abre la tienda publicada y navega por varias páginas.
4. Espera un momento y revisa el panel de GoatCounter: `https://tutemporadacolombia.goatcounter.com`.

## Si el panel sigue mostrando cero visitas

- Confirma que estás revisando el sitio `tutemporadacolombia`.
- Prueba en una ventana privada o en otro navegador.
- Desactiva temporalmente el bloqueador de anuncios para hacer la prueba.
- Comprueba que el hosting publicó también `js/visitor-counter.js`.
- Si usas la versión de un solo archivo, genera el HTML con `npm run build:single`; el proceso de compilación incorpora el contador dentro del HTML.

El contador depende de GoatCounter y de que el navegador pueda cargar `gc.zgo.at`. El número mostrado en el pie de página procede del contador público de GoatCounter; no se inventa ni se almacena localmente.
