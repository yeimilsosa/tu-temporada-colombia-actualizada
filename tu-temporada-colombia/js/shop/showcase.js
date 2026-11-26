/**
 * Carrusel de productos de una categoría (datos: js/data/showcases.js).
 *
 * - Todos los productos de la categoría en una sola fila deslizable; el destacado va primero,
 *   con etiqueta y tarjeta más grande.
 * - Productos visibles según el ancho (CSS): ~1,2 en celular (se asoma el siguiente), 2–3 en
 *   tableta y 4 en computador (el destacado ocupa el lugar de dos).
 * - Desplazamiento nativo con scroll-snap: dedo, trackpad y rueda del mouse funcionan solos;
 *   además se puede arrastrar con el mouse.
 * - Flechas (avanzan un producto), puntos (uno por producto, marcan los que están a la vista)
 *   y contador «1–3 de 6». ← → con el foco en el carrusel.
 * - Solo se descargan las fotos de tarjeta (-sm) y las que están fuera de pantalla son diferidas.
 *
 * Los eventos están delegados en document: el carrusel se vuelve a pintar cada vez que cambia
 * un filtro y no hace falta volver a conectarlo.
 */
import { SHOWCASES } from "../data/showcases.js";
import { PRODUCTS, esc, formatCOP, label, waLink, small, productImages, isStudio } from "./catalog.js";
import { isSaved } from "./store.js";
import { prefersReducedMotion } from "../core/env.js";

const icon = (id) => `<svg class="icon" aria-hidden="true"><use href="#i-${id}"/></svg>`;

/** Índices de PRODUCTS del carrusel de la categoría, en orden (vacío si no tiene carrusel). */
export function showcaseIndexes(cat) {
  const s = SHOWCASES[cat];
  if (!s) return [];
  const byId = (id) => PRODUCTS.findIndex((p) => p.id === id && p.c === cat);
  const first = [s.featured, ...(s.order || [])].map(byId).filter((i) => i >= 0);
  const rest = PRODUCTS.map((p, i) => i).filter((i) => PRODUCTS[i].c === cat && !first.includes(i));
  return [...new Set([...first, ...rest])];
}

function item(i, k, n, featured, badge) {
  const p = PRODUCTS[i];
  const src = productImages(p)[0];
  const name = esc(p.n);
  const ref = p.id ? ` (Ref. ${p.id})` : "";
  const wa = waLink(`Hola, me interesa: ${p.n}${p.pr ? " - " + p.pr : ""}${ref}${p.p != null ? " - " + formatCOP(p.p) : ""}`);
  const img = src
    ? `<img src="${small(src)}" alt="${name}" ${k > 2 ? 'loading="lazy" ' : ""}decoding="async" draggable="false"${isStudio(src) ? ' class="is-studio"' : ""}>`
    : `<span class="card__placeholder">${icon("image")}Imagen no disponible</span>`;
  const on = isSaved(i);
  return `<article class="sc-card${featured ? " sc-card--featured" : ""}" data-sc-item="${k}" aria-label="${k + 1} de ${n}: ${name}">
    <a class="sc-card__media" href="#producto-${i}" tabindex="-1" aria-hidden="true">${img}</a>
    ${featured && badge ? `<span class="sc-card__badge">${esc(badge)}</span>` : ""}
    <button class="sc-card__fav card__fav" type="button" data-save="${i}" data-name="${name}" aria-pressed="${on}" aria-label="${on ? "Quitar de guardados" : "Guardar"}: ${name}">${icon("heart")}</button>
    <div class="sc-card__info">
      <p class="sc-card__cat">${esc(label(p.c))}${p.pr ? ` · ${esc(p.pr)}` : ""}</p>
      <h3 class="sc-card__name"><a href="#producto-${i}">${name}</a></h3>
      <p class="sc-card__price${p.p == null ? " price--ask" : ""}">${formatCOP(p.p)}${p.o > p.p ? `<s>${formatCOP(p.o)}</s>` : ""}</p>
      <div class="sc-card__actions">
        <a class="btn btn--solid" href="${wa}" target="_blank" rel="noopener">${icon("chat")}<span>${featured ? "Comprar por WhatsApp" : "Comprar"}</span></a>
        ${featured ? `<a class="btn btn--ghost" href="#producto-${i}">Ver detalle</a>` : ""}
      </div>
    </div>
  </article>`;
}

/** HTML del carrusel con los índices dados (ya filtrados y en orden). */
export function showcase(cat, list) {
  const s = SHOWCASES[cat];
  if (!s || !list.length) return "";
  const n = list.length;
  const fi = PRODUCTS.findIndex((p) => p.id === s.featured);
  return `<section class="showcase" aria-roledescription="carrusel" aria-label="Productos de ${esc(s.title)}" data-showcase>
    <header class="showcase__head">
      <div>
        <h2 class="showcase__title">${esc(s.title)}</h2>
        <p class="showcase__sub">${n} ${n === 1 ? "producto" : "productos"}${n > 1 ? " · desliza o usa las flechas para ver más" : ""}</p>
      </div>
      <div class="showcase__nav">
        <span class="showcase__count" data-sc-count aria-live="polite"></span>
        <button type="button" class="showcase__arrow" data-sc-step="-1" aria-label="Productos anteriores">${icon("left")}</button>
        <button type="button" class="showcase__arrow" data-sc-step="1" aria-label="Productos siguientes">${icon("right")}</button>
      </div>
    </header>
    <div class="showcase__track" data-sc-track tabindex="0" aria-label="Lista de productos. Usa las flechas del teclado para desplazarte.">${list
      .map((i, k) => item(i, k, n, i === fi, s.badge))
      .join("")}</div>
    <div class="showcase__dots" role="group" aria-label="Ir a un producto">${list
      .map((i, k) => `<button type="button" class="showcase__dot${i === fi ? " showcase__dot--featured" : ""}" data-sc-go="${k}" aria-label="Ver ${esc(PRODUCTS[i].n)}"><i></i></button>`)
      .join("")}</div>
  </section>`;
}

/* ---------- Interacción ---------- */
const itemsOf = (root) => [...root.querySelectorAll("[data-sc-item]")];
const trackOf = (root) => root.querySelector("[data-sc-track]");
const smooth = () => (prefersReducedMotion() ? "auto" : "smooth");

/** Productos a la vista: índice del primero, del último y estado de las flechas. */
function sync(root) {
  const t = trackOf(root);
  if (!t) return;
  const items = itemsOf(root);
  const o = items[0].offsetLeft; // relleno izquierdo del carril
  const l = t.scrollLeft, r = l + t.clientWidth - 2 * o;
  let first = -1, last = -1;
  items.forEach((el, k) => {
    const a = el.offsetLeft - o, w = el.offsetWidth, b = a + w;
    if (Math.min(b, r) - Math.max(a, l) > w * 0.6) { if (first < 0) first = k; last = k; }
  });
  if (first < 0) first = last = Math.min(items.length - 1, Math.floor(nearest(root)));
  root.dataset.first = first;
  root.querySelectorAll("[data-sc-go]").forEach((d, k) => {
    d.classList.toggle("is-in", k >= first && k <= last);
    k === first ? d.setAttribute("aria-current", "true") : d.removeAttribute("aria-current");
  });
  const c = root.querySelector("[data-sc-count]");
  if (c) c.textContent = first === last ? `${first + 1} de ${items.length}` : `${first + 1}–${last + 1} de ${items.length}`;
  const max = t.scrollWidth - t.clientWidth - 2;
  const [prev, next] = root.querySelectorAll("[data-sc-step]");
  prev.disabled = l <= 2;
  next.disabled = l >= max;
}

function goTo(root, k) {
  const t = trackOf(root);
  const items = itemsOf(root);
  k = Math.max(0, Math.min(items.length - 1, k));
  t.scrollTo({ left: items[k].offsetLeft - items[0].offsetLeft, behavior: smooth() });
}

/** Pinta el estado inicial de los carruseles que haya en `scope` (después de cada render). */
export function syncShowcases(scope = document) {
  scope.querySelectorAll("[data-showcase]").forEach((root) => {
    const t = trackOf(root);
    t.scrollLeft = 0;
    sync(root);
  });
}

export function initShowcase() {
  document.addEventListener("click", (e) => {
    const root = e.target.closest?.("[data-showcase]");
    if (!root) return;
    if (root._dragged && performance.now() - root._dragged < 400) { e.preventDefault(); e.stopPropagation(); return; }
    const step = e.target.closest("[data-sc-step]");
    const dot = e.target.closest("[data-sc-go]");
    if (step) goTo(root, +(root.dataset.first || 0) + +step.dataset.scStep);
    else if (dot) goTo(root, +dot.dataset.scGo);
  }, true);

  document.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const t = e.target.closest?.("[data-sc-track]");
    if (!t || e.altKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    const root = t.closest("[data-showcase]");
    goTo(root, +(root.dataset.first || 0) + (e.key === "ArrowLeft" ? -1 : 1));
  });

  // El evento scroll no burbujea: se escucha en captura.
  document.addEventListener("scroll", (e) => {
    const t = e.target;
    if (!(t instanceof Element) || !t.matches("[data-sc-track]")) return;
    const root = t.closest("[data-showcase]");
    if (root._raf) return;
    root._raf = requestAnimationFrame(() => { root._raf = 0; sync(root); });
  }, true);

  // Arrastre con mouse (en táctil y trackpad el navegador ya desliza solo).
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
    root._dragged = performance.now();
    const dx = (e.clientX ?? x) - x;
    // Al soltar se acomoda en el producto siguiente o anterior según la dirección del arrastre
    // (la posición se mide antes de reactivar el imán, que la movería).
    const at = nearest(root);
    const k = Math.abs(dx) > 40 ? (dx < 0 ? Math.ceil(at) : Math.floor(at)) : Math.round(at);
    t.classList.remove("is-dragging");
    goTo(root, k);
  };
  document.addEventListener("pointerup", end);
  document.addEventListener("pointercancel", end);

  let rt = 0;
  window.addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(() => document.querySelectorAll("[data-showcase]").forEach(sync), 120);
  });
}

/** Posición fraccionaria del primer producto visible (para acomodar después de arrastrar). */
function nearest(root) {
  const t = trackOf(root);
  const items = itemsOf(root);
  const l = t.scrollLeft + items[0].offsetLeft + 1;
  for (let k = 0; k < items.length; k++) {
    const a = items[k].offsetLeft, w = items[k].offsetWidth;
    if (l < a + w) return k + Math.max(0, (l - a) / w);
  }
  return items.length - 1;
}
