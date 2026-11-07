// Chrome Web Store paketini store/ klasörüne hazırlar:
// simge, ekran görüntüleri (1280x800), küçük tanıtım kutusu (440x280) ve
// yüklenecek zip. Görüntüler store/src/shots.html'den headless Chrome ile çekilir.
//
//   npm run build && node scripts/store-shots.mjs
//
// Sayfa küçük bir yerel sunucudan açılır: oda taklidi (store/src/room.html) sitenin gerçek
// styles.css'ini kullanır ve oradaki /themes/…, /avatars/… gibi kök adresler apps/web/public'ten gelir.

import { execFile } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const root = new URL('../', import.meta.url);
const store = new URL('store/', root);
const path = (url) => fileURLToPath(url);

const CHROME = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find((p) => p && existsSync(p));
if (!CHROME) throw new Error('Chrome bulunamadı (CHROME ortam değişkeniyle yol verebilirsin).');

for (const size of [32, 128]) {
  copyFileSync(new URL(`apps/extension/static/icon${size}.png`, root), new URL(`icon${size}.png`, store));
}

// Önce apps/web/public (sitenin kök adresleri), yoksa repo kökü.
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.js': 'text/javascript' };
const server = createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/\.\.+/g, '');
  const file = [new URL(`apps/web/public${pathname}`, root), new URL(`.${pathname}`, root)].find((u) => {
    try {
      return statSync(u).isFile();
    } catch {
      return false;
    }
  });
  if (!file) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[extname(pathname)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const page = `http://127.0.0.1:${server.address().port}/store/src/shots.html`;

const shots = [
  ['1', 'screenshot-1.png', 1280, 800],
  ['2', 'screenshot-2.png', 1280, 800],
  ['3', 'screenshot-3.png', 1280, 800],
  ['4', 'screenshot-4.png', 1280, 800],
  ['5', 'screenshot-5.png', 1280, 800],
  ['promo', 'promo-small.png', 440, 280],
  // Edge Add-ons asks for a square store logo (300 x 300 recommended); Chrome takes the 128 px icon.
  ['edge', 'edge-logo-300.png', 300, 300],
  // Davet linki önizlemesi (WhatsApp/Discord): sitenin public klasörüne
  ['og', '../apps/web/public/og.png', 1200, 630],
];
const run = promisify(execFile);
for (const [shot, file, w, h] of shots) {
  // Sunucu bu süreçte çalıştığı için Chrome'u beklerken olay döngüsü boş kalmalı (execFileSync olmaz).
  await run(CHROME, [
    '--headless=new',
    // Bulut oturumunda root olarak çalışır: Chrome korumalı alanı root'a izin vermiyor.
    ...(process.getuid?.() === 0 ? ['--no-sandbox'] : []),
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--virtual-time-budget=3000',
    `--window-size=${w},${h}`,
    `--screenshot=${path(new URL(file, store))}`,
    `${page}?shot=${shot}`,
  ]);
  console.log(`✓ store/${file}`);
}
server.close();

const { version } = JSON.parse(readFileSync(new URL('apps/extension/package.json', root), 'utf8'));
copyFileSync(new URL('apps/web/public/screenwithme-extension.zip', root), new URL(`screenwithme-${version}.zip`, store));
console.log(`✓ store/screenwithme-${version}.zip`);
