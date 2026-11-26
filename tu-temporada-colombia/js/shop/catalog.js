/**
 * Lógica del catálogo: etiquetas, imágenes, búsqueda, filtros y formato.
 * Mantiene el mismo comportamiento del HTML original (búsqueda por nombre, referencia,
 * categoría y variantes; filtros por categoría y precio; orden por precio).
 */
import { applyStudio } from "../data/photos.js";
import { PRODUCTS, CATEGORIES, WHATSAPP } from "../data/catalog.js";
import { asset } from "../core/env.js";

// Portadas de estudio (fondo beige): se aplican una vez, antes de pintar nada.
applyStudio(PRODUCTS);

export { PRODUCTS, CATEGORIES, WHATSAPP };

export const LABEL = Object.fromEntries(CATEGORIES.map((c) => [c[0], c[1]]));
export const label = (code) => LABEL[code] || code;

export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const formatCOP = (n) => (n == null ? "Consultar precio" : "$" + n.toLocaleString("es-CO"));

export const waLink = (text) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;

export const all = () => PRODUCTS.map((p, i) => [p, i]);

/** Conteo de productos por categoría (solo categorías con productos). */
export function categoryCounts() {
  const cn = {};
  PRODUCTS.forEach((p) => (cn[p.c] = (cn[p.c] || 0) + 1));
  return cn;
}
export const activeCategories = () => {
  const cn = categoryCounts();
  return CATEGORIES.map((c, i) => ({ code: c[0], name: c[1], index: i, count: cn[c[0]] || 0 })).filter((c) => c.count);
};

/** Todas las imágenes de un producto en orden: generales, adicionales y primera de cada variante. */
export function productImages(p) {
  const out = [...p.img, ...(p.s || [])];
  (p.v || []).forEach((v) => v.img && v.img[0] && out.push(v.img[0]));
  return [...new Set(out)];
}
export const small = (src) => asset(src.replace(/\.webp$/, "-sm.webp"));
/** Fotos de estudio (fondo beige a sangre): se muestran sin margen interior. */
export const isStudio = (src) => /\/estudio\//.test(src || "");
export const studioClass = (src) => (isStudio(src) ? ' class="is-studio"' : "");
export const large = (src) => asset(src);

export function hasImage(p) {
  return productImages(p).length > 0;
}

const haystack = (p) =>
  [p.n, p.id, label(p.c), ...(p.v || []).map((v) => v.n + " " + v.id)].join(" ").toLowerCase();

/** Filtra y ordena según el estado {q, cat, min, max, sort}. */
export function query({ q = "", cat = "", min = "", max = "", sort = "" }) {
  const term = q.toLowerCase().trim();
  const r = all().filter(
    ([p]) =>
      (!cat || p.c === cat) &&
      (!term || haystack(p).includes(term)) &&
      (min === "" || (p.p != null && p.p >= +min)) &&
      (max === "" || (p.p != null && p.p <= +max))
  );
  // Orden por precio (los productos sin precio quedan al final) o por nombre.
  if (sort === "a" || sort === "d") r.sort((a, b) => (a[0].p == null) - (b[0].p == null) || (a[0].p - b[0].p) * (sort === "d" ? -1 : 1));
  else if (sort === "n") r.sort((a, b) => a[0].n.localeCompare(b[0].n, "es"));
  return r;
}

/**
 * Diapositivas de la galería de detalle (misma estructura que el original):
 * vistas generales y luego las imágenes de cada variante con su referencia.
 */
export function slides(p) {
  const out = [];
  const at = new Map(); // foto -> índice del slide
  [...p.img, ...(p.s || [])].forEach((s) => {
    if (at.has(s)) return;
    at.set(s, out.length);
    out.push({ s, vi: -1, l: "Vista general", r: p.id });
  });
  (p.v || []).forEach((v, k) => {
    (v.img && v.img.length ? v.img : [null]).forEach((s) => {
      // Si la foto ya está en la galería no se repite: ese slide también representa a la variante.
      if (s && at.has(s)) {
        const x = out[at.get(s)];
        (x.also ||= []).push(k);
        return;
      }
      if (s) at.set(s, out.length);
      out.push({ s, vi: k, l: v.n, r: v.id });
    });
  });
  return out;
}
/** ¿El slide corresponde a la variante k? */
export const slideIs = (x, k) => x.vi === k || (x.also || []).includes(k);

/** Características: las líneas que empiezan con "## " son subtítulos. */
export function features(p) {
  return p.f.map((x) => (x.startsWith("##") ? { h: x.replace(/^##\s*/, "") } : { t: x }));
}

/** Metadatos SEO del original: descripción y JSON-LD de producto. */
export function seo(p) {
  const m = document.querySelector("meta[name=description]");
  const d0 = "Los productos que necesitas cuando los necesitas. Envíos a nivel nacional.";
  const plain = p ? p.f.filter((x) => !x.startsWith("##")) : [];
  if (m) m.content = p ? `${p.n} – ${label(p.c)}. ${plain.slice(0, 3).join(", ")}. Envíos a nivel nacional.`.slice(0, 300) : d0;
  let s = document.getElementById("ld");
  if (!p) { s && s.remove(); return; }
  if (!s) {
    s = document.createElement("script");
    s.id = "ld";
    s.type = "application/ld+json";
    document.head.appendChild(s);
  }
  s.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.n,
    sku: p.id,
    category: label(p.c),
    description: plain.join(". "),
    ...(p.p != null ? { offers: { "@type": "Offer", priceCurrency: "COP", price: p.p } } : {}),
  }).replace(/</g, "\\u003c");
}
