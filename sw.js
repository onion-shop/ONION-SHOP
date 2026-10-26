/* Onion Shop · сервис-воркер: сайт открывается без интернета из последней сохранённой версии.
   Сначала всегда берётся свежая версия из сети, поэтому ваши правки видны сразу. */
var CACHE = 'onion-shop-v1';
var CORE = ['./', './index.html', './css/style.css', './js/data.js', './js/security.js', './js/qr.js', './js/globe.js', './js/app.js',
  './assets/logo.png', './assets/favicon.png', './assets/icon-192.png', './manifest.webmanifest'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
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
    var copy = res.clone();
    caches.open(CACHE).then(function (c) { c.put(req, copy); });
    return res;
  }).catch(function () {
    return caches.match(req).then(function (m) { return m || caches.match('./index.html'); });
  }));
});
