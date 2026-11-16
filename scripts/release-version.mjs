// Card CI3b (Planner, 16 Nov 2026): CI numbers every release. PRs carry no version; main's deploy job gives the batch
// it deploys the next number and builds the site's footer and the extension with it, and the `tag` job tags it after
// the green live e2e. The tags are the one source of truth:
//   next = the series in release-series.txt (the first three parts, e.g. 0.9.97) + the highest fourth part already
//   tagged in that series + 1 (0.9.97.140 tagged → 0.9.97.141).
// A run whose live e2e fails makes no tag, so the next run gets the same number again: no number is ever burnt.
// The third part moves only when the owner says so: release-series.txt becomes e.g. 0.9.98, and the next release is
// 0.9.98.1.
//   node scripts/release-version.mjs           prints the next number
//   node scripts/release-version.mjs --apply   writes it into the footer (apps/web/index.html) and the extension
//                                              (apps/extension/package.json) of this checkout only (never committed),
//                                              and `version=<n>` into $GITHUB_OUTPUT
import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';

export const SERIES_FILE = 'release-series.txt';
export const FOOTER_FILE = 'apps/web/index.html';
export const EXTENSION_FILE = 'apps/extension/package.json';
const FOOTER = /(class="footer-version">v)(\d+(?:\.\d+)+)(<)/;

/** The series from release-series.txt's text: three numeric parts. */
export function parseSeries(text) {
  const series = text.trim().split('\n')[0].trim();
  if (!/^\d+\.\d+\.\d+$/.test(series)) throw new Error(`${SERIES_FILE} must hold three numeric parts, like 0.9.97 (found "${series}")`);
  return series;
}

/** The next number in `series`, from tag names (`v0.9.97.140`, other tags ignored). */
export function nextVersion(tags, series) {
  let top = 0;
  for (const tag of tags) {
    const m = tag.match(/^v(\d+\.\d+\.\d+)\.(\d+)$/);
    if (m && m[1] === series) top = Math.max(top, Number(m[2]));
  }
  return `${series}.${top + 1}`;
}

/** The footer's and the extension's text with `version` written in (both always the same number). */
export function applyVersion({ footer, extension }, version) {
  if (!FOOTER.test(footer)) throw new Error(`no footer version in ${FOOTER_FILE}`);
  const pkg = JSON.parse(extension);
  pkg.version = version;
  return { footer: footer.replace(FOOTER, `$1${version}$3`), extension: `${JSON.stringify(pkg, null, 2)}\n` };
}

/** The version the footer and the extension of a checkout show (they must match). */
export function shownVersions({ footer, extension }) {
  return { footer: footer.match(FOOTER)?.[2] ?? null, extension: JSON.parse(extension).version ?? null };
}

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

/** Every tag on origin (no fetch needed). */
export function originTags() {
  return git('ls-remote', '--tags', '--refs', 'origin', 'v*').split('\n').filter(Boolean).map((l) => l.split('refs/tags/')[1]);
}

function main() {
  const series = parseSeries(readFileSync(SERIES_FILE, 'utf8'));
  const version = nextVersion(originTags(), series);
  if (process.argv.includes('--apply')) {
    const out = applyVersion({ footer: readFileSync(FOOTER_FILE, 'utf8'), extension: readFileSync(EXTENSION_FILE, 'utf8') }, version);
    writeFileSync(FOOTER_FILE, out.footer);
    writeFileSync(EXTENSION_FILE, out.extension);
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `version=${version}\n`);
    console.log(`This release is ${version} (footer and extension).`);
  } else console.log(version);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
