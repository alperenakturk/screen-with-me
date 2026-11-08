import './styles.css';
import './phone.css';
import { markDevice } from './device.ts';
import { isShell, syncStore } from './storage.ts';
import { keepFloatingInFullscreen } from './ui/fs-layer.ts';
import { HANDOFF_PREFIX, onAlias } from './site.ts';
import { loadLang } from './i18n.ts';

markDevice();
keepFloatingInFullscreen();

// Film sayfasının üstündeki oda katmanında (kabuk) sitenin bazı parçaları (eklenti linki, ana sayfa
// logosu, alt bilgi) gizlenir; sınıf en başta konur ki ilk karede görünmesin.
if (isShell) document.documentElement.classList.add('shell');

// Yeni sürüm yüklenince eski parça dosyaları (oda, oyunlar…) sunucudan silinir. Eski sayfa (açık kalmış sekme,
// önbellekteki sayfa) bir parçayı bulamazsa oda hiç açılmıyordu: sayfa bir kez kendiliğinden yenilenir (döngü olmasın
// diye en fazla 30 sn'de bir).
function reloadForNewVersion(reason?: unknown): void {
  // Offline, a chunk that didn't load is the network, not a new version: a reload now would only show the browser's
  // offline page (BH13-G: an 8 s drop mid-game threw the whole room away). It is tried again once we are back online.
  if (!navigator.onLine) {
    rememberMissed(reason);
    return;
  }
  // Card OFFLINE2: `navigator.onLine` stays true while the Wi-Fi is connected but has no internet (a phone hotspot
  // losing signal, the router's line down). Ask our own site first: if it doesn't answer, it's the network again.
  void originAnswers().then((up) => {
    if (!up) {
      rememberMissed(reason);
      return;
    }
    const key = 'swm-stale-reload';
    let last = 0;
    try {
      last = Number(sessionStorage.getItem(key) ?? 0);
      sessionStorage.setItem(key, String(Date.now()));
    } catch {
      // Depo kapalı: yine de bir kez yenile.
    }
    if (Date.now() - last > 30_000) location.reload();
  });
}
/** How long the reachability check waits for our site before calling the network down. */
const PROBE_MS = 3000;
/** How often a page with a missed chunk asks whether our site answers again (`online` never fires on a "connected" Wi-Fi). */
const REPROBE_MS = 10_000;
/** Does our own site answer at all? Any HTTP answer counts (a 404 still means the network works). */
async function originAnswers(): Promise<boolean> {
  try {
    await fetch(location.pathname, { method: 'HEAD', cache: 'no-store', signal: AbortSignal.timeout(PROBE_MS) });
    return true;
  } catch {
    return false;
  }
}
/** Chunks that failed while offline ('' = address unknown). */
const missedOffline = new Set<string>();
let reprobe = 0;
function rememberMissed(reason: unknown): void {
  missedOffline.add(chunkUrl(reason));
  if (!reprobe) reprobe = window.setInterval(() => void originAnswers().then((up) => up && backOnline()), REPROBE_MS);
}
/** The chunk's address in a failed import's message, if it names one. */
function chunkUrl(reason: unknown): string {
  const text = String((reason as Error | undefined)?.message ?? reason ?? '');
  return text.match(/(?:https?:\/\/[^\s'"]+|\/assets\/[^\s'"]+?)\.(?:js|css)\b/)?.[0] ?? '';
}
// Back online: fetch the missed chunks again; only if one still fails (or can't be named) does the page reload, so a
// chunk missed during a drop never leaves a dead button. (Chrome keeps a failed module import for the page's life, so
// there it reloads once, into the working room; other browsers may load it again in place.)
function backOnline(): void {
  if (reprobe) {
    clearInterval(reprobe);
    reprobe = 0;
  }
  if (!missedOffline.size) return;
  const urls = [...missedOffline];
  missedOffline.clear();
  const retry = (url: string): Promise<unknown> =>
    !url ? Promise.reject(new Error('unknown chunk')) : url.endsWith('.css') ? fetch(url).then((r) => (r.ok ? r : Promise.reject(new Error(String(r.status))))) : import(/* @vite-ignore */ url);
  Promise.all(urls.map(retry)).catch(() => reloadForNewVersion());
}
addEventListener('online', () => setTimeout(backOnline, 1000));
addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  reloadForNewVersion((event as Event & { payload?: unknown }).payload);
});
addEventListener('unhandledrejection', (event) => {
  const message = String((event.reason as Error | undefined)?.message ?? event.reason ?? '');
  if (/dynamically imported module|Importing a module script failed|error loading dynamically/i.test(message)) reloadForNewVersion(event.reason);
});

/**
 * Clickjacking guard (security review 1, O2): the site only runs as the top page or inside our extension's overlay
 * (`isShell`). Another website could otherwise frame a room and trick a click on "Join voice". The CSP can't say this
 * with `frame-ancestors`, because in the overlay the film site is an ancestor too.
 */
function framedElsewhere(): boolean {
  try {
    return window.top !== window && !isShell;
  } catch {
    return true;
  }
}

if (framedElsewhere()) {
  const link = document.createElement('a');
  link.href = location.href;
  link.target = '_blank';
  link.rel = 'noopener';
  link.textContent = 'Sidelit ↗';
  document.body.replaceChildren(link);
} else if (!isShell && onAlias()) {
  // An older address of the site (card R3-3): carry this browser's saves to the main address once and go there.
  // Never in the film page's overlay: an extension built for this address must keep working until it updates.
  void import('./domain-move.ts').then((m) => m.leaveAlias());
} else {
  // Arriving from an older address: take its saves in before anything reads them (a lazy chunk, only then).
  const handoff = !isShell && location.hash.startsWith(HANDOFF_PREFIX) ? import('./domain-move.ts').then((m) => void m.takeHandoff()) : Promise.resolve();
  // Önce ayarlar eklentiyle eşitlenir (dil, tema, isim ilk karede doğru gelsin), sonra site çizilir.
  void handoff
    .catch(() => {})
    .then(() => syncStore())
    // PERF1a: the page's language table (Turkish is its own chunk) is in before the first frame.
    .then(() => loadLang())
    .then(() => import('./app.ts'));
}
