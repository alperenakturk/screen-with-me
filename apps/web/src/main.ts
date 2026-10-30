import './styles.css';
import './phone.css';
import './tv.css';
import { markDevice } from './device.ts';
import { isShell, syncStore } from './storage.ts';
import { keepFloatingInFullscreen } from './ui/fs-layer.ts';

markDevice();
keepFloatingInFullscreen();

// Film sayfasının üstündeki oda katmanında (kabuk) sitenin bazı parçaları (eklenti linki, ana sayfa
// logosu, alt bilgi) gizlenir; sınıf en başta konur ki ilk karede görünmesin.
if (isShell) document.documentElement.classList.add('shell');

// Yeni sürüm yüklenince eski parça dosyaları (oda, oyunlar…) sunucudan silinir. Eski sayfa (açık kalmış sekme,
// önbellekteki sayfa) bir parçayı bulamazsa oda hiç açılmıyordu: sayfa bir kez kendiliğinden yenilenir (döngü olmasın
// diye en fazla 30 sn'de bir).
function reloadForNewVersion(): void {
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
addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  reloadForNewVersion();
});
addEventListener('unhandledrejection', (event) => {
  const message = String((event.reason as Error | undefined)?.message ?? event.reason ?? '');
  if (/dynamically imported module|Importing a module script failed|error loading dynamically/i.test(message)) reloadForNewVersion();
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
  link.textContent = 'ScreenWithMe ↗';
  document.body.replaceChildren(link);
} else {
  // Önce ayarlar eklentiyle eşitlenir (dil, tema, isim ilk karede doğru gelsin), sonra site çizilir.
  void syncStore().then(() => import('./app.ts'));
}
