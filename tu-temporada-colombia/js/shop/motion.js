/**
 * Movimiento del marketplace: discreto y al servicio del catálogo.
 *  - aparición sutil de las tarjetas al entrar en pantalla (una sola vez)
 *  - fundido corto al cambiar de categoría, filtro u orden
 * Con prefers-reduced-motion no se anima nada.
 */
import { prefersReducedMotion } from "../core/env.js";

let io = null;
const g = () => (prefersReducedMotion() ? null : window.gsap);

/** Aparición de tarjetas al hacer scroll. */
export function observe(scope) {
  const gs = g();
  io?.disconnect();
  if (!gs) return;
  // Las tarjetas del primer pantallazo ya se ven al abrirse la máscara: no se ocultan.
  const base = scope.getBoundingClientRect().top;
  const cards = [...scope.querySelectorAll("[data-card]")].filter((c) => c.getBoundingClientRect().top - base > window.innerHeight * 0.9);
  gs.set(cards, { opacity: 0, y: 12 });
  let batch = 0, t = 0;
  io = new IntersectionObserver((entries) => {
    const now = performance.now();
    if (now - t > 120) batch = 0;
    t = now;
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      gs.to(e.target, { opacity: 1, y: 0, duration: 0.7, ease: "power2.out", delay: Math.min(batch++, 6) * 0.05, clearProps: "opacity,transform" });
    });
  }, { rootMargin: "0px 0px -6% 0px", threshold: 0.01 });
  cards.forEach((c) => io.observe(c));
}

/** Sustituye la cuadrícula con un fundido corto, sin saltos de altura. */
export function swap(box, html, after) {
  const gs = g();
  if (!gs || !box.firstElementChild) {
    box.innerHTML = html;
    after?.();
    return;
  }
  box.style.minHeight = box.offsetHeight + "px";
  gs.to(box, {
    opacity: 0, duration: 0.16, ease: "power1.in",
    onComplete() {
      box.innerHTML = html;
      after?.();
      gs.fromTo(box, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power1.out" });
      gs.fromTo(box.querySelectorAll("[data-card]"), { y: 8 }, { y: 0, duration: 0.45, ease: "power2.out", stagger: 0.015, clearProps: "transform" });
      requestAnimationFrame(() => { box.style.minHeight = ""; });
    },
  });
}

/** Transición corta entre vistas. */
export function enterView(el) {
  const gs = g();
  if (!gs) return;
  gs.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: "power2.out", clearProps: "opacity" });
}
