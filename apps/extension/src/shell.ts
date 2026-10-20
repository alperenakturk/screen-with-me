// Kabuk sayfası (shell.html): film sayfasının içine eklentinin açtığı katman. İçinde sitenin
// oda sayfasını açar (sitemiz/r/ODA?shell=1) ve iki yöne mesaj taşır:
//   site ⇄ (postMessage, köken kontrollü) ⇄ bu sayfa ⇄ (port) ⇄ arka plan ⇄ film çerçeveleri
// Ayrıca sitenin ayarlarını (isim, avatar, tema, kayıtlı odalar…) eklentinin deposundan verir ve
// değişenleri oraya yazar: film sitesinin içindeki sitemizin kendi deposu ana siteden ayrıdır.
//
// Film sitesinin kendi betikleri bu sayfanın içine erişemez (eklenti kökeni).

import { ROOM_ID_PATTERN } from '@swm/shared/protocol';
import { EXT_SOURCE, SITE_SOURCE, type ExtToSite, type SiteToExt, type StoreEntries } from '@swm/shared/shell';
import { SITE_URL } from './config.ts';
import { SHELL_PORT_NAME, type ShellPortMessage, type ShellPortReply } from './messages.ts';
import { mergeStore, readStore } from './store.ts';

const SITE_ORIGIN = new URL(SITE_URL).origin;
const roomId = location.hash.slice(1);

const frame = document.createElement('iframe');
if (ROOM_ID_PATTERN.test(roomId)) {
  frame.src = `${SITE_URL}/r/${roomId}?shell=1`;
  frame.allow = 'autoplay; clipboard-write';
  frame.title = 'ScreenWithMe';
  document.body.append(frame);
}

function toSite(message: ExtToSite): void {
  frame.contentWindow?.postMessage({ source: EXT_SOURCE, ...message }, SITE_ORIGIN);
}

// ---- Arka planla bağlantı (kopunca yeniden kurulur, son durum tekrar yollanır) ----
let port: chrome.runtime.Port | null = null;
let started = false;
const last: { state?: ShellPortMessage; clock?: ShellPortMessage; layout?: ShellPortMessage } = {};
/** Arka plandan gelen son sayfa adresi / video durumu: site hazır olmadan geldiyse sonra tekrar verilir. */
const latest: Partial<Record<'page' | 'video' | 'fullscreen', ShellPortReply>> = {};

function connect(): void {
  if (port) return;
  try {
    port = chrome.runtime.connect({ name: SHELL_PORT_NAME });
  } catch {
    // Eklenti güncellendi/kaldırıldı.
    return;
  }
  port.onMessage.addListener((message: ShellPortReply) => {
    if (message.type === 'page' || message.type === 'video' || message.type === 'fullscreen') latest[message.type] = message;
    toSite(message);
  });
  port.onDisconnect.addListener(() => {
    port = null;
    setTimeout(connect, 500);
  });
  for (const message of [{ type: 'hello' } as ShellPortMessage, last.state, last.clock, last.layout]) if (message) port.postMessage(message);
}

function toBackground(message: ShellPortMessage): void {
  if (message.type === 'embed') {
    if (message.request.type === 'state') last.state = message;
    else if (message.request.type === 'clock') last.clock = message;
  } else if (message.type === 'layout') {
    last.layout = message;
  }
  try {
    port?.postMessage(message);
  } catch {
    port = null;
  }
}

addEventListener('message', (event: MessageEvent) => {
  // Sadece içimizdeki sitemizden gelenler.
  if (event.source !== frame.contentWindow || event.origin !== SITE_ORIGIN) return;
  const data = event.data as (SiteToExt & { source?: string }) | null;
  if (data?.source !== SITE_SOURCE || typeof data.type !== 'string') return;
  switch (data.type) {
    case 'store-hello':
      void readStore().then((entries) => toSite({ type: 'store', entries }));
      // Site hazır: arka plana bağlan (sayfa adresi ve "video var mı" buna cevap olarak gelir).
      if (!started) {
        started = true;
        connect();
      }
      break;
    case 'shell-ready':
      for (const message of [latest.page, latest.video, latest.fullscreen]) if (message) toSite(message);
      break;
    case 'store-push':
      void mergeStore(data.entries as StoreEntries);
      break;
    case 'embed':
      if (data.request && ['state', 'clock', 'control', 'detach'].includes(data.request.type)) toBackground({ type: 'embed', request: data.request });
      break;
    case 'layout':
      toBackground({ type: 'layout', layout: data.layout });
      break;
    case 'navigate':
      if (typeof data.url === 'string') toBackground({ type: 'navigate', url: data.url });
      break;
    case 'fullscreen':
      toBackground({ type: 'fullscreen', on: data.on === true });
      break;
  }
});
