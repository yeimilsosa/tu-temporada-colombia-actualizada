/**
 * Fotografías de estudio (fondo beige) del catálogo. Hay dos orígenes:
 *  - las imágenes del paquete nuevo que coinciden con el artículo real (primer bloque), y
 *  - las fotos originales del catálogo, recortadas y puestas sobre el mismo fondo (segundo bloque).
 *
 * No modifican js/data/catalog.js: se aplican al cargar. La foto beige pasa a ser la portada del
 * producto (o de la variante). Con SHOW_ORIGINALS = false (más abajo) solo se muestran las fotos
 * beige. Para revertir un producto basta con quitar su línea.
 *
 * Opción `extra: ["archivo", ...]`: fotos de estudio adicionales del producto, en su galería.
 *
 * Opción `all: true` en un producto: la foto de estudio queda de portada y se muestran también sus
 * fotos del catálogo (útil cuando el producto tiene varias fotos reales que se quieren conservar).
 * Clave: nombre exacto del producto en js/data/catalog.js. Valor: nombre del archivo en
 * assets/img/products/estudio/ (sin extensión). `v` relaciona cada variante por su nombre.
 * Revisión de cada imagen y motivos de descarte: docs/revision-fotos.md.
 */
export const STUDIO = {
  "Nivel Láser 16 Líneas": { main: "nivel-laser-16-lineas-v2" },
  "Guadaña Eléctrica": { main: "guadana-electrica", all: true },
  "Pulidora Inalámbrica 128VT ST10": { main: "pulidora-inalambrica-128vt-st10", all: true },
  "Soldador Inverter 3 en 1": { main: "soldador-inverter-3-en-1" },
  "Maleta Antirrobo Semipermeable Cuerina Alta Calidad": { main: "maleta-antirrobo" },
  "Comedero para Mascotas de Rodillo": { main: "comedero-mascotas-rodillo" },
  "Intercomunicador para Moto": { main: "intercomunicador-moto" },
  "Set de Arte 208 Piezas": {
    main: "set-de-arte-208-piezas-rosado",
    // Rosado: imagen del paquete nuevo. Azul: foto original sobre el mismo fondo.
    v: { Rosado: "set-de-arte-208-piezas-rosado", Azul: "set-de-arte-208-piezas-azul" },
  },
  "Set Reloj, Correa, Billetera, Gorra y Llavero": {
    main: "set-reloj-correa-billetera-negro-v2",
    v: {
      Negro: "set-reloj-correa-billetera-negro-v2",
      "Café": "set-reloj-correa-billetera-cafe-v2",
      Azul: "set-reloj-correa-billetera-azul-v2",
      Miel: "set-reloj-correa-billetera-miel-v2",
    },
  },
  // Fotos originales del catálogo, recortadas y compuestas sobre el mismo fondo beige
  // (scripts/fondo-estudio/). El producto es la foto real: no se generó ni se retocó.
  "Kit Maleta, Lonchera y Cartuchera": {
    main: "kit-maleta-lonchera-y-cartuchera-naruto",
    v: {
      "Naruto": "kit-maleta-lonchera-y-cartuchera-naruto",
      "Cars Azul": "kit-maleta-lonchera-y-cartuchera-cars-azul-ia",
      "Cars Negro": "kit-maleta-lonchera-y-cartuchera-cars-negro",
      "Batman": "kit-maleta-lonchera-y-cartuchera-batman",
      "Sonic": "kit-maleta-lonchera-y-cartuchera-sonic-ia",
      "Buzz Lightyear": "kit-maleta-lonchera-y-cartuchera-buzz-lightyear",
      "Unicornio/arcoiris": "kit-maleta-lonchera-y-cartuchera-unicornio-arcoiris",
      "Frozen": "kit-maleta-lonchera-y-cartuchera-frozen",
      "Sofia": "kit-maleta-lonchera-y-cartuchera-sofia",
      "Paw Patrol": "kit-maleta-lonchera-y-cartuchera-paw-patrol-ia",
      "Encanto Rosada": "kit-maleta-lonchera-y-cartuchera-encanto-rosada-ia",
      "Encanto Azul": "kit-maleta-lonchera-y-cartuchera-encanto-azul",
      "Frozen Rosada": "kit-maleta-lonchera-y-cartuchera-frozen-rosada",
      "Frozen Morada": "kit-maleta-lonchera-y-cartuchera-frozen-morada-ia",
      "Unicornio": "kit-maleta-lonchera-y-cartuchera-unicornio-ia",
    },
  },
  "Pistola Burbuja 132 Huecos": {
    main: "pistola-burbuja-132-huecos",
    v: {
      "Verde": "pistola-burbuja-132-huecos-verde",
      "Azul": "pistola-burbuja-132-huecos-azul",
      "Rosada": "pistola-burbuja-132-huecos-rosada",
    },
  },
  "Licuadora Portátil Digital Inalámbrica": { main: "licuadora-portatil-digital-inalambrica", all: true },
  "Encendedor Electrónico": { main: "encendedor-electronico" },
  "Pistola Eléctrica de Chorro": { main: "pistola-electrica-de-chorro" },
  "Aceite de Magnesio": { main: "aceite-de-magnesio" },
  "Organizador de Baúl para Carro Plegable": { main: "organizador-de-baul-para-carro-plegable" },
  "Vinagre de Manzana en Gomitas": { main: "vinagre-de-manzana-en-gomitas" },
  "Cargador Inalámbrico 3 en 1": { main: "cargador-inalambrico-3-en-1", all: true },
  "Ventilador Portátil de Cuello": { main: "ventilador-portatil-de-cuello", extra: ["ventilador-portatil-de-cuello-caja"] },
  "Scooter Eléctrico con Luces": {
    main: "scooter-electrica-con-luces-led-kidshop-rojo",
    v: {
      "Rojo": "scooter-electrica-con-luces-led-kidshop-rojo",
      "Azul": "scooter-electrica-con-luces-led-kidshop-azul",
    },
  },
  "Carro Antigravedad con Control Remoto": {
    main: "carro-antigravedad-con-control-remoto-rojo",
    v: {
      "Rojo": "carro-antigravedad-con-control-remoto-rojo",
      "Azul": "carro-antigravedad-con-control-remoto-azul",
    },
  },
  "Dron Doble Cámara 4K con Maletín": { main: "dron-doble-camara-4k-con-maletin" },
  "Mini Aspiradora Robot": { main: "mini-aspiradora-robot" },
};

/**
 * Imágenes preparadas que esperan confirmación (no se muestran). Estos productos no tienen
 * foto original con la que comparar. Para publicarlas, muévelas a STUDIO con la misma forma.
 * Archivos: assets/img/products/pendientes/
 */
export const PENDING = {
  // Kit Maleta «Princesas»: el catálogo no tiene esa variante. Archivo: kit-maleta-lonchera-y-cartuchera-princesas
};

/**
 * false: los productos con foto beige muestran solo sus fotos beige (portada y variantes) en las
 * tarjetas, la ficha y el visor; las fotos originales con fondo blanco o de aviso no se muestran.
 * Los archivos originales siguen en assets/img/products/. true: vuelven a la galería, detrás de la beige.
 */
export const SHOW_ORIGINALS = false;

const path = (name) => `assets/img/products/estudio/${name}.webp`;

/** Antepone las fotos de estudio. Avisa en consola si un nombre no coincide con el catálogo. */
export function applyStudio(products) {
  for (const [name, cfg] of Object.entries(STUDIO)) {
    const p = products.find((x) => x.n === name);
    if (!p) { console.warn("[fotos] Producto no encontrado:", name); continue; }
    // all: true → la foto de estudio es la portada y las fotos del catálogo se muestran detrás de ella.
    const showAll = SHOW_ORIGINALS || cfg.all;
    const keep = (list, first) => (showAll ? [first, ...(list || []).filter((s) => s !== first)] : [first]);
    if (cfg.main) { p.img = keep(p.img, path(cfg.main)); if (!showAll) p.s = []; }
    // extra: más fotos de estudio del mismo producto, en la galería detrás de la portada.
    if (cfg.extra) p.img = [p.img[0], ...cfg.extra.map(path), ...p.img.slice(1)];
    for (const [vn, file] of Object.entries(cfg.v || {})) {
      const v = (p.v || []).find((x) => x.n === vn);
      if (!v) { console.warn("[fotos] Variante no encontrada:", name, vn); continue; }
      v.img = keep(v.img, path(file));
    }
  }
}
