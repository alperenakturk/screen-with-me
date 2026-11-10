// The in-room games hub (PlayWithMe, concept D of docs/internal/games-hub.md). 🎮 opens the hub: what's new, the
// room's tables (who is at each, Open / Join) and "new table". A room holds up to MAX_TABLES tables at once; each
// table is one game running in its own server object (the room only lists them). I have at most one table open at a
// time, in a game window with two placements (remembered per game, `gamePlace:<kind>`; defaults from the catalog):
// "float" a free window anywhere on the page (drag by its head, resize from its corner; in fullscreen it moves into
// the fullscreen view and stays free there; an island on the film page) and "stage" in the video's place. The free
// window keeps the game's own shape (catalog `size`) and only grows or shrinks in proportion. In every placement the
// game is fitted to its box (`refit`): smaller than the room its layout needs (`fit`), or still overflowing, the
// whole game is scaled down, so nothing ever scrolls. Narrow screens: "below" the video (the rest of the screen) or
// "large" (the whole screen). ✕ only minimizes it, in every game (owner, 4 Nov 2026: a game window's ✕ never closes or
// deletes a game): still connected, still "at" the table, a solo game keeps its state. "Leave table" (tables only) and
// "End table" (its opener or the host) are their own buttons and ask first while a game is in progress; solo games have
// no close at all (their own "Start over" is the only reset). Closing the tab while my table's game is in progress asks
// "are you sure?" (`beforeunload`, `live.ts`).

import { createLogo } from '@swm/shared/logo';
import { slideIn } from './motion.ts';
import { CLASSICS_SIZES, GAME_CATALOG, LATEST_NEWS, SOLO_CATALOG, isSoloKind, unseenNews, type SoloKind, type SoloRoom } from '@swm/shared/games/catalog';
import { personOf, type Avatar, type ClientMessage, type Member, type RoomGame, type RoomGameKind } from '@swm/shared/protocol';
import { hasMouse, isPhoneLayout, isTouch, onPhoneLayout, onTabletUpright } from '../device.ts';
import { el } from '../dom.ts';
import { lang, t } from '../i18n.ts';
import { playSound } from '../sound.ts';
import { load, save } from '../storage.ts';
import { avatarNode } from '../ui/avatar.ts';
import { icon, type IconName } from '../ui/icons.ts';
import { confirmDialog } from '../ui/confirm.ts';
import { gameLive } from './live.ts';
import { debugHooks } from '../debug-lab.ts';

const ICONS: Record<RoomGameKind, IconName> = { xox: 'game-xox', four: 'game-four', draw: 'game-draw', quiz: 'game-quiz', poker: 'game-poker', classics: 'game-four', sea: 'game-sea', duel: 'game-duel' };
export const gameIcon = (kind: RoomGameKind): SVGSVGElement => icon(ICONS[kind]);
/** Solo games have an emoji until the games gallery (card GG) gives every game its cover. */
const SOLO_GLYPH: Record<SoloKind, string> = { snack: '🍿', garden: '🌱', word: '🎟️' };
const soloIcon = (kind: SoloKind): HTMLElement => el('span', { class: 'hub-glyph', 'aria-hidden': 'true' }, SOLO_GLYPH[kind]);

/** A game the window can show: a room game (a table) or a solo game played on the side. */
type Kind = RoomGameKind | SoloKind;
const catalogOf = (kind: Kind) => (isSoloKind(kind) ? SOLO_CATALOG[kind] : GAME_CATALOG[kind]);

const PAD = `<svg class="pwm-pad" viewBox="0 0 84 54" aria-hidden="true">
  <path d="M20 6h44a15 15 0 0 1 15 14l2 19a10 10 0 0 1-17.5 6.5L56 38H28l-7.5 7.5A10 10 0 0 1 3 39l2-19A15 15 0 0 1 20 6z" fill="#241a5c" stroke="#ffd166" stroke-width="3" stroke-linejoin="round"/>
  <rect x="15" y="22" width="15" height="5.5" rx="1.6" fill="#fff"/><rect x="19.75" y="17.25" width="5.5" height="15" rx="1.6" fill="#fff"/>
  <circle cx="60" cy="19" r="3.6" fill="#ff6b9a"/><circle cx="67.5" cy="25.5" r="3.6" fill="#4ade80"/>
  <circle cx="52.5" cy="25.5" r="3.6" fill="#60a5fa"/><circle cx="60" cy="32" r="3.6" fill="#ffd166"/>
</svg>`;

/** PlayWithMe logo (the Sidelit face holding a game pad); the small one heads the stage. */
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
const placeOf = (kind: Kind): Place => {
  const saved = load(`gamePlace:${kind}`);
  // "side" (0.9.91.8–0.9.91.9) became the free window.
  if (saved === 'side') return 'float';
  return PLACES.includes(saved as Place) ? (saved as Place) : catalogOf(kind).place;
};
/** The free window's spot on the screen, as a share of the free room (0–1), per game (`gameFloat:spot` = before 0.9.97.111, for every game). */
const FLOAT_KEY = 'gameFloat:spot';
const spotKey = (kind: Kind) => `${FLOAT_KEY}:${kind}`;
/** Where a free window opens until it is moved: the right edge, halfway down. */
const SPOT_HOME = { x: 1, y: 0.5 };
/** Gap left between the free window and a YouTube player it settles beside. */
const BESIDE_GAP = 4;
/** A dragged window stays on its side of the YouTube player until another side is this much nearer (no jumping). */
const SIDE_STICK = 160;
/** The free window's zoom per game (what I last dragged it to; empty = the game's own size). */
const zoomKey = (kind: Kind) => `gameFloat:zoom:${kind}`;
/** Gap kept between the free window and the screen's edges. */
const EDGE = 8;
type Box = { left: number; top: number; width: number; height: number };
/** The least zoom at which a strip of the screen still counts as room for the free window (tablets, YouTube). */
const MIN_ZOOM = 0.45;
/** PROP: the most the video's place scales a game up, and the free window's head + border its `size` includes. */
const MAX_STAGE = 2.2;
const CHROME_W = 2;
const CHROME_H = 52;
/** The game is never shown smaller than this share of its layout (tiny boxes fall back to it). */
const MIN_FIT = 0.4;
/** Boxes inside a game that clip what doesn't fit: they count when fitting the game. */
const FIT_INSIDE = '.draw-overlay, .quiz-main, .pk-fit, .sb, .sb-rows, .wg, .ff';
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
  /** Sends on the room connection; false when it is not open (the message is lost). */
  send: (message: ClientMessage) => boolean | void;
  me: () => { id: string | null; name: string; avatar: Avatar };
  /** Am I the host (the host can close any table). */
  amHost: () => boolean;
  /** The room's people (who is at which table). */
  members: () => readonly Member[];
  /** A grey line in the chat (room actions). */
  activity: (text: () => string) => void;
  /** A short bubble by 🎮. */
  hint: (text: string) => void;
  /** What a solo game needs from the room: is the video playing, how many others are here / in voice with me. */
  room: () => SoloRoom;
}

/** The Test Lab is switched on in this tab (the same switch `debug-lab.ts` keeps). */
const labIsOn = (): boolean => {
  try {
    return sessionStorage.getItem('swm:debug') == '1';
  } catch {
    return false;
  }
};

export function createGameStage(opts: StageOptions) {
  const { wrap, button, menu, send } = opts;
  /** The room as the side games see it (the Test Lab can make them act as if the film played). */
  let labRoom: ((room: SoloRoom) => SoloRoom) | null = null;
  const soloRoom = () => (labRoom ? labRoom(opts.room()) : opts.room());
  let tables: RoomGame[] = [];
  /** The table I have open (mounted even while minimized) and its close function. */
  let current: RoomGame | null = null;
  let unmount: (() => void) | null = null;
  /** I asked for a new table: open it for me as soon as the room lists it. */
  let wanted: RoomGameKind | null = null;
  /** When I asked (a request older than WANTED_MS is forgotten), and whether it still has to go out. */
  let wantedAt = 0;
  let wantedUnsent = false;
  const WANTED_MS = 20_000;
  /** The solo game I have open instead of a table (mounted even while minimized: it keeps earning). */
  let solo: SoloKind | null = null;
  /** The game the window shows now. */
  const shownKind = (): Kind | null => current?.kind ?? solo;

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
  const minimizeButton = headButton('✕', 'game-minimize');
  const leaveButton = headButton('↩', 'game-leave');
  const endButton = headButton('⏹', 'game-end');
  // Placement switch: free window / in the video's place (narrow screens: below / large).
  const placeButtons = PLACES.map((p) => {
    const b = el('button', { type: 'button', class: `game-place-btn place-${p}` });
    b.addEventListener('click', () => {
      const kind = shownKind();
      if (!kind) return;
      // On a narrow screen "float" means below the video, "stage" the whole screen.
      save(`gamePlace:${kind}`, p);
      place();
    });
    return b;
  });
  const placeSwitch = el('span', { class: 'game-place', role: 'group' }, ...placeButtons);
  // A game may put its own small buttons here (Classics: "Change game"); it empties the slot when it closes.
  const headSlot = el('span', { class: 'game-head-slot' });
  const head = el('header', { class: 'game-stage-head' }, playLogo(), title, el('span', { class: 'game-stage-gap' }), headSlot, placeSwitch, hubButton.node, leaveButton.node, endButton.node, minimizeButton.node);
  // The game mounts into `body`, a box the size of the frame divided by its scale (see `refit`).
  const body = el('div', { class: 'game-fit' });
  /**
   * The window's size and the room its layout needs. Classics (CL2) follows the screen on its table: the picker or
   * the board (`data-board` on its page, `swm-game-size` when it changes).
   */
  const sizeOf = (kind: Kind) => {
    if (kind !== 'classics') return catalogOf(kind);
    const board = body.querySelector<HTMLElement>('.xox-page')?.dataset.board as keyof typeof CLASSICS_SIZES | undefined;
    return (board && CLASSICS_SIZES[board]) || catalogOf(kind);
  };
  const frame = el('div', { class: 'game-stage-body' }, body);
  const grip = el('span', { class: 'game-resize', 'aria-hidden': 'true' });
  // The room's emojis fly over the free window too (ui/reactions.ts picks this layer while it is open).
  const flying = el('div', { class: 'reactions-layer game-reactions', 'aria-hidden': 'true' });
  const stage = el('section', { id: 'game-stage', class: 'game-stage', 'aria-label': 'PlayWithMe' }, head, frame, flying, grip);
  stage.hidden = true;
  wrap.append(stage);
  const theater = (wrap.closest('.theater') as HTMLElement | null) ?? wrap;
  const narrowQuery = matchMedia('(max-width: 860px)');
  // An upright tablet (card T) is narrow but plays like a computer: the game in the video's place. A phone is always
  // narrow, also held sideways wider than 860 px (LAYOUT1: a Pixel 7 sideways is 863 px wide and got the computer's
  // free window over its tiny video, while a 750 px iPhone got the whole screen).
  const narrow = {
    get matches(): boolean {
      return (narrowQuery.matches || isPhoneLayout()) && !document.documentElement.classList.contains('tablet-up');
    },
  };
  const inFullscreen = () => theater.matches(':fullscreen') || theater.classList.contains('fake-fs');
  /**
   * The Shorts view (0.9.91.13, owner): the upright video has no room for a game in its place, so a game there is a
   * free window (on a phone: large). Opening the Shorts view with a game open moves it to the free window in the
   * space right of the video and remembers that, so it stays free back in the room view until I pin it again.
   */
  const shortsView = () => document.documentElement.classList.contains('shorts-view');
  /** The placement in use now. */
  let mode: Place | 'below' | 'full' = 'stage';
  /**
   * Card YTG (the YouTube audit): YouTube's rules allow nothing of ours in front of its player. On a computer, while the
   * room's item is YouTube, a game never sits on the player: "in the video's place" acts as the free window, and the free
   * window keeps to the space beside the player (under it when there is none). The phone's small preview is the owner's
   * call and stays as it is.
   */
  const overYoutube = () => theater.classList.contains('yt-rail') && !isPhoneLayout();
  /** The YouTube player's box on the screen: the whole theater, since the player widens when the rail beside it rests. */
  const playerBox = (): DOMRect | null => {
    const r = theater.getBoundingClientRect();
    return r.width > 1 && r.height > 1 ? r : null;
  };

  /** Was the theater fullscreen at the last placement (YTG: entering it vs. a game coming up in it). */
  let fsBefore = inFullscreen();
  /** Puts the game window where its placement says (moves the element only when its parent changes). */
  function place(): void {
    // YTG: a YouTube video in fullscreen fills the screen, so a game has nowhere to go but over it. Going fullscreen
    // with a game open tucks the game away (a dot on 🎮); a game brought up in fullscreen leaves fullscreen.
    const fsNow = inFullscreen();
    const entered = fsNow && !fsBefore;
    fsBefore = fsNow;
    if (overYoutube() && fsNow && !stage.hidden) {
      if (entered) return minimize();
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    }
    const kind = shownKind();
    const chosen = kind ? (shortsView() ? 'float' : placeOf(kind)) : 'stage';
    const youtube = overYoutube();
    const want = youtube ? 'float' : chosen;
    // A phone always plays full screen (0.9.92.5, pick 10A): the video shrinks to a thumbnail in the head.
    mode = narrow.matches ? (!youtube && (want === 'stage' || shortsView() || isPhoneLayout()) ? 'full' : 'below') : want;
    // YTG: no room beside the YouTube player for the free window: under it instead.
    if (mode === 'float' && youtube && !inFullscreen() && !besidePlayer()) mode = 'below';
    // The free window lives on the page, or in the fullscreen view while there is one (or it would be hidden).
    const parent = narrow.matches ? document.body : mode === 'float' ? (inFullscreen() ? theater : document.body) : wrap;
    if (stage.parentElement !== parent) parent.append(stage);
    for (const m of ['float', 'stage', 'below', 'full'] as const) stage.classList.toggle(m, mode === m);
    // On the film page the free window is a window of its own over the film (inside the video box it is one anyway).
    document.documentElement.classList.toggle('game-below', mode === 'below' && !stage.hidden);
    // phone.css: the room's video becomes a small preview in the game's head (it keeps playing, a tap goes back).
    document.documentElement.classList.toggle('ph-game', isPhoneLayout() && mode === 'full' && !stage.hidden && !shortsView());
    if (mode === 'below') placeBelow();
    if (mode === 'float') placeFloat();
    else for (const p of ['left', 'top', 'width', 'height', 'transform']) stage.style.removeProperty(p);
    stage.toggleAttribute('data-island', mode === 'float');
    // Bug W2: over a YouTube video only the free window is possible (YTG), so the switch has nothing to switch: it goes,
    // and the head says in plain words why the window keeps beside the video.
    placeSwitch.hidden = youtube;
    head.title = youtube && mode === 'float' ? t('game.besideYoutube') : '';
    placeButtons.forEach((b, i) => {
      const p = PLACES[i]!;
      const on = narrow.matches ? (p === 'stage' ? mode === 'full' : mode === 'below') : p === want;
      b.classList.toggle('on', on);
      // YTG: "in the video's place" is not offered over a YouTube video.
      b.disabled = youtube && p === 'stage';
      b.setAttribute('aria-pressed', String(on));
      const name = narrow.matches ? (p === 'stage' ? 'large' : 'below') : p;
      b.replaceChildren(icon(`place-${name === 'large' ? 'stage' : name}` as IconName));
      b.title = b.disabled ? t('hub.place.notYoutube') : t(`hub.place.${name}`);
      b.setAttribute('aria-label', b.title);
    });
    // The film page's hole and islands follow at once.
    dispatchEvent(new Event('swm-layout'));
  }

  /** Below the video (narrow screens): the window starts where the video ends. */
  function placeBelow(): void {
    // YTG: under the whole theater over a YouTube video (its frame may reach past the video's box).
    const bottom = (overYoutube() ? theater : wrap).getBoundingClientRect().bottom;
    stage.style.setProperty('--game-top', `${Math.max(0, Math.round(bottom))}px`);
  }

  // ---- The free window: dragged by its head anywhere on the screen, resized from its corner ----
  /** Where it may go: the screen, or the fullscreen view (on a tablet: the part of the screen clear of the chat). */
  function area(): Box {
    if (inFullscreen()) {
      const r = theater.getBoundingClientRect();
      return { left: r.left, top: r.top, width: r.width, height: r.height };
    }
    const room = pageRoom();
    return overYoutube() ? besidePlayer() ?? room : room;
  }
  /**
   * Where the free window may be moved: the fullscreen view, or the page (on a tablet: clear of the chat). Over a YouTube
   * video too (bug W5): the window moves anywhere and only keeps off the player itself (`clearOfPlayer`); `area` (the
   * strip beside the player) only limits its size.
   */
  function posRoom(): Box {
    if (inFullscreen()) {
      const r = theater.getBoundingClientRect();
      return { left: r.left, top: r.top, width: r.width, height: r.height };
    }
    return pageRoom();
  }
  /** The side of the YouTube player the window keeps to while it is dragged (null: the nearest one). */
  let side: 'left' | 'right' | 'up' | 'down' | null = null;
  /**
   * YTG + bug W5: a free window that would cover the YouTube player settles just beside it, on the nearest side where it
   * fits on the screen; while it is dragged it slides along the player's edge and only changes sides when another one is
   * clearly nearer, so it never jumps under the mouse.
   */
  function clearOfPlayer(b: { left: number; top: number }, width: number, height: number, room: Box): { left: number; top: number } {
    const p = playerBox();
    if (!p || !overYoutube() || inFullscreen()) return b;
    if (b.left >= p.right || p.left >= b.left + width || b.top >= p.bottom || p.top >= b.top + height) return b;
    const lo = { x: room.left + EDGE, y: room.top + EDGE };
    const hi = { x: room.left + room.width - EDGE - width, y: room.top + room.height - EDGE - height };
    const options = [
      { s: 'left' as const, left: p.left - width - BESIDE_GAP, top: b.top },
      { s: 'right' as const, left: p.right + BESIDE_GAP, top: b.top },
      { s: 'up' as const, left: b.left, top: p.top - height - BESIDE_GAP },
      { s: 'down' as const, left: b.left, top: p.bottom + BESIDE_GAP },
    ]
      .map((o) => ({ ...o, left: Math.min(Math.max(o.left, lo.x), hi.x), top: Math.min(Math.max(o.top, lo.y), hi.y) }))
      .filter((o) => o.left >= p.right || p.left >= o.left + width || o.top >= p.bottom || p.top >= o.top + height)
      .map((o) => ({ ...o, d: Math.abs(o.left - b.left) + Math.abs(o.top - b.top) }))
      .sort((x, y) => x.d - y.d);
    const kept = options.find((o) => o.s === side);
    const best = kept && kept.d <= options[0]!.d + SIDE_STICK ? kept : options[0];
    if (!best) {
      // Nowhere beside it on this screen: the largest strip beside the player (the window was sized for it).
      const strip = besidePlayer() ?? room;
      return { left: strip.left + EDGE, top: strip.top + EDGE };
    }
    side = best.s;
    return { left: best.left, top: best.top };
  }
  /** The page's room for the free window (on a tablet: clear of the chat). */
  function pageRoom(): Box {
    const screen = { left: 0, top: 0, width: innerWidth, height: innerHeight };
    return isTablet() ? clearOfChat(screen) ?? screen : screen;
  }
  /** YTG: the largest part of the page's room beside the YouTube player (left, right, above or below it). */
  function besidePlayer(): Box | null {
    const p = playerBox();
    return p ? largestClear(pageRoom(), p) : pageRoom();
  }
  /** A tablet (card GT): a touch screen without a mouse that is not in the phone layout. */
  const isTablet = () => isTouch() && !hasMouse() && !isPhoneLayout();
  /**
   * Card GT (A's G98): on a tablet the free window must not cover the chat (upright it is its own column under the
   * video, sideways the side panel). The window gets the largest strip of the screen beside the chat (above, below,
   * left or right of it, under the top bar) in which the game is biggest; null when there is no chat on screen or nothing fits there.
   */
  function clearOfChat(screen: Box): Box | null {
    const chat = (document.documentElement.classList.contains('tablet-up') ? document.querySelector('.chat-panel') : document.querySelector('.room .side')) as HTMLElement | null;
    const c = chat?.getBoundingClientRect();
    if (!c || c.width < 1 || c.height < 1 || c.right <= 0 || c.left >= screen.width) return null;
    return largestClear(screen, c);
  }
  /**
   * The strip of `room` beside `c` (above, below, left or right of it, under the top bar) in which the game is biggest;
   * null when the game doesn't fit in any of them.
   */
  function largestClear(room: Box, c: DOMRect): Box | null {
    const [w, h] = sizeOf(shownKind() ?? 'xox').size;
    // The top bar's buttons (Invite, ⋯, me, ⚙️) stay free too.
    const bar = Math.max(room.top, document.querySelector('.topbar')?.getBoundingClientRect().bottom ?? 0);
    const right = room.left + room.width;
    const bottom = room.top + room.height;
    const strips: Box[] = [
      { left: room.left, top: bar, width: room.width, height: Math.min(c.top, bottom) - bar },
      { left: room.left, top: Math.max(c.bottom, bar), width: room.width, height: bottom - Math.max(c.bottom, bar) },
      { left: room.left, top: bar, width: Math.min(c.left, right) - room.left, height: bottom - bar },
      { left: Math.max(c.right, room.left), top: bar, width: right - Math.max(c.right, room.left), height: bottom - bar },
    ];
    const zoomIn = (b: Box) => Math.min((b.width - 2 * EDGE) / w, (b.height - 2 * EDGE) / h);
    const best = strips.reduce((a, b) => (zoomIn(b) > zoomIn(a) ? b : a));
    return zoomIn(best) >= MIN_ZOOM ? best : null;
  }
  /** Card GW: the free window's zoom range from the catalog's smallest and largest size (the game keeps its shape). */
  function zoomRange(kind: Kind): { low: number; high: number } {
    const { size, minSize, maxSize } = sizeOf(kind);
    return { low: Math.max(minSize[0] / size[0], minSize[1] / size[1]), high: Math.min(maxSize[0] / size[0], maxSize[1] / size[1]) };
  }
  /**
   * The free window's zoom: what I dragged it to (1 = the game's own size), kept between the game's smallest and largest
   * size and never bigger than the screen allows (a screen smaller than the smallest size gets the whole screen).
   */
  function floatZoom(want?: number): number {
    const kind = shownKind() ?? 'xox';
    const [w, h] = sizeOf(kind).size;
    const { low, high } = zoomRange(kind);
    const saved = Number(load(zoomKey(kind)) || '0');
    const room = area();
    const most = Math.min(high, (room.width - 2 * EDGE) / w, (room.height - 2 * EDGE) / h);
    // Until I size it myself, a window grows with the screen (LAYOUT1, the Planner's B2: the games' own sizes are made
    // for 1366 × 768, so on a 2560 × 1440 screen a side game was 6 % of it): 1 on a laptop, ≈ 1.4 at 1920 × 1080, the
    // game's largest size (≈ 1.5) at 2560 × 1440.
    const screenZoom = Math.max(1, Math.min(innerWidth / 1366, innerHeight / 768));
    const wanted = want ?? (Number.isFinite(saved) && saved > 0 ? saved : screenZoom);
    return Math.min(most, Math.max(low, wanted));
  }
  /** The free window's spot (each game remembers its own, bug W5) and the game it belongs to. */
  let spot = { ...SPOT_HOME };
  let spotFor: Kind | null = null;
  const saveSpot = () => spotFor && save(spotKey(spotFor), JSON.stringify(spot));
  function placeFloat(zoom = floatZoom()): void {
    const kind = shownKind() ?? 'xox';
    if (spotFor !== kind) {
      spotFor = kind;
      spot = readPair(spotKey(kind)) ?? readPair(FLOAT_KEY) ?? { ...SPOT_HOME };
      side = null;
    }
    const [w, h] = sizeOf(kind).size;
    const width = Math.round(w * zoom);
    const height = Math.round(h * zoom);
    const room = posRoom();
    const x = Math.min(1, Math.max(0, spot.x));
    const y = Math.min(1, Math.max(0, spot.y));
    const at = clearOfPlayer(
      { left: room.left + EDGE + Math.max(0, room.width - 2 * EDGE - width) * x, top: room.top + EDGE + Math.max(0, room.height - 2 * EDGE - height) * y },
      width,
      height,
      room,
    );
    stage.style.left = `${Math.round(at.left)}px`;
    stage.style.top = `${Math.round(at.top)}px`;
    stage.style.width = `${width}px`;
    stage.style.height = `${height}px`;
  }
  /** The spot of the window as it stands now (after it settled beside a YouTube player): what a drop remembers. */
  function spotNow(): { x: number; y: number } {
    const room = posRoom();
    const box = stage.getBoundingClientRect();
    const freeX = room.width - 2 * EDGE - box.width;
    const freeY = room.height - 2 * EDGE - box.height;
    return {
      x: freeX > 0 ? Math.min(1, Math.max(0, (box.left - room.left - EDGE) / freeX)) : 0,
      y: freeY > 0 ? Math.min(1, Math.max(0, (box.top - room.top - EDGE) / freeY)) : 0,
    };
  }
  // Bug W5: the drag follows the mouse once per frame (pointer events can come faster than the screen draws).
  let drag: { x: number; y: number; left: number; top: number; id: number } | null = null;
  let dragAt: { x: number; y: number } | null = null;
  let dragFrame = 0;
  head.addEventListener('pointerdown', (event) => {
    if (mode !== 'float' || event.button !== 0 || (event.target as Element).closest('button, a, select, input')) return;
    const box = stage.getBoundingClientRect();
    drag = { x: event.clientX, y: event.clientY, left: box.left, top: box.top, id: event.pointerId };
    side = null;
    head.setPointerCapture(event.pointerId);
    stage.classList.add('game-dragging');
  });
  head.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    dragAt = { x: event.clientX, y: event.clientY };
    if (!dragFrame) dragFrame = requestAnimationFrame(dragStep);
  });
  function dragStep(): void {
    dragFrame = 0;
    if (!drag || !dragAt) return;
    const room = posRoom();
    const box = stage.getBoundingClientRect();
    const freeX = Math.max(1, room.width - 2 * EDGE - box.width);
    const freeY = Math.max(1, room.height - 2 * EDGE - box.height);
    spot = {
      x: Math.min(1, Math.max(0, (drag.left + dragAt.x - drag.x - room.left - EDGE) / freeX)),
      y: Math.min(1, Math.max(0, (drag.top + dragAt.y - drag.y - room.top - EDGE) / freeY)),
    };
    placeFloat();
    dispatchEvent(new Event('swm-layout'));
  }
  const endDrag = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.id) return;
    if (dragFrame) cancelAnimationFrame(dragFrame);
    dragStep();
    drag = null;
    dragAt = null;
    stage.classList.remove('game-dragging');
    spot = spotNow();
    saveSpot();
  };
  head.addEventListener('pointerup', endDrag);
  head.addEventListener('pointercancel', endDrag);
  /** Double click on the head (or the lab): the game's own size, back where it first opened. */
  function resetFloat(): void {
    const kind = shownKind();
    if (!kind) return;
    save(zoomKey(kind), '');
    spotFor = kind;
    spot = { ...SPOT_HOME };
    side = null;
    saveSpot();
    if (mode === 'float') placeFloat();
    dispatchEvent(new Event('swm-layout'));
  }
  head.addEventListener('dblclick', (event) => {
    if (mode !== 'float' || (event.target as Element).closest('button, a, select, input')) return;
    resetFloat();
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
    const kind = shownKind();
    if (!sizing || !kind) return;
    const [w, h] = sizeOf(kind).size;
    const room = posRoom();
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
    save(zoomKey(kind), String(Math.round(zoom * 1000) / 1000));
    placeFloat(zoom);
    dispatchEvent(new Event('swm-layout'));
  });
  const endSizing = () => {
    if (!sizing) return;
    sizing = null;
    spot = spotNow();
    saveSpot();
  };
  grip.addEventListener('pointerup', endSizing);
  grip.addEventListener('pointercancel', endSizing);

  narrowQuery.addEventListener('change', place);
  onTabletUpright(place);
  onPhoneLayout(() => place());
  addEventListener('fullscreenchange', place);
  addEventListener('resize', () => {
    if (mode === 'below') placeBelow();
    if (mode === 'float') placeFloat();
  });
  // Fullscreen without the Fullscreen API (iPhone, the film page) is a class on the theater.
  new MutationObserver(() => {
    const fs = inFullscreen();
    const yt = overYoutube();
    if (fs !== wasFs || yt !== wasYoutube) {
      wasFs = fs;
      wasYoutube = yt;
      place();
    }
  }).observe(theater, { attributes: true, attributeFilter: ['class'] });
  let wasFs = inFullscreen();
  let wasYoutube = overYoutube();
  let wasShorts = shortsView();
  new MutationObserver(() => {
    const now = shortsView();
    if (now === wasShorts) return;
    wasShorts = now;
    const kind = shownKind();
    if (now && kind) besideShorts(kind);
    place();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  /** The free space right of the upright Short: the window goes there, made small enough to fit beside it. */
  function besideShorts(kind: Kind): void {
    save(`gamePlace:${kind}`, 'float');
    spotFor = kind;
    spot = { x: 1, y: 0.4 };
    saveSpot();
    requestAnimationFrame(() => {
      const [w] = sizeOf(kind).size;
      // Right of the video's column: since 0.9.92.2 the Shorts rail (and ▲▼) sit between the video and this space.
      const rail = document.getElementById('shorts-nav')?.getBoundingClientRect();
      const right = Math.max(wrap.getBoundingClientRect().right, rail && rail.width ? rail.right : 0);
      const beside = innerWidth - right - 3 * EDGE;
      if (beside > 0 && shownKind() === kind) {
        save(zoomKey(kind), String(Math.round(Math.max(MIN_ZOOM, Math.min(floatZoom(), beside / w)) * 1000) / 1000));
        if (mode === 'float') placeFloat();
        dispatchEvent(new Event('swm-layout'));
      }
    });
  }
  place();

  // W1 (owner, 10 Nov 2026): no game goes to its own full screen ("I don't want ANY game taken to full screen and made
  // huge"): two placements only, the video's place and the free window (inside the video's fullscreen while there is
  // one). Card GW's ⛶ and its whole-tab view are gone.

  // ---- Fit the game to its box: no scrollbars, ever (owner's rule) ----
  let fitting = false;
  function refit(): void {
    const kind = shownKind();
    if (fitting || stage.hidden || !kind) return;
    const W = frame.clientWidth;
    const H = frame.clientHeight;
    if (!W || !H) return;
    fitting = true;
    // Phones have their own narrow layouts: only overflow shrinks the game there.
    const [fw, fh] = narrow.matches ? [0, 0] : sizeOf(kind).fit;
    let scale = Math.min(1, fw ? W / fw : 1, fh ? H / fh : 1);
    // Card GW: a free window grown past the game's own size shows the game bigger
    // (in proportion, as at its own size) instead of stretching its layout: the scale grows with the window.
    // It keeps its own shape (the layout it was made for), centred in what is left over.
    let own: [number, number] | null = null;
    if (!narrow.matches && mode === 'float') {
      const [sw, sh] = sizeOf(kind).size;
      const iw = sw - (stage.offsetWidth - W);
      const ih = sh - (stage.offsetHeight - H);
      const up = Math.min(W / iw, H / ih);
      if (up > 1.001) {
        scale = up;
        own = [iw, ih];
      }
    } else if (!narrow.matches && mode === 'stage') {
      // PROP (owner: "the same experience in both modes"): in the video's place the game keeps its own shape too, scaled
      // to the box like the free window, from the shape that suits the box best: its own (`size`) or its wide one (`wide`).
      const info = sizeOf(kind) as { size: readonly [number, number]; wide?: readonly [number, number] };
      for (const [sw, sh] of [info.size, ...(info.wide ? [info.wide] : [])]) {
        const iw = sw - CHROME_W;
        const ih = sh - CHROME_H;
        const up = Math.max(MIN_FIT, Math.min(W / iw, H / ih, MAX_STAGE));
        if (!own || up > scale) {
          scale = up;
          own = [iw, ih];
        }
      }
    }
    for (let i = 0; i < 4; i++) {
      body.style.width = `${own ? own[0] : W / scale}px`;
      body.style.height = `${own ? own[1] : H / scale}px`;
      body.style.transform = scale !== 1 ? `scale(${scale})` : '';
      let over = Math.max(body.scrollHeight / body.clientHeight, body.scrollWidth / body.clientWidth);
      // Boxes that clip their own content (the drawing's overlay, the quiz card) must fit too.
      for (const box of body.querySelectorAll<HTMLElement>(FIT_INSIDE)) {
        if (box.clientHeight > 0 && !box.hidden) over = Math.max(over, box.scrollHeight / box.clientHeight);
      }
      if (over <= 1.005 || scale <= MIN_FIT) break;
      scale = Math.max(MIN_FIT, scale / over);
    }
    body.style.left = own ? `${Math.max(0, Math.round((W - own[0] * scale) / 2))}px` : '';
    body.style.top = own ? `${Math.max(0, Math.round((H - own[1] * scale) / 2))}px` : '';
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
  // Classics changed its screen (picker ↔ a board): the free window takes that screen's size.
  body.addEventListener('swm-game-size', () => {
    if (mode === 'float') placeFloat();
    queueFit();
    dispatchEvent(new Event('swm-layout'));
  });

  const meId = () => opts.me().id;
  const canClose = (table: RoomGame) => table.by.id === meId() || opts.amHost();
  const titleOf = (kind: RoomGameKind) => t(`games.${kind}.title`);
  /** People who have this table open (one entry per person, R11: by the server's person key). */
  function peopleAt(id: string): Member[] {
    const seen = new Set<string>();
    return opts.members().filter((m) => {
      if (m.table !== id || m.tv) return false;
      const key = personOf(m);
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
    leaveButton.node.hidden = !current;
    for (const b of triggers) b.title = t('hub.title');
    stage.classList.toggle('solo-game', !current && !!solo);
    if (current) {
      titleIcon.replaceChildren(gameIcon(current.kind));
      // R10: the game's name never shrinks; only "· started by …" gets cut in a narrow window (the tooltip has it all).
      const by = t('game.by', { name: current.by.name });
      titleText.replaceChildren(el('span', { class: 'game-stage-title-name' }, titleOf(current.kind)), el('span', { class: 'game-stage-title-by' }, `\u00a0· ${by}`));
      title.title = `${titleOf(current.kind)} · ${by}`;
      endButton.node.hidden = !canClose(current);
    } else if (solo) {
      titleIcon.replaceChildren(soloIcon(solo));
      // Card GP: just the game's name, so it shows in full in the narrow window; "just you, on the side" is its tooltip.
      titleText.textContent = t(`games.${solo}.title`);
      title.title = `${t(`games.${solo}.title`)} · ${t('hub.solo')}`;
      endButton.node.hidden = true;
    }
    for (const b of triggers) {
      b.classList.toggle('game-on', tables.length > 0);
      b.classList.toggle('game-new', unseenNews(load(SEEN_KEY)).length > 0);
    }
    if (!menu.hidden) drawHub();
  }

  // ---- The hub: the games gallery (card GG, owner's pick B "two tabs"), drawn by its own chunk ----
  const TAB_KEY = 'opt:hubTab';
  let gallery: typeof import('./gallery.ts') | null = null;
  let galleryLoading = false;
  function drawHub(): void {
    if (!gallery) {
      if (!menu.childElementCount) menu.replaceChildren(el('p', { class: 'muted game-stage-loading' }, '…'));
      if (!galleryLoading) {
        galleryLoading = true;
        void import('./gallery.ts').then((m) => {
          gallery = m;
          if (!menu.hidden) drawHub();
        });
      }
      return;
    }
    menu.replaceChildren(
      ...gallery.renderGallery({
        tab: load(TAB_KEY) === 'side' ? 'side' : 'together',
        setTab: (id) => {
          save(TAB_KEY, id);
          drawHub();
        },
        news: unseenNews(load(SEEN_KEY)),
        tables,
        currentId: current?.id ?? null,
        solo,
        peopleAt,
        canClose,
        titleOf,
        soloIcon,
        gameIcon,
        avatarNode,
        redraw: () => {
          if (!menu.hidden) drawHub();
        },
        join: (table) => {
          setHub(false);
          void open(table);
        },
        close: (id) => void endTable(id),
        openTable,
        openSolo: (kind) => {
          setHub(false);
          void openSolo(kind);
        },
      }),
    );
    menu.classList.add('gallery');
    requestAnimationFrame(keepHubOnScreen);
  }

  /** Slides the gallery back onto the screen when its button sits near an edge (phones: a bottom sheet). */
  function keepHubOnScreen(): void {
    menu.style.removeProperty('translate');
    if (menu.hidden || isPhoneLayout()) return;
    const r = menu.getBoundingClientRect();
    const dx = r.left < EDGE ? EDGE - r.left : r.right > innerWidth - EDGE ? innerWidth - EDGE - r.right : 0;
    const dy = r.top < EDGE ? EDGE - r.top : r.bottom > innerHeight - EDGE ? innerHeight - EDGE - r.bottom : 0;
    if (dx || dy) menu.style.translate = `${Math.round(dx)}px ${Math.round(dy)}px`;
  }

  // Card R8: the side games' chunks (their pictures and "How to play" cards are inlined in them) start loading as soon
  // as the hall opens, so a game picked from it shows its cards at once instead of after a network round trip.
  let soloWarm = false;
  function warmSolo(): void {
    if (soloWarm) return;
    soloWarm = true;
    void import('./snack-bar.ts').catch(() => (soloWarm = false));
    void import('./garden.ts').catch(() => (soloWarm = false));
    void import('./five-frames.ts').catch(() => (soloWarm = false));
  }

  function openTable(kind: RoomGameKind): void {
    wanted = kind;
    wantedAt = Date.now();
    // Card R1: pressed while the room connection was reconnecting (a deploy, a network blip) the request used to
    // be lost and the game opened only on the second press: it goes out again once the room is back.
    wantedUnsent = send({ t: 'table', open: kind }) === false;
    setHub(false);
  }

  function setHub(show: boolean): void {
    if (show) {
      warmSolo();
      drawHub();
      requestAnimationFrame(keepHubOnScreen);
    }
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
  // BHG: the tab remembers the table I am at (and whether it was minimized), so a reload mid-game takes me back to it.
  const atKey = `swm:table:${location.pathname}`;
  const rememberAt = (at: { id: string; min: boolean } | null) => {
    try {
      if (at) sessionStorage.setItem(atKey, JSON.stringify(at));
      else sessionStorage.removeItem(atKey);
    } catch {
      /* storage blocked: a reload simply leaves the table */
    }
  };
  const rememberedAt = (): { id: string; min: boolean } | null => {
    try {
      const at = JSON.parse(sessionStorage.getItem(atKey) ?? 'null') as { id?: unknown; min?: unknown } | null;
      return at && typeof at.id === 'string' ? { id: at.id, min: at.min === true } : null;
    } catch {
      return null;
    }
  };

  async function open(table: RoomGame): Promise<void> {
    document.getElementById('game-invite')?.remove();
    rememberAt({ id: table.id, min: false });
    if (stage.hidden) slideIn(stage);
    stage.hidden = false;
    for (const b of triggers) b.classList.remove('game-waiting');
    if (current?.id === table.id && unmount) return place();
    unmount?.();
    unmount = null;
    headSlot.replaceChildren();
    solo = null;
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
    else if (table.kind === 'sea') stop = (await import('./sea.ts')).mountSea(body, table.id, name, avatar);
    else if (table.kind === 'duel') stop = (await import('./duel.ts')).mountDuel(body, table.id, name, avatar);
    else stop = (await import('./match.ts')).mountMatch(body, table.kind, table.id, name, avatar);
    queueFit();
    // Switched or closed while loading: close at once.
    if (current?.id !== table.id) stop();
    else unmount = stop;
  }

  /** Leave my table (for me only): the game closes, the room learns I'm no longer there. */
  function leave(tell = true): void {
    // A solo game closes for me only: the room never knew about it.
    if (!current) tell = false;
    unmount?.();
    unmount = null;
    headSlot.replaceChildren();
    current = null;
    solo = null;
    rememberAt(null);
    stage.hidden = true;
    place();
    body.replaceChildren();
    for (const b of triggers) b.classList.remove('game-waiting');
    if (tell) send({ t: 'at', table: null });
  }

  function minimize(): void {
    if (current || solo) rememberAt({ id: current ? current.id : `solo:${solo}`, min: true });
    stage.hidden = true;
    place();
    if (current || solo) for (const b of triggers) b.classList.add('game-waiting');
  }

  /** Opens a solo game on the side; my table (if any) is left first: the window shows one game at a time. */
  async function openSolo(kind: SoloKind): Promise<void> {
    document.getElementById('game-invite')?.remove();
    if (stage.hidden) slideIn(stage);
    stage.hidden = false;
    for (const b of triggers) b.classList.remove('game-waiting');
    if (solo === kind && unmount) return place();
    if (current) leave();
    rememberAt({ id: `solo:${kind}`, min: false });
    unmount?.();
    unmount = null;
    headSlot.replaceChildren();
    solo = kind;
    labels();
    if (shortsView()) besideShorts(kind);
    stage.hidden = false;
    place();
    body.replaceChildren(el('p', { class: 'muted game-stage-loading' }, '…'));
    // Its code and stylesheet are a separate chunk: not downloaded when entering the room.
    const stop =
      kind === 'garden'
        ? (await import('./garden.ts')).mountGarden(body, soloRoom)
        : kind === 'word'
          ? (await import('./five-frames.ts')).mountFiveFrames(body)
          : (await import('./snack-bar.ts')).mountSnackBar(body, soloRoom);
    queueFit();
    if (solo !== kind) stop();
    else unmount = stop;
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

  /** Asks first while my table's game is in progress (leaving or ending it then is a real loss). */
  async function sure(kind: 'leave' | 'end'): Promise<boolean> {
    if (kind === 'leave' && !gameLive()) return true;
    return confirmDialog({
      icon: kind === 'end' ? '⏹' : '↩',
      title: t(kind === 'end' ? 'hub.closeAsk' : 'hub.leaveAsk'),
      text: t(kind === 'end' ? 'hub.closeAskText' : 'hub.leaveAskText'),
      yes: t(kind === 'end' ? 'hub.close' : 'hub.leave'),
    });
  }
  async function endTable(id: string): Promise<void> {
    if (await sure('end')) send({ t: 'table', close: id });
  }
  minimizeButton.node.addEventListener('click', minimize);
  leaveButton.node.addEventListener('click', async () => {
    const table = current;
    if (table && (await sure('leave')) && current?.id === table.id) leave();
  });
  endButton.node.addEventListener('click', () => current && void endTable(current.id));
  // Closing the tab (or reloading it) in the middle of a game asks first. Automated browsers only with
  // `opt:leaveWarn` = '1' (a harness that reloads mid-game would otherwise be stopped by the prompt).
  addEventListener('beforeunload', (event) => {
    if (!current || !gameLive()) return;
    if (navigator.webdriver && load('opt:leaveWarn') !== '1') return;
    event.preventDefault();
    event.returnValue = '';
  });
  // Bug W3: the head's 🎮 opens the games hall next to itself. It used to open it beside the toolbar's 🎮, which a
  // computer hides, so nothing showed. The hall hangs from a fixed box under the button (inside the fullscreen view
  // while there is one, or the browser would hide it).
  const headMenuWrap = el('div', { class: 'game-menu-wrap more-game-wrap head-game-wrap' });
  // Above the window in every placement, the game's own full screen included (no room.css rule: its budget is full).
  headMenuWrap.style.zIndex = '2147483001';
  function hubFromHead(): void {
    if (!menu.hidden && menu.parentElement === headMenuWrap) return setHub(false);
    const r = hubButton.node.getBoundingClientRect();
    headMenuWrap.style.top = `${Math.round(r.bottom + 6)}px`;
    headMenuWrap.style.right = `${Math.max(EDGE, Math.round(innerWidth - r.right))}px`;
    const parent = document.fullscreenElement ?? document.body;
    if (headMenuWrap.parentElement !== parent) parent.append(headMenuWrap);
    if (menu.parentElement !== headMenuWrap) headMenuWrap.append(menu);
    setHub(true);
  }
  hubButton.node.addEventListener('click', hubFromHead);
  for (const trigger of triggers) {
    trigger.addEventListener('click', () => {
      // A minimized table comes back first; the hub is one more press away (or the head's 🎮).
      if (menu.hidden && current && stage.hidden) return void open(current);
      if (menu.hidden && solo && stage.hidden) return void openSolo(solo);
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

  // Test Lab (bug W1–W5): the game window's state and its reset, offered while the lab is on.
  debugHooks.register('gameWindow', () => ({
    commands: [
      {
        id: 'gameWindow.reset',
        title: { en: 'Game window: back to its own size and spot', tr: 'Oyun penceresi: kendi boyutu ve yeri' },
        help: { en: 'The same as a double click on the free window’s head: the open game’s window goes back to its first size and spot.', tr: 'Serbest pencerenin başlığına çift tıklamakla aynı: açık oyunun penceresi ilk boyutuna ve yerine döner.' },
        tab: 'games',
        available: () => (shownKind() ? true : { en: 'no game open', tr: 'açık oyun yok' }),
        run: resetFloat,
      },
      {
        id: 'gameWindow.hall',
        title: { en: 'Game window: open the hall from its 🎮', tr: 'Oyun penceresi: 🎮 ile salonu aç' },
        help: { en: 'Presses the 🎮 in the open game window’s head: the games hall opens right under it.', tr: 'Açık oyun penceresinin başındaki 🎮’ya basar: oyun salonu hemen altında açılır.' },
        tab: 'games',
        available: () => (!stage.hidden ? true : { en: 'no game window on screen', tr: 'ekranda oyun penceresi yok' }),
        run: () => hubButton.node.click(),
      },
    ],
    status: () => {
      const kind = shownKind();
      if (!kind) return [];
      const where = stage.hidden ? 'minimized' : mode;
      return [[{ en: 'Game window', tr: 'Oyun penceresi' }, `${kind} · ${where}${overYoutube() ? ' · YouTube' : ''}`]];
    },
  }));

  return {
    /**
     * The room's tables: on entry (`announce` false: no chat line, no invite for tables already open) and on every
     * change, with what happened (`opened` / `closed` and by whom).
     */
    setTables(next: RoomGame[], change: { opened?: string; closed?: string; by?: Member } = {}, announce = true): void {
      tables = next;
      if (wanted && Date.now() - wantedAt > WANTED_MS) wanted = null;
      // Entering the room (a reload, a dropped connection): back to the table this tab was at, as it was.
      const at = !announce && !current && !solo ? rememberedAt() : null;
      const back = at && tables.find((x) => x.id === at.id);
      const sideKind = at?.id.startsWith('solo:') ? at.id.slice(5) : '';
      const side = isSoloKind(sideKind) ? sideKind : undefined;
      if (at && !back && !side) rememberAt(null);
      if (back) void open(back).then(() => at!.min && current?.id === back.id && minimize());
      else if (side) void openSolo(side).then(() => at!.min && solo === side && minimize());
      // Card R1: my table opened while the room connection was down (its "opened" never reached me): open it now.
      if (wanted && !change.opened && !current) {
        const mine = tables.find((x) => x.kind === wanted && x.by.id === meId());
        if (mine) {
          wanted = null;
          void open(mine);
        }
      }
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
    /** The room connection is back (after its welcome): a table asked for while it was down goes out now. */
    rejoined(): void {
      if (!wanted || Date.now() - wantedAt > WANTED_MS) return void (wanted = null);
      if (wantedUnsent || !tables.some((x) => x.kind === wanted && x.by.id === meId())) wantedUnsent = send({ t: 'table', open: wanted }) === false;
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
    /** The Test Lab's game commands: loaded only while the lab is on in this tab (`?debug=1`, `debug-lab.ts`). */
    lab: labIsOn()
      ? void import('./lab-tools.ts').then((m) => {
          labRoom = m.labRoom;
          m.registerGamesLab(openTable, openSolo, send, () => current);
        })
      : undefined,
    /** Opens a solo game (the room's ⋯ menu or a test). */
    openSolo: (kind: SoloKind) => void openSolo(kind),
  };
}
