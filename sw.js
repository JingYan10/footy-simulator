// Offline cache so the installed app works without a connection.
const CACHE = 'ptl-v8';
const FILES = ['./', 'index.html', 'css/style.css', 'js/database.js', 'js/lower-leagues.js', 'js/more-leagues.js', 'js/salaries.js', 'js/engine.js', 'js/tournaments.js', 'js/ui.js', 'manifest.json', 'icon.svg'];

self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))));
self.addEventListener('fetch', e => {
  // Network first so updates show up, cache as fallback when offline.
  e.respondWith(fetch(e.request).then(res => {
    const copy = res.clone();
    caches.open(CACHE).then(c => c.put(e.request, copy));
    return res;
  }).catch(() => caches.match(e.request)));
});
