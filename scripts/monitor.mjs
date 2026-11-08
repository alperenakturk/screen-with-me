// Card OPS1: the live site's health check, run every 30 minutes by `.github/workflows/monitor.yml` (and by hand:
// `node scripts/monitor.mjs [https://site]`). Three cheap checks: the home page loads, `/api/version` answers from the
// Worker and a Durable Object, and a tiny room join gets its `welcome`. A failure is tried once more after a minute
// (one bad moment, e.g. a deploy restarting the objects, is not an outage). Prints one line per check and, with
// `--out <file>`, writes a short Markdown summary for the outage issue. Exit 0 = healthy, 1 = down.
import { writeFileSync } from 'node:fs';
import { readSiteConfig } from './site-config.mjs';

const args = process.argv.slice(2);
const outAt = args.indexOf('--out');
const out = outAt >= 0 ? args[outAt + 1] : null;
const site = (args.find((a, i) => !a.startsWith('--') && (outAt < 0 || i !== outAt + 1)) ?? readSiteConfig().origin).replace(/\/$/, '');
const RETRY_MS = Number(process.env.MONITOR_RETRY_MS ?? 60_000);
const TIMEOUT_MS = 15_000;
const PROTOCOL = 3; // packages/shared/src/protocol.ts PROTOCOL_VERSION
const ROOM = 'uptime-check';
const CID = 'uptimecheck0000001';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function timed(fn) {
  const start = Date.now();
  try {
    const detail = await Promise.race([fn(), sleep(TIMEOUT_MS).then(() => { throw new Error(`no answer in ${TIMEOUT_MS / 1000} s`); })]);
    return { ok: true, ms: Date.now() - start, detail };
  } catch (e) {
    return { ok: false, ms: Date.now() - start, detail: e instanceof Error ? e.message : String(e) };
  }
}

const checks = {
  'Home page': async () => {
    const res = await fetch(`${site}/`, { headers: { 'Cache-Control': 'no-cache' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const version = html.match(/footer-version">v([\d.]+)/)?.[1];
    if (!version) throw new Error('the page has no version in its footer');
    return `v${version}`;
  },
  'Server version': async () => {
    const res = await fetch(`${site}/api/version`, { headers: { 'Cache-Control': 'no-cache' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    if (!body.worker || !body.object) throw new Error(`incomplete answer ${JSON.stringify(body)}`);
    if (body.worker !== body.object) return `worker ${body.worker.slice(0, 8)}, object ${body.object.slice(0, 8)} (a deploy is spreading)`;
    return `version ${body.worker.slice(0, 8)}`;
  },
  'Room join': () =>
    new Promise((resolve, reject) => {
      // Always the same one-time room and the same browser id: the checks reuse one room (never saved, it deletes
      // itself a day after the last check) and one member id, so they leave nothing behind and grow nothing.
      const ws = new WebSocket(`${site.replace(/^http/, 'ws')}/api/rooms/${ROOM}/ws`);
      ws.addEventListener('open', () => ws.send(JSON.stringify({ t: 'hello', v: PROTOCOL, name: 'Uptime check', avatar: 'robot', cid: CID })));
      ws.addEventListener('message', (e) => {
        const msg = JSON.parse(String(e.data));
        if (msg.t === 'welcome') {
          ws.close();
          resolve('welcome received');
        } else if (msg.t === 'error') {
          ws.close();
          reject(new Error(`error ${msg.code}`));
        }
      });
      ws.addEventListener('error', () => reject(new Error('the WebSocket failed')));
      ws.addEventListener('close', (e) => reject(new Error(`closed before the welcome (${e.code})`)));
    }),
};

async function runAll() {
  const results = {};
  for (const [name, fn] of Object.entries(checks)) results[name] = await timed(fn);
  return results;
}

let results = await runAll();
let retried = false;
if (Object.values(results).some((r) => !r.ok)) {
  retried = true;
  console.log(`A check failed; trying again in ${RETRY_MS / 1000} s.`);
  await sleep(RETRY_MS);
  results = await runAll();
}

const healthy = Object.values(results).every((r) => r.ok);
const lines = Object.entries(results).map(([name, r]) => `${r.ok ? '✓' : '✗'} ${name}: ${r.detail} (${r.ms} ms)`);
for (const line of lines) console.log(line);
console.log(healthy ? `✓ ${site} is up${retried ? ' (after one retry)' : ''}` : `✗ ${site} is down (failed twice, ${RETRY_MS / 1000} s apart)`);

if (out) {
  const when = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
  writeFileSync(out, [`**${when}** · ${site}`, '', ...lines.map((l) => `- ${l}`), ''].join('\n'));
}
process.exit(healthy ? 0 : 1);
