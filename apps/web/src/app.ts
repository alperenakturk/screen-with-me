// Sitenin asıl başlangıcı (main.ts, ayarlar eklentiyle eşitlendikten sonra bunu yükler).
import { createLogo } from '@swm/shared/logo';
import { ROOM_ID_PATTERN } from '@swm/shared/protocol';
import { lang, setLang, translate, warmLang, type Lang } from './i18n.ts';
import { applyTheme, currentTheme, openThemeDialog, warmThemePreviews } from './themes.ts';
import { readTvLabSwitch, tvLab } from './tv-lab.ts';
import { checkExtensionVersion } from './ext-update.ts';
import { startDebugLab } from './debug-lab.ts';
import { startDialogFocus } from './ui/dialog-focus.ts';
import { isShell, replaceRemovedAvatars } from './storage.ts';

const app = document.querySelector<HTMLElement>('#app')!;
document.documentElement.lang = lang();
// Card R20: a saved avatar that was removed becomes a random themed one (after syncStore, so the extension's copy counts).
replaceRemovedAvatars();
applyTheme(currentTheme(), { wait: false });

// Geri tuşuyla dönülünce tarayıcı sayfayı önbellekten "donmuş" haliyle getirebilir (bağlantı
// kapalı, "Sayfaya gidiliyor…" yazısı takılı kalır). Öyleyse sayfayı tazele.
addEventListener('pageshow', (event) => {
  if (event.persisted) location.reload();
});

// Üst çubuktaki logo: üzerine gelince ağızdaki oynat düğmesi duraklata döner.
document.querySelector('.brand .logo')?.append(createLogo(document, { animated: true, small: true }));

// Üst menüdeki 🎨: önizlemeli büyük tema penceresi.
const themeButton = document.querySelector<HTMLButtonElement>('#theme-button')!;
themeButton.addEventListener('click', openThemeDialog);
for (const type of ['pointerenter', 'focus'] as const) themeButton.addEventListener(type, warmThemePreviews, { once: true });
// Card 15d: the static pages' 🎨 (help, privacy, thanks, extension) link to `/#theme`: the theme window opens here.
if (location.hash === '#theme') {
  history.replaceState(null, '', location.pathname + location.search);
  openThemeDialog();
}

const langButtons = document.querySelectorAll<HTMLButtonElement>('[data-lang]');
function markLang(): void {
  for (const button of langButtons) button.setAttribute('aria-pressed', String(button.dataset.lang === lang()));
}
for (const button of langButtons) {
  button.addEventListener('click', () => {
    void setLang(button.dataset.lang as Lang).then(markLang);
  });
  // PERF1a: the other language is its own chunk; fetch it while the pointer or the focus is on its button.
  const warm = (): void => warmLang(button.dataset.lang as Lang);
  button.addEventListener('pointerenter', warm);
  button.addEventListener('focus', warm);
}
markLang();

// TV version: hidden behind a lab switch (tv.ts `tvLab`); without it its pages fall back to the home page.
readTvLabSwitch();
// Hidden test panel (card 12): `?debug=1` once in a tab; nothing loads or is recorded otherwise.
startDebugLab(isShell);
startDialogFocus();
const tvPage = /^\/(tv|tv-test|tv-testi)(\/\d{6})?\/?$/.test(location.pathname);
if (tvPage && !tvLab()) history.replaceState(null, '', '/');

// Basit yönlendirme: /r/<oda> bir oda, geri kalan her şey ana sayfa. Oda ve ana sayfa ayrı parçalar: ana sayfa odanın
// büyük kodunu (oynatıcılar, sohbet, ses…) indirmez, ilk açılış hızlanır.
const match = location.pathname.match(/^\/r\/([^/]+)\/?$/);
const roomId = match ? decodeURIComponent(match[1]!) : null;
// Eski oyun köşesi adresleri (/oyun…) artık yok: oyunlar odanın içinde. Eski linkler ana sayfaya düşer.
if (/^\/oyun(\/|$)/.test(location.pathname)) history.replaceState(null, '', '/');
if (/^\/(connection|baglanti|connection-test)\/?$/.test(location.pathname)) {
  // Connection test, for people whose room stays on "Connecting…" (they send the result). `/connection` is its old
  // address (saved links keep working): the address bar shows the new one.
  if (!/^\/connection\/?$/.test(location.pathname)) history.replaceState(null, '', '/connection' + location.search + location.hash);
  void import('./diag.ts').then(({ renderDiag }) => renderDiag(app));
} else if (/^\/tv\/?$/.test(location.pathname)) {
  // TV version: this TV shows a code + QR; a phone in a room pairs it.
  void import('./tv.ts').then(({ renderTvPair }) => renderTvPair(app));
} else if (/^\/tv\/(\d{6})\/?$/.test(location.pathname)) {
  // On the phone, from the TV's QR: pick the room the TV joins.
  void import('./tv.ts').then(({ renderTvChooser }) => renderTvChooser(app, location.pathname.split('/')[2]!));
} else if (/^\/(tv-test|tv-testi)\/?$/.test(location.pathname)) {
  // TV test: what works in this TV browser (connection, YouTube, hearing voice, microphone, remote keys).
  void import('./tv-test.ts').then(({ renderTvTest }) => renderTvTest(app));
} else if (roomId !== null && ROOM_ID_PATTERN.test(roomId)) {
  void import('./room.ts').then(({ renderRoom }) => {
    renderRoom(app, roomId);
    translate();
  });
} else {
  void import('./home.ts').then(({ renderHome }) => {
    renderHome(app);
    translate();
  });
}
translate();
checkExtensionVersion();

// "Move to another device": the other device's QR leads here (`/#move=<code>`) and opens the receive window.
function openMoveFromHash(): void {
  const code = /^#move=(\d{6})$/.exec(location.hash)?.[1];
  if (!code || window.top !== window) return;
  history.replaceState(null, '', location.pathname + location.search);
  void import('./ui/move-device.ts').then(({ openMoveDialog }) => openMoveDialog(code));
}
openMoveFromHash();
addEventListener('hashchange', openMoveFromHash);

// Uygulama olarak eklenebilsin (PWA): sadece en üstteki pencerede (film sayfasındaki katmanda değil). Service worker
// dosyaları önbelleğe almaz, sadece çevrimdışıyken "bağlantı yok" sayfası gösterir (public/sw.js).
// (Bu dosya main.ts'ten sonra yüklenir; sayfanın "load"u çoktan geçmiş olabilir.)
if ('serviceWorker' in navigator && window.top === window) {
  const register = () => void navigator.serviceWorker.register('/sw.js').catch(() => {});
  if (document.readyState === 'complete') register();
  else addEventListener('load', register, { once: true });
}
