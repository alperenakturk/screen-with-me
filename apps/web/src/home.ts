import { extractRoomId, newRoomId } from '@swm/shared/room-id';
import { translate } from './i18n.ts';

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
    <section class="hero">
      <h1>ScreenWithMe</h1>
      <p class="tagline" data-i18n="tagline"></p>
      <button id="create" type="button" class="btn primary big" data-i18n="createRoom"></button>
      <div class="divider"><span data-i18n="or"></span></div>
      <form id="join" class="row">
        <input id="join-input" data-i18n-placeholder="joinPlaceholder" autocomplete="off" />
        <button class="btn" data-i18n="join"></button>
      </form>
      <p id="join-error" class="error" data-i18n="invalidRoom" hidden></p>
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

  app.querySelector('#create')!.addEventListener('click', () => {
    location.assign(`/r/${newRoomId()}`);
  });

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
