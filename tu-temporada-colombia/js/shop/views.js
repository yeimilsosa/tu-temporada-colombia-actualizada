/** Vistas de la tienda (plantillas). La interacción se conecta en main.js y gallery.js. */
import { PRODUCTS, CATEGORIES, all, esc, label, activeCategories, small, query, features, waLink, formatCOP } from "./catalog.js";
import { state, isSaved } from "./store.js";
import { grid, icon, price } from "./ui.js";

export const SORTS = [
  ["", "Relevancia"],
  ["a", "Precio: menor a mayor"],
  ["d", "Precio: mayor a menor"],
  ["n", "Nombre: A–Z"],
];

/* ---------- Marketplace ---------- */
export function market(f) {
  const cats = activeCategories();
  const chips = [`<button type="button" class="chip" data-cat="" aria-pressed="${!f.cat}">Todos <small>${PRODUCTS.length}</small></button>`]
    .concat(cats.map((c) => `<button type="button" class="chip" data-cat="${esc(c.code)}" aria-pressed="${f.cat === c.code}">${esc(c.name)} <small>${c.count}</small></button>`))
    .join("");
  const priceOn = f.min !== "" || f.max !== "";
  return `
  <section class="market" aria-labelledby="h-market">
    <div class="wrap">
      <div data-promo-slot></div>
      <header class="welcome">
        <h1 class="welcome__title" id="h-market">Explora nuestra tienda.</h1>
        <p class="welcome__sub">${PRODUCTS.length} productos para cada momento, con envíos a toda Colombia.</p>
      </header>
      <div class="market__bar" data-market-bar>
        <nav class="chips" aria-label="Categorías" data-chips>${chips}</nav>
        <div class="tools">
          <span class="market__count" data-count aria-live="polite"></span>
          <div class="tools__wrap">
            <button type="button" class="tool${priceOn ? " is-active" : ""}" data-price-toggle aria-expanded="false" aria-controls="price-pop">${icon("sliders")}<span class="tool__text">Precio</span></button>
            <form class="price-pop" id="price-pop" data-price-form hidden>
              <div class="price-pop__row">
                <label class="field"><span>Mínimo</span><input name="min" type="number" min="0" inputmode="numeric" placeholder="$" value="${esc(f.min)}"></label>
                <label class="field"><span>Máximo</span><input name="max" type="number" min="0" inputmode="numeric" placeholder="$" value="${esc(f.max)}"></label>
              </div>
              <div class="price-pop__actions">
                <button type="button" class="link-btn" data-price-clear>Limpiar</button>
                <button type="submit" class="btn btn--solid">Aplicar</button>
              </div>
            </form>
          </div>
          <label class="tool tool--select">${icon("sort", "icon tool__sort-icon")}<span class="sr-only">Ordenar</span>
            <select data-sort>${SORTS.map(([v, t]) => `<option value="${v}"${f.sort === v ? " selected" : ""}>${t}</option>`).join("")}</select>
          </label>
        </div>
      </div>
      <div class="market__meta" data-meta></div>
      <div class="market__results" data-results></div>
    </div>
  </section>`;
}

/** Línea de estado: número de productos y filtros activos que se pueden quitar. */
export function meta(f, count) {
  const pills = [];
  if (f.q.trim()) pills.push(`<button type="button" class="pill" data-clear="q">«${esc(f.q.trim())}» ${icon("close")}<span class="sr-only">Quitar búsqueda</span></button>`);
  if (f.min !== "" || f.max !== "") {
    const t = f.min !== "" && f.max !== "" ? `${formatCOP(+f.min)} – ${formatCOP(+f.max)}` : f.min !== "" ? `Desde ${formatCOP(+f.min)}` : `Hasta ${formatCOP(+f.max)}`;
    pills.push(`<button type="button" class="pill" data-clear="price">${t} ${icon("close")}<span class="sr-only">Quitar filtro de precio</span></button>`);
  }
  return pills.join("");
}

export function results(f) {
  const r = query(f);
  if (!r.length)
    return {
      count: 0,
      html: `<div class="empty"><h2>No hay productos con estos filtros</h2><p>Prueba con otra palabra, cambia el rango de precio o revisa todas las categorías.</p><button type="button" class="btn btn--ghost" data-clear="all">Ver todos los productos</button></div>`,
    };
  return { count: r.length, html: grid(r) };
}

/* ---------- Guardados ---------- */
export function saved() {
  const list = state.saved.filter((i) => PRODUCTS[i]).map((i) => [PRODUCTS[i], i]);
  return `<div class="wrap">
    <header class="page-head">
      <nav class="crumbs" aria-label="Ruta"><a href="#catalogo">Tienda</a><span aria-hidden="true">/</span><span>Guardados</span></nav>
      <h1>Guardados<sup>${list.length || ""}</sup></h1>
    </header>
    ${list.length
      ? grid(list)
      : `<div class="empty"><h2>Aún no tienes productos guardados</h2><p>Toca el corazón de un producto en el catálogo o en su página y aparecerá aquí.</p><a class="btn btn--solid" href="#catalogo">Ver productos</a></div>`}
  </div><div class="related"></div>`;
}

/* ---------- Detalle de producto ---------- */
export function detail(i, d) {
  const p = PRODUCTS[i];
  const v = d.v >= 0 ? p.v[d.v] : null;
  const ref = (v && v.id) || p.id;
  const catIndex = CATEGORIES.findIndex((c) => c[0] === p.c);
  const feats = features(p)
    .map((x) => (x.h ? `<li class="features__h"><h3>${esc(x.h)}</h3></li>` : `<li>${esc(x.t)}</li>`))
    .join("");
  const variants = p.v
    ? `<div class="pdp__block">
        <p class="pdp__label"><span>${esc(p.vl || "Opciones")} · ${p.v.length} referencias</span><b data-variant-name>${v ? esc(v.n) : ""}</b></p>
        <div class="variants" role="group" aria-label="${esc(p.vl || "Opciones")}">${p.v
          .map((vv, k) => {
            const img = vv.img && vv.img[0];
            return `<button type="button" class="variant${img ? "" : " variant--text"}" data-variant="${k}" aria-pressed="${k === d.v}">${
              img ? `<img src="${small(img)}" alt="" loading="lazy" decoding="async">` : ""
            }${esc(vv.n)}</button>`;
          })
          .join("")}</div>
      </div>`
    : "";
  const related = all().filter(([q, j]) => q.c === p.c && j !== i).concat(all().filter(([q]) => q.c !== p.c)).slice(0, 4);
  const sv = isSaved(i);

  return `<div class="wrap">
    <div class="pdp">
      <div class="pdp__gallery" data-gallery></div>
      <div class="pdp__info">
        <nav class="crumbs" aria-label="Ruta"><a href="#catalogo">Tienda</a><span aria-hidden="true">/</span><a href="#cat-${catIndex}">${esc(label(p.c))}</a></nav>
        <h1>${esc(p.n)}</h1>
        ${ref ? `<p class="pdp__ref">Ref. <span data-ref>${esc(ref)}</span></p>` : ""}
        ${price(p, "pdp__price")}
        ${variants}
        <div class="pdp__block">
          <p class="pdp__label"><span>Características</span></p>
          <ul class="features">${feats}</ul>
        </div>
        <div class="pdp__actions">
          <a class="btn btn--solid" data-wa-product target="_blank" rel="noopener" href="${waLink(waMessage(p, v))}">${icon("chat")}Consultar por WhatsApp</a>
          <button class="btn btn--ghost" type="button" data-save="${i}" aria-pressed="${sv}" aria-label="${sv ? "Quitar de guardados" : "Guardar producto"}">${icon("heart")}</button>
          <button class="btn btn--ghost" type="button" data-share aria-label="Compartir producto">${icon("share")}</button>
        </div>
        <p class="pdp__note">Envíos a toda Colombia. Confirmamos disponibilidad, costo y tiempo de entrega por WhatsApp.</p>
      </div>
    </div>
  </div>
  <section class="related" aria-labelledby="h-rel">
    <div class="wrap">
      <h2 id="h-rel">También te puede interesar</h2>
      ${grid(related)}
    </div>
  </section>`;
}

export function waMessage(p, v) {
  const ref = (v && v.id) || p.id;
  return `Hola, me interesa: ${p.n}${v ? " - " + v.n : ""}${ref ? " (Ref. " + ref + ")" : ""}`;
}
