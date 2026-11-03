// Uçtan uca testleri sırayla çalıştırır (gerçek sunucuya bağlanan sahte kullanıcılar).
//   npm run e2e                                   → yerel sunucu (npm run dev açık olmalı)
//   npm run e2e -- wss://screen-with-me.swm-server.workers.dev   → yayındaki site
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const base = process.argv[2] ?? 'ws://localhost:8787';
const here = dirname(fileURLToPath(import.meta.url));
// Every file runs with trace.mjs: it reports sockets the server or network closed (close code, time).
const trace = ['--import', pathToFileURL(join(here, 'trace.mjs')).href];
// Live: Cloudflare restarts objects on a new version and closes their connections (the tests don't reconnect). The
// deploy job waits for the new version first (scripts/wait-live.mjs); a file that still fails is tried once more, and a
// pass on that retry is reported as a warning to look into. No retry locally.
const live = !/localhost|127\.0\.0\.1/.test(base);
let failed = 0;
for (const test of ['room.mjs', 'page.mjs', 'avatar.mjs', 'host.mjs', 'handover.mjs', 'wait.mjs', 'pins.mjs', 'stickers.mjs', 'chatimage.mjs', 'modes.mjs', 'saved.mjs', 'recap.mjs', 'shorts.mjs', 'voice.mjs', 'live.mjs', 'xox.mjs', 'draw.mjs', 'quiz.mjs', 'roomgame.mjs', 'poker.mjs', 'search.mjs', 'tv.mjs', 'fallback.mjs', 'countdown.mjs', 'feedback.mjs', 'move.mjs', 'podcasts.mjs']) {
  console.log(`\n▶ ${test}`);
  let result = spawnSync(process.execPath, [...trace, join(here, test), base], { stdio: 'inherit' });
  if (result.status !== 0 && live) {
    console.log(`\n↻ ${test} canlıda bir kez daha deneniyor (yeni sürüm yayılırken bağlantı kopmuş olabilir)`);
    result = spawnSync(process.execPath, [...trace, join(here, test), base], { stdio: 'inherit' });
    // A pass on the retry still counts as red until its cause is found (ROADMAP "Milestone gates"): make it visible.
    if (result.status === 0) console.log(`::warning::${test} failed on the live run's first attempt and passed on the retry; find out why.`);
  }
  if (result.status !== 0) failed++;
}
console.log(failed ? `\n✗ ${failed} test dosyası başarısız` : '\n✓ Tüm uçtan uca testler geçti');
process.exit(failed ? 1 : 0);
