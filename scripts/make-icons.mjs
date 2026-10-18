// Eklenti simgelerini (PNG) ve sitenin logo.svg'sini üretir. Logonun şekilleri
// packages/shared/src/logo.ts'te; burada onları piksel piksel boyuyoruz (dış paket yok,
// PNG'yi elle yazıyoruz). Logo değişirse bu betiği yeniden çalıştır.
//
//   node scripts/make-icons.mjs   → apps/extension/static/icon{16,32,48,128}.png
//                                   apps/web/public/logo.svg
//
// Mağaza kuralı: 128'lik simgede çizim 96x96, etrafında 16 px boşluk olmalı.
// Araç çubuğundaki küçük simgeler ise kenara kadar dolu (küçükken okunsun).

import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import {
  LOGO_FROM, LOGO_RADIUS, LOGO_SHAPES, LOGO_SIZE, LOGO_TO, logoSvg,
} from '../packages/shared/src/logo.ts';

const OUT = new URL('../apps/extension/static/', import.meta.url);
const SS = 6; // kenar yumuşatma: her pikseli 6x6 örnekle
// Duraklat çubukları sadece sitedeki canlandırmada görünür.
const SHAPES = LOGO_SHAPES.filter((s) => s.part !== 'pause');

function render(size, pad) {
  const scale = (size - pad * 2) / LOGO_SIZE; // 64'lük ızgaradan piksele
  const px = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sum = [0, 0, 0, 0];
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          // Örnek noktayı logo ızgarasına çevir
          const gx = (x + (sx + 0.5) / SS - pad) / scale;
          const gy = (y + (sy + 0.5) / SS - pad) / scale;
          const color = colorAt(gx, gy);
          if (!color) continue;
          for (let c = 0; c < 3; c++) sum[c] += color[c];
          sum[3]++;
        }
      }
      const i = (y * size + x) * 4;
      // Renk = kapsanan örneklerin ortalaması, saydamlık = kapsanan oran
      for (let c = 0; c < 3; c++) px[i + c] = sum[3] ? Math.round(sum[c] / sum[3]) : 0;
      px[i + 3] = Math.round((sum[3] / (SS * SS)) * 255);
    }
  }
  return png(size, size, px);
}

/** Izgaradaki bir noktanın rengi (üstteki şekil kazanır); logonun dışındaysa null. */
function colorAt(x, y) {
  if (!inRoundRect(x, y, 0, 0, LOGO_SIZE, LOGO_SIZE, LOGO_RADIUS)) return null;
  // Çapraz renk geçişi: sol üst → sağ alt
  const t = Math.min(1, Math.max(0, (x + y) / (LOGO_SIZE * 2)));
  const from = hex(LOGO_FROM);
  const to = hex(LOGO_TO);
  let color = from.map((v, c) => lerp(v, to[c], t));
  for (const s of SHAPES) if (inShape(s, x, y)) color = hex(s.fill);
  return color;
}

function inShape(s, x, y) {
  switch (s.kind) {
    case 'ellipse':
      return ((x - s.cx) / s.rx) ** 2 + ((y - s.cy) / s.ry) ** 2 <= 1;
    case 'rect':
      return inRoundRect(x, y, s.x, s.y, s.w, s.h, s.r);
    case 'triangle':
      // Köşesi yuvarlatılmış üçgen = üçgenin içi + kenarlara 'round' kadar yakın noktalar
      return inTriangle(x, y, s.points) || s.points.some((p, i) => distToSegment(x, y, p, s.points[(i + 1) % 3]) <= s.round);
  }
}

function hex(h) {
  return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function inRoundRect(x, y, rx, ry, w, h, r) {
  if (x < rx || y < ry || x > rx + w || y > ry + h) return false;
  const cx = Math.min(Math.max(x, rx + r), rx + w - r);
  const cy = Math.min(Math.max(y, ry + r), ry + h - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

function inTriangle(x, y, [a, b, c]) {
  const side = (p, q) => (q[0] - p[0]) * (y - p[1]) - (q[1] - p[1]) * (x - p[0]);
  const d1 = side(a, b);
  const d2 = side(b, c);
  const d3 = side(c, a);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}

function distToSegment(x, y, [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - (ax + t * dx), y - (ay + t * dy));
}

// --- En basit PNG yazıcı (RGBA, filtresiz satırlar) ---
const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit derinliği
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const [size, pad] of [
  [16, 0],
  [32, 0],
  [48, 0],
  [128, 16],
]) {
  writeFileSync(new URL(`icon${size}.png`, OUT), render(size, pad));
  console.log(`✓ icon${size}.png`);
}

// Sitenin favicon'u ve eklenti sayfasındaki büyük simge
writeFileSync(new URL('../apps/web/public/logo.svg', import.meta.url), logoSvg() + '\n');
console.log('✓ logo.svg');
