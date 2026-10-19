import './styles.css';
import { createLogo } from '@swm/shared/logo';
import { ROOM_ID_PATTERN } from '@swm/shared/protocol';
import { renderHome } from './home.ts';
import { lang, setLang, translate, type Lang } from './i18n.ts';
import { renderRoom } from './room.ts';
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

// Basit yönlendirme: /r/<oda> bir oda, geri kalan her şey ana sayfa.
const match = location.pathname.match(/^\/r\/([^/]+)\/?$/);
const roomId = match ? decodeURIComponent(match[1]!) : null;
if (roomId !== null && ROOM_ID_PATTERN.test(roomId)) renderRoom(app, roomId);
else renderHome(app);

translate();
