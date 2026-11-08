// Her sayfaya ve sayfadaki her iframe'e eklenir. Kullanıcı hiçbir odada değilken hiçbir şey
// yapmaz. Bir sekme kabukluysa (odada açılan film sayfası) arka plana bağlanır:
// - Her çerçeve en iyi videosunu bildirir; arka plan en iyisini "etkin" seçer, senkron motoru
//   orada çalışır (oda bağlantısı sitede; buradan sadece oynatma mesajları gider).
// - Üst çerçeve sitenin oda sayfasını tam ekran katman olarak açar (shell.html → sitemiz) ve
//   sitenin söylediği deliğe videoyu yerleştirir; ara çerçeveler videolu iç çerçeveyi büyütür.
//
// Oynatıcı iframe'leri çoğu sitede sonradan yüklenir; her yeni çerçeve kendisi bakıp bağlandığı
// için bunlar da yakalanır.

import { OffsetClock } from '@swm/shared/clock';
import { FILM_EDGE, isForwardedKey, isPushToTalkKey, KNOWN_PLAYER_CONTROLS, type EmbedControl } from '@swm/shared/embed';
import type { PlaybackState } from '@swm/shared/protocol';
import { holePath, type ShellLayout } from '@swm/shared/shell';
import { SyncEngine } from '@swm/shared/sync-engine';
import { describeVideo, findVideos, scoreVideo, wrapVideoElement } from '@swm/shared/video-element';
import { isSiteOrigin } from './config.ts';
import { applyFocus, NO_INSETS, type Insets } from './focus.ts';
import { PORT_NAME, PROBE, SESSIONS_KEY, type BackgroundMessage, type FrameMessage } from './messages.ts';
import { startPicking, stopPicking } from './picker.ts';
import { askToStart, clearStart } from './start-card.ts';

const SCAN_MS = 1000;
/** Bundan kısa video reklam ya da önizleme sayılır: odaya oynat/durdur/sar gitmez, odanın yerine sarılmaz. */
const SHORT_S = 60;
/**
 * Bilinen büyük reklam ağları: bu çerçevelerde film yoktur, videoları aday sayılmaz. Hiçbir şeyi engellemez,
 * sadece "burada film arama" der (kısa tutulur; reklam engelleyici değiliz).
 */
const AD_HOSTS = [
  'doubleclick.net',
  'googlesyndication.com',
  'googleadservices.com',
  'imasdk.googleapis.com',
  'adnxs.com',
  'amazon-adsystem.com',
  'pubmatic.com',
  'rubiconproject.com',
  'criteo.com',
  'taboola.com',
  'outbrain.com',
  'adsrvr.org',
];
const inAdFrame = AD_HOSTS.some((host) => location.hostname === host || location.hostname.endsWith(`.${host}`));
const isTop = window === window.top;

// Sitemizin içindeki çerçevelerde (sitenin YouTube oynatıcısı, kabuktaki site) hiçbir şey yapma.
const insideOurSite = Array.from(location.ancestorOrigins ?? []).some(isSiteOrigin);

let port: chrome.runtime.Port | null = null;
let scanTimer: ReturnType<typeof setInterval> | null = null;
let observer: MutationObserver | null = null;
let best: HTMLVideoElement | null = null;
let reportedScore = -1;
/**
 * Kullanıcının elle seçtiği video ("🎯 Bunu senkronla"): puanı ne olursa olsun bu çerçevenin videosu odur ve
 * arka plana diğer bütün çerçevelerden yüksek puanla bildirilir. Kısa olsa da (60 sn altı) senkronlanır.
 */
let picked: HTMLVideoElement | null = null;
const PICKED_SCORE = 1e12;

let active = false;
let state: PlaybackState | null = null;
let adapter: ReturnType<typeof wrapVideoElement> | null = null;
let engine: SyncEngine | null = null;
let statusTimer: ReturnType<typeof setInterval> | null = null;
const clock = new OffsetClock();

function connect(): void {
  if (port || insideOurSite) return;
  try {
    port = chrome.runtime.connect({ name: PORT_NAME });
  } catch {
    // Eklenti güncellendi/kaldırıldı; bu sayfadaki eski kopya artık çalışamaz.
    return;
  }
  port.onMessage.addListener(onMessage);
  port.onDisconnect.addListener(() => {
    port = null;
    deactivate();
    stopScanning();
    // Arka plan Chrome tarafından kapatıldıysa yeniden bağlanmak onu uyandırır (oda sürüyorsa).
    setTimeout(() => void checkSessions(), 1000);
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

/** Arka plan "bu sekmede oda yok" dedi: bağlantıyı kapat, katmanı kaldır, video aramayı bırak. */
function sleep(): void {
  document.documentElement.removeAttribute('data-swm-room');
  uncover();
  stopPicking();
  picked = null;
  // Oda bitti: oda görünümünde susturduğumuz videolar eski hâline dönsün.
  for (const video of mutedByUs) video.muted = false;
  mutedByUs.clear();
  try {
    sessionStorage.removeItem(COVER_FLAG);
  } catch {
    // Depo kapalı.
  }
  deactivate();
  stopScanning();
  setLayout(null, false);
  removeShell();
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
    const score = inAdFrame ? 0 : scoreVideo(info);
    if (score > bestScore) {
      bestVideo = video;
      bestScore = score;
    }
  }
  if (picked && !picked.isConnected) picked = null;
  if (picked) {
    bestVideo = picked;
    bestScore = PICKED_SCORE;
  }
  const changed = bestVideo !== best;
  best = bestVideo;
  checkAd(videos);
  if (changed || bucket(bestScore) !== bucket(reportedScore)) {
    reportedScore = bestScore;
    const size = videos.length ? `${videos.length} video · ${largest.w}×${largest.h}` : undefined;
    send({ type: 'candidate', score: bestScore, ...(size ? { size } : {}) });
  }
  if (changed && active) attachEngine();
  if (changed) applyLayout();
}

// ---- Senkron ----

/**
 * Aynı <video> öğesinde kaynak değişti (reklam, sonraki bölüm, kalite/sunucu değişimi):
 * zaman 0'a sıçrar. Motor bunu "kullanıcı başa sardı" sanıp herkesi başa sarmasın diye
 * oynatıcıyı yeni bir video gibi baştan bağlarız.
 */
let watched: HTMLVideoElement | null = null;
let sourceToken = 0;
function onSourceChange(): void {
  if (!active) return;
  adapter?.release();
  adapter = null;
  engine?.detach();
  // Yeni kaynağın süresi belli olmadan bağlanma: ön-reklam aynı <video>'da başlıyorsa motor reklamın 0'a
  // dönüşünü "kullanıcı başa sardı" sanıp herkesi başa sarardı. Süre gelince (ya da en fazla 3 sn sonra) bağlan.
  const token = ++sourceToken;
  const go = () => {
    if (token === sourceToken) attachEngine();
  };
  if (watched && watched.readyState < 1) {
    watched.addEventListener('loadedmetadata', go, { once: true });
    setTimeout(go, 3000);
  } else go();
}
/** Videonun süresi değişti: kısa (reklam) olduysa motor ayrılır, uzun olduysa (film başladı) bağlanır. */
function onDurationChange(): void {
  if (!active || !watched) return;
  if (isShort(watched) && watched !== picked) {
    if (adapter) {
      adapter.release();
      adapter = null;
      engine?.detach();
    }
  } else if (!adapter) attachEngine();
}
function watchSource(video: HTMLVideoElement | null): void {
  if (watched === video) return;
  watched?.removeEventListener('emptied', onSourceChange);
  watched?.removeEventListener('durationchange', onDurationChange);
  watched = video;
  video?.addEventListener('emptied', onSourceChange);
  video?.addEventListener('durationchange', onDurationChange);
}

/** Süresi belli ve 60 sn'den kısa: reklam/önizleme. */
function isShort(video: HTMLVideoElement | null): boolean {
  const duration = video?.duration ?? Number.NaN;
  return Number.isFinite(duration) && duration > 0 && duration < SHORT_S;
}

/**
 * "Reklamda" durumu: senkronlanan çerçevede kısa bir video (reklam) oynuyor, film ya kısa videonun kendisi (aynı
 * <video>'da ön-reklam) ya da durmuş. Oda bu kişiyi beklemez (`ready` + `ad`); reklam bitince motor bağlanır ve
 * kişi odanın yerine atlar. Sadece etkin çerçeve bildirebilir (arka plan başkasınınkini iletmez).
 */
let adReported = false;
function checkAd(videos: HTMLVideoElement[]): void {
  const filmPlaying = !!adapter && !adapter.isPaused() && !isShort(adapter.element);
  const ad =
    active &&
    !filmPlaying &&
    !!state &&
    !state.paused &&
    videos.some((video) => video !== picked && isShort(video) && !video.paused && !video.ended && describeVideo(video).visible);
  if (ad === adReported) return;
  adReported = ad;
  sendAd();
}
function sendAd(): void {
  send({ type: 'send', message: adReported ? { t: 'ready', ready: false, ad: true } : { t: 'ready', ready: true, ad: false } });
}

/** Oda görünümünde, filmin oynatıcısı dışında sesli oynayan videolar (gizli reklamlar) susturulur. */
const mutedByUs = new Set<HTMLVideoElement>();
function muteStrays(): void {
  if (layout?.mode !== 'full') return;
  for (const video of document.querySelectorAll('video')) {
    if ((video === best && layoutActive) || video.closest('[data-swm-focus]') || video.muted || video.paused) continue;
    video.muted = true;
    mutedByUs.add(video);
  }
}

function attachEngine(): void {
  if (!active) return;
  if (adapter?.element === best) return;
  adapter?.release();
  adapter = null;
  // Motor eski videodan ayrılsın: aşağıdaki `receive` eski videoya hâlâ bağlıyken komut verip onu (ör. elle seçimden
  // önce senkronlanan fragmanı) yeniden oynatıyordu.
  engine?.detach();
  watchSource(best);
  if (!best) {
    // Video sayfadan kalktı (ör. oynatıcı yeniden kuruldu); yenisi bulununca bağlanır.
    engine?.detach();
    return;
  }
  // Kısa video (reklam/önizleme): odaya hareket gitmez, odanın yerine sarılmaz; reklam bitip film gelince
  // (süre değişir) bağlanır, kişi o an odanın olduğu yere atlar.
  if (isShort(best) && best !== picked) {
    engine?.detach();
    return;
  }
  // Biz susturduysak (o sırada film sanılmıyordu) sesi geri ver.
  if (mutedByUs.has(best)) {
    best.muted = false;
    mutedByUs.delete(best);
  }
  adapter = wrapVideoElement(best);
  engine ??= new SyncEngine({
    clock,
    // Hızı sadece sitedeki menü değiştirir; başka hız eklentileri odayı bozamaz.
    lockRate: true,
    send: (message) => send({ type: 'send', message }),
    // Kısa videolar (reklam, önizleme) bitince oda sıradakine geçmesin. Otomatik devam kapalıysa
    // site "sıradaki" isteğini yollamaz, "Sıradakini başlat" kartı gösterir.
    onEnded: (itemId) => {
      if ((adapter?.getDuration() ?? 0) >= 60) send({ type: 'send', message: { t: 'next', from: itemId } });
    },
    onAutoplayBlocked: () => askToStart(best, () => engine?.resume()),
  });
  if (state) engine.receive(state);
  engine.attach(adapter);
  statusTimer ??= setInterval(reportStatus, 500);
}

function reportStatus(): void {
  if (!adapter) return;
  const video = adapter.element;
  send({
    type: 'status',
    status: {
      time: adapter.getTime(),
      duration: adapter.getDuration(),
      paused: adapter.isPaused(),
      rate: adapter.getRate(),
      // While ducked, report the person's own volume (our slider must not jump down while someone speaks).
      volume: ducked?.video === video ? ducked.volume : video.volume,
      muted: video.muted,
      skin: skinOf(video),
    },
  });
}

/** Can we hide this video's controls? Native controls or a known player around it (a few levels up). */
function skinOf(video: HTMLVideoElement): 'known' | 'unknown' {
  if (video.controls) return 'known';
  const selector = KNOWN_PLAYER_CONTROLS.join(',');
  let box: HTMLElement | null = video.parentElement;
  for (let i = 0; box && i < 6; i++, box = box.parentElement) {
    if (box.querySelector(selector)) return 'known';
  }
  return 'unknown';
}

let skinStyle: HTMLStyleElement | null = null;
/**
 * One remote in fullscreen: the film player's own bar is made invisible and unclickable (it keeps its place, so the
 * player's subtitles stay where they were). Only known players and native controls; custom ones stay as they are.
 */
function skin(hide: boolean): void {
  if (!hide) {
    skinStyle?.remove();
    skinStyle = null;
    return;
  }
  if (skinStyle?.isConnected) return;
  skinStyle = document.createElement('style');
  skinStyle.textContent =
    `${KNOWN_PLAYER_CONTROLS.join(',')}{opacity:0!important;pointer-events:none!important}` +
    'video::-webkit-media-controls-enclosure{display:none!important}';
  (document.head ?? document.documentElement).append(skinStyle);
}

/**
 * Sitenin kontrolleri (tam ekran çubuğu, pin şeridi, hız menüsü) videoya doğrudan uygulanır;
 * motor bunu kullanıcı hareketi olarak görüp odaya yayar (film sitesinin kendi düğmesiyle aynı).
 */
function onControl(control: EmbedControl): void {
  if (control.action === 'duck') {
    duck(control.on);
    return;
  }
  if (control.action === 'skin') {
    skin(control.hide);
    return;
  }
  if (control.action === 'volume') {
    const video = adapter?.element;
    if (!video) return;
    // The person chose a volume: a running duck must not put the old one back later.
    ducked = null;
    video.volume = Math.min(1, Math.max(0, control.volume));
    video.muted = control.muted;
    reportStatus();
    return;
  }
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

/** Konuşulurken film sesi bu orana iner. */
const DUCK_RATIO = 0.35;
let ducked: { video: HTMLVideoElement; volume: number } | null = null;
/**
 * Sesli sohbette biri konuşurken film sesi kısılır, susunca eski hâline döner. Kişi bu arada sesi kendisi değiştirdiyse
 * ona dokunulmaz. Ses düzeyi olayları motoru ilgilendirmez (odaya bir şey gitmez).
 */
function duck(on: boolean): void {
  if (on) {
    const video = adapter?.element ?? best;
    if (ducked || !video || video.muted) return;
    ducked = { video, volume: video.volume };
    video.volume = ducked.volume * DUCK_RATIO;
    return;
  }
  if (!ducked) return;
  const { video, volume } = ducked;
  ducked = null;
  if (Math.abs(video.volume - volume * DUCK_RATIO) < 0.02) video.volume = volume;
}

function deactivate(): void {
  duck(false);
  skin(false);
  active = false;
  // Bu çerçeve artık etkin değil: işareti site kaldırır (arka plan buradan bir şey iletmez).
  adReported = false;
  watchSource(null);
  if (statusTimer !== null) clearInterval(statusTimer);
  statusTimer = null;
  engine?.destroy();
  engine = null;
  adapter?.release();
  adapter = null;
  clearStart();
}

// ---- Katman (kabuk) ve videonun yeri ----

let shell: HTMLIFrameElement | null = null;
/** Katmanın açıldığı oda (sadece bu betikte; film sayfasının DOM'unda yok). */
let shellRoom: string | null = null;
let layout: ShellLayout | null = null;
let layoutActive = false;

/** Üst çerçeve: sitenin oda sayfasını tam ekran katman olarak açar (eklentinin shell.html'i üzerinden). */
function openShell(roomId: string): void {
  if (!isTop) return;
  if (shell?.isConnected && shellRoom === roomId) return;
  shell?.remove();
  shell = document.createElement('iframe');
  shellRoom = roomId;
  shell.setAttribute('data-swm-shell', '');
  // Oda kimliği adreste/özniteliklerde durmaz: film sitesi katmanın öğesini okuyabilir, kimliği görüp odaya
  // girmesin. shell.html kimliği arka plandan ister (arka plan sekmenin gerçekten odada olduğuna bakar).
  shell.src = chrome.runtime.getURL('shell.html');
  shell.allow = 'autoplay; clipboard-write';
  shell.setAttribute('aria-label', 'Sidelit');
  // Sayfanın CSS'i katmanı bozmasın: her şey satır içi ve !important.
  shell.style.cssText = [
    'position:fixed',
    'top:0',
    'left:0',
    'width:100vw',
    'height:100vh',
    'border:0',
    'margin:0',
    'padding:0',
    'z-index:2147483647',
    'background:transparent',
    // Sitemiz koyu renk şeması ilan ediyor (meta color-scheme dark): çerçeveyle şema farklı olursa Chrome
    // çerçevenin arkasını opak griye boyar, deliğin içindeki mesajlar saydam görünmez. Zincirin her halkası koyu.
    'color-scheme:dark',
    'display:block',
    'visibility:visible',
    'opacity:1',
  ]
    .map((rule) => `${rule} !important`)
    .join(';');
  // <html>'e eklenir: odak modunda <body> gizlenir.
  document.documentElement.append(shell);
  // Bazı siteler sayfaya eklenen yabancı öğeleri siler: katman kaybolursa geri koy.
  reattachTimer ??= setInterval(() => {
    if (shell && !shell.isConnected) document.documentElement.append(shell);
  }, 2000);
  applyLayout();
}
let reattachTimer: ReturnType<typeof setInterval> | null = null;

function removeShell(): void {
  shell?.remove();
  holeOpen = false;
  shell = null;
  if (reattachTimer !== null) clearInterval(reattachTimer);
  reattachTimer = null;
}

/**
 * İç içe oynatıcı: video bir iç çerçevedeyse üstteki sayfalar "en büyük çerçeve"yi değil, videonun
 * gerçekten olduğu çerçeveyi büyütsün (büyük bir reklam çerçevesi yanlış seçilmesin). Videolu çerçeve
 * üstüne "buradayım" der; her ara çerçeve mesajın hangi iframe'inden geldiğini bulur ve yukarı iletir.
 * Sadece yerleşimi etkiler; başka bir sayfanın bu mesajı yollaması zarar vermez.
 */
const FOCUS_MESSAGE = 'swm-focus-here';
let focusChild: { frame: HTMLElement; at: number } | null = null;
function tellParents(): void {
  if (!isTop) window.parent.postMessage({ type: FOCUS_MESSAGE }, '*');
}
function recentChild(): HTMLElement | null {
  return focusChild && Date.now() - focusChild.at < 5000 ? focusChild.frame : null;
}
addEventListener('message', (event) => {
  if (!port || (event.data as { type?: unknown } | null)?.type !== FOCUS_MESSAGE || !event.source) return;
  const frame = [...document.querySelectorAll<HTMLIFrameElement>('iframe, frame')].find((f) => f.contentWindow === event.source);
  if (!frame) return;
  focusChild = { frame, at: Date.now() };
  tellParents();
});

function setLayout(next: ShellLayout | null, isActive: boolean, fromSite = false): void {
  layout = next;
  // Site katmanda çizildi ve yerleşimini bildirdi: örtüye gerek kalmadı (video deliğe oturduktan sonraki karede
  // kalkar). Arka planın yer tutucusuyla kalkarsa katman henüz boşken film sayfası bir an görünürdü. Bu sekmede
  // bu sitede oda sürdükçe sonraki sayfalar da beklemeden örtülür (sessionStorage sekmeye ve siteye özel).
  if (next && isTop && fromSite) {
    requestAnimationFrame(() => requestAnimationFrame(uncover));
    try {
      sessionStorage.setItem(COVER_FLAG, '1');
    } catch {
      // Depo kapalı: sorun değil.
    }
  }
  layoutActive = isActive;
  // Oda görünümündeyken film sitesinin tam ekranı odanınkine yönlenir (fullscreen-guard.ts bu işarete bakar).
  document.documentElement.toggleAttribute('data-swm-room', next?.mode === 'full');
  applyLayout();
  watchLayout();
}

/** Katmanın boyutu/deliği ve videonun yeri (yerleşim, pencere boyutu ya da video değişince). */
/** Delik açıldı mı (ilk açılış iki kare gecikir, bkz. applyLayout). */
let holeOpen = false;
let holeOpening = false;

function applyLayout(): void {
  const l = layout;
  if (isTop && shell) {
    const s = shell.style;
    if (l?.mode === 'full') {
      s.setProperty('height', '100vh', 'important');
      const clip = holePath(innerWidth, innerHeight, l.hole, l.islands);
      if (holeOpen) s.setProperty('clip-path', clip, 'important');
      else if (!holeOpening) {
        // Delik ilk kez açılırken: önce odak (sayfa gizlenir, oynatıcı deliğin yerine taşınır), iki kare sonra delik.
        // Chrome kesme yolunu sayfanın yeniden yerleşiminden önce çizebiliyor: aynı anda yapınca delikten bir kare
        // film sitesinin eski hâli görünüyordu.
        holeOpening = true;
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            holeOpening = false;
            if (layout?.mode !== 'full' || !shell) return;
            holeOpen = true;
            applyLayout();
            send({ type: 'hole' });
          }),
        );
      }
    } else {
      holeOpen = false;
      s.setProperty('height', l?.mode === 'bar' ? `${l.height}px` : '100vh', 'important');
      s.removeProperty('clip-path');
    }
  }
  if (l?.mode !== 'full') {
    applyFocus(false, null);
    return;
  }
  // Üst çerçevede video (ya da videolu çerçeve) deliğe oturur; iç çerçevelerde kendi alanlarını kaplar.
  const inset: Insets = isTop
    ? { top: l.hole.y, left: l.hole.x, right: Math.max(0, innerWidth - l.hole.x - l.hole.w), bottom: Math.max(0, innerHeight - l.hole.y - l.hole.h) }
    : NO_INSETS;
  if (layoutActive) {
    // Video bir anlığına kaybolsa da (oynatıcı kendini yeniden kurarken) odak açık kalır: sayfa görünmesin.
    applyFocus(true, best, inset);
    tellParents();
  } else {
    applyFocus(true, null, inset, recentChild());
  }
  muteStrays();
}
addEventListener('resize', applyLayout);
// Oynatıcılar kendini yeniden kurabilir: oda görünümündeyken arada bir yeniden yerleştir
// (oda yokken zamanlayıcı çalışmaz: "odada değilken hiçbir şey yapmaz").
let layoutTimer: ReturnType<typeof setInterval> | null = null;
function watchLayout(): void {
  const on = layout?.mode === 'full';
  if (on && layoutTimer === null) layoutTimer = setInterval(applyLayout, 1500);
  if (!on && layoutTimer !== null) {
    clearInterval(layoutTimer);
    layoutTimer = null;
  }
}

// Bizim ⛶ (sayfanın tamamı tam ekran): bitince/başlayınca site bilsin (Esc ile çıkılabilir).
// Film sitesinin tam ekranı (oynatıcının kendi düğmesi ya da videonun yerleşik düğmesi) sadece videoyu
// gösterirdi: oda görünümündeyken ondan çıkılır ve odanın tam ekranı istenir.
let fullscreenBefore: Element | null = null;
document.addEventListener('fullscreenchange', () => {
  if (!port) return;
  const element = document.fullscreenElement;
  const before = fullscreenBefore;
  fullscreenBefore = element;
  if (layout?.mode === 'full' && element && element !== document.documentElement) {
    // EXT1: in the top frame (e.g. the video's own native ⛶, which fullscreen-guard can't redirect) go straight to the
    // whole page's fullscreen, the room's; exiting first and asking the site raced the exit and often came to nothing.
    // Pressed while the room's fullscreen was on, it means "leave": all the way out.
    if (isTop && before === document.documentElement) void leaveFullscreen();
    else if (isTop) void document.documentElement.requestFullscreen().catch(() => leaveFullscreen().then(() => send({ type: 'fullscreen' })));
    else {
      void document.exitFullscreen().catch(() => {});
      send({ type: 'fullscreen' });
    }
    return;
  }
  if (isTop) send({ type: 'fullscreen-changed', on: element === document.documentElement });
});
async function leaveFullscreen(): Promise<void> {
  for (let i = 0; i < 3 && document.fullscreenElement; i++) await document.exitFullscreen().catch(() => {});
}
// fullscreen-guard.ts (sayfanın dünyası) film sitesinin tam ekran isteğini yakaladı.
document.addEventListener('swm-fullscreen-request', () => {
  if (port && layout?.mode === 'full') send({ type: 'fullscreen' });
});

// Fare film sayfasında (deliğin içinde) oynayınca site bunu göremez: tam ekran kontrolleri bekleyince
// kaybolur, fare oynayınca geri gelsin diye siteye haber verilir (en fazla 0,4 sn'de bir).
let lastActivity = 0;
/** Card R5: the mouse was in the last FILM_EDGE px of the film (the synced video) at the last move. */
let atEdge = false;
for (const type of ['mousemove', 'mousedown', 'wheel', 'touchstart'] as const) {
  addEventListener(
    type,
    (event) => {
      if (!port || layout?.mode !== 'full') return;
      const now = Date.now();
      // Tıklama hep bildirilir: hemen ardından sekme başka siteye giderse arka plan bunu reklam yönlendirmesi sayar.
      const click = type === 'mousedown' || type === 'touchstart';
      // Card R5: the film page's rail opens when the mouse reaches the film's right edge. Our overlay only hears the
      // thin gutter beside the film, so the film's own frame says when the mouse enters / leaves its last FILM_EDGE px
      // (at once, not throttled: a mouse passing by goes in and out before the site's short wait ends).
      const video = watched ?? best;
      let edge: boolean | undefined;
      if (type === 'mousemove' && video && event instanceof MouseEvent) {
        const r = video.getBoundingClientRect();
        edge = r.width > 0 && event.clientY >= r.top && event.clientY <= r.bottom && event.clientX >= r.right - FILM_EDGE && event.clientX <= r.right + 2;
        if (edge !== atEdge) {
          atEdge = edge;
          lastActivity = now;
          send({ type: 'activity', edge });
          return;
        }
      }
      if (!click && now - lastActivity < 400) return;
      lastActivity = now;
      send(click ? { type: 'activity', click: true } : atEdge ? { type: 'activity', edge: true } : { type: 'activity' });
    },
    { capture: true, passive: true },
  );
}

// Kısayollar (1–8 emoji, Enter mesaj, P pin) odak film sayfasındayken de çalışsın: tuşu film
// sitesine göstermeden (oynatıcılar rakamlarla sarar) siteye iletiriz. Sadece oda görünümündeyken.
addEventListener(
  'keydown',
  (event) => {
    if (!port || layout?.mode !== 'full' || event.ctrlKey || event.metaKey || event.altKey || !isForwardedKey(event.key)) return;
    const target = event.composedPath()[0];
    if (target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!event.repeat) send({ type: 'key', key: event.key });
  },
  true,
);
// Bas-konuş: tuşun bırakılması da gider (yoksa mikrofon açık kalırdı).
addEventListener(
  'keyup',
  (event) => {
    if (!port || layout?.mode !== 'full' || !isPushToTalkKey(event.key)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    send({ type: 'key', key: event.key, up: true });
  },
  true,
);

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
      // Sayfa açılırken reklam, katmandaki site hazır olmadan başladıysa ilk haber kaybolmuş olabilir: site filmi
      // kurunca durumu yollar, "reklamdayım" o an tekrar söylenir.
      if (adReported) sendAd();
      break;
    case 'clock':
      clock.set(message.offset, message.synced);
      break;
    case 'control':
      onControl(message.control);
      break;
    case 'shell-open':
      openShell(message.roomId);
      break;
    case 'shell-layout':
      setLayout(message.layout, message.active, message.fromSite);
      break;
    case 'shell-fullscreen':
      if (!isTop) break;
      if (message.on && !document.fullscreenElement) void document.documentElement.requestFullscreen().catch(() => {});
      else if (!message.on && document.fullscreenElement) void document.exitFullscreen().catch(() => {});
      break;
    case 'deactivate':
      // Odada artık bu film yok: video burada kendiliğinden durur (odaya bir şey gitmez). Sadece başka
      // çerçeve seçildiyse durdurulmaz (ör. kısa süre büyük bir reklam videosu çıktı).
      if (message.pause) best?.pause();
      deactivate();
      break;
    case 'idle':
      sleep();
      break;
    case 'pick':
      if (message.on) startPicking(pick, best);
      else stopPicking();
      break;
    case 'unpick':
      // Başka bir çerçevedeki video seçildi: bu çerçeve yine puanına göre aday olur. Senkron buradaydıysa yanlış
      // video sussun (yoksa iki ses üst üste çalardı).
      if (adapter) best?.pause();
      picked = null;
      reportedScore = -1;
      scan();
      break;
  }
}

/** Kullanıcı bu videoyu seçti: arka plana haber ver, video bu çerçevenin (ve odanın) videosu olur. */
function pick(video: HTMLVideoElement): void {
  // Yanlış seçilmiş video (fragman, reklam) sussun.
  if (best && best !== video) best.pause();
  picked = video;
  stopPicking();
  send({ type: 'picked' });
  reportedScore = -1;
  scan();
}

// Arka plan "bu sekmede oda var" der (sekmedeki tüm çerçevelere gider).
chrome.runtime.onMessage.addListener((message: unknown) => {
  if ((message as { type?: string } | null)?.type !== PROBE || insideOurSite) return;
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

/** Herhangi bir sekme kabukluysa bağlan (arka plan bu sekmeye ait değilse "uyu" der). */
async function checkSessions(): Promise<void> {
  if (port || insideOurSite) return;
  const items = await chrome.storage.session.get(SESSIONS_KEY).catch(() => ({}) as Record<string, unknown>);
  const sessions = items[SESSIONS_KEY];
  // Bu siteye açılmış bir oda var: oda katmanı gelene kadar film sayfası hiç görünmesin.
  if (isTop && Array.isArray(sessions) && sessions.some((entry) => (entry as { site?: unknown } | null)?.site === siteOf(location.href))) cover();
  if (hasSessions(sessions)) connect();
  else {
    uncover();
    try {
      sessionStorage.removeItem(COVER_FLAG);
    } catch {
      // Depo kapalı.
    }
  }
}

// ---- Örtü: film sayfası açılırken oda katmanı binene kadar bir an bile görünmesin ----
// Katman (shell.html → sitemiz) arka planla konuştuktan sonra açılır; o arada sayfa çizilirdi. Örtü sayfa
// yüklenmeye başlar başlamaz (document_start) sitenin "Gece" zeminiyle her şeyi kapatır; katmanın ilk
// yerleşimi gelince kalkar. Aynı sekmede aynı sitede (sonraki bölüm, yenileme) beklemeden örter.
const COVER_FLAG = 'swm-cover';
const COVER_HASH = `#${COVER_FLAG}`;
let coverEl: HTMLElement | null = null;
let coverTimer: ReturnType<typeof setTimeout> | null = null;

/** Adresin "sitesi" (arka plandaki siteOf ile aynı: alan adının son iki parçası). */
function siteOf(url: string): string {
  try {
    return new URL(url).hostname.split('.').slice(-2).join('.');
  } catch {
    return '';
  }
}

function cover(): void {
  if (!isTop || coverEl?.isConnected) return;
  coverEl = document.createElement('div');
  coverEl.setAttribute('data-swm-cover', '');
  coverEl.style.cssText = [
    'position:fixed',
    'inset:0',
    'z-index:2147483646',
    'background:linear-gradient(#171c40, #0c0e1e 60%)',
    // Görünmeyen sayfaya (reklam tuzakları) tıklanmasın: örtü tıklamayı yutar, ilk yerleşimde zaten kalkar.
    'pointer-events:auto',
    'display:block',
    'visibility:visible',
    'opacity:1',
  ]
    .map((rule) => `${rule} !important`)
    .join(';');
  document.documentElement.append(coverEl);
  // Bir şey ters giderse (oda gelmedi) sayfa sonsuza dek örtülü kalmasın.
  if (coverTimer !== null) clearTimeout(coverTimer);
  coverTimer = setTimeout(uncover, 8000);
}

function uncover(): void {
  coverEl?.remove();
  coverEl = null;
  if (coverTimer !== null) clearTimeout(coverTimer);
  coverTimer = null;
}

if (isTop && !insideOurSite) {
  // First arrival from our site: the background adds `#swm-cover` to the film address (the film origin has no
  // sessionStorage flag yet, and waiting for storage.session lost the race against the first paint: the film site
  // flashed for one frame). Removed before any page script runs; it carries no room information.
  if (location.hash === COVER_HASH) {
    history.replaceState(history.state, '', location.href.slice(0, -COVER_HASH.length));
    cover();
  }
  try {
    if (sessionStorage.getItem(COVER_FLAG) === '1') cover();
  } catch {
    // Depo kapalı (bazı gizlilik ayarları): örtü depodaki oda listesiyle gelir.
  }
}

if (!insideOurSite) {
  void checkSessions();
  // Sonradan bir oda açılırsa (site sekmeyi film sayfasına gönderince) haberimiz olsun.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'session' && hasSessions(changes[SESSIONS_KEY]?.newValue) && !port) connect();
  });
}
