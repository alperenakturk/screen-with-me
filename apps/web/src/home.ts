import { extractRoomId, newRoomId } from '@swm/shared/room-id';
import { el } from './dom.ts';
import { forgetRoom, myRoomId, recentRooms } from './recent-rooms.ts';
import { t, translate } from './i18n.ts';
import { renderThemeStrip } from './themes.ts';

/** Bir "nasıl çalışır" adımı: büyük resim (emoji), başlık ve kısa açıklama (i18n anahtarları). */
interface Step {
  icon: string;
  title: string;
  text: string;
  /** İsteğe bağlı buton: [i18n anahtarı, link]. */
  action?: [string, string];
}

const YOUTUBE_STEPS: Step[] = [
  { icon: '🏠', title: 'how.yt.1.title', text: 'how.yt.1.text' },
  { icon: '🔗', title: 'how.yt.2.title', text: 'how.yt.2.text' },
  { icon: '📋', title: 'how.yt.3.title', text: 'how.yt.3.text' },
  { icon: '🍿', title: 'how.yt.4.title', text: 'how.yt.4.text' },
];

const SITE_STEPS: Step[] = [
  { icon: '🧩', title: 'how.site.1.title', text: 'how.site.1.text', action: ['how.site.1.action', '/eklenti.html'] },
  { icon: '🌐', title: 'how.site.2.title', text: 'how.site.2.text' },
  { icon: '🎬', title: 'how.site.3.title', text: 'how.site.3.text' },
  { icon: '🔗', title: 'how.site.4.title', text: 'how.site.4.text' },
  { icon: '🍿', title: 'how.site.5.title', text: 'how.site.5.text' },
];

function stepsHtml(steps: Step[]): string {
  return steps
    .map(
      (step, index) => `
        <li class="how-step">
          <div class="how-icon" aria-hidden="true">${step.icon}<span class="how-num">${index + 1}</span></div>
          <h4 data-i18n="${step.title}"></h4>
          <p data-i18n="${step.text}"></p>
          ${step.action ? `<a class="btn primary" href="${step.action[1]}" data-i18n="${step.action[0]}"></a>` : ''}
        </li>`,
    )
    .join('');
}

export function renderHome(app: HTMLElement): void {
  app.innerHTML = `
    <nav id="theme-strip" class="theme-strip" role="radiogroup" aria-label="Theme"></nav>
    <section class="hero">
      <div class="theme-mascot" aria-hidden="true"></div>
      <h1>ScreenWithMe</h1>
      <p class="tagline" data-i18n="tagline"></p>
      <div class="create-row">
        <button id="create" type="button" class="btn primary big" data-i18n="createRoom"></button>
        <button id="my-room" type="button" class="btn big" data-i18n-title="myRoomHint">🏠 <span data-i18n="myRoom"></span></button>
      </div>
      <div class="divider"><span data-i18n="or"></span></div>
      <form id="join" class="row">
        <input id="join-input" data-i18n-placeholder="joinPlaceholder" autocomplete="off" />
        <button class="btn" data-i18n="join"></button>
      </form>
      <p id="join-error" class="error" data-i18n="invalidRoom" hidden></p>
      <div id="recent" class="recent" hidden>
        <h3 data-i18n="recentRooms"></h3>
        <ul id="recent-list"></ul>
      </div>
    </section>

    <section class="how">
      <h2 data-i18n="how.title"></h2>

      <div class="how-flow">
        <h3><span class="how-badge">▶</span> <span data-i18n="how.yt.title"></span></h3>
        <ol class="how-steps">${stepsHtml(YOUTUBE_STEPS)}</ol>
      </div>

      <div class="how-flow">
        <h3><span class="how-badge site">🌐</span> <span data-i18n="how.site.title"></span></h3>
        <ol class="how-steps">${stepsHtml(SITE_STEPS)}</ol>
      </div>
    </section>
  `;
  translate(app);
  renderThemeStrip(app.querySelector<HTMLElement>('#theme-strip')!);

  app.querySelector('#create')!.addEventListener('click', () => {
    location.assign(`/r/${newRoomId()}`);
  });
  // "Benim odam": hep aynı link (arkadaşlar her seferinde aynı linkle girer).
  app.querySelector('#my-room')!.addEventListener('click', () => {
    location.assign(`/r/${myRoomId()}`);
  });
  renderRecent(app);
  window.addEventListener('langchange', () => renderRecent(app));

  const form = app.querySelector<HTMLFormElement>('#join')!;
  const input = app.querySelector<HTMLInputElement>('#join-input')!;
  const error = app.querySelector<HTMLElement>('#join-error')!;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const id = extractRoomId(input.value);
    error.hidden = id !== null;
    if (id !== null) location.assign(`/r/${id}`);
  });
}

/** Son girilen odalar: başlık (yoksa oda adı), ne zaman; × listeden siler. */
function renderRecent(app: HTMLElement): void {
  const box = app.querySelector<HTMLElement>('#recent')!;
  const list = app.querySelector<HTMLElement>('#recent-list')!;
  const mine = myRoomId();
  const rooms = recentRooms();
  box.hidden = rooms.length === 0;
  list.replaceChildren(
    ...rooms.map((room) => {
      const link = el('a', { href: `/r/${room.id}`, class: 'recent-link' }, el('b', {}, room.id === mine ? `🏠 ${t('myRoom')}` : room.title ?? room.id), el('span', { class: 'muted small' }, ago(room.at)));
      const remove = el('button', { type: 'button', class: 'icon-btn', title: t('remove'), 'aria-label': t('remove') }, '✕');
      remove.addEventListener('click', () => {
        forgetRoom(room.id);
        renderRecent(app);
      });
      return el('li', {}, link, remove);
    }),
  );
}

/** "az önce", "5 dk önce", "3 sa önce", "2 gün önce". */
function ago(at: number): string {
  const min = Math.round((Date.now() - at) / 60000);
  if (min < 1) return t('agoNow');
  if (min < 60) return t('agoMin', { n: min });
  if (min < 60 * 24) return t('agoHour', { n: Math.round(min / 60) });
  return t('agoDay', { n: Math.round(min / 1440) });
}
