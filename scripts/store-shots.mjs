// Chrome Web Store paketini store/ klasörüne hazırlar:
// simge, ekran görüntüleri (1280x800), küçük tanıtım kutusu (440x280) ve
// yüklenecek zip. Görüntüler store/src/shots.html'den headless Chrome ile çekilir.
//
//   npm run build && node scripts/store-shots.mjs

import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

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

const page = pathToFileURL(path(new URL('src/shots.html', store))).href;
const shots = [
  ['1', 'screenshot-1.png', 1280, 800],
  ['2', 'screenshot-2.png', 1280, 800],
  ['3', 'screenshot-3.png', 1280, 800],
  ['promo', 'promo-small.png', 440, 280],
];
for (const [shot, file, w, h] of shots) {
  execFileSync(CHROME, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--allow-file-access-from-files',
    `--window-size=${w},${h}`,
    `--screenshot=${path(new URL(file, store))}`,
    `${page}?shot=${shot}`,
  ], { stdio: 'ignore' });
  console.log(`✓ store/${file}`);
}

const { version } = JSON.parse(readFileSync(new URL('apps/extension/package.json', root), 'utf8'));
copyFileSync(new URL('apps/web/public/screenwithme-extension.zip', root), new URL(`screenwithme-${version}.zip`, store));
console.log(`✓ store/screenwithme-${version}.zip`);
