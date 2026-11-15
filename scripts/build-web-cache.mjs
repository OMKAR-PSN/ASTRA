import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const directory = 'dist/web';
const htmlPath = join(directory, 'index.html');
const html = await readFile(htmlPath, 'utf8');
const registration = '<script>if ("serviceWorker" in navigator) navigator.serviceWorker.register("/service-worker.js").catch(console.error);</script>';
await writeFile(htmlPath, html.replace('</body>', registration + '</body>'));

const files = (await readdir(directory, { recursive: true, withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name !== 'service-worker.js')
  .map((entry) => join(entry.parentPath, entry.name).slice(directory.length + 1).replaceAll('\\', '/'))
  .sort();
const revision = createHash('sha256');
for (const file of files) revision.update(file).update(await readFile(join(directory, file)));
const cache = 'astra-care-' + revision.digest('hex').slice(0, 16);

await writeFile(join(directory, 'service-worker.js'), `
const cacheName = ${JSON.stringify(cache)};
const files = ${JSON.stringify(files.map((file) => '/' + file.split('/').map(encodeURIComponent).join('/')))};
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(files)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys
    .filter((key) => key.startsWith('astra-care-') && key !== cacheName)
    .map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(caches.open(cacheName).then((cache) => cache.match('/index.html')).then((shell) => shell || fetch(event.request)));
  } else if (files.includes(url.pathname)) {
    event.respondWith(caches.open(cacheName).then((cache) => cache.match(event.request, { ignoreSearch: true })).then((cached) => cached || fetch(event.request)));
  }
});
`);
