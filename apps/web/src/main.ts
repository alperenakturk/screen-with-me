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
    missedOffline.add(chunkUrl(reason));
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
}
/** Chunks that failed while offline ('' = address unknown). */
const missedOffline = new Set<string>();
/** The chunk's address in a failed import's message, if it names one. */
function chunkUrl(reason: unknown): string {
  const text = String((reason as Error | undefined)?.message ?? reason ?? '');
  return text.match(/(?:https?:\/\/[^\s'"]+|\/assets\/[^\s'"]+?)\.(?:js|css)\b/)?.[0] ?? '';
}
// Back online: fetch the missed chunks again; only if one still fails (or can't be named) does the page reload, so a
// chunk missed during a drop never leaves a dead button. (Chrome keeps a failed module import for the page's life, so
// there it reloads once, into the working room; other browsers may load it again in place.)
addEventListener('online', () => {
  if (!missedOffline.size) return;
  const urls = [...missedOffline];
  missedOffline.clear();
  setTimeout(() => {
    const retry = (url: string): Promise<unknown> =>
      !url ? Promise.reject(new Error('unknown chunk')) : url.endsWith('.css') ? fetch(url).then((r) => (r.ok ? r : Promise.reject(new Error(String(r.status))))) : import(/* @vite-ignore */ url);
    Promise.all(urls.map(retry)).catch(() => reloadForNewVersion());
  }, 1000);
});
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
