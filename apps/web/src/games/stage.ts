// Odanın içindeki oyunlar (PlayWithMe). Ayrı oyun odası/sayfası yok: video altındaki 🎮 ile odada bir oyun açılır,
// oyun videonun yerinde "oyun sahnesi" olarak açılır (açana hemen, diğerlerine "Ali bir XOX açtı · Katıl" kartı).
// Odada aynı anda tek oyun; oda sadece hangi oyunun açık olduğunu tutar (`RoomGame`), oyunun kendisi kendi sunucu
// nesnesinde (Game/Draw/Quiz) yürür. Sahne "Videoya dön" ile küçülür (oyun sürer, bağlantı açık kalır); 🎮 geri açar.

import { createLogo } from '@swm/shared/logo';
import { ROOM_GAME_KINDS, type Avatar, type ClientMessage, type Member, type RoomGame, type RoomGameKind } from '@swm/shared/protocol';
import { el } from '../dom.ts';
import { t } from '../i18n.ts';

const ICONS: Record<RoomGameKind, string> = { xox: '❌⭕', four: '🔴🟡', draw: '✏️', quiz: '❓' };
export const gameIcon = (kind: RoomGameKind): string => ICONS[kind];

const PAD = `<svg class="pwm-pad" viewBox="0 0 84 54" aria-hidden="true">
  <path d="M20 6h44a15 15 0 0 1 15 14l2 19a10 10 0 0 1-17.5 6.5L56 38H28l-7.5 7.5A10 10 0 0 1 3 39l2-19A15 15 0 0 1 20 6z" fill="#241a5c" stroke="#ffd166" stroke-width="3" stroke-linejoin="round"/>
  <rect x="15" y="22" width="15" height="5.5" rx="1.6" fill="#fff"/><rect x="19.75" y="17.25" width="5.5" height="15" rx="1.6" fill="#fff"/>
  <circle cx="60" cy="19" r="3.6" fill="#ff6b9a"/><circle cx="67.5" cy="25.5" r="3.6" fill="#4ade80"/>
  <circle cx="52.5" cy="25.5" r="3.6" fill="#60a5fa"/><circle cx="60" cy="32" r="3.6" fill="#ffd166"/>
</svg>`;

/** PlayWithMe logosu (ScreenWithMe yüzü elinde oyun koluyla); sahnenin başında küçüğü. */
function playLogo(): HTMLElement {
  const box = el('span', { class: 'pwm-logo small', 'aria-hidden': 'true' });
  box.append(createLogo(document, { animated: true }));
  box.insertAdjacentHTML('beforeend', PAD);
  return box;
}

interface StageOptions {
  /** Videonun kutusu (.player-wrap): sahne ve davet kartı buraya girer (kabukta kendiliğinden adacık olur). */
  wrap: HTMLElement;
  /** Video altındaki 🎮 düğmesi ve menüsü. */
  button: HTMLButtonElement;
  menu: HTMLElement;
  send: (message: ClientMessage) => void;
  me: () => { id: string | null; name: string; avatar: Avatar };
  /** Yönetici miyim (açık oyunu o da bitirebilir/değiştirebilir). */
  amHost: () => boolean;
  /** Sohbete gri satır (oda hareketleri). */
  activity: (text: () => string) => void;
  /** Kısa not (balon). */
  hint: (text: string) => void;
}

export function createGameStage(opts: StageOptions) {
  const { wrap, button, menu, send } = opts;
  let game: RoomGame | null = null;
  /** Sahnedeki oyunun kapatma işlevi (oyun bir kez açılınca küçültülse de bağlı kalır). */
  let unmount: (() => void) | null = null;
  let mountedId = '';
  /** Menüden oyun açtım: sunucudan gelince sahne bana hemen açılsın. */
  let wanted = false;

  const title = el('b', { class: 'game-stage-title' });
  // Düğmeler: simge + yazı (telefonda sadece simge).
  const headButton = (icon: string, cls = '') => {
    const text = el('span', { class: 'game-head-text' });
    const button = el('button', { type: 'button', class: `btn small-btn ${cls}` }, el('span', { 'aria-hidden': 'true' }, icon), text);
    return { button, label: (value: string) => ((text.textContent = ` ${value}`), (button.title = value)) };
  };
  const minimizeButton = headButton('▶');
  const changeButton = headButton('🎮');
  const endButton = headButton('✕', 'game-end');
  const [minimize, change, end] = [minimizeButton.button, changeButton.button, endButton.button];
  const body = el('div', { class: 'game-stage-body' });
  const stage = el(
    'section',
    { id: 'game-stage', class: 'game-stage', 'aria-label': 'PlayWithMe' },
    el('header', { class: 'game-stage-head' }, playLogo(), title, el('span', { class: 'game-stage-gap' }), change, minimize, end),
    body,
  );
  stage.hidden = true;
  wrap.append(stage);
  // Dar ekranda video küçük: sahne gövdeye taşınıp bütün ekranı kaplar (videonun kutusunda kalsa oranın katmanları
  // arasında üst çubuğun ve araç çubuğunun altında kalıyordu).
  const narrow = matchMedia('(max-width: 860px)');
  const place = () => {
    stage.classList.toggle('full', narrow.matches);
    (narrow.matches ? document.body : wrap).append(stage);
  };
  narrow.addEventListener('change', place);
  place();

  const mine = () => game !== null && (game.by.id === opts.me().id || opts.amHost());

  function labels(): void {
    minimizeButton.label(t('game.minimize'));
    changeButton.label(t('game.change'));
    endButton.label(t('game.end'));
    button.title = t(game ? 'game.reopen' : 'game.button');
    if (game) title.textContent = `${gameIcon(game.kind)} ${t(`games.${game.kind}.title`)} · ${t('game.by', { name: game.by.name })}`;
    change.hidden = end.hidden = !mine();
    drawMenu();
  }

  function drawMenu(): void {
    menu.replaceChildren(
      el('p', { class: 'game-menu-title' }, t(game ? 'game.change' : 'game.menuTitle')),
      ...ROOM_GAME_KINDS.map((kind) => {
        const item = el(
          'button',
          { type: 'button', role: 'menuitem', class: 'game-menu-item' },
          el('span', { class: 'game-menu-icon', 'aria-hidden': 'true' }, gameIcon(kind)),
          el('span', {}, el('b', {}, t(`games.${kind}.title`)), el('small', {}, t(`games.${kind}.text`))),
        );
        item.addEventListener('click', () => {
          wanted = true;
          send({ t: 'game', kind });
          setMenu(false);
        });
        return item;
      }),
    );
  }

  function setMenu(open: boolean): void {
    menu.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
  }

  async function open(): Promise<void> {
    if (!game) return;
    document.getElementById('game-invite')?.remove();
    stage.hidden = false;
    button.classList.remove('game-waiting');
    if (mountedId === game.id) return;
    unmount?.();
    unmount = null;
    const current = game;
    mountedId = current.id;
    body.replaceChildren(el('p', { class: 'muted game-stage-loading' }, '…'));
    const { name, avatar } = opts.me();
    // Oyun kodları ayrı parçalarda: odaya girerken indirilmez.
    let stop: () => void;
    if (current.kind === 'draw') stop = (await import('./draw.ts')).mountDraw(body, current.id, name, avatar);
    else if (current.kind === 'quiz') stop = (await import('./quiz.ts')).mountQuiz(body, current.id, name, avatar);
    else stop = (await import('./match.ts')).mountMatch(body, current.kind, current.id, name, avatar);
    // Yüklenirken oyun değiştiyse/bittiyse hemen kapat.
    if (game?.id !== current.id) stop();
    else unmount = stop;
  }

  function close(): void {
    stage.hidden = true;
    if (game) button.classList.add('game-waiting');
  }

  function invite(by: Member, kind: RoomGameKind): void {
    document.getElementById('game-invite')?.remove();
    const join = el('button', { type: 'button', class: 'btn small-btn primary' }, `🎮 ${t('game.join')}`);
    const later = el('button', { type: 'button', class: 'btn small-btn' }, t('game.later'));
    const text = el('span', {}, `${gameIcon(kind)} ${t('game.started', { name: by.name, game: t(`games.${kind}.title`) })}`);
    const card = el('div', { id: 'game-invite', class: 'home-ask game-invite', role: 'status' }, text, join, later);
    join.addEventListener('click', () => void open());
    later.addEventListener('click', () => card.remove());
    wrap.append(card);
    setTimeout(() => card.remove(), 20_000);
  }

  minimize.addEventListener('click', close);
  change.addEventListener('click', () => setMenu(true));
  end.addEventListener('click', () => send({ t: 'game', end: true }));
  button.addEventListener('click', () => {
    if (!menu.hidden) return setMenu(false);
    if (game && stage.hidden) return void open();
    if (game && !mine()) return close();
    setMenu(true);
  });
  document.addEventListener('pointerdown', (event) => {
    const target = event.target as Element | null;
    if (!menu.hidden && target && !menu.contains(target) && !button.contains(target) && !change.contains(target)) setMenu(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setMenu(false);
  });
  addEventListener('langchange', labels);
  labels();

  return {
    /** Odanın oyun durumu: girişte (`welcome`, sohbete satır yazılmaz: `announce` false) ve her değişiklikte. */
    set(next: RoomGame | null, by?: Member, announce = true): void {
      const before = game;
      game = next;
      labels();
      button.classList.toggle('game-on', game !== null);
      if (!game) {
        unmount?.();
        unmount = null;
        mountedId = '';
        stage.hidden = true;
        body.replaceChildren();
        button.classList.remove('game-waiting');
        document.getElementById('game-invite')?.remove();
        if (before && announce) {
          const who = by?.name ?? '';
          opts.activity(() => (who ? t('game.ended', { name: who }) : t('game.endedAuto')));
          opts.hint(who ? t('game.ended', { name: who }) : t('game.endedAuto'));
        }
        return;
      }
      const g = game;
      if (g.id === before?.id) return;
      if (announce) opts.activity(() => `${gameIcon(g.kind)} ${t('game.started', { name: g.by.name, game: t(`games.${g.kind}.title`) })}`);
      // Kendi açtığım (ya da sahne açıkken değişen) oyun hemen açılır; başkasınınki davet kartıyla (odaya yeni
      // girene de).
      const opened = !stage.hidden;
      if ((wanted && g.by.id === opts.me().id) || (opened && before !== null)) {
        wanted = false;
        void open();
        return;
      }
      if (opened) close();
      unmount?.();
      unmount = null;
      mountedId = '';
      button.classList.add('game-waiting');
      invite(g.by, g.kind);
    },
    /** Sunucu oyunu açtırmadı (başkasının oyunu sürüyor). */
    busy(): void {
      wanted = false;
      opts.hint(t('game.busy'));
    },
    isOpen: () => !stage.hidden,
  };
}
