/**
 * Estado persistente del visitante. Usa las mismas claves de localStorage del sitio original
 * ("fav" para guardados, "rec" para vistos recientemente, "gm" para el modo de galería),
 * así nadie pierde lo que ya tenía guardado.
 *
 * Preparado para el futuro: el carrito se agregará como otra clave aquí (FEATURES.cart),
 * hoy desactivado y sin interfaz.
 */
export const FEATURES = Object.freeze({ cart: false });

const read = (k, d) => {
  try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; }
};
const write = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* almacenamiento no disponible */ }
};

/**
 * Guardados y vistos se guardan por posición en el catálogo. Cuando se retira un producto, las
 * posiciones siguientes bajan; esta lista corrige lo que el visitante ya tenía guardado.
 * Cada entrada: [versión, posiciones retiradas en el catálogo de la versión anterior].
 * Al retirar más productos, agregar una entrada nueva con la versión siguiente.
 */
const REMOVALS = [
  [2, [3, 7]], // 2026-11: Luces Cortina LED Inteligente 3x3 (3) y Closet de Tela Ref. 2 (7)
];
const CATALOG_VERSION = REMOVALS.length ? REMOVALS[REMOVALS.length - 1][0] : 1;

function migrate(list, from) {
  let out = Array.isArray(list) ? list.filter(Number.isInteger) : [];
  REMOVALS.filter(([v]) => v > from).forEach(([, gone]) => {
    out = out.filter((i) => !gone.includes(i)).map((i) => i - gone.filter((g) => g < i).length);
  });
  return [...new Set(out)];
}
const fromVersion = read("cv", 1);
const savedList = migrate(read("fav", []), fromVersion);
const recentList = migrate(read("rec", []), fromVersion);
if (fromVersion !== CATALOG_VERSION) {
  write("fav", savedList);
  write("rec", recentList);
  write("cv", CATALOG_VERSION);
}

const listeners = new Set();
export const state = {
  saved: savedList,
  recent: recentList,
  galleryMode: read("gm", "c"),
  galleryCols: read("gc", 3),
  filters: { q: "", cat: "", min: "", max: "", sort: "" },
};

export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
const emit = () => listeners.forEach((fn) => fn(state));

export const isSaved = (i) => state.saved.includes(i);
export function toggleSaved(i) {
  state.saved = isSaved(i) ? state.saved.filter((x) => x !== i) : [...state.saved, i];
  write("fav", state.saved);
  emit();
  return isSaved(i);
}
export function pushRecent(i) {
  state.recent = [i, ...state.recent.filter((x) => x !== i)].slice(0, 8);
  write("rec", state.recent);
}
export function setGalleryMode(m) {
  state.galleryMode = m;
  write("gm", m);
}
export function setGalleryCols(n) {
  state.galleryCols = n;
  write("gc", n);
}
