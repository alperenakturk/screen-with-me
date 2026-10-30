// Odanın içindeki XOX ve Dört Taş (oyun sahnesinde). İlk iki kişi X ve O olur (Dört Taş'ta kırmızı ve sarı taş),
// sonra gelenler izler; koltuk boşalınca (oyuncu çıktıysa) izleyiciler "Oyuncu ol" ile oturur. Hamleleri sunucu
// doğrular; burası sadece gelen durumu çizer. Ad ve avatar odadakiyle aynı.

import type { Mark } from '@swm/shared/games/board';
import { COLS, dropRow } from '@swm/shared/games/four';
import { GAME_EMOJIS, GAME_PROTOCOL_VERSION, type GameClientMessage, type GameKind, type GamePerson, type GameServerMessage } from '@swm/shared/games/protocol';
import type { Avatar } from '@swm/shared/protocol';
import { el } from '../dom.ts';
import { t, translate } from '../i18n.ts';
import { clientId } from '../storage.ts';
import { avatarNode } from '../ui/avatar.ts';
import { playSound } from '../sound.ts';

const MARKS: readonly [Mark, Mark] = ['X', 'O'];
type State = Extract<GameServerMessage, { t: 'state' }>;

/** Oyunu `app`'in içine kurar; dönen işlev bağlantıyı ve zamanlayıcıları kapatır. */
export function mountMatch(app: HTMLElement, kind: GameKind, gameId: string, name: string, avatar: Avatar): () => void {
  const four = kind === 'four';
  app.innerHTML = `
    <div class="xox-page">
      <section class="xox-players">
        <div class="xox-player" id="seat-0"></div>
        <div class="xox-vs" id="xox-score"></div>
        <div class="xox-player" id="seat-1"></div>
      </section>
      <p id="xox-status" class="xox-status" role="status" aria-live="polite"></p>
      <div class="xox-board-wrap">
        <div id="xox-board" class="${four ? 'xox-board four-board' : 'xox-board'}" role="grid"></div>
        <div id="xox-floats" class="xox-floats" aria-hidden="true"></div>
      </div>
      <div class="xox-actions">
        <button id="xox-rematch" type="button" class="btn primary" data-i18n="games.rematch" hidden></button>
        <button id="xox-sit" type="button" class="btn primary" data-i18n="games.sit" hidden></button>
        <button id="xox-stand" type="button" class="btn small-btn" data-i18n="games.stand" hidden></button>
      </div>
      <div id="xox-emojis" class="xox-emojis"></div>
      <section class="card xox-watchers">
        <h4 data-i18n="games.watchers"></h4>
        <ul id="xox-watchers"></ul>
      </section>
    </div>`;
  translate(app);

  const board = app.querySelector<HTMLElement>('#xox-board')!;
  // XOX: 9 hücre, tıklanan hücreye. Dört Taş: 42 hücre; bir hücreye tıklamak o sütuna taş atar (taş en alta düşer),
  // fare hangi sütundaysa o sütun belirginleşir.
  const colOf = (i: number) => i % COLS;
  const cellLabel = (i: number) => (four ? t('games.column', { n: colOf(i) + 1 }) : t('games.cell', { n: i + 1 }));
  const cells = Array.from({ length: four ? 42 : 9 }, (_, i) => {
    const cell = el('button', { type: 'button', class: four ? 'xox-cell four-cell' : 'xox-cell', role: 'gridcell', 'aria-label': cellLabel(i) });
    cell.addEventListener('click', () => send({ t: 'move', cell: four ? colOf(i) : i }));
    if (four) {
      cell.addEventListener('pointerenter', () => hoverCol(colOf(i)));
      cell.addEventListener('pointerleave', () => hoverCol(-1));
    }
    board.append(cell);
    return cell;
  });
  function hoverCol(col: number): void {
    cells.forEach((cell, i) => cell.classList.toggle('col-hover', colOf(i) === col && !cell.disabled));
  }
  const status = app.querySelector<HTMLElement>('#xox-status')!;
  const rematchButton = app.querySelector<HTMLButtonElement>('#xox-rematch')!;
  const sitButton = app.querySelector<HTMLButtonElement>('#xox-sit')!;
  const standButton = app.querySelector<HTMLButtonElement>('#xox-stand')!;
  rematchButton.addEventListener('click', () => send({ t: 'rematch' }));
  standButton.addEventListener('click', () => send({ t: 'stand' }));
  sitButton.addEventListener('click', () => {
    const free = state?.seats.findIndex((s) => !s || !s.online) ?? -1;
    if (free === 0 || free === 1) send({ t: 'sit', seat: free });
  });
  const emojis = app.querySelector<HTMLElement>('#xox-emojis')!;
  for (const emoji of GAME_EMOJIS) {
    const button = el('button', { type: 'button', class: 'reaction-btn' }, emoji);
    button.addEventListener('click', () => send({ t: 'react', emoji }));
    emojis.append(button);
  }

  let state: State | null = null;
  let me: string | null = null;
  let lastBoard = '';
  /** The previous state's result (undefined before the first state: joining a finished game plays nothing). */
  let lastWinner: Mark | 'draw' | null | undefined;
  /** Oyuncu işareti: XOX'ta harf, Dört Taş'ta renkli taş. */
  const markNode = (mark: Mark) => (four ? el('span', { class: `four-disc mark-${mark}`, 'aria-label': t(mark === 'X' ? 'games.red' : 'games.yellow') }) : el('span', { class: 'xox-mark' }, mark));

  function mySeat(): number {
    if (!state || !me) return -1;
    return state.seats.findIndex((s) => s?.id === me);
  }

  function personCard(seat: 0 | 1, person: GamePerson | null): void {
    const box = app.querySelector<HTMLElement>(`#seat-${seat}`)!;
    const mark = MARKS[seat];
    const turn = !!state && state.game.winner === null && state.game.turn === mark && state.seats.every((s) => s !== null);
    box.className = `xox-player mark-${mark}${turn ? ' turn' : ''}${person && !person.online ? ' away' : ''}`;
    box.replaceChildren(
      markNode(mark),
      person ? avatarNode(person.avatar, 'xox-avatar') : el('span', { class: 'xox-avatar vacant' }, '?'),
      el(
        'span',
        { class: 'xox-name' },
        person ? `${person.name}${person.id === me ? ` (${t('games.you')})` : ''}` : '…',
        person && !person.online ? el('small', {}, ` · ${t('games.offline')}`) : '',
      ),
    );
  }

  function render(): void {
    if (!state) return;
    const { game: xox, seats, score, watchers } = state;
    const seat = mySeat();
    personCard(0, seats[0]);
    personCard(1, seats[1]);
    app.querySelector('#xox-score')!.textContent = `${score.X} – ${score.O}${score.draw ? ` · ${score.draw}=` : ''}`;
    const ready = seats.every((s) => s !== null);
    const myTurn = seat !== -1 && ready && xox.winner === null && xox.turn === MARKS[seat];
    const boardKey = xox.board.join(',');
    const changed = lastBoard !== '' && boardKey !== lastBoard;
    xox.board.forEach((value, i) => {
      const cell = cells[i]!;
      const isNew = changed && value !== null && i === xox.last;
      // XOX marks are drawn by CSS (two strokes / a ring); the label says what is there.
      if (!four) cell.setAttribute('aria-label', value ? `${cellLabel(i)}: ${value}` : cellLabel(i));
      cell.className = `xox-cell${four ? ' four-cell' : ''}${value ? ` mark-${value}` : ''}${xox.line?.includes(i) ? ' win' : ''}${isNew ? ' placed' : ''}`;
      // Dört Taş: taş sütunun tepesinden düşer (kaç satır düşeceği).
      if (four && isNew) cell.style.setProperty('--drop', String(Math.floor(i / COLS) + 1));
      cell.disabled = !myTurn || (four ? dropRow(xox.board, colOf(i)) === -1 : value !== null);
    });
    lastBoard = boardKey;
    // Sounds: every placed piece (mine and the opponent's: theirs means "your turn"), then the result.
    const placed = changed && xox.last !== undefined && xox.board[xox.last] !== null;
    if (placed) playSound(four ? 'drop' : 'place');
    if (lastWinner === null && xox.winner !== null) {
      const result = xox.winner === 'draw' ? 'tie' : seat === -1 || xox.winner === MARKS[seat] ? 'win' : 'lose';
      setTimeout(() => playSound(result), placed ? 260 : 0);
    }
    lastWinner = xox.winner;
    board.classList.toggle('my-turn', myTurn);
    // My mark, for the faint preview on the cell under the mouse.
    if (seat === -1) delete board.dataset.me;
    else board.dataset.me = MARKS[seat];
    board.classList.toggle('done', xox.winner !== null);
    const nameOf = (mark: Mark) => seats[mark === 'X' ? 0 : 1]?.name ?? (four ? t(mark === 'X' ? 'games.red' : 'games.yellow') : mark);
    if (!ready) status.textContent = t('games.waiting');
    else if (xox.winner === 'draw') status.textContent = t('games.draw');
    else if (xox.winner) {
      status.textContent = seat === -1 ? t('games.won', { name: nameOf(xox.winner) }) : xox.winner === MARKS[seat] ? t('games.youWon') : t('games.youLost', { name: nameOf(xox.winner) });
    } else status.textContent = myTurn ? t('games.yourTurn') : t('games.theirTurn', { name: nameOf(xox.turn) });
    status.classList.toggle('mine', myTurn);
    rematchButton.hidden = seat === -1 || xox.winner === null;
    sitButton.hidden = seat !== -1 || seats.every((s) => s && s.online);
    standButton.hidden = seat === -1;
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

  // ---- Bağlantı (koparsa yeniden bağlanır) ----
  let ws: WebSocket | null = null;
  let stopped = false;
  function send(message: GameClientMessage): void {
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
  }
  function connect(): void {
    if (stopped) return;
    const url = `${location.origin.replace(/^http/, 'ws')}/api/games/${encodeURIComponent(gameId)}/ws`;
    const socket = new WebSocket(url);
    ws = socket;
    socket.addEventListener('open', () => socket.send(JSON.stringify({ t: 'hello', v: GAME_PROTOCOL_VERSION, game: kind, name, avatar, cid: clientId() } satisfies GameClientMessage)));
    socket.addEventListener('message', (event) => {
      let message: GameServerMessage;
      try {
        message = JSON.parse(String(event.data)) as GameServerMessage;
      } catch {
        return;
      }
      if (message.t === 'welcome') me = message.you;
      else if (message.t === 'state') {
        state = message;
        render();
      } else if (message.t === 'react') float(message.from, message.emoji);
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
    close();
    clearInterval(ping);
    removeEventListener('pagehide', close);
    removeEventListener('langchange', onLang);
  };
}
