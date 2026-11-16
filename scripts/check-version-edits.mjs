// Card CI3b: a PR never sets a version (CI numbers every release, scripts/release-version.mjs). Fails a PR that
//   - changes the footer version (apps/web/index.html) or the extension version (apps/extension/package.json),
//   - adds a version heading to CHANGELOG.md for a version not tagged yet (`scripts/changelog.mjs fold` adds only
//     tagged ones), or
//   - leaves the footer and the extension on different numbers.
// The user-facing lines go into changelog/next/<branch>.md instead.
//   node scripts/check-version-edits.mjs <base ref>      (CI: origin/<the PR's base branch>)
import { execFileSync } from 'node:child_process';
import { EXTENSION_FILE, FOOTER_FILE, originTags, shownVersions } from './release-version.mjs';

/** What is wrong with a PR's change, as plain sentences (none = fine). */
export function violations({ base, head, addedChangelogLines, tagged }) {
  const out = [];
  const b = shownVersions(base), h = shownVersions(head);
  if (b.footer !== h.footer) out.push(`the footer version changed (${b.footer} → ${h.footer}) in ${FOOTER_FILE}`);
  if (b.extension !== h.extension) out.push(`the extension version changed (${b.extension} → ${h.extension}) in ${EXTENSION_FILE}`);
  if (h.footer !== h.extension) out.push(`the footer (${h.footer}) and the extension (${h.extension}) show different numbers`);
  for (const line of addedChangelogLines) {
    const v = line.match(/^### (\d+(?:\.\d+)+) — /)?.[1];
    if (v && !tagged.has(v)) out.push(`CHANGELOG.md gets a block for ${v}, which is not tagged yet`);
  }
  return out;
}

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 26 });

function main() {
  const base = process.argv[2];
  if (!base) { console.error('usage: node scripts/check-version-edits.mjs <base ref>'); process.exit(2); }
  const at = (ref) => ({ footer: git('show', `${ref}:${FOOTER_FILE}`), extension: git('show', `${ref}:${EXTENSION_FILE}`) });
  const mergeBase = git('merge-base', base, 'HEAD').trim();
  const addedChangelogLines = git('diff', '--unified=0', mergeBase, 'HEAD', '--', 'CHANGELOG.md')
    .split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')).map((l) => l.slice(1));
  const tagged = new Set(originTags().map((t) => t.slice(1)));
  const found = violations({ base: at(mergeBase), head: at('HEAD'), addedChangelogLines, tagged });
  if (!found.length) { console.log('✓ no version set by hand (CI numbers the release; notes go in changelog/next/)'); return; }
  for (const f of found) console.log(`::error::${f}`);
  console.log('A PR carries no version (card CI3b): CI gives the release its number when it goes live. Put the user-facing lines in changelog/next/<branch>.md instead.');
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
