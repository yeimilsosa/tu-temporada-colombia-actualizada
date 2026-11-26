/**
 * Recorrido por scroll: Tierra nocturna → Sudamérica → Colombia → tienda.
 * El progreso (0..1) sale de la posición de scroll del contenedor #journey (ScrollTrigger),
 * se suaviza por cuadro y se traduce en estado de cámara + variables CSS para los textos.
 * Avanza al bajar, retrocede al subir y se mantiene quieto cuando el usuario se detiene.
 */
import {
  asset, clamp, lerp, range, smooth, easeInOutCubic, easeOutCubic, easeOutQuart, easeInOutSine,
  prefersReducedMotion, hasWebGL, qualityTier,
} from "../core/env.js";
import { getTheme, onTheme } from "../core/theme.js";

const TARGET = { lat: 4.4, lon: -73.6 }; // centro visual del territorio colombiano
const BOGOTA = { lat: 4.711, lon: -74.072 }; // ubicación del pin
const START = { lat: 14, lon: 16, roll: 23.4 }; // África y Europa de noche, eje inclinado
const SPIN = 2.4; // grados por segundo de rotación libre (lenta)
const ACTIVE = 0.0015; // progreso a partir del cual el scroll toma el control

const mod = (a, n) => ((a % n) + n) % n;
const fmtCoord = (v, pos, neg) => `${Math.abs(v).toFixed(2).replace(".", ",")}° ${v >= 0 ? pos : neg}`;

export function createJourney(root, { onProgress, onLayout, onPlate } = {}) {
  const $ = (s) => root.querySelector(s);
  const stage = $(".journey__stage");
  const canvas = $(".journey__canvas");
  const pin = $(".journey__pin");
  const readLat = $("[data-read-lat]");
  const readLon = $("[data-read-lon]");
  const style = root.style;

  const reduced = prefersReducedMotion();
  const webgl = hasWebGL();
  root.classList.toggle("is-reduced", reduced);
  root.classList.toggle("no-webgl", !webgl);

  // Modo captura (?shot=0..1) para generar las imágenes de respaldo
  const shotParam = new URLSearchParams(location.search).get("shot");
  const shot = shotParam !== null ? parseFloat(shotParam) : null;

  let scene = null;
  let target = 0, p = 0, last = performance.now(), time = 0;
  let running = false, raf = 0, visible = true, active = true, dirty = true;
  let reveal = 0, lightIn = 0, idleRamp = 0;
  let anchorLon = START.lon, R = 0;
  // Tema: 0 = noche (oscuro), 1 = día (claro). Se interpola para un cambio suave.
  let day = getTheme() === "light" ? 1 : 0;
  let frames = 0, frameAcc = 0, degrades = 0;
  let lastReadout = "";
  let st = null;

  // Final del recorrido: el marketplace (ya en su sitio) se revela con la máscara circular.
  let overlap = 0;
  function layout() {
    // El marketplace ocupa la última pantalla de la intro: se superpone una pantalla completa.
    overlap = Math.round(stage.clientHeight || window.innerHeight);
  }

  const recomputeR = () => {
    R = mod(anchorLon - TARGET.lon, 360);
    if (R < 70) R += 360;
  };
  recomputeR();

  /* ---------- progreso desde el scroll ---------- */
  function measure() {
    const r = root.getBoundingClientRect();
    const max = Math.max(1, root.offsetHeight - window.innerHeight);
    return clamp(-r.top / max);
  }
  const gsap = window.gsap, ST = window.ScrollTrigger;
  if (gsap && ST) {
    gsap.registerPlugin(ST);
    st = ST.create({
      trigger: root,
      start: "top top",
      end: "bottom bottom",
      // ScrollTrigger detecta el desplazamiento; el progreso se mide en vivo sobre el contenedor
      // para que siempre coincida con su altura real (cambia con el modo reducido y en móvil).
      onUpdate: () => { target = measure(); wake(); },
      onRefresh: () => { target = measure(); },
    });
  }
  window.addEventListener("scroll", () => { target = measure(); wake(); }, { passive: true });
  target = p = measure();
  if (shot !== null) target = p = shot;

  /* ---------- escena WebGL ---------- */
  async function initScene() {
    if (!webgl) return startFallback();
    try {
      const { EarthScene } = await import("./earth.js");
      scene = new EarthScene(canvas, { tier: qualityTier() });
      scene.onContextLost = () => startFallback();
      await scene.load();
      root.classList.add("is-ready");
      dirty = true;
      if (shot !== null) { reveal = lightIn = 1; }
      else if (reduced) { reveal = lightIn = 1; }
      else if (gsap) {
        const o = { r: 0, l: 0 };
        gsap.to(o, { r: 1, duration: 2.6, ease: "power2.out", onUpdate: () => { reveal = o.r; dirty = true; } });
        gsap.to(o, { l: 1, duration: 2.8, delay: 0.7, ease: "power1.inOut", onUpdate: () => { lightIn = o.l; } });
      } else { reveal = lightIn = 1; }
      wake();
    } catch (err) {
      console.warn("[Tu Temporada] La escena 3D no pudo iniciar; se usa la versión estática.", err);
      startFallback();
    }
  }

  function startFallback() {
    root.classList.add("no-webgl", "is-ready");
    const fb = $(".journey__fallback");
    if (fb && !fb.childElementCount) {
      fb.innerHTML = ["dark", "light"].map((t) => {
        const sfx = t === "light" ? "-light" : "";
        return `<img class="fb-far" data-for-theme="${t}" src="${asset(`assets/img/fallback/earth-far${sfx}.webp`)}" alt="" decoding="async">
        <img class="fb-near" data-for-theme="${t}" src="${asset(`assets/img/fallback/earth-near${sfx}.webp`)}" alt="" decoding="async">`;
      }).join("");
    }
    scene?.dispose?.();
    scene = null;
    dirty = true;
    wake();
  }

  /* ---------- traducción progreso → estado ---------- */
  const fbFrame = new URLSearchParams(location.search).get("frame"); // "far" | "near": encuadres del respaldo estático
  function cameraState(pc, dt) {
    const f = scene.framing();
    if (fbFrame) {
      const near = fbFrame === "near";
      return {
        lat: near ? BOGOTA.lat : TARGET.lat - 6, lon: near ? BOGOTA.lon : TARGET.lon, roll: near ? 0 : 8,
        dist: near ? f.near : f.far * 0.94, offX: 0, offY: 0, lod: near ? 1 : 0, borders: near ? 1 : 0,
        cloudShift: 0, cloudOpacity: near ? 0.32 : 1, starSpin: 0, time: 0, reveal: 1, lightGain: 1, day,
      };
    }
    if (reduced) {
      return {
        lat: TARGET.lat, lon: TARGET.lon, roll: 0,
        dist: Math.exp(lerp(Math.log(f.far), Math.log(f.near), 0.42)),
        offX: 0, offY: 0, lod: 0.5, borders: 1, cloudShift: 0, cloudOpacity: 0.5,
        starSpin: 0, time: 0, reveal, lightGain: 1.15, day,
      };
    }
    const rotE = easeInOutCubic(range(pc, 0.03, 0.42));
    const zoomE = easeOutQuart(smooth(range(pc, 0.26, 0.7)));
    const push = easeInOutSine(range(pc, 0.7, 0.9));

    // Longitud central: rotación libre al inicio y giro determinista hacia Colombia con el scroll
    if (pc < ACTIVE) {
      anchorLon -= SPIN * dt * idleRamp;
      recomputeR();
    }
    // Con el scroll al mando la posición depende solo del progreso: se mantiene quieta al detenerse.
    const lon = TARGET.lon + R * (1 - rotE);
    if (pc < ACTIVE) anchorLon = lon;

    const comp = 1 - smooth(range(pc, 0.16, 0.62));
    const offX = f.portrait ? 0 : 0.62 * comp * (f.far / 3.4);
    const offY = f.portrait ? 0.3 * comp * (f.far / 3.4) : 0.1 * comp * (f.far / 3.4);
    const dist = Math.exp(lerp(Math.log(f.far), Math.log(f.near), zoomE) + (Math.log(f.end) - Math.log(f.near)) * push);
    const lod = smooth(range(pc, 0.4, 0.68));
    return {
      lat: lerp(START.lat, TARGET.lat, rotE),
      lon,
      roll: lerp(START.roll, 0, easeInOutCubic(range(pc, 0.03, 0.55))),
      dist, offX, offY, lod,
      borders: smooth(range(pc, 0.48, 0.66)),
      cloudShift: time * 0.0016,
      cloudOpacity: lerp(1, 0.32, smooth(range(pc, 0.32, 0.66))),
      starSpin: lon * 0.0016,
      time,
      reveal,
      lightGain: lightIn,
      day,
    };
  }

  function domState(pc, pinPos, camLat, camLon) {
    const set = (k, v) => style.setProperty(k, v);
    const W = stage.clientWidth, H = stage.clientHeight;
    const maxR = Math.hypot(W, H) * 1.05;
    let introA, pinA, arrIn, arrOut, shade, plateE, plateIn, chrome;

    if (reduced) {
      introA = 1 - smooth(range(pc, 0.05, 0.15));
      arrIn = smooth(range(pc, 0.18, 0.28));
      arrOut = smooth(range(pc, 0.5, 0.56));
      pinA = arrIn * (1 - arrOut);
      shade = smooth(range(pc, 0.55, 0.62)) * 0.5;
      plateIn = smooth(range(pc, 0.6, 0.7));
      plateE = plateIn;
      chrome = 1 - smooth(range(pc, 0.56, 0.64));
    } else {
      // La máscara circular revela el marketplace completo, ya en su posición final.
      introA = 1 - smooth(range(pc, 0.035, 0.14));
      pinA = smooth(range(pc, 0.56, 0.62)) * (1 - smooth(range(pc, 0.8, 0.84)));
      arrIn = smooth(range(pc, 0.6, 0.67));
      arrOut = smooth(range(pc, 0.78, 0.83));
      shade = smooth(range(pc, 0.79, 0.9)) * 0.62;
      plateE = easeInOutCubic(range(pc, 0.85, 0.97));
      plateIn = plateE;
      chrome = 1 - smooth(range(pc, 0.81, 0.86));
    }

    set("--progress", pc.toFixed(4));
    set("--intro-a", introA.toFixed(3));
    set("--intro-y", `${(-36 * (1 - introA)).toFixed(1)}px`);
    set("--chrome", chrome.toFixed(3));
    set("--arr-a", (arrIn * (1 - arrOut)).toFixed(3));
    set("--arr-y", `${((1 - arrIn) * 24 - arrOut * 18).toFixed(1)}px`);
    set("--shade", shade.toFixed(3));

    // Pin anclado a Bogotá (proyección real de la coordenada)
    const px = pinPos ? pinPos.x : W / 2;
    const py = pinPos ? pinPos.y : H / 2;
    const facing = pinPos ? smooth(range(pinPos.facing, 0.15, 0.35)) : 1;
    set("--pin-x", `${px.toFixed(1)}px`);
    set("--pin-y", `${py.toFixed(1)}px`);
    set("--pin-a", (pinA * facing).toFixed(3));
    set("--pin-s", (0.4 + 0.6 * easeOutCubic(range(pc, reduced ? 0.18 : 0.56, reduced ? 0.28 : 0.645))).toFixed(3));
    set("--stem", `${(46 * easeOutCubic(range(pc, reduced ? 0.2 : 0.585, reduced ? 0.3 : 0.665))).toFixed(1)}px`);
    set("--pin-label", smooth(range(pc, reduced ? 0.22 : 0.635, reduced ? 0.32 : 0.69)).toFixed(3));

    // Placa blanca: máscara circular que nace en el pin
    set("--plate-x", `${px.toFixed(1)}px`);
    set("--plate-y", `${py.toFixed(1)}px`);
    set("--plate-r", `${(plateE * maxR).toFixed(1)}px`);
    set("--plate-vis", "hidden"); // el propio marketplace hace de placa
    set("--plate-in", plateIn.toFixed(3));
    onPlate?.({ x: px, y: py, r: reduced ? maxR : plateE * maxR, full: plateE >= 1, opacity: reduced ? plateIn : 1 });

    // Lectura de coordenadas del centro de la vista
    if (readLat) {
      const txt = fmtCoord(camLat, "N", "S") + "|" + fmtCoord(((camLon + 540) % 360) - 180, "E", "O");
      if (txt !== lastReadout) {
        lastReadout = txt;
        const [a, b] = txt.split("|");
        readLat.textContent = a;
        readLon.textContent = b;
      }
    }

    // Respaldo estático
    if (!scene) {
      const zoomE = easeOutQuart(smooth(range(pc, 0.26, 0.7)));
      set("--fb-scale", lerp(1, 1.6, zoomE).toFixed(3));
      set("--fb-near", smooth(range(pc, 0.46, 0.66)).toFixed(3));
    }
    onProgress?.(pc, reduced ? pc > 0.68 : pc > 0.95);
    return plateE >= 1;
  }

  /* ---------- bucle ---------- */
  function frame(now) {
    raf = 0;
    const raw = (now - last) / 1000;
    const dt = Math.min(0.05, raw);
    last = now;
    time += dt;
    idleRamp = Math.min(1, idleRamp + dt / 3.2);

    const prev = p;
    // Suavizado independiente de la tasa de cuadros (equipos lentos no se quedan atrás)
    const k = reduced ? 1 : 1 - Math.exp(-Math.min(0.25, raw) * 7.5);
    p += (target - p) * k;
    if (Math.abs(target - p) < 0.00005) p = target;
    if (shot !== null) p = shot;
    const moving = p !== prev || dirty;
    dirty = false;

    let pinPos = null, camLat = START.lat, camLon = anchorLon, covered = false;
    if (scene) {
      const s = cameraState(p, dt);
      camLat = s.lat; camLon = s.lon;
      scene.setState(s);
      pinPos = scene.project(BOGOTA.lat, BOGOTA.lon);
      covered = domState(p, pinPos, camLat, camLon);
      if (!covered) scene.render();
      // control de rendimiento
      if (!reduced && p < 0.5) {
        frames++; frameAcc += dt;
        if (frames >= 90) {
          if (frameAcc / frames > 0.027 && degrades < 2 && scene.degrade()) degrades++;
          frames = 0; frameAcc = 0;
        }
      }
    } else {
      covered = domState(p, null, TARGET.lat, TARGET.lon);
    }

    // ¿Seguir animando? La rotación libre y las nubes requieren cuadros continuos;
    // con movimiento reducido o con la placa cubriendo todo, se pausa.
    const needsLoop = active && visible && !document.hidden && (moving || (!reduced && !covered && scene));
    if (needsLoop) raf = requestAnimationFrame(frame);
    else running = false;
  }

  function wake() {
    if (running || !active) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) { dirty = true; wake(); } }, { threshold: 0 });
  io.observe(root);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { last = performance.now(); wake(); } });

  let rz = 0;
  window.addEventListener("resize", () => {
    cancelAnimationFrame(rz);
    rz = requestAnimationFrame(() => { layout(); onLayout?.(overlap); scene?.resize(); dirty = true; wake(); });
  });

  $(".journey__skip")?.addEventListener("click", () => skip());

  // Cambio de tema: la Tierra pasa de noche a día (o al revés) con una transición propia
  let dayTween = null;
  onTheme((t) => {
    const to = t === "light" ? 1 : 0;
    dayTween?.kill?.();
    if (reduced || !gsap) { day = to; dirty = true; wake(); return; }
    const o = { v: day };
    dayTween = gsap.to(o, { v: to, duration: 1.4, ease: "power2.inOut", onUpdate: () => { day = o.v; dirty = true; wake(); } });
  });

  function skip() {
    const top = root.offsetTop + root.offsetHeight - window.innerHeight + 1;
    window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
  }

  layout();
  document.fonts?.ready.then(() => { layout(); onLayout?.(overlap); dirty = true; wake(); });
  initScene();
  domState(p, null, START.lat, START.lon);

  return {
    /** Activa o pausa el recorrido (al navegar fuera de la portada). */
    setActive(on) {
      active = on;
      if (on) { layout(); onLayout?.(overlap); st?.refresh?.(); target = p = measure(); dirty = true; wake(); }
      else { cancelAnimationFrame(raf); running = false; }
    },
    progress: () => p,
    /** Salta al progreso actual sin interpolar (al aterrizar desde otra vista). */
    snap() { target = p = measure(); dirty = true; wake(); },
    skip,
    refresh() { layout(); onLayout?.(overlap); st?.refresh?.(); target = measure(); dirty = true; wake(); },
    overlap: () => overlap,
  };
}
