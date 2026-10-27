// PlayWithMe XOX maç sayfası (/oyun/xox/<kod>). İlk iki kişi X ve O olur, sonra gelenler izler; koltuk boşalınca
// (oyuncu çıktıysa) izleyiciler "Oyuncu ol" ile oturur. Hamleleri sunucu doğrular; sayfa sadece gelen durumu çizer.
// Ad ve avatar sitedekiyle aynı (yoksa ad sorulur, avatar rastgele).

import { GAME_EMOJIS, GAME_PROTOCOL_VERSION, type GameClientMessage, type GamePerson, type GameServerMessage } from '@swm/shared/games/protocol';
import type { Mark, XoxState } from '@swm/shared/games/xox';
import { cleanName, isAvatar, randomAvatar, type Avatar } from '@swm/shared/protocol';
import { el } from '../dom.ts';
import { t, translate } from '../i18n.ts';
import { clientId, load, saveIdentity } from '../storage.ts';
import { avatarNode } from '../ui/avatar.ts';
import { playLogo } from './hub.ts';

const MARKS: readonly [Mark, Mark] = ['X', 'O'];
type State = Extract<GameServerMessage, { t: 'state' }>;

export function renderXox(app: HTMLElement, gameId: string): void {
  document.title = 'XOX · PlayWithMe';
  const name = load('name');
  const savedAvatar = load('avatar');
  if (name && cleanName(name)) {
    start(app, gameId, name, isAvatar(savedAvatar) ? savedAvatar : randomAvatar());
    return;
  }
  // Ad yoksa önce sorulur (sitedeki odayla aynı ad kullanılır).
  app.innerHTML = `
    <section class="hero games-hero">
      <div id="pwm-logo"></div>
      <form id="game-name" class="row game-name">
        <input id="game-name-input" maxlength="24" autocomplete="off" required data-i18n-placeholder="games.namePrompt" />
        <button class="btn primary" data-i18n="games.nameGo"></button>
      </form>
    </section>`;
  app.querySelector('#pwm-logo')!.replaceWith(playLogo());
  translate(app);
  const input = app.querySelector<HTMLInputElement>('#game-name-input')!;
  input.focus();
  app.querySelector('#game-name')!.addEventListener('submit', (event) => {
    event.preventDefault();
    const clean = cleanName(input.value);
    if (!clean) return;
    const avatar = isAvatar(savedAvatar) ? savedAvatar : randomAvatar();
    saveIdentity(clean, avatar);
    start(app, gameId, clean, avatar);
  });
}

function start(app: HTMLElement, gameId: string, name: string, avatar: Avatar): void {
  app.innerHTML = `
    <div class="xox-page">
      <header class="xox-head">
        <a class="nav-link" href="/oyun" data-i18n="games.back"></a>
        <div class="xox-title"><span id="xox-logo"></span><b>XOX</b></div>
      </header>
      <section class="card xox-invite">
        <span class="muted small" data-i18n="games.invite"></span>
        <div class="row">
          <input id="xox-link" readonly />
          <button id="xox-copy" type="button" class="btn primary"></button>
        </div>
      </section>
      <section class="xox-players">
        <div class="xox-player" id="seat-0"></div>
        <div class="xox-vs" id="xox-score"></div>
        <div class="xox-player" id="seat-1"></div>
      </section>
      <p id="xox-status" class="xox-status" role="status" aria-live="polite"></p>
      <div class="xox-board-wrap">
        <div id="xox-board" class="xox-board" role="grid"></div>
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
  app.querySelector('#xox-logo')!.replaceWith(playLogo(true));
  translate(app);

  const link = app.querySelector<HTMLInputElement>('#xox-link')!;
  link.value = location.href.split('#')[0]!;
  const copy = app.querySelector<HTMLButtonElement>('#xox-copy')!;
  const canShare = typeof navigator.share === 'function' && matchMedia('(pointer: coarse)').matches;
  const copyLabel = () => (copy.textContent = canShare ? t('share') : t('copy'));
  copyLabel();
  copy.addEventListener('click', async () => {
    if (canShare) {
      await navigator.share({ title: 'XOX · PlayWithMe', url: link.value }).catch(() => {});
      return;
    }
    await navigator.clipboard?.writeText(link.value).catch(() => link.select());
    copy.textContent = t('copied');
    setTimeout(copyLabel, 1500);
  });

  const board = app.querySelector<HTMLElement>('#xox-board')!;
  const cells = Array.from({ length: 9 }, (_, i) => {
    const cell = el('button', { type: 'button', class: 'xox-cell', role: 'gridcell', 'aria-label': t('games.cell', { n: i + 1 }) });
    cell.addEventListener('click', () => send({ t: 'move', cell: i }));
    board.append(cell);
    return cell;
  });
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

  function mySeat(): number {
    if (!state || !me) return -1;
    return state.seats.findIndex((s) => s?.id === me);
  }

  function personCard(seat: 0 | 1, person: GamePerson | null): void {
    const box = app.querySelector<HTMLElement>(`#seat-${seat}`)!;
    const mark = MARKS[seat];
    const turn = !!state && state.xox.winner === null && state.xox.turn === mark && state.seats.every((s) => s !== null);
    box.className = `xox-player mark-${mark}${turn ? ' turn' : ''}${person && !person.online ? ' away' : ''}`;
    box.replaceChildren(
      el('span', { class: 'xox-mark' }, mark),
      person ? avatarNode(person.avatar, 'xox-avatar') : el('span', { class: 'xox-avatar empty' }, '?'),
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
    const { xox, seats, score, watchers } = state;
    const seat = mySeat();
    personCard(0, seats[0]);
    personCard(1, seats[1]);
    app.querySelector('#xox-score')!.textContent = `${score.X} – ${score.O}${score.draw ? ` · ${score.draw}=` : ''}`;
    const ready = seats.every((s) => s !== null);
    const myTurn = seat !== -1 && ready && xox.winner === null && xox.turn === MARKS[seat];
    const boardKey = xox.board.join(',');
    xox.board.forEach((value, i) => {
      const cell = cells[i]!;
      const isNew = value !== null && lastBoard.split(',')[i] === '' && lastBoard !== '';
      cell.textContent = value ?? '';
      cell.className = `xox-cell${value ? ` mark-${value}` : ''}${xox.line?.includes(i) ? ' win' : ''}${isNew ? ' placed' : ''}`;
      cell.disabled = !myTurn || value !== null;
    });
    lastBoard = boardKey;
    board.classList.toggle('done', xox.winner !== null);
    const nameOf = (mark: Mark) => seats[mark === 'X' ? 0 : 1]?.name ?? mark;
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
    const url = `${location.origin.replace(/^http/, 'ws')}/api/games/${encodeURIComponent(gameId)}/ws`;
    const socket = new WebSocket(url);
    ws = socket;
    socket.addEventListener('open', () => socket.send(JSON.stringify({ t: 'hello', v: GAME_PROTOCOL_VERSION, game: 'xox', name, avatar, cid: clientId() } satisfies GameClientMessage)));
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
      else if (message.t === 'error' && (message.code === 'version' || message.code === 'full')) {
        stopped = true;
        status.textContent = t(message.code === 'version' ? 'games.version' : 'games.full');
      }
    });
    socket.addEventListener('close', () => {
      if (ws !== socket || stopped) return;
      status.textContent = t('games.reconnecting');
      setTimeout(connect, 1500);
    });
  }
  connect();
  setInterval(() => send({ t: 'ping' }), 20_000);
  addEventListener('pagehide', () => {
    stopped = true;
    ws?.close();
  });
  addEventListener('langchange', () => {
    translate(app);
    copyLabel();
    cells.forEach((cell, i) => cell.setAttribute('aria-label', t('games.cell', { n: i + 1 })));
    render();
  });
}
