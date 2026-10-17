import './styles.css';
import { ROOM_ID_PATTERN } from '@swm/shared/protocol';
import { renderHome } from './home.ts';
import { lang, setLang, translate, type Lang } from './i18n.ts';
import { renderRoom } from './room.ts';

const app = document.querySelector<HTMLElement>('#app')!;
document.documentElement.lang = lang();

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
