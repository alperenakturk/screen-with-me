// Sitenin ayarları eklentide de saklanır (chrome.storage.local): isim, avatar, tema, dil, kalıcı kimlik,
// kayıtlı odalar, özel emojiler… Ana sitede site-bridge, film sayfasındaki katmanda shell.html bunları
// siteye verir ve sitede değişenleri buraya yazar. Her kaydın yazılma zamanı tutulur; iki tarafta
// farklıysa yeni olan geçerli.
//
// Her ayar kendi anahtarında durur (`site:<anahtar>`). Eskiden hepsi tek nesnedeydi (`siteStore`) ve
// "oku → değiştir → yaz" yapılıyordu: site isim ve avatarı art arda kaydedince iki yazma aynı anda
// eski nesneyi okuyup birbirinin üstüne yazıyor, yeni isim kayboluyordu (film sayfasında eski isimle
// görünülüyordu). Ayrı anahtarlarda farklı ayarlar birbirini ezemez; aynı sayfadaki yazmalar da sırayla.

import type { StoreEntries } from '@swm/shared/shell';

/** Eski tek nesne: sadece okunur (içindekiler yeni anahtarlara yazılınca eskisi geçersiz kalır). */
const LEGACY_KEY = 'siteStore';
const PREFIX = 'site:';
/** Tek değer için üst sınır (özel emojiler data: adresleri; chrome.storage.local toplamda ~10 MB). */
const MAX_VALUE = 2_000_000;

type Entry = StoreEntries[string];

function isEntry(x: unknown): x is Entry {
  const e = x as Entry | null;
  return !!e && typeof e.v === 'string' && typeof e.at === 'number';
}

export async function readStore(): Promise<StoreEntries> {
  const all = await chrome.storage.local.get(null).catch(() => ({}) as Record<string, unknown>);
  const out: StoreEntries = {};
  const legacy = all[LEGACY_KEY];
  if (legacy && typeof legacy === 'object') {
    for (const [key, entry] of Object.entries(legacy as Record<string, unknown>)) if (isEntry(entry)) out[key] = entry;
  }
  for (const [name, entry] of Object.entries(all)) {
    if (!name.startsWith(PREFIX) || !isEntry(entry)) continue;
    const key = name.slice(PREFIX.length);
    if (!out[key] || out[key]!.at <= entry.at) out[key] = entry;
  }
  return out;
}

/** Tek bir ayarın değeri (ör. eklentinin dili): önce kendi anahtarı, yoksa eski tek nesne. */
export async function readValue(key: string): Promise<string | null> {
  const own = (await chrome.storage.local.get(PREFIX + key).catch(() => ({}) as Record<string, unknown>))[PREFIX + key];
  if (isEntry(own)) return own.v;
  const legacy = (await chrome.storage.local.get(LEGACY_KEY).catch(() => ({}) as Record<string, unknown>))[LEGACY_KEY];
  const entry = legacy && typeof legacy === 'object' ? (legacy as Record<string, unknown>)[key] : undefined;
  return isEntry(entry) ? entry.v : null;
}

let queue: Promise<void> = Promise.resolve();

/** Gelen kayıtları ekler; aynı anahtarın daha yenisi zaten varsa dokunmaz. Bu sayfadaki çağrılar sırayla. */
export function mergeStore(entries: StoreEntries): Promise<void> {
  queue = queue.then(() => merge(entries)).catch(() => {});
  return queue;
}

async function merge(entries: StoreEntries): Promise<void> {
  if (!entries || typeof entries !== 'object') return;
  const store = await readStore();
  const changed: Record<string, Entry> = {};
  for (const [key, entry] of Object.entries(entries)) {
    if (key.length > 64 || !isEntry(entry) || entry.v.length > MAX_VALUE) continue;
    const old = store[key];
    if (old && old.at >= entry.at) continue;
    changed[PREFIX + key] = { v: entry.v, at: entry.at };
  }
  // Sadece değişen anahtarlar yazılır: başka bir sayfanın aynı anda yazdığı başka ayarları ezmez.
  if (Object.keys(changed).length) await chrome.storage.local.set(changed).catch(() => {});
}
