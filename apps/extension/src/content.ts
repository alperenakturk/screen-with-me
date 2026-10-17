// Her sayfaya ve sayfadaki her iframe'e eklenir. Kullanıcı hiçbir odada
// değilken hiçbir şey yapmaz. Bir odadaysa (herhangi bir sekmede) arka plana
// bağlanır; arka plan "bu sekmede oda yok" derse tekrar uykuya döner. Odalı
// sekmedeki çerçeveler en uygun videolarını bildirir; arka plan en iyisini
// "etkin" seçer, senkron motoru orada çalışır.
//
// Oynatıcı iframe'leri çoğu sitede sonradan yüklenir (ya da "kaynak" seçince
// yeniden yüklenir); her yeni çerçeve yüklenince kendisi bakıp bağlandığı için
// bunlar da yakalanır.

import { OffsetClock } from '@swm/shared/clock';
import { expectedPosition, type PlaybackState } from '@swm/shared/protocol';
import { roomIdFromHash } from '@swm/shared/room-id';
import { SyncEngine } from '@swm/shared/sync-engine';
import { describeVideo, findVideos, scoreVideo, wrapVideoElement } from '@swm/shared/video-element';
import { PORT_NAME, PROBE, SESSIONS_KEY, type BackgroundMessage, type FrameMessage } from './messages.ts';
import { createOverlay } from './overlay.ts';

const SCAN_MS = 1000;

let port: chrome.runtime.Port | null = null;
let scanTimer: ReturnType<typeof setInterval> | null = null;
let observer: MutationObserver | null = null;
let best: HTMLVideoElement | null = null;
let reportedScore = -1;

let active = false;
let state: PlaybackState | null = null;
let adapter: ReturnType<typeof wrapVideoElement> | null = null;
let engine: SyncEngine | null = null;
const clock = new OffsetClock();
const overlay = createOverlay({
  send: (message) => send({ type: 'send', message }),
  // "Sonraki": o an oynayan öğeden sonrakine geç (sunucu aynı anda gelen istekleri bir kez uygular).
  onNext: () => {
    const id = engine?.getState()?.item?.id ?? state?.item?.id;
    if (id) send({ type: 'send', message: { t: 'next', from: id } });
  },
  // Hız: videoya uygulanır ve odaya yayılır (sitenin kendi hız menüsü olmasa bile çalışır).
  onRate: (rate) => engine?.requestRate(rate),
});

/** Çubuktaki senkron noktası için: videomuz odanın olması gereken yerinden ne kadar uzakta? */
let syncTimer: ReturnType<typeof setInterval> | null = null;
function updateSync(): void {
  const current = engine?.getState();
  if (!current?.item || !adapter || !clock.synced) return overlay.setSync(null);
  overlay.setSync((adapter.getTime() - expectedPosition(current, clock.now())) * 1000);
}

function connect(): void {
  if (port) return;
  try {
    port = chrome.runtime.connect({ name: PORT_NAME });
  } catch {
    // Eklenti güncellendi/kaldırıldı; bu sayfadaki eski kopya artık çalışamaz.
    return;
  }
  port.onMessage.addListener(onMessage);
  port.onDisconnect.addListener(() => {
    const wasActive = active;
    port = null;
    deactivate();
    stopScanning();
    // Arka plan Chrome tarafından kapatıldıysa yeniden bağlanmak onu uyandırır,
    // o da odayı kaldığı yerden kurar.
    if (wasActive) setTimeout(connect, 1000);
  });
  startScanning();
}

function send(message: FrameMessage): void {
  try {
    port?.postMessage(message);
  } catch {
    port = null;
  }
}

/** Arka plan "bu sekmede oda yok" dedi: bağlantıyı kapat, video aramayı bırak. */
function sleep(): void {
  deactivate();
  stopScanning();
  const old = port;
  port = null;
  old?.disconnect();
}

// ---- Video arama ----

function startScanning(): void {
  if (scanTimer !== null) return;
  reportedScore = -1;
  scan();
  scanTimer = setInterval(scan, SCAN_MS);
  // Oynatıcılar videoyu sonradan ekleyebilir; değişince hemen bak.
  let pending = false;
  observer = new MutationObserver(() => {
    if (pending) return;
    pending = true;
    setTimeout(() => {
      pending = false;
      scan();
    }, 300);
  });
  observer.observe(document, { childList: true, subtree: true });
}

function stopScanning(): void {
  if (scanTimer !== null) clearInterval(scanTimer);
  scanTimer = null;
  observer?.disconnect();
  observer = null;
}

/** Puanları kabaca gruplar; küçük boyut değişimlerinde arka planı rahatsız etmemek için. */
function bucket(score: number): number {
  return score === 0 ? 0 : Math.round(Math.log2(score) * 2);
}

/** Derin (shadow DOM) tarama pahalı: sadece her DEEP_EVERY taramada bir yapılır. */
const DEEP_EVERY = 5;
let scanCount = 0;

function scan(): void {
  let bestVideo: HTMLVideoElement | null = null;
  let bestScore = 0;
  let largest = { w: 0, h: 0 };
  const videos = findVideos(document, scanCount++ % DEEP_EVERY === 0);
  for (const video of videos) {
    const info = describeVideo(video);
    if (info.width * info.height > largest.w * largest.h) largest = { w: Math.round(info.width), h: Math.round(info.height) };
    const score = scoreVideo(info);
    if (score > bestScore) {
      bestVideo = video;
      bestScore = score;
    }
  }
  const changed = bestVideo !== best;
  best = bestVideo;
  if (changed || bucket(bestScore) !== bucket(reportedScore)) {
    reportedScore = bestScore;
    // `size` sadece popup'taki tanı satırı için.
    const size = videos.length ? `${videos.length} video · ${largest.w}×${largest.h}` : undefined;
    send({ type: 'candidate', score: bestScore, ...(size ? { size } : {}) });
  }
  if (changed && active) attachEngine();
}

// ---- Senkron ----

function attachEngine(): void {
  if (!active) return;
  if (adapter?.element === best) return;
  adapter?.release();
  adapter = null;
  if (!best) {
    // Video sayfadan kalktı (ör. oynatıcı yeniden kuruldu); yenisi bulununca bağlanır.
    engine?.detach();
    return;
  }
  adapter = wrapVideoElement(best);
  engine ??= new SyncEngine({
    clock,
    send: (message) => send({ type: 'send', message }),
    onEnded: (itemId) => send({ type: 'send', message: { t: 'next', from: itemId } }),
    onAutoplayBlocked: () => overlay.askToStart(() => engine?.resume()),
  });
  if (state) engine.receive(state);
  engine.attach(adapter);
  overlay.follow(best);
  if (state) overlay.setRate(state.rate);
  syncTimer ??= setInterval(updateSync, 1000);
}

function deactivate(): void {
  active = false;
  if (syncTimer !== null) clearInterval(syncTimer);
  syncTimer = null;
  engine?.destroy();
  engine = null;
  adapter?.release();
  adapter = null;
  overlay.unmount();
}

function onMessage(message: BackgroundMessage): void {
  switch (message.type) {
    case 'activate':
      clock.set(message.offset, message.synced);
      state = message.state;
      active = true;
      attachEngine();
      break;
    case 'state':
      state = message.state;
      engine?.receive(message.state);
      overlay.setRate(message.state.rate);
      break;
    case 'clock':
      clock.set(message.offset, message.synced);
      break;
    case 'room':
      overlay.setRoom(message.room);
      break;
    case 'reaction':
      overlay.reaction(message.emoji, message.name);
      break;
    case 'chat':
      overlay.chat(message.line);
      break;
    case 'notice':
      overlay.notice(message.kind, message.name);
      break;
    case 'waiting':
      overlay.setWaiting(message.names, message.me);
      break;
    case 'deactivate':
      deactivate();
      break;
    case 'idle':
      sleep();
      break;
  }
}

// Arka plan "bu sekmede oda var" der (sekmedeki tüm çerçevelere gider).
chrome.runtime.onMessage.addListener((message: unknown) => {
  if ((message as { type?: string } | null)?.type !== PROBE) return;
  if (port) {
    reportedScore = -1;
    scan();
  } else {
    connect();
  }
});

function hasSessions(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

// Davet linkiyle gelindiyse (sayfa#swm=ODA) odaya katıl ve işareti adresten sil.
const hashRoom = window === window.top ? roomIdFromHash(location.hash) : null;
if (hashRoom) {
  const rest = location.hash.slice(1).split('&').filter((part) => part && !part.startsWith('swm='));
  history.replaceState(history.state, '', location.pathname + location.search + (rest.length ? `#${rest.join('&')}` : ''));
  connect();
  send({ type: 'join', roomId: hashRoom });
} else {
  // Herhangi bir sekmede oda varsa bağlan (arka plan bu sekmeye ait değilse "uyu" der).
  chrome.storage.session
    .get(SESSIONS_KEY)
    .then((items) => {
      if (hasSessions(items[SESSIONS_KEY])) connect();
    })
    .catch(() => {});
}

// Sonradan bir odaya katılınırsa (popup ya da site üzerinden) haberimiz olsun.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'session' && hasSessions(changes[SESSIONS_KEY]?.newValue) && !port) connect();
});
