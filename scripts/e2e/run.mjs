// Uçtan uca testleri sırayla çalıştırır (gerçek sunucuya bağlanan sahte kullanıcılar).
//   npm run e2e                                   → yerel sunucu (npm run dev açık olmalı)
//   npm run e2e -- wss://screen-with-me.swm-server.workers.dev   → yayındaki site
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const base = process.argv[2] ?? 'ws://localhost:8787';
const here = dirname(fileURLToPath(import.meta.url));
let failed = 0;
for (const test of ['room.mjs', 'page.mjs', 'avatar.mjs', 'host.mjs', 'handover.mjs', 'wait.mjs', 'pins.mjs', 'stickers.mjs', 'modes.mjs', 'saved.mjs', 'recap.mjs', 'shorts.mjs', 'voice.mjs', 'xox.mjs']) {
  console.log(`\n▶ ${test}`);
  const result = spawnSync(process.execPath, [join(here, test), base], { stdio: 'inherit' });
  if (result.status !== 0) failed++;
}
console.log(failed ? `\n✗ ${failed} test dosyası başarısız` : '\n✓ Tüm uçtan uca testler geçti');
process.exit(failed ? 1 : 0);
