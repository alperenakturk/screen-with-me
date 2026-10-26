// Eklentinin arka planı (service worker). Eklentinin kendi oda bağlantısı yok: odayı her
// zaman site tutar. Odada bir web sayfası (film) açılınca site sekmeyi o sayfaya göndertir;
// film sayfasında eklenti sitenin oda sayfasını tam ekran bir katman (kabuk) olarak açar ve
// videoyu katmandaki deliğe yerleştirir. Arka plan burada sadece aracıdır:
//
//   site (kabukta) ⇄ shell.html ⇄ arka plan ⇄ film sekmesindeki çerçeveler
//
// Chrome bu betiği boştayken kapatabilir; hangi sekmenin kabuklu olduğu chrome.storage.session'da
// saklanır, bağlantılar (shell.html ve çerçeveler) kopunca kendileri yeniden bağlanır.

import { isForwardedKey, isRelayable, type EmbedReply } from '@swm/shared/embed';
import { ROOM_ID_PATTERN, type PlaybackState } from '@swm/shared/protocol';
import { cleanLayout, type ShellLayout } from '@swm/shared/shell';
import { SITE_URL } from './config.ts';
import {
  PORT_NAME,
  PROBE,
  SESSIONS_KEY,
  SHELL_PORT_NAME,
  type BackgroundMessage,
  type FrameMessage,
  type ShellPortMessage,
  type ShellPortReply,
  type SiteGoMessage,
} from './messages.ts';

// Sayfalardaki betikler "bir odada mıyım" diye buraya bakabilsin
// (sonradan yüklenen oynatıcı iframe'leri kendiliğinden bağlansın diye).
void chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' });

const SITE_ORIGIN = new URL(SITE_URL).origin;
const SHELL_PAGE = chrome.runtime.getURL('shell.html');

interface Frame {
  port: chrome.runtime.Port;
  score: number;
  size?: string;
}

/** Kabuklu bir film sekmesi. */
interface Shell {
  tabId: number;
  roomId: string;
  /** shell.html ile bağlantı (sayfa yüklenirken ya da arka plan yeniden başlayınca bir süre yok). */
  port: chrome.runtime.Port | null;
  state: PlaybackState | null;
  offset: number;
  synced: boolean;
  /** Senkronun çalıştığı çerçeve (en iyi videolu). */
  activeFrame: number | null;
  activated: boolean;
  /** Sitenin son bildirdiği yerleşim (video bulunana kadar şerit). */
  layout: ShellLayout;
  /** Siteye en son "video var/yok" diye ne söylendi. */
  videoSent: boolean | null;
  /** Film sitesinin alan adı (ör. ornek.com): sekme başka bir siteye giderse katman kalkar. */
  site: string;
}

// Katman açılır açılmaz sayfanın tamamını kaplar (oda görünümü hemen gelsin); site deliği sonra bildirir.
const START: ShellLayout = { mode: 'open' };

/** Sekme → çerçeve → bağlantı ve video puanı. */
const frames = new Map<number, Map<number, Frame>>();
const shells = new Map<number, Shell>();

function newShell(tabId: number, roomId: string, site: string): Shell {
  return { tabId, roomId, port: null, state: null, offset: 0, synced: false, activeFrame: null, activated: false, layout: START, videoSent: null, site };
}

/** Adresin "sitesi": alan adının son iki parçası (www.ornek.com ve izle.ornek.com aynı site). */
function siteOf(url: string): string {
  try {
    return new URL(url).hostname.split('.').slice(-2).join('.');
  } catch {
    return '';
  }
}

// ---- Kalıcılık ----

async function persist(): Promise<void> {
  const saved = [...shells.values()].map(({ tabId, roomId, site }) => ({ tabId, roomId, site }));
  await chrome.storage.session.set({ [SESSIONS_KEY]: saved });
}

async function restore(): Promise<void> {
  const { [SESSIONS_KEY]: saved } = await chrome.storage.session.get(SESSIONS_KEY);
  if (!Array.isArray(saved)) return;
  for (const entry of saved as { tabId?: unknown; roomId?: unknown; site?: unknown }[]) {
    if (typeof entry.tabId !== 'number' || typeof entry.roomId !== 'string') continue;
    const tab = await chrome.tabs.get(entry.tabId).catch(() => null);
    if (tab) shells.set(entry.tabId, newShell(entry.tabId, entry.roomId, typeof entry.site === 'string' ? entry.site : siteOf(tab.url ?? '')));
  }
  if (shells.size !== saved.length) await persist();
}

const ready = restore();

// ---- Yardımcılar ----

function post(port: chrome.runtime.Port | null | undefined, message: BackgroundMessage | ShellPortReply): void {
  try {
    port?.postMessage(message);
  } catch {
    // Bağlantı kapanmış; kopma dinleyicisi temizler.
  }
}

function reply(shell: Shell, message: EmbedReply): void {
  post(shell.port, { type: 'reply', reply: message });
}

function probe(tabId: number): void {
  chrome.tabs.sendMessage(tabId, { type: PROBE }).catch(() => {});
}

function endShell(tabId: number): void {
  if (!shells.delete(tabId)) return;
  // Film sayfasındaki çerçeveler uyusun (video aramayı, senkronu bıraksın, katman kalksın).
  for (const frame of frames.get(tabId)?.values() ?? []) post(frame.port, { type: 'idle' });
  void persist();
}

/** Çerçeveler arasından en iyi videoyu seçer; değişirse eskisini durdurup yenisini etkinleştirir. */
function chooseActive(shell: Shell): void {
  let best: number | null = null;
  let bestScore = 0;
  for (const [frameId, frame] of frames.get(shell.tabId) ?? []) {
    if (frame.score > bestScore) {
      best = frameId;
      bestScore = frame.score;
    }
  }
  if (best !== shell.activeFrame) {
    if (shell.activeFrame !== null) post(frames.get(shell.tabId)?.get(shell.activeFrame)?.port, { type: 'deactivate' });
    shell.activeFrame = best;
    shell.activated = false;
    pushState(shell);
    pushLayout(shell);
  }
  pushVideo(shell);
}

function pushState(shell: Shell): void {
  if (!shell.state || shell.activeFrame === null) return;
  const port = frames.get(shell.tabId)?.get(shell.activeFrame)?.port;
  if (!port) return;
  if (shell.activated) {
    post(port, { type: 'state', state: shell.state });
    return;
  }
  post(port, { type: 'activate', state: shell.state, offset: shell.offset, synced: shell.synced });
  shell.activated = true;
}

function activePort(shell: Shell): chrome.runtime.Port | null {
  if (shell.activeFrame === null || !shell.activated) return null;
  return frames.get(shell.tabId)?.get(shell.activeFrame)?.port ?? null;
}

/** Siteye "film sayfasında video var mı" (yoksa üstte şerit kalır, kullanıcı oynat'a basar). */
function pushVideo(shell: Shell): void {
  const found = shell.activeFrame !== null;
  if (shell.videoSent === found || !shell.port) return;
  shell.videoSent = found;
  post(shell.port, { type: 'video', found });
}

/** Yerleşimi tüm çerçevelere duyurur (üst çerçeve katmanı ve videoyu yerleştirir). */
function pushLayout(shell: Shell, only?: number): void {
  for (const [frameId, frame] of frames.get(shell.tabId) ?? []) {
    if (only !== undefined && frameId !== only) continue;
    post(frame.port, { type: 'shell-layout', layout: shell.layout, active: frameId === shell.activeFrame, fromSite: shell.layout !== START });
  }
}

async function pushPage(shell: Shell): Promise<void> {
  const tab = await chrome.tabs.get(shell.tabId).catch(() => null);
  if (tab?.url) post(shell.port, { type: 'page', url: tab.url });
}

// ---- Film çerçeveleri ----

async function handleFrame(tabId: number, frameId: number, port: chrome.runtime.Port, message: FrameMessage): Promise<void> {
  await ready;
  const frame = frames.get(tabId)?.get(frameId);
  if (!frame || frame.port !== port) return;
  const shell = shells.get(tabId);
  if (!shell) {
    // Bu sekmede oda yok: çerçeve boşuna video aramasın.
    post(port, { type: 'idle' });
    return;
  }
  switch (message.type) {
    case 'candidate':
      frame.score = message.score;
      frame.size = message.size;
      chooseActive(shell);
      break;
    case 'send':
      // Senkron motorunun mesajları (oynat/durdur/sar/hız/sıradaki/hazır): site kendi bağlantısından yollar.
      if (shell.activeFrame === frameId && isRelayable(message.message)) reply(shell, { type: 'send', message: message.message });
      break;
    case 'status':
      if (shell.activeFrame === frameId) reply(shell, { type: 'status', status: message.status });
      break;
    case 'key':
      // Odak film sayfasındayken basılan kısayollar (1–8 emoji, Enter mesaj, P pin) sitede işlensin.
      if (isForwardedKey(message.key)) reply(shell, { type: 'key', key: message.key });
      break;
    case 'fullscreen':
      reply(shell, { type: 'fullscreen' });
      break;
    case 'activity':
      reply(shell, { type: 'activity' });
      break;
    case 'fullscreen-changed':
      if (frameId === 0) post(shell.port, { type: 'fullscreen', on: message.on });
      break;
  }
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== PORT_NAME) return;
  const tabId = port.sender?.tab?.id;
  const frameId = port.sender?.frameId ?? 0;
  if (tabId === undefined) {
    port.disconnect();
    return;
  }
  let tabFrames = frames.get(tabId);
  if (!tabFrames) frames.set(tabId, (tabFrames = new Map()));
  tabFrames.set(frameId, { port, score: 0 });

  // Bir çerçevenin mesajları sırayla işlenir.
  let queue = Promise.resolve();
  port.onMessage.addListener((message: FrameMessage) => {
    queue = queue.then(() => handleFrame(tabId, frameId, port, message)).catch(() => {});
  });
  port.onDisconnect.addListener(() => {
    const tabFrames = frames.get(tabId);
    if (tabFrames?.get(frameId)?.port === port) tabFrames.delete(frameId);
    const shell = shells.get(tabId);
    // Üst çerçeve gitti (sayfa değişti): yeni sayfada katman yine tam ekran başlar, video baştan aranır.
    if (shell && frameId === 0) shell.layout = START;
    if (shell && shell.activeFrame === frameId) {
      shell.activeFrame = null;
      chooseActive(shell);
    }
  });

  void ready.then(() => {
    const shell = shells.get(tabId);
    if (!shell) return;
    // Üst çerçeve odanın katmanını açar; her çerçeve yerleşimi bilsin.
    if (frameId === 0) post(port, { type: 'shell-open', roomId: shell.roomId });
    pushLayout(shell, frameId);
  });
});

// ---- Kabuk (shell.html) ----

async function handleShell(shell: Shell, port: chrome.runtime.Port, message: ShellPortMessage): Promise<void> {
  if (shell.port !== port) return;
  switch (message.type) {
    case 'hello':
      shell.videoSent = null;
      pushVideo(shell);
      await pushPage(shell);
      break;
    case 'embed': {
      const request = message.request;
      if (request.type === 'state') {
        shell.state = request.state;
        pushState(shell);
      } else if (request.type === 'clock') {
        shell.offset = request.offset;
        shell.synced = request.synced;
        post(activePort(shell), { type: 'clock', offset: request.offset, synced: request.synced });
      } else if (request.type === 'control') {
        post(activePort(shell), { type: 'control', control: request.control });
      } else if (request.type === 'detach') {
        // Odada başka bir şey açıldı: film sayfasındaki motor durur, video orada durur.
        shell.state = null;
        post(activePort(shell), { type: 'deactivate', pause: true });
        shell.activated = false;
      }
      break;
    }
    case 'layout': {
      const layout = cleanLayout(message.layout);
      if (!layout) break;
      shell.layout = layout;
      pushLayout(shell);
      break;
    }
    case 'navigate': {
      let url: URL;
      try {
        url = new URL(message.url);
      } catch {
        break;
      }
      if (url.protocol !== 'https:' && url.protocol !== 'http:') break;
      // Sitedeki odaya dönülüyorsa katman kalkar (site kendi sayfasında devralır).
      if (url.origin === SITE_ORIGIN) endShell(shell.tabId);
      // Odadaki başka bir film sayfası (başka bir site olabilir): katman oraya da gelsin.
      else shell.site = siteOf(url.href);
      void persist();
      await chrome.tabs.update(shell.tabId, { url: url.href }).catch(() => {});
      break;
    }
    case 'fullscreen':
      post(frames.get(shell.tabId)?.get(0)?.port, { type: 'shell-fullscreen', on: message.on });
      break;
  }
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== SHELL_PORT_NAME) return;
  const tabId = port.sender?.tab?.id;
  // Sadece eklentinin kendi shell.html sayfası (film sayfasının içinde açtığımız katman).
  if (tabId === undefined || !port.sender?.url?.startsWith(SHELL_PAGE)) {
    port.disconnect();
    return;
  }
  let queue = ready.then(() => {
    const shell = shells.get(tabId);
    if (!shell) {
      port.disconnect();
      return;
    }
    shell.port = port;
    // Odanın kimliği sadece buradan gider: adres çubuğunda/çerçeve öğesinde yok (film sitesi okuyamasın).
    post(port, { type: 'room', roomId: shell.roomId });
  });
  port.onMessage.addListener((message: ShellPortMessage) => {
    queue = queue
      .then(() => {
        const shell = shells.get(tabId);
        if (shell) return handleShell(shell, port, message);
      })
      .catch(() => {});
  });
  port.onDisconnect.addListener(() => {
    const shell = shells.get(tabId);
    if (shell?.port === port) shell.port = null;
  });
});

// ---- Ana site ----

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  const go = message as Partial<SiteGoMessage> | null;
  if (go?.type !== 'site-go') return;
  // Sadece sitenin kendi sayfası (üst çerçeve) sekmeyi film sayfasına göndertebilir.
  const tabId = sender.tab?.id;
  if (tabId === undefined || sender.origin !== SITE_ORIGIN || sender.frameId !== 0) return;
  if (typeof go.roomId !== 'string' || !ROOM_ID_PATTERN.test(go.roomId) || typeof go.url !== 'string') return;
  let url: URL;
  try {
    url = new URL(go.url);
  } catch {
    return;
  }
  if ((url.protocol !== 'https:' && url.protocol !== 'http:') || url.origin === SITE_ORIGIN) return;
  const roomId = go.roomId;
  void (async () => {
    await ready;
    shells.set(tabId, newShell(tabId, roomId, siteOf(url.href)));
    // Çerçeveler bağlanmadan önce "oda var" yazılmış olsun.
    await persist();
    sendResponse({ ok: true });
    await chrome.tabs.update(tabId, { url: url.href }).catch(() => {});
  })();
  return true;
});

// ---- Sekmeler ----

function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

chrome.tabs.onUpdated.addListener((tabId, info) => {
  const shell = shells.get(tabId);
  if (!shell) return;
  // Sekme sitemize döndüyse (🏠, geri tuşu): katman kalkar, site kendi sayfasında devralır.
  if (info.url && originOf(info.url) === SITE_ORIGIN) {
    endShell(tabId);
    return;
  }
  // Kullanıcı film sitesinden başka bir siteye gitti (adres çubuğu, dış link): katman orada açılmasın.
  if (info.url && /^https?:/.test(info.url) && shell.site && siteOf(info.url) !== shell.site) {
    endShell(tabId);
    return;
  }
  // Adres değişti (başka bölüm, sayfa içi geçiş): site odadaki sayfayla karşılaştırsın.
  if (info.url) void pushPage(shell);
  if (info.status === 'complete') probe(tabId);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  endShell(tabId);
  frames.delete(tabId);
});
