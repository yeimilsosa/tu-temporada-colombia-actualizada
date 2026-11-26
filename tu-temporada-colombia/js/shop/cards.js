/**
 * Fotos de las tarjetas del catálogo: flechas, puntos, swipe y teclado.
 *
 * - Solo se crea la primera <img> al pintar la cuadrícula; las demás se crean al pedirlas
 *   (y la siguiente se precarga al pasar el cursor), así la cuadrícula no descarga 120 fotos.
 * - Las fotos están apiladas dentro de un cuadro 1:1 y cambian con un fundido: la tarjeta no
 *   cambia de tamaño.
 * - En pantallas táctiles se desliza con el dedo; el toque normal sigue abriendo el producto.
 * - Con el foco en la tarjeta, ← y → también cambian de foto.
 */
import { PRODUCTS } from "../data/catalog.js";
import { productImages, small, isStudio } from "./catalog.js";

const cache = new Map();
const sources = (i) => {
  if (!cache.has(i)) cache.set(i, productImages(PRODUCTS[i]));
  return cache.get(i);
};

const count = (card) => +card.dataset.slides || 0;
const current = (card) => +(card.dataset.k || 0);

function imgAt(card, k) {
  const box = card.querySelector(".card__slides");
  let img = box.querySelector(`img[data-k="${k}"]`);
  if (!img) {
    img = new Image();
    img.alt = "";
    img.decoding = "async";
    img.dataset.k = k;
    const src = sources(+card.dataset.i)[k];
    if (isStudio(src)) img.className = "is-studio";
    img.src = small(src);
    box.appendChild(img);
  }
  return img;
}

/** Muestra la foto k de la tarjeta (con vuelta al principio y al final). */
export function show(card, k) {
  const n = count(card);
  if (n < 2) return;
  k = ((k % n) + n) % n;
  const token = (card._token = (card._token || 0) + 1);
  card.dataset.k = k;
  const img = imgAt(card, k);
  const swap = () => {
    if (card._token !== token) return; // otra flecha llegó antes
    card.querySelectorAll(".card__slides img.is-on").forEach((el) => el !== img && el.classList.remove("is-on"));
    img.classList.add("is-on");
  };
  // Espera a que la foto esté decodificada para que el fundido no pase por un cuadro vacío.
  (img.complete && img.naturalWidth ? Promise.resolve() : img.decode().catch(() => {})).then(swap);
  const dots = card.querySelectorAll(".card__dots i");
  dots.forEach((d, j) => d.classList.toggle("is-on", j === k));
  const pos = card.querySelector("[data-pos]");
  if (pos) pos.textContent = k + 1;
  const name = card.querySelector(".card__title")?.textContent || "";
  card.querySelector(".card__nav--prev")?.setAttribute("aria-label", `Foto anterior de ${name} (${k + 1} de ${n})`);
  card.querySelector(".card__nav--next")?.setAttribute("aria-label", `Foto siguiente de ${name} (${k + 1} de ${n})`);
}

const step = (card, d) => show(card, current(card) + d);

function preload(card) {
  const n = count(card);
  if (n < 2 || card._pre) return;
  card._pre = true;
  imgAt(card, (current(card) + 1) % n);
}

export function initCards() {
  // Flechas
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-slide]");
    if (!b) return;
    e.preventDefault();
    step(b.closest("[data-card]"), +b.dataset.slide);
  });

  // Teclado: ← → con el foco en el enlace o en un control de la tarjeta.
  document.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const card = e.target.closest?.("[data-card][data-slides]");
    if (!card || e.altKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    step(card, e.key === "ArrowLeft" ? -1 : 1);
  });

  // Precarga la siguiente foto al pasar el cursor.
  document.addEventListener("pointerover", (e) => {
    if (e.pointerType !== "mouse") return;
    const card = e.target.closest?.("[data-card][data-slides]");
    if (card) preload(card);
  });

  // Swipe táctil sobre la foto. touch-action: pan-y deja el scroll vertical al navegador.
  let g = null;
  document.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" || !e.isPrimary) return;
    const media = e.target.closest?.("[data-slides] .card__media");
    if (!media) return;
    const card = media.closest("[data-card]");
    preload(card);
    g = { card, x: e.clientX, y: e.clientY, id: e.pointerId };
  }, { passive: true });
  document.addEventListener("pointerup", (e) => {
    if (!g || e.pointerId !== g.id) return;
    const dx = e.clientX - g.x, dy = e.clientY - g.y;
    if (Math.abs(dx) > 32 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      g.card._swiped = performance.now();
      step(g.card, dx < 0 ? 1 : -1);
    }
    g = null;
  }, { passive: true });
  document.addEventListener("pointercancel", () => { g = null; }, { passive: true });
  // Un swipe no debe abrir el producto.
  document.addEventListener("click", (e) => {
    const card = e.target.closest?.("[data-card]");
    if (card && card._swiped && performance.now() - card._swiped < 500) {
      e.preventDefault();
      e.stopPropagation();
      card._swiped = 0;
    }
  }, true);
}
