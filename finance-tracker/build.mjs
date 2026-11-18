// Builds the installable, Claude-free version of Pocket Ledger into docs/pocket-ledger/.
// The source (index.html) is a page fragment; this wraps it in a full document with the
// home-screen tags and an offline cache. Run: node finance-tracker/build.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, '..', 'docs', 'pocket-ledger');
const fragment = (await readFile(path.join(here, 'index.html'), 'utf8')).replace(/<title>.*?<\/title>\n?/, '');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Pocket Ledger</title>
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Ledger">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="theme-color" content="#07080a">
<style>:root{color-scheme:dark;padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>
</head>
<body>
${fragment}
<script>
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
</script>
</body>
</html>
`;

const manifest = {
  name: 'Pocket Ledger', short_name: 'Ledger', description: 'Personal finance tracker and planner',
  start_url: './', scope: './', display: 'standalone', background_color: '#07080a', theme_color: '#07080a',
  icons: [
    { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
    { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
  ],
};

// Network first so updates arrive when online; the cached copy opens the app offline.
const sw = `const CACHE = 'pocket-ledger-${Date.now().toString(36)}';
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

await mkdir(out, { recursive: true });
await writeFile(path.join(out, 'index.html'), html);
await writeFile(path.join(out, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2) + '\n');
await writeFile(path.join(out, 'sw.js'), sw);
console.log('built docs/pocket-ledger (icons are committed alongside; regenerate only if the mark changes)');
