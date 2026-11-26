/** Componentes de interfaz reutilizables (plantillas HTML). */
import { esc, formatCOP, label, productImages, small, isStudio } from "./catalog.js";
import { isSaved } from "./store.js";

export const icon = (id, cls = "icon") => `<svg class="${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;

const hasDiscount = (p) => p.p != null && p.o > p.p;
const discount = (p) => Math.round(100 - (p.p * 100) / p.o);

/** Precio con precio anterior solo si existe en los datos. */
export function price(p, cls = "card__price") {
  if (p.p == null) return `<p class="${cls} ${cls}--ask price--ask">Consultar precio</p>`;
  return `<p class="${cls}">${formatCOP(p.p)}${hasDiscount(p) ? `<s>${formatCOP(p.o)}</s>` : ""}</p>`;
}

/**
 * Tarjeta: fotografía 1:1, nombre (2 líneas), categoría y precio. Misma estructura siempre.
 * Sobre la foto: corazón de guardados arriba a la derecha y, si hay varias fotos, flechas y
 * puntos para recorrerlas (js/shop/cards.js). Los controles van fuera del enlace para que
 * sean botones reales y no queden anidados dentro de un <a>.
 */
export function card(p, i) {
  const imgs = productImages(p);
  const n = imgs.length;
  const name = esc(p.n);
  const media = n
    ? `<img class="is-on${isStudio(imgs[0]) ? " is-studio" : ""}" src="${small(imgs[0])}" alt="" loading="lazy" decoding="async" data-k="0">`
    : `<span class="card__placeholder">${icon("image")}Imagen no disponible</span>`;
  const on = isSaved(i);
  const nav = n > 1
    ? `<button class="card__nav card__nav--prev" type="button" data-slide="-1" aria-label="Foto anterior de ${name}">${icon("left")}</button>
      <button class="card__nav card__nav--next" type="button" data-slide="1" aria-label="Foto siguiente de ${name}">${icon("right")}</button>
      <span class="card__dots" aria-hidden="true">${n <= 6
        ? Array.from({ length: n }, (_, k) => `<i${k ? "" : ' class="is-on"'}></i>`).join("")
        : `<b data-pos>1</b>&thinsp;/&thinsp;${n}`}</span>`
    : "";
  return `<article class="card" data-card data-i="${i}"${n > 1 ? ` data-slides="${n}"` : ""}>
    <a class="card__link" href="#producto-${i}">
      <div class="card__media"><div class="card__slides">${media}</div>${hasDiscount(p) ? `<span class="card__badge">-${discount(p)}%</span>` : ""}</div>
      <h3 class="card__title">${name}</h3>
      <p class="card__cat">${esc(label(p.c))}</p>
      ${price(p)}
    </a>
    <div class="card__over">
      <button class="card__fav" type="button" data-save="${i}" data-name="${name}" aria-pressed="${on}" aria-label="${on ? "Quitar de guardados" : "Guardar"}: ${name}">${icon("heart")}</button>
      ${nav}
    </div>
  </article>`;
}

export const grid = (list) => `<div class="grid" data-grid>${list.map(([p, i]) => card(p, i)).join("")}</div>`;
