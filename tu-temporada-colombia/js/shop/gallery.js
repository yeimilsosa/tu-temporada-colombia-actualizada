/**
 * Galería de detalle: carrusel con desplazamiento táctil, modo mosaico, miniaturas,
 * sincronización con variantes y visor ampliado con teclado y gestos.
 */
import { esc, large, small, slides, slideIs, studioClass } from "./catalog.js";
import { state, setGalleryMode, setGalleryCols } from "./store.js";
import { icon } from "./ui.js";

let lb = null;

export function mountGallery(root, p, d, { onVariant } = {}) {
  const sl = slides(p);
  const n = sl.length;
  let track = null, raf = 0;

  function render() {
    if (!n) {
      root.innerHTML = `<div class="stage stage--empty">${icon("image")}<span>Imagen no disponible</span></div>`;
      return;
    }
    const mode = n > 1 ? state.galleryMode : "c";
    const bar = n > 1
      ? `<div class="gallery__bar">
          <div class="seg" role="group" aria-label="Modo de visualización">
            <button type="button" data-mode="c" aria-pressed="${mode === "c"}">${icon("single")}Carrusel</button>
            <button type="button" data-mode="g" aria-pressed="${mode === "g"}">${icon("grid")}Collage</button>
          </div>
          ${mode === "g" ? `<div class="seg seg--cols" role="group" aria-label="Columnas del collage">${[2, 3, 4].map((c) => `<button type="button" class="cols-${c}" data-cols="${c}" aria-pressed="${state.galleryCols === c}" aria-label="${c} columnas">${c}</button>`).join("")}</div>` : `<span class="gallery__count">${n} imágenes</span>`}
        </div>`
      : "";
    if (mode === "g") {
      root.innerHTML = bar + `<div class="mosaic" data-cols="${state.galleryCols}">${sl
        .map((x, k) => x.s
          ? `<button type="button" data-open="${k}" aria-label="Ampliar: ${esc(x.l)}"><img${studioClass(x.s)} src="${k === 0 ? large(x.s) : small(x.s)}" alt="${esc(p.n + " – " + x.l)}" loading="${k < 3 ? "eager" : "lazy"}" decoding="async"></button>`
          : "")
        .join("")}</div>`;
      track = null;
      return;
    }
    root.innerHTML = bar + `
      <div class="stage">
        <div class="stage__track" role="region" aria-roledescription="carrusel" aria-label="Imágenes de ${esc(p.n)}" tabindex="0">
          ${sl.map((x, k) => `<button type="button" class="stage__slide" data-open="${k}" aria-label="Ampliar imagen ${k + 1} de ${n}">${
            x.s ? `<img${studioClass(x.s)} src="${large(x.s)}" alt="${esc(p.n + " – " + x.l + (n > 1 ? ` (imagen ${k + 1} de ${n})` : ""))}" ${k === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">` : icon("image")
          }</button>`).join("")}
        </div>
        ${n > 1 ? `<button type="button" class="stage__nav stage__nav--prev" data-step="-1" aria-label="Imagen anterior">${icon("left")}</button>
        <button type="button" class="stage__nav stage__nav--next" data-step="1" aria-label="Imagen siguiente">${icon("right")}</button>` : ""}
        <span class="stage__zoom" aria-hidden="true">${icon("expand")}</span>
      </div>
      <div class="stage__caption" aria-live="polite" data-caption></div>
      ${n > 1 ? `<div class="thumbs">${sl.map((x, k) => `<button type="button" data-thumb="${k}" aria-label="${esc(x.l)}">${x.s ? `<img${studioClass(x.s)} src="${small(x.s)}" alt="" loading="lazy" decoding="async">` : ""}</button>`).join("")}</div>` : ""}`;
    track = root.querySelector(".stage__track");
    track.addEventListener("scroll", onScroll, { passive: true });
    track.addEventListener("scrollend", () => { if (target != null) { target = null; onScroll(); } }, { passive: true });
    if (d.k) track.scrollTo({ left: d.k * track.clientWidth, behavior: "instant" });
    update();
  }

  let target = null, targetTimer = 0;
  function onScroll() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const k = Math.round(track.scrollLeft / track.clientWidth);
      // Durante un desplazamiento pedido (flecha, miniatura, variante) se ignoran las
      // posiciones intermedias: si no, cambiarían la variante elegida al pasar por otras fotos.
      if (target != null) { if (k === target) target = null; return; }
      if (k !== d.k && k >= 0 && k < n) { d.k = k; update(); }
    });
  }

  function update() {
    const c = sl[d.k];
    if (!c) return;
    const cap = root.querySelector("[data-caption]");
    if (cap) cap.innerHTML = `<b>${esc(c.l)}${c.vi >= 0 && c.r ? ` <span>· Ref. ${esc(c.r)}</span>` : ""}</b><span>${d.k + 1} / ${n}</span>`;
    root.querySelectorAll("[data-thumb]").forEach((b) => b.setAttribute("aria-current", String(+b.dataset.thumb === d.k)));
    const th = root.querySelector('[data-thumb][aria-current="true"]');
    if (th && th.parentElement) th.parentElement.scrollTo({ left: th.offsetLeft - th.parentElement.clientWidth / 2 + 34, behavior: "smooth" });
    if (!slideIs(c, d.v)) { d.v = c.vi; onVariant?.(d.v); }
  }

  function goTo(k, smooth = true) {
    d.k = (k + n) % n;
    if (state.galleryMode === "g" && n > 1) { setGalleryMode("c"); render(); }
    if (track) {
      target = smooth && Math.abs(track.scrollLeft - d.k * track.clientWidth) > 2 ? d.k : null;
      clearTimeout(targetTimer);
      targetTimer = setTimeout(() => { target = null; }, 2000); // respaldo si no llega scrollend
      track.scrollTo({ left: d.k * track.clientWidth, behavior: smooth ? "smooth" : "instant" });
    }
    update();
  }

  root.addEventListener("click", (e) => {
    const t = e.target.closest("[data-mode],[data-cols],[data-step],[data-thumb],[data-open]");
    if (!t) return;
    if (t.dataset.mode) { setGalleryMode(t.dataset.mode); render(); }
    else if (t.dataset.cols) { setGalleryCols(+t.dataset.cols); render(); }
    else if (t.dataset.step) goTo(d.k + +t.dataset.step);
    else if (t.dataset.thumb != null) goTo(+t.dataset.thumb);
    else if (t.dataset.open != null) openLightbox(p, sl, +t.dataset.open, (k) => { d.k = k; if (track) track.scrollTo({ left: k * track.clientWidth, behavior: "instant" }); update(); });
  });
  root.addEventListener("keydown", (e) => {
    if (!track || !/^Arrow(Left|Right)$/.test(e.key)) return;
    e.preventDefault();
    goTo(d.k + (e.key === "ArrowRight" ? 1 : -1));
  });

  render();
  return {
    showVariant(k) {
      const idx = sl.findIndex((x) => slideIs(x, k));
      if (idx < 0) return;
      // La variante elegida manda: un slide compartido con la vista general no la desmarca.
      if (d.v !== k) { d.v = k; onVariant?.(k); }
      goTo(idx);
    },
  };
}

/* ---------- Visor ampliado ---------- */
function openLightbox(p, sl, k, onClose) {
  let i = k, lastFocus = document.activeElement;
  if (!lb) {
    lb = document.createElement("div");
    lb.className = "lightbox";
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-modal", "true");
    lb.setAttribute("aria-label", "Imagen ampliada");
    document.body.appendChild(lb);
  }
  const n = sl.length;
  const draw = () => {
    const x = sl[i];
    lb.innerHTML = `<button type="button" class="lightbox__btn lightbox__close" data-lb="close" aria-label="Cerrar">${icon("close")}</button>
      ${n > 1 ? `<button type="button" class="lightbox__btn lightbox__prev" data-lb="-1" aria-label="Anterior">${icon("left")}</button>
      <button type="button" class="lightbox__btn lightbox__next" data-lb="1" aria-label="Siguiente">${icon("right")}</button>` : ""}
      <div class="lightbox__img">${x.s ? `<img src="${large(x.s)}" alt="${esc(p.n + " – " + x.l)}">` : ""}</div>
      <p class="lightbox__cap"><b>${esc(x.l)}</b>${x.vi >= 0 && x.r ? ` · Ref. ${esc(x.r)}` : ""} · ${i + 1} / ${n}</p>`;
  };
  const step = (s) => { i = (i + s + n) % n; draw(); };
  const close = () => {
    lb.classList.remove("is-open");
    document.body.style.overflow = "";
    document.removeEventListener("keydown", key);
    lb.onclick = null;
    onClose?.(i);
    lastFocus?.focus?.({ preventScroll: true });
  };
  const key = (e) => {
    if (e.key === "Escape") close();
    else if (e.key === "ArrowRight") step(1);
    else if (e.key === "ArrowLeft") step(-1);
  };
  lb.onclick = (e) => {
    const b = e.target.closest("[data-lb]");
    if (b) return b.dataset.lb === "close" ? close() : step(+b.dataset.lb);
    const box = e.target.closest(".lightbox__img");
    if (box && e.target.tagName === "IMG") {
      box.classList.toggle("is-zoomed");
      if (box.classList.contains("is-zoomed")) {
        box.scrollLeft = (box.scrollWidth - box.clientWidth) / 2;
        box.scrollTop = (box.scrollHeight - box.clientHeight) / 2;
      }
    } else if (box) close();
  };
  let x0 = null;
  lb.ontouchstart = (e) => { x0 = e.touches.length === 1 && !lb.querySelector(".is-zoomed") ? e.touches[0].clientX : null; };
  lb.ontouchend = (e) => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1); };
  draw();
  lb.classList.add("is-open");
  document.body.style.overflow = "hidden";
  document.addEventListener("keydown", key);
  lb.querySelector(".lightbox__close").focus();
}
