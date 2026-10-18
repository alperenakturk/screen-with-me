// Eklenti simgelerini (PNG) üretir: mor yuvarlak kare + beyaz "oynat" üçgeni,
// sitenin favicon'uyla aynı tasarım. Dış paket yok; PNG'yi elle yazıyoruz.
//
//   node scripts/make-icons.mjs   → apps/extension/static/icon{16,32,48,128}.png
//
// Mağaza kuralı: 128'lik simgede çizim 96x96, etrafında 16 px boşluk olmalı.
// Araç çubuğundaki küçük simgeler ise kenara kadar dolu (küçükken okunsun).

import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const OUT = new URL('../apps/extension/static/', import.meta.url);
const SS = 4; // kenar yumuşatma: her pikseli 4x4 örnekle

function render(size, pad) {
  const art = size - pad * 2;
  const radius = art * 0.25;
  // Üçgen: 32'lik favicon ızgarasında (12,9) (24,16) (12,23)
  const tri = [
    [12, 9],
    [24, 16],
    [12, 23],
  ].map(([x, y]) => [pad + (x / 32) * art, pad + (y / 32) * art]);

  const px = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let bg = 0;
      let fg = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const fx = x + (sx + 0.5) / SS;
          const fy = y + (sy + 0.5) / SS;
          if (inRoundRect(fx - pad, fy - pad, art, radius)) {
            bg++;
            if (inTriangle(fx, fy, tri)) fg++;
          }
        }
      }
      const n = SS * SS;
      const alpha = bg / n;
      const white = bg ? fg / bg : 0;
      // Çapraz renk geçişi: sol üst #8f74ff → sağ alt #5b3cf0
      const t = Math.min(1, Math.max(0, (x + y - pad * 2) / (art * 2)));
      const base = [lerp(0x8f, 0x5b, t), lerp(0x74, 0x3c, t), lerp(0xff, 0xf0, t)];
      const i = (y * size + x) * 4;
      for (let c = 0; c < 3; c++) px[i + c] = Math.round(lerp(base[c], 255, white));
      px[i + 3] = Math.round(alpha * 255);
    }
  }
  return png(size, size, px);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function inRoundRect(x, y, s, r) {
  if (x < 0 || y < 0 || x > s || y > s) return false;
  const cx = Math.min(Math.max(x, r), s - r);
  const cy = Math.min(Math.max(y, r), s - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

function inTriangle(x, y, [a, b, c]) {
  const side = (p, q) => (q[0] - p[0]) * (y - p[1]) - (q[1] - p[1]) * (x - p[0]);
  const d1 = side(a, b);
  const d2 = side(b, c);
  const d3 = side(c, a);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
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
