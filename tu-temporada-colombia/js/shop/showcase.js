/**
 * Carrusel destacado de una categoría (datos: js/data/showcases.js).
 *
 * - Un producto por vista en todos los tamaños: en móvil la foto va arriba y los datos debajo;
 *   desde 760 px la foto y los datos quedan lado a lado.
 * - El desplazamiento es nativo (scroll-snap): el dedo en móvil y el trackpad en computador
 *   funcionan sin código extra. Con mouse también se puede arrastrar.
 * - Flechas laterales, puntos inferiores y ← → con el foco dentro.
 * - No avanza solo: el botón «Automático» activa o desactiva el cambio cada N segundos.
 *
 * Todos los eventos están delegados en document: el carrusel se vuelve a pintar cada vez que
 * cambia un filtro y no hace falta volver a conectarlo.
 */
import { SHOWCASES } from "../data/showcases.js";
import { PRODUCTS, esc, formatCOP, label, waLink, small, large, productImages, isStudio } from "./catalog.js";
import { prefersReducedMotion } from "../core/env.js";

const icon = (id) => `<svg class="icon" aria-hidden="true"><use href="#i-${id}"/></svg>`;

/** Índices de PRODUCTS que van en el carrusel de la categoría (vacío si no tiene). */
export function showcaseIndexes(cat) {
  const s = SHOWCASES[cat];
  if (!s) return [];
  return s.ids.map((id) => PRODUCTS.findIndex((p) => p.id === id)).filter((i) => i >= 0);
}

function slide(i, k, n) {
  const p = PRODUCTS[i];
  const src = productImages(p)[0];
  const name = esc(p.n);
  const msg = `Hola, quiero comprar: ${p.n}${p.pr ? " - " + p.pr : ""} (Ref. ${p.id}) - ${formatCOP(p.p)}`;
  const img = src
    ? `<img src="${large(src)}" srcset="${small(src)} 720w, ${large(src)} 1600w" sizes="(max-width: 760px) 92vw, 50vw"
        alt="${name}" ${k ? 'loading="lazy" ' : ""}decoding="async" draggable="false"${isStudio(src) ? ' class="is-studio"' : ""}>`
    : "";
  return `<article class="showcase__slide" role="group" aria-roledescription="producto" aria-label="${k + 1} de ${n}: ${name}" data-sc-slide="${k}">
    <a class="showcase__media" href="#producto-${i}" tabindex="-1" aria-hidden="true">${img}</a>
    <div class="showcase__info">
      <p class="showcase__kicker">${esc(label(p.c))}</p>
      <h3 class="showcase__name"><a href="#producto-${i}">${name}</a></h3>
      ${p.pr ? `<p class="showcase__pres">${esc(p.pr)}</p>` : ""}
      <p class="showcase__price">${formatCOP(p.p)}</p>
      <div class="showcase__actions">
        <a class="btn btn--solid" href="${waLink(msg)}" target="_blank" rel="noopener">${icon("chat")}Comprar por WhatsApp</a>
        <a class="btn btn--ghost" href="#producto-${i}">Ver detalle</a>
      </div>
    </div>
  </article>`;
}

/** HTML del carrusel para los índices dados (ya filtrados). */
export function showcase(cat, list) {
  const s = SHOWCASES[cat];
  if (!s || !list.length) return "";
  const n = list.length;
  const multi = n > 1;
  return `<section class="showcase" aria-roledescription="carrusel" aria-label="${esc(s.title)}" data-showcase data-k="0" data-auto="${s.autoplay || 5}">
    <header class="showcase__head">
      <div>
        <h2 class="showcase__title">${esc(s.title)}</h2>
        ${s.sub ? `<p class="showcase__sub">${esc(s.sub)}</p>` : ""}
      </div>
      ${multi ? `<button type="button" class="showcase__auto" data-sc-auto aria-pressed="false">${icon("play")}<span>Automático</span></button>` : ""}
    </header>
    <div class="showcase__stage">
      <div class="showcase__track" data-sc-track tabindex="0" aria-label="Productos destacados. Usa las flechas para cambiar.">${list.map((i, k) => slide(i, k, n)).join("")}</div>
      ${multi ? `<button type="button" class="showcase__arrow showcase__arrow--prev" data-sc-step="-1" aria-label="Producto anterior">${icon("left")}</button>
      <button type="button" class="showcase__arrow showcase__arrow--next" data-sc-step="1" aria-label="Producto siguiente">${icon("right")}</button>` : ""}
    </div>
    ${multi ? `<div class="showcase__dots" role="group" aria-label="Elegir producto">${list.map((i, k) =>
      `<button type="button" class="showcase__dot" data-sc-go="${k}" aria-label="Ver ${esc(PRODUCTS[i].n)}"${k ? "" : ' aria-current="true"'}><i></i></button>`).join("")}</div>` : ""}
  </section>`;
}

/* ---------- Interacción ---------- */
const slidesOf = (root) => root.querySelectorAll("[data-sc-slide]");
const trackOf = (root) => root.querySelector("[data-sc-track]");

function indexFromScroll(root) {
  const t = trackOf(root);
  return Math.round(t.scrollLeft / Math.max(1, t.clientWidth));
}

function mark(root, k) {
  root.dataset.k = k;
  root.querySelectorAll("[data-sc-go]").forEach((d, j) => (j === k ? d.setAttribute("aria-current", "true") : d.removeAttribute("aria-current")));
  slidesOf(root).forEach((s, j) => (j === k ? s.removeAttribute("aria-hidden") : s.setAttribute("aria-hidden", "true")));
}

function go(root, k, smooth = true) {
  const n = slidesOf(root).length;
  if (!n) return;
  k = ((k % n) + n) % n; // vuelve al primero después del último
  const t = trackOf(root);
  t.scrollTo({ left: k * t.clientWidth, behavior: smooth && !prefersReducedMotion() ? "smooth" : "auto" });
  mark(root, k);
}

/* Cambio automático: apagado por defecto; solo lo activa el usuario. */
function setAuto(root, on) {
  clearInterval(root._timer);
  const b = root.querySelector("[data-sc-auto]");
  if (b) {
    b.setAttribute("aria-pressed", String(on));
    b.innerHTML = `${icon(on ? "pause" : "play")}<span>Automático</span>`;
    b.setAttribute("aria-label", on ? "Desactivar cambio automático" : "Activar cambio automático");
  }
  if (!on) return;
  root._timer = setInterval(() => {
    if (!root.isConnected) return clearInterval(root._timer);
    if (root._hover || document.hidden) return;
    go(root, +root.dataset.k + 1);
  }, (+root.dataset.auto || 5) * 1000);
}
const restartAuto = (root) => root.querySelector('[data-sc-auto][aria-pressed="true"]') && setAuto(root, true);

export function initShowcase() {
  document.addEventListener("click", (e) => {
    const root = e.target.closest?.("[data-showcase]");
    if (!root) return;
    if (root._dragged && performance.now() - root._dragged < 400) { e.preventDefault(); e.stopPropagation(); return; }
    const step = e.target.closest("[data-sc-step]");
    const dot = e.target.closest("[data-sc-go]");
    const auto = e.target.closest("[data-sc-auto]");
    if (step) { go(root, +root.dataset.k + +step.dataset.scStep); restartAuto(root); }
    else if (dot) { go(root, +dot.dataset.scGo); restartAuto(root); }
    else if (auto) setAuto(root, auto.getAttribute("aria-pressed") !== "true");
  }, true);

  document.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const root = e.target.closest?.("[data-showcase]");
    if (!root || e.altKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    go(root, +root.dataset.k + (e.key === "ArrowLeft" ? -1 : 1));
    restartAuto(root);
  });

  // Deslizamiento con el dedo o el trackpad: el índice sigue al scroll (el evento no burbujea: captura).
  document.addEventListener("scroll", (e) => {
    const t = e.target;
    if (!(t instanceof Element) || !t.matches("[data-sc-track]")) return;
    const root = t.closest("[data-showcase]");
    clearTimeout(root._st);
    root._st = setTimeout(() => {
      const k = indexFromScroll(root);
      if (k !== +root.dataset.k) { mark(root, k); restartAuto(root); }
    }, 80);
  }, true);

  // Pausa el automático mientras el cursor o el dedo están sobre el carrusel.
  document.addEventListener("pointerover", (e) => { const r = e.target.closest?.("[data-showcase]"); if (r) r._hover = true; });
  document.addEventListener("pointerout", (e) => {
    const r = e.target.closest?.("[data-showcase]");
    if (r && !r.contains(e.relatedTarget)) r._hover = false;
  });

  // Arrastre con mouse (en táctil el navegador ya desliza solo).
  let drag = null;
  document.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    const t = e.target.closest?.("[data-sc-track]");
    if (!t || e.target.closest("button")) return;
    drag = { t, root: t.closest("[data-showcase]"), x: e.clientX, left: t.scrollLeft, moved: false };
  });
  document.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) < 6) return;
    if (!drag.moved) { drag.moved = true; drag.t.classList.add("is-dragging"); }
    drag.t.scrollLeft = drag.left - dx;
  });
  const end = (e) => {
    if (!drag) return;
    const { t, root, moved, x } = drag;
    drag = null;
    if (!moved) return;
    t.classList.remove("is-dragging");
    root._dragged = performance.now();
    const dx = (e.clientX ?? x) - x;
    const k = +root.dataset.k;
    // Un arrastre de más de 12 % del ancho pasa al siguiente o al anterior.
    const target = Math.abs(dx) > t.clientWidth * 0.12 ? k + (dx < 0 ? 1 : -1) : k;
    const n = slidesOf(root).length;
    go(root, Math.max(0, Math.min(n - 1, target)));
    restartAuto(root);
  };
  document.addEventListener("pointerup", end);
  document.addEventListener("pointercancel", end);

  // Al cambiar el ancho de la ventana se mantiene el producto visible.
  let rt = 0;
  window.addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(() => document.querySelectorAll("[data-showcase]").forEach((r) => go(r, +r.dataset.k, false)), 120);
  });
}
