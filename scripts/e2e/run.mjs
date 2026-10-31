// Uçtan uca testleri sırayla çalıştırır (gerçek sunucuya bağlanan sahte kullanıcılar).
//   npm run e2e                                   → yerel sunucu (npm run dev açık olmalı)
//   npm run e2e -- wss://screen-with-me.swm-server.workers.dev   → yayındaki site
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const base = process.argv[2] ?? 'ws://localhost:8787';
const here = dirname(fileURLToPath(import.meta.url));
// Canlıda yeni sürüm yayılırken Cloudflare nesneleri yeniden başlatır ve açık bağlantıları koparır (testler yeniden
// bağlanmaz, takılır). Canlıda başarısız dosya bir kez daha denenir; gerçek hata iki kez de düşer. Yerelde tekrar yok.
const live = !/localhost|127\.0\.0\.1/.test(base);
let failed = 0;
for (const test of ['room.mjs', 'page.mjs', 'avatar.mjs', 'host.mjs', 'handover.mjs', 'wait.mjs', 'pins.mjs', 'stickers.mjs', 'chatimage.mjs', 'modes.mjs', 'saved.mjs', 'recap.mjs', 'shorts.mjs', 'voice.mjs', 'live.mjs', 'xox.mjs', 'draw.mjs', 'quiz.mjs', 'roomgame.mjs', 'poker.mjs', 'search.mjs', 'tv.mjs', 'fallback.mjs']) {
  console.log(`\n▶ ${test}`);
  let result = spawnSync(process.execPath, [join(here, test), base], { stdio: 'inherit' });
  if (result.status !== 0 && live) {
    console.log(`\n↻ ${test} canlıda bir kez daha deneniyor (yeni sürüm yayılırken bağlantı kopmuş olabilir)`);
    result = spawnSync(process.execPath, [join(here, test), base], { stdio: 'inherit' });
  }
  if (result.status !== 0) failed++;
}
console.log(failed ? `\n✗ ${failed} test dosyası başarısız` : '\n✓ Tüm uçtan uca testler geçti');
process.exit(failed ? 1 : 0);
