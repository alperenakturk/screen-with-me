// Sitenin asıl başlangıcı (main.ts, ayarlar eklentiyle eşitlendikten sonra bunu yükler).
import { createLogo } from '@swm/shared/logo';
import { ROOM_ID_PATTERN } from '@swm/shared/protocol';
import { lang, setLang, translate, type Lang } from './i18n.ts';
import { applyTheme, currentTheme, openThemeDialog } from './themes.ts';

const app = document.querySelector<HTMLElement>('#app')!;
document.documentElement.lang = lang();
applyTheme(currentTheme(), { wait: false });

// Geri tuşuyla dönülünce tarayıcı sayfayı önbellekten "donmuş" haliyle getirebilir (bağlantı
// kapalı, "Sayfaya gidiliyor…" yazısı takılı kalır). Öyleyse sayfayı tazele.
addEventListener('pageshow', (event) => {
  if (event.persisted) location.reload();
});

// Üst çubuktaki logo: üzerine gelince ağızdaki oynat düğmesi duraklata döner.
document.querySelector('.brand .logo')?.append(createLogo(document, { animated: true }));

// Üst menüdeki 🎨: önizlemeli büyük tema penceresi.
document.querySelector<HTMLButtonElement>('#theme-button')!.addEventListener('click', openThemeDialog);

const langButtons = document.querySelectorAll<HTMLButtonElement>('[data-lang]');
function markLang(): void {
  for (const button of langButtons) button.setAttribute('aria-pressed', String(button.dataset.lang === lang()));
}
for (const button of langButtons) {
  button.addEventListener('click', () => {
    setLang(button.dataset.lang as Lang);
    markLang();
  });
}
markLang();

// Basit yönlendirme: /r/<oda> bir oda, geri kalan her şey ana sayfa. Oda ve ana sayfa ayrı parçalar: ana sayfa odanın
// büyük kodunu (oynatıcılar, sohbet, ses…) indirmez, ilk açılış hızlanır.
const match = location.pathname.match(/^\/r\/([^/]+)\/?$/);
const roomId = match ? decodeURIComponent(match[1]!) : null;
// PlayWithMe oyun köşesi: /oyun (oyunlar) ve /oyun/xox/<kod> (maç).
const game = location.pathname.match(/^\/oyun\/xox\/([A-Za-z0-9_-]{3,40})\/?$/);
if (game) {
  void import('./games/xox.ts').then(({ renderXox }) => {
    renderXox(app, game[1]!);
    translate();
  });
} else if (/^\/oyun\/?$/.test(location.pathname)) {
  void import('./games/hub.ts').then(({ renderGames }) => {
    renderGames(app);
    translate();
  });
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
