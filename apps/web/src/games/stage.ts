// The in-room games hub (PlayWithMe, concept D of docs/internal/games-hub.md). 🎮 opens the hub: what's new, the
// room's tables (who is at each, Open / Join) and "new table". A room holds up to MAX_TABLES tables at once; each
// table is one game running in its own server object (the room only lists them). I have at most one table open at a
// time, in a game window with two placements (remembered per game, `gamePlace:<kind>`; defaults from the catalog):
// "float" a free window anywhere on the page (drag by its head, resize from its corner; in fullscreen it moves into
// the fullscreen view and stays free there; an island on the film page) and "stage" in the video's place. The free
// window opens at the game's own size (catalog `size`); smaller than the room the game's layout needs (`fit`) the
// whole game is scaled down instead of squeezed. Narrow screens: "below" the video (the rest of the screen) or
// "large" (the whole screen). "Back to video" minimizes it (still connected, still "at" the table), "Leave table" closes it
// for me only.

import { createLogo } from '@swm/shared/logo';
import { GAME_CATALOG, LATEST_NEWS, unseenNews } from '@swm/shared/games/catalog';
import { MAX_TABLES, ROOM_GAME_KINDS, type Avatar, type ClientMessage, type Member, type RoomGame, type RoomGameKind } from '@swm/shared/protocol';
import { el } from '../dom.ts';
import { lang, t } from '../i18n.ts';
import { playSound } from '../sound.ts';
import { load, save } from '../storage.ts';
import { avatarNode } from '../ui/avatar.ts';
import { icon, type IconName } from '../ui/icons.ts';

const ICONS: Record<RoomGameKind, IconName> = { xox: 'game-xox', four: 'game-four', draw: 'game-draw', quiz: 'game-quiz', poker: 'game-poker' };
export const gameIcon = (kind: RoomGameKind): SVGSVGElement => icon(ICONS[kind]);

const PAD = `<svg class="pwm-pad" viewBox="0 0 84 54" aria-hidden="true">
  <path d="M20 6h44a15 15 0 0 1 15 14l2 19a10 10 0 0 1-17.5 6.5L56 38H28l-7.5 7.5A10 10 0 0 1 3 39l2-19A15 15 0 0 1 20 6z" fill="#241a5c" stroke="#ffd166" stroke-width="3" stroke-linejoin="round"/>
  <rect x="15" y="22" width="15" height="5.5" rx="1.6" fill="#fff"/><rect x="19.75" y="17.25" width="5.5" height="15" rx="1.6" fill="#fff"/>
  <circle cx="60" cy="19" r="3.6" fill="#ff6b9a"/><circle cx="67.5" cy="25.5" r="3.6" fill="#4ade80"/>
  <circle cx="52.5" cy="25.5" r="3.6" fill="#60a5fa"/><circle cx="60" cy="32" r="3.6" fill="#ffd166"/>
</svg>`;

/** PlayWithMe logo (the ScreenWithMe face holding a game pad); the small one heads the stage. */
function playLogo(): HTMLElement {
  const box = el('span', { class: 'pwm-logo small', 'aria-hidden': 'true' });
  box.append(createLogo(document, { animated: true }));
  box.insertAdjacentHTML('beforeend', PAD);
  return box;
}

/** What's new I have seen (the newest note's version). */
const SEEN_KEY = 'opt:gamesSeen';

type Place = 'float' | 'stage';
const PLACES: readonly Place[] = ['float', 'stage'];
const placeOf = (kind: RoomGameKind): Place => {
  const saved = load(`gamePlace:${kind}`);
  // "side" (0.9.91.8–0.9.91.9) became the free window.
  if (saved === 'side') return 'float';
  return PLACES.includes(saved as Place) ? (saved as Place) : GAME_CATALOG[kind].place;
};
/** The free window's spot on the screen, as a share of the free room (0–1). */
const FLOAT_KEY = 'gameFloat:spot';
/** The free window's size per game (what I last dragged it to; empty = the game's own size). */
const sizeKey = (kind: RoomGameKind) => `gameFloat:size:${kind}`;
/** Gap kept between the free window and the screen's edges. */
const EDGE = 8;
/** The smallest free window (px). */
const MIN_W = 240;
const MIN_H = 260;
const readPair = (key: string): { x: number; y: number } | null => {
  try {
    const saved = JSON.parse(load(key) || 'null') as { x?: unknown; y?: unknown } | null;
    if (saved && typeof saved.x === 'number' && typeof saved.y === 'number' && Number.isFinite(saved.x + saved.y)) return { x: saved.x, y: saved.y };
  } catch {
    // Fall back to the default.
  }
  return null;
};

interface StageOptions {
  /** The video's box (.player-wrap): the stage and invite cards go here (islands in the shell by themselves). */
  wrap: HTMLElement;
  /** 🎮 under the video, and the hub popover it opens. */
  button: HTMLButtonElement;
  menu: HTMLElement;
  send: (message: ClientMessage) => void;
  me: () => { id: string | null; name: string; avatar: Avatar };
  /** Am I the host (the host can close any table). */
  amHost: () => boolean;
  /** The room's people (who is at which table). */
  members: () => readonly Member[];
  /** A grey line in the chat (room actions). */
  activity: (text: () => string) => void;
  /** A short bubble by 🎮. */
  hint: (text: string) => void;
}

export function createGameStage(opts: StageOptions) {
  const { wrap, button, menu, send } = opts;
  let tables: RoomGame[] = [];
  /** The table I have open (mounted even while minimized) and its close function. */
  let current: RoomGame | null = null;
  let unmount: (() => void) | null = null;
  /** I asked for a new table: open it for me as soon as the room lists it. */
  let wanted: RoomGameKind | null = null;

  const titleText = el('b', { class: 'game-stage-title-text' });
  const titleIcon = el('span', { class: 'game-stage-title-icon', 'aria-hidden': 'true' });
  const title = el('span', { class: 'game-stage-title' }, titleIcon, titleText);
  // Head buttons: icon + text (icon only on phones).
  const headButton = (glyph: string, cls = '') => {
    const text = el('span', { class: 'game-head-text' });
    const node = el('button', { type: 'button', class: `btn small-btn ${cls}` }, el('span', { 'aria-hidden': 'true' }, glyph), text);
    return { node, label: (value: string) => ((text.textContent = ` ${value}`), (node.title = value)) };
  };
  const hubButton = headButton('🎮', 'game-hub-open');
  const minimizeButton = headButton('▶');
  const leaveButton = headButton('↩');
  const endButton = headButton('✕', 'game-end');
  // Placement switch: free window / in the video's place (narrow screens: below / large).
  const placeButtons = PLACES.map((p) => {
    const b = el('button', { type: 'button', class: `game-place-btn place-${p}` });
    b.addEventListener('click', () => {
      if (!current) return;
      // On a narrow screen "float" means below the video, "stage" the whole screen.
      save(`gamePlace:${current.kind}`, p);
      place();
    });
    return b;
  });
  const placeSwitch = el('span', { class: 'game-place', role: 'group' }, ...placeButtons);
  const head = el('header', { class: 'game-stage-head' }, playLogo(), title, el('span', { class: 'game-stage-gap' }), placeSwitch, hubButton.node, minimizeButton.node, leaveButton.node, endButton.node);
  const body = el('div', { class: 'game-stage-body' });
  const grip = el('span', { class: 'game-resize', 'aria-hidden': 'true' });
  const stage = el('section', { id: 'game-stage', class: 'game-stage', 'aria-label': 'PlayWithMe' }, head, body, grip);
  stage.hidden = true;
  wrap.append(stage);
  const theater = (wrap.closest('.theater') as HTMLElement | null) ?? wrap;
  const narrow = matchMedia('(max-width: 860px)');
  const inFullscreen = () => theater.matches(':fullscreen') || theater.classList.contains('fake-fs');
  /** The placement in use now. */
  let mode: Place | 'below' | 'full' = 'stage';

  /** Puts the game window where its placement says (moves the element only when its parent changes). */
  function place(): void {
    const want = current ? placeOf(current.kind) : 'stage';
    mode = narrow.matches ? (want === 'stage' ? 'full' : 'below') : want;
    // The free window lives on the page, or in the fullscreen view while there is one (or it would be hidden).
    const parent = narrow.matches ? document.body : mode === 'float' ? (inFullscreen() ? theater : document.body) : wrap;
    if (stage.parentElement !== parent) parent.append(stage);
    for (const m of ['float', 'stage', 'below', 'full'] as const) stage.classList.toggle(m, mode === m);
    // On the film page the free window is a window of its own over the film (inside the video box it is one anyway).
    stage.toggleAttribute('data-island', mode === 'float');
    document.documentElement.classList.toggle('game-below', mode === 'below' && !stage.hidden);
    if (mode === 'below') placeBelow();
    if (mode === 'float') placeFloat();
    else for (const p of ['left', 'top', 'width', 'height', 'transform']) stage.style.removeProperty(p);
    placeButtons.forEach((b, i) => {
      const p = PLACES[i]!;
      const on = narrow.matches ? (p === 'stage' ? mode === 'full' : mode === 'below') : p === want;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
      const name = narrow.matches ? (p === 'stage' ? 'large' : 'below') : p;
      b.replaceChildren(icon(`place-${name === 'large' ? 'stage' : name}` as IconName));
      b.title = t(`hub.place.${name}`);
      b.setAttribute('aria-label', b.title);
    });
    // The film page's hole and islands follow at once.
    dispatchEvent(new Event('swm-layout'));
  }

  /** Below the video (narrow screens): the window starts where the video ends. */
  function placeBelow(): void {
    stage.style.setProperty('--game-top', `${Math.max(0, Math.round(wrap.getBoundingClientRect().bottom))}px`);
  }

  // ---- The free window: dragged by its head anywhere on the screen, resized from its corner ----
  /** Where it may go: the screen, or the fullscreen view. */
  function area(): { left: number; top: number; width: number; height: number } {
    if (inFullscreen()) {
      const r = theater.getBoundingClientRect();
      return { left: r.left, top: r.top, width: r.width, height: r.height };
    }
    return { left: 0, top: 0, width: innerWidth, height: innerHeight };
  }
  /** The window's size on screen: what I dragged it to, or the game's own size; never bigger than the screen. */
  function floatSize(): { w: number; h: number } {
    const kind = current?.kind ?? 'xox';
    const saved = readPair(sizeKey(kind));
    const [dw, dh] = GAME_CATALOG[kind].size;
    const room = area();
    return {
      w: Math.round(Math.max(MIN_W, Math.min(saved?.x ?? dw, room.width - 2 * EDGE))),
      h: Math.round(Math.max(MIN_H, Math.min(saved?.y ?? dh, room.height - 2 * EDGE))),
    };
  }
  let spot = readPair(FLOAT_KEY) ?? { x: 1, y: 0.5 };
  function placeFloat(size = floatSize()): void {
    const kind = current?.kind ?? 'xox';
    const [fw, fh] = GAME_CATALOG[kind].fit;
    // Smaller than the room the game needs: the game keeps its layout and is scaled down as a whole.
    const scale = Math.min(1, size.w / fw, size.h / fh);
    const room = area();
    const x = Math.min(1, Math.max(0, spot.x));
    const y = Math.min(1, Math.max(0, spot.y));
    stage.style.left = `${Math.round(room.left + EDGE + Math.max(0, room.width - 2 * EDGE - size.w) * x)}px`;
    stage.style.top = `${Math.round(room.top + EDGE + Math.max(0, room.height - 2 * EDGE - size.h) * y)}px`;
    stage.style.width = `${size.w / scale}px`;
    stage.style.height = `${size.h / scale}px`;
    stage.style.transform = scale < 1 ? `scale(${scale})` : '';
    stage.classList.toggle('scaled', scale < 1);
  }
  let drag: { x: number; y: number; left: number; top: number } | null = null;
  head.addEventListener('pointerdown', (event) => {
    if (mode !== 'float' || (event.target as Element).closest('button')) return;
    const box = stage.getBoundingClientRect();
    drag = { x: event.clientX, y: event.clientY, left: box.left, top: box.top };
    head.setPointerCapture(event.pointerId);
  });
  head.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const room = area();
    const box = stage.getBoundingClientRect();
    const freeX = Math.max(1, room.width - 2 * EDGE - box.width);
    const freeY = Math.max(1, room.height - 2 * EDGE - box.height);
    spot = {
      x: Math.min(1, Math.max(0, (drag.left + event.clientX - drag.x - room.left - EDGE) / freeX)),
      y: Math.min(1, Math.max(0, (drag.top + event.clientY - drag.y - room.top - EDGE) / freeY)),
    };
    placeFloat();
    dispatchEvent(new Event('swm-layout'));
  });
  const endDrag = () => {
    if (!drag) return;
    drag = null;
    save(FLOAT_KEY, JSON.stringify(spot));
  };
  head.addEventListener('pointerup', endDrag);
  head.addEventListener('pointercancel', endDrag);
  // Double click on the head: back to the game's own size.
  head.addEventListener('dblclick', (event) => {
    if (mode !== 'float' || !current || (event.target as Element).closest('button')) return;
    save(sizeKey(current.kind), '');
    placeFloat();
    dispatchEvent(new Event('swm-layout'));
  });
  // The corner: the top-left stays put, the window grows or shrinks (the game rescales when it gets small).
  let sizing: { x: number; y: number; w: number; h: number; left: number; top: number } | null = null;
  grip.addEventListener('pointerdown', (event) => {
    if (mode !== 'float') return;
    event.preventDefault();
    const box = stage.getBoundingClientRect();
    sizing = { x: event.clientX, y: event.clientY, w: box.width, h: box.height, left: box.left, top: box.top };
    grip.setPointerCapture(event.pointerId);
  });
  grip.addEventListener('pointermove', (event) => {
    if (!sizing || !current) return;
    const room = area();
    const w = Math.round(Math.max(MIN_W, Math.min(sizing.w + event.clientX - sizing.x, room.left + room.width - EDGE - sizing.left)));
    const h = Math.round(Math.max(MIN_H, Math.min(sizing.h + event.clientY - sizing.y, room.top + room.height - EDGE - sizing.top)));
    // Keep the top-left corner where it is: the spot is a share of the room left free.
    spot = {
      x: room.width - 2 * EDGE - w > 0 ? (sizing.left - room.left - EDGE) / (room.width - 2 * EDGE - w) : 0,
      y: room.height - 2 * EDGE - h > 0 ? (sizing.top - room.top - EDGE) / (room.height - 2 * EDGE - h) : 0,
    };
    save(sizeKey(current.kind), JSON.stringify({ x: w, y: h }));
    placeFloat({ w, h });
    dispatchEvent(new Event('swm-layout'));
  });
  const endSizing = () => {
    if (!sizing) return;
    sizing = null;
    save(FLOAT_KEY, JSON.stringify(spot));
  };
  grip.addEventListener('pointerup', endSizing);
  grip.addEventListener('pointercancel', endSizing);

  narrow.addEventListener('change', place);
  addEventListener('fullscreenchange', place);
  addEventListener('resize', () => {
    if (mode === 'below') placeBelow();
    if (mode === 'float') placeFloat();
  });
  // Fullscreen without the Fullscreen API (iPhone, the film page) is a class on the theater.
  new MutationObserver(() => {
    const fs = inFullscreen();
    if (fs !== wasFs) {
      wasFs = fs;
      place();
    }
  }).observe(theater, { attributes: true, attributeFilter: ['class'] });
  let wasFs = inFullscreen();
  place();

  const meId = () => opts.me().id;
  const canClose = (table: RoomGame) => table.by.id === meId() || opts.amHost();
  const titleOf = (kind: RoomGameKind) => t(`games.${kind}.title`);
  /** People who have this table open (one entry per person: name + avatar). */
  function peopleAt(id: string): Member[] {
    const seen = new Set<string>();
    return opts.members().filter((m) => {
      if (m.table !== id || m.tv) return false;
      const key = `${m.name}|${m.avatar ?? ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function labels(): void {
    hubButton.label(t('hub.title'));
    minimizeButton.label(t('game.minimize'));
    leaveButton.label(t('hub.leave'));
    endButton.label(t('hub.close'));
    button.title = t('hub.title');
    if (current) {
      titleIcon.replaceChildren(gameIcon(current.kind));
      titleText.textContent = `${titleOf(current.kind)} · ${t('game.by', { name: current.by.name })}`;
      endButton.node.hidden = !canClose(current);
    }
    button.classList.toggle('game-on', tables.length > 0);
    button.classList.toggle('game-new', unseenNews(load(SEEN_KEY)).length > 0);
    if (!menu.hidden) drawHub();
  }

  // ---- The hub ----
  function drawHub(): void {
    const news = unseenNews(load(SEEN_KEY));
    const parts: HTMLElement[] = [
      el('div', { class: 'hub-head' }, icon('gamepad'), el('b', {}, t('hub.title')), el('span', { class: 'hub-count' }, t('hub.count', { n: tables.length, max: MAX_TABLES }))),
    ];
    if (news.length) {
      parts.push(
        el(
          'div',
          { class: 'hub-news', role: 'note' },
          el('b', {}, `✨ ${t('hub.news')}`),
          el('ul', {}, ...news.map((n) => el('li', {}, lang() === 'en' ? n.en : n.tr))),
        ),
      );
    }
    if (tables.length) {
      parts.push(
        el('p', { class: 'hub-label' }, t('hub.tables')),
        el(
          'ul',
          { class: 'hub-tables' },
          ...tables.map((table) => {
            const people = peopleAt(table.id);
            const mine = current?.id === table.id;
            const go = el('button', { type: 'button', class: `btn small-btn ${mine ? '' : 'primary'}` }, t(mine ? 'hub.show' : 'hub.join'));
            go.addEventListener('click', () => {
              setHub(false);
              void open(table);
            });
            const row = el(
              'li',
              { class: `hub-table${mine ? ' mine' : ''}` },
              el('span', { class: 'hub-icon' }, gameIcon(table.kind)),
              el(
                'span',
                { class: 'hub-table-text' },
                el('b', {}, titleOf(table.kind)),
                el('small', {}, people.length ? people.map((p) => p.name).join(', ') : t('hub.empty', { name: table.by.name })),
              ),
              el('span', { class: 'hub-faces', 'aria-hidden': 'true' }, ...people.slice(0, 4).map((p) => avatarNode(p.avatar, 'hub-face'))),
              go,
            );
            if (canClose(table)) {
              const close = el('button', { type: 'button', class: 'hub-close', title: t('hub.close'), 'aria-label': t('hub.close') }, '✕');
              close.addEventListener('click', () => send({ t: 'table', close: table.id }));
              row.append(close);
            }
            return row;
          }),
        ),
      );
    }
    const full = tables.length >= MAX_TABLES;
    parts.push(
      el('p', { class: 'hub-label' }, full ? t('hub.full') : t('hub.new')),
      el(
        'div',
        { class: 'hub-games' },
        ...ROOM_GAME_KINDS.map((kind) => {
          const info = GAME_CATALOG[kind];
          const badge = news.find((n) => n.kinds.includes(kind));
          const item = el(
            'button',
            { type: 'button', role: 'menuitem', class: 'hub-game' },
            el('span', { class: 'hub-icon' }, gameIcon(kind)),
            el(
              'span',
              { class: 'hub-game-text' },
              el('b', {}, titleOf(kind), badge ? el('span', { class: `hub-badge ${badge.badge}` }, t(`hub.badge.${badge.badge}`)) : null),
              el('small', {}, t('hub.players', { min: info.min, max: info.max })),
            ),
          );
          item.title = t(`games.${kind}.text`);
          item.disabled = full;
          item.addEventListener('click', () => {
            wanted = kind;
            send({ t: 'table', open: kind });
            setHub(false);
          });
          return item;
        }),
      ),
    );
    menu.replaceChildren(...parts);
  }

  function setHub(show: boolean): void {
    if (show) drawHub();
    else if (!menu.hidden) {
      // Closing the hub counts as having seen what's new.
      save(SEEN_KEY, LATEST_NEWS);
      button.classList.remove('game-new');
    }
    menu.hidden = !show;
    button.setAttribute('aria-expanded', String(show));
  }

  // ---- My table ----
  async function open(table: RoomGame): Promise<void> {
    document.getElementById('game-invite')?.remove();
    stage.hidden = false;
    button.classList.remove('game-waiting');
    if (current?.id === table.id && unmount) return place();
    unmount?.();
    unmount = null;
    current = table;
    labels();
    place();
    send({ t: 'at', table: table.id });
    body.replaceChildren(el('p', { class: 'muted game-stage-loading' }, '…'));
    const { name, avatar } = opts.me();
    // Game code lives in separate chunks: not downloaded when entering the room.
    let stop: () => void;
    if (table.kind === 'draw') stop = (await import('./draw.ts')).mountDraw(body, table.id, name, avatar);
    else if (table.kind === 'quiz') stop = (await import('./quiz.ts')).mountQuiz(body, table.id, name, avatar);
    else if (table.kind === 'poker') stop = (await import('./poker.ts')).mountPoker(body, table.id, name, avatar);
    else stop = (await import('./match.ts')).mountMatch(body, table.kind, table.id, name, avatar);
    // Switched or closed while loading: close at once.
    if (current?.id !== table.id) stop();
    else unmount = stop;
  }

  /** Leave my table (for me only): the game closes, the room learns I'm no longer there. */
  function leave(tell = true): void {
    unmount?.();
    unmount = null;
    current = null;
    stage.hidden = true;
    place();
    body.replaceChildren();
    button.classList.remove('game-waiting');
    if (tell) send({ t: 'at', table: null });
  }

  function minimize(): void {
    stage.hidden = true;
    place();
    if (current) button.classList.add('game-waiting');
  }

  function invite(table: RoomGame): void {
    document.getElementById('game-invite')?.remove();
    const join = el('button', { type: 'button', class: 'btn small-btn primary' }, t('hub.join'));
    const later = el('button', { type: 'button', class: 'btn small-btn' }, t('game.later'));
    const text = el('span', { class: 'game-invite-text' }, gameIcon(table.kind), t('hub.opened', { name: table.by.name, game: titleOf(table.kind) }));
    const card = el('div', { id: 'game-invite', class: 'home-ask game-invite', role: 'status', 'data-table': table.id }, text, join, later);
    join.addEventListener('click', () => void open(table));
    later.addEventListener('click', () => card.remove());
    wrap.append(card);
    setTimeout(() => card.remove(), 20_000);
  }

  minimizeButton.node.addEventListener('click', minimize);
  leaveButton.node.addEventListener('click', () => leave());
  endButton.node.addEventListener('click', () => current && send({ t: 'table', close: current.id }));
  hubButton.node.addEventListener('click', () => setHub(!!menu.hidden));
  button.addEventListener('click', () => {
    // A minimized table comes back first; the hub is one more press away (or the head's 🎮).
    if (menu.hidden && current && stage.hidden) return void open(current);
    setHub(!!menu.hidden);
  });
  document.addEventListener('pointerdown', (event) => {
    const target = event.target as Element | null;
    if (!menu.hidden && target && !menu.contains(target) && !button.contains(target) && !hubButton.node.contains(target)) setHub(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !menu.hidden) setHub(false);
  });
  addEventListener('langchange', labels);
  labels();

  return {
    /**
     * The room's tables: on entry (`announce` false: no chat line, no invite for tables already open) and on every
     * change, with what happened (`opened` / `closed` and by whom).
     */
    setTables(next: RoomGame[], change: { opened?: string; closed?: string; by?: Member } = {}, announce = true): void {
      tables = next;
      // My table closed: back to the video.
      if (current && !tables.some((x) => x.id === current!.id)) {
        const who = change.by?.name;
        leave(false);
        opts.hint(who ? t('hub.closedBy', { name: who }) : t('hub.closed'));
      }
      const opened = change.opened ? tables.find((x) => x.id === change.opened) : undefined;
      if (opened && announce) {
        opts.activity(() => t('hub.opened', { name: opened.by.name, game: titleOf(opened.kind) }));
        if (opened.by.id === meId() && wanted === opened.kind) {
          wanted = null;
          void open(opened);
        } else if (opened.by.id !== meId() && !current) {
          invite(opened);
          playSound('gameInvite');
        }
      }
      if (change.closed && announce && change.by) {
        const who = change.by.name;
        opts.activity(() => t('hub.closedBy', { name: who }));
      }
      // An invite for a table that is gone.
      const card = document.getElementById('game-invite');
      if (card && !tables.some((x) => x.id === card.dataset.table)) card.remove();
      labels();
    },
    /** People moved between tables. */
    membersChanged(): void {
      if (!menu.hidden) drawHub();
    },
    /** The server refused to open a table. */
    refused(code: 'tables_full' | 'table_own' | 'game_busy'): void {
      wanted = null;
      opts.hint(t(code === 'game_busy' ? 'game.busy' : `error.${code}`));
    },
    isOpen: () => !stage.hidden,
  };
}
