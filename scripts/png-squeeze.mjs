// Lossless PNG re-compression (card PERF1, win 5), no dependencies: decodes an 8-bit truecolour / greyscale PNG
// (with or without alpha, not interlaced), picks the best of the five row filters per row (the smallest sum of
// absolute values, libpng's heuristic) and deflates at level 9. The pixels stay exactly the same: the result is decoded
// again and compared byte for byte before it is written, and it is written only when it is smaller.
// Ancillary chunks (text, time, colour profiles from the screenshotter) are dropped; tRNS, PLTE, gAMA, sRGB are kept.
//
//   node scripts/png-squeeze.mjs <file.png>…        (prints before → after per file)
//   import { squeezePng } from './png-squeeze.mjs'  (Buffer in, Buffer out)
import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync, inflateSync, crc32 } from 'node:zlib';

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const KEEP = new Set(['PLTE', 'tRNS', 'gAMA', 'sRGB']);
const CHANNELS = { 0: 1, 2: 3, 4: 2, 6: 4 };

function chunks(png) {
  if (!png.subarray(0, 8).equals(SIGNATURE)) throw new Error('not a PNG');
  const out = [];
  for (let at = 8; at < png.length; ) {
    const length = png.readUInt32BE(at);
    const type = png.toString('latin1', at + 4, at + 8);
    out.push({ type, data: png.subarray(at + 8, at + 8 + length) });
    at += 12 + length;
  }
  return out;
}

/** The raw (unfiltered) rows of an image, and the header facts the encoder needs. */
function decode(png) {
  const list = chunks(png);
  const head = list.find((c) => c.type === 'IHDR').data;
  const width = head.readUInt32BE(0);
  const height = head.readUInt32BE(4);
  const [depth, colour, , , interlace] = head.subarray(8);
  if (depth !== 8 || !(colour in CHANNELS) || interlace !== 0) return null;
  const bpp = CHANNELS[colour];
  const stride = width * bpp;
  const data = inflateSync(Buffer.concat(list.filter((c) => c.type === 'IDAT').map((c) => c.data)));
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = data[y * (stride + 1)];
    const line = data.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const row = raw.subarray(y * stride, (y + 1) * stride);
    const up = y ? raw.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? row[x - bpp] : 0;
      const b = up ? up[x] : 0;
      const c = up && x >= bpp ? up[x - bpp] : 0;
      const pred = filter === 0 ? 0 : filter === 1 ? a : filter === 2 ? b : filter === 3 ? (a + b) >> 1 : paeth(a, b, c);
      row[x] = (line[x] + pred) & 255;
    }
  }
  return { list, head, width, height, bpp, stride, raw };
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/** Filters every row with the filter whose output has the smallest sum of absolute (signed) values. */
function filterRows({ height, bpp, stride, raw }) {
  const out = Buffer.alloc((stride + 1) * height);
  const tries = [0, 1, 2, 3, 4].map(() => Buffer.alloc(stride));
  for (let y = 0; y < height; y++) {
    const row = raw.subarray(y * stride, (y + 1) * stride);
    const up = y ? raw.subarray((y - 1) * stride, y * stride) : null;
    let best = 0;
    let bestScore = Infinity;
    for (let f = 0; f < 5; f++) {
      const t = tries[f];
      let score = 0;
      for (let x = 0; x < stride; x++) {
        const a = x >= bpp ? row[x - bpp] : 0;
        const b = up ? up[x] : 0;
        const c = up && x >= bpp ? up[x - bpp] : 0;
        const pred = f === 0 ? 0 : f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : paeth(a, b, c);
        const v = (row[x] - pred) & 255;
        t[x] = v;
        score += v < 128 ? v : 256 - v;
      }
      if (score < bestScore) {
        bestScore = score;
        best = f;
      }
    }
    out[y * (stride + 1)] = best;
    tries[best].copy(out, y * (stride + 1) + 1);
  }
  return out;
}

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'latin1');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])) >>> 0, 0);
  return Buffer.concat([head, data, crc]);
}

/** The same image, smaller when it can be; the input itself when not (or when it is a kind this doesn't handle). */
export function squeezePng(png) {
  const image = decode(png);
  if (!image) return png;
  const idat = deflateSync(filterRows(image), { level: 9, memLevel: 9 });
  const extra = image.list.filter((c) => KEEP.has(c.type)).map((c) => chunk(c.type, c.data));
  const out = Buffer.concat([SIGNATURE, chunk('IHDR', image.head), ...extra, chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
  const again = decode(out);
  if (!again || !again.raw.equals(image.raw)) throw new Error('png-squeeze: the pixels changed, nothing written');
  return out.length < png.length ? out : png;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const file of process.argv.slice(2)) {
    const before = readFileSync(file);
    const after = squeezePng(before);
    if (after !== before) writeFileSync(file, after);
    console.log(`${file}: ${(before.length / 1024).toFixed(1)} → ${(after.length / 1024).toFixed(1)} kB`);
  }
}
