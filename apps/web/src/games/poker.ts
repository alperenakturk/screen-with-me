// Last Heart (life poker) in the room (game window). Not a casino table: the pot is a glass flask filling with red
// life, every player has a game-style life bar, special moves are cards with their cost. My two cards come only to me
// (`cards`); a peek shows one card of a rival on their seat (for me only, this hand). A status strip on top always
// says whose turn it is and how many seconds are left; moves and hand results are announced to everyone in the
// middle of the table; "How to play" walks through the game in four short steps.

import './lobby.css';
import './poker.css';
import { OPEN, openSocket, type SwmSocket } from '@swm/shared/socket';
import { gameHint } from './hint.ts';
import { LOCAL_ONLY, labServerHere } from './lab-server.ts';
import { debugHooks } from '../debug-lab.ts';
import { flipIn, reducedMotion } from './motion.ts';
import { referee } from './referee.ts';
import {
  MOVE_COST,
  POKER_MAX_PLAYERS,
  POKER_MOVES,
  POKER_PROTOCOL_VERSION,
  POKER_START_LIFE,
  isJoker,
  type Card,
  type PokerClientMessage,
  type PokerMove,
  type PokerPlayer,
  type PokerServerMessage,
} from '@swm/shared/games/poker';
import type { Avatar } from '@swm/shared/protocol';
import { el } from '../dom.ts';
import { t } from '../i18n.ts';
import { playSound } from '../sound.ts';
import type { SoundId } from '@swm/shared/sound-policy';
import { setGameLive } from './live.ts';
import { clientId } from '../storage.ts';
import { avatarNode } from '../ui/avatar.ts';
import { lobbyPlayers, lobbySplit, settingsPanel } from './ui.ts';
import { silence } from './silent.ts';
import { watchLink } from './link-watch.ts';
import { GAME_CLOCK_EVERY, GAME_KEEPALIVE_MS, KEEPALIVE, KEEPALIVE_ACK, keepaliveTicks } from '@swm/shared/keepalive';
import { tableHowTo } from './how-to-play.ts';
import { resultCard, resultStub, showPointsResult } from './result.ts';
import poker1Art from './art/tutorial/poker-1-life.svg?raw';
import poker2Art from './art/tutorial/poker-2-hand.svg?raw';
import poker3Art from './art/tutorial/poker-3-moves.svg?raw';

type State = Extract<PokerServerMessage, { t: 'state' }>;
/** GP4: a pot this big (half a starting life) makes Stub gasp. */
const BIG_POT = 50;
const SUIT_GLYPH: Record<string, string> = { s: '♠', h: '♥', d: '♦', c: '♣' };
const MOVE_ICON: Record<PokerMove, string> = { dq: '🚫', free: '🕊️', shield: '🛡️', peek: '👁️' };
/** Moves that need a target (a rival still in the hand). */
const TARGETED: readonly PokerMove[] = ['dq', 'peek'];

/** A card face (or its back). */
function cardNode(card: Card | null, cls = ''): HTMLElement {
  if (!card) return el('span', { class: `pk-card back ${cls}`, 'aria-label': t('poker.hidden') });
  if (isJoker(card)) return el('span', { class: `pk-card joker ${cls}`, 'aria-label': 'Joker' }, el('b', {}, '★'), el('small', {}, 'JOKER'));
  const rank = card[0] === 'T' ? '10' : card[0]!;
  const suit = card[1]!;
  return el('span', { class: `pk-card suit-${suit} ${cls}`, 'aria-label': `${rank}${SUIT_GLYPH[suit]}` }, el('b', {}, rank), el('i', { 'aria-hidden': 'true' }, SUIT_GLYPH[suit]!));
}

/** LH4: Last Heart's own texts (kept out of i18n.ts for the room page's size budget; `check-game-text.mjs`). */
const TEXT = {
  en: {
    resultWin: '🏆 {name} takes {n} from the middle ({hand})',
    resultFold: '🏆 {name} takes {n} from the middle (the others folded)',
    timeoutCheck: 'Time ran out for {name}: checked',
    timeoutFold: 'Time ran out for {name}: folded',
  },
  tr: {
    resultWin: '🏆 {name} ortadan {n} can aldı ({hand})',
    resultFold: '🏆 {name} ortadan {n} can aldı (diğerleri çekildi)',
    timeoutCheck: '{name} için süre doldu: bekledi',
    timeoutFold: '{name} için süre doldu: çekildi',
  },
};
type TextKey = keyof typeof TEXT.en;
function say(key: TextKey, vars: Record<string, string | number> = {}): string {
  const table = document.documentElement.lang === 'tr' ? TEXT.tr : TEXT.en;
  return table[key].replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''));
}

/** A card in the feed's words ("7♦", "10♠", "★"). */
const cardText = (c: Card): string => (isJoker(c) ? '★' : `${c[0] === 'T' ? '10' : c[0]}${SUIT_GLYPH[c[1]!]}`);

/** The life bar: a heart and a bar filling up to 100 (more than 100 after winning: the bar shows the extra glow). */
function lifeBar(): HTMLElement {
  const bar = el('span', { class: 'pk-life', role: 'img' });
  bar.append(el('span', { class: 'pk-heart', 'aria-hidden': 'true' }, '♥'), el('span', { class: 'pk-bar' }, el('i')), el('b'));
  return bar;
}
/** LH4: the same bar moves to the new life (its width eases, `.pk-bar i` transition). */
function setLife(bar: HTMLElement, life: number): void {
  if (bar.dataset.life === String(life)) return;
  bar.dataset.life = String(life);
  bar.classList.toggle('low', life <= 20);
  bar.classList.toggle('over', life > POKER_START_LIFE);
  bar.setAttribute('aria-label', t('poker.life', { n: life }));
  bar.querySelector<HTMLElement>('.pk-bar i')!.style.width = `${Math.min(100, (life / POKER_START_LIFE) * 100)}%`;
  bar.querySelector('b')!.textContent = String(life);
}

/** The pot: a glass flask filled in proportion to all the life at the table. */
let flaskIds = 0;
function flask(): HTMLElement {
  const box = el('div', { class: 'pk-flask', role: 'img' });
  // Each flask its own clip id (two tables' flasks never share one).
  const clip = `pk-flask-clip-${++flaskIds}`;
  box.innerHTML = `<svg viewBox="0 0 80 100" aria-hidden="true">
    <defs><clipPath id="${clip}"><path d="M30 6h20v26l22 46a12 12 0 0 1-11 17H19A12 12 0 0 1 8 78l22-46z"/></clipPath></defs>
    <g clip-path="url(#${clip})"><rect class="pk-liquid" x="0" y="12" width="80" height="88"/></g>
    <path class="pk-glass" d="M30 6h20v26l22 46a12 12 0 0 1-11 17H19A12 12 0 0 1 8 78l22-46z"/>
    <path class="pk-neck" d="M26 6h28"/></svg>`;
  box.append(el('b', { class: 'pk-pot' }, '0'));
  return box;
}
/** LH4: the liquid rises and falls (a scale from the bottom, eased in poker.css) instead of being redrawn. */
function setFlask(box: HTMLElement, pot: number, total: number): void {
  const level = total > 0 ? Math.min(1, pot / total) : 0;
  box.setAttribute('aria-label', t('poker.pot', { n: pot }));
  box.querySelector<SVGElement>('.pk-liquid')!.style.transform = `scaleY(${level.toFixed(3)})`;
  box.querySelector('.pk-pot')!.textContent = String(pot);
}

export function mountPoker(app: HTMLElement, gameId: string, name: string, avatar: Avatar): () => void {
  const root = el('div', { class: 'pk' });
  app.replaceChildren(root);
  // GP4: the tables' one result card (Stub, who won, the podium by life left, Play again for the host).
  const endCard = resultCard(app, resultStub());
  // GP4: Stub the referee at a showdown: a split pot, or a big one (never a word about a player's mistake).
  const ref = referee(app);
  function refereeLine(s: State): void {
    const winners = s.players.filter((p) => (p.won ?? 0) > 0);
    const pot = winners.reduce((sum, p) => sum + (p.won ?? 0), 0);
    if (winners.length >= 2) ref.say(t('poker.say.split'), 'cheer');
    else if (pot >= BIG_POT) ref.say(t('poker.say.pot'), 'gasp');
  }
  const endLines = () => ({ win: t('poker.end.win'), lose: t('poker.end.lose'), draw: t('poker.end.over'), over: t('poker.end.over') });

  let state: State | null = null;
  let me: string | null = null;
  let offset = 0;
  /** My cards for hand `hand`. */
  let mine: { hand: number; cards: Card[] } | null = null;
  /** What I peeked this hand: player id → card. */
  let peeks: { hand: number; seen: Record<string, Card> } = { hand: -1, seen: {} };
  /** A targeted move waiting for me to pick a rival. */
  let arming: PokerMove | null = null;
  let raiseTo = 0;
  /** PH2: the raise amounts are open above the buttons (a phone's Games tab only; kept across renders). */
  let amountsOpen = false;
  let lastTurnKey = '';
  let lastTick = 0;
  let lastPhase = '';
  const feed: string[] = [];
  /** The deadline the timer bar counts down to, and when it was set (the bar's full length). */
  let clock = { endsAt: 0, from: 0 };
  /** The last event announced in the middle of the table (moves, raises, results). */
  let announced = '';
  /** "How to play" open, on step n (0–3). */
  let howto: number | null = null;
  /** Test Lab (LH4): I check or call by myself until this hand's showdown. */
  let autoHand = -1;

  const nameOf = (id: string | null | undefined) => state?.players.find((p) => p.id === id)?.name ?? '';
  const moveName = (m: PokerMove) => t(`poker.move.${m}`);

  function describe(s: State): string {
    const e = s.last;
    if (!e) return '';
    switch (e.e) {
      case 'blinds':
        return t('poker.ev.blinds', { sb: nameOf(e.sb), bb: nameOf(e.bb), a: e.amounts[0], b: e.amounts[1] });
      case 'act':
        return t(`poker.ev.${e.a}`, { name: nameOf(e.by), n: e.amount });
      case 'move':
        return t(`poker.ev.move.${e.m}`, { name: nameOf(e.by), target: nameOf(e.target), cost: MOVE_COST[e.m] });
      case 'timeout': {
        // LH4: say what the time-out did (a free check, or a fold).
        const p = s.players.find((x) => x.id === e.by);
        return say(p?.folded ? 'timeoutFold' : 'timeoutCheck', { name: nameOf(e.by) });
      }
    }
  }

  /** NG3: cards that turned face up this hand (they flip over once, a short stagger from the left). */
  const shownFaces = new Set<string>();
  let facesHand = -1;
  const faceUp = (node: HTMLElement, key: string, index: number): HTMLElement => {
    const hand = state?.hand ?? -1;
    if (hand !== facesHand) {
      facesHand = hand;
      shownFaces.clear();
    }
    if (!shownFaces.has(key)) {
      shownFaces.add(key);
      flipIn(node, index * 70);
    }
    return node;
  };
  /**
   * LH4: the table is built once and its parts are updated in place. A part is rebuilt only when what it shows changed
   * (`patch`), so a rival's move no longer ends my drag of the raise slider, and cards, life bars and the flask stay
   * the same nodes from one state to the next (they can move instead of jumping).
   */
  const patched = new WeakMap<Element, string>();
  function patch(node: HTMLElement, key: string, build: () => (Node | string | null)[]): boolean {
    if (patched.get(node) === key) return false;
    patched.set(node, key);
    node.replaceChildren(...build().filter((x): x is Node | string => x !== null));
    return true;
  }
  interface SeatView {
    root: HTMLElement;
    top: HTMLElement;
    life: HTMLElement;
    cards: HTMLElement;
    status: HTMLElement;
    pick: HTMLButtonElement;
  }
  interface TableView {
    status: HTMLElement;
    seats: HTMLElement;
    seat: Map<string, SeatView>;
    middle: HTMLElement;
    flask: HTMLElement;
    info: HTMLElement;
    board: HTMLElement[];
    feed: HTMLElement;
    me: HTMLElement;
    hand: HTMLElement;
    myName: HTMLElement;
    myLife: HTMLElement;
    myStatus: HTMLElement;
    actions: HTMLElement;
    moves: HTMLElement;
  }
  let view: TableView | null = null;

  function tableView(): TableView {
    if (view && view.status.parentElement === root) return view;
    const slots = Array.from({ length: 5 }, () => el('span', { class: 'pk-slot' }));
    const v: TableView = {
      status: el('div', { class: 'pk-status', role: 'status', 'aria-live': 'polite' }),
      seats: el('div', { class: 'pk-seats' }),
      seat: new Map(),
      middle: el('div', { class: 'pk-middle' }),
      flask: flask(),
      info: el('div', { class: 'pk-info' }),
      board: slots,
      feed: el('div', { class: 'pk-feed', 'aria-live': 'polite' }),
      me: el('div', { class: 'pk-me' }),
      hand: el('span', { class: 'pk-hand' }),
      myName: el('b'),
      myLife: lifeBar(),
      myStatus: el('span', { class: 'pk-seat-status' }),
      actions: el('div', { class: 'pk-actions' }),
      moves: el('div', { class: 'pk-moves' }),
    };
    v.middle.append(v.flask, el('div', { class: 'pk-center' }, v.info, el('div', { class: 'pk-board' }, ...slots), v.feed));
    v.me.append(el('div', { class: 'pk-me-top' }, v.hand, el('div', { class: 'pk-me-info' }, v.myName, v.myLife, v.myStatus)), v.actions, v.moves);
    root.replaceChildren(v.status, v.seats, v.middle, v.me, toast);
    return (view = v);
  }

  function seatView(v: TableView, id: string): SeatView {
    let sv = v.seat.get(id);
    if (!sv) {
      const pick = el('button', { type: 'button', class: 'pk-seat-pick' }) as HTMLButtonElement;
      pick.addEventListener('click', () => arming && useMove(arming, id));
      sv = { root: el('div', { class: 'pk-seat', 'data-id': id }), top: el('span', { class: 'pk-seat-top' }), life: lifeBar(), cards: el('span', { class: 'pk-seat-cards' }), status: el('span', { class: 'pk-seat-status' }), pick };
      sv.root.append(sv.top, sv.life, sv.cards, sv.status);
      v.seat.set(id, sv);
    }
    return sv;
  }

  function render(): void {
    const s = state;
    if (!s) return;
    const myPlayer = s.players.find((p) => p.id === me);
    setGameLive(!!myPlayer && s.phase !== 'lobby' && s.phase !== 'over');
    const myTurn = s.toAct !== null && s.toAct === me;
    if (peeks.hand !== s.hand) peeks = { hand: s.hand, seen: {} };
    // Sounds and the feed react to changes only.
    const turnKey = `${s.hand}:${s.phase}:${s.toAct}`;
    if (myTurn && turnKey !== lastTurnKey) playSound('roundMine');
    lastTurnKey = turnKey;
    if (s.phase === 'showdown' && lastPhase !== 'showdown' && lastPhase !== '') refereeLine(s);
    if (s.phase === 'showdown' && lastPhase !== 'showdown' && myPlayer?.dealt) playSound(myPlayer.won ? 'guessRight' : 'wrong');
    if (s.phase === 'over' && lastPhase !== 'over') playSound('podium');
    lastPhase = s.phase;
    const line = noteFeed(s);
    // Big announcements everyone sees: special moves, raises and time-outs. The hand's result is the status strip's
    // (LH4: it was said twice at once, in the strip and in a toast over it).
    const big = s.phase !== 'showdown' && s.last && (s.last.e === 'move' || s.last.e === 'timeout' || (s.last.e === 'act' && s.last.a === 'raise')) ? line : '';
    const bigKey = `${s.hand}:${s.phase}:${big}`;
    if (big && bigKey !== announced) announce(big, s.last?.e === 'move' ? 'move' : '');
    announced = big ? bigKey : announced;
    if (s.endsAt !== clock.endsAt) clock = { endsAt: s.endsAt ?? 0, from: Date.now() + offset };

    if (s.phase === 'over') {
      // The winner is the one heart left; the others rank by the life they had left (all 0 once out).
      const players = s.players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, online: p.online, score: p.id === s.winner ? Math.max(1, p.life) : p.life }));
      showPointsResult(endCard, `poker:${gameId}:${s.hand}`, players, s.host, me, endLines(), () => send({ t: 'start' }));
    } else endCard.hide();
    if (howto !== null) return renderHowto();
    if (s.phase === 'lobby' || s.phase === 'over') return renderLobby(s, myPlayer);
    const v = tableView();
    const lang = document.documentElement.lang;
    const total = s.players.reduce((sum, p) => sum + p.life, 0) + s.pot;
    const inHand = (p: PokerPlayer) => p.dealt && !p.folded && !p.dq && !p.out;

    // ---- Status strip ----
    renderStatus(v.status, s, myTurn, lang);

    // ---- Rivals ----
    const rivals = s.players.filter((p) => p.id !== me);
    const canPick = arming !== null && myPlayer !== undefined && inHand(myPlayer);
    const seatNodes = rivals.map((p) => {
      const sv = seatView(v, p.id);
      const targetable = canPick && inHand(p);
      sv.root.className = `pk-seat${p.id === s.toAct ? ' turn' : ''}${p.folded || p.dq ? ' folded' : ''}${p.out ? ' out' : ''}${!p.online ? ' away' : ''}${targetable ? ' target' : ''}${p.won ? ' won' : ''}`;
      patch(sv.top, `${lang}:${p.name}:${JSON.stringify(p.avatar)}:${p.id === s.dealer}`, () => [
        avatarNode(p.avatar, 'pk-avatar'),
        el('b', { class: 'pk-name' }, p.name),
        p.id === s.dealer ? el('span', { class: 'pk-dealer', title: t('poker.dealer') }, 'D') : null,
      ]);
      setLife(sv.life, p.life);
      const peek = peeks.seen[p.id] ?? null;
      patch(sv.cards, `${s.hand}:${p.cards?.join() ?? ''}:${p.best?.join() ?? ''}:${!!p.won}:${p.dealt && !p.folded && !p.dq}:${peek}`, () =>
        p.cards
          ? p.cards.map((c, i) => faceUp(cardNode(c, p.best?.includes(c) ? (p.won ? 'small best' : 'small kept') : 'small'), `p${p.id}:${c}`, i))
          : p.dealt && !p.folded && !p.dq
            ? [peek ? faceUp(cardNode(peek, 'small'), `k${p.id}:${peek}`, 0) : cardNode(null, 'small'), cardNode(null, 'small')]
            : [],
      );
      sv.status.textContent = statusText(p, s);
      if (targetable) {
        sv.pick.setAttribute('aria-label', t('poker.pick', { name: p.name }));
        if (sv.pick.parentElement !== sv.root) sv.root.append(sv.pick);
      } else sv.pick.remove();
      return sv.root;
    });
    for (const [id, sv] of v.seat) if (!rivals.some((p) => p.id === id)) {
      sv.root.remove();
      v.seat.delete(id);
    }
    if (seatNodes.some((n, i) => v.seats.children[i] !== n) || v.seats.children.length !== seatNodes.length) v.seats.replaceChildren(...seatNodes);

    // ---- The middle: board, flask, what happened ----
    setFlask(v.flask, s.pot, total);
    patch(v.info, `${lang}:${s.hand}:${s.blinds.join()}:${s.jokers}`, () => [t('poker.hand', { n: s.hand }), ' · ', t('poker.blinds', { a: s.blinds[0], b: s.blinds[1] }), s.jokers ? ` · ${t('poker.jokers')}` : '', helpButton()]);
    v.board.forEach((slot, i) => {
      const c = s.board[i];
      const best = !!c && winningCard(s, c);
      patch(slot, `${s.hand}:${c ?? ''}:${best}`, () => [c ? faceUp(cardNode(c, best ? 'best' : ''), `b${i}:${c}`, i) : el('span', { class: 'pk-card slot' })]);
    });
    patch(v.feed, feed.join('\n'), () => feed.map((x, i) => el('p', { class: i === feed.length - 1 ? 'new' : '' }, x)));

    // ---- Me ----
    v.me.classList.toggle('turn', myTurn);
    const myCards = mine && mine.hand === s.hand && myPlayer?.dealt ? mine.cards : [];
    patch(v.hand, `${s.hand}:${myCards.join()}:${myPlayer?.best?.join() ?? ''}:${!!myPlayer?.won}`, () =>
      myCards.map((c, i) => faceUp(cardNode(c, myPlayer?.best?.includes(c) ? (myPlayer.won ? 'big best' : 'big kept') : 'big'), `m:${c}`, i)),
    );
    v.myName.textContent = myPlayer ? myPlayer.name : t('poker.watching');
    v.myLife.hidden = !myPlayer;
    if (myPlayer) setLife(v.myLife, myPlayer.life);
    v.myStatus.textContent = myPlayer ? statusText(myPlayer, s) : '';
    const playing = !!myPlayer && inHand(myPlayer);
    v.actions.hidden = !playing;
    v.moves.hidden = !playing;
    if (playing && myTurn && autoHand === s.hand && s.options) {
      const call = s.options.call > 0;
      setTimeout(() => state === s && send({ t: 'act', a: call ? 'call' : 'check' }), 500);
    }
    if (playing) {
      renderActions(v.actions, s, myTurn, lang);
      renderMoves(v.moves, s, myPlayer!, myTurn, lang);
    }
    motion(v, s);
    tick();
  }

  // ---- LH4: motion and sound. What changed since the last state moves: the cards are dealt from the middle, life
  // flies from a seat into the flask, the middle flies to the winners; each has its sound. All of it is skipped under
  // "reduce motion" (the sounds stay). Ghosts are absolutely placed in `.pk` in its own (unscaled) pixels. ----
  const SFX = { deal: 'place', chip: 'snackServe', fold: 'guessOther', street: 'hint', move: 'locked' } as const satisfies Record<string, SoundId>;
  let seen: { hand: number; board: number; phase: string; last: string; bets: Map<string, number>; folded: Set<string>; dealt: number; mine: number } = {
    hand: -1, board: 0, phase: '', last: '', bets: new Map(), folded: new Set(), dealt: -1, mine: -1,
  };
  const moving = () => !reducedMotion() && typeof root.animate === 'function';
  /** A node's box in `.pk`'s own pixels (the stage may scale the game). */
  function boxOf(node: Element): { x: number; y: number; w: number; h: number } {
    const r = node.getBoundingClientRect();
    const o = root.getBoundingClientRect();
    const k = root.offsetWidth ? o.width / root.offsetWidth : 1;
    return { x: (r.left - o.left) / k + r.width / k / 2, y: (r.top - o.top) / k + r.height / k / 2, w: r.width / k, h: r.height / k };
  }
  /** A little "♥ 12" flying from one place to another. */
  function fly(from: Element, to: Element, text: string, delay = 0, cls = ''): void {
    if (!moving() || !from.isConnected || !to.isConnected) return;
    const a = boxOf(from);
    const b = boxOf(to);
    const chip = el('span', { class: `pk-fly${cls ? ` ${cls}` : ''}`, 'aria-hidden': 'true' }, text);
    chip.style.left = `${a.x}px`;
    chip.style.top = `${a.y}px`;
    root.append(chip);
    const move = `translate(calc(-50% + ${(b.x - a.x).toFixed(1)}px), calc(-50% + ${(b.y - a.y).toFixed(1)}px))`;
    const run = chip.animate(
      [
        { transform: 'translate(-50%, -50%) scale(0.5)', opacity: 0 },
        { transform: 'translate(-50%, -50%) scale(1.1)', opacity: 1, offset: 0.18 },
        { transform: `${move} scale(0.8)`, opacity: 0.95, offset: 0.9 },
        { transform: `${move} scale(0.6)`, opacity: 0 },
      ],
      { duration: 640, delay, easing: 'cubic-bezier(.3,.6,.25,1)', fill: 'backwards' },
    );
    run.onfinish = () => chip.remove();
    run.oncancel = () => chip.remove();
  }
  /** A card slides in from the middle, turning as it lands (a deal). */
  function dealIn(card: Element, from: Element, delay: number): void {
    if (!moving() || !(card instanceof HTMLElement)) return;
    const a = boxOf(from);
    const b = boxOf(card);
    card.animate(
      [
        { transform: `translate(${(a.x - b.x).toFixed(1)}px, ${(a.y - b.y).toFixed(1)}px) rotate(-14deg) scale(0.5)`, opacity: 0 },
        { transform: 'translate(0, 0) rotate(0) scale(1)', opacity: 1 },
      ],
      { duration: 380, delay, easing: 'cubic-bezier(.2,.75,.25,1)', fill: 'backwards' },
    );
  }
  function shake(node: Element): void {
    if (!moving() || !(node instanceof HTMLElement)) return;
    node.animate([{ translate: '0 0' }, { translate: '-5px 0' }, { translate: '5px 0' }, { translate: '-3px 0' }, { translate: '0 0' }], { duration: 360, easing: 'ease-out' });
  }

  function motion(v: TableView, s: State): void {
    const seatOf = (id: string): Element | null => (id === me ? v.myLife : (v.seat.get(id)?.life ?? null));
    const sameHand = seen.hand === s.hand;
    // The deal: rivals' backs, one seat after the other, from the flask.
    if (s.phase === 'preflop' && seen.dealt !== s.hand) {
      seen.dealt = s.hand;
      let n = 0;
      for (const p of s.players) {
        if (p.id === me || !p.dealt) continue;
        const cards = v.seat.get(p.id)?.cards.children ?? [];
        for (const c of Array.from(cards)) dealIn(c, v.flask, 60 * n++);
      }
      playSound(SFX.deal);
    }
    // My two cards (they come in their own message, maybe after the state).
    if (mine && mine.hand === s.hand && seen.mine !== s.hand && v.hand.children.length) {
      seen.mine = s.hand;
      Array.from(v.hand.children).forEach((c, i) => dealIn(c, v.flask, 120 + 110 * i));
    }
    // A new street: the board's cards flip on their own (`faceUp`); here its sound.
    if (sameHand && s.board.length > seen.board && s.phase !== 'showdown') playSound(SFX.street);
    // Life going into the middle: a call, a raise, the blinds.
    const street = sameHand && s.board.length === seen.board;
    let chips = 0;
    for (const p of s.players) {
      const before = street ? (seen.bets.get(p.id) ?? 0) : 0;
      if (p.bet > before && !(sameHand && s.phase === 'showdown')) {
        const from = seatOf(p.id);
        if (from) fly(from, v.flask, `♥ ${p.bet - before}`, 70 * chips++);
      }
      if (sameHand && p.folded && !seen.folded.has(p.id)) playSound(SFX.fold);
    }
    if (chips) playSound(SFX.chip);
    // A special move: its sound, the target shakes (disqualified) or is looked at (peek).
    const lastKey = JSON.stringify(s.last);
    if (s.last?.e === 'move' && lastKey !== seen.last) {
      playSound(SFX.move);
      if (s.last.target) shake(s.last.target === me ? v.me : (v.seat.get(s.last.target)?.root ?? v.me));
    }
    // The showdown: the middle flies to the winners.
    if (s.phase === 'showdown' && seen.phase !== 'showdown') {
      s.players.filter((p) => (p.won ?? 0) > 0).forEach((p, i) => {
        const to = seatOf(p.id);
        if (to) fly(v.flask, to, `♥ ${p.won}`, 250 + 120 * i, 'win');
      });
    }
    seen = {
      ...seen,
      hand: s.hand,
      board: s.board.length,
      phase: s.phase,
      last: lastKey,
      bets: new Map(s.players.map((p) => [p.id, p.bet])),
      folded: new Set(s.players.filter((p) => p.folded || p.dq).map((p) => p.id)),
    };
  }

  /** The feed's last lines: what each player did, and each new street with its cards (LH4: a repeated "Sam checked"
   * on another street was dropped, and the streets never showed). Returns the newest event's line. */
  let feedKey = '';
  let feedHand = -1;
  let feedBoard = 0;
  function noteFeed(s: State): string {
    const push = (x: string) => {
      feed.push(x);
      if (feed.length > 4) feed.shift();
    };
    if (s.hand !== feedHand) {
      feedHand = s.hand;
      feedBoard = 0;
      feed.length = 0;
    }
    if (s.board.length > feedBoard && s.phase !== 'showdown') {
      const street = s.board.length === 3 ? 'flop' : s.board.length === 4 ? 'turn' : 'river';
      push(`${t(`poker.street.${street}`)}: ${s.board.slice(feedBoard).map(cardText).join(' ')}`);
    }
    feedBoard = s.board.length;
    const line = describe(s);
    const key = `${s.hand}:${s.board.length}:${JSON.stringify(s.last)}`;
    if (line && key !== feedKey) push(line);
    feedKey = key;
    return line;
  }

  /** On top, always: whose turn (or the result), the street, the seconds left and the timer bar. */
  function renderStatus(node: HTMLElement, s: State, myTurn: boolean, lang: string): void {
    const who = s.players.find((p) => p.id === s.toAct);
    const text = s.phase === 'showdown' ? result(s) : myTurn ? t('poker.turn.mine') : who ? t('poker.turn.other', { name: who.name }) : '';
    node.className = `pk-status${myTurn ? ' mine' : ''}${s.phase === 'showdown' ? ' result' : ''}`;
    patch(node, `${lang}:${text}:${s.phase}:${who && s.phase !== 'showdown' ? JSON.stringify(who.avatar) : ''}`, () => [
      who && s.phase !== 'showdown' ? avatarNode(who.avatar, 'pk-avatar') : el('span', { class: 'pk-status-icon', 'aria-hidden': 'true' }, '♥'),
      el('b', { class: 'pk-status-text' }, text),
      el('span', { class: 'pk-street' }, t(`poker.street.${s.phase}`)),
      el('span', { id: 'pk-secs', class: 'pk-secs' }),
      el('span', { class: 'pk-timer', 'aria-hidden': 'true' }, el('i', { id: 'pk-time' })),
    ]);
  }

  /** The hand's result in one line (who took how much from the middle, with which hand). */
  function result(s: State): string {
    const winners = s.players.filter((p) => (p.won ?? 0) > 0);
    if (!winners.length) return '';
    const shown = s.players.some((p) => p.cards);
    if (winners.length > 1) return t('poker.result.split', { names: winners.map((p) => p.name).join(', ') });
    const w = winners[0]!;
    // LH4: "+8" was read as the change in life; it is what came from the middle (the seats show the change).
    return shown && w.hand ? say('resultWin', { name: w.name, n: w.won ?? 0, hand: t(`poker.hands.${w.hand}`) }) : say('resultFold', { name: w.name, n: w.won ?? 0 });
  }

  // The announcement in the middle of the table: stays 2.4 s, the newest replaces the last.
  // GP3: the games' shared hint style (`hint.ts`); a hand's result in gold.
  const toast = el('div', { class: 'pk-toast' });
  const hint = gameHint(toast);
  function announce(text: string, kind: string): void {
    hint.show(text, kind === 'result' ? 3000 : 2400, kind === 'result' ? 'good' : 'plain');
  }

  function helpButton(): HTMLElement {
    // GP4: "How to play" is the tables' picture cards (the "?" in the window's head); this one is the reference of hands and moves.
    const b = el('button', { type: 'button', class: 'pk-help', title: t('poker.ref'), 'aria-label': t('poker.ref') }, '♠');
    b.addEventListener('click', () => {
      howto = 0;
      render();
    });
    return b;
  }

  /** "How to play": four short steps, each fits on one screen. */
  function renderHowto(): void {
    const step = howto ?? 0;
    const pages: (() => HTMLElement[])[] = [
      () => [el('p', {}, t('poker.howto.goal')), el('p', {}, t('poker.howto.blinds'))],
      () => [
        el('p', {}, t('poker.howto.hand')),
        el(
          'ul',
          { class: 'pk-howto-acts' },
          ...(['check', 'call', 'raise', 'fold'] as const).map((a) => el('li', {}, el('b', {}, t(`poker.howto.act.${a}`)), el('span', {}, t(`poker.howto.act.${a}.d`)))),
        ),
      ],
      () => [
        el('p', {}, t('poker.howto.ranks')),
        el(
          'ol',
          { class: 'pk-howto-ranks' },
          ...(['five', 'straightFlush', 'quads', 'fullHouse', 'flush', 'straight', 'trips', 'twoPair', 'pair', 'high'] as const).map((h) =>
            el('li', { class: h === 'five' ? 'joker-only' : '' }, el('b', {}, t(`poker.hands.${h}`)), el('span', {}, t(`poker.howto.rank.${h}`))),
          ),
        ),
      ],
      () => [
        el('p', {}, t('poker.howto.moves')),
        el(
          'ul',
          { class: 'pk-moves-help' },
          ...POKER_MOVES.map((m) => el('li', {}, el('span', { 'aria-hidden': 'true' }, MOVE_ICON[m]), el('b', {}, moveName(m)), el('small', {}, MOVE_COST[m] ? t('poker.cost', { n: MOVE_COST[m] }) : t('poker.costFree')), el('span', {}, t(`poker.moveText.${m}`)))),
        ),
      ],
    ];
    const back = el('button', { type: 'button', class: 'btn' }, t('poker.howto.back'));
    back.disabled = step === 0;
    back.addEventListener('click', () => {
      howto = Math.max(0, step - 1);
      render();
    });
    const last = step === pages.length - 1;
    const next = el('button', { type: 'button', class: 'btn primary' }, t(last ? 'poker.howto.done' : 'poker.howto.next'));
    next.addEventListener('click', () => {
      howto = last ? null : step + 1;
      render();
    });
    const close = el('button', { type: 'button', class: 'pk-howto-close', 'aria-label': t('poker.howto.done') }, '✕');
    close.addEventListener('click', () => {
      howto = null;
      render();
    });
    root.replaceChildren(
      el(
        'div',
        { class: 'pk-howto' },
        close,
        el('h3', {}, `${t('poker.howto')} · ${step + 1}/${pages.length}`),
        el('h4', {}, t((['poker.howto.t1', 'poker.howto.t2', 'poker.howto.t3', 'poker.howto.t4'] as const)[step]!)),
        ...pages[step]!(),
        el('div', { class: 'pk-howto-nav' }, back, el('span', { class: 'pk-howto-dots' }, ...pages.map((_, i) => el('i', { class: i === step ? 'on' : '' }))), next),
      ),
      toast,
    );
  }

  /** The cards of the winning five glow at the showdown. */
  function winningCard(s: State, card: Card): boolean {
    return s.phase === 'showdown' && s.players.some((p) => p.won && p.best?.includes(card));
  }

  function statusText(p: PokerPlayer, s: State): string {
    if (p.out) return t('poker.status.out');
    if (s.phase === 'showdown') {
      const parts: string[] = [];
      if (p.hand) parts.push(t(`poker.hands.${p.hand}`));
      // LH4: the change in life over the hand (+4, −12); an old server sends only what was won.
      if (p.net !== undefined && p.net !== 0) parts.push(p.net > 0 ? `+${p.net}` : `−${-p.net}`);
      else if (p.net === undefined && p.won) parts.push(`+${p.won}`);
      if (p.shielded) parts.push(`🛡️ +${p.shielded}`);
      return parts.join(' · ');
    }
    if (p.dq) return t('poker.status.dq');
    if (p.folded) return t('poker.status.folded');
    const parts: string[] = [];
    if (p.allIn) parts.push(t('poker.status.allIn'));
    if (p.bet > 0) parts.push(t('poker.status.bet', { n: p.bet }));
    if (p.shield) parts.push('🛡️');
    if (!p.online) parts.push(t('games.offline'));
    return parts.join(' · ');
  }

  /** My buttons: rebuilt only when the choice changes (LH4: a rival's move no longer ends a drag of the slider). */
  function renderActions(row: HTMLElement, s: State, myTurn: boolean, lang: string): void {
    const o = myTurn ? s.options : undefined;
    const key = o ? `${lang}:${s.hand}:${s.phase}:${JSON.stringify(o)}:${s.currentBet}:${s.pot}` : `${lang}:wait:${s.toAct ? nameOf(s.toAct) : ''}`;
    if (patched.get(row) === key) return;
    patched.set(row, key);
    row.replaceChildren();
    row.classList.remove('amounts-open');
    if (!o) {
      row.append(el('p', { class: 'muted small' }, s.toAct ? t('poker.waitingFor', { name: nameOf(s.toAct) }) : ''));
      return;
    }
    const fold = el('button', { type: 'button', class: 'btn pk-fold' }, t('poker.fold'));
    fold.addEventListener('click', () => send({ t: 'act', a: 'fold' }));
    const call = el('button', { type: 'button', class: 'btn primary' }, o.call > 0 ? t('poker.call', { n: o.call }) : t('poker.check'));
    call.addEventListener('click', () => send({ t: 'act', a: o.call > 0 ? 'call' : 'check' }));
    row.append(fold, call);
    if (o.maxTo > s.currentBet) {
      const min = Math.min(o.minTo, o.maxTo);
      raiseTo = Math.min(o.maxTo, Math.max(min, raiseTo));
      const amount = el('b', { class: 'pk-raise-amount' }, String(raiseTo));
      const slider = el('input', { type: 'range', min: String(min), max: String(o.maxTo), step: '1', value: String(raiseTo), 'aria-label': t('poker.raiseTo') }) as HTMLInputElement;
      const show = () => {
        amount.textContent = String(raiseTo);
        raise.textContent = raiseTo >= o.maxTo ? t('poker.allIn') : t('poker.raise', { n: raiseTo });
      };
      slider.addEventListener('input', () => {
        raiseTo = Number(slider.value);
        show();
      });
      const quick = (label: string, value: number) => {
        const b = el('button', { type: 'button', class: 'game-chip' }, label);
        b.addEventListener('click', () => {
          raiseTo = Math.min(o.maxTo, Math.max(min, value));
          slider.value = String(raiseTo);
          show();
        });
        return b;
      };
      const raise = el('button', { type: 'button', class: 'btn pk-raise' }, raiseTo >= o.maxTo ? t('poker.allIn') : t('poker.raise', { n: raiseTo }));
      raise.addEventListener('click', () => {
        amountsOpen = false;
        send({ t: 'act', a: 'raise', to: raiseTo });
      });
      // PH2: on a phone's Games tab the amounts (quick chips + slider) open above the buttons from ± (poker.css);
      // elsewhere `.pk-amounts` is `display: contents` and ± is hidden, so nothing changes there.
      const amountsToggle = el('button', { type: 'button', class: 'btn pk-amount-open', 'aria-label': t('poker.raiseTo'), 'aria-expanded': String(amountsOpen) }, '±');
      amountsToggle.addEventListener('click', () => {
        amountsOpen = !amountsOpen;
        row.classList.toggle('amounts-open', amountsOpen);
        amountsToggle.setAttribute('aria-expanded', String(amountsOpen));
      });
      row.classList.toggle('amounts-open', amountsOpen);
      row.append(
        amountsToggle,
        el(
          'div',
          { class: 'pk-raise-box' },
          el(
            'div',
            { class: 'pk-amounts' },
            el('div', { class: 'pk-quick' }, quick(t('poker.min'), min), quick(t('poker.halfPot'), s.currentBet + Math.ceil(s.pot / 2)), quick(t('poker.potSize'), s.currentBet + s.pot), quick(t('poker.allIn'), o.maxTo)),
            el('label', { class: 'pk-slider' }, slider, amount),
          ),
          raise,
        ),
      );
    }
  }

  function renderMoves(box: HTMLElement, s: State, p: PokerPlayer, myTurn: boolean, lang: string): void {
    const inHandCount = s.players.filter((x) => x.dealt && !x.folded && !x.dq && !x.out).length;
    const key = `${lang}:${arming}:${p.used.join()}:${p.life}:${myTurn}:${inHandCount}:${p.shield}`;
    if (patched.get(box) === key) return;
    patched.set(box, key);
    box.replaceChildren();
    box.append(el('span', { class: 'pk-moves-label' }, arming ? t('poker.pickTarget', { move: moveName(arming) }) : t('poker.moves')));
    for (const m of POKER_MOVES) {
      const used = p.used.includes(m);
      const cost = MOVE_COST[m];
      const why = used
        ? t('poker.used')
        : cost > 0 && p.life <= cost
          ? t('poker.noLife')
          : m === 'free' && !myTurn
            ? t('poker.onYourTurn')
            : m === 'dq' && inHandCount < 3
              ? t('poker.needThree')
              : m === 'shield' && p.shield
                ? t('poker.used')
                : '';
      const b = el(
        'button',
        { type: 'button', class: `pk-move${arming === m ? ' armed' : ''}`, title: `${moveName(m)} · ${t(`poker.moveText.${m}`)}${why ? ` (${why})` : ''}` },
        el('span', { class: 'pk-move-icon', 'aria-hidden': 'true' }, MOVE_ICON[m]),
        el('span', { class: 'pk-move-name' }, moveName(m)),
        el('small', {}, cost > 0 ? t('poker.cost', { n: cost }) : t('poker.costFree')),
      );
      b.disabled = why !== '';
      b.addEventListener('click', () => {
        if (TARGETED.includes(m)) {
          arming = arming === m ? null : m;
          render();
        } else useMove(m);
      });
      box.append(b);
    }
  }

  function useMove(m: PokerMove, target?: string): void {
    arming = null;
    send({ t: 'move', m, ...(target ? { target } : {}) });
    render();
  }

  function renderLobby(s: State, myPlayer: PokerPlayer | undefined): void {
    const host = s.players.find((p) => p.id === s.host);
    const online = s.players.filter((p) => p.online).length;
    const intro: HTMLElement[] = [];
    if (s.phase === 'over') {
      const winner = s.players.find((p) => p.id === s.winner);
      intro.push(el('h3', {}, winner ? t('poker.winner', { name: winner.name }) : t('games.over')));
      if (winner) {
        const bar = lifeBar();
        setLife(bar, winner.life);
        intro.push(el('div', { class: 'pk-champion' }, avatarNode(winner.avatar, 'pk-champion-avatar'), bar));
      }
    } else intro.push(el('h3', {}, t('games.poker.title')), el('p', { class: 'pk-rules' }, t('poker.rules')));
    // QA3 (one lobby look): the same faces row as Quiz / Draw & Guess: the host's crown, "(you)", an empty chair.
    intro.push(lobbyPlayers(s.players, me, s.host));
    const setup: HTMLElement[] = [
      settingsPanel(
        [
          {
            label: t('poker.deck'),
            value: s.jokers ? 'j' : 'n',
            choices: [
              { value: 'n', label: t('poker.noJokers') },
              { value: 'j', label: t('poker.withJokers') },
            ],
            pick: (v) => send({ t: 'settings', jokers: v === 'j' }),
          },
        ],
        s.host === me || !host ? null : host.name,
      ),
    ];
    if (!myPlayer && s.players.length < POKER_MAX_PLAYERS) {
      const sit = el('button', { type: 'button', class: 'btn' }, t('games.sit'));
      sit.addEventListener('click', () => send({ t: 'sit' }));
      setup.push(sit);
    }
    const go = el('button', { type: 'button', class: 'btn primary' }, t(s.phase === 'over' ? 'games.again' : 'draw.start'));
    // Only the host starts (the server checks too).
    go.disabled = online < 2 || (!!host && s.host !== me);
    go.addEventListener('click', () => send({ t: 'start' }));
    setup.push(go, el('p', { class: 'muted small' }, online < 2 ? t('draw.needTwo') : t('poker.seats', { n: s.players.length, max: POKER_MAX_PLAYERS })));
    root.replaceChildren(el('div', { class: 'pk-lobby lobby-card' }, ...lobbySplit(intro, setup)), toast);
  }

  function tick(): void {
    const s = state;
    const bar = root.querySelector<HTMLElement>('#pk-time');
    const secsBox = root.querySelector<HTMLElement>('#pk-secs');
    if (!s || !bar) return;
    if (s.endsAt === null) {
      bar.style.width = '0%';
      if (secsBox) secsBox.textContent = '';
      return;
    }
    const left = Math.max(0, s.endsAt - (Date.now() + offset));
    const total = Math.max(1000, clock.endsAt - clock.from);
    bar.style.width = `${Math.min(100, (left / total) * 100)}%`;
    if (secsBox) secsBox.textContent = s.phase === 'showdown' ? '' : t('poker.secs', { n: Math.ceil(left / 1000) });
    const mineTurn = s.toAct === me && s.phase !== 'showdown';
    bar.classList.toggle('mine', mineTurn);
    bar.classList.toggle('low', mineTurn && left < 8000);
    const secs = Math.ceil(left / 1000);
    if (mineTurn && secs >= 1 && secs <= 5 && secs !== lastTick) playSound('tick');
    lastTick = mineTurn && secs <= 5 ? secs : 0;
  }
  const ticker = window.setInterval(tick, 250);

  // ---- Connection ----
  let ws: SwmSocket | null = null;
  let stopped = false;
  let pingAt = 0;
  // GHOST: the Test Lab's "go silent" keeps this page quiet, as a dead connection would be.
  const quiet = silence();
  function send(message: PokerClientMessage): void {
    if (quiet.on) return;
    if (ws?.readyState === OPEN) ws.send(JSON.stringify(message));
  }
  function sendKeepalive(): void {
    if (!quiet.on && ws?.readyState === OPEN) ws.send(KEEPALIVE);
  }
  function connect(): void {
    if (stopped) return;
    const socket = openSocket(`${location.origin.replace(/^http/, 'ws')}/api/poker/${encodeURIComponent(gameId)}/ws`);
    ws = socket;
    link.attach(socket);
    socket.addEventListener('open', () => socket.send(JSON.stringify({ t: 'hello', v: POKER_PROTOCOL_VERSION, name, avatar, cid: clientId() } satisfies PokerClientMessage)));
    socket.addEventListener('message', (event) => {
      if (event.data === KEEPALIVE_ACK) return;
      let m: PokerServerMessage;
      try {
        m = JSON.parse(String(event.data)) as PokerServerMessage;
      } catch {
        return;
      }
      switch (m.t) {
        case 'welcome':
          me = m.you;
          offset = m.now - Date.now();
          break;
        case 'pong':
          offset = m.now + (performance.now() - pingAt) / 2 - Date.now();
          break;
        case 'state':
          if (state?.toAct !== m.toAct) raiseTo = 0;
          state = m;
          render();
          break;
        case 'cards':
          mine = { hand: m.hand, cards: m.cards };
          render();
          break;
        case 'peek':
          peeks.seen[m.target] = m.card;
          render();
          break;
        case 'error':
          if (m.code === 'version' || m.code === 'full') {
            if (m.code === 'version') stopped = true;
            root.prepend(el('p', { class: 'pk-note' }, t(m.code === 'version' ? 'games.version' : 'games.full')));
          } else if (m.code !== 'rate' && m.code !== 'bad') {
            root.prepend(el('p', { class: 'pk-note' }, t(`poker.err.${m.code}`)));
            setTimeout(() => root.querySelector('.pk-note')?.remove(), 3000);
          }
          break;
      }
    });
    socket.addEventListener('close', () => {
      if (ws !== socket || stopped) return;
      setTimeout(connect, 1500);
    });
  }
  // GD1: a line that died without a close event is found and replaced (`link-watch.ts`).
  const link = watchLink('poker', () => ws, quiet, () => {
    const old = ws;
    ws = null;
    old?.close();
    connect();
  });
  connect();
  // QUOTA1a: the free keepalive (answered without waking the table), a real ping once a minute (the clock offset).
  const ping = window.setInterval(
    keepaliveTicks(GAME_CLOCK_EVERY, sendKeepalive, () => {
      pingAt = performance.now();
      send({ t: 'ping' });
    }),
    GAME_KEEPALIVE_MS,
  );
  const close = () => {
    stopped = true;
    ws?.close();
  };
  const onLang = () => {
    view = null;
    render();
  };
  addEventListener('pagehide', close);
  addEventListener('langchange', onLang);
  // Test Lab (GHOST): this tab goes quiet, as a dead connection would.
  const offLab = debugHooks.register('table.poker', () => ({
    commands: [
      quiet.command('poker', { en: 'Last Heart', tr: 'Son Kalp' }),
      { id: 'poker.end', title: { en: 'Last Heart: end the game, I win', tr: 'Son Kalp: oyunu bitir, ben kazanayım' }, help: { en: 'Local lab server only: everyone else runs out of life and the result card shows.', tr: 'Sadece yerel test sunucusunda: diğer herkesin canı biter ve sonuç kartı çıkar.' }, tab: 'games', available: () => !labServerHere() ? LOCAL_ONLY : (!!state && state.phase !== 'lobby' && state.phase !== 'over') || { en: 'only while a game is going: start one first', tr: 'sadece oyun sürerken: önce bir oyun başlat' }, where: { en: 'at a Last Heart table', tr: 'Son Kalp masasında' }, run: () => send({ t: 'lab', op: 'end' }) },
      // LH2: a full table (me and five 🤖 friends) in play, to see the compact layout on a sideways tablet.
      {
        id: 'poker.compact',
        title: { en: 'Last Heart: five 🤖 friends sit, the hand starts', tr: 'Son Kalp: beş 🤖 arkadaş otursun, el başlasın' },
        help: { en: 'Five pretend players join this Last Heart table (six with me) and the first hand starts: the busiest table, for the compact layout in the video\'s place on a sideways tablet. Undo: they leave.', tr: 'Bu Son Kalp masasına beş sahte oyuncu oturur (benimle altı) ve ilk el başlar: en kalabalık masa, yan çevrilmiş tablette videonun yerindeki sıkı düzen için. Geri al: kalkarlar.' },
        tab: 'games',
        where: { en: 'at a Last Heart table, before it starts', tr: 'başlamadan önce Son Kalp masasında' },
        available: () => (!!state && state.phase === 'lobby') || { en: 'only before the game starts', tr: 'sadece oyun başlamadan önce' },
        run: async () => {
          const m = await import('./lab-table-friend.ts');
          const names: string[] = [];
          for (let i = (state?.players.length ?? 1); i < 6; i++) names.push(m.sitFriend('poker', gameId));
          for (let i = 0; i < 40 && (state?.players.length ?? 0) < 6; i++) await new Promise((r) => setTimeout(r, 200));
          send({ t: 'start' });
          return names.join(', ');
        },
        undo: async () => (await import('./lab-table-friend.ts')).leaveFriends(),
      },
      // LH4: to the showdown in one press (the result line, the net on each seat, the winning cards).
      {
        id: 'poker.showdown',
        title: { en: 'Last Heart: play my turns to the showdown', tr: 'Son Kalp: elin sonuna kadar benim yerime oyna' },
        help: { en: 'On each of my turns this hand I check (or call): with 🤖 friends at the table the hand reaches its showdown in a few seconds.', tr: 'Bu eldeki her sıramda bekler (ya da görürüm): masada 🤖 arkadaşlar varsa el birkaç saniyede sonuca gelir.' },
        tab: 'games',
        where: { en: 'at a Last Heart table, during a hand', tr: 'Son Kalp masasında, bir el sürerken' },
        available: () => (!!state && ['preflop', 'flop', 'turn', 'river'].includes(state.phase)) || { en: 'only during a hand', tr: 'sadece bir el sürerken' },
        run: () => {
          autoHand = state?.hand ?? -1;
          render();
        },
      },
      { id: 'poker.referee', title: { en: 'Last Heart: Stub reacts', tr: 'Son Kalp: Stub tepki versin' }, help: { en: 'Stub says one of his showdown lines in the corner of the table.', tr: 'Stub masanın köşesinde el sonunda söylediklerinden birini söyler.' }, tab: 'games', where: { en: 'at a Last Heart table', tr: 'Son Kalp masasında' }, run: () => ref.say(t('poker.say.pot'), 'gasp') },
    ],
  }));
  // GP4: the same "How to play" picture cards as every table (first time, and the "?" in the window's head).
  const how = tableHowTo(app, 'poker:howSeen', () => [
    { art: poker1Art, title: t('poker.how1'), line: t('poker.how1Line') },
    { art: poker2Art, title: t('poker.how2'), line: t('poker.how2Line') },
    { art: poker3Art, title: t('poker.how3'), line: t('poker.how3Line') },
  ]);
  return () => {
    offLab();
    ref.destroy();
    how.destroy();
    setGameLive(false);
    close();
    clearInterval(ticker);
    clearInterval(ping);
    link.stop();
    hint.hide();
    removeEventListener('pagehide', close);
    removeEventListener('langchange', onLang);
  };
}
