// The site's address check (card R3-3, docs/internal/custom-domain.md). One value, site.config.json, decides the
// address; this makes sure nothing else hardcodes it and that a build and the live site follow it.
//
//   node scripts/check-domain.mjs          CI: the config is valid, no file names an address on its own, and the built
//                                          site / extension (when built) carry the config's address
//   node scripts/check-domain.mjs --live   after a deploy: the main address and every alias answer from the Worker,
//                                          the page's og:image and /domain.js name the main address
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { CONFIG_PATH, readSiteConfig } from './site-config.mjs';

const ROOT = join(import.meta.dirname, '..');
let failed = 0;
const check = (ok, label, detail) => {
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail === undefined ? '' : ` → ${detail}`}`);
};

let site;
try {
  site = readSiteConfig();
  check(true, `site.config.json is valid: ${site.origin}${site.aliases.length ? ` (aliases: ${site.aliases.join(', ')})` : ''}`);
} catch (error) {
  check(false, 'site.config.json is valid', error.message);
  process.exit(1);
}

/** Every address the site ever had or has: none of them may be written anywhere but the config. */
const hosts = [site.origin, ...site.aliases, 'https://screen-with-me.swm-server.workers.dev'].map((o) => new URL(o).host);

function* files(dir, test) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist') continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path, test);
    else if (test(path)) yield path;
  }
}

if (!process.argv.includes('--live')) {
  // Code, pages and workflows read the address from the config; tests and the docs may name it.
  const scanned = [
    ...files(join(ROOT, 'apps/web/src'), (p) => /\.(ts|css|html)$/.test(p)),
    ...files(join(ROOT, 'apps/web/public'), (p) => /\.(html|js|json|webmanifest)$/.test(p)),
    join(ROOT, 'apps/web/index.html'),
    ...files(join(ROOT, 'apps/extension/src'), (p) => /\.(ts|html|json)$/.test(p)),
    join(ROOT, 'apps/extension/build.mjs'),
    ...files(join(ROOT, 'apps/server/src'), (p) => /\.ts$/.test(p) && !/\.test\.ts$/.test(p)),
    ...files(join(ROOT, 'packages/shared/src'), (p) => /\.ts$/.test(p) && !/\.test\.ts$/.test(p)),
    ...files(join(ROOT, '.github/workflows'), (p) => /\.ya?ml$/.test(p)),
    join(ROOT, 'scripts/monitor.mjs'),
  ];
  const named = [];
  for (const file of scanned) {
    const text = readFileSync(file, 'utf8');
    text.split('\n').forEach((line, i) => {
      if (hosts.some((h) => line.includes(h))) named.push(`${relative(ROOT, file)}:${i + 1}`);
    });
  }
  check(!named.length, 'no code, page or workflow writes the address itself (read it from site.config.json)', named.join(', '));

  // The Worker answers on every address: an own domain is a custom-domain route, workers.dev stays switched on.
  const wrangler = readFileSync(join(ROOT, 'apps/server/wrangler.jsonc'), 'utf8');
  for (const origin of [site.origin, ...site.aliases]) {
    const host = new URL(origin).hostname;
    if (host === 'localhost' || host === '127.0.0.1') continue;
    if (host.endsWith('.workers.dev')) check(!/"workers_dev"\s*:\s*false/.test(wrangler), `${host}: workers_dev is not switched off in wrangler.jsonc`);
    else {
      const route = new RegExp(`\\{[^{}]*"pattern"\\s*:\\s*"${host.replaceAll('.', '\\.')}"[^{}]*"custom_domain"\\s*:\\s*true[^{}]*\\}`);
      check(route.test(wrangler), `${host}: a custom-domain route in apps/server/wrangler.jsonc`, '{ "pattern": "' + host + '", "custom_domain": true }');
    }
  }

  const html = join(ROOT, 'apps/web/dist/index.html');
  if (existsSync(html)) {
    const og = /property="og:image" content="([^"]+)"/.exec(readFileSync(html, 'utf8'))?.[1] ?? '';
    check(og === `${site.origin}/og.png`, 'the built page\'s og:image is on the main address', og);
    const domainJs = join(ROOT, 'apps/web/dist/domain.js');
    const js = existsSync(domainJs) ? readFileSync(domainJs, 'utf8') : '';
    check(js.includes(JSON.stringify(site.origin)) && js.includes(JSON.stringify(site.aliases)), 'the built /domain.js carries the config', domainJs);
  } else console.log('skip the built site (apps/web/dist not built)');

  const manifestPath = join(ROOT, 'apps/extension/dist/manifest.json');
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    if (/\(dev\)/.test(manifest.name)) console.log('skip the extension (a dev build)');
    else {
      check(manifest.homepage_url === `${site.origin}/extension.html`, 'the extension\'s homepage_url is on the main address', manifest.homepage_url);
      const bridge = manifest.content_scripts.find((c) => c.js.includes('site-bridge.js'));
      const want = [site.origin, ...site.aliases].map((o) => `${o}/*`).sort();
      check(JSON.stringify([...(bridge?.matches ?? [])].sort()) === JSON.stringify(want), 'the site bridge runs on every address of the site', bridge?.matches?.join(' '));
      const film = manifest.content_scripts.filter((c) => c.js.includes('content.js'));
      check(film.length > 0 && film.every((c) => JSON.stringify([...(c.exclude_matches ?? [])].sort()) === JSON.stringify(want)), 'the film-page scripts skip every address of the site');
    }
  } else console.log('skip the extension (apps/extension/dist not built)');
} else {
  // A network error (no HTTP answer at all) is tried again up to twice, 3 s apart: on 13 Nov 2026 one fetch from the
  // runner failed ("fetch failed") seconds after wait-live.mjs had read the same address 8 times. Any HTTP answer,
  // right or wrong, counts at once.
  const get = async (url) => {
    let last = '';
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(15_000) });
        return { status: res.status, text: await res.text() };
      } catch (error) {
        last = String(error);
        if (attempt < 3) {
          console.log(`  (${url}: ${last}; trying again)`);
          await new Promise((r) => setTimeout(r, 3000));
        }
      }
    }
    return { status: 0, text: last };
  };
  for (const origin of [site.origin, ...site.aliases]) {
    const version = await get(`${origin}/api/version`);
    check(version.status === 200, `${origin}/api/version answers from the Worker`, version.status || version.text);
    const domainJs = await get(`${origin}/domain.js`);
    check(domainJs.status === 200 && domainJs.text.includes(JSON.stringify(site.origin)), `${origin}/domain.js names the main address`, domainJs.status);
  }
  const home = await get(`${site.origin}/`);
  const og = /property="og:image" content="([^"]+)"/.exec(home.text)?.[1] ?? '';
  check(home.status === 200 && og === `${site.origin}/og.png`, 'the live page\'s og:image is on the main address', og || home.status);
}

console.log(failed ? `\n${failed} check(s) failed (config: ${relative(ROOT, CONFIG_PATH)})` : '\nsite address checks passed');
process.exit(failed ? 1 : 0);
