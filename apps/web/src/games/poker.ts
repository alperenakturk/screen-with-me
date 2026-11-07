// Last Heart (life poker) in the room (game window). Not a casino table: the pot is a glass flask filling with red
// life, every player has a game-style life bar, special moves are cards with their cost. My two cards come only to me
// (`cards`); a peek shows one card of a rival on their seat (for me only, this hand). A status strip on top always
// says whose turn it is and how many seconds are left; moves and hand results are announced to everyone in the
// middle of the table; "How to play" walks through the game in four short steps.

import { OPEN, openSocket, type SwmSocket } from '@swm/shared/socket';
import { gameHint } from './hint.ts';
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
import { setGameLive } from './live.ts';
import { clientId } from '../storage.ts';
import { avatarNode } from '../ui/avatar.ts';
import { settingsPanel } from './ui.ts';

type State = Extract<PokerServerMessage, { t: 'state' }>;
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

/** The life bar: a heart and a bar filling up to 100 (more than 100 after winning: the bar shows the extra glow). */
function lifeBar(life: number): HTMLElement {
  const bar = el('span', { class: `pk-life${life <= 20 ? ' low' : ''}`, role: 'img', 'aria-label': t('poker.life', { n: life }) });
  const fill = el('i');
  fill.style.width = `${Math.min(100, (life / POKER_START_LIFE) * 100)}%`;
  bar.append(el('span', { class: 'pk-heart', 'aria-hidden': 'true' }, '♥'), el('span', { class: 'pk-bar' }, fill), el('b', {}, `${life}`));
  if (life > POKER_START_LIFE) bar.classList.add('over');
  return bar;
}

/** The pot: a glass flask filled in proportion to all the life at the table. */
function flask(pot: number, total: number): HTMLElement {
  const level = total > 0 ? Math.min(1, pot / total) : 0;
  const box = el('div', { class: 'pk-flask', role: 'img', 'aria-label': t('poker.pot', { n: pot }) });
  box.innerHTML = `<svg viewBox="0 0 80 100" aria-hidden="true">
    <defs><clipPath id="pk-flask-clip"><path d="M30 6h20v26l22 46a12 12 0 0 1-11 17H19A12 12 0 0 1 8 78l22-46z"/></clipPath></defs>
    <g clip-path="url(#pk-flask-clip)"><rect class="pk-liquid" x="0" y="${(100 - 88 * level).toFixed(1)}" width="80" height="100"/></g>
    <path class="pk-glass" d="M30 6h20v26l22 46a12 12 0 0 1-11 17H19A12 12 0 0 1 8 78l22-46z"/>
    <path class="pk-neck" d="M26 6h28"/></svg>`;
  box.append(el('b', { class: 'pk-pot' }, String(pot)));
  return box;
}

export function mountPoker(app: HTMLElement, gameId: string, name: string, avatar: Avatar): () => void {
  const root = el('div', { class: 'pk' });
  app.replaceChildren(root);

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
      case 'timeout':
        return t('poker.ev.timeout', { name: nameOf(e.by) });
    }
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
    if (s.phase === 'showdown' && lastPhase !== 'showdown' && myPlayer?.dealt) playSound(myPlayer.won ? 'guessRight' : 'wrong');
    if (s.phase === 'over' && lastPhase !== 'over') playSound('podium');
    lastPhase = s.phase;
    const line = describe(s);
    if (line && feed[feed.length - 1] !== line) {
      feed.push(line);
      if (feed.length > 4) feed.shift();
    }
    // Big announcements everyone sees: special moves, raises and time-outs, then the hand's result.
    const big = s.phase === 'showdown' ? result(s) : s.last && (s.last.e === 'move' || s.last.e === 'timeout' || (s.last.e === 'act' && s.last.a === 'raise')) ? line : '';
    const bigKey = `${s.hand}:${s.phase}:${big}`;
    if (big && bigKey !== announced) announce(big, s.phase === 'showdown' ? 'result' : s.last?.e === 'move' ? 'move' : '');
    announced = big ? bigKey : announced;
    if (s.endsAt !== clock.endsAt) clock = { endsAt: s.endsAt ?? 0, from: Date.now() + offset };

    if (howto !== null) return renderHowto();
    if (s.phase === 'lobby' || s.phase === 'over') return renderLobby(s, myPlayer);
    const total = s.players.reduce((sum, p) => sum + p.life, 0) + s.pot;
    const rivals = s.players.filter((p) => p.id !== me);
    const inHand = (p: PokerPlayer) => p.dealt && !p.folded && !p.dq && !p.out;

    // ---- Rivals ----
    const seats = el(
      'div',
      { class: 'pk-seats' },
      ...rivals.map((p) => {
        const targetable = arming !== null && inHand(p) && myPlayer !== undefined && inHand(myPlayer);
        const seat = el(
          targetable ? 'button' : 'div',
          {
            class: `pk-seat${p.id === s.toAct ? ' turn' : ''}${p.folded || p.dq ? ' folded' : ''}${p.out ? ' out' : ''}${!p.online ? ' away' : ''}${targetable ? ' target' : ''}${p.won ? ' won' : ''}`,
            ...(targetable ? { type: 'button', 'aria-label': t('poker.pick', { name: p.name }) } : {}),
          },
          el('span', { class: 'pk-seat-top' }, avatarNode(p.avatar, 'pk-avatar'), el('b', { class: 'pk-name' }, p.name), p.id === s.dealer ? el('span', { class: 'pk-dealer', title: t('poker.dealer') }, 'D') : null),
          lifeBar(p.life),
          el(
            'span',
            { class: 'pk-seat-cards' },
            ...(p.cards
              ? p.cards.map((c) => cardNode(c, p.best?.includes(c) ? 'small best' : 'small'))
              : p.dealt && !p.folded && !p.dq
                ? [cardNode(peeks.seen[p.id] ?? null, 'small'), cardNode(null, 'small')]
                : []),
          ),
          el('span', { class: 'pk-seat-status' }, statusText(p, s)),
        );
        if (targetable) seat.addEventListener('click', () => useMove(arming!, p.id));
        return seat;
      }),
    );

    // ---- The middle: board, flask, what happened ----
    const board = el('div', { class: 'pk-board' }, ...Array.from({ length: 5 }, (_, i) => (s.board[i] ? cardNode(s.board[i]!, winningCard(s, s.board[i]!) ? 'best' : '') : el('span', { class: 'pk-card slot' }))));
    const middle = el(
      'div',
      { class: 'pk-middle' },
      flask(s.pot, total),
      el(
        'div',
        { class: 'pk-center' },
        el('div', { class: 'pk-info' }, t('poker.hand', { n: s.hand }), ' · ', t('poker.blinds', { a: s.blinds[0], b: s.blinds[1] }), s.jokers ? ` · ${t('poker.jokers')}` : '', helpButton()),
        board,
        el('div', { class: 'pk-feed', 'aria-live': 'polite' }, ...feed.map((x, i) => el('p', { class: i === feed.length - 1 ? 'new' : '' }, x))),
      ),
    );

    // ---- Me ----
    const myCards = mine && mine.hand === s.hand ? mine.cards : [];
    const meBox = el(
      'div',
      { class: `pk-me${myTurn ? ' turn' : ''}` },
      el(
        'div',
        { class: 'pk-me-top' },
        el('span', { class: 'pk-hand' }, ...(myCards.length && myPlayer?.dealt ? myCards.map((c) => cardNode(c, myPlayer.best?.includes(c) ? 'big best' : 'big')) : [])),
        el(
          'div',
          { class: 'pk-me-info' },
          el('b', {}, myPlayer ? myPlayer.name : t('poker.watching')),
          myPlayer ? lifeBar(myPlayer.life) : null,
          myPlayer ? el('span', { class: 'pk-seat-status' }, statusText(myPlayer, s)) : null,
        ),
      ),
    );
    if (myPlayer && inHand(myPlayer)) {
      meBox.append(actions(s, myTurn), moves(s, myPlayer, myTurn));
    }
    root.replaceChildren(statusStrip(s, myTurn), seats, middle, meBox, toast);
    tick();
  }

  /** On top, always: whose turn (or the result), the street, the seconds left and the timer bar. */
  function statusStrip(s: State, myTurn: boolean): HTMLElement {
    const who = s.players.find((p) => p.id === s.toAct);
    const text =
      s.phase === 'showdown' ? result(s) : myTurn ? t('poker.turn.mine') : who ? t('poker.turn.other', { name: who.name }) : '';
    return el(
      'div',
      { class: `pk-status${myTurn ? ' mine' : ''}${s.phase === 'showdown' ? ' result' : ''}`, role: 'status', 'aria-live': 'polite' },
      who && s.phase !== 'showdown' ? avatarNode(who.avatar, 'pk-avatar') : el('span', { class: 'pk-status-icon', 'aria-hidden': 'true' }, '♥'),
      el('b', { class: 'pk-status-text' }, text),
      el('span', { class: 'pk-street' }, t(`poker.street.${s.phase}`)),
      el('span', { id: 'pk-secs', class: 'pk-secs' }),
      el('span', { class: 'pk-timer', 'aria-hidden': 'true' }, el('i', { id: 'pk-time' })),
    );
  }

  /** The hand's result in one line (who took how much, with which hand). */
  function result(s: State): string {
    const winners = s.players.filter((p) => (p.won ?? 0) > 0);
    if (!winners.length) return '';
    const shown = s.players.some((p) => p.cards);
    if (winners.length > 1) return t('poker.result.split', { names: winners.map((p) => p.name).join(', ') });
    const w = winners[0]!;
    return shown && w.hand ? t('poker.result.win', { name: w.name, n: w.won ?? 0, hand: t(`poker.hands.${w.hand}`) }) : t('poker.result.fold', { name: w.name, n: w.won ?? 0 });
  }

  // The announcement in the middle of the table: stays 2.4 s, the newest replaces the last.
  // GP3: the games' shared hint style (`hint.ts`); a hand's result in gold.
  const toast = el('div', { class: 'pk-toast' });
  const hint = gameHint(toast);
  function announce(text: string, kind: string): void {
    hint.show(text, kind === 'result' ? 3000 : 2400, kind === 'result' ? 'good' : 'plain');
  }

  function helpButton(): HTMLElement {
    const b = el('button', { type: 'button', class: 'pk-help', title: t('poker.howto'), 'aria-label': t('poker.howto') }, '?');
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
      if (p.won) parts.push(`+${p.won}`);
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

  function actions(s: State, myTurn: boolean): HTMLElement {
    const o = s.options;
    const row = el('div', { class: 'pk-actions' });
    if (!myTurn || !o) {
      row.append(el('p', { class: 'muted small' }, s.toAct ? t('poker.waitingFor', { name: nameOf(s.toAct) }) : ''));
      return row;
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
      slider.addEventListener('input', () => {
        raiseTo = Number(slider.value);
        amount.textContent = String(raiseTo);
        raise.textContent = raiseTo >= o.maxTo ? t('poker.allIn') : t('poker.raise', { n: raiseTo });
      });
      const quick = (label: string, value: number) => {
        const b = el('button', { type: 'button', class: 'game-chip' }, label);
        b.addEventListener('click', () => {
          raiseTo = Math.min(o.maxTo, Math.max(min, value));
          render();
        });
        return b;
      };
      const raise = el('button', { type: 'button', class: 'btn pk-raise' }, raiseTo >= o.maxTo ? t('poker.allIn') : t('poker.raise', { n: raiseTo }));
      raise.addEventListener('click', () => send({ t: 'act', a: 'raise', to: raiseTo }));
      row.append(
        el(
          'div',
          { class: 'pk-raise-box' },
          el('div', { class: 'pk-quick' }, quick(t('poker.min'), min), quick(t('poker.halfPot'), s.currentBet + Math.ceil(s.pot / 2)), quick(t('poker.potSize'), s.currentBet + s.pot), quick(t('poker.allIn'), o.maxTo)),
          el('label', { class: 'pk-slider' }, slider, amount),
          raise,
        ),
      );
    }
    return row;
  }

  function moves(s: State, p: PokerPlayer, myTurn: boolean): HTMLElement {
    const inHandCount = s.players.filter((x) => x.dealt && !x.folded && !x.dq && !x.out).length;
    const box = el('div', { class: 'pk-moves' });
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
    return box;
  }

  function useMove(m: PokerMove, target?: string): void {
    arming = null;
    send({ t: 'move', m, ...(target ? { target } : {}) });
    render();
  }

  function renderLobby(s: State, myPlayer: PokerPlayer | undefined): void {
    const host = s.players.find((p) => p.id === s.host);
    const online = s.players.filter((p) => p.online).length;
    const parts: HTMLElement[] = [];
    if (s.phase === 'over') {
      const winner = s.players.find((p) => p.id === s.winner);
      parts.push(el('h3', {}, winner ? t('poker.winner', { name: winner.name }) : t('games.over')));
      if (winner) parts.push(el('div', { class: 'pk-champion' }, avatarNode(winner.avatar, 'pk-champion-avatar'), lifeBar(winner.life)));
    } else parts.push(el('h3', {}, t('games.poker.title')), el('p', { class: 'pk-rules' }, t('poker.rules')));
    const learn = el('button', { type: 'button', class: 'btn pk-learn' }, `❔ ${t('poker.howto')}`);
    learn.addEventListener('click', () => {
      howto = 0;
      render();
    });
    parts.push(
      learn,
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
      el('ul', { class: 'pk-lobby-seats' }, ...s.players.map((p) => el('li', { class: p.online ? '' : 'away' }, avatarNode(p.avatar, 'pk-avatar'), el('span', {}, p.id === me ? `${p.name} (${t('games.you')})` : p.name)))),
    );
    if (!myPlayer && s.players.length < POKER_MAX_PLAYERS) {
      const sit = el('button', { type: 'button', class: 'btn' }, t('games.sit'));
      sit.addEventListener('click', () => send({ t: 'sit' }));
      parts.push(sit);
    }
    const go = el('button', { type: 'button', class: 'btn primary' }, t(s.phase === 'over' ? 'games.again' : 'draw.start'));
    // Only the host starts (the server checks too).
    go.disabled = online < 2 || (!!host && s.host !== me);
    go.addEventListener('click', () => send({ t: 'start' }));
    parts.push(go, el('p', { class: 'muted small' }, online < 2 ? t('draw.needTwo') : t('poker.seats', { n: s.players.length, max: POKER_MAX_PLAYERS })));
    root.replaceChildren(el('div', { class: 'pk-lobby' }, ...parts), toast);
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
  function send(message: PokerClientMessage): void {
    if (ws?.readyState === OPEN) ws.send(JSON.stringify(message));
  }
  function connect(): void {
    if (stopped) return;
    const socket = openSocket(`${location.origin.replace(/^http/, 'ws')}/api/poker/${encodeURIComponent(gameId)}/ws`);
    ws = socket;
    socket.addEventListener('open', () => socket.send(JSON.stringify({ t: 'hello', v: POKER_PROTOCOL_VERSION, name, avatar, cid: clientId() } satisfies PokerClientMessage)));
    socket.addEventListener('message', (event) => {
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
  connect();
  const ping = window.setInterval(() => {
    pingAt = performance.now();
    send({ t: 'ping' });
  }, 15_000);
  const close = () => {
    stopped = true;
    ws?.close();
  };
  const onLang = () => render();
  addEventListener('pagehide', close);
  addEventListener('langchange', onLang);
  return () => {
    setGameLive(false);
    close();
    clearInterval(ticker);
    clearInterval(ping);
    hint.hide();
    removeEventListener('pagehide', close);
    removeEventListener('langchange', onLang);
  };
}
