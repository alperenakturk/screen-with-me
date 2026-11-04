// Two-player board games in the room's game window: tic-tac-toe, Four in a Row and, inside 🎲 Classics (P6, the owner's
// picks in `docs/internal/design/games/classics.md`), dama and chess (P7) from a game shelf. The first two people sit (X / O, red /
// yellow, white / black), later ones watch; when a seat is free, a watcher can sit, and a lone player can play against
// Glowbeam the bot (easy / medium; it plays on the server with the same rules). Glowbeam is also the referee: it says
// whose turn it is and cheers the winner. The server checks every move; this page only draws what it gets.

import './classics.css';
import { OPEN, openSocket, type SwmSocket } from '@swm/shared/socket';
import type { Mark } from '@swm/shared/games/board';
import { COLS, dropRow } from '@swm/shared/games/four';
import { legalMoves as damaMoves, mustCapture, type DamaState } from '@swm/shared/games/dama';
import { legalMoves as chessMoves, PROMOTIONS, type ChessState } from '@swm/shared/games/chess';
import { GAME_PROTOCOL_VERSION, type GameClientMessage, type GameKind, type GamePerson, type GameServerMessage } from '@swm/shared/games/protocol';
import type { Avatar } from '@swm/shared/protocol';
import { el } from '../dom.ts';
import { lang, t, translate } from '../i18n.ts';
import { clientId } from '../storage.ts';
import { avatarNode } from '../ui/avatar.ts';
import { playSound } from '../sound.ts';
import { setGameLive } from './live.ts';
import glowbeamArt from './art/snack-bar/glowbeam.svg?raw';

const MARKS: readonly [Mark, Mark] = ['X', 'O'];
type State = Extract<GameServerMessage, { t: 'state' }>;
/** The shelf (owner's pick 2 B): boards to play now, and the ones coming. */
const SHELF: readonly { kind: GameKind | 'tavla'; glyph: string; soon?: boolean }[] = [
  { kind: 'xox', glyph: '⭕' },
  { kind: 'four', glyph: '🔴' },
  { kind: 'dama', glyph: '⚪' },
  { kind: 'chess', glyph: '♞' },
  { kind: 'tavla', glyph: '🎲', soon: true },
];

/** Chess texts live in this chunk (the room page's i18n stays small). */
const TEXT = {
  en: {
    check: 'Check!',
    youCheck: 'Check! Save your king',
    promote: 'Turn your pawn into…',
    stalemate: 'Stalemate: a draw',
    fifty: 'Draw: 50 moves without a capture or a pawn move',
    repeat: 'Draw: the same position three times',
    material: 'Draw: nobody can checkmate any more',
    mate: 'Checkmate!',
    p: 'pawn',
    n: 'knight',
    b: 'bishop',
    r: 'rook',
    q: 'queen',
    k: 'king',
  },
  tr: {
    check: 'Şah!',
    youCheck: 'Şah! Şahını kurtar',
    promote: 'Piyonun ne olsun…',
    stalemate: 'Pat: berabere',
    fifty: 'Berabere: 50 hamledir taş alınmadı, piyon oynamadı',
    repeat: 'Berabere: aynı konum üç kez geldi',
    material: 'Berabere: artık kimse mat edemez',
    mate: 'Şah mat!',
    p: 'piyon',
    n: 'at',
    b: 'fil',
    r: 'kale',
    q: 'vezir',
    k: 'şah',
  },
} as const;
const tc = (key: keyof (typeof TEXT)['en']): string => (lang() === 'tr' ? TEXT.tr : TEXT.en)[key];
/** Chess pieces as text (the filled shapes for both sides, coloured by CSS; U+FE0E keeps them out of emoji style). */
const GLYPH: Record<string, string> = { p: '♟\uFE0E', n: '♞\uFE0E', b: '♝\uFE0E', r: '♜\uFE0E', q: '♛\uFE0E', k: '♚\uFE0E' };
const fromOf = (move: number) => Math.floor((move % 4096) / 64);
const toOf = (move: number) => move % 64;

let artId = 0;
/** Glowbeam, drawn small (our own art; ids made unique per copy). */
function glowbeam(cls: string): HTMLElement {
  const prefix = `gb${++artId}-`;
  const node = el('span', { class: cls, 'aria-hidden': 'true' });
  node.innerHTML = glowbeamArt.replace(/id="([^"]+)"/g, `id="${prefix}$1"`).replace(/url\(#([^)]+)\)/g, `url(#${prefix}$1)`);
  return node;
}

/** Mounts the game into `app`; the returned function closes the connection and timers. */
export function mountMatch(app: HTMLElement, tableKind: GameKind | 'classics', gameId: string, name: string, avatar: Avatar): () => void {
  const classics = tableKind === 'classics';
  /** The board on the table now (a Classics table can change it from its shelf). */
  let kind: GameKind = classics ? 'xox' : tableKind;
  app.innerHTML = `
    <div class="xox-page${classics ? ' classics' : ''}">
      <section class="xox-players">
        <div class="xox-player" id="seat-0"></div>
        <div class="xox-vs" id="xox-score"></div>
        <div class="xox-player" id="seat-1"></div>
      </section>
      <div class="cl-ref"><span class="cl-ref-slot"></span><p id="xox-status" class="xox-status" role="status" aria-live="polite"></p></div>
      <div class="xox-board-wrap">
        <div id="xox-board" class="xox-board" role="group" aria-label="${t('games.board')}"></div>
        <div id="xox-floats" class="xox-floats" aria-hidden="true"></div>
        <div class="cl-promo" role="group" hidden></div>
        <div class="cl-shelf" hidden></div>
      </div>
      <div class="xox-actions">
        <button id="xox-rematch" type="button" class="btn primary" data-i18n="games.rematch" hidden></button>
        <button id="xox-sit" type="button" class="btn primary" data-i18n="games.sit" hidden></button>
        <span class="cl-bot" hidden></span>
        <button id="cl-shelf-open" type="button" class="btn small-btn" hidden></button>
        <button id="xox-stand" type="button" class="btn small-btn" data-i18n="games.stand" hidden></button>
      </div>
      <section class="card xox-watchers">
        <h4 data-i18n="games.watchers"></h4>
        <ul id="xox-watchers"></ul>
      </section>
    </div>`;
  translate(app);

  const board = app.querySelector<HTMLElement>('#xox-board')!;
  const status = app.querySelector<HTMLElement>('#xox-status')!;
  const refSlot = app.querySelector<HTMLElement>('.cl-ref-slot')!;
  const referee = glowbeam('cl-ref-mascot');
  refSlot.replaceWith(referee);
  const shelf = app.querySelector<HTMLElement>('.cl-shelf')!;
  const shelfButton = app.querySelector<HTMLButtonElement>('#cl-shelf-open')!;
  const botBox = app.querySelector<HTMLElement>('.cl-bot')!;
  const promoBox = app.querySelector<HTMLElement>('.cl-promo')!;
  const rematchButton = app.querySelector<HTMLButtonElement>('#xox-rematch')!;
  const sitButton = app.querySelector<HTMLButtonElement>('#xox-sit')!;
  const standButton = app.querySelector<HTMLButtonElement>('#xox-stand')!;
  rematchButton.addEventListener('click', () => send({ t: 'rematch' }));
  standButton.addEventListener('click', () => send({ t: 'stand' }));
  sitButton.addEventListener('click', () => {
    const free = state?.seats.findIndex((s) => !s || !s.online || s.bot) ?? -1;
    if (free === 0 || free === 1) send({ t: 'sit', seat: free });
  });
  shelfButton.addEventListener('click', () => {
    shelfOpen = true;
    render();
  });

  // ---- The board's cells (built again when a Classics table changes its board) ----
  let cells: HTMLButtonElement[] = [];
  let built: GameKind | null = null;
  /** Dama / chess: the piece I picked to move. */
  let picked: number | null = null;
  /** Dama and chess share the 8 × 8 board. */
  const grid8 = () => kind === 'dama' || kind === 'chess';
  const four = () => kind === 'four';
  const colOf = (i: number) => i % COLS;
  // Card A11y (S2): a cell says where it is ("Row 1, column 2"), and what is in it (filled in on each state).
  const cellLabel = (i: number) =>
    kind === 'four' ? t('games.column', { n: colOf(i) + 1 }) : grid8() ? t('games.cell', { r: Math.floor(i / 8) + 1, c: (i % 8) + 1 }) : t('games.cell', { r: Math.floor(i / 3) + 1, c: (i % 3) + 1 });
  function build(): void {
    built = kind;
    picked = null;
    promoBox.hidden = true;
    // Dama and chess have their own 8 × 8 board and cells (never the XOX marks' styles).
    board.className = grid8() ? `dama-board${kind === 'chess' ? ' chess-board' : ''}` : `xox-board${kind === 'four' ? ' four-board' : ''}`;
    const size = kind === 'four' ? 42 : grid8() ? 64 : 9;
    cells = Array.from({ length: size }, (_, i) => {
      const cell = el('button', { type: 'button', class: grid8() ? 'dama-cell' : 'xox-cell', 'aria-label': cellLabel(i) });
      cell.addEventListener('click', () => press(i));
      if (kind === 'four') {
        cell.addEventListener('pointerenter', () => hoverCol(colOf(i)));
        cell.addEventListener('pointerleave', () => hoverCol(-1));
      }
      return cell;
    });
    board.replaceChildren(...cells);
    lastBoard = '';
  }
  function press(i: number): void {
    if (kind === 'xox') return send({ t: 'move', cell: i });
    if (kind === 'four') return send({ t: 'move', cell: colOf(i) });
    // Dama / chess: pick one of my pieces that can move, then one of its targets.
    const moves = myMoves();
    const choices = picked === null ? [] : moves.filter((m) => fromOf(m) === picked && toOf(m) === i);
    promoBox.hidden = true;
    if (choices.length > 1) return promote(choices);
    if (choices.length === 1) {
      send({ t: 'move', cell: choices[0]! });
      picked = null;
    } else picked = moves.some((m) => fromOf(m) === i) ? i : null;
    render();
  }
  /** Chess: a pawn on the last row; the player picks what it becomes. */
  function promote(choices: number[]): void {
    const mark = state ? MARKS[mySeat()] : 'X';
    promoBox.setAttribute('aria-label', tc('promote'));
    promoBox.replaceChildren(
      el('p', {}, tc('promote')),
      ...PROMOTIONS.map((kindOf, n) => {
        const move = choices.find((m) => Math.floor(m / 4096) === n);
        const b = el('button', { type: 'button', class: `cl-promo-piece piece-${mark}`, 'aria-label': tc(kindOf) }, GLYPH[kindOf]!);
        b.addEventListener('click', () => {
          promoBox.hidden = true;
          picked = null;
          if (move !== undefined) send({ t: 'move', cell: move });
          render();
        });
        return b;
      }),
    );
    promoBox.hidden = false;
    promoBox.querySelector<HTMLButtonElement>('button')?.focus();
  }
  function hoverCol(col: number): void {
    cells.forEach((cell, i) => cell.classList.toggle('col-hover', colOf(i) === col && !cell.disabled));
  }

  let state: State | null = null;
  let me: string | null = null;
  let lastBoard = '';
  /** The previous state's result (undefined before the first state: joining a finished game plays nothing). */
  let lastWinner: Mark | 'draw' | null | undefined;
  /** Classics: the shelf shows until a board is picked (and again from the "Shelf" button). */
  let shelfOpen = classics;
  const markNode = (mark: Mark) =>
    kind === 'four'
      ? el('span', { class: `four-disc mark-${mark}`, 'aria-label': t(mark === 'X' ? 'games.red' : 'games.yellow') })
      : kind === 'dama'
        ? el('span', { class: `dama-man mark-${mark}`, 'aria-label': t(mark === 'X' ? 'games.white' : 'games.black') })
        : kind === 'chess'
          ? el('span', { class: `chess-piece piece-${mark}`, 'aria-label': t(mark === 'X' ? 'games.white' : 'games.black') }, GLYPH.k!)
        : el('span', { class: 'xox-mark' }, mark);

  function mySeat(): number {
    if (!state || !me) return -1;
    return state.seats.findIndex((s) => s?.id === me);
  }
  function myMoves(): number[] {
    if (!state || !grid8()) return [];
    const seat = mySeat();
    const ready = state.seats.every((s) => s !== null);
    if (seat === -1 || !ready || state.game.winner !== null || state.game.turn !== MARKS[seat]) return [];
    return kind === 'chess' ? chessMoves(state.game as ChessState) : damaMoves(state.game as DamaState);
  }

  function personCard(seat: 0 | 1, person: GamePerson | null): void {
    const box = app.querySelector<HTMLElement>(`#seat-${seat}`)!;
    const mark = MARKS[seat];
    const turn = !!state && state.game.winner === null && state.game.turn === mark && state.seats.every((s) => s !== null);
    box.className = `xox-player mark-${mark}${turn ? ' turn' : ''}${person && !person.online ? ' away' : ''}${person?.bot ? ' bot' : ''}`;
    box.replaceChildren(
      markNode(mark),
      // An empty seat: a dashed empty circle and "Waiting…" (sweep-2 #5: "… ? O" looked broken).
      person?.bot ? glowbeam('xox-avatar cl-bot-avatar') : person ? avatarNode(person.avatar, 'xox-avatar') : el('span', { class: 'xox-avatar vacant' }),
      el(
        'span',
        { class: 'xox-name' },
        person ? `${person.bot ? t('classics.botName') : person.name}${person.id === me ? ` (${t('games.you')})` : ''}` : el('span', { class: 'muted' }, t('games.seatEmpty')),
        person && !person.online ? el('small', {}, ` · ${t('games.offline')}`) : '',
      ),
    );
  }

  function drawShelf(): void {
    const seat = mySeat();
    const busy = !!state?.started && state.game.winner === null;
    shelf.replaceChildren(
      el('p', { class: 'cl-shelf-title' }, `🎲 ${t('classics.pick')}`),
      el(
        'div',
        { class: 'cl-shelf-row' },
        ...SHELF.map((box) => {
          const title = box.kind === 'tavla' ? t('classics.tavla') : t(`games.${box.kind}.title`);
          const button = el(
            'button',
            { type: 'button', class: `cl-box cl-box-${box.kind}${box.kind === kind ? ' on' : ''}`, 'data-board': box.kind },
            el('span', { class: 'cl-box-lid', 'aria-hidden': 'true' }),
            el('span', { class: 'cl-box-glyph', 'aria-hidden': 'true' }, box.glyph),
            el('b', {}, title),
            box.soon ? el('small', {}, t('classics.soon')) : '',
          );
          button.disabled = !!box.soon || seat === -1 || (busy && box.kind !== kind);
          button.title = box.soon ? t('classics.soon') : busy && box.kind !== kind ? t('classics.busy') : t(`games.${box.kind as GameKind}.text`);
          button.addEventListener('click', () => {
            if (box.soon) return;
            shelfOpen = false;
            if (box.kind !== kind) send({ t: 'switch', game: box.kind as GameKind });
            render();
          });
          return button;
        }),
      ),
      el('div', { class: 'cl-shelf-board', 'aria-hidden': 'true' }),
    );
  }

  function render(): void {
    if (!state) return;
    if (state.kind !== kind || built !== state.kind) {
      kind = state.kind;
      build();
    }
    const { game, seats, score, watchers } = state;
    const seat = mySeat();
    personCard(0, seats[0]);
    personCard(1, seats[1]);
    app.querySelector('#xox-score')!.textContent = `${score.X} – ${score.O}${score.draw ? ` · ${score.draw}=` : ''}`;
    const ready = seats.every((s) => s !== null);
    const myTurn = seat !== -1 && ready && game.winner === null && game.turn === MARKS[seat];
    setGameLive(seat !== -1 && ready && game.winner === null && !!state.started && !seats.some((s) => s?.bot));
    const chess = game as ChessState;
    const boardKey = game.board.join(',') + ((game as DamaState).kings ?? []).join('.') + (chess.kinds ?? '');
    const changed = lastBoard !== '' && boardKey !== lastBoard;
    const moves = myMoves();
    const dama = game as DamaState;
    if (kind === 'dama' && dama.chain !== null && moves.length) picked = dama.chain;
    if (picked !== null && !moves.some((m) => fromOf(m) === picked)) picked = null;
    if (!moves.length) promoBox.hidden = true;
    const targets = new Set(picked === null ? [] : moves.filter((m) => fromOf(m) === picked).map(toOf));
    const movable = new Set(moves.map(fromOf));
    // Chess: the king in check glows red; the last move's two squares are lit.
    const checked = kind === 'chess' && chess.check ? game.board.findIndex((c, i) => c === game.turn && chess.kinds[i] === 'k') : -1;
    const kings = new Set(dama.kings ?? []);
    game.board.forEach((value, i) => {
      const cell = cells[i]!;
      const isNew = changed && value !== null && i === game.last;
      if (kind === 'xox') cell.setAttribute('aria-label', `${cellLabel(i)}, ${value || t('games.cellEmpty')}`);
      const dark = grid8() && (Math.floor(i / 8) + (i % 8)) % 2 === 1;
      if (kind === 'chess') {
        const piece = chess.kinds[i]!;
        const lit = i === game.last || i === chess.from;
        cell.className = `dama-cell chess-cell${dark ? ' dark' : ''}${value ? ` piece-${value}` : ''}${lit ? ' lit' : ''}${checked === i ? ' in-check' : ''}${picked === i ? ' picked' : ''}${targets.has(i) ? ' target' : ''}${movable.has(i) ? ' movable' : ''}${isNew ? ' placed' : ''}`;
        const glyph = value ? GLYPH[piece]! : '';
        if (cell.textContent !== glyph) cell.textContent = glyph;
        cell.setAttribute('aria-label', `${cellLabel(i)}${value ? `, ${t(value === 'X' ? 'games.white' : 'games.black')} ${tc(piece as 'p')}` : ''}`);
        cell.disabled = !(movable.has(i) || targets.has(i));
        return;
      }
      cell.className =
        kind === 'dama'
          ? `dama-cell${dark ? ' dark' : ''}${kings.has(i) ? ' king' : ''}${picked === i ? ' picked' : ''}${targets.has(i) ? ' target' : ''}${movable.has(i) ? ' movable' : ''}${value ? ` mark-${value}` : ''}${isNew ? ' placed' : ''}`
          : `xox-cell${kind === 'four' ? ' four-cell' : ''}${value ? ` mark-${value}` : ''}${game.line?.includes(i) ? ' win' : ''}${isNew ? ' placed' : ''}`;
      if (kind === 'dama') cell.setAttribute('aria-label', `${cellLabel(i)}${value ? `, ${t(value === 'X' ? 'games.white' : 'games.black')}${kings.has(i) ? ' ♛' : ''}` : ''}`);
      // Four in a Row: the disc drops from the top of its column.
      if (kind === 'four' && isNew) cell.style.setProperty('--drop', String(Math.floor(i / COLS) + 1));
      cell.disabled = kind === 'four' ? !myTurn || dropRow(game.board, colOf(i)) === -1 : kind === 'dama' ? !(movable.has(i) || targets.has(i)) : !myTurn || value !== null;
    });
    lastBoard = boardKey;
    // Sounds: every placed piece (mine and the opponent's: theirs means "your turn"), then the result.
    const placed = changed && game.last !== undefined && game.board[game.last] !== null;
    if (placed) playSound(kind === 'four' ? 'drop' : 'place');
    if (lastWinner === null && game.winner !== null) {
      const result = game.winner === 'draw' ? 'tie' : seat === -1 || game.winner === MARKS[seat] ? 'win' : 'lose';
      setTimeout(() => playSound(result), placed ? 260 : 0);
    }
    lastWinner = game.winner;
    board.classList.toggle('my-turn', myTurn);
    if (seat === -1) delete board.dataset.me;
    else board.dataset.me = MARKS[seat];
    board.classList.toggle('done', game.winner !== null);
    const colour = (mark: Mark) => t(kind === 'four' ? (mark === 'X' ? 'games.red' : 'games.yellow') : grid8() ? (mark === 'X' ? 'games.white' : 'games.black') : 'games.you');
    const nameOf = (mark: Mark) => {
      const p = seats[mark === 'X' ? 0 : 1];
      return p?.bot ? t('classics.botName') : (p?.name ?? (kind === 'xox' ? mark : colour(mark)));
    };
    // Glowbeam the referee (owner's pick 4 A): whose turn, then a small cheer for the winner.
    referee.className = `cl-ref-mascot${game.winner ? ' cheer' : ''}${!ready ? ' wait' : ''}`;
    if (!ready) status.textContent = t('games.waiting');
    else if (game.winner === 'draw') status.textContent = kind === 'chess' && chess.end && chess.end !== 'mate' ? tc(chess.end) : t('games.draw');
    else if (game.winner) {
      const said = seat === -1 ? t('games.won', { name: nameOf(game.winner) }) : game.winner === MARKS[seat] ? t('games.youWon') : t('games.youLost', { name: nameOf(game.winner) });
      status.textContent = kind === 'chess' && chess.end === 'mate' ? `${tc('mate')} ${said}` : said;
    } else if (kind === 'chess' && chess.check) status.textContent = myTurn ? tc('youCheck') : `${tc('check')} ${t('games.theirTurn', { name: nameOf(game.turn) })}`;
    else if (myTurn && kind === 'dama' && dama.chain !== null) status.textContent = t('classics.chain');
    else if (myTurn && kind === 'dama' && mustCapture(dama)) status.textContent = t('classics.mustCapture');
    else status.textContent = myTurn ? t('games.yourTurn') : t('games.theirTurn', { name: nameOf(game.turn) });
    status.classList.toggle('mine', myTurn);
    rematchButton.hidden = seat === -1 || game.winner === null;
    sitButton.hidden = seat !== -1 || seats.every((s) => s && s.online && !s.bot);
    standButton.hidden = seat === -1;
    // Glowbeam the bot (owner's pick 6 A): offered to a seated player while the other seat is free.
    const other = seat === -1 ? null : seats[seat === 0 ? 1 : 0];
    const canBot = seat !== -1 && (!other || !other.online || !!other.bot);
    botBox.hidden = !canBot;
    if (canBot) {
      const level = (n: 1 | 2, label: string) => {
        const b = el('button', { type: 'button', class: `btn small-btn cl-bot-level${other?.bot === n ? ' on' : ''}` }, label);
        b.addEventListener('click', () => send({ t: 'bot', level: n }));
        return b;
      };
      const leave = el('button', { type: 'button', class: 'btn small-btn' }, t('classics.botLeave'));
      leave.addEventListener('click', () => send({ t: 'bot', level: 0 }));
      botBox.replaceChildren(el('span', { class: 'cl-bot-label' }, glowbeam('cl-bot-icon'), other?.bot ? '' : t('classics.bot')), level(1, t('classics.botEasy')), level(2, t('classics.botMedium')), other?.bot ? leave : '');
    }
    // The shelf (Classics only).
    shelfButton.hidden = !classics || shelfOpen;
    shelfButton.textContent = `🎲 ${t('classics.back')}`;
    shelfButton.title = t('classics.backTitle');
    shelf.hidden = !classics || !shelfOpen;
    if (!shelf.hidden) drawShelf();
    const list = app.querySelector<HTMLElement>('#xox-watchers')!;
    list.replaceChildren(
      ...(watchers.length
        ? watchers.map((w) => el('li', { class: 'person' }, avatarNode(w.avatar, 'person-avatar'), el('span', { class: 'person-name' }, w.id === me ? `${w.name} (${t('games.you')})` : w.name)))
        : [el('li', { class: 'muted small' }, seat === -1 ? t('games.watching') : t('games.noWatchers'))]),
    );
  }

  function float(from: GamePerson, emoji: string): void {
    const layer = app.querySelector<HTMLElement>('#xox-floats')!;
    const node = el('div', { class: 'xox-float' }, el('span', { class: 'xox-float-emoji' }, emoji), avatarNode(from.avatar, 'xox-float-avatar'));
    node.style.left = `${10 + Math.random() * 80}%`;
    layer.append(node);
    setTimeout(() => node.remove(), 2600);
  }

  // ---- The connection (reconnects when it drops) ----
  let ws: SwmSocket | null = null;
  let stopped = false;
  function send(message: GameClientMessage): void {
    if (ws?.readyState === OPEN) ws.send(JSON.stringify(message));
  }
  function connect(): void {
    if (stopped) return;
    const url = `${location.origin.replace(/^http/, 'ws')}/api/games/${encodeURIComponent(gameId)}/ws`;
    const socket = openSocket(url);
    ws = socket;
    socket.addEventListener('open', () =>
      socket.send(JSON.stringify({ t: 'hello', v: GAME_PROTOCOL_VERSION, game: kind, name, avatar, cid: clientId(), ...(classics ? { classics: true } : {}) } satisfies GameClientMessage)),
    );
    socket.addEventListener('message', (event) => {
      let message: GameServerMessage;
      try {
        message = JSON.parse(String(event.data)) as GameServerMessage;
      } catch {
        return;
      }
      if (message.t === 'welcome') me = message.you;
      else if (message.t === 'state') {
        // Joining a Classics table where a game is going: straight to the board.
        if (!state && message.started) shelfOpen = false;
        state = message;
        render();
      } else if (message.t === 'react') float(message.from, message.emoji);
      else if (message.t === 'error' && message.code === 'in_progress') status.textContent = t('classics.busy');
      else if (message.t === 'error' && (message.code === 'version' || message.code === 'full' || message.code === 'kind')) {
        stopped = true;
        status.textContent = t(`games.${message.code}`);
      }
    });
    socket.addEventListener('close', () => {
      if (ws !== socket || stopped) return;
      status.textContent = t('games.reconnecting');
      setTimeout(connect, 1500);
    });
  }
  build();
  connect();
  const ping = window.setInterval(() => send({ t: 'ping' }), 20_000);
  const close = () => {
    stopped = true;
    ws?.close();
  };
  const onLang = () => {
    translate(app);
    cells.forEach((cell, i) => cell.setAttribute('aria-label', cellLabel(i)));
    render();
  };
  addEventListener('pagehide', close);
  addEventListener('langchange', onLang);
  return () => {
    setGameLive(false);
    close();
    clearInterval(ping);
    removeEventListener('pagehide', close);
    removeEventListener('langchange', onLang);
  };
}

