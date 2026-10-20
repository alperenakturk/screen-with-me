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
import { isForwardedKey, type EmbedControl } from '@swm/shared/embed';
import { applyFocus, ROOM_SIDE, ROOM_TOP } from './focus.ts';
import { expectedPosition, type PlaybackState } from '@swm/shared/protocol';
import { roomIdFromHash } from '@swm/shared/room-id';
import { SyncEngine } from '@swm/shared/sync-engine';
import { describeVideo, findVideos, scoreVideo, wrapVideoElement } from '@swm/shared/video-element';
import { PORT_NAME, PROBE, SESSIONS_KEY, type BackgroundMessage, type FrameMessage } from './messages.ts';
import { SITE_URL } from './config.ts';
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
  // Hız: videoya uygulanır ve odaya yayılır (sitenin kendi hız menüsü olmasa bile çalışır).
  onRate: (rate) => engine?.requestRate(rate),
  // 🏠: tek seferlik mesajla (port koptuysa da arka planı uyandırıp ulaşır; eskiden kayboluyordu).
  onBackToRoom: () => void chrome.runtime.sendMessage({ type: 'go-room-tab' }).catch(() => send({ type: 'go-room' })),
  // Oda görünümü aç/kapa: tercih arka planda; o bütün çerçevelere duyurur.
  onRoomView: (on) => send({ type: 'roomview', on }),
});

/**
 * Oda görünümü (film kendi sekmesinde): videonun olduğu çerçevede oynatıcı sol-alttaki boşluğa
 * yerleşir, üst şerit ve sağ paneli overlay çizer. Diğer çerçeveler sadece içlerindeki oynatıcı
 * çerçevesini tüm ekrana büyütür. Sitenin içinde (gömülü) bu kullanılmaz.
 */
let roomOn = false;
let roomActive = false;
let focusTimer: ReturnType<typeof setInterval> | null = null;
function roomFocusTick(): void {
  if (!roomOn) {
    applyFocus(false, null);
    return;
  }
  if (roomActive) applyFocus(!!best, best, { top: ROOM_TOP, right: ROOM_SIDE });
  else applyFocus(true, null);
}
function setRoomView(on: boolean, isActive: boolean): void {
  roomOn = on;
  roomActive = isActive;
  overlay.setRoomView(on && isActive);
  roomFocusTick();
  // Oynatıcılar kendini yeniden kurabilir: arada bir yeniden işaretle.
  if (on && focusTimer === null) focusTimer = setInterval(roomFocusTick, 1500);
  if (!on && focusTimer !== null) {
    clearInterval(focusTimer);
    focusTimer = null;
  }
}

/** Çubuktaki senkron noktası için: videomuz odanın olması gereken yerinden ne kadar uzakta? */
let syncTimer: ReturnType<typeof setInterval> | null = null;
function updateSync(): void {
  const current = engine?.getState();
  if (!current?.item || !adapter || !clock.synced) return overlay.setSync(null);
  overlay.setSync((adapter.getTime() - expectedPosition(current, clock.now())) * 1000);
}

/**
 * ScreenWithMe sitesinin içindeki çerçeveler iki türlü olur:
 * - Sitenin kendi YouTube oynatıcısı (sitenin doğrudan çocuğu): site kendi senkronunu
 *   çalıştırıyor, eklenti hiçbir şey yapmaz.
 * - Sitenin içinde açılan film sayfası ve onun içindeki oynatıcı çerçeveleri ("gömülü"):
 *   oda bağlantısı sitede; burada sadece video senkronlanır, arayüzü site gösterir.
 */
const SITE_ORIGIN = new URL(SITE_URL).origin;
/** Bizim siteye kaç çerçeve uzaktayız (1: sitenin doğrudan çocuğu; 0: sitenin içinde değil). */
const siteDepth = Array.from(location.ancestorOrigins ?? []).indexOf(SITE_ORIGIN) + 1;
const ourYouTubePlayer = siteDepth === 1 && /(^|\.)youtube(-nocookie)?\.com$/.test(location.hostname);
const embedded = siteDepth > 0 && !ourYouTubePlayer;
const insideOurSite = siteDepth > 0;
if (embedded) overlay.setEmbedded();

function connect(): void {
  if (port || ourYouTubePlayer) return;
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
    send({ type: 'candidate', score: bestScore, ...(size ? { size } : {}), ...(embedded ? { embedDepth: siteDepth } : {}) });
  }
  if (changed && active) attachEngine();
}

// ---- Senkron ----

/**
 * Aynı <video> öğesinde kaynak değişti (reklam, sonraki bölüm, kalite/sunucu değişimi):
 * zaman 0'a sıçrar. Motor bunu "kullanıcı başa sardı" sanıp herkesi başa sarmasın diye
 * oynatıcıyı yeni bir video gibi baştan bağlarız.
 */
let watched: HTMLVideoElement | null = null;
function onSourceChange(): void {
  if (!active || !adapter) return;
  adapter.release();
  adapter = null;
  attachEngine();
}
function watchSource(video: HTMLVideoElement | null): void {
  if (watched === video) return;
  watched?.removeEventListener('emptied', onSourceChange);
  watched = video;
  video?.addEventListener('emptied', onSourceChange);
}

let lastSpeedNotice = 0;

function attachEngine(): void {
  if (!active) return;
  if (adapter?.element === best) return;
  adapter?.release();
  adapter = null;
  watchSource(best);
  if (!best) {
    // Video sayfadan kalktı (ör. oynatıcı yeniden kuruldu); yenisi bulununca bağlanır.
    engine?.detach();
    return;
  }
  adapter = wrapVideoElement(best);
  engine ??= new SyncEngine({
    clock,
    // Hızı sadece çubuktaki menü değiştirir; başka hız eklentileri odayı bozamaz.
    lockRate: true,
    onRateLocked: () => {
      // Kullanıcı neden hızın geri döndüğünü bilsin (en fazla 15 sn'de bir).
      if (Date.now() - lastSpeedNotice < 15_000) return;
      lastSpeedNotice = Date.now();
      overlay.notice('speed', '');
    },
    send: (message) => send({ type: 'send', message }),
    // Kısa videolar (reklam, önizleme) bitince oda sıradakine geçmesin.
    onEnded: (itemId) => {
      const duration = adapter?.getDuration() ?? 0;
      const startNext = () => send({ type: 'send', message: { t: 'next', from: itemId } });
      // Otomatik devam kapalıysa küçük "Sıradakini başlat" kartı (istatistikler sitedeki oturum özetinde).
      if (duration < 60) return;
      if (!overlay.autoNext()) overlay.nextCard(state?.item?.title ?? document.title, startNext);
      else startNext();
    },
    onAutoplayBlocked: () => overlay.askToStart(() => engine?.resume()),
  });
  if (state) engine.receive(state);
  engine.attach(adapter);
  if (embedded) {
    // Sitenin içindeyiz: çubuk yok (arayüzü site gösteriyor); site ilerleme çubuğu için durumu bilsin.
    statusTimer ??= setInterval(reportStatus, 500);
    return;
  }
  overlay.follow(best);
  if (state) overlay.setRate(state.rate);
  syncTimer ??= setInterval(updateSync, 1000);
}

// ---- Sitenin içindeki film (gömülü mod) ----

let statusTimer: ReturnType<typeof setInterval> | null = null;
function reportStatus(): void {
  if (!adapter) return;
  send({
    type: 'status',
    status: { time: adapter.getTime(), duration: adapter.getDuration(), paused: adapter.isPaused(), rate: adapter.getRate() },
  });
}

/**
 * Sitenin kontrolleri (tam ekran çubuğu, pin şeridi, hız menüsü) videoya doğrudan
 * uygulanır; motor bunu kullanıcı hareketi olarak görüp odaya yayar (film sitesinin
 * kendi düğmesine basmakla aynı).
 */
function onControl(control: EmbedControl): void {
  if (!adapter || !engine) return;
  switch (control.action) {
    case 'play':
      void adapter.play();
      break;
    case 'pause':
      adapter.pause();
      break;
    case 'seek':
      adapter.seek(control.time);
      break;
    case 'rate':
      engine.requestRate(control.rate);
      break;
    case 'sync-all':
      engine.syncEveryoneToMe();
      break;
  }
  reportStatus();
}

if (embedded) {
  // Kısayollar (1–8 emoji, Enter mesaj, P pin) çerçevedeyken de çalışsın: tuşu film sitesine
  // göstermeden (oynatıcılar rakamlarla sarar) siteye iletiriz.
  addEventListener(
    'keydown',
    (event) => {
      // (Etkin olmayan çerçeve de iletir: odak film sayfasında, video iç çerçevede olabilir.)
      if (!port || event.ctrlKey || event.metaKey || event.altKey || !isForwardedKey(event.key)) return;
      const target = event.composedPath()[0];
      if (target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!event.repeat) send({ type: 'key', key: event.key });
    },
    true,
  );
  // Film sitesinin kendi tam ekranı sadece videoyu gösterirdi (sohbet, emojiler görünmezdi).
  // Site çerçeveye tam ekran izni vermez; film sitesinin ⛶ düğmesi hata alır. Hata, kullanıcının
  // tıklama iznini harcamaz: siteye haber veririz, site kendi tam ekranını açar (arayüzümüzle).
  document.addEventListener('fullscreenerror', () => {
    if (port) send({ type: 'fullscreen' });
  });

  // Sadece video: senkronlanan videonun oynatıcısı çerçeveyi kaplar, sayfanın geri kalanı gizlenir
  // (video başka bir iç çerçevedeyse bu sayfa o çerçeveyi büyütür). Hep açık; seçenek yok.
  const focusTick = () => applyFocus(true, active ? best : null);
  focusTick();
  setInterval(focusTick, 1500);
}

function deactivate(): void {
  active = false;
  watchSource(null);
  if (syncTimer !== null) clearInterval(syncTimer);
  syncTimer = null;
  if (statusTimer !== null) clearInterval(statusTimer);
  statusTimer = null;
  engine?.destroy();
  engine = null;
  adapter?.release();
  adapter = null;
  if (!embedded) setRoomView(false, false);
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
      // Başka bir video açıldıysa izleme sonu sayaçları sıfırlanır.
      if (message.state.item?.id !== state?.item?.id) overlay.resetStats();
      state = message.state;
      engine?.receive(message.state);
      overlay.setRate(message.state.rate);
      break;
    case 'clock':
      clock.set(message.offset, message.synced);
      break;
    case 'control':
      if (embedded) onControl(message.control);
      break;
    case 'room':
      overlay.setRoom(message.room);
      break;
    case 'reaction':
      overlay.reaction(message);
      break;
    case 'sticker':
      overlay.addSticker(message.id, message.data);
      break;
    case 'stickers-clear':
      overlay.clearStickers();
      break;
    case 'ask-follow':
      overlay.askFollow(message.kind, message.name, message.host ?? '', (yes) => {
        send({ type: 'follow-answer', yes });
        // "Burada kal": bu sayfa artık odanın sayfası değil, senkron durmuş; çubuk da kalkar.
        if (!yes && !active) overlay.unmount();
      }, !active);
      break;
    case 'sticker-removed':
      overlay.removeSticker(message.id);
      break;
    case 'pins':
      overlay.setPins(message.pins);
      break;
    case 'chat':
      overlay.chat(message.line);
      break;
    case 'notice':
      overlay.notice(message.kind, message.name);
      break;
    case 'intro':
      overlay.intro();
      break;
    case 'guide':
      // Kullanıcı "bir daha gösterme" dediyse gösterme.
      void chrome.storage.local
        .get('guideOff')
        .then(({ guideOff }) => {
          // Oda görünümünde rehbere gerek yok (her şey zaten görünür).
          if (!guideOff && !roomOn) setTimeout(() => active && overlay.guide(() => void chrome.storage.local.set({ guideOff: true })), message.afterIntro ? 2900 : 600);
        })
        .catch(() => {});
      break;
    case 'ended':
      // Kısa bir açıklama kalsın; ardından gelen "deactivate" çubuğu birkaç saniye sonra kaldırır.
      overlay.farewell(message.reason);
      break;
    case 'waiting':
      overlay.setWaiting(message.names, message.me);
      break;
    case 'deactivate':
      deactivate();
      break;
    case 'roomview':
      if (!embedded) setRoomView(message.on, message.active);
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

// Davet işaretiyle gelindiyse (sayfa#swm=ODA) odaya katıl ve işareti adresten sil.
// Sadece ScreenWithMe sitesinden gelindiyse sormadan; başka bir site bu işareti koyup
// kullanıcıyı habersiz bir odaya sokamasın diye önce sorulur.
const hashRoom = window === window.top && !insideOurSite ? roomIdFromHash(location.hash) : null;
if (hashRoom) {
  const rest = location.hash.slice(1).split('&').filter((part) => part && !part.startsWith('swm='));
  history.replaceState(history.state, '', location.pathname + location.search + (rest.length ? `#${rest.join('&')}` : ''));
  const join = () => {
    connect();
    send({ type: 'join', roomId: hashRoom });
  };
  let fromSite = false;
  try {
    fromSite = !!document.referrer && new URL(document.referrer).origin === SITE_ORIGIN;
  } catch {
    // Geçersiz referrer: sor.
  }
  if (fromSite) join();
  else overlay.askJoin(join);
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
