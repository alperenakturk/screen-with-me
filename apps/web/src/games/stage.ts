// The in-room games hub (PlayWithMe, concept D of docs/internal/games-hub.md). 🎮 opens the hub: what's new, the
// room's tables (who is at each, Open / Join) and "new table". A room holds up to MAX_TABLES tables at once; each
// table is one game running in its own server object (the room only lists them). I have at most one table open at a
// time, in a game window with two placements (remembered per game, `gamePlace:<kind>`; defaults from the catalog):
// "float" a free window anywhere on the page (drag by its head, resize from its corner; in fullscreen it moves into
// the fullscreen view and stays free there; an island on the film page) and "stage" in the video's place. The free
// window keeps the game's own shape (catalog `size`) and only grows or shrinks in proportion. In every placement the
// game is fitted to its box (`refit`): smaller than the room its layout needs (`fit`), or still overflowing, the
// whole game is scaled down, so nothing ever scrolls. Narrow screens: "below" the video (the rest of the screen) or
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
/** The free window's zoom per game (what I last dragged it to; empty = the game's own size). */
const zoomKey = (kind: RoomGameKind) => `gameFloat:zoom:${kind}`;
/** Gap kept between the free window and the screen's edges. */
const EDGE = 8;
/** The free window's zoom range (share of the game's own size). */
const MIN_ZOOM = 0.45;
const MAX_ZOOM = 1.6;
/** The game is never shown smaller than this share of its layout (tiny boxes fall back to it). */
const MIN_FIT = 0.4;
/** Boxes inside a game that clip what doesn't fit: they count when fitting the game. */
const FIT_INSIDE = '.draw-overlay, .quiz-main, .pk-fit';
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
  /** More 🎮 buttons that open the same hub (the Shorts bar's, 0.9.91.13): the hub moves next to the one pressed. */
  extraButtons?: HTMLButtonElement[];
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
  // The game mounts into `body`, a box the size of the frame divided by its scale (see `refit`).
  const body = el('div', { class: 'game-fit' });
  const frame = el('div', { class: 'game-stage-body' }, body);
  const grip = el('span', { class: 'game-resize', 'aria-hidden': 'true' });
  // The room's emojis fly over the free window too (ui/reactions.ts picks this layer while it is open).
  const flying = el('div', { class: 'reactions-layer game-reactions', 'aria-hidden': 'true' });
  const stage = el('section', { id: 'game-stage', class: 'game-stage', 'aria-label': 'PlayWithMe' }, head, frame, flying, grip);
  stage.hidden = true;
  wrap.append(stage);
  const theater = (wrap.closest('.theater') as HTMLElement | null) ?? wrap;
  const narrow = matchMedia('(max-width: 860px)');
  const inFullscreen = () => theater.matches(':fullscreen') || theater.classList.contains('fake-fs');
  /**
   * The Shorts view (0.9.91.13, owner): the upright video has no room for a game in its place, so a game there is a
   * free window (on a phone: large). Opening the Shorts view with a game open moves it to the free window in the
   * space right of the video and remembers that, so it stays free back in the room view until I pin it again.
   */
  const shortsView = () => document.documentElement.classList.contains('shorts-view');
  /** The placement in use now. */
  let mode: Place | 'below' | 'full' = 'stage';

  /** Puts the game window where its placement says (moves the element only when its parent changes). */
  function place(): void {
    const want = current ? (shortsView() ? 'float' : placeOf(current.kind)) : 'stage';
    mode = narrow.matches ? (want === 'stage' || shortsView() ? 'full' : 'below') : want;
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
  /** The free window's zoom: what I dragged it to (1 = the game's own size), never bigger than the screen allows. */
  function floatZoom(want?: number): number {
    const kind = current?.kind ?? 'xox';
    const [w, h] = GAME_CATALOG[kind].size;
    const saved = Number(load(zoomKey(kind)) || '1');
    const room = area();
    const most = Math.min(MAX_ZOOM, (room.width - 2 * EDGE) / w, (room.height - 2 * EDGE) / h);
    return Math.max(Math.min(MIN_ZOOM, most), Math.min(most, want ?? (Number.isFinite(saved) && saved > 0 ? saved : 1)));
  }
  let spot = readPair(FLOAT_KEY) ?? { x: 1, y: 0.5 };
  function placeFloat(zoom = floatZoom()): void {
    const [w, h] = GAME_CATALOG[current?.kind ?? 'xox'].size;
    const width = Math.round(w * zoom);
    const height = Math.round(h * zoom);
    const room = area();
    const x = Math.min(1, Math.max(0, spot.x));
    const y = Math.min(1, Math.max(0, spot.y));
    stage.style.left = `${Math.round(room.left + EDGE + Math.max(0, room.width - 2 * EDGE - width) * x)}px`;
    stage.style.top = `${Math.round(room.top + EDGE + Math.max(0, room.height - 2 * EDGE - height) * y)}px`;
    stage.style.width = `${width}px`;
    stage.style.height = `${height}px`;
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
    save(zoomKey(current.kind), '');
    placeFloat();
    dispatchEvent(new Event('swm-layout'));
  });
  // The corner: the top-left stays put and the window grows or shrinks in proportion (the game keeps its shape).
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
    const [w, h] = GAME_CATALOG[current.kind].size;
    const room = area();
    // Follow the mouse along the window's diagonal; keep the window on the screen.
    const want = ((sizing.w + event.clientX - sizing.x) / w + (sizing.h + event.clientY - sizing.y) / h) / 2;
    const fits = Math.min((room.left + room.width - EDGE - sizing.left) / w, (room.top + room.height - EDGE - sizing.top) / h);
    const zoom = floatZoom(Math.min(want, fits));
    const width = w * zoom;
    const height = h * zoom;
    spot = {
      x: room.width - 2 * EDGE - width > 0 ? (sizing.left - room.left - EDGE) / (room.width - 2 * EDGE - width) : 0,
      y: room.height - 2 * EDGE - height > 0 ? (sizing.top - room.top - EDGE) / (room.height - 2 * EDGE - height) : 0,
    };
    save(zoomKey(current.kind), String(Math.round(zoom * 1000) / 1000));
    placeFloat(zoom);
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
  let wasShorts = shortsView();
  new MutationObserver(() => {
    const now = shortsView();
    if (now === wasShorts) return;
    wasShorts = now;
    if (now && current) besideShorts(current.kind);
    place();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  /** The free space right of the upright Short: the window goes there, made small enough to fit beside it. */
  function besideShorts(kind: RoomGameKind): void {
    save(`gamePlace:${kind}`, 'float');
    spot = { x: 1, y: 0.4 };
    save(FLOAT_KEY, JSON.stringify(spot));
    requestAnimationFrame(() => {
      const [w] = GAME_CATALOG[kind].size;
      // Right of the video's column: since 0.9.92.2 the Shorts rail (and ▲▼) sit between the video and this space.
      const rail = document.getElementById('shorts-nav')?.getBoundingClientRect();
      const right = Math.max(wrap.getBoundingClientRect().right, rail && rail.width ? rail.right : 0);
      const beside = innerWidth - right - 3 * EDGE;
      if (beside > 0 && current?.kind === kind) {
        save(zoomKey(kind), String(Math.round(Math.max(MIN_ZOOM, Math.min(floatZoom(), beside / w)) * 1000) / 1000));
        if (mode === 'float') placeFloat();
        dispatchEvent(new Event('swm-layout'));
      }
    });
  }
  place();

  // ---- Fit the game to its box: no scrollbars, ever (owner's rule) ----
  let fitting = false;
  function refit(): void {
    if (fitting || stage.hidden || !current) return;
    const W = frame.clientWidth;
    const H = frame.clientHeight;
    if (!W || !H) return;
    fitting = true;
    // Phones have their own narrow layouts: only overflow shrinks the game there.
    const [fw, fh] = narrow.matches ? [0, 0] : GAME_CATALOG[current.kind].fit;
    let scale = Math.min(1, fw ? W / fw : 1, fh ? H / fh : 1);
    for (let i = 0; i < 4; i++) {
      body.style.width = `${W / scale}px`;
      body.style.height = `${H / scale}px`;
      body.style.transform = scale < 1 ? `scale(${scale})` : '';
      let over = Math.max(body.scrollHeight / body.clientHeight, body.scrollWidth / body.clientWidth);
      // Boxes that clip their own content (the drawing's overlay, the quiz card) must fit too.
      for (const box of body.querySelectorAll<HTMLElement>(FIT_INSIDE)) {
        if (box.clientHeight > 0 && !box.hidden) over = Math.max(over, box.scrollHeight / box.clientHeight);
      }
      if (over <= 1.005 || scale <= MIN_FIT) break;
      scale = Math.max(MIN_FIT, scale / over);
    }
    stage.style.setProperty('--fit', String(scale));
    fitting = false;
  }
  let fitQueued = false;
  const queueFit = () => {
    if (fitQueued) return;
    fitQueued = true;
    requestAnimationFrame(() => {
      fitQueued = false;
      refit();
    });
  };
  new ResizeObserver(queueFit).observe(frame);
  // A new phase (lobby → question → podium) changes what has to fit.
  new MutationObserver(queueFit).observe(body, { childList: true, subtree: true, characterData: true });

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
    for (const b of triggers) b.title = t('hub.title');
    if (current) {
      titleIcon.replaceChildren(gameIcon(current.kind));
      titleText.textContent = `${titleOf(current.kind)} · ${t('game.by', { name: current.by.name })}`;
      endButton.node.hidden = !canClose(current);
    }
    for (const b of triggers) {
      b.classList.toggle('game-on', tables.length > 0);
      b.classList.toggle('game-new', unseenNews(load(SEEN_KEY)).length > 0);
    }
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
      for (const b of triggers) b.classList.remove('game-new');
    }
    menu.hidden = !show;
    for (const b of triggers) b.setAttribute('aria-expanded', String(show && menu.parentElement === b.parentElement));
  }
  const triggers = [button, ...(opts.extraButtons ?? [])];

  // ---- My table ----
  async function open(table: RoomGame): Promise<void> {
    document.getElementById('game-invite')?.remove();
    stage.hidden = false;
    for (const b of triggers) b.classList.remove('game-waiting');
    if (current?.id === table.id && unmount) return place();
    unmount?.();
    unmount = null;
    current = table;
    labels();
    if (shortsView()) besideShorts(table.kind);
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
    queueFit();
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
    for (const b of triggers) b.classList.remove('game-waiting');
    if (tell) send({ t: 'at', table: null });
  }

  function minimize(): void {
    stage.hidden = true;
    place();
    if (current) for (const b of triggers) b.classList.add('game-waiting');
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
  for (const trigger of triggers) {
    trigger.addEventListener('click', () => {
      // A minimized table comes back first; the hub is one more press away (or the head's 🎮).
      if (menu.hidden && current && stage.hidden) return void open(current);
      // The hub opens next to the 🎮 that was pressed.
      if (trigger.parentElement && menu.parentElement !== trigger.parentElement) {
        trigger.parentElement.append(menu);
        if (!menu.hidden) return setHub(true);
      }
      setHub(!!menu.hidden);
    });
  }
  document.addEventListener('pointerdown', (event) => {
    const target = event.target as Element | null;
    if (!menu.hidden && target && !menu.contains(target) && !triggers.some((b) => b.contains(target)) && !hubButton.node.contains(target)) setHub(false);
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
