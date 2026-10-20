// Sitenin ayarları eklentide de saklanır (chrome.storage.local `siteStore`): isim, avatar, tema,
// dil, kalıcı kimlik, kayıtlı odalar, özel emojiler… Ana sitede site-bridge, film sayfasındaki
// katmanda shell.html bunları siteye verir ve sitede değişenleri buraya yazar. Her kaydın yazılma
// zamanı tutulur; iki tarafta farklıysa yeni olan geçerli.

import type { StoreEntries } from '@swm/shared/shell';

const KEY = 'siteStore';
/** Tek değer için üst sınır (özel emojiler data: adresleri; chrome.storage.local toplamda ~10 MB). */
const MAX_VALUE = 2_000_000;

export async function readStore(): Promise<StoreEntries> {
  const { [KEY]: store } = await chrome.storage.local.get(KEY).catch(() => ({ [KEY]: null }));
  return store && typeof store === 'object' ? (store as StoreEntries) : {};
}

/** Gelen kayıtları ekler; aynı anahtarın daha yenisi zaten varsa dokunmaz. */
export async function mergeStore(entries: StoreEntries): Promise<void> {
  if (!entries || typeof entries !== 'object') return;
  const store = await readStore();
  let changed = false;
  for (const [key, entry] of Object.entries(entries)) {
    if (key.length > 64 || typeof entry?.v !== 'string' || typeof entry.at !== 'number' || entry.v.length > MAX_VALUE) continue;
    const old = store[key];
    if (old && old.at >= entry.at) continue;
    store[key] = { v: entry.v, at: entry.at };
    changed = true;
  }
  if (changed) await chrome.storage.local.set({ [KEY]: store }).catch(() => {});
}
