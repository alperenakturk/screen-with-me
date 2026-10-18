import './styles.css';
import { createLogo } from '@swm/shared/logo';
import { ROOM_ID_PATTERN } from '@swm/shared/protocol';
import { renderHome } from './home.ts';
import { lang, setLang, translate, type Lang } from './i18n.ts';
import { renderRoom } from './room.ts';
import { applyTheme, currentTheme, renderThemePicker } from './themes.ts';

const app = document.querySelector<HTMLElement>('#app')!;
document.documentElement.lang = lang();
applyTheme(currentTheme());

// Üst çubuktaki logo: üzerine gelince ağızdaki oynat düğmesi duraklata döner.
document.querySelector('.brand .logo')?.append(createLogo(document, { animated: true }));

// Üst menüdeki 🎨: tema seçme kutusu.
const themeButton = document.querySelector<HTMLButtonElement>('#theme-button')!;
const themeMenu = document.querySelector<HTMLElement>('#theme-menu')!;
renderThemePicker(themeMenu);
const setThemeMenu = (open: boolean) => {
  themeMenu.hidden = !open;
  themeButton.setAttribute('aria-expanded', String(open));
  if (open) themeMenu.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
};
themeButton.addEventListener('click', (event) => {
  event.stopPropagation();
  setThemeMenu(themeMenu.hidden === true);
});
document.addEventListener('click', (event) => {
  if (!themeMenu.contains(event.target as Node)) setThemeMenu(false);
});
// Esc ile kapanır ve odak düğmeye döner.
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !themeMenu.hidden) {
    setThemeMenu(false);
    themeButton.focus();
  }
});

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
