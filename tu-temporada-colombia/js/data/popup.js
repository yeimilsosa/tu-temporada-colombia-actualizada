/**
 * Ventana promocional (pop-up) que aparece una vez por sesión. Lógica: js/shop/popup.js.
 *
 * Para cambiar de producto promocionado:
 *  1. Pon la imagen en popup-fuente/ y genera los WebP de 768, 1280 y 1536 px en assets/img/promo/
 *     (mismo procedimiento que scripts/prepare_banners.py).
 *  2. Cambia `product` (nombre exacto en js/data/catalog.js), `image` y los textos.
 *  3. Cambia `id`: así la ventana vuelve a mostrarse a quienes ya cerraron la anterior.
 * Para apagarla: enabled: false.
 */
export const POPUP = {
  enabled: true,
  id: "engorilate-xx-2026-11",
  /** Nombre exacto del producto en el catálogo: de ahí salen el precio y el enlace «Ver producto». */
  product: "ENGORILATE XX TRADICIONAL",
  /** Segundos después de entrar a la página. */
  delay: 5,
  image: {
    file: "assets/img/promo/popup-engorilate-xx",
    widths: [768, 1280, 1536],
    width: 1536,
    height: 1024,
    alt: "ENGORILATE XX Tradicional: incrementa tu energía física y mental. Pack de 15 sachets de 20 ml con envíos a toda Colombia.",
    /** La imagen trae una X dibujada arriba a la derecha: esa zona también cierra la ventana. */
    closeHotspot: { x: 97.5, y: 3.9, size: 6 },
  },
  eyebrow: "Producto destacado",
  title: "Más energía para todo tu día",
  text: "Escríbenos y te enviamos información, cotización y tiempo de entrega a cualquier ciudad de Colombia.",
  cta: "COTIZAR POR WHATSAPP",
  message: "Hola, estoy interesado(a) en este producto que vi en Tu Temporada Colombia: {product}. Me gustaría recibir información y una cotización. ¡Gracias!",
};
