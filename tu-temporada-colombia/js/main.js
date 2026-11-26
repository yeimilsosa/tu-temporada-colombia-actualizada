/**
 * Punto de entrada: intro 3D, enrutador por hash y marketplace.
 * Rutas: (vacío) portada con intro + marketplace · #catalogo y #cat-N marketplace filtrado ·
 * #producto-N detalle · #favoritos guardados. #carrito y #colecciones redirigen al catálogo.
 */
import { createJourney } from "./intro/journey.js";
import { PRODUCTS, CATEGORIES, esc, waLink, activeCategories, seo } from "./shop/catalog.js";
import { state, toggleSaved, pushRecent, onChange } from "./shop/store.js";
import * as V from "./shop/views.js";
import { mountGallery } from "./shop/gallery.js";
import { observe, enterView, swap } from "./shop/motion.js";
import { prefersReducedMotion } from "./core/env.js";
import { initTheme } from "./core/theme.js";
import { initCards } from "./shop/cards.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const app = $("#app");
const header = $("#header");
const journeyEl = $("#journey");
const toastEl = $(".toast");
const searchInput = $("#hsearch");
const searchClear = $("[data-search-clear]");
const DEFAULT_TITLE = "Tu Temporada Colombia · Tienda en línea";
const smoothScroll = () => (prefersReducedMotion() ? "auto" : "smooth");

let view = null;
let journeyDone = false;
let clipped = null;

/* ---------- Intro ---------- */
const journey = createJourney(journeyEl, {
  onProgress(p, done) {
    if (done !== journeyDone) { journeyDone = done; syncChrome(); }
  },
  onLayout: pullMarket,
  onPlate: clipMarket,
});

/** El catálogo se revela con la misma máscara circular que la tienda (centro en el pin). */
function clipMarket({ x, y, r, full, opacity }) {
  pinMarket();
  if (view !== "market" || journeyEl.hidden || full) {
    if (clipped !== "") { app.style.clipPath = ""; app.style.opacity = ""; clipped = ""; }
    return;
  }
  const top = app.getBoundingClientRect().top;
  const v = `circle(${r.toFixed(1)}px at ${x.toFixed(1)}px ${(y - top).toFixed(1)}px)`;
  if (v !== clipped) { app.style.clipPath = v; clipped = v; }
  app.style.opacity = opacity < 1 ? opacity.toFixed(3) : "";
}

/**
 * Mientras dura la intro, el marketplace se mantiene fijo en la parte superior de la pantalla
 * (oculto por la máscara). Así, cuando la máscara se abre, se ve ya en su sitio: header,
 * título, categorías, filtros y la primera fila de productos, sin pantallas vacías.
 */
function pinMarket() {
  if (view !== "market" || journeyEl.hidden) { app.style.transform = ""; return; }
  const end = journeyEl.offsetTop + journeyEl.offsetHeight - window.innerHeight;
  const dy = Math.min(0, window.scrollY - end);
  app.style.transform = dy < 0 ? `translate3d(0, ${dy}px, 0)` : "";
}
window.addEventListener("scroll", pinMarket, { passive: true });

/** El marketplace se superpone a la última pantalla de la intro, justo debajo de la bienvenida. */
function pullMarket(overlap = journey.overlap()) {
  app.style.marginTop = view === "market" && !journeyEl.hidden ? `${-overlap}px` : "";
}

(function introEntrance() {
  const g = window.gsap;
  if (!g || prefersReducedMotion()) return;
  g.from("[data-intro-line]", { yPercent: 112, duration: 1.7, ease: "expo.out", delay: 1.1, stagger: 0.14 });
  g.from(".journey__cue, .journey__top", { opacity: 0, duration: 1.2, delay: 2.2, ease: "power1.out", clearProps: "opacity" });
})();

/* ---------- Cabecera ---------- */
initTheme();
initCards();
const WA_GENERAL = waLink("Hola, quiero información de Tu Temporada Colombia.");
$$("[data-wa]").forEach((a) => (a.href = WA_GENERAL));
$("[data-year]").textContent = new Date().getFullYear();

const cats = activeCategories();
$("[data-cat-panel]").innerHTML = cats.map((c) => `<a class="cat-panel__item" href="#cat-${c.index}">${esc(c.name)}<small>${c.count}</small></a>`).join("");
$("[data-mobile-cats]").innerHTML = cats.map((c) => `<a href="#cat-${c.index}">${esc(c.name)}<small>${c.count}</small></a>`).join("");
$("[data-footer-cats]").innerHTML = cats.map((c) => `<li><a href="#cat-${c.index}">${esc(c.name)}</a></li>`).join("");

const catToggle = $("[data-cat-toggle]");
const catPanel = $("#cat-panel");
function setCatPanel(open) {
  catToggle.setAttribute("aria-expanded", String(open));
  catPanel.classList.toggle("is-open", open);
}
catToggle.addEventListener("click", () => setCatPanel(catToggle.getAttribute("aria-expanded") !== "true"));

const menuBtn = $("[data-menu-toggle]");
const menu = $("#mobile-menu");
function setMenu(open) {
  menu.classList.toggle("is-open", open);
  menuBtn.setAttribute("aria-expanded", String(open));
  menuBtn.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
  menuBtn.innerHTML = `<svg class="icon" aria-hidden="true"><use href="#i-${open ? "close" : "menu"}"/></svg>`;
  document.body.style.overflow = open ? "hidden" : "";
}
menuBtn.addEventListener("click", () => setMenu(!menu.classList.contains("is-open")));

function syncChrome() {
  const show = view !== "market" || journeyEl.hidden || journeyDone;
  header.classList.toggle("is-visible", show);
  document.body.classList.toggle("is-home", view === "market" && !journeyEl.hidden && !journeyDone);
}

/* ---------- Búsqueda (header) ---------- */
const mqMobile = window.matchMedia("(max-width: 760px)");
const setPlaceholder = () => (searchInput.placeholder = mqMobile.matches ? "Buscar productos" : "Buscar por nombre, referencia o categoría");
setPlaceholder();
mqMobile.addEventListener?.("change", setPlaceholder);
let searchT = 0;
searchInput.addEventListener("input", () => {
  state.filters.q = searchInput.value;
  searchClear.hidden = !searchInput.value;
  if (view !== "market") return;
  clearTimeout(searchT);
  searchT = setTimeout(() => updateMarket({ animate: true, reveal: true }), 160);
});
$("[data-search-form]").addEventListener("submit", (e) => {
  e.preventDefault();
  state.filters.q = searchInput.value;
  searchInput.blur();
  if (view === "market") updateMarket({ animate: true, reveal: true });
  else location.hash = "catalogo";
});
searchClear.addEventListener("click", () => {
  searchInput.value = "";
  state.filters.q = "";
  searchClear.hidden = true;
  searchInput.focus();
  if (view === "market") updateMarket({ animate: true });
});

/* ---------- Guardados y acciones globales ---------- */
function updateSavedCount() {
  $$("[data-saved-count]").forEach((el) => (el.textContent = state.saved.length || ""));
  // Todos los corazones del mismo producto (tarjeta, detalle, relacionados) quedan sincronizados.
  $$("[data-save]").forEach((b) => {
    const on = state.saved.includes(+b.dataset.save);
    b.setAttribute("aria-pressed", String(on));
    b.setAttribute("aria-label", b.dataset.name ? `${on ? "Quitar de guardados" : "Guardar"}: ${b.dataset.name}` : on ? "Quitar de guardados" : "Guardar producto");
  });
}
onChange(updateSavedCount);
updateSavedCount();

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("is-on");
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(() => toastEl.classList.remove("is-on"), 1900);
}

document.addEventListener("click", (e) => {
  if (!e.target.closest("#cat-panel, [data-cat-toggle]")) setCatPanel(false);
  if (e.target.closest(".skip-link")) {
    e.preventDefault();
    if (view === "market") { landOnMarket(false); app.focus({ preventScroll: true }); }
    else app.focus();
    return;
  }
  const save = e.target.closest("[data-save]");
  if (save) {
    e.preventDefault();
    const i = +save.dataset.save;
    const on = toggleSaved(i);
    save.classList.remove("is-pop");
    if (on) { void save.offsetWidth; save.classList.add("is-pop"); }
    toast(on ? "Guardado" : "Quitado de guardados");
    if (!on && view === "saved") removeSavedCard(save.closest("[data-card]"));
    return;
  }
  const home = e.target.closest("[data-home]");
  if (home) {
    e.preventDefault();
    setMenu(false);
    goMarket();
    return;
  }
  if (e.target.closest("#mobile-menu a")) setMenu(false);
  if (e.target.closest(".cat-panel a")) setCatPanel(false);
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (menu.classList.contains("is-open")) setMenu(false);
  setCatPanel(false);
  closePrice();
});

/** En Guardados, quitar el corazón retira la tarjeta. */
function removeSavedCard(cardEl) {
  if (!cardEl) return;
  const done = () => {
    cardEl.remove();
    const sup = $(".page-head sup", app);
    if (sup) sup.textContent = state.saved.length || "";
    if (!$("[data-card]", app)) { app.innerHTML = V.saved(); enterView(app); }
  };
  if (prefersReducedMotion() || !window.gsap) return done();
  window.gsap.to(cardEl, { opacity: 0, scale: 0.97, duration: 0.3, ease: "power2.in", onComplete: done });
}

/** Ir al marketplace (sin repetir la intro). */
function goMarket() {
  if (location.hash) history.pushState(null, "", location.pathname + location.search);
  state.filters.cat = "";
  if (view !== "market") route({ land: true });
  else { updateMarket({ animate: true }); landOnMarket(true); }
}

/** Posición en la que la intro terminó y el marketplace queda bajo la bienvenida. */
function landOnMarket(smooth) {
  const top = journeyEl.hidden ? 0 : journeyEl.offsetTop + journeyEl.offsetHeight - window.innerHeight + 1;
  window.scrollTo({ top, behavior: smooth ? smoothScroll() : "auto" });
  if (!smooth) journey.snap();
}

/** Lleva la barra de categorías a la vista si quedó por encima (al cambiar de filtro). */
function revealBar() {
  const bar = $("[data-market-bar]", app);
  if (!bar) return;
  const r = bar.getBoundingClientRect();
  const headerH = header.offsetHeight;
  if (r.top < headerH - 1 && app.getBoundingClientRect().top < headerH) {
    const results = $("[data-results]", app);
    const y = window.scrollY + results.getBoundingClientRect().top - headerH - bar.offsetHeight - 8;
    if (window.scrollY > y) window.scrollTo({ top: y, behavior: smoothScroll() });
  }
}

/* ---------- Enrutador ---------- */
function parse() {
  const h = decodeURIComponent(location.hash.slice(1));
  if (h.startsWith("producto-")) return { name: "detail", i: +h.slice(9) };
  if (h === "catalogo" || h === "colecciones") return { name: "market", cat: "", land: true };
  if (h.startsWith("cat-")) return { name: "market", cat: (CATEGORIES[+h.slice(4)] || [""])[0], land: true };
  if (h === "favoritos") return { name: "saved" };
  if (h === "carrito") return { name: "redirect", to: "catalogo" }; // el carrito no está disponible por ahora
  return { name: "market", cat: null };
}

function route(opts = {}) {
  const r = parse();
  if (r.name === "redirect") { location.replace("#" + r.to); return; }
  if (r.name === "detail" && !PRODUCTS[r.i]) { location.hash = "catalogo"; return; }
  setCatPanel(false);
  closePrice();

  // Dentro del marketplace solo cambia la cuadrícula
  if (r.name === "market" && view === "market") {
    if (r.cat !== null) state.filters.cat = r.cat;
    updateMarket({ animate: true });
    if (r.land) { if (!journeyDone) landOnMarket(true); else revealBar(); }
    return;
  }

  const prev = view;
  view = r.name;
  const market = view === "market";
  journeyEl.hidden = !market;
  journey.setActive(market);
  document.body.classList.toggle("is-market", market);

  if (market) {
    if (r.cat !== null) state.filters.cat = r.cat;
    app.innerHTML = V.market(state.filters);
    bindMarket();
    updateMarket({ animate: false });
    pullMarket();
    syncChrome();
    requestAnimationFrame(() => {
      journey.refresh();
      if (opts.land || r.land || (prev && prev !== "market")) landOnMarket(false);
    });
  } else {
    app.style.marginTop = "";
    app.style.transform = "";
    app.style.clipPath = "";
    app.style.opacity = "";
    clipped = "";
    if (view === "saved") {
      document.title = "Guardados · Tu Temporada Colombia";
      seo(null);
      app.innerHTML = V.saved();
    } else renderDetail(r.i);
    syncChrome();
    window.scrollTo(0, 0);
    enterView(app);
    observe(app);
  }
  $$("[data-nav]").forEach((a) => (a.dataset.nav === "favoritos" && view === "saved" ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
}

/* ---------- Marketplace ---------- */
const pricePop = () => $("[data-price-form]", app);
function closePrice() {
  const pop = pricePop();
  if (!pop || pop.hidden) return;
  pop.hidden = true;
  $("[data-price-toggle]", app)?.setAttribute("aria-expanded", "false");
}

function bindMarket() {
  $("[data-sort]", app).addEventListener("change", (e) => {
    state.filters.sort = e.target.value;
    updateMarket({ animate: true, reveal: true });
  });
  $("[data-price-form]", app).addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    state.filters.min = String(fd.get("min") || "");
    state.filters.max = String(fd.get("max") || "");
    closePrice();
    updateMarket({ animate: true, reveal: true });
  });
}

// Un solo manejador para la vista actual (evita escuchas duplicadas al navegar)
app.addEventListener("click", (e) => {
  if (view === "market") onMarketClick(e);
  else if (view === "detail") onDetailClick(e);
});

function onMarketClick(e) {
  const chip = e.target.closest("[data-cat]");
  if (chip) {
    state.filters.cat = chip.dataset.cat;
    const idx = CATEGORIES.findIndex((c) => c[0] === chip.dataset.cat);
    history.replaceState(null, "", idx >= 0 ? `#cat-${idx}` : location.pathname + location.search + (location.hash ? "#catalogo" : ""));
    updateMarket({ animate: true, reveal: true });
    chip.scrollIntoView({ block: "nearest", inline: "nearest", behavior: smoothScroll() });
    return;
  }
  const toggle = e.target.closest("[data-price-toggle]");
  if (toggle) {
    const pop = pricePop();
    pop.hidden = !pop.hidden;
    toggle.setAttribute("aria-expanded", String(!pop.hidden));
    if (!pop.hidden) pop.querySelector("input").focus();
    return;
  }
  if (!e.target.closest(".tools__wrap")) closePrice();
  const clear = e.target.closest("[data-clear], [data-price-clear]");
  if (clear) {
    const what = clear.dataset.clear || "price";
    if (what === "q" || what === "all") { state.filters.q = ""; searchInput.value = ""; searchClear.hidden = true; }
    if (what === "price" || what === "all") { state.filters.min = ""; state.filters.max = ""; }
    if (what === "all") { state.filters.cat = ""; state.filters.sort = ""; const s = $("[data-sort]", app); if (s) s.value = ""; }
    closePrice();
    updateMarket({ animate: true, reveal: true });
  }
}

function updateMarket({ animate, reveal } = {}) {
  const f = state.filters;
  const current = CATEGORIES.find((c) => c[0] === f.cat);
  document.title = current ? `${current[1]} · Tu Temporada Colombia` : DEFAULT_TITLE;
  seo(null);
  $$("[data-cat]", app).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.cat === (f.cat || ""))));
  const priceOn = f.min !== "" || f.max !== "";
  $("[data-price-toggle]", app)?.classList.toggle("is-active", priceOn);
  const form = pricePop();
  if (form) { form.min.value = f.min; form.max.value = f.max; }
  const { count, html } = V.results(f);
  $("[data-meta]", app).innerHTML = V.meta(f, count);
  $("[data-count]", app).textContent = `${count} ${count === 1 ? "producto" : "productos"}`;
  const box = $("[data-results]", app);
  if (animate) swap(box, html);
  else { box.innerHTML = html; observe(app); }
  if (reveal) revealBar();
}

/* ---------- Detalle ---------- */
let detailCtx = null;
function onDetailClick(e) {
  if (!detailCtx) return;
  const { p, gal } = detailCtx;
  const vb = e.target.closest("[data-variant]");
  if (vb) {
    gal.showVariant(+vb.dataset.variant);
    if (window.innerWidth <= 760) $("[data-gallery]", app).scrollIntoView({ behavior: smoothScroll(), block: "start" });
  }
  if (e.target.closest("[data-share]")) {
    const url = location.href;
    if (navigator.share) navigator.share({ title: p.n, url }).catch(() => {});
    else if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => toast("Enlace copiado"), () => toast("No se pudo copiar el enlace"));
  }
}

function renderDetail(i) {
  const p = PRODUCTS[i];
  pushRecent(i);
  document.title = `${p.n} · Tu Temporada Colombia`;
  seo(p);
  const d = { i, k: 0, v: -1 };
  app.innerHTML = V.detail(i, d);
  const gal = mountGallery($("[data-gallery]", app), p, d, { onVariant: syncVariant });

  function syncVariant(vi) {
    const v = vi >= 0 ? p.v[vi] : null;
    $$("[data-variant]", app).forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.variant === vi)));
    const name = $("[data-variant-name]", app);
    if (name) name.textContent = v ? v.n : "";
    const ref = $("[data-ref]", app);
    if (ref) ref.textContent = (v && v.id) || p.id || "";
    const wa = $("[data-wa-product]", app);
    if (wa) wa.href = waLink(V.waMessage(p, v));
  }
  syncVariant(d.v);
  detailCtx = { p, gal };
}

/* ---------- Arranque ---------- */
window.addEventListener("hashchange", () => route());
route();
