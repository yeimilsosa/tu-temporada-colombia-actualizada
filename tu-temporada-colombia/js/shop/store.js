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

const listeners = new Set();
export const state = {
  saved: read("fav", []),
  recent: read("rec", []),
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
