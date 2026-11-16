// Card CI3b: the release notes of a CI-numbered release, from the files PRs add in changelog/next/.
//   node scripts/changelog.mjs notes <version> [<sha>]   the block for the release tagged v<version> (default HEAD):
//                                                         the files added since the previous tag
//   node scripts/changelog.mjs fold                       writes one block per tag not yet in CHANGELOG.md, newest
//                                                         first, and deletes the files it folded (a docs PR)
import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';

export const DIR = 'changelog/next/';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** A fragment file (not the folder's README). */
export const isFragment = (path) => path.startsWith(DIR) && path.endsWith('.md') && path !== `${DIR}README.md`;

/** "16 Nov" from an ISO date (UTC). */
export function shortDate(iso) {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** One CHANGELOG block: heading + the fragments' lines (each fragment's text as written, trimmed). */
export function block(version, date, fragments) {
  const body = fragments.map((f) => f.trim()).filter(Boolean).join('\n');
  return `### ${version} — ${date}\n\n${body || '- Small fixes and checks behind the scenes.'}\n`;
}

/** Compares versions part by part. */
export function compareVersions(a, b) {
  const x = a.split('.').map(Number), y = b.split('.').map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) - (y[i] ?? 0);
  return 0;
}

/** The versions CHANGELOG.md already has a block for. */
export const foldedVersions = (changelog) => new Set([...changelog.matchAll(/^### (\d+(?:\.\d+)+) — /gm)].map((m) => m[1]));

/** CHANGELOG.md with `blocks` (newest first) put above its newest block. */
export function insertBlocks(changelog, blocks) {
  if (!blocks.length) return changelog;
  const at = changelog.search(/^### /m);
  const text = `${blocks.join('\n')}\n`;
  return at < 0 ? `${changelog.trimEnd()}\n\n${text}` : `${changelog.slice(0, at)}${text}${changelog.slice(at)}`;
}

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

/** Tags `v<version>` (CI-numbered ones and older), oldest first. */
function tagsAscending() {
  return git('tag', '--list', 'v*').split('\n').filter((t) => /^v\d+(\.\d+)+$/.test(t)).map((t) => t.slice(1)).sort(compareVersions);
}

/** The fragments added between two commits (paths), read at `to`. */
function added(from, to) {
  const paths = git('diff', '--name-only', '--diff-filter=A', from ? `${from}` : `${to}~1`, to, '--', DIR).split('\n').filter(isFragment);
  return paths.map((p) => ({ path: p, text: git('show', `${to}:${p}`) }));
}

/** The notes of the release `version` at `sha`: the files added since the tag before it. */
export function notesFor(version, sha = 'HEAD') {
  const before = tagsAscending().filter((v) => compareVersions(v, version) < 0).at(-1);
  const date = git('log', '-1', '--format=%cI', sha);
  return block(version, shortDate(date), added(before ? `v${before}` : null, sha).map((f) => f.text));
}

function fold() {
  const changelog = readFileSync('CHANGELOG.md', 'utf8');
  const done = foldedVersions(changelog);
  const tags = tagsAscending();
  const blocks = [];
  const folded = new Set();
  tags.forEach((v, i) => {
    if (done.has(v) || i === 0) return;
    const frags = added(`v${tags[i - 1]}`, `v${v}`);
    if (!frags.length) return; // a per-PR release before CI3b: its block was written by hand
    blocks.unshift(block(v, shortDate(git('log', '-1', '--format=%cI', `v${v}`)), frags.map((f) => f.text)));
    for (const f of frags) folded.add(f.path);
  });
  writeFileSync('CHANGELOG.md', insertBlocks(changelog, blocks));
  for (const p of folded) rmSync(p, { force: true });
  console.log(blocks.length ? `Folded ${blocks.length} release(s) and ${folded.size} file(s) into CHANGELOG.md.` : 'Nothing to fold.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, version, sha] = process.argv.slice(2);
  if (cmd === 'notes' && version) process.stdout.write(notesFor(version, sha));
  else if (cmd === 'fold') fold();
  else { console.error('usage: node scripts/changelog.mjs notes <version> [<sha>] | fold'); process.exit(2); }
}
