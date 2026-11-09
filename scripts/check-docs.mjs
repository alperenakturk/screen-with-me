// node scripts/check-docs.mjs [--against <git-ref>]
// Card DOCS1: CLAUDE.md holds rules and a map only, loaded by every session, so it must stay small.
// - Always: fails when CLAUDE.md is larger than MAX_BYTES.
// - With --against <ref>: every backticked identifier of CLAUDE.md at that git ref must still appear somewhere in
//   today's CLAUDE.md or in a file under docs/ (proves a move or rewrite lost no technical fact). Prints the missing ones.
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MAX_BYTES = 30 * 1024;

/** Too big? Returns a message, or null when the size is fine. */
export function sizeProblem(bytes, max = MAX_BYTES) {
  return bytes > max ? `CLAUDE.md is ${bytes} bytes, over the ${max}-byte limit: move reference to docs/internal/architecture/, history to CHANGELOG.md or docs/internal/archive/` : null;
}

/** Every inline `code` span of a Markdown text (fenced blocks are skipped), trimmed, without duplicates. */
export function identifiersOf(markdown) {
  const text = markdown.replace(/^```[^\n]*\n[\s\S]*?^```[^\n]*$/gm, '');
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
  const current = readFileSync(join(root, 'CLAUDE.md'), 'utf8');
  let failed = false;

  const bytes = Buffer.byteLength(current, 'utf8');
  const problem = sizeProblem(bytes);
  if (problem) {
    console.error(problem);
    failed = true;
  } else {
    console.log(`CLAUDE.md: ${bytes} bytes (limit ${MAX_BYTES}).`);
  }

  const at = process.argv.indexOf('--against');
  if (at !== -1) {
    const ref = process.argv[at + 1];
    if (!ref) {
      console.error('--against needs a git ref, e.g. origin/main');
      process.exit(2);
    }
    const old = execFileSync('git', ['show', `${ref}:CLAUDE.md`], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    const texts = [current, ...filesUnder(join(root, 'docs')).map((f) => readFileSync(f, 'utf8'))];
    const missing = missingIdentifiers(old, texts);
    const total = identifiersOf(old).length;
    if (missing.length) {
      console.error(`${missing.length} of ${total} backticked identifiers of CLAUDE.md at ${ref} are nowhere in CLAUDE.md or docs/:`);
      for (const id of missing) console.error(`  \`${id}\``);
      failed = true;
    } else {
      console.log(`All ${total} backticked identifiers of CLAUDE.md at ${ref} are still in CLAUDE.md or docs/.`);
    }
  }

  if (failed) process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
