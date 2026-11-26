// Vista previa: dist/tu-temporada-colombia.html, un único archivo que abre con doble clic,
// pensado para revisar o enviar la tienda sin servidor. Para publicar usa `npm run build`
// (dist/web/), que deja las fotos como archivos aparte.
//
// con JavaScript, estilos, fuentes, texturas e imágenes embebidos.
import { build } from "esbuild";
import { readFile, writeFile, readdir, mkdir, stat } from "node:fs/promises";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const mime = { ".webp": "image/webp", ".jpg": "image/jpeg", ".png": "image/png", ".woff2": "font/woff2", ".gif": "image/gif" };
const dataURI = async (rel) => `data:${mime[extname(rel)]};base64,${(await readFile(join(root, rel))).toString("base64")}`;

// 1) JavaScript en un solo paquete (incluye three.js; GSAP se embebe aparte)
const js = await build({
  entryPoints: [join(root, "js/main.js")],
  bundle: true, format: "iife", minify: true, write: false, target: "es2020", legalComments: "none",
});
const bundle = js.outputFiles[0].text;

// 2) Estilos con fuentes embebidas
let css = "";
for (const f of ["css/base.css", "css/intro.css", "css/shop.css"]) css += (await readFile(join(root, f), "utf8")) + "\n";
const fontRefs = [...new Set([...css.matchAll(/url\("\.\.\/(assets\/fonts\/[^"]+)"\)/g)].map((m) => m[1]))];
for (const ref of fontRefs) css = css.split(`url("../${ref}")`).join(`url("${await dataURI(ref)}")`);

// 3) Recursos referenciados desde JS (catálogo, texturas, respaldo estático)
const inline = {};
// Fotos de producto, incluidas las de estudio (subcarpeta estudio/). pendientes/ no se publica.
const products = (await readdir(join(root, "assets/img/products"), { recursive: true }))
  .filter((f) => f.endsWith(".webp") && !f.endsWith("-sm.webp") && !f.startsWith("pendientes"));
for (const f of products) inline[`assets/img/products/${f}`] = await dataURI(`assets/img/products/${f}`);
for (const f of await readdir(join(root, "assets/textures"))) inline[`assets/textures/${f}`] = await dataURI(`assets/textures/${f}`);
// Banners del carrusel: solo la versión de 1280 px (el archivo único no usa srcset).
for (const f of await readdir(join(root, "assets/img/banners"))) if (f.endsWith("-1280.webp")) inline[`assets/img/banners/${f}`] = await dataURI(`assets/img/banners/${f}`);
for (const f of await readdir(join(root, "assets/img/fallback"))) inline[`assets/img/fallback/${f}`] = await dataURI(`assets/img/fallback/${f}`);

// 4) HTML final (reemplazos con función: el código contiene secuencias $ que String.replace interpretaría)
let html = await readFile(join(root, "index.html"), "utf8");
// El contador se incorpora al HTML único para que no dependa de un archivo JS externo.
const visitorCounter = await readFile(join(root, "js/visitor-counter.js"), "utf8");
html = html.replace(/\s*<link rel="preload"[^>]*>/g, "");
html = html.replace(/\s*<script type="module" src="js\/visitor-counter.js"><\/script>/, "");
// Íconos (favicon) embebidos
mime[".svg"] = "image/svg+xml";
for (const m of [...html.matchAll(/href="(assets\/img\/brand\/[^"]+)"/g)]) html = html.split(`href="${m[1]}"`).join(`href="${await dataURI(m[1])}"`);
html = html.replace(/\s*<link rel="stylesheet" href="css\/base.css">\s*<link rel="stylesheet" href="css\/intro.css">\s*<link rel="stylesheet" href="css\/shop.css">/, () => `\n<style>\n${css}</style>`);
const gsap = await readFile(join(root, "vendor/gsap.min.js"), "utf8");
const st = await readFile(join(root, "vendor/ScrollTrigger.min.js"), "utf8");
const safe = (s) => s.replace(/<\/script/gi, "<\\/script");
html = html.replace(
  /\s*<script src="vendor\/gsap.min.js" defer><\/script>\s*<script src="vendor\/ScrollTrigger.min.js" defer><\/script>\s*<script type="module" src="js\/main.js"><\/script>/,
  () => `\n<script>${safe(gsap)}</script>\n<script>${safe(st)}</script>\n<script>window.__TTC_INLINE__=${JSON.stringify(inline)};</script>\n<script>${safe(bundle)}</script>\n<script>${safe(visitorCounter)}</script>`
);
await mkdir(join(root, "dist"), { recursive: true });
const out = join(root, "dist/tu-temporada-colombia.html");
await writeFile(out, html);
console.log(`Listo: dist/tu-temporada-colombia.html (${((await stat(out)).size / 1048576).toFixed(1)} MB, ${Object.keys(inline).length} recursos embebidos)`);
