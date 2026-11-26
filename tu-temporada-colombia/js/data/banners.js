/**
 * Banners publicitarios del carrusel de la portada (debajo del header, antes del catálogo).
 *
 * Para agregar un banner:
 *  1. Copia la imagen (PNG o JPG, idealmente 1920 px de ancho o más) en banners-fuente/.
 *  2. Ejecuta `python3 scripts/prepare_banners.py`: genera las versiones WebP de 640, 1280 y
 *     1920 px en assets/img/banners/ e imprime la línea que va aquí.
 *  3. Agrega esa línea a la lista. El orden de la lista es el orden del carrusel.
 *
 * Campos:
 *  - file:   nombre del archivo en banners-fuente/, sin extensión.
 *  - width, height: tamaño del original (el script los imprime). Evitan saltos al cargar.
 *  - alt:    descripción del banner para lectores de pantalla y buscadores.
 *  - href:   (opcional) a dónde lleva al tocarlo: "#catalogo", "#cat-3", "#producto-5" o un enlace
 *            externo. Sin href el banner no es un enlace.
 *  - mobile: (opcional) { file, width, height } de una versión vertical o cuadrada para celulares.
 *            Se prepara con el mismo script (nombre terminado en -movil) y se usa hasta 760 px.
 *
 * Para quitar un banner basta con borrar su línea.
 */
export const BANNERS = [
  {
    file: "banner-01-todo-en-un-solo-lugar",
    width: 1942,
    height: 809,
    alt: "Tu Temporada Colombia: todo para ti, todo en un solo lugar. Tecnología, herramientas, hogar, belleza, salud, bisutería y más, con envíos a toda Colombia.",
    href: "#catalogo",
  },
  {
    file: "banner-02-tu-vida-mas-facil",
    width: 1600,
    height: 666,
    alt: "Tu Temporada Colombia: tu vida, más fácil cada día. Los productos que necesitas cuando los necesitas.",
    href: "#catalogo",
  },
  {
    file: "banner-03-multimarca",
    width: 1983,
    height: 793,
    alt: "Tu Temporada Colombia multimarca: un mundo de soluciones para ti y tu hogar. Calidad garantizada, grandes marcas, envíos a toda Colombia y compra segura.",
    href: "#catalogo",
  },
];

/** Segundos que permanece cada banner antes de pasar al siguiente. */
export const BANNER_INTERVAL = 5;
