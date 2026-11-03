// Builds the extension icons (PNG), the site's PWA icons, logo.svg / logo-small.svg (favicon) and mascot.svg from the
// one source of their shapes, packages/shared/src/logo.ts (Sidelit D1 + N1 Glowbeam, card 6c). The logo has gradients,
// a vignette and a clip, so the PNGs are drawn by the browser: Chromium through Playwright (pre-installed in the cloud;
// on a computer `npx playwright install chromium` once). Run it again whenever the logo changes:
//
//   NODE_PATH=$(npm root -g) node --experimental-strip-types scripts/make-icons.mjs
//     → apps/extension/static/icon{16,32,48,128}.png
//       apps/web/public/icons/ (PWA: 192, 512, maskable, apple-touch)
//       apps/web/public/logo.svg, logo-small.svg, mascot.svg, mascot-waiting.svg (empty room)
//
// Sizes follow the design spec (docs/internal/design/logo-sidelit.md): the simple cut at 32 px and below, the full
// drawing from 33 px, the bleed version (no rounded corners) for maskable / apple-touch icons, which the phone masks.
// Store rule: the 128 px icon has a 96 px drawing with 16 px of space around it.

import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { logoSvg, mascotSvg } from '../packages/shared/src/logo.ts';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const STATIC = new URL('../apps/extension/static/', import.meta.url);
const ICONS = new URL('../apps/web/public/icons/', import.meta.url);
const PUBLIC = new URL('../apps/web/public/', import.meta.url);
mkdirSync(ICONS, { recursive: true });

/** One PNG: the SVG drawn at `size` px with `pad` px around it, on `bg` (or transparent). */
async function render(page, svg, size, pad = 0, bg = 'transparent') {
  const inner = size - pad * 2;
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0;background:${bg}"><div style="width:${size}px;height:${size}px;display:grid;place-items:center">` +
      `<img style="width:${inner}px;height:${inner}px;display:block" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}"></div></body></html>`,
  );
  await page.waitForFunction(() => document.querySelector('img').complete);
  return page.screenshot({ type: 'png', omitBackground: bg === 'transparent', clip: { x: 0, y: 0, width: size, height: size } });
}

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
const full = logoSvg({ id: 'sl' });
const small = logoSvg({ id: 'sl', small: true });
const bleed = logoSvg({ id: 'sl', bleed: true });

for (const [size, pad, svg] of [
  [16, 0, small],
  [32, 0, small],
  [48, 0, full],
  [128, 16, full],
]) {
  writeFileSync(new URL(`icon${size}.png`, STATIC), await render(page, svg, size, pad));
  console.log(`✓ icon${size}.png`);
}

// The site as a phone "app" (PWA, manifest.webmanifest): the normal icons keep a little room; the maskable and iOS icons
// are the bleed drawing filled to the edges (the phone cuts its own shape; the eyes and the triangle stay well inside).
for (const [name, size, pad, svg, bg] of [
  ['icon-192.png', 192, 8, full],
  ['icon-512.png', 512, 20, full],
  ['icon-maskable-512.png', 512, 0, bleed, '#08061a'],
  ['apple-touch-icon.png', 180, 0, bleed, '#08061a'],
]) {
  writeFileSync(new URL(name, ICONS), await render(page, svg, size, pad, bg));
  console.log(`✓ icons/${name}`);
}
await browser.close();

// The site's logo files: the full drawing (big uses), the simple cut (favicon) and the mascot.
writeFileSync(new URL('logo.svg', PUBLIC), full + '\n');
writeFileSync(new URL('logo-small.svg', PUBLIC), small + '\n');
writeFileSync(new URL('mascot.svg', PUBLIC), mascotSvg({ id: 'slm' }) + '\n');
writeFileSync(new URL('mascot-waiting.svg', PUBLIC), mascotSvg({ id: 'slm', mood: 'waiting' }) + '\n');
console.log('✓ logo.svg, logo-small.svg, mascot.svg, mascot-waiting.svg');
