// Versión para publicar: dist/web/
//  - Un solo archivo JS (js/app.js) y uno CSS (css/app.css), minificados.
//  - Fotos, texturas y fuentes como archivos aparte: el navegador las cachea y las tarjetas
//    fuera de pantalla se cargan de forma diferida (loading="lazy"). Nada en Base64.
//  - No copia assets/img/products/pendientes/ (imágenes sin aprobar).
// Se sube la carpeta dist/web/ completa a cualquier hosting estático.
import { build, transform } from "esbuild";
import { readFile, writeFile, mkdir, cp, rm, stat, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "dist/web");
await rm(out, { recursive: true, force: true });
await mkdir(join(out, "js"), { recursive: true });
await mkdir(join(out, "css"), { recursive: true });

// JS
await build({
  entryPoints: [join(root, "js/main.js")], outfile: join(out, "js/app.js"),
  bundle: true, format: "iife", minify: true, target: "es2020", legalComments: "none",
});
// Contador de visitas (GoatCounter): el index.html lo carga como módulo aparte, así que hay que publicarlo.
await cp(join(root, "js/visitor-counter.js"), join(out, "js/visitor-counter.js"));
// CSS (las rutas ../assets siguen siendo válidas desde css/)
let css = "";
for (const f of ["css/base.css", "css/intro.css", "css/shop.css"]) css += (await readFile(join(root, f), "utf8")) + "\n";
await writeFile(join(out, "css/app.css"), (await transform(css, { loader: "css", minify: true })).code);
// Archivos estáticos
await cp(join(root, "vendor"), join(out, "vendor"), { recursive: true });
await cp(join(root, "assets"), join(out, "assets"), {
  recursive: true,
  filter: (src) => !src.includes(join("img", "products", "pendientes")),
});
// HTML
let html = await readFile(join(root, "index.html"), "utf8");
html = html.replace(/<link rel="stylesheet" href="css\/base.css">\s*<link rel="stylesheet" href="css\/intro.css">\s*<link rel="stylesheet" href="css\/shop.css">/, () => '<link rel="stylesheet" href="css/app.css">');
html = html.replace('<script type="module" src="js/main.js"></script>', () => '<script src="js/app.js" defer></script>');
await writeFile(join(out, "index.html"), html);

const size = async (d) => { let t = 0; for (const f of await readdir(d, { recursive: true, withFileTypes: true })) if (f.isFile()) t += (await stat(join(f.parentPath, f.name))).size; return t; };
console.log(`Listo: dist/web/ (${((await size(out)) / 1048576).toFixed(1)} MB en archivos; index.html ${((await stat(join(out, "index.html"))).size / 1024).toFixed(0)} KB)`);
