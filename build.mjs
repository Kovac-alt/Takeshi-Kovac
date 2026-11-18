// Builds the app into two single-file outputs:
//   dist/artifact.html  page fragment for publishing as a Claude artifact
//                       (the host wraps it in its own <html>/<head>/<body>)
//   dist/index.html     standalone document: open it from disk or host it anywhere
//   docs/lift-ledger/   installable web app for a phone's home screen (manifest + offline cache)
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
  'https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@600;700;800&family=Barlow:wght@400;500;600&display=swap';

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
  target: ['es2020'],
  legalComments: 'none',
  logLevel: 'warning',
};

// The mirror of the small reset the artifact host injects, so the standalone
// build lays out exactly like the published page.
const HOST_RESET =
  ':root{color-scheme:dark;padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)}' +
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
  if (!outArg) await emitInstallable(fragment);
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'artifact.html'), fragment);
  await writeFile(path.join(outDir, 'index.html'), standalone);
  const kb = (n) => (n / 1024).toFixed(1) + ' kB';
  const rel = path.relative(root, outDir) || '.';
  console.log(`built ${rel}/artifact.html (${kb(fragment.length)}), ${rel}/index.html (${kb(standalone.length)})`);
}

// The home-screen version served from docs/ by any static host. Icons are committed beside it.
async function emitInstallable(fragment) {
  const dir = path.join(root, 'docs', 'lift-ledger');
  const html =
    '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n' +
    `<title>${TITLE}</title>\n` +
    '<link rel="manifest" href="manifest.webmanifest">\n<link rel="apple-touch-icon" href="apple-touch-icon.png">\n' +
    '<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="mobile-web-app-capable" content="yes">\n' +
    '<meta name="apple-mobile-web-app-title" content="Lift Ledger">\n<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n' +
    '<meta name="theme-color" content="#07080a">\n' +
    `<style>${HOST_RESET}</style>\n</head>\n<body>\n` +
    fragment.replace(/<title>.*?<\/title>\n/, '') +
    "<script>if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});\n" +
    'if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});<' + '/script>\n</body>\n</html>\n';
  const manifest = {
    name: TITLE, short_name: 'Lift Ledger', description: 'Workout plan, tracker and notes',
    start_url: './', scope: './', display: 'standalone', background_color: '#07080a', theme_color: '#07080a',
    icons: [192, 512].map((n) => ({ src: `icon-${n}.png`, sizes: `${n}x${n}`, type: 'image/png', purpose: 'any maskable' })),
  };
  // Network first so updates arrive when online; the cached copy opens the app offline.
  const sw = `const CACHE = 'lift-ledger-${Date.now().toString(36)}';
const SHELL = ['./', 'manifest.webmanifest', 'icon-192.png', 'apple-touch-icon.png'];
self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys()
  .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then((res) => {
    if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })
    .then((hit) => hit || (e.request.mode === 'navigate' ? caches.match('./') : Response.error()))));
});
`;
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'index.html'), html);
  await writeFile(path.join(dir, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2) + '\n');
  await writeFile(path.join(dir, 'sw.js'), sw);
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
