/**
 * Carruseles destacados por categoría (se muestran encima de la cuadrícula al abrir la categoría).
 * Clave: código de categoría de js/data/catalog.js. `ids`: referencias (campo id) de los productos,
 * en el orden en que aparecen. Los productos del carrusel no se repiten en la cuadrícula de esa
 * categoría; en «Todos», en la búsqueda y en Guardados aparecen como cualquier otro producto.
 * Para quitar un carrusel basta con borrar su entrada.
 */
export const SHOWCASES = {
  SALUD: {
    title: "ENGORILATE XX en botella",
    sub: "Nueva presentación de 500 ml, en versión Tradicional y Premium.",
    ids: ["ENGORILATE-XX-TRADICIONAL-500ML", "ENGORILATE-XX-PREMIUM-500ML"],
    autoplay: 5, // segundos entre productos cuando el usuario activa el cambio automático
  },
};
