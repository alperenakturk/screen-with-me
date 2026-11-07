// The product is called Sidelit since card 6c (0.9.95). Fails when a file people see (site, extension, store pages,
// READMEs) still says the old name. Kept on purpose and not checked: the live address, the repo name, storage keys,
// message `source` strings, `swm` prefixes, the extension zip / folder name (an unpacked extension's id comes from
// its folder) and the publisher e-mail; the READMEs' one "formerly" line; docs/internal (history), except the store texts (`web-store.md`,
// `store-checklist.md`: what we paste into the stores).
import { execFileSync } from 'node:child_process';

const OLD = /screen ?with ?me/i;
const KEEP = [
  /swm-server\.workers\.dev/i,
  /screenwithme-site/i,
  /screenwithme-extension/i,
  // The store zip keeps the old folder-style name (store/screenwithme-<version>.zip).
  /screenwithme-(<version>|\$\{version\}|\d)/i,
  /screenwithme\.app@/i,
  /github\.com\/alperenakturk\/screen-with-me/i,
  /"name": "screen-with-me"/,
  /screen-with-me\.example\.workers\.dev/,
  /^_(Formerly|Eski adıyla) ScreenWithMe\._$/,
];
const files = execFileSync('git', ['ls-files', 'apps', 'packages', 'store', 'README.md', 'README.tr.md', 'docs/internal/web-store.md', 'docs/internal/store-checklist.md'], { encoding: 'utf8' })
  .split('\n')
  .filter((f) => /\.(ts|mjs|cjs|js|html|css|json|jsonc|webmanifest|md|txt|svg)$/.test(f));
const hits = [];
for (const file of files) {
  const text = execFileSync('git', ['show', `:${file}`], { encoding: 'utf8', maxBuffer: 64 << 20 });
  text.split('\n').forEach((line, i) => {
    if (!OLD.test(line)) return;
    const rest = KEEP.reduce((l, re) => l.replace(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'), ''), line);
    if (OLD.test(rest)) hits.push(`${file}:${i + 1}: ${line.trim().slice(0, 140)}`);
  });
}
if (hits.length) {
  console.error(`The old name is still shown in ${hits.length} place(s); it is Sidelit now:\n${hits.join('\n')}`);
  process.exit(1);
}
console.log(`✓ name check: ${files.length} files, no old name`);
