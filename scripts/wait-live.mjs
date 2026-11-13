// After a deploy: waits until the live site runs the new version everywhere this runner reaches, before the live e2e.
//   node scripts/wait-live.mjs https://screen-with-me.swm-server.workers.dev <version id>
// Cloudflare spreads a new version over a minute or two, and a Durable Object that started on the old code is
// restarted on the new one later, closing its connections. A test room that started in that window lost its
// connections mid-test (live e2e "timeout waiting d" in wait.mjs, reproduced locally by reloading the server at the same
// moment). `/api/version` answers the Worker's version and that of a freshly started Durable Object; both must say the new id
// `STABLE` times in a row, a few seconds apart. Gives up after `LIMIT_MS` with a warning (the e2e then shows the rest).
// Also waits at least `SETTLE_MS` after the deploy (BH1): on 3 Nov 2026 the probe said the new id from its first second,
// yet a room created 35 s after it settled was restarted 79 s after the deploy (wait.mjs "timeout waiting d", socket
// 1006); Cloudflare keeps restarting objects for a while whatever a fresh probe answers.
// QA1 part 4: then a quiet spell of canary rooms (scripts/e2e/canary.mjs): idle room connections the server never closes
// by itself; one dropped means objects are still restarting (on 10 Nov 2026 rooms dropped 2.5–5 min after the deploy,
// after the 2 min settle). The e2e starts after `QUIET_MS` with no drop, at most `QUIET_LIMIT_MS` more (then a warning).
import { waitQuiet } from './e2e/canary.mjs';

const [base, want] = process.argv.slice(2);
if (!base || !want) {
  console.error('usage: node scripts/wait-live.mjs <https base> <version id>');
  process.exit(2);
}
const STABLE = 8;
const GAP_MS = 3000;
const LIMIT_MS = 4 * 60_000;
const SETTLE_MS = 120_000;
// 13 Nov 2026 (.130): canaries were quiet for 60 s, then rooms restarted 41 s later (8 drops over two minutes, 3.5–5.5
// min after the deploy). 120 s with four canaries catches a wave like that; a later one (seen 8 and 10.5 min after
// a deploy) is met by run.mjs, whose one retry after a restart waits for the canaries to go quiet.
const QUIET_MS = 120_000;
const CANARIES = 4;
const QUIET_LIMIT_MS = 4 * 60_000;
const started = Date.now();
let streak = 0;
while (streak < STABLE) {
  let got = '?';
  try {
    const res = await fetch(`${base}/api/version`, { cache: 'no-store' });
    const body = res.ok ? await res.json() : null;
    got = body ? `worker ${body.worker || '-'} · object ${body.object || '-'}` : `HTTP ${res.status}`;
    streak = body?.worker === want && body?.object === want ? streak + 1 : 0;
  } catch (error) {
    got = String(error);
    streak = 0;
  }
  const s = Math.round((Date.now() - started) / 1000);
  console.log(`${s} s: ${got} (${streak}/${STABLE})`);
  if (streak >= STABLE) break;
  if (Date.now() - started > LIMIT_MS) {
    console.log(`::warning::The live site did not settle on version ${want} within ${LIMIT_MS / 60_000} min; running the e2e anyway.`);
    process.exit(0);
  }
  await new Promise((r) => setTimeout(r, GAP_MS));
}
const rest = SETTLE_MS - (Date.now() - started);
if (rest > 0) {
  console.log(`… letting the new version settle for ${Math.round(rest / 1000)} s more (objects restart for a while after a deploy)`);
  await new Promise((r) => setTimeout(r, rest));
}
console.log(`… waiting for ${QUIET_MS / 1000} s with no canary room dropped (at most ${QUIET_LIMIT_MS / 60_000} min)`);
const ws = base.replace(/^http/, 'ws');
const calm = await waitQuiet(ws, { quietMs: QUIET_MS, limitMs: QUIET_LIMIT_MS, count: CANARIES });
if (!calm.quiet) console.log(`::warning::Canary rooms were still being dropped ${Math.round(calm.waited / 1000)} s after the settle (${calm.drops} drops); running the e2e anyway (a file that fails while a canary drops says so).`);
console.log(`✓ Live runs version ${want} (Worker and Durable Object, ${STABLE} times in a row; canary rooms quiet for ${QUIET_MS / 1000} s; ${Math.round((Date.now() - started) / 1000)} s after the deploy, ${calm.drops} canary drops on the way)`);
process.exit(0);
