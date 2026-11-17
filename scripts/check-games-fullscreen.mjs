// Card GW3 (owner, 17 Nov 2026: "only videos ever go fullscreen"): no game, side game or game window asks for the
// browser's full screen. A game's "big" mode is the video's place (`games/stage.ts`). Runs in CI next to the game texts:
//   node scripts/check-games-fullscreen.mjs [folder or file …]   (default: apps/web/src/games)
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const FULLSCREEN = /\b(?:request|webkitRequest|mozRequest|msRequest)Full[Ss]creen\b|\bwebkitEnterFullscreen\b/;

/** Every .ts / .js file under the given folders and files. */
function files(paths) {
  const out = [];
  for (const p of paths) {
    if (statSync(p).isDirectory()) out.push(...files(readdirSync(p).map((n) => join(p, n))));
    else if (/\.(ts|js|mjs)$/.test(p) && !p.endsWith('.test.ts')) out.push(p);
  }
  return out;
}

const paths = process.argv.slice(2);
const found = [];
for (const file of files(paths.length ? paths : ['apps/web/src/games'])) {
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      // Comments may name it (they say why it is not used).
      const code = line.replace(/\/\/.*$/, '').replace(/^\s*\*.*$/, '');
      if (FULLSCREEN.test(code)) found.push(`${file}:${i + 1}: ${line.trim()}`);
    });
}
if (found.length) {
  console.error(`✗ A game asks for the browser's full screen (GW3: only videos go fullscreen; use the video's place):\n${found.join('\n')}`);
  process.exit(1);
}
console.log('✓ No game asks for the browser’s full screen');
