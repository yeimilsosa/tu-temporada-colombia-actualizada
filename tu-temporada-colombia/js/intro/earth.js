/**
 * Escena WebGL de la Tierra nocturna.
 *
 * Convención geográfica (coincide con el mapeo UV de THREE.SphereGeometry y con una
 * textura equirectangular cuyo borde izquierdo es la longitud -180°):
 *   x =  cos(lat) · cos(lon)
 *   y =  sin(lat)
 *   z = -cos(lat) · sin(lon)
 * Para dejar un punto (lat, lon) frente a la cámara (eje +Z) se aplica
 *   Rz(roll) · Rx(lat) · Ry(-lon - 90°)
 * La demostración está en el README (sección "Precisión geográfica").
 */
import * as THREE from "../../vendor/three.module.min.js";
import { asset } from "../core/env.js";
import { COLOMBIA_RINGS, REGION_BORDERS } from "../data/geo/borders.js";
import { earthVertex, earthFragment, cloudFragment, atmoVertex, atmoFragment, atmoDayFragment, starVertex, starFragment } from "./shaders.js";

const DEG = Math.PI / 180;

export function latLonToVec3(lat, lon, r = 1, out = new THREE.Vector3()) {
  const la = lat * DEG, lo = lon * DEG;
  return out.set(Math.cos(la) * Math.cos(lo) * r, Math.sin(la) * r, -Math.cos(la) * Math.sin(lo) * r);
}

/** Orientación que coloca (lat, lon) frente a la cámara con un giro (roll) opcional. */
export function orientationFor(lat, lon, roll = 0, out = new THREE.Quaternion()) {
  const qy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -lon * DEG - Math.PI / 2);
  const qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), lat * DEG);
  const qz = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), roll * DEG);
  return out.copy(qz).multiply(qx).multiply(qy);
}

// Límites del mapa de resalte de Colombia (lon/lat en grados)
const MASK_BOUNDS = { lonMin: -82.5, lonMax: -65.5, latMin: -5.5, latMax: 14.5 };
// Parche de alto detalle (relieve 10800 px de Natural Earth + costa 1:10m)
const DETAIL_BOUNDS = { lonMin: -86, lonMax: -60, latMin: -10, latMax: 18 };

export class EarthScene {
  constructor(canvas, { tier = "high" } = {}) {
    this.canvas = canvas;
    this.tier = tier;
    this.maxDpr = tier === "high" ? 2 : tier === "medium" ? 1.6 : 1.25;
    this.dpr = Math.min(window.devicePixelRatio || 1, this.maxDpr);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: tier !== "low",
      alpha: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: new URLSearchParams(location.search).has("shot"),
    });
    renderer.setClearColor(0x08090b, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.setPixelRatio(this.dpr);
    this.renderer = renderer;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.01, 200);
    this.camera.position.set(0, 0, 4);

    this.earth = new THREE.Group(); // gira con la geografía
    this.holder = new THREE.Group(); // desplazamiento de composición
    this.holder.add(this.earth);
    this.scene.add(this.holder);

    // Sol a la derecha y algo detrás: media luna diurna con terminador visible.
    // Luna desde el frente izquierdo: revela continentes y relieve del lado nocturno.
    this.sun = new THREE.Vector3(1.0, 0.18, -0.42).normalize();
    this.moon = new THREE.Vector3(-0.55, 0.35, 0.76).normalize();
    // Tema claro: luz de día desde el frente-izquierda (hemisferio visible iluminado)
    this.dayLight = new THREE.Vector3(-0.5, 0.36, 0.8).normalize();
    this._bgNight = new THREE.Color(0x08090b);
    this._bgDay = new THREE.Color(0xf7f7f5);
    this._bg = new THREE.Color();
    this._lineNight = new THREE.Color(0xffffff);
    this._lineDay = new THREE.Color(0xffffff);
    this._regionNight = new THREE.Color(0xd5d7da);
    this._regionDay = new THREE.Color(0xffffff);
    this._tmpV = new THREE.Vector3();
    this._tmpN = new THREE.Vector3();
    this._contextLost = false;
    canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); this._contextLost = true; this.onContextLost?.(); });
  }

  async load() {
    const t = this.tier === "high" ? "4k" : "2k";
    const loader = new THREE.TextureLoader();
    const aniso = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    const load = (name, srgb = false) =>
      new Promise((res, rej) =>
        loader.load(asset(`assets/textures/${name}`), (tex) => {
          tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
          tex.anisotropy = aniso;
          tex.minFilter = THREE.LinearMipmapLinearFilter;
          res(tex);
        }, undefined, rej)
      );
    const [lights, day, data, glow, detail] = await Promise.all([
      load(`earth-lights-${t}.png`, true),
      load(`earth-bm-${t}.jpg`, true),
      load("earth-data-2k.jpg"),
      load("earth-glow-2k.png", true),
      load("colombia-detail.jpg"),
    ]);
    detail.wrapS = detail.wrapT = THREE.ClampToEdgeWrapping;
    this.textures = { lights, day, data, glow, detail };
    this._build();
    this.resize();
  }

  _build() {
    const seg = this.tier === "high" ? 192 : this.tier === "medium" ? 128 : 96;
    const { lights, day, data, glow, detail } = this.textures;
    const mask = this._makeColombiaMask();

    this.uniforms = {
      uLights: { value: lights },
      uGlow: { value: glow },
      uDay: { value: day },
      uData: { value: data },
      uDetail: { value: detail },
      uDetailBounds: { value: new THREE.Vector4(DETAIL_BOUNDS.lonMin, DETAIL_BOUNDS.lonMax, DETAIL_BOUNDS.latMin, DETAIL_BOUNDS.latMax) },
      uMask: { value: mask },
      uMaskBounds: { value: new THREE.Vector4(MASK_BOUNDS.lonMin, MASK_BOUNDS.lonMax, MASK_BOUNDS.latMin, MASK_BOUNDS.latMax) },
      uTexSize: { value: new THREE.Vector2(lights.image.width, lights.image.height) },
      uSun: { value: this.sun },
      uMoon: { value: this.moon },
      uSunI: { value: 3.2 },
      uMoonI: { value: 0.11 },
      uDataSize: { value: new THREE.Vector2(data.image.width, data.image.height) },
      uDetailSize: { value: new THREE.Vector2(detail.image.width, detail.image.height) },
      uReveal: { value: 0 },
      uLightGain: { value: 1 },
      uLod: { value: 0 },
      uMaskA: { value: 0 },
      uCloudShift: { value: 0 },
      uDayMode: { value: 0 },
      uDayLight: { value: this.dayLight },
    };

    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(1, seg, seg / 2),
      new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: earthVertex, fragmentShader: earthFragment })
    );
    this.earth.add(globe);

    // Nubes: misma textura de datos (canal B), capa ligeramente elevada
    this.cloudUniforms = {
      uData: { value: data },
      uSun: { value: this.sun },
      uMoon: { value: this.moon },
      uSunI: this.uniforms.uSunI,
      uMoonI: this.uniforms.uMoonI,
      uDayMode: this.uniforms.uDayMode,
      uDayLight: { value: this.dayLight },
      uShift: { value: 0 },
      uOpacity: { value: 1 },
      uReveal: this.uniforms.uReveal,
    };
    const clouds = new THREE.Mesh(
      new THREE.SphereGeometry(1.004, seg, seg / 2),
      new THREE.ShaderMaterial({
        uniforms: this.cloudUniforms,
        vertexShader: earthVertex,
        fragmentShader: cloudFragment,
        transparent: true,
        depthWrite: false,
      })
    );
    this.earth.add(clouds);
    this.clouds = clouds;

    // Atmósfera: esfera exterior en cara trasera con dispersión calculada por rayo
    this.atmoUniforms = {
      uSun: { value: this.sun },
      uCenter: { value: new THREE.Vector3() },
      uSunI: this.uniforms.uSunI,
      uReveal: this.uniforms.uReveal,
      uGain: { value: 1 },
    };
    const atmo = new THREE.Mesh(
      new THREE.SphereGeometry(1.07, 128, 64),
      new THREE.ShaderMaterial({
        uniforms: this.atmoUniforms,
        vertexShader: atmoVertex,
        fragmentShader: atmoFragment,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      })
    );
    this.holder.add(atmo);
    this.atmoDayUniforms = { uCenter: this.atmoUniforms.uCenter, uReveal: this.uniforms.uReveal, uGain: { value: 0 } };
    const atmoDay = new THREE.Mesh(
      atmo.geometry,
      new THREE.ShaderMaterial({
        uniforms: this.atmoDayUniforms,
        vertexShader: atmoVertex,
        fragmentShader: atmoDayFragment,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      })
    );
    this.holder.add(atmoDay);

    // Fronteras (Natural Earth): Colombia destacada y contexto regional tenue
    this.colombiaLine = this._lines(COLOMBIA_RINGS, 1.0016, 0xffffff);
    this.regionLine = this._lines(REGION_BORDERS, 1.0014, 0xd5d7da);
    this.earth.add(this.regionLine, this.colombiaLine);

    // Estrellas discretas
    const count = this.tier === "high" ? 2400 : this.tier === "medium" ? 1500 : 900;
    const pos = new Float32Array(count * 3), size = new Float32Array(count), bright = new Float32Array(count);
    const v = new THREE.Vector3();
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < count; i++) {
      v.set(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1).normalize().multiplyScalar(90);
      pos.set([v.x, v.y, v.z], i * 3);
      const r = rnd();
      size[i] = 0.6 + Math.pow(r, 6) * 2.4;
      bright[i] = 0.18 + Math.pow(rnd(), 3) * 0.82;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    sg.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    sg.setAttribute("aBright", new THREE.BufferAttribute(bright, 1));
    this.starUniforms = { uPR: { value: this.dpr }, uReveal: { value: 0 }, uTime: { value: 0 } };
    this.stars = new THREE.Points(
      sg,
      new THREE.ShaderMaterial({
        uniforms: this.starUniforms,
        vertexShader: starVertex,
        fragmentShader: starFragment,
        toneMapped: false,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    this.scene.add(this.stars);
  }

  _lines(rings, r, color) {
    const pts = [];
    const a = new THREE.Vector3(), b = new THREE.Vector3();
    for (const ring of rings) {
      for (let i = 0; i < ring.length - 1; i++) {
        const [lo0, la0] = ring[i], [lo1, la1] = ring[i + 1];
        // densifica tramos largos para que sigan la curvatura de la esfera
        const steps = Math.max(1, Math.ceil(Math.hypot(lo1 - lo0, la1 - la0) / 0.35));
        for (let s = 0; s < steps; s++) {
          const t0 = s / steps, t1 = (s + 1) / steps;
          latLonToVec3(la0 + (la1 - la0) * t0, lo0 + (lo1 - lo0) * t0, r, a);
          latLonToVec3(la0 + (la1 - la0) * t1, lo0 + (lo1 - lo0) * t1, r, b);
          pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    const m = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    const l = new THREE.LineSegments(g, m);
    l.renderOrder = 2;
    return l;
  }

  _makeColombiaMask() {
    const W = 512, H = 600, c = document.createElement("canvas");
    c.width = W; c.height = H;
    const g = c.getContext("2d");
    const { lonMin, lonMax, latMin, latMax } = MASK_BOUNDS;
    g.filter = "blur(2px)";
    g.fillStyle = "#fff";
    g.beginPath();
    for (const ring of COLOMBIA_RINGS) {
      ring.forEach(([lo, la], i) => {
        const x = ((lo - lonMin) / (lonMax - lonMin)) * W;
        const y = ((latMax - la) / (latMax - latMin)) * H;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      });
      g.closePath();
    }
    g.fill();
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.NoColorSpace;
    return tex;
  }

  /** Distancias de cámara calculadas para el tamaño de pantalla actual. */
  framing() {
    const aspect = this.width / this.height;
    const halfV = (this.camera.fov / 2) * DEG;
    const tanV = Math.tan(halfV), tanH = tanV * aspect;
    const halfH = Math.atan(tanH);
    const portrait = aspect < 0.9;
    // Escena 1: el planeta ocupa una parte importante sin recortarse
    const k = portrait ? 0.84 : 0.66;
    const far = 1 / Math.sin(k * Math.min(halfV, halfH));
    // Escena 3: Colombia (≈17° de alto, ≈12.5° de ancho) ocupa ~50% del alto o ~70% del ancho
    const h = Math.max(0.295 / (0.5 * 2 * tanV), 0.218 / (0.7 * 2 * tanH));
    return { far, near: 1 + h, end: 1 + h * 0.74, portrait, aspect };
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.width = w; this.height = h;
    this.camera.fov = w / h < 0.9 ? 34 : 30;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    if (this.starUniforms) this.starUniforms.uPR.value = this.renderer.getPixelRatio();
  }

  /** Reduce la resolución interna si el dispositivo no sostiene la tasa de cuadros. */
  degrade() {
    const next = Math.max(1, this.renderer.getPixelRatio() - 0.35);
    if (next === this.renderer.getPixelRatio()) return false;
    this.renderer.setPixelRatio(next);
    this.resize();
    return true;
  }

  /**
   * Aplica el estado de la cámara y del planeta.
   * s = { lat, lon, roll, dist, offX, offY, reveal, lod, borders, cloudShift, cloudOpacity, starSpin, time }
   */
  setState(s) {
    if (!this.uniforms) return;
    orientationFor(s.lat, s.lon, s.roll, this.earth.quaternion);
    this.holder.position.set(s.offX, s.offY, 0);
    this.camera.position.set(0, 0, s.dist);
    this.camera.lookAt(0, 0, 0);
    this.uniforms.uReveal.value = s.reveal;
    this.uniforms.uLod.value = s.lod;
    this.uniforms.uMaskA.value = s.borders;
    this.uniforms.uLightGain.value = s.lightGain ?? 1;
    this.uniforms.uMoonI.value = 0.11 * (1 + 2.6 * s.lod); // más luz de luna de cerca: se lee el relieve
    this.cloudUniforms.uShift.value = s.cloudShift;
    this.uniforms.uCloudShift.value = s.cloudShift;
    this.cloudUniforms.uOpacity.value = s.cloudOpacity;
    this.atmoUniforms.uCenter.value.copy(this.holder.position);
    this.colombiaLine.material.opacity = (0.7 + 0.2 * (s.day ?? 0)) * s.borders;
    this.regionLine.material.opacity = (0.14 + 0.2 * (s.day ?? 0)) * s.borders;
    this.colombiaLine.visible = s.borders > 0.001;
    this.regionLine.visible = s.borders > 0.001;
    this.stars.rotation.y = s.starSpin;
    // Tema: noche ↔ día (fondo, estrellas, halo, líneas y exposición)
    const day = s.day ?? 0;
    this.uniforms.uDayMode.value = day;
    this.starUniforms.uReveal.value = s.reveal * (1 - day);
    this.atmoUniforms.uGain.value = 1 - day;
    this.atmoDayUniforms.uGain.value = day;
    this._bg.copy(this._bgNight).lerp(this._bgDay, day);
    this.renderer.setClearColor(this._bg, 1);
    this.renderer.toneMappingExposure = 1 + day * 0.06;
    this.colombiaLine.material.color.copy(this._lineNight).lerp(this._lineDay, day);
    this.regionLine.material.color.copy(this._regionNight).lerp(this._regionDay, day);
    this.starUniforms.uTime.value = s.time;
  }

  render() {
    if (this._contextLost || !this.uniforms) return;
    this.renderer.render(this.scene, this.camera);
  }

  /** Proyecta una coordenada geográfica a píxeles de pantalla. */
  project(lat, lon) {
    const p = latLonToVec3(lat, lon, 1.0, this._tmpV);
    this.earth.updateMatrixWorld(true);
    p.applyMatrix4(this.earth.matrixWorld);
    const n = this._tmpN.copy(p).sub(this.holder.position).normalize();
    const toCam = this.camera.position.clone().sub(p).normalize();
    const facing = n.dot(toCam);
    p.project(this.camera);
    return { x: (p.x * 0.5 + 0.5) * this.width, y: (-p.y * 0.5 + 0.5) * this.height, facing };
  }

  dispose() {
    this.scene.traverse((o) => {
      o.geometry?.dispose();
      o.material?.dispose();
    });
    Object.values(this.textures || {}).forEach((t) => t.dispose());
    this.renderer.dispose();
  }
}
