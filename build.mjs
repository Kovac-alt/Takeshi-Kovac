// Builds the app into two single-file outputs:
//   dist/artifact.html  page fragment for publishing as a Claude artifact
//                       (the host wraps it in its own <html>/<head>/<body>)
//   dist/index.html     standalone document: open it from disk or host it anywhere
//
// Usage: node build.mjs [--watch] [--no-minify] [--out=<dir>]
import { build, context, transform } from 'esbuild';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const src = (...p) => path.join(root, 'src', ...p);
const argv = process.argv.slice(2);
const args = new Set(argv);
const watch = args.has('--watch');
const minify = !args.has('--no-minify');
// --out=<dir> writes somewhere other than dist/ (handy for parallel or throwaway builds).
const outArg = argv.find((a) => a.startsWith('--out='));
const outDir = outArg ? path.resolve(outArg.slice('--out='.length)) : path.join(root, 'dist');

const TITLE = 'Lift Ledger';
const FONTS =
  'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Barlow:wght@400;500;600&display=swap';

// Stylesheets are concatenated in this order; every file in styles/views follows, sorted by name.
const STYLE_ORDER = ['tokens.css', 'base.css', 'components.css', 'charts.css'];

async function collectCss() {
  const parts = [];
  for (const name of STYLE_ORDER) {
    const file = src('styles', name);
    if (existsSync(file)) parts.push(await readFile(file, 'utf8'));
  }
  const viewsDir = src('styles', 'views');
  if (existsSync(viewsDir)) {
    const files = (await readdir(viewsDir)).filter((f) => f.endsWith('.css')).sort();
    for (const f of files) parts.push(await readFile(path.join(viewsDir, f), 'utf8'));
  }
  const css = parts.join('\n');
  if (!minify) return css;
  return (await transform(css, { loader: 'css', minify: true })).code.trim();
}

const esbuildOptions = {
  entryPoints: [src('main.jsx')],
  bundle: true,
  format: 'iife',
  write: false,
  minify,
  jsx: 'automatic',
  jsxImportSource: 'preact',
  target: ['es2020', 'safari15'],
  legalComments: 'none',
  logLevel: 'warning',
};

// The mirror of the small reset the artifact host injects, so the standalone
// build lays out exactly like the published page.
const HOST_RESET =
  ':root{color-scheme:light;padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)}' +
  'body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}';

async function emit(js) {
  if (/<\/script/i.test(js)) throw new Error('bundle contains a literal </script> sequence');
  const css = await collectCss();
  if (/<\/style/i.test(css)) throw new Error('styles contain a literal </style> sequence');
  const fragment =
    `<title>${TITLE}</title>\n` +
    `<meta name="claude:viewport-fit-sides" content="cover">\n` +
    `<link rel="stylesheet" href="${FONTS}">\n` +
    `<style>${css}</style>\n` +
    `<div id="app"></div>\n` +
    `<script>${js}</script>\n`;
  const standalone =
    '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
    `<style>${HOST_RESET}</style></head><body>\n${fragment}</body></html>\n`;
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'artifact.html'), fragment);
  await writeFile(path.join(outDir, 'index.html'), standalone);
  const kb = (n) => (n / 1024).toFixed(1) + ' kB';
  const rel = path.relative(root, outDir) || '.';
  console.log(`built ${rel}/artifact.html (${kb(fragment.length)}), ${rel}/index.html (${kb(standalone.length)})`);
}

if (watch) {
  const ctx = await context({
    ...esbuildOptions,
    plugins: [
      {
        name: 'emit-html',
        setup(b) {
          b.onEnd(async (result) => {
            if (result.errors.length || !result.outputFiles) return;
            try {
              await emit(result.outputFiles[0].text);
            } catch (e) {
              console.error(e.message);
            }
          });
        },
      },
    ],
  });
  await ctx.watch();
  console.log('watching src/ (styles are re-read on every JS rebuild)');
} else {
  const result = await build(esbuildOptions);
  await emit(result.outputFiles[0].text);
}
