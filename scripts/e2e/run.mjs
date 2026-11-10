// Uçtan uca testleri sırayla çalıştırır (gerçek sunucuya bağlanan sahte kullanıcılar).
//   npm run e2e                                   → yerel sunucu (npm run dev açık olmalı)
//   npm run e2e -- wss://screen-with-me.swm-server.workers.dev   → yayındaki site
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const base = process.argv[2] ?? 'ws://localhost:8787';
const here = dirname(fileURLToPath(import.meta.url));
// Every file runs with trace.mjs: it reports sockets the server or network closed (close code, time).
const trace = ['--import', pathToFileURL(join(here, 'trace.mjs')).href];
// The Worker lets one address open 60 room connections a minute (CONNECT_LIMIT) and every file runs from this machine:
// trace.mjs writes each new connection's time to this file, and before the next file starts we wait until the last
// minute holds at most CONNECT_ROOM of them (a file opens up to ~35; a 429 used to break whichever file came late, e.g.
// knock.mjs "timeout host back" on PR #235).
const connectLog = join(tmpdir(), `swm-e2e-connects-${process.pid}.log`);
writeFileSync(connectLog, '');
process.env.SWM_CONNECT_LOG = connectLog;
const CONNECT_ROOM = 20;
const WINDOW_MS = 62_000;
// CI's local server runs with SWM_LOCAL_UNPACED (no connection limit there): then nothing to wait for. Never live.
const unpaced = process.env.SWM_E2E_UNPACED === '1' && /localhost|127\.0\.0\.1/.test(base);
async function paceConnects() {
  if (unpaced) return;
  for (;;) {
    const now = Date.now();
    const recent = existsSync(connectLog)
      ? readFileSync(connectLog, 'utf8').split('\n').map(Number).filter((t) => t && now - t < WINDOW_MS).sort((a, b) => a - b)
      : [];
    if (recent.length <= CONNECT_ROOM) return;
    const waitMs = recent[recent.length - CONNECT_ROOM - 1] + WINDOW_MS - now + 50;
    console.log(`  (${recent.length} connections in the last minute: waiting ${Math.ceil(waitMs / 1000)} s for the connection limit)`);
    await new Promise((r) => setTimeout(r, Math.max(waitMs, 100)));
  }
}
// Live: Cloudflare restarts objects on a new version and closes their connections (the tests don't reconnect). The
// deploy job waits for the new version first (scripts/wait-live.mjs); a file that still fails is tried once more, and a
// pass on that retry is reported as a warning to look into. No retry locally.
const live = !/localhost|127\.0\.0\.1/.test(base);
let failed = 0;
const FILES = ['room.mjs', 'page.mjs', 'avatar.mjs', 'host.mjs', 'handover.mjs', 'wait.mjs', 'pins.mjs', 'stickers.mjs', 'chatimage.mjs', 'uploads.mjs', 'modes.mjs', 'saved.mjs', 'recap.mjs', 'shorts.mjs', 'voice.mjs', 'live.mjs', 'xox.mjs', 'draw.mjs', 'quiz.mjs', 'roomgame.mjs', 'poker.mjs', 'search.mjs', 'tv.mjs', 'fallback.mjs', 'countdown.mjs', 'feedback.mjs', 'move.mjs', 'gamestream.mjs', 'podcasts.mjs', 'links.mjs', 'abuse.mjs', 'people.mjs', 'knock.mjs', 'private.mjs', 'sidegames.mjs', 'classics.mjs', 'classics-switch.mjs', 'sea.mjs', 'duel.mjs', 'ghost.mjs', 'lab-server.mjs', 'lab-check.mjs', 'quota.mjs'];

// Card QA1: on CI's unpaced local server (SWM_E2E_UNPACED, never live) up to SWM_E2E_PARALLEL files run at once; each
// file uses its own rooms, and most of the suite's time is waiting (ghost.mjs alone waits 90 s of silence). Files that
// count something per address or for the whole server (upload / feedback / search budgets, the lab's powers, the
// per-address caps, the HTTP fallback's sessions) run alone, after the others. Each file's output is printed in one
// piece when it ends. Live and local runs without the variable stay one file at a time, as before.
const SOLO = new Set(['chatimage.mjs', 'uploads.mjs', 'search.mjs', 'fallback.mjs', 'feedback.mjs', 'abuse.mjs', 'lab-server.mjs', 'lab-check.mjs', 'quota.mjs']);
const parallel = unpaced ? Math.max(1, Number(process.env.SWM_E2E_PARALLEL ?? 1)) : 1;

if (parallel > 1) {
  const runOne = (test) =>
    new Promise((resolve) => {
      const started = Date.now();
      const child = spawn(process.execPath, [...trace, join(here, test), base], { stdio: ['ignore', 'pipe', 'pipe'] });
      const out = [];
      child.stdout.on('data', (d) => out.push(d));
      child.stderr.on('data', (d) => out.push(d));
      child.on('close', (code) => {
        console.log(`\n▶ ${test} (${Math.round((Date.now() - started) / 1000)} s)`);
        process.stdout.write(Buffer.concat(out));
        if (code !== 0) failed++;
        resolve();
      });
    });
  const shared = FILES.filter((f) => !SOLO.has(f));
  // The longest first, so one slow file doesn't end the run alone.
  shared.sort((a, b) => (b === 'ghost.mjs') - (a === 'ghost.mjs'));
  let next = 0;
  await Promise.all(
    Array.from({ length: parallel }, async () => {
      while (next < shared.length) await runOne(shared[next++]);
    }),
  );
  for (const test of FILES.filter((f) => SOLO.has(f))) await runOne(test);
} else {
  for (const test of FILES) {
    await paceConnects();
    console.log(`\n▶ ${test}`);
    let result = spawnSync(process.execPath, [...trace, join(here, test), base], { stdio: 'inherit' });
    if (result.status !== 0 && live) {
      await paceConnects();
      console.log(`\n↻ ${test} canlıda bir kez daha deneniyor (yeni sürüm yayılırken bağlantı kopmuş olabilir)`);
      result = spawnSync(process.execPath, [...trace, join(here, test), base], { stdio: 'inherit' });
      // A pass on the retry still counts as red until its cause is found (ROADMAP "Milestone gates"): make it visible.
      if (result.status === 0) console.log(`::warning::${test} failed on the live run's first attempt and passed on the retry; find out why.`);
    }
    if (result.status !== 0) failed++;
  }
}
console.log(failed ? `\n✗ ${failed} test dosyası başarısız` : '\n✓ Tüm uçtan uca testler geçti');
process.exit(failed ? 1 : 0);
