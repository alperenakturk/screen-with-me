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
import { isForwardedKey, type EmbedControl } from '@swm/shared/embed';
import type { PlaybackState } from '@swm/shared/protocol';
import { holePath, type ShellLayout } from '@swm/shared/shell';
import { SyncEngine } from '@swm/shared/sync-engine';
import { describeVideo, findVideos, scoreVideo, wrapVideoElement } from '@swm/shared/video-element';
import { SITE_URL } from './config.ts';
import { applyFocus, NO_INSETS, type Insets } from './focus.ts';
import { PORT_NAME, PROBE, SESSIONS_KEY, type BackgroundMessage, type FrameMessage } from './messages.ts';
import { askToStart, clearStart } from './start-card.ts';

const SCAN_MS = 1000;
const SITE_ORIGIN = new URL(SITE_URL).origin;
const isTop = window === window.top;

// Sitemizin içindeki çerçevelerde (sitenin YouTube oynatıcısı, kabuktaki site) hiçbir şey yapma.
const insideOurSite = Array.from(location.ancestorOrigins ?? []).includes(SITE_ORIGIN);

let port: chrome.runtime.Port | null = null;
let scanTimer: ReturnType<typeof setInterval> | null = null;
let observer: MutationObserver | null = null;
let best: HTMLVideoElement | null = null;
let reportedScore = -1;

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
  send({
    type: 'status',
    status: { time: adapter.getTime(), duration: adapter.getDuration(), paused: adapter.isPaused(), rate: adapter.getRate() },
  });
}

/**
 * Sitenin kontrolleri (tam ekran çubuğu, pin şeridi, hız menüsü) videoya doğrudan uygulanır;
 * motor bunu kullanıcı hareketi olarak görüp odaya yayar (film sitesinin kendi düğmesiyle aynı).
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

function deactivate(): void {
  active = false;
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
  shell.setAttribute('aria-label', 'ScreenWithMe');
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
function applyLayout(): void {
  const l = layout;
  if (isTop && shell) {
    const s = shell.style;
    if (l?.mode === 'full') {
      s.setProperty('height', '100vh', 'important');
      s.setProperty('clip-path', holePath(innerWidth, innerHeight, l.hole, l.islands), 'important');
    } else {
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
    applyFocus(!!best, best, inset);
    tellParents();
  } else {
    applyFocus(true, null, inset, recentChild());
  }
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
document.addEventListener('fullscreenchange', () => {
  if (!port) return;
  const element = document.fullscreenElement;
  if (layout?.mode === 'full' && element && element !== document.documentElement) {
    void document.exitFullscreen().catch(() => {});
    send({ type: 'fullscreen' });
    return;
  }
  if (isTop) send({ type: 'fullscreen-changed', on: element === document.documentElement });
});
// fullscreen-guard.ts (sayfanın dünyası) film sitesinin tam ekran isteğini yakaladı.
document.addEventListener('swm-fullscreen-request', () => {
  if (port && layout?.mode === 'full') send({ type: 'fullscreen' });
});

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
  }
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
