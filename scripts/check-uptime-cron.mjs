// Card UPTIME2: runs the Worker's cron trigger once on a local `wrangler dev --test-scheduled` (its own port, no
// GitHub token) and checks that the uptime check ran, found the built site healthy and only logged: no GitHub call.
// Needs the built site (`npm run build`). In CI's e2e job; by hand: `node scripts/check-uptime-cron.mjs [port]`.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const port = Number(process.argv[2] ?? 8791);
const server = fileURLToPath(new URL('../apps/server/', import.meta.url));
// The token must be absent: with it this local run would open issues in the owner's private repository.
const env = { ...process.env };
delete env.FEEDBACK_GITHUB_TOKEN;
delete env.FEEDBACK_REPO;
const child = spawn('npx', ['wrangler', 'dev', '--port', String(port), '--test-scheduled'], { cwd: server, env, stdio: ['ignore', 'pipe', 'pipe'] });
let log = '';
child.stdout.on('data', (d) => (log += d));
child.stderr.on('data', (d) => (log += d));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = 0;
const check = (ok, label, detail) => {
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail === undefined ? '' : ` → ${detail}`}`);
};

try {
  let up = false;
  for (let i = 0; i < 60 && !up; i++) {
    await sleep(1000);
    up = await fetch(`http://localhost:${port}/api/health`).then((r) => r.ok, () => false);
  }
  check(up, `wrangler dev --test-scheduled answers on :${port}`);
  const fired = await fetch(`http://localhost:${port}/cdn-cgi/handler/scheduled?cron=${encodeURIComponent('*/15 * * * *')}`).then((r) => r.status, () => 0);
  check(fired === 200, 'the cron trigger fired', fired);
  let line = null;
  for (let i = 0; i < 40 && !line; i++) {
    await sleep(500);
    line = log.split('\n').find((l) => l.includes('"msg":"uptime"')) ?? null;
  }
  const run = line ? JSON.parse(line.slice(line.indexOf('{'))) : null;
  check(!!run, 'the uptime check ran and logged its result', line ?? 'no log line');
  check(run?.healthy === true && run?.retried === false, 'the built site is healthy on the first try', JSON.stringify(run?.checks));
  check(run?.checks?.length === 3, 'home page, server version and a room object were checked');
  check(!/uptime: GitHub/.test(log) && !/api\.github\.com/.test(log), 'no token: nothing was sent to GitHub');
} finally {
  child.kill('SIGTERM');
}
console.log(failed ? `\n✗ ${failed} failed` : '\n✓ the Worker uptime cron works');
process.exit(failed ? 1 : 0);
