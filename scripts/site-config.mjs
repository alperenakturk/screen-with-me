// The site's address in one place (card R3-3): `site.config.json` at the repo root.
//   origin   the address the site, the API and the extension's room overlay use (links, invite cards, og:image,
//            the extension's own-site checks, CI's live checks)
//   aliases  other addresses that serve the same Worker; a visit there moves to `origin` (site pages carry this
//            browser's saves along once, `apps/web/src/domain-move.ts`), and the extension treats them as our site
// Moving to an own domain is a change of this file only: docs/internal/custom-domain.md.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// SWM_SITE_CONFIG points at another file (only the domain-move harness does, for a local two-address test).
export const CONFIG_PATH = process.env.SWM_SITE_CONFIG || join(dirname(fileURLToPath(import.meta.url)), '..', 'site.config.json');

/** The address as an origin (`https://host[:port]`), or an error naming what is wrong. */
function checkOrigin(value, field) {
  if (typeof value !== 'string') throw new Error(`site.config.json: ${field} must be a string`);
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`site.config.json: ${field} is not an address: ${value}`);
  }
  // http only for a local test config (harness `domain-move`); a real address is https.
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) throw new Error(`site.config.json: ${field} must be https: ${value}`);
  if (url.origin !== value) throw new Error(`site.config.json: ${field} must be a bare origin (no path, no trailing slash): ${value}`);
  return value;
}

/** Reads and checks the config; throws with a plain message when it is wrong. */
export function readSiteConfig(path = CONFIG_PATH) {
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  if (!raw || typeof raw !== 'object') throw new Error('site.config.json: not an object');
  const origin = checkOrigin(raw.origin, 'origin');
  if (!Array.isArray(raw.aliases)) throw new Error('site.config.json: aliases must be a list');
  const aliases = raw.aliases.map((a, i) => checkOrigin(a, `aliases[${i}]`));
  if (aliases.includes(origin)) throw new Error('site.config.json: origin must not be one of its aliases');
  if (new Set(aliases).size !== aliases.length) throw new Error('site.config.json: an alias is listed twice');
  const extra = Object.keys(raw).filter((k) => k !== 'origin' && k !== 'aliases');
  if (extra.length) throw new Error(`site.config.json: unknown field(s) ${extra.join(', ')}`);
  return { origin, aliases };
}

/** The host a WebSocket test reaches (`wss://host`). */
export const wsOrigin = (origin) => origin.replace(/^http/, 'ws');

// `node scripts/site-config.mjs origin|ws|aliases` prints one value (CI steps read the address from here).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const config = readSiteConfig();
  const what = process.argv[2] ?? 'origin';
  if (what === 'origin') console.log(config.origin);
  else if (what === 'ws') console.log(wsOrigin(config.origin));
  else if (what === 'aliases') console.log(config.aliases.join(' '));
  else {
    console.error('usage: node scripts/site-config.mjs origin|ws|aliases');
    process.exit(2);
  }
}
