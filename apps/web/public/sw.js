// Telefona/masaüstüne "uygulama" olarak eklenen site (PWA) için en küçük service worker. Sitenin dosyalarını
// önbelleğe ALMAZ (her açılışta en yenisi gelsin, eski kodla odaya girilmesin; oda zaten internet ister): sadece
// internet yokken sayfa açılmaya çalışılırsa "bağlantı yok" sayfasını gösterir.
const CACHE = 'swm-offline-2';
const OFFLINE = '/offline.html';
/** Files the offline page itself needs (its script is a separate file because of the CSP). */
const OFFLINE_FILES = ['/offline.js', '/logo.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([OFFLINE, ...OFFLINE_FILES]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  // Sadece sayfa açılışları; geri kalan her şey (dosyalar, /api, WebSocket) tarayıcının kendi yolundan.
  // Exception: the offline page's own files, served from the cache when there is no internet.
  if (request.mode !== 'navigate') {
    const url = new URL(request.url);
    if (url.origin === self.location.origin && OFFLINE_FILES.includes(url.pathname)) {
      event.respondWith(fetch(request).catch(() => caches.match(url.pathname)));
    }
    return;
  }
  event.respondWith(fetch(request).catch(() => caches.match(OFFLINE)));
});
