// Telefona/masaüstüne "uygulama" olarak eklenen site (PWA) için en küçük service worker. Sitenin dosyalarını
// önbelleğe ALMAZ (her açılışta en yenisi gelsin, eski kodla odaya girilmesin; oda zaten internet ister): sadece
// internet yokken sayfa açılmaya çalışılırsa "bağlantı yok" sayfasını gösterir.
const CACHE = 'swm-offline-1';
const OFFLINE = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([OFFLINE, '/logo.svg']))
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
  if (request.mode !== 'navigate') return;
  event.respondWith(fetch(request).catch(() => caches.match(OFFLINE)));
});
