/**
 * Carruseles de categoría (se muestran en lugar de la cuadrícula al abrir la categoría).
 * Clave: código de categoría de js/data/catalog.js.
 *  - featured: referencia (campo id) del producto destacado; va siempre primero y más grande.
 *  - badge: texto de la etiqueta del destacado.
 *  - order: referencias que van después del destacado, en ese orden. Los demás productos de la
 *    categoría se agregan al final en el orden del catálogo, así un producto nuevo de la categoría
 *    entra solo al carrusel.
 * Los productos del carrusel no se repiten en la cuadrícula de esa categoría; en «Todos», en la
 * búsqueda y en Guardados aparecen como cualquier otro producto. Para quitar un carrusel basta
 * con borrar su entrada.
 */
export const SHOWCASES = {
  SALUD: {
    title: "Salud y bienestar",
    featured: "ENGORILATE-XX-PREMIUM",
    badge: "PRODUCTO DESTACADO",
    order: [
      "ENGORILATE-XX-PREMIUM-500ML",
      "ENGORILATE-XX-TRADICIONAL",
      "ENGORILATE-XX-TRADICIONAL-500ML",
    ],
  },
};
