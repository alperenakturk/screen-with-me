// Card GR1: a tab opened before a deploy keeps working after it. Vite names every file in assets/ by its content's
// hash, and a deploy used to replace the whole set: an open tab that then lazily loaded a game (or any other chunk)
// asked for a file that was gone, got the site's index.html back (single-page fallback), and main.ts reloaded the page
// as for a new version, throwing the person out of the room.
// Before each deploy (the deploy job, after the build) this copies the files of the builds still in use from the live
// site into dist/assets, so the new deploy serves them too, for KEEP_DAYS after they were replaced:
//   - the live site's assets-kept.json says which files its build had (`build`) and which older ones it still keeps
//     (`kept`: file → when it was replaced); without one (the first deploy with this script), the live build's files are
//     found by following the links from its pages and chunks;
//   - every live file the new build doesn't have is kept (replaced now), and every older kept file younger than
//     KEEP_DAYS stays; each is downloaded from the live site (a 200 that is not the HTML fallback) into dist/assets;
//   - dist/assets-kept.json records the new build and the kept files for the next deploy.
// Never fails the deploy: a file it can't fetch is a warning (that tab then reloads as before).
//   node scripts/keep-assets.mjs <live origin> [dist dir]
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const KEEP_DAYS = 7;
const DAY = 86_400_000;
/** A hashed asset file name as Vite writes it (name-<8 chars>.ext). */
const ASSET = /[A-Za-z0-9_.-]+-[A-Za-z0-9_-]{8}\.(?:js|css|woff2?|svg|png|webp|jpg|json)\b/g;

/** Which files to keep and since when: the live build's files the new one lacks, plus younger older ones. */
export function planKept({ liveBuild = [], liveKept = {}, newBuild, now, keepMs = KEEP_DAYS * DAY }) {
  const fresh = new Set(newBuild);
  const kept = {};
  for (const [file, since] of Object.entries(liveKept)) {
    if (!fresh.has(file) && now - Date.parse(since) < keepMs) kept[file] = since;
  }
  const at = new Date(now).toISOString();
  for (const file of liveBuild) if (!fresh.has(file) && !kept[file]) kept[file] = at;
  return kept;
}

/** The hashed asset names a page or chunk refers to. */
export const assetNames = (text) => [...new Set(text.match(ASSET) ?? [])];

async function get(origin, path) {
  const res = await fetch(`${origin}/${path}`, { signal: AbortSignal.timeout(20_000) });
  const type = res.headers.get('content-type') ?? '';
  if (!res.ok || (type.includes('text/html') && !path.endsWith('.html'))) throw new Error(`${path}: ${res.status} ${type}`);
  return Buffer.from(await res.arrayBuffer());
}

/** The live build's asset files, by following the links from its pages and chunks (first deploy only). */
async function crawl(origin) {
  const seen = new Set();
  const queue = [];
  for (const page of ['index.html', 'help.html', 'privacy.html', 'terms.html', 'extension.html', 'offline.html']) {
    try { queue.push(...assetNames((await get(origin, page)).toString('utf8'))); } catch { /* a page we don't have */ }
  }
  while (queue.length) {
    const name = queue.pop();
    if (seen.has(name)) continue;
    seen.add(name);
    if (!/\.(?:js|css)$/.test(name)) continue;
    try { queue.push(...assetNames((await get(origin, `assets/${name}`)).toString('utf8'))); } catch { /* not an asset of this build */ }
  }
  return [...seen];
}

async function main() {
  const [origin, dist = 'apps/web/dist'] = process.argv.slice(2);
  if (!origin) { console.error('usage: node scripts/keep-assets.mjs <live origin> [dist dir]'); process.exit(2); }
  const dir = join(dist, 'assets');
  const newBuild = readdirSync(dir);
  let live = null;
  try { live = JSON.parse((await get(origin, 'assets-kept.json')).toString('utf8')); } catch { /* none yet */ }
  const liveBuild = live?.build ?? (await crawl(origin).catch(() => []));
  const kept = planKept({ liveBuild, liveKept: live?.kept ?? {}, newBuild, now: Date.now() });
  let copied = 0, missing = 0;
  for (const file of Object.keys(kept)) {
    if (existsSync(join(dir, file))) continue;
    try {
      writeFileSync(join(dir, file), await get(origin, `assets/${file}`));
      copied++;
    } catch (error) {
      delete kept[file];
      missing++;
      console.log(`::warning::could not keep ${file} (${error.message})`);
    }
  }
  writeFileSync(join(dist, 'assets-kept.json'), `${JSON.stringify({ build: newBuild, kept }, null, 1)}\n`);
  console.log(`Kept ${copied} file(s) of earlier builds for open tabs (${Object.keys(kept).length} kept in all, up to ${KEEP_DAYS} days${missing ? `, ${missing} not found` : ''}); live build listed ${live ? 'by its record' : 'by following its links'}.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main().catch((e) => console.log(`::warning::keeping earlier assets stopped: ${e.message}`));
}
