/**
 * Shaders GLSL de la Tierra (radiancia lineal HDR → tone mapping ACES de three.js).
 *
 * Texturas:
 *   uDay     NASA Blue Marble Next Generation (topografía + batimetría), sRGB
 *   uLights  luces nocturnas (Black Marble vía Solar System Scope), sRGB
 *   uGlow    luces difuminadas para una dispersión mínima, sRGB
 *   uData    R relieve (Natural Earth), G tierra/agua, B nubes NASA — lineal
 *   uDetail  parche de Colombia: R relieve a 30 px/grado, G costa nítida — lineal
 */

export const earthVertex = /* glsl */ `
varying vec2 vUv;
varying vec3 vN;
varying vec3 vP;
varying vec3 vObj;
varying vec3 vEast;
varying vec3 vNorth;
void main() {
  vUv = uv;
  vObj = position;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vP = wp.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  // Marco tangente analítico de la esfera (este / norte) para el relieve
  vec3 o = normalize(position);
  float lat = asin(clamp(o.y, -1.0, 1.0));
  float lon = atan(-o.z, o.x);
  vec3 e = vec3(-sin(lon), 0.0, -cos(lon));
  vec3 n = vec3(-sin(lat) * cos(lon), cos(lat), sin(lat) * sin(lon));
  vEast = mat3(modelMatrix) * e;
  vNorth = mat3(modelMatrix) * n;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const common = /* glsl */ `
vec3 latLonOf(vec3 o) {
  o = normalize(o);
  return vec3(degrees(asin(clamp(o.y, -1.0, 1.0))), degrees(atan(-o.z, o.x)), 0.0);
}
// Coordenadas dentro de un rectángulo geográfico (lonMin, lonMax, latMin, latMax)
vec2 boundsUv(vec3 ll, vec4 b) {
  return vec2((ll.y - b.x) / (b.y - b.x), (ll.x - b.z) / (b.w - b.z));
}
float boundsFade(vec2 m) {
  vec2 e = smoothstep(vec2(0.0), vec2(0.08), m) * smoothstep(vec2(0.0), vec2(0.08), 1.0 - m);
  return e.x * e.y;
}
`;

export const earthFragment = /* glsl */ `
uniform sampler2D uDay;
uniform sampler2D uLights;
uniform sampler2D uGlow;
uniform sampler2D uData;
uniform sampler2D uDetail;
uniform sampler2D uMask;
uniform vec4 uDetailBounds;
uniform vec4 uMaskBounds;
uniform vec2 uTexSize;
uniform vec3 uSun;
uniform vec3 uMoon;
uniform float uSunI;
uniform float uMoonI;
uniform float uReveal;
uniform float uLightGain;
uniform float uLod;
uniform float uMaskA;
uniform float uCloudShift;
uniform float uDayMode;   // 0 = noche (tema oscuro), 1 = día (tema claro)
uniform vec3 uDayLight;   // luz del día: frente-izquierda, ilumina el hemisferio visible
varying vec2 vUv;
varying vec3 vN;
varying vec3 vP;
varying vec3 vObj;
varying vec3 vEast;
varying vec3 vNorth;
uniform vec2 uDataSize;
uniform vec2 uDetailSize;
${common}

// Filtrado bicúbico (4 muestras bilineales) para las luces durante el acercamiento
vec4 cubicW(float v) {
  vec4 n = vec4(1.0, 2.0, 3.0, 4.0) - v;
  vec4 s = n * n * n;
  float x = s.x, y = s.y - 4.0 * s.x, z = s.z - 4.0 * s.y + 6.0 * s.x;
  return vec4(x, y, z, 6.0 - x - y - z) * (1.0 / 6.0);
}
vec4 textureBicubic(sampler2D tex, vec2 uv, vec2 size) {
  vec2 inv = 1.0 / size;
  uv = uv * size - 0.5;
  vec2 f = fract(uv);
  uv -= f;
  vec4 xc = cubicW(f.x), yc = cubicW(f.y);
  vec4 c = uv.xxyy + vec2(-0.5, 1.5).xyxy;
  vec4 s = vec4(xc.xz + xc.yw, yc.xz + yc.yw);
  vec4 off = (c + vec4(xc.yw, yc.yw) / s) * inv.xxyy;
  vec4 s0 = textureLod(tex, off.xz, 0.0), s1 = textureLod(tex, off.yz, 0.0);
  vec4 s2 = textureLod(tex, off.xw, 0.0), s3 = textureLod(tex, off.yw, 0.0);
  float sx = s.x / (s.x + s.y), sy = s.z / (s.z + s.w);
  return mix(mix(s3, s2, sx), mix(s1, s0, sx), sy);
}

// Gradiente del relieve por diferencias centrales en el espacio de la textura
vec2 grad(sampler2D t, vec2 uv, vec2 size) {
  vec2 e = 1.0 / size;
  float hx = texture2D(t, uv + vec2(e.x, 0.0)).r - texture2D(t, uv - vec2(e.x, 0.0)).r;
  float hy = texture2D(t, uv + vec2(0.0, e.y)).r - texture2D(t, uv - vec2(0.0, e.y)).r;
  return vec2(hx, hy);
}

void main() {
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vP);
  vec3 L = normalize(uSun);
  vec3 M = normalize(uMoon);

  vec3 data = texture2D(uData, vUv).rgb;
  float land = smoothstep(0.16, 0.40, data.g);
  float hp = data.r;
  vec2 g = grad(uData, vUv, uDataSize) * 0.9;

  // Parche de alto detalle sobre Colombia y su entorno durante el acercamiento
  vec3 ll = latLonOf(vObj);
  if (uLod > 0.001) {
    vec2 m = boundsUv(ll, uDetailBounds);
    if (m.x > 0.0 && m.x < 1.0 && m.y > 0.0 && m.y < 1.0) {
      vec2 dt = texture2D(uDetail, m).rg;
      float w = uLod * boundsFade(m);
      g = mix(g, grad(uDetail, m, uDetailSize) * 3.2, w);
      hp = mix(hp, dt.r, w);
      land = mix(land, smoothstep(0.3, 0.7, dt.g), w);
    }
  }

  // Relieve solo en tierra: inclina la normal según la pendiente este/norte
  vec3 Nb = normalize(N - (normalize(vEast) * g.x + normalize(vNorth) * g.y) * land);

  vec3 albedo = texture2D(uDay, vUv).rgb;
  float luma = dot(albedo, vec3(0.2126, 0.7152, 0.0722));
  albedo = mix(vec3(luma), albedo, 0.62); // saturación contenida, más fotográfica

  float mu = clamp(dot(N, V), 0.0, 1.0);
  float ndl0 = dot(N, L);                // terminador geométrico
  float ndl = max(dot(Nb, L), 0.0);
  float sunVis = smoothstep(-0.03, 0.10, ndl0);

  // Sombra de nubes sobre el lado diurno
  float cs = texture2D(uData, vUv + vec2(uCloudShift, 0.0) + L.xy * 0.0015).b;
  float cloudShadow = 1.0 - 0.45 * smoothstep(0.35, 0.95, cs);

  // Luz solar directa
  vec3 col = albedo * uSunI * ndl * sunVis * cloudShadow;

  // Brillo especular del sol sobre el océano
  vec3 H = normalize(L + V);
  float fres = 0.02 + 0.98 * pow(1.0 - max(dot(H, V), 0.0), 5.0);
  float spec = pow(max(dot(N, H), 0.0), 420.0) * 1.6 + pow(max(dot(N, H), 0.0), 45.0) * 0.035;
  col += vec3(1.0, 0.97, 0.93) * uSunI * spec * fres * (1.0 - land) * sunVis * cloudShadow;

  // Crepúsculo: luz dispersa en la franja del terminador
  float twilight = smoothstep(-0.18, 0.02, ndl0) * (1.0 - sunVis);
  col += albedo * vec3(0.55, 0.66, 0.9) * uSunI * 0.035 * twilight;

  // Lado nocturno: luz de luna tenue que revela continentes y relieve
  float night = 1.0 - smoothstep(-0.12, 0.06, ndl0);
  float ndm = max(dot(Nb, M), 0.0);
  vec3 moonAlb = mix(vec3(luma) * 1.15, albedo, 0.35) * mix(1.0, 2.2, uLod) * mix(0.55, 1.0, land);
  float reliefTone = mix(1.0, 0.45 + hp * 1.1, land);
  col += moonAlb * vec3(0.78, 0.84, 1.0) * uMoonI * (0.25 + ndm) * reliefTone * night;
  col += vec3(0.8, 0.85, 1.0) * uMoonI * 0.25 * pow(max(dot(N, normalize(M + V)), 0.0), 260.0) * (1.0 - land) * night;

  // Luces de ciudades: sin halos exagerados, atenuadas por las nubes
  float la = texture2D(uLights, vUv).r;
  float lights = la;
  if (uLod > 0.001) {
    // De cerca: bicúbico global y, sobre Colombia, el canal de luces del parche
    // (Black Marble reescalado y enfocado + núcleos en las ciudades reales de Natural Earth)
    float lb = textureBicubic(uLights, vUv, uTexSize).r;
    lights = mix(la, lb, uLod);
    vec2 m2 = boundsUv(ll, uDetailBounds);
    if (m2.x > 0.0 && m2.x < 1.0 && m2.y > 0.0 && m2.y < 1.0) {
      float pl = texture2D(uDetail, m2).b;
      pl = pl * pl * 1.1; // la textura guarda raíz aproximada: se linealiza
      lights = mix(lights, pl, uLod * boundsFade(m2));
    }
  }
  float glow = texture2D(uGlow, vUv).r;
  float cl = texture2D(uData, vUv + vec2(uCloudShift, 0.0)).b;
  float occl = 1.0 - 0.7 * smoothstep(0.3, 0.92, cl);
  float nightL = 1.0 - smoothstep(-0.2, 0.05, ndl0);
  vec3 sodium = vec3(1.0, 0.86, 0.68);
  col += sodium * (lights * 2.4 + glow * 0.05) * uLightGain * nightL * occl;

  // Colombia: velo muy sutil durante la llegada
  if (uMaskA > 0.001) {
    vec2 mm = boundsUv(ll, uMaskBounds);
    if (mm.x > 0.0 && mm.x < 1.0 && mm.y > 0.0 && mm.y < 1.0) {
      col += vec3(0.85, 0.88, 0.95) * texture2D(uMask, mm).r * 0.006 * uMaskA;
    }
  }

  // Dispersión atmosférica sobre la superficie (más densa hacia el borde)
  float haze = pow(1.0 - mu, 2.6);
  vec3 rayleigh = vec3(0.26, 0.48, 1.0);
  float hazeLight = smoothstep(-0.25, 0.6, ndl0);
  col = mix(col, rayleigh * uSunI * 0.16 * hazeLight, haze * 0.72 * hazeLight);
  col += rayleigh * uMoonI * 0.25 * haze * night;

  // ---------- Versión diurna (tema claro) ----------
  if (uDayMode > 0.001) {
    vec3 Ld = normalize(uDayLight);
    float ndld = max(dot(Nb, Ld), 0.0);
    float ndld0 = dot(N, Ld);
    vec3 albD = mix(vec3(luma), texture2D(uDay, vUv).rgb, 0.62);
    float csd = texture2D(uData, vUv + vec2(uCloudShift, 0.0) + Ld.xy * 0.0016).b;
    float shadowD = 1.0 - 0.32 * smoothstep(0.35, 0.95, csd);
    vec3 dayc = albD * (uSunI * 0.92 * ndld * shadowD + 0.22 + 0.12 * smoothstep(-0.4, 0.4, ndld0));
    vec3 Hd = normalize(Ld + V);
    float fresD = 0.02 + 0.98 * pow(1.0 - max(dot(Hd, V), 0.0), 5.0);
    dayc += vec3(1.0) * uSunI * (pow(max(dot(N, Hd), 0.0), 220.0) * 0.9 + pow(max(dot(N, Hd), 0.0), 30.0) * 0.04) * fresD * (1.0 - land) * shadowD;
    float hazeD = pow(1.0 - mu, 2.1);
    dayc = mix(dayc, vec3(0.64, 0.76, 0.96) * uSunI * 0.28, hazeD * 0.55);
    col = mix(col, dayc, uDayMode);
  }

  gl_FragColor = vec4(col * uReveal, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export const cloudFragment = /* glsl */ `
uniform sampler2D uData;
uniform vec3 uSun;
uniform vec3 uMoon;
uniform float uSunI;
uniform float uMoonI;
uniform float uShift;
uniform float uOpacity;
uniform float uReveal;
uniform float uDayMode;
uniform vec3 uDayLight;
varying vec2 vUv;
varying vec3 vN;
varying vec3 vP;
varying vec3 vObj;
void main() {
  float c = texture2D(uData, vUv + vec2(uShift, 0.0)).b;
  float a = pow(smoothstep(0.18, 1.0, c), 1.35);
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vP);
  float ndl0 = dot(N, normalize(uSun));
  float sunVis = smoothstep(-0.05, 0.12, ndl0);
  float night = 1.0 - smoothstep(-0.12, 0.06, ndl0);
  vec3 col = vec3(1.0) * uSunI * 0.92 * max(ndl0, 0.0) * sunVis;
  col += vec3(0.7, 0.78, 0.95) * uSunI * 0.03 * smoothstep(-0.18, 0.02, ndl0) * (1.0 - sunVis);
  col += vec3(0.78, 0.84, 1.0) * uMoonI * 0.9 * (0.3 + max(dot(N, normalize(uMoon)), 0.0)) * night;
  float edge = smoothstep(0.0, 0.25, dot(N, V));
  float alpha = a * mix(0.55, 0.96, sunVis) * uOpacity * uReveal * edge;
  // De día: nubes blancas, iluminadas desde el frente, algo más presentes
  float ndd = dot(N, normalize(uDayLight));
  vec3 colD = vec3(1.0) * (uSunI * 0.85 * max(ndd, 0.0) + 0.42);
  float alphaD = a * 0.82 * uOpacity * uReveal * edge;
  col = mix(col, colD, uDayMode);
  alpha = mix(alpha, alphaD, uDayMode);
  gl_FragColor = vec4(col, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export const atmoVertex = /* glsl */ `
varying vec3 vP;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vP = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

// Capa atmosférica delgada: densidad exponencial según la altura mínima del rayo
export const atmoFragment = /* glsl */ `
uniform vec3 uSun;
uniform vec3 uCenter;
uniform float uSunI;
uniform float uReveal;
uniform float uGain;
varying vec3 vP;
void main() {
  vec3 rd = normalize(vP - cameraPosition);
  vec3 oc = uCenter - cameraPosition;
  float t = dot(oc, rd);
  vec3 cp = cameraPosition + rd * t;
  float b = length(cp - uCenter);
  if (b < 1.0 || t < 0.0) discard;
  float alt = b - 1.0;
  float dens = exp(-alt / 0.0085) * 0.9 + exp(-alt / 0.03) * 0.12;
  vec3 dir = normalize(cp - uCenter);
  float s = dot(dir, normalize(uSun));
  float lit = smoothstep(-0.35, 0.5, s);
  float forward = pow(max(dot(rd, normalize(uSun)), 0.0), 8.0) * 0.6;
  vec3 rayleigh = vec3(0.26, 0.48, 1.0);
  vec3 col = rayleigh * uSunI * dens * (0.012 + 0.22 * lit + forward * lit) * uReveal * uGain;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export const starVertex = /* glsl */ `
attribute float aSize;
attribute float aBright;
uniform float uPR;
uniform float uTime;
varying float vB;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uPR;
  float tw = 0.85 + 0.15 * sin(uTime * 1.1 + position.x * 0.37 + position.y * 0.13);
  vB = aBright * tw;
}
`;

// Halo de día: misma densidad, mezcla normal (se ve sobre el fondo claro)
export const atmoDayFragment = /* glsl */ `
uniform vec3 uCenter;
uniform float uReveal;
uniform float uGain;
varying vec3 vP;
void main() {
  vec3 rd = normalize(vP - cameraPosition);
  vec3 oc = uCenter - cameraPosition;
  float t = dot(oc, rd);
  vec3 cp = cameraPosition + rd * t;
  float b = length(cp - uCenter);
  if (b < 1.0 || t < 0.0) discard;
  float alt = b - 1.0;
  float dens = exp(-alt / 0.012) * 0.75 + exp(-alt / 0.04) * 0.18;
  gl_FragColor = vec4(vec3(0.62, 0.74, 0.95), clamp(dens, 0.0, 1.0) * 0.55 * uReveal * uGain);
  #include <colorspace_fragment>
}
`;

export const starFragment = /* glsl */ `
uniform float uReveal;
varying float vB;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.05, d);
  gl_FragColor = vec4(vec3(0.85, 0.87, 0.91) * a * vB * uReveal * 0.55, 1.0);
}
`;
