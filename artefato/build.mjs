// Gera a versão de página única: dist-artefato/index.html + app.js
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const saida = path.join(raiz, "dist-artefato");
mkdirSync(saida, { recursive: true });

await build({
  entryPoints: [path.join(raiz, "artefato/main.tsx")],
  bundle: true,
  minify: true,
  format: "iife",
  target: ["es2020", "safari15"],
  jsx: "automatic",
  outfile: path.join(saida, "app.js"),
  alias: {
    "@": path.join(raiz, "src"),
    "next/link": path.join(raiz, "artefato/shims/link.tsx"),
    "next/navigation": path.join(raiz, "artefato/shims/navigation.ts"),
    "next/dynamic": path.join(raiz, "artefato/shims/dynamic.tsx"),
  },
  define: { "process.env.NEXT_PUBLIC_ARTEFATO": '"1"', "process.env.NODE_ENV": '"production"' },
  legalComments: "none",
  logLevel: "warning",
});

const css = path.join(saida, "estilo.css");
execFileSync(path.join(raiz, "node_modules/.bin/tailwindcss"), ["-i", path.join(raiz, "src/app/globals.css"), "-o", css, "--minify"], { cwd: raiz, stdio: "inherit" });

// Respeita o tema do claude.ai (data-theme dark/light) quando o app segue o sistema.
const tema = `try{var r=document.documentElement,h=r.getAttribute('data-theme'),c=JSON.parse(localStorage.getItem('osce.v2.config')||'{}'),t=c.tema||'sistema';if(t==='sistema'){t=(h==='dark'||h==='escuro'||(!h&&matchMedia('(prefers-color-scheme: dark)').matches))?'escuro':'claro'}r.setAttribute('data-theme',t)}catch(e){}`;
const html = `<title>OSCE Immersive</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>${readFileSync(css, "utf8")}</style>
<script>${tema}</script>
<div id="raiz"><p style="padding:24px;font-family:system-ui">Carregando o hospital virtual…</p></div>
<script src="app.js"></script>
`;
writeFileSync(path.join(saida, "index.html"), html);
const kb = (f) => Math.round(readFileSync(path.join(saida, f)).length / 1024);
console.log(`index.html ${kb("index.html")} KB · app.js ${kb("app.js")} KB`);
