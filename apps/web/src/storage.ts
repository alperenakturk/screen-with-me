// Ayarlar (isim, avatar, tema, dil, kalıcı kimlik, kayıtlı odalar…) tarayıcının deposunda durur.
// Eklenti kuruluysa aynı ayarlar eklentinin deposunda da tutulur: film sitesinin üstündeki oda
// katmanında (kabuk) çalışan sitemizin kendi deposu ana siteden ayrıdır (tarayıcı böler, bazen hiç
// izin vermez), ayarlar oraya eklentiden gelir. Her kaydın yazılma zamanı tutulur; iki tarafta
// farklıysa yeni olan geçerli.
//
// localStorage gizli sekmede veya engellenmiş çerezlerde hata verebilir; o durumda site yine
// çalışsın (bu sayfa açık kaldıkça bellekte tutulur).

import { CLIENT_ID } from '@swm/shared/protocol';
import { EXT_SOURCE, SITE_SOURCE, type ExtToSite, type SiteToExt, type StoreEntries } from '@swm/shared/shell';

/**
 * Kabuk modu: film sayfasının üstünde, eklentinin katmanının içinde açıldık (sitemiz/r/ODA?shell=1).
 * Sadece üstümüzdeki çerçeve gerçekten bir eklenti sayfasıysa (başka bir site bizi ?shell ile açıp
 * ayarlarımızı okuyamasın).
 */
const parentOrigin = location.ancestorOrigins?.[0] ?? '';
export const isShell = window.parent !== window && new URLSearchParams(location.search).has('shell') && parentOrigin.startsWith('chrome-extension://');

/** Eklenti kurulu mu (ana sitede site-bridge sayfa açılırken yazar; kabukta zaten eklentinin içindeyiz)? */
export function hasExtension(): boolean {
  return isShell || document.documentElement.dataset.swmExtension !== undefined;
}

/** Eklenti kabuğu biliyor mu (eski sürümler bilmez: "eklentiyi güncelle")? */
export function extensionSupportsShell(): boolean {
  return isShell || document.documentElement.dataset.swmShell !== undefined;
}

export function postToExtension(message: SiteToExt | { type: 'go'; roomId: string; url: string }): void {
  const data = { source: SITE_SOURCE, ...message };
  if (isShell) window.parent.postMessage(data, parentOrigin);
  else window.postMessage(data, location.origin);
}

type FromExtension = ExtToSite | { type: 'going'; ok: boolean };

/** Eklentiden gelen mesajları dinler (ana sitede köprü, kabukta üstümüzdeki eklenti sayfası). */
export function onExtensionMessage(handler: (message: FromExtension) => void): () => void {
  const listener = (event: MessageEvent) => {
    const fromBridge = !isShell && event.source === window && event.origin === location.origin;
    const fromShell = isShell && event.source === window.parent && event.origin === parentOrigin;
    if (!fromBridge && !fromShell) return;
    const data = event.data as (FromExtension & { source?: string }) | null;
    if (data?.source === EXT_SOURCE && typeof data.type === 'string') handler(data);
  };
  window.addEventListener('message', listener);
  return () => window.removeEventListener('message', listener);
}

const memory = new Map<string, string>();
const AT_KEY = '__at';

function rawGet(key: string): string | null {
  try {
    const value = localStorage.getItem(key);
    if (value !== null) return value;
  } catch {
    // Depo kapalı: bellekteki.
  }
  return memory.get(key) ?? null;
}

function rawSet(key: string, value: string): void {
  memory.set(key, value);
  try {
    localStorage.setItem(key, value);
  } catch {
    // Kaydedilemezse sorun değil (bellekte kalır).
  }
}

/** Her ayarın ne zaman yazıldığı (eklentiyle eşitlerken hangisi yeni?). */
let at: Record<string, number> = (() => {
  try {
    const parsed = JSON.parse(rawGet(AT_KEY) ?? '{}') as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, number>) : {};
  } catch {
    return {};
  }
})();

function saveAt(): void {
  rawSet(AT_KEY, JSON.stringify(at));
}

export function load(key: string): string | null {
  return rawGet(key);
}

export function save(key: string, value: string): void {
  rawSet(key, value);
  at[key] = Date.now();
  saveAt();
  if (hasExtension()) postToExtension({ type: 'store-push', entries: { [key]: { v: value, at: at[key]! } } });
}

/**
 * Açılışta eklentiyle eşitle (site çizilmeden önce: dil, tema, isim doğru gelsin). Eklentide daha yeni
 * olanlar buraya yazılır, burada daha yeni (ya da eklentide hiç olmayan) olanlar eklentiye gider.
 * Eklenti yoksa ya da cevap vermezse hemen devam edilir.
 */
export async function syncStore(): Promise<void> {
  if (!hasExtension()) return;
  const remote = await new Promise<StoreEntries | null>((resolve) => {
    const timer = setTimeout(() => {
      off();
      resolve(null);
    }, isShell ? 3000 : 700);
    const off = onExtensionMessage((message) => {
      if (message.type !== 'store') return;
      clearTimeout(timer);
      off();
      resolve(message.entries && typeof message.entries === 'object' ? message.entries : {});
    });
    postToExtension({ type: 'store-hello' });
  });
  if (!remote) return;
  // Eski kayıtlar (zamanı bilinmeyen): eklentide varsa onunki geçerli olsun.
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key !== AT_KEY && !(key in at)) at[key] = 1;
    }
  } catch {
    // Depo kapalı.
  }
  for (const [key, entry] of Object.entries(remote)) {
    if (key === AT_KEY || typeof entry?.v !== 'string' || typeof entry.at !== 'number') continue;
    if (entry.at > (at[key] ?? 0)) {
      rawSet(key, entry.v);
      at[key] = entry.at;
    }
  }
  const push: StoreEntries = {};
  for (const [key, when] of Object.entries(at)) {
    if (when <= (remote[key]?.at ?? 0)) continue;
    const value = rawGet(key);
    if (value !== null) push[key] = { v: value, at: when };
  }
  saveAt();
  if (Object.keys(push).length) postToExtension({ type: 'store-push', entries: push });
}

/** Sadece bu sekmeye ait, sayfa yenilense de kalan kayıt (sessionStorage). */
export function sessionLoad(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function sessionSave(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Kaydedilemezse sorun değil.
  }
}

/** İsim/avatar kaydeder. */
export function saveIdentity(name: string, avatar?: string): void {
  save('name', name);
  if (avatar) save('avatar', avatar);
}

/**
 * Tarayıcının kalıcı kimliği: rastgele bir kod, hesap değil. Oda yöneticisinin
 * (ve oyunlarda oyuncunun) sayfayı yenileyince yöneticiliği kaybetmemesi ve atılanın hemen geri
 * girememesi için sunucuya gönderilir.
 */
export function clientId(): string {
  const saved = load('cid');
  if (saved && CLIENT_ID.test(saved)) return saved;
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const id = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  save('cid', id);
  return id;
}
