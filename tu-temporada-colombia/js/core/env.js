/**
 * Utilidades de entorno: rutas de recursos, capacidades del dispositivo y matemáticas pequeñas.
 */

/**
 * Resuelve la ruta de un recurso. En el build autónomo (dist/) los recursos viajan
 * embebidos en window.__TTC_INLINE__; en desarrollo se usan los archivos de /assets.
 */
export function asset(path) {
  const inline = window.__TTC_INLINE__;
  if (!inline) return path;
  if (inline[path]) return inline[path];
  // Variantes con fallback: versión "-sm" de tarjeta → imagen completa; 4k → 2k.
  const alt = path.replace("-sm.webp", ".webp");
  return inline[alt] || inline[alt.replace("-4k.", "-2k.")] || inline[alt.replace("-2k.", "-4k.")] || path;
}

export const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function hasWebGL() {
  if (new URLSearchParams(location.search).has("nowebgl")) return false;
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    if (!gl) return false;
    const lose = gl.getExtension("WEBGL_lose_context");
    if (lose) lose.loseContext();
    return true;
  } catch (e) {
    return false;
  }
}

/** Nivel de calidad gráfica: "high" | "medium" | "low". */
export function qualityTier() {
  const q = new URLSearchParams(location.search).get("quality");
  if (q === "high" || q === "medium" || q === "low") return q;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const small = Math.min(screen.width, screen.height) < 820;
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 4;
  if (cores <= 2 || mem <= 2) return "low";
  if (coarse || small || cores <= 4 || mem <= 4) return "medium";
  return "high";
}

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
/** Normaliza t dentro del tramo [a, b] y lo limita a 0..1. */
export const range = (t, a, b) => clamp((t - a) / (b - a));
export const smooth = (t) => t * t * (3 - 2 * t);
export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);
export const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
