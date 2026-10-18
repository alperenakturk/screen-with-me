// Eklentiyi derler: TypeScript dosyalarını tek tek paketler, manifest ve
// popup dosyalarını dist/ klasörüne kopyalar. Chrome'da "Paketlenmemiş öğe
// yükle" ile dist/ klasörü seçilir.
//
//   node build.mjs        → yayındaki siteye bağlanır
//   node build.mjs --dev  → yerel geliştirme sunucusuna (localhost:5173) bağlanır

import { build } from 'esbuild';
import { zipSync } from 'fflate';
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';

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
await build({ ...common, entryPoints: ['src/background.ts', 'src/popup.ts'], format: 'esm' });
await build({ ...common, entryPoints: ['src/content.ts', 'src/site-bridge.ts'], format: 'iife' });

const siteMatches = dev
  ? ['http://localhost:5173/*', 'http://localhost:8787/*']
  : [`${SITE_URL}/*`];

const manifest = {
  manifest_version: 3,
  name: dev ? 'ScreenWithMe (dev)' : 'ScreenWithMe',
  version: pkg.version,
  description: 'Watch any HTML5 video in sync with friends: play, pause, seek and speed stay together.',
  homepage_url: 'https://screen-with-me.swm-server.workers.dev/eklenti.html',
  // Simgeler: node scripts/make-icons.mjs ile üretilir (static/ içinde).
  icons: { 16: 'icon16.png', 32: 'icon32.png', 48: 'icon48.png', 128: 'icon128.png' },
  permissions: ['storage'],
  host_permissions: ['<all_urls>'],
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
      // Erken çalışır: bazı siteler adresteki #swm=ODA işaretini kendi betikleri
      // çalışınca hemen siler; ondan önce okumak için.
      run_at: 'document_start',
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
  const files = {};
  for (const name of readdirSync('dist')) files[name] = readFileSync(`dist/${name}`);
  writeFileSync('../web/public/screenwithme-extension.zip', zipSync(files, { level: 9 }));
  writeFileSync('../web/public/extension-version.json', JSON.stringify({ version: pkg.version }));
  console.log('✓ ../web/public/screenwithme-extension.zip yazıldı');
}
