// PlayWithMe: ScreenWithMe'nin oyun köşesi (/oyun). Üstte logo (ScreenWithMe yüzü elinde oyun koluyla), altta oyunlar.
// Şimdilik sadece XOX oynanır; diğerleri "yakında". Her maç ayrı bir oda (/oyun/xox/<kod>), link paylaşılarak oynanır.

import { createLogo } from '@swm/shared/logo';
import { newRoomId } from '@swm/shared/room-id';
import { el } from '../dom.ts';
import { translate } from '../i18n.ts';

const PAD = `<svg class="pwm-pad" viewBox="0 0 84 54" aria-hidden="true">
  <path d="M20 6h44a15 15 0 0 1 15 14l2 19a10 10 0 0 1-17.5 6.5L56 38H28l-7.5 7.5A10 10 0 0 1 3 39l2-19A15 15 0 0 1 20 6z" fill="#241a5c" stroke="#ffd166" stroke-width="3" stroke-linejoin="round"/>
  <rect x="15" y="22" width="15" height="5.5" rx="1.6" fill="#fff"/><rect x="19.75" y="17.25" width="5.5" height="15" rx="1.6" fill="#fff"/>
  <circle cx="60" cy="19" r="3.6" fill="#ff6b9a"/><circle cx="67.5" cy="25.5" r="3.6" fill="#4ade80"/>
  <circle cx="52.5" cy="25.5" r="3.6" fill="#60a5fa"/><circle cx="60" cy="32" r="3.6" fill="#ffd166"/>
</svg>`;

/** PlayWithMe logosu (oyun sayfalarının başında da küçüğü kullanılır). */
export function playLogo(small = false): HTMLElement {
  const box = el('div', { class: small ? 'pwm-logo small' : 'pwm-logo', 'aria-hidden': 'true' });
  box.append(createLogo(document, { animated: true }));
  box.insertAdjacentHTML('beforeend', PAD);
  return box;
}

const GAMES = [
  { id: 'xox', icon: '❌⭕', ready: true },
  { id: 'draw', icon: '✏️', ready: false },
  { id: 'quiz', icon: '❓', ready: false },
  { id: 'word', icon: '🔤', ready: false },
] as const;

export function renderGames(app: HTMLElement): void {
  document.title = 'PlayWithMe · ScreenWithMe';
  app.innerHTML = `
    <section class="hero games-hero">
      <div id="pwm-logo"></div>
      <h1>Play<span class="pwm-with">With</span>Me</h1>
      <p class="tagline" data-i18n="games.tagline"></p>
    </section>
    <section class="games-list" id="games-list"></section>
  `;
  app.querySelector('#pwm-logo')!.replaceWith(playLogo());
  const list = app.querySelector<HTMLElement>('#games-list')!;
  for (const game of GAMES) {
    const card = el(
      'article',
      { class: game.ready ? 'game-card card' : 'game-card card soon' },
      el('div', { class: 'game-icon', 'aria-hidden': 'true' }, game.icon),
      el('h3', { 'data-i18n': `games.${game.id}.title` }),
      el('p', { class: 'muted', 'data-i18n': `games.${game.id}.text` }),
    );
    if (game.ready) {
      const play = el('a', { class: 'btn primary', href: `/oyun/${game.id}/${newRoomId()}`, 'data-i18n': 'games.play' });
      card.append(play);
    } else {
      card.append(el('span', { class: 'soon-badge', 'data-i18n': 'games.soon' }));
    }
    list.append(card);
  }
  translate(app);
}
