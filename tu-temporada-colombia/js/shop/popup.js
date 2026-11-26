/**
 * Ventana promocional (pop-up). Configuración: js/data/popup.js.
 *
 * - Aparece una sola vez por sesión, `delay` segundos después de entrar. Al cerrarla (X, clic
 *   fuera, Escape) o al tocar WhatsApp no vuelve a salir en esa sesión (sessionStorage).
 * - Si en ese momento el visitante está escribiendo en la búsqueda, tiene abierto el menú o el
 *   visor de fotos, espera a que termine para no interrumpir.
 * - La imagen se pide poco antes de mostrarse y la ventana solo abre cuando ya cargó, así no pesa
 *   en la carga inicial de la tienda ni aparece vacía.
 * - Accesible: role="dialog", foco dentro mientras está abierta, Escape cierra y el foco vuelve
 *   a donde estaba.
 */
import { POPUP } from "../data/popup.js";
import { PRODUCTS, esc, waLink, formatCOP } from "./catalog.js";
import { asset, prefersReducedMotion } from "../core/env.js";

const KEY = "ttc-popup-" + POPUP.id;
const seen = () => { try { return sessionStorage.getItem(KEY) === "1"; } catch (e) { return false; } };
const markSeen = () => { try { sessionStorage.setItem(KEY, "1"); } catch (e) {} };
const icon = (id) => `<svg class="icon" aria-hidden="true"><use href="#i-${id}"/></svg>`;
const WA_ICON = `<svg class="popup__wa-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12.04 2a9.9 9.9 0 0 0-8.5 14.98L2 22l5.17-1.5A9.9 9.9 0 1 0 12.04 2Zm0 18.1a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.07.89.9-2.99-.2-.31a8.2 8.2 0 1 1 6.85 3.74Zm4.5-6.14c-.25-.12-1.46-.72-1.69-.8-.23-.08-.39-.12-.55.12-.16.25-.63.8-.78.96-.14.16-.29.18-.53.06a6.7 6.7 0 0 1-3.32-2.9c-.25-.43.25-.4.71-1.33.08-.16.04-.3-.02-.42l-.74-1.8c-.2-.47-.4-.4-.55-.41h-.47a.9.9 0 0 0-.65.3 2.75 2.75 0 0 0-.86 2.04 4.8 4.8 0 0 0 1 2.53 10.9 10.9 0 0 0 4.2 3.7c1.56.67 2.17.73 2.95.61.47-.07 1.46-.6 1.67-1.18.2-.58.2-1.07.14-1.18-.06-.1-.22-.16-.47-.28Z"/></svg>`;

let el = null;
let lastFocus = null;

function busy() {
  const a = document.activeElement;
  return (a && a.matches?.("input, textarea, select")) ||
    document.querySelector("#mobile-menu.is-open, .lightbox.is-open, .cat-panel.is-open");
}

function build() {
  const idx = PRODUCTS.findIndex((p) => p.n === POPUP.product);
  const p = PRODUCTS[idx];
  const name = p ? p.n : POPUP.product;
  const img = POPUP.image;
  const srcset = img.widths.map((w) => `${asset(`${img.file}-${w}.webp`)} ${w}w`).join(", ");
  const hs = img.closeHotspot;
  const wa = waLink(POPUP.message.replace("{product}", name));
  const d = document.createElement("div");
  d.className = "popup";
  d.innerHTML = `
    <div class="popup__backdrop" data-popup-close></div>
    <div class="popup__card" role="dialog" aria-modal="true" aria-labelledby="popup-title" aria-describedby="popup-text" tabindex="-1">
      <button type="button" class="popup__close" data-popup-close aria-label="Cerrar">${icon("close")}</button>
      <figure class="popup__media">
        <img alt="${esc(img.alt)}" width="${img.width}" height="${img.height}" decoding="async"
          sizes="(max-width: 760px) 92vw, 560px" data-srcset="${window.__TTC_INLINE__ ? "" : srcset}"
          data-src="${asset(`${img.file}-1280.webp`)}">
        ${hs ? `<button type="button" class="popup__hotspot" data-popup-close tabindex="-1" aria-hidden="true"
          style="left:${hs.x}%;top:${hs.y}%;width:${hs.size}%"></button>` : ""}
      </figure>
      <div class="popup__body">
        <p class="popup__eyebrow">${esc(POPUP.eyebrow)}</p>
        <h2 class="popup__title" id="popup-title">${esc(POPUP.title)}</h2>
        <p class="popup__product">${esc(name)}${p && p.p != null ? `<span>${formatCOP(p.p)}</span>` : ""}</p>
        <p class="popup__text" id="popup-text">${esc(POPUP.text)}</p>
        <a class="popup__cta" href="${wa}" target="_blank" rel="noopener" data-popup-wa>${WA_ICON}${esc(POPUP.cta)}</a>
        ${p ? `<a class="popup__more" href="#producto-${idx}" data-popup-close>Ver producto</a>` : ""}
      </div>
    </div>`;
  return d;
}

function load(imgEl) {
  if (!imgEl.getAttribute("src")) {
    if (imgEl.dataset.srcset) imgEl.srcset = imgEl.dataset.srcset;
    imgEl.src = imgEl.dataset.src;
  }
  if (imgEl.complete && imgEl.naturalWidth) return Promise.resolve(true);
  return new Promise((r) => {
    imgEl.addEventListener("load", () => r(true), { once: true });
    imgEl.addEventListener("error", () => r(false), { once: true });
  });
}

function open() {
  if (seen() || !el) return;
  if (busy()) { setTimeout(open, 2000); return; }
  lastFocus = document.activeElement;
  document.body.appendChild(el);
  document.documentElement.classList.add("popup-open");
  void el.offsetWidth;
  el.classList.add("is-open");
  el.querySelector(".popup__card").focus({ preventScroll: true });
  document.addEventListener("keydown", onKey);
}

function close() {
  if (!el || !el.classList.contains("is-open")) return;
  markSeen();
  el.classList.remove("is-open");
  document.documentElement.classList.remove("popup-open");
  document.removeEventListener("keydown", onKey);
  const done = () => el.remove();
  if (prefersReducedMotion()) done();
  else setTimeout(done, 320);
  if (lastFocus && lastFocus.isConnected && lastFocus !== document.body) lastFocus.focus({ preventScroll: true });
}

function onKey(e) {
  if (e.key === "Escape") { e.stopPropagation(); close(); return; }
  if (e.key !== "Tab") return;
  // Foco atrapado dentro de la ventana.
  const f = [...el.querySelectorAll("a[href], button:not([tabindex='-1'])")];
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && (document.activeElement === first || document.activeElement === el.querySelector(".popup__card"))) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

export function initPopup() {
  if (!POPUP.enabled || seen()) return;
  if (new URLSearchParams(location.search).has("nopopup")) return;
  const delay = (POPUP.delay || 5) * 1000;
  const t0 = performance.now();
  // La imagen se pide 1,5 s antes de mostrarse: no compite con la carga inicial de la tienda.
  setTimeout(() => {
    el = build();
    el.addEventListener("click", (e) => {
      if (e.target.closest("[data-popup-wa]")) { markSeen(); setTimeout(close, 300); return; }
      if (e.target.closest("[data-popup-close]")) close();
    });
    load(el.querySelector(".popup__media img")).then((ok) => {
      if (!ok) return; // sin imagen no se muestra
      setTimeout(open, Math.max(0, delay - (performance.now() - t0)));
    });
  }, Math.max(0, delay - 1500));
}
