// Her sayfaya ve sayfadaki her iframe'e eklenir. Normalde hiçbir şey yapmaz:
// sadece (1) arka plan "bu sekmede oda var" derse ya da (2) adres #swm=ODA
// içeriyorsa uyanır. Uyanınca çerçevedeki en uygun videoyu bulup arka plana
// bildirir; arka plan bu çerçeveyi "etkin" seçerse senkron motoru burada çalışır.

import { OffsetClock } from '@swm/shared/clock';
import type { PlaybackState } from '@swm/shared/protocol';
import { roomIdFromHash } from '@swm/shared/room-id';
import { SyncEngine } from '@swm/shared/sync-engine';
import { describeVideo, findVideos, scoreVideo, wrapVideoElement } from '@swm/shared/video-element';
import { PORT_NAME, PROBE, type BackgroundMessage, type FrameMessage } from './messages.ts';
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
const overlay = createOverlay();

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
  if (!port) connect();
  try {
    port?.postMessage(message);
  } catch {
    port = null;
  }
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
  observer.observe(document.documentElement, { childList: true, subtree: true });
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

function scan(): void {
  let bestVideo: HTMLVideoElement | null = null;
  let bestScore = 0;
  for (const video of findVideos(document)) {
    const score = scoreVideo(describeVideo(video));
    if (score > bestScore) {
      bestVideo = video;
      bestScore = score;
    }
  }
  const changed = bestVideo !== best;
  best = bestVideo;
  if (changed || bucket(bestScore) !== bucket(reportedScore)) {
    reportedScore = bestScore;
    send({ type: 'candidate', score: bestScore });
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
}

function deactivate(): void {
  active = false;
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
      break;
    case 'clock':
      clock.set(message.offset, message.synced);
      break;
    case 'reaction':
      overlay.reaction(message.emoji, message.name);
      break;
    case 'chat':
      overlay.chat(message.name, message.text, message.mine);
      break;
    case 'deactivate':
      deactivate();
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

// Davet linkiyle gelindiyse (sayfa#swm=ODA) odaya katıl ve işareti adresten sil.
if (window === window.top) {
  const roomId = roomIdFromHash(location.hash);
  if (roomId) {
    const rest = location.hash.slice(1).split('&').filter((part) => part && !part.startsWith('swm='));
    history.replaceState(history.state, '', location.pathname + location.search + (rest.length ? `#${rest.join('&')}` : ''));
    connect();
    send({ type: 'join', roomId });
  }
}
