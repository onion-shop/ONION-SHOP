/* Onion Shop · сервис-воркер: сайт открывается без интернета из последней сохранённой версии.
   Сначала всегда берётся свежая версия из сети, поэтому ваши правки видны сразу. */
var CACHE = 'onion-shop-v3-halloween';
var CORE = ['./', './index.html', './style.css', './data.js', './globe.js', './app.js', './game.js',
  './logo.png', './favicon.png', './icon-192.png', './manifest.webmanifest'];

self.addEventListener('install', function (e) {
  // каждый файл кешируется отдельно: если какого-то нет, установка всё равно проходит
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(CORE.map(function (u) { return c.add(u).catch(function () { }); }));
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(fetch(req).then(function (res) {
    if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
    return res;
  }).catch(function () {
    return caches.match(req).then(function (m) { return m || caches.match('./index.html'); });
  }));
});
