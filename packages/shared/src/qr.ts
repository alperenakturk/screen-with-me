// A small QR code encoder (byte mode, error correction level M, versions 1–6: up to 106 bytes), written in-house so
// no third-party code ships to users. Used for the TV pairing screen: the phone's camera opens the pairing link.
// Reference: ISO/IEC 18004 (structure, Reed–Solomon over GF(256) with 0x11D, format bits, masks and penalties).

/** Per version (index = version): total codewords, error-correction codewords per block, number of blocks (level M). */
const VERSIONS: ReadonlyArray<readonly [total: number, ecPerBlock: number, blocks: number]> = [
  [0, 0, 0],
  [26, 10, 1],
  [44, 16, 1],
  [70, 26, 1],
  [100, 18, 2],
  [134, 24, 2],
  [172, 16, 4],
];
const ALIGN: ReadonlyArray<readonly number[]> = [[], [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34]];

// GF(256) tables.
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]!;
}
const mul = (a: number, b: number) => (a === 0 || b === 0 ? 0 : EXP[LOG[a]! + LOG[b]!]!);

function rsRemainder(data: Uint8Array, ecLen: number): Uint8Array {
  // Generator polynomial (x - α^0)(x - α^1)…, highest degree first, leading 1 dropped.
  let gen = [1];
  for (let i = 0; i < ecLen; i++) {
    const next = new Array<number>(gen.length + 1).fill(0);
    for (let j = 0; j < gen.length; j++) {
      next[j] = next[j]! ^ gen[j]!;
      next[j + 1] = next[j + 1]! ^ mul(gen[j]!, EXP[i]!);
    }
    gen = next;
  }
  const rem = new Uint8Array(ecLen);
  for (const byte of data) {
    const factor = byte ^ rem[0]!;
    rem.copyWithin(0, 1);
    rem[ecLen - 1] = 0;
    for (let j = 0; j < ecLen; j++) rem[j] = rem[j]! ^ mul(gen[j + 1]!, factor);
  }
  return rem;
}

/** The QR code for `text` as a square of booleans (true = dark), without the quiet zone. Throws if too long. */
export function qrMatrix(text: string): boolean[][] {
  const bytes = new TextEncoder().encode(text);
  let version = 1;
  const dataCap = (v: number) => VERSIONS[v]![0] - VERSIONS[v]![1] * VERSIONS[v]![2];
  while (version < VERSIONS.length && dataCap(version) * 8 < 4 + 8 + bytes.length * 8) version++;
  if (version >= VERSIONS.length) throw new Error('Text too long for a QR code');
  const [total, ecLen, blocks] = VERSIONS[version]!;
  const dataLen = dataCap(version);

  // Bit stream: mode 0100 (bytes), 8-bit length, data, terminator, padding.
  const bits: number[] = [];
  const put = (value: number, n: number) => {
    for (let i = n - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };
  put(0b0100, 4);
  put(bytes.length, 8);
  for (const b of bytes) put(b, 8);
  put(0, Math.min(4, dataLen * 8 - bits.length));
  while (bits.length % 8) bits.push(0);
  const data = new Uint8Array(dataLen);
  for (let i = 0; i < bits.length / 8; i++) data[i] = parseInt(bits.slice(i * 8, i * 8 + 8).join(''), 2);
  for (let i = bits.length / 8, pad = 0; i < dataLen; i++, pad++) data[i] = pad % 2 ? 0x11 : 0xec;

  // Split into blocks (all the same size at level M for versions 1–6), add error correction, interleave.
  const perBlock = dataLen / blocks;
  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];
  for (let b = 0; b < blocks; b++) {
    const block = data.subarray(b * perBlock, (b + 1) * perBlock);
    dataBlocks.push(block);
    ecBlocks.push(rsRemainder(block, ecLen));
  }
  const codewords: number[] = [];
  for (let i = 0; i < perBlock; i++) for (const block of dataBlocks) codewords.push(block[i]!);
  for (let i = 0; i < ecLen; i++) for (const block of ecBlocks) codewords.push(block[i]!);
  if (codewords.length !== total) throw new Error('QR layout error');

  const size = version * 4 + 17;
  const dark: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const fixed: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const set = (r: number, c: number, on: boolean) => {
    if (r < 0 || c < 0 || r >= size || c >= size) return;
    dark[r]![c] = on;
    fixed[r]![c] = true;
  };
  // Finder patterns with their white separators.
  for (const [fr, fc] of [
    [0, 0],
    [0, size - 7],
    [size - 7, 0],
  ] as const) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const ring = Math.max(Math.abs(r - 3), Math.abs(c - 3));
        set(fr + r, fc + c, ring !== 2 && ring !== 4);
      }
    }
  }
  // Alignment patterns (not over the finders).
  const align = ALIGN[version]!;
  for (const r of align) {
    for (const c of align) {
      if (fixed[r]![c]) continue;
      for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) set(r + dr, c + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
    }
  }
  // Timing patterns.
  for (let i = 8; i < size - 8; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }
  // The dark module and the format areas (filled in after the mask is chosen).
  set(size - 8, 8, true);
  for (let i = 0; i < 9; i++) {
    if (!fixed[8]![i]) set(8, i, false);
    if (!fixed[i]![8]) set(i, 8, false);
  }
  for (let i = 0; i < 8; i++) {
    set(8, size - 1 - i, false);
    if (i < 7) set(size - 1 - i, 8, false);
  }

  // Data, in the zigzag from the bottom right, two columns at a time (column 6 is skipped).
  const stream: number[] = [];
  for (const cw of codewords) for (let i = 7; i >= 0; i--) stream.push((cw >>> i) & 1);
  let k = 0;
  let upward = true;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let n = 0; n < size; n++) {
      const r = upward ? size - 1 - n : n;
      for (const c of [right, right - 1]) {
        if (fixed[r]![c]) continue;
        dark[r]![c] = k < stream.length ? stream[k] === 1 : false;
        k++;
      }
    }
    upward = !upward;
  }

  const masks: Array<(r: number, c: number) => boolean> = [
    (r, c) => (r + c) % 2 === 0,
    (r) => r % 2 === 0,
    (_r, c) => c % 3 === 0,
    (r, c) => (r + c) % 3 === 0,
    (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
    (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
    (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
    (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
  ];
  const withMask = (m: number): boolean[][] => {
    const out = dark.map((row) => row.slice());
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (!fixed[r]![c] && masks[m]!(r, c)) out[r]![c] = !out[r]![c];
    // Format bits: level M (00) + mask, BCH(15,5), XOR 0x5412.
    const info = m;
    let rem = info;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const format = ((info << 10) | rem) ^ 0x5412;
    const bit = (i: number) => ((format >>> i) & 1) === 1;
    // (row, column): first copy around the top-left finder, second split between the other two.
    for (let i = 0; i <= 5; i++) out[i]![8] = bit(i);
    out[7]![8] = bit(6);
    out[8]![8] = bit(7);
    out[8]![7] = bit(8);
    for (let i = 9; i < 15; i++) out[8]![14 - i] = bit(i);
    for (let i = 0; i < 8; i++) out[8]![size - 1 - i] = bit(i);
    for (let i = 8; i < 15; i++) out[size - 15 + i]![8] = bit(i);
    out[size - 8]![8] = true;
    return out;
  };

  let best: boolean[][] = withMask(0);
  let bestScore = Infinity;
  for (let m = 0; m < 8; m++) {
    const candidate = withMask(m);
    const score = penalty(candidate);
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best;
}

/** The four penalty rules: runs, 2×2 blocks, finder-like patterns, dark/light balance. */
function penalty(m: boolean[][]): number {
  const size = m.length;
  let score = 0;
  const line = (get: (i: number) => boolean) => {
    let run = 1;
    for (let i = 1; i < size; i++) {
      if (get(i) === get(i - 1)) {
        run++;
        if (run === 5) score += 3;
        else if (run > 5) score += 1;
      } else run = 1;
    }
    for (let i = 0; i + 10 < size; i++) {
      const p = Array.from({ length: 11 }, (_, j) => get(i + j));
      const a = [true, false, true, true, true, false, true, false, false, false, false];
      if (a.every((v, j) => p[j] === v) || a.every((v, j) => p[10 - j] === v)) score += 40;
    }
  };
  for (let r = 0; r < size; r++) line((i) => m[r]![i]!);
  for (let c = 0; c < size; c++) line((i) => m[i]![c]!);
  let darkCount = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (m[r]![c]) darkCount++;
      if (r + 1 < size && c + 1 < size && m[r]![c] === m[r + 1]![c] && m[r]![c] === m[r]![c + 1] && m[r]![c] === m[r + 1]![c + 1]) score += 3;
    }
  }
  score += Math.floor(Math.abs((darkCount * 100) / (size * size) - 50) / 5) * 10;
  return score;
}

/** The QR code as an SVG string (dark modules as one path, 4-module quiet zone, white background). */
export function qrSvg(text: string): string {
  const m = qrMatrix(text);
  const size = m.length + 8;
  let path = '';
  for (let r = 0; r < m.length; r++) for (let c = 0; c < m.length; c++) if (m[r]![c]) path += `M${c + 4} ${r + 4}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#fff"/><path d="${path}" fill="#000"/></svg>`;
}
