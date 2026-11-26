/**
 * Carrusel de banners publicitarios de la portada (debajo del header, antes del catálogo).
 *
 * - Cambia solo cada BANNER_INTERVAL segundos con un fundido; después del último vuelve al primero.
 * - Flechas, puntos (cada punto lleva a su banner), ← → con el foco dentro y swipe en táctil.
 *   Cualquier cambio manual reinicia el temporizador.
 * - Se pausa con el cursor encima, con el foco del teclado dentro, con la pestaña oculta, cuando
 *   el banner sale de la pantalla y fuera del marketplace. El botón de pausa lo detiene del todo.
 * - Con «reducir movimiento» activo en el dispositivo no avanza solo (se puede iniciar con el botón).
 * - Solo se descarga el primer banner al abrir; el siguiente se precarga mientras se ve el actual
 *   y el cambio espera a que la imagen esté decodificada, así nunca se ve un cuadro vacío.
 *
 * El elemento se crea una sola vez y se vuelve a insertar cada vez que se pinta el marketplace
 * (attachPromo); al salir del marketplace se pausa (detachPromo). Datos: js/data/banners.js.
 */
import { BANNERS, BANNER_INTERVAL } from "../data/banners.js";
import { asset, prefersReducedMotion } from "../core/env.js";
import { esc } from "./catalog.js";

const WIDTHS = [640, 1280, 1920];
const MOBILE_MQ = "(max-width: 760px)";
const icon = (id) => `<svg class="icon" aria-hidden="true"><use href="#i-${id}"/></svg>`;
const ratio = (list) => list.reduce((s, b) => s + b.width / b.height, 0) / list.length;
const path = (file, w) => `assets/img/banners/${file}-${w}.webp`;

/** srcset con los anchos reales (el script nunca amplía: un original de 1600 px queda en 1600w). */
function srcset(b) {
  return WIDTHS.map((w) => `${path(b.file, w)} ${Math.min(w, b.width)}w`).join(", ");
}

// Versión para móvil solo si todos los banners la tienen: así todos comparten la misma proporción.
const useMobileArt = BANNERS.length > 0 && BANNERS.every((b) => b.mobile);
const inline = () => !!window.__TTC_INLINE__; // vista previa de un solo archivo: sin srcset

let root = null;
let slides = [];
let dots = [];
let k = 0;
let token = 0;
let timer = 0;
let startedAt = 0;
let remaining = 0;
let swipedAt = 0; // último swipe: evita que abra el enlace del banner
const reasons = new Set(); // motivos de pausa activos: hover, focus, hidden, offscreen, detached, user
const n = BANNERS.length;
const ms = BANNER_INTERVAL * 1000;

function slideHTML(b, i) {
  const sizes = "(max-width: 1360px) 100vw, 1260px";
  const media = useMobileArt && !inline()
    ? `<source media="${MOBILE_MQ}" data-srcset="${WIDTHS.map((w) => `${path(b.mobile.file, w)} ${Math.min(w, b.mobile.width)}w`).join(", ")}" sizes="100vw">`
    : "";
  const img = `<picture>${media}<img alt="${esc(b.alt)}" width="${b.width}" height="${b.height}" decoding="async" draggable="false"
    data-src="${asset(path(b.file, 1280))}"${inline() ? "" : ` data-srcset="${srcset(b)}" sizes="${sizes}"`}></picture>`;
  const body = b.href
    ? `<a class="promo__link" href="${esc(b.href)}"${/^https?:/.test(b.href) ? ' target="_blank" rel="noopener"' : ""}>${img}</a>`
    : img;
  return `<div class="promo__slide${i === 0 ? " is-on" : ""}" role="group" aria-roledescription="banner" aria-label="${i + 1} de ${n}"${i ? " inert aria-hidden=\"true\"" : ""}>${body}</div>`;
}

function build() {
  const el = document.createElement("section");
  el.className = "promo";
  el.setAttribute("aria-roledescription", "carrusel");
  el.setAttribute("aria-label", "Promociones de Tu Temporada Colombia");
  el.style.setProperty("--promo-ratio", ratio(BANNERS).toFixed(4));
  if (useMobileArt) el.style.setProperty("--promo-ratio-m", ratio(BANNERS.map((b) => b.mobile)).toFixed(4));
  const multi = n > 1;
  el.innerHTML = `
    <div class="promo__stage">
      <div class="promo__viewport" aria-live="off" data-promo-viewport>${BANNERS.map(slideHTML).join("")}</div>
      ${multi ? `<button type="button" class="promo__arrow promo__arrow--prev" data-promo-step="-1" aria-label="Banner anterior">${icon("left")}</button>
      <button type="button" class="promo__arrow promo__arrow--next" data-promo-step="1" aria-label="Banner siguiente">${icon("right")}</button>` : ""}
    </div>
    ${multi ? `<div class="promo__controls">
      <button type="button" class="promo__btn promo__btn--prev" data-promo-step="-1" aria-label="Banner anterior">${icon("left")}</button>
      <div class="promo__dots" role="group" aria-label="Elegir banner">${BANNERS.map((b, i) =>
        `<button type="button" class="promo__dot" data-promo-go="${i}" aria-label="Ver banner ${i + 1} de ${n}"${i === 0 ? ' aria-current="true"' : ""}><i></i></button>`).join("")}</div>
      <button type="button" class="promo__btn promo__btn--play" data-promo-toggle aria-pressed="false" aria-label="Pausar banners">${icon("pause")}</button>
      <button type="button" class="promo__btn promo__btn--next" data-promo-step="1" aria-label="Banner siguiente">${icon("right")}</button>
    </div>` : ""}`;
  el.style.setProperty("--promo-interval", `${ms}ms`);
  slides = [...el.querySelectorAll(".promo__slide")];
  dots = [...el.querySelectorAll(".promo__dot")];
  bind(el);
  return el;
}

/** Asigna la imagen del banner i (solo la primera vez) y devuelve una promesa que se cumple
 *  cuando está lista para mostrarse. Si tarda o falla, no bloquea el carrusel más de 2,5 s. */
function load(i) {
  const img = slides[i].querySelector("img");
  if (!img.getAttribute("src")) {
    const source = slides[i].querySelector("source[data-srcset]");
    if (source) source.srcset = source.dataset.srcset;
    if (img.dataset.srcset) img.srcset = img.dataset.srcset;
    img.src = img.dataset.src;
  }
  if (img.complete && img.naturalWidth) return Promise.resolve();
  const ready = img.decode ? img.decode().catch(() => {}) : new Promise((r) => { img.onload = img.onerror = r; });
  return Promise.race([ready, new Promise((r) => setTimeout(r, 2500))]);
}

function show(i, { manual = false } = {}) {
  if (!n) return;
  i = ((i % n) + n) % n;
  const t = ++token;
  if (manual) root.querySelector("[data-promo-viewport]").setAttribute("aria-live", "polite");
  load(i).then(() => {
    if (t !== token) return; // otro cambio llegó antes
    k = i;
    slides.forEach((s, j) => {
      const on = j === i;
      s.classList.toggle("is-on", on);
      s.toggleAttribute("inert", !on);
      if (on) s.removeAttribute("aria-hidden");
      else s.setAttribute("aria-hidden", "true");
    });
    dots.forEach((d, j) => (j === i ? d.setAttribute("aria-current", "true") : d.removeAttribute("aria-current")));
    restart();
    // Precarga el siguiente (y el anterior, por si se navega hacia atrás).
    if (n > 1) load((i + 1) % n).then(() => n > 2 && load((i - 1 + n) % n));
  });
}

/* ---------- Temporizador con pausa (conserva el tiempo restante) ---------- */
const running = () => n > 1 && reasons.size === 0;

function restart() {
  clearTimeout(timer);
  remaining = ms;
  // Reinicia la barra de progreso del punto activo.
  root.classList.remove("is-ticking");
  void root.offsetWidth;
  root.classList.add("is-ticking");
  if (running()) { startedAt = performance.now(); timer = setTimeout(tick, remaining); }
}
function tick() {
  root.querySelector("[data-promo-viewport]").setAttribute("aria-live", "off");
  show(k + 1);
}
function pause(why) {
  const was = running();
  reasons.add(why);
  if (was) { clearTimeout(timer); remaining = Math.max(0, remaining - (performance.now() - startedAt)); }
  sync();
}
function resume(why) {
  if (!reasons.delete(why)) return;
  if (running()) { clearTimeout(timer); startedAt = performance.now(); timer = setTimeout(tick, remaining); }
  sync();
}
function sync() {
  if (!root) return;
  root.classList.toggle("is-paused", !running());
  const btn = root.querySelector("[data-promo-toggle]");
  if (btn) {
    const off = reasons.has("user");
    btn.setAttribute("aria-pressed", String(off));
    btn.setAttribute("aria-label", off ? "Reproducir banners" : "Pausar banners");
    btn.innerHTML = icon(off ? "play" : "pause");
  }
}

/* ---------- Interacción ---------- */
function bind(el) {
  el.addEventListener("click", (e) => {
    const step = e.target.closest("[data-promo-step]");
    if (step) return show(k + +step.dataset.promoStep, { manual: true });
    const go = e.target.closest("[data-promo-go]");
    if (go) return show(+go.dataset.promoGo, { manual: true });
    if (e.target.closest("[data-promo-toggle]")) {
      if (reasons.has("user")) resume("user"); else pause("user");
      return;
    }
    const link = e.target.closest(".promo__link");
    if (!link) return;
    if (swipedAt && performance.now() - swipedAt < 500) { e.preventDefault(); swipedAt = 0; return; }
    const href = link.getAttribute("href");
    if (href.startsWith("#")) { e.preventDefault(); openHash(href); }
  });

  el.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    show(k + (e.key === "ArrowLeft" ? -1 : 1), { manual: true });
  });

  // Cursor encima: pausa. Solo mouse; en táctil no existe «encima».
  el.addEventListener("pointerenter", (e) => e.pointerType === "mouse" && pause("hover"));
  el.addEventListener("pointerleave", (e) => e.pointerType === "mouse" && resume("hover"));
  // Foco del teclado dentro: pausa (WCAG 2.2.2).
  el.addEventListener("focusin", (e) => e.target.matches(":focus-visible") && pause("focus"));
  el.addEventListener("focusout", (e) => { if (!el.contains(e.relatedTarget)) resume("focus"); });

  // Swipe táctil. touch-action: pan-y deja el desplazamiento vertical al navegador.
  const vp = el.querySelector("[data-promo-viewport]");
  let g = null;
  vp.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" || !e.isPrimary || n < 2) return;
    g = { x: e.clientX, y: e.clientY, id: e.pointerId };
    load((k + 1) % n); load((k - 1 + n) % n);
  }, { passive: true });
  vp.addEventListener("pointerup", (e) => {
    if (!g || e.pointerId !== g.id) return;
    const dx = e.clientX - g.x, dy = e.clientY - g.y;
    g = null;
    if (Math.abs(dx) > 36 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      swipedAt = performance.now();
      show(k + (dx < 0 ? 1 : -1), { manual: true });
    }
  }, { passive: true });
  vp.addEventListener("pointercancel", () => (g = null), { passive: true });
  // Evita el arrastre fantasma de la imagen con el mouse.
  vp.addEventListener("dragstart", (e) => e.preventDefault());
}
/** Enlaces internos del banner: llevan al catálogo (o a la categoría) y bajan hasta los productos. */
function openHash(href) {
  if (location.hash === href) window.dispatchEvent(new HashChangeEvent("hashchange"));
  else location.hash = href;
  if (!/^#(catalogo|cat-\d+)$/.test(href)) return;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const bar = document.querySelector("[data-market-bar]");
    const header = document.getElementById("header");
    if (!bar) return;
    const y = window.scrollY + bar.getBoundingClientRect().top - (header ? header.offsetHeight : 0);
    window.scrollTo({ top: Math.max(0, y), behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }));
}

/* ---------- Pausas globales: pestaña oculta, fuera de pantalla, reducir movimiento ---------- */
let globalsBound = false;
function bindGlobals() {
  if (globalsBound) return;
  globalsBound = true;
  document.addEventListener("visibilitychange", () => (document.hidden ? pause("hidden") : resume("hidden")));
  if (document.hidden) reasons.add("hidden");
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => (e.isIntersecting ? resume("offscreen") : pause("offscreen")), { threshold: 0.25 }).observe(root);
  }
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (mq.matches) reasons.add("user");
  mq.addEventListener?.("change", (e) => (e.matches ? pause("user") : resume("user")));
}

/** Inserta el carrusel en `slot` (lo reemplaza) y lo pone en marcha. */
export function attachPromo(slot) {
  if (!slot) return;
  if (!n) { slot.remove(); return; }
  const first = !root;
  if (first) root = build();
  slot.replaceWith(root);
  if (first) {
    bindGlobals();
    // El primer banner es el contenido más visible de la portada: se pide con prioridad alta.
    const img = slides[0].querySelector("img");
    img.fetchPriority = "high";
    load(0).then(() => root.classList.add("is-ready"));
    sync();
    restart();
    if (n > 1) load(1);
  }
  resume("detached");
}

/** Pausa el carrusel cuando el marketplace deja de mostrarse (detalle, guardados). */
export function detachPromo() {
  if (root) pause("detached");
}
