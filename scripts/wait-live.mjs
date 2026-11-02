// After a deploy: waits until the live site runs the new version everywhere this runner reaches, before the live e2e.
//   node scripts/wait-live.mjs https://screen-with-me.swm-server.workers.dev <version id>
// Cloudflare spreads a new version over a minute or two, and a Durable Object that started on the old code is
// restarted on the new one later, closing its connections. A test room that started in that window lost its
// connections mid-test (live e2e "timeout waiting d" in wait.mjs, reproduced locally by reloading the server at the same
// moment). `/api/version` answers the Worker's version and one Durable Object's; both must say the new id
// `STABLE` times in a row, a few seconds apart. Gives up after `LIMIT_MS` with a warning (the e2e then shows the rest).
const [base, want] = process.argv.slice(2);
if (!base || !want) {
  console.error('usage: node scripts/wait-live.mjs <https base> <version id>');
  process.exit(2);
}
const STABLE = 8;
const GAP_MS = 3000;
const LIMIT_MS = 4 * 60_000;
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
console.log(`✓ Live runs version ${want} (Worker and Durable Object, ${STABLE} times in a row)`);
