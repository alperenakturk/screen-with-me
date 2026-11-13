// PWA1: the home-screen app's manifest stays installable and English. Checks `apps/web/public/manifest.webmanifest`:
// valid JSON; `lang: en` with English name and description (no Turkish letters); `id`, `start_url` and `scope` on our
// own origin; the icons (192, 512, a maskable one) and both screenshots (narrow + wide) exist with the sizes the
// manifest claims; the "Create room" shortcut; and the share target (GET to "/" with the three params the home page
// reads). Runs in CI next to the name check:
//   node scripts/check-manifest.mjs
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const PUBLIC = join(import.meta.dirname, '../apps/web/public');
const problems = [];
const fail = (msg) => problems.push(msg);

let m;
try {
  m = JSON.parse(readFileSync(join(PUBLIC, 'manifest.webmanifest'), 'utf8'));
} catch (error) {
  console.error(`✗ manifest.webmanifest is not valid JSON: ${error.message}`);
  process.exit(1);
}

const TURKISH = /[çğıöşüÇĞİÖŞÜ]/;
if (m.lang !== 'en') fail(`lang is "${m.lang}", not "en"`);
for (const key of ['name', 'short_name', 'description']) {
  if (typeof m[key] !== 'string' || !m[key].trim()) fail(`${key} is missing`);
  else if (TURKISH.test(m[key])) fail(`${key} is not English: "${m[key]}"`);
}
if (m.name !== 'Sidelit') fail(`name is "${m.name}", not "Sidelit"`);
for (const key of ['id', 'start_url', 'scope']) if (typeof m[key] !== 'string' || !m[key].startsWith('/')) fail(`${key} must be a path on our own site`);
if (m.display !== 'standalone') fail('display must be "standalone"');
if (!/^#[0-9a-f]{6}$/i.test(m.theme_color ?? '')) fail('theme_color is missing');

/** Width × height of a PNG or JPEG file. */
function size(file) {
  const d = readFileSync(file);
  if (d[0] === 0x89 && d.toString('ascii', 1, 4) === 'PNG') return [d.readUInt32BE(16), d.readUInt32BE(20)];
  for (let i = 2; i < d.length - 9; ) {
    if (d[i] !== 0xff) break;
    const marker = d[i + 1];
    if (marker >= 0xc0 && marker <= 0xc3) return [d.readUInt16BE(i + 7), d.readUInt16BE(i + 5)];
    i += 2 + d.readUInt16BE(i + 2);
  }
  return null;
}
function checkImage(img, what) {
  const file = join(PUBLIC, img.src ?? '');
  if (!img.src?.startsWith('/') || !existsSync(file)) return fail(`${what} ${img.src} does not exist`);
  const real = size(file);
  if (!real || `${real[0]}x${real[1]}` !== img.sizes) fail(`${what} ${img.src} is ${real?.join('x')}, the manifest says ${img.sizes}`);
}

const icons = m.icons ?? [];
for (const icon of icons) checkImage(icon, 'icon');
if (!icons.some((i) => i.sizes === '192x192')) fail('no 192 × 192 icon');
if (!icons.some((i) => i.sizes === '512x512' && (i.purpose ?? 'any').includes('any'))) fail('no 512 × 512 icon');
if (!icons.some((i) => (i.purpose ?? '').includes('maskable'))) fail('no maskable icon');

const shots = m.screenshots ?? [];
for (const shot of shots) {
  checkImage(shot, 'screenshot');
  if (!shot.label || TURKISH.test(shot.label)) fail(`screenshot ${shot.src} needs an English label`);
}
for (const factor of ['narrow', 'wide']) if (!shots.some((s) => s.form_factor === factor)) fail(`no ${factor} screenshot`);

const create = (m.shortcuts ?? []).find((s) => /^\/\?new=1(&|$)/.test(s.url ?? ''));
if (!create || create.name !== 'Create room') fail('the "Create room" shortcut (/?new=1) is missing');

const share = m.share_target;
if (!share) fail('share_target is missing');
else {
  if (share.action !== '/' || (share.method ?? 'GET').toUpperCase() !== 'GET') fail('share_target must be a GET to "/" (home.ts reads it)');
  const p = share.params ?? {};
  if (p.url !== 'share_url' || p.text !== 'share_text' || p.title !== 'share_title') fail('share_target params must be share_url / share_text / share_title (home.ts `launched`)');
}

if (problems.length) {
  console.error(`✗ manifest.webmanifest:\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}
console.log(`✓ manifest.webmanifest: English, installable fields, ${icons.length} icons, ${shots.length} screenshots, shortcut, share target`);
