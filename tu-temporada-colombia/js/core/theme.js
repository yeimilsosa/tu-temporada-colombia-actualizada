/**
 * Tema claro / oscuro.
 * - El tema inicial lo fija un script en el <head> antes de pintar (sin parpadeo):
 *   preferencia guardada → si no hay, prefers-color-scheme del sistema.
 * - setTheme() guarda la elección, anima colores con la clase .theme-anim y avisa
 *   a los suscriptores (la intro 3D cambia de noche a día con su propia transición).
 */
const KEY = "ttc-theme";
const root = document.documentElement;
const listeners = new Set();
const mq = window.matchMedia("(prefers-color-scheme: dark)");

const saved = () => {
  try { const t = localStorage.getItem(KEY); return t === "light" || t === "dark" ? t : null; } catch (e) { return null; }
};

export const getTheme = () => (root.dataset.theme === "dark" ? "dark" : "light");
export const onTheme = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

let animT = 0;
export function setTheme(theme, { persist = true, animate = true } = {}) {
  if (theme !== "light" && theme !== "dark") return;
  if (persist) { try { localStorage.setItem(KEY, theme); } catch (e) { /* sin almacenamiento */ } }
  if (theme === getTheme()) { syncToggles(); return; }
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (animate && !reduce) {
    root.classList.add("theme-anim");
    clearTimeout(animT);
    animT = setTimeout(() => root.classList.remove("theme-anim"), 700);
  }
  root.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#08090B" : "#F7F7F5");
  syncToggles();
  listeners.forEach((fn) => fn(theme));
}

function syncToggles() {
  const dark = getTheme() === "dark";
  document.querySelectorAll("[data-theme-toggle]").forEach((b) => {
    b.setAttribute("aria-pressed", String(dark));
    b.setAttribute("aria-label", dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro");
    b.title = dark ? "Modo claro" : "Modo oscuro";
  });
}

export function initTheme() {
  document.querySelectorAll("[data-theme-toggle]").forEach((b) =>
    b.addEventListener("click", () => setTheme(getTheme() === "dark" ? "light" : "dark"))
  );
  // Si la persona no ha elegido, el sitio sigue al sistema también en vivo
  mq.addEventListener?.("change", (e) => { if (!saved()) setTheme(e.matches ? "dark" : "light", { persist: false }); });
  syncToggles();
}
