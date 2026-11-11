// node scripts/check-docs.mjs [--against <git-ref>]
// Card DOCS1: CLAUDE.md holds rules and a map only, loaded by every session, so it must stay small. Card DOCS2: the same
// for docs/internal/STATUS.md and docs/internal/CARDS.md (finished material moves verbatim to docs/internal/archive/).
// - Always: fails when one of the watched files (WATCHED) is larger than its limit.
// - With --against <ref>: for each watched file at that git ref, every backticked identifier must still appear somewhere
//   in CLAUDE.md or a file under docs/, and every card heading (a `### ` line outside code fences) must still be a line
//   of one of them (proves a move, a slimming or a rewrite lost no technical fact and no card). Prints the missing ones.
//   CI runs it in the `changes` job (it runs on docs-only changes too) against the PR's base or the last commit on main.
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MAX_BYTES = 30 * 1024;
/** The files kept small, each with its limit (bytes). STATUS / CARDS aim at 15–20 KB; the limit leaves room for a round. */
export const WATCHED = [
  { file: 'CLAUDE.md', max: MAX_BYTES },
  { file: 'docs/internal/STATUS.md', max: 30 * 1024 },
  { file: 'docs/internal/CARDS.md', max: 30 * 1024 },
];

/** Too big? Returns a message, or null when the size is fine. */
export function sizeProblem(bytes, max = MAX_BYTES, file = 'CLAUDE.md') {
  return bytes > max ? `${file} is ${bytes} bytes, over the ${max}-byte limit: move reference to docs/internal/architecture/, history to CHANGELOG.md or docs/internal/archive/` : null;
}

const withoutFences = (markdown) => markdown.replace(/^```[^\n]*\n[\s\S]*?^```[^\n]*$/gm, '');

/** Every card heading (a `### ` line outside code fences), trimmed, without duplicates. */
export function headingsOf(markdown) {
  const found = new Set();
  for (const line of withoutFences(markdown).split('\n')) if (line.startsWith('### ')) found.add(line.trim());
  return [...found];
}

/** The headings of `oldText` that are a line of none of the `texts`. */
export function missingHeadings(oldText, texts) {
  const lines = new Set(texts.flatMap((t) => t.split('\n').map((l) => l.trim())));
  return headingsOf(oldText).filter((h) => !lines.has(h));
}

/** Every inline `code` span of a Markdown text (fenced blocks are skipped), trimmed, without duplicates. */
export function identifiersOf(markdown) {
  const text = withoutFences(markdown);
  const found = new Set();
  for (const m of text.matchAll(/`([^`\n]+)`/g)) {
    const id = m[1].trim();
    if (id) found.add(id);
  }
  return [...found];
}

/** The identifiers of `oldText` that appear in none of the `texts`. */
export function missingIdentifiers(oldText, texts) {
  return identifiersOf(oldText).filter((id) => !texts.some((t) => t.includes(id)));
}

function filesUnder(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...filesUnder(path));
    else out.push(path);
  }
  return out;
}

function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  let failed = false;

  for (const { file, max } of WATCHED) {
    const bytes = Buffer.byteLength(readFileSync(join(root, file), 'utf8'), 'utf8');
    const problem = sizeProblem(bytes, max, file);
    if (problem) {
      console.error(problem);
      failed = true;
    } else {
      console.log(`${file}: ${bytes} bytes (limit ${max}).`);
    }
  }

  const at = process.argv.indexOf('--against');
  if (at !== -1) {
    const ref = process.argv[at + 1];
    if (!ref) {
      console.error('--against needs a git ref, e.g. origin/main');
      process.exit(2);
    }
    const texts = [readFileSync(join(root, 'CLAUDE.md'), 'utf8'), ...filesUnder(join(root, 'docs')).map((f) => readFileSync(f, 'utf8'))];
    for (const { file } of WATCHED) {
      let old;
      try {
        old = execFileSync('git', ['show', `${ref}:${file}`], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
      } catch {
        console.log(`${file}: not in ${ref}, nothing to compare.`);
        continue;
      }
      const missing = missingIdentifiers(old, texts);
      const total = identifiersOf(old).length;
      if (missing.length) {
        console.error(`${missing.length} of ${total} backticked identifiers of ${file} at ${ref} are nowhere in CLAUDE.md or docs/:`);
        for (const id of missing) console.error(`  \`${id}\``);
        failed = true;
      } else {
        console.log(`All ${total} backticked identifiers of ${file} at ${ref} are still in CLAUDE.md or docs/.`);
      }
      const lost = missingHeadings(old, texts);
      const headings = headingsOf(old).length;
      if (lost.length) {
        console.error(`${lost.length} of ${headings} card headings of ${file} at ${ref} are no longer a line in CLAUDE.md or docs/ (move finished cards verbatim to docs/internal/archive/):`);
        for (const h of lost) console.error(`  ${h}`);
        failed = true;
      } else if (headings) {
        console.log(`All ${headings} card headings of ${file} at ${ref} are still in CLAUDE.md or docs/.`);
      }
    }
  }

  if (failed) process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
