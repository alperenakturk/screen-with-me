// Eklentiyi derler: TypeScript dosyalarını tek tek paketler, manifest ve
// popup dosyalarını dist/ klasörüne kopyalar. Chrome'da "Paketlenmemiş öğe
// yükle" ile dist/ klasörü seçilir.
//
//   node build.mjs        → yayındaki siteye bağlanır
//   node build.mjs --dev  → yerel geliştirme sunucusuna (localhost:5173) bağlanır

import { build } from 'esbuild';
import { zipSync } from 'fflate';
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';

const dev = process.argv.includes('--dev');
const SITE_URL = dev ? 'http://localhost:5173' : 'https://screen-with-me.swm-server.workers.dev';
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist');

const common = {
  outdir: 'dist',
  bundle: true,
  target: 'chrome110',
  minify: !dev,
  sourcemap: dev ? 'inline' : false,
  define: { __SITE_URL__: JSON.stringify(SITE_URL) },
  logLevel: 'info',
};
// Arka plan ES modülü olarak yüklenir; sayfalara eklenen betikler ise klasik
// betik olmak zorunda, onlar kendi içine kapalı (iife) paketlenir.
await build({ ...common, entryPoints: ['src/background.ts', 'src/popup.ts', 'src/shell.ts'], format: 'esm' });
await build({ ...common, entryPoints: ['src/content.ts', 'src/site-bridge.ts', 'src/fullscreen-guard.ts'], format: 'iife' });

const siteMatches = dev
  ? ['http://localhost:5173/*', 'http://localhost:8787/*']
  : [`${SITE_URL}/*`];

const manifest = {
  manifest_version: 3,
  // Mağazadaki başlık ve özet buradan gelir (özet en fazla 132 karakter).
  name: dev ? 'ScreenWithMe (dev)' : 'ScreenWithMe – Watch Videos Together in Sync',
  short_name: 'ScreenWithMe',
  version: pkg.version,
  description: 'Sync any HTML5 video with friends: play, pause, seek and speed together. Emoji reactions and quick chat. No account, free.',
  // WebSocket trafiğinin service worker'ı açık tutması Chrome 116'dan beri var.
  minimum_chrome_version: '116',
  homepage_url: 'https://screen-with-me.swm-server.workers.dev/eklenti.html',
  // Simgeler: node scripts/make-icons.mjs ile üretilir (static/ içinde).
  icons: { 16: 'icon16.png', 32: 'icon32.png', 48: 'icon48.png', 128: 'icon128.png' },
  permissions: ['storage'],
  host_permissions: ['<all_urls>'],
  // Film sayfasının üstüne açılan oda katmanı (kabuk): içinde sitenin oda sayfası çalışır.
  web_accessible_resources: [{ resources: ['shell.html', 'shell.js'], matches: ['<all_urls>'] }],
  background: { service_worker: 'background.js', type: 'module' },
  action: {
    default_popup: 'popup.html',
    default_title: 'ScreenWithMe',
    default_icon: { 16: 'icon16.png', 32: 'icon32.png' },
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      exclude_matches: siteMatches,
      js: ['content.js'],
      all_frames: true,
      match_about_blank: true,
      // Erken çalışır: katman ve video yerleşimi sayfa çizilirken hazır olsun.
      run_at: 'document_start',
    },
    {
      // Film sitesinin tam ekran düğmesi odanın tam ekranını açsın (sayfanın kendi dünyasında; oda yokken karışmaz).
      matches: ['<all_urls>'],
      exclude_matches: siteMatches,
      js: ['fullscreen-guard.js'],
      all_frames: true,
      match_about_blank: true,
      run_at: 'document_start',
      world: 'MAIN',
    },
    {
      matches: siteMatches,
      js: ['site-bridge.js'],
      run_at: 'document_start',
    },
  ],
};
writeFileSync('dist/manifest.json', JSON.stringify(manifest, null, 2));
cpSync('static', 'dist', { recursive: true });
console.log(`\n✓ dist/ hazır (${dev ? 'geliştirme' : 'yayın'}: ${SITE_URL})`);

// Yayın sürümü, arkadaşların siteden indirebilmesi için zip'lenip sitenin
// public klasörüne konur (site/eklenti.html sayfasındaki indirme linki).
if (!dev) {
  // Alt klasörler de (avatars/) zip'e girsin.
  const files = {};
  for (const name of readdirSync('dist', { recursive: true })) {
    const path = String(name).replace(/\\/g, '/');
    if (statSync(`dist/${path}`).isFile()) files[path] = readFileSync(`dist/${path}`);
  }
  writeFileSync('../web/public/screenwithme-extension.zip', zipSync(files, { level: 9 }));
  writeFileSync('../web/public/extension-version.json', JSON.stringify({ version: pkg.version }));
  console.log('✓ ../web/public/screenwithme-extension.zip yazıldı');
}
