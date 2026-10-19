// Sadece ScreenWithMe sitesinde çalışır.
// 1) Siteye "eklenti kurulu" der.
// 2) Site "bu sekme şu odaya katılsın" derse eklentiye iletir; eklenti sekmeyi
//    odaya bağlayıp odanın açık olduğu sayfaya kendisi götürür. Siteye "tamam,
//    ben götürüyorum" diye cevap verir; site kendi bağlantısını kapatır (aynı
//    kişi odada iki kez görünmesin).
// 3) İsim ve avatarı iki yönlü eşitler (hangisi daha yeni değiştiyse o geçerli),
//    dil seçimini ve kalıcı kimliği eklentiye aktarır.

// 4) "Film sitenin içinde": site film sayfasını kendi oynatıcı alanında açınca arka planla
//    sürekli bir bağlantı (port) kurar ve iki yöne mesaj taşır (site ⇄ çerçevedeki senkron).

import type { EmbedReply, EmbedRequest } from '@swm/shared/embed';
import { CLIENT_ID, cleanName, isAvatar } from '@swm/shared/protocol';
import { EMBED_PORT_NAME, EXTENSION_MESSAGE_SOURCE, SITE_MESSAGE_SOURCE, type SiteJoinMessage } from './messages.ts';

document.documentElement.dataset.swmExtension = chrome.runtime.getManifest().version;
// Site, filmi kendi içinde açmayı bu sürümden itibaren deneyebilir.
document.documentElement.dataset.swmEmbed = '1';

// ---- Gömülü film bağlantısı ----
let embedPort: chrome.runtime.Port | null = null;
/** Arka plan yeniden başlarsa bağlantı kurulup kaldığı yerden devam etsin diye son durum. */
let lastStart: Extract<EmbedRequest, { type: 'start' }> | null = null;
let lastState: EmbedRequest | null = null;
let lastClock: EmbedRequest | null = null;

function openEmbedPort(): chrome.runtime.Port | null {
  if (embedPort) return embedPort;
  try {
    embedPort = chrome.runtime.connect({ name: EMBED_PORT_NAME });
  } catch {
    // Eklenti güncellendi/kaldırıldı: bu sayfadaki eski kopya çalışamaz.
    return null;
  }
  embedPort.onMessage.addListener((reply: EmbedReply) => {
    window.postMessage({ source: EXTENSION_MESSAGE_SOURCE, type: 'embed', reply }, location.origin);
  });
  embedPort.onDisconnect.addListener(() => {
    embedPort = null;
    // Chrome arka planı kapattıysa (film hâlâ açıkken) yeniden bağlan ve kaldığı yerden sür.
    if (lastStart) setTimeout(resumeEmbed, 500);
  });
  return embedPort;
}

function resumeEmbed(): void {
  if (!lastStart || embedPort) return;
  const port = openEmbedPort();
  if (!port) return;
  for (const message of [{ ...lastStart, resume: true }, lastState, lastClock]) if (message) port.postMessage(message);
}

function onEmbedRequest(request: EmbedRequest): void {
  if (request.type === 'start') {
    lastStart = { type: 'start', roomId: request.roomId, url: request.url };
    lastState = lastClock = null;
  } else if (request.type === 'state') lastState = request;
  else if (request.type === 'clock') lastClock = request;
  else if (request.type === 'stop') {
    lastStart = lastState = lastClock = null;
    embedPort?.postMessage(request);
    embedPort?.disconnect();
    embedPort = null;
    return;
  }
  if (request.type !== 'start' && !embedPort) return;
  openEmbedPort()?.postMessage(request);
}

addEventListener('message', (event: MessageEvent) => {
  // Sadece sitenin kendi sayfasından gelen mesajlar (içindeki film çerçevesi değil).
  if (event.source !== window || event.origin !== location.origin) return;
  const data = event.data as { source?: string; type?: string; roomId?: unknown; url?: unknown; request?: EmbedRequest } | null;
  if (data?.source !== SITE_MESSAGE_SOURCE) return;
  // Odanın içindeki film: "sadece video" / "sayfanın tamamı" (film çerçeveleri bunu dinler).
  if ((data as { type?: string }).type === 'embed-focus') {
    void chrome.storage.local.set({ embedFocus: (data as { on?: unknown }).on !== false });
    return;
  }
  if (data.type === 'embed' && data.request && typeof data.request.type === 'string') {
    onEmbedRequest(data.request);
    return;
  }
  if (data.type !== 'join' || typeof data.roomId !== 'string') return;
  void sync().then(async () => {
    const message: SiteJoinMessage = { type: 'site-join', roomId: data.roomId as string };
    if (typeof data.url === 'string') message.url = data.url;
    const reply = (await chrome.runtime.sendMessage(message).catch(() => null)) as { ok?: boolean } | null;
    if (reply?.ok) window.postMessage({ source: EXTENSION_MESSAGE_SOURCE, type: 'joining' }, location.origin);
  });
});

function readSite(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSite(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Gizli sekme vb.
  }
}

/** Site ile eklenti arasında isim/avatar/dil/kimlik eşitler. */
async function sync(): Promise<void> {
  const site = {
    name: cleanName(readSite('name')),
    avatar: readSite('avatar'),
    at: Number(readSite('identityAt')) || 0,
  };
  const ext = await chrome.storage.local.get(['name', 'avatar', 'identityAt', 'lang', 'cid']).catch(() => null);
  if (!ext) return;
  const extAt = typeof ext.identityAt === 'number' ? ext.identityAt : 0;
  const update: Record<string, string | number> = {};

  if ((extAt > site.at || !site.name) && typeof ext.name === 'string' && cleanName(ext.name)) {
    // Eklentide daha yeni değişti (ya da sitede hiç isim yok): siteye yaz, açık oda sayfası da hemen güncellesin.
    writeSite('name', ext.name);
    if (isAvatar(ext.avatar)) writeSite('avatar', ext.avatar);
    writeSite('identityAt', String(extAt));
    window.postMessage({ source: EXTENSION_MESSAGE_SOURCE, type: 'identity', name: ext.name, avatar: ext.avatar }, location.origin);
  } else if (site.name) {
    if (site.name !== ext.name) update.name = site.name;
    if (site.avatar && isAvatar(site.avatar) && site.avatar !== ext.avatar) update.avatar = site.avatar;
    if (Object.keys(update).length) update.identityAt = site.at || Date.now();
  }

  // Sitedeki dil seçimi eklentide de geçerli (seçilmemişse İngilizce).
  const lang = readSite('lang') === 'tr' ? 'tr' : 'en';
  if (lang !== ext.lang) update.lang = lang;
  // Sitedeki kalıcı kimlik: siteden film sayfasına geçen oda yöneticisi yönetici kalsın.
  const cid = readSite('cid');
  if (cid && CLIENT_ID.test(cid) && cid !== ext.cid) update.cid = cid;

  if (Object.keys(update).length) await chrome.storage.local.set(update).catch(() => {});
}

void sync();
// Dil düğmesine ya da isim kaydetmeye basınca eklenti hemen öğrensin.
addEventListener('click', () => setTimeout(() => void sync(), 0));
addEventListener('submit', () => setTimeout(() => void sync(), 0));
addEventListener('pagehide', () => void sync());
document.addEventListener('visibilitychange', () => void sync());
