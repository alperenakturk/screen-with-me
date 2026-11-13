// 🚢 Sea Battle, the page (Game Studio, notes in docs/internal/design/games/sea-battle.md). A lazy chunk with its own
// texts (EN + TR). The server holds both fleets; this page only ever knows my own ships (and, after the game, both).
// Placing: a random fleet comes from the server; tap a ship to pick it, tap water to move it there, "Turn" turns it,
// or drag it. Shooting: tap a cell of the enemy sea on my turn.
import './sea.css';
import { OPEN, openSocket, type SwmSocket } from '@swm/shared/socket';
import {
  SEA_PROTOCOL_VERSION,
  SEA_RULES,
  checkFleet,
  knownEmpty,
  type SeaClientMessage,
  type SeaServerMessage,
  type ShipPlace,
} from '@swm/shared/games/sea';
import type { Avatar } from '@swm/shared/protocol';
import { el } from '../dom.ts';
import { lang } from '../i18n.ts';
import { clientId } from '../storage.ts';
import { avatarNode } from '../ui/avatar.ts';
import { playSound } from '../sound.ts';
import { setGameLive } from './live.ts';
import { LOCAL_ONLY, labServerHere } from './lab-server.ts';
import { debugHooks } from '../debug-lab.ts';
import { stubArt, syncRefereePose } from './stub.ts';
import sea1Art from './art/tutorial/sea-1-place.svg?raw';
import sea2Art from './art/tutorial/sea-2-shoot.svg?raw';
import sea3Art from './art/tutorial/sea-3-sink.svg?raw';
import { tableHowTo } from './how-to-play.ts';
import { isPhoneLayout } from '../device.ts';
import { resultCard } from './result.ts';
import { silence } from './silent.ts';
import { GAME_CLOCK_EVERY, GAME_KEEPALIVE_MS, KEEPALIVE, KEEPALIVE_ACK, keepaliveTicks } from '@swm/shared/keepalive';

type State = Extract<SeaServerMessage, { t: 'state' }>;

const TEXT = {
  en: {
    theirSea: 'Their sea',
    mySea: 'My sea',
    seaOf: "{name}'s sea",
    waiting: 'Waiting for a second player…',
    placeHint: 'Place your fleet: tap a ship, then tap water to move it. Then Ready.',
    placeWait: 'Ready. Waiting for {name}…',
    otherPlacing: '{name} is placing their fleet',
    yourTurn: 'Your turn: pick a cell on their sea',
    theirTurn: '{name} is aiming…',
    botTurn: 'Stub is aiming…',
    watchTurn: "{name}'s turn",
    miss: 'Splash, a miss.',
    hit: 'Hit! Shoot again.',
    hitOnce: 'Hit!',
    sunk: 'Sunk! A whole ship.',
    theyMiss: '{name} missed.',
    theyHit: '{name} hit your ship.',
    theySunk: '{name} sank your ship.',
    youWin: 'You sank their whole fleet. You win! 🎉',
    youLose: '{name} sank your fleet.',
    winner: '{name} wins!',
    shuffle: 'Shuffle',
    turn: 'Turn',
    ready: 'Ready',
    notReady: 'Not ready',
    rematch: 'Play again',
    sit: 'Take the seat',
    bot: 'Play against Stub (our bot):',
    botEasy: 'Easy',
    botMedium: 'Medium',
    botLeave: 'Stub leaves',
    watchers: 'Watching',
    watchShort: '👁 {n} watching',
    noWatchers: 'Nobody is watching.',
    left: '{n} ships left',
    leftOne: '1 ship left',
    cell: '{col}{row}',
    water: 'water',
    myShip: 'my ship',
    shotMiss: 'miss',
    shotHit: 'hit',
    shotSunk: 'sunk',
    pickShip: 'Pick a ship first (tap it), then tap water to move it.',
    noRoom: "That ship doesn't fit there (ships may not touch).",
    full: 'The table is full.',
    version: 'Reload the page for the new version.',
    reconnecting: 'Reconnecting…',
    aimed: 'Aiming at {cell}: tap a cell to fire, or Fire',
    wholeSea: 'Whole sea',
    wholeSeaTitle: 'Back to the whole sea',
    seeBoard: 'See the seas',
    fire: 'Fire at {cell}',
    how1: 'Place your fleet',
    how1Line: 'Shuffle, drag or turn your ships; they may not touch. Then press Ready.',
    how2: 'Call your shots',
    how2Line: 'Tap a cell on their sea. A hit shoots again; a miss passes the turn.',
    how3: 'Sink them all',
    how3Line: 'A sunk ship shows the water around it. Sink the whole fleet first to win.',
  },
  tr: {
    theirSea: 'Onun denizi',
    mySea: 'Benim denizim',
    seaOf: '{name} denizi',
    waiting: 'İkinci oyuncu bekleniyor…',
    placeHint: 'Filonu yerleştir: bir gemiye dokun, sonra suya dokunup oraya taşı. Sonra Hazır.',
    placeWait: 'Hazırsın. {name} bekleniyor…',
    otherPlacing: '{name} filosunu yerleştiriyor',
    yourTurn: 'Sıra sende: onun denizinden bir kare seç',
    theirTurn: '{name} nişan alıyor…',
    botTurn: 'Stub nişan alıyor…',
    watchTurn: 'Sıra {name} oyuncusunda',
    miss: 'Şıp, boş.',
    hit: 'İsabet! Bir daha at.',
    hitOnce: 'İsabet!',
    sunk: 'Battı! Koca bir gemi.',
    theyMiss: '{name} ıskaladı.',
    theyHit: '{name} gemini vurdu.',
    theySunk: '{name} gemini batırdı.',
    youWin: 'Bütün filosunu batırdın. Kazandın! 🎉',
    youLose: '{name} filonu batırdı.',
    winner: '{name} kazandı!',
    shuffle: 'Karıştır',
    turn: 'Döndür',
    ready: 'Hazır',
    notReady: 'Hazır değilim',
    rematch: 'Yeniden oyna',
    sit: 'Yere otur',
    bot: 'Stub’a (bota) karşı:',
    botEasy: 'Kolay',
    botMedium: 'Orta',
    botLeave: 'Stub kalksın',
    watchers: 'İzleyenler',
    watchShort: '👁 {n} izliyor',
    noWatchers: 'İzleyen yok.',
    left: '{n} gemi kaldı',
    leftOne: '1 gemi kaldı',
    cell: '{col}{row}',
    water: 'su',
    myShip: 'gemim',
    shotMiss: 'boş',
    shotHit: 'isabet',
    shotSunk: 'battı',
    pickShip: 'Önce bir gemi seç (dokun), sonra taşımak için suya dokun.',
    noRoom: 'Gemi oraya sığmıyor (gemiler birbirine değemez).',
    full: 'Masa dolu.',
    version: 'Yeni sürüm için sayfayı yenile.',
    reconnecting: 'Yeniden bağlanıyor…',
    aimed: 'Nişan {cell}: ateş için bir kareye dokun ya da Ateş et',
    wholeSea: 'Bütün deniz',
    wholeSeaTitle: 'Bütün denize dön',
    seeBoard: 'Denizlere bak',
    fire: '{cell} hedefine ateş',
    how1: 'Filonu yerleştir',
    how1Line: 'Gemilerini karıştır, sürükle ya da çevir; birbirine değemezler. Sonra Hazır de.',
    how2: 'Atışını yap',
    how2Line: 'Onların denizinde bir kareye dokun. İsabet edersen yine atarsın; ıska sırayı geçirir.',
    how3: 'Hepsini batır',
    how3Line: 'Batan geminin çevresindeki su görünür. Bütün filoyu ilk batıran kazanır.',
  },
} as const;

const tx = (key: keyof (typeof TEXT)['en'], values: Record<string, string | number> = {}): string =>
  (lang() === 'tr' ? TEXT.tr : TEXT.en)[key].replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ''));


const COLS = 'ABCDEFGHIJ';

/** Mounts Sea Battle into `app`; the returned function closes the connection and timers. */
export function mountSea(app: HTMLElement, gameId: string, name: string, avatar: Avatar): () => void {
  const size = SEA_RULES.size;
  const root = el('div', { class: 'sea', 'data-phase': 'place' });
  app.replaceChildren(root);

  let state: State | null = null;
  /** My fleet while placing (a local copy, sent on every change). */
  let places: ShipPlace[] = [];
  /** The ship picked for moving (index), and the cell of it that was grabbed. */
  let picked: number | null = null;
  let grab = 0;
  /** Which sea a narrow window shows. */
  let view: 'mine' | 'theirs' = 'mine';
  let viewChosen = false;
  /** Test Lab: the other fleet, revealed in this tab only. */
  let revealed: number[][] | null = null;
  let lastShot = '';
  let lastPhase = '';
  let note = '';

  // ---- The layout ----
  const score = el('span', { class: 'sea-score' });
  const botBox = el('span', { class: 'sea-bot' });
  const watchOpen = el('button', { type: 'button', class: 'btn small-btn sea-watch-open', 'aria-expanded': 'false' });
  const watchPop = el('section', { class: 'card sea-watch-pop', hidden: '' });
  const bar = el('div', { class: 'sea-bar' }, score, botBox, el('span', { class: 'sea-gap' }), watchOpen, watchPop);
  const switcher = el('div', { class: 'sea-switch', role: 'tablist' });
  const tabTheirs = el('button', { type: 'button', role: 'tab', class: 'sea-tab', 'data-sea': 'theirs' });
  const tabMine = el('button', { type: 'button', role: 'tab', class: 'sea-tab', 'data-sea': 'mine' });
  switcher.append(tabTheirs, tabMine);

  function seaBox(which: 'theirs' | 'mine'): { box: HTMLElement; head: HTMLElement; grid: HTMLElement; frame: HTMLElement; cells: HTMLButtonElement[] } {
    const head = el('div', { class: 'sea-head' });
    const grid = el('div', { class: 'sea-grid', role: 'grid' });
    grid.style.setProperty('--n', String(size));
    const cells: HTMLButtonElement[] = [];
    for (let r = 0; r < size; r++) {
      const row = el('div', { class: 'sea-row', role: 'row' });
      for (let c = 0; c < size; c++) {
        const i = r * size + c;
        const cell = el('button', { type: 'button', class: 'sea-cell', role: 'gridcell', 'data-cell': String(i) }) as HTMLButtonElement;
        cell.append(el('span', { class: 'sea-mark', 'aria-hidden': 'true' }));
        cells.push(cell);
        row.append(cell);
      }
      grid.append(row);
    }
    // NG1 (owner's pick 7B): on a phone the enemy sea zooms into a quarter; the frame clips the zoomed grid.
    const frame = el('div', { class: 'sea-zoom' }, grid);
    const box = el('section', { class: `sea-sea sea-${which}`, 'data-sea': which }, head, frame);
    return { box, head, grid, frame, cells };
  }
  const theirs = seaBox('theirs');
  const mine = seaBox('mine');
  const seas = el('div', { class: 'sea-seas' }, theirs.box, mine.box);
  // GP2: the one result card over the seas; Play again moves into it while it shows.
  const result = resultCard(seas, stubArt('plain', 'gr-glow'), (moved) => actions.prepend(...moved));
  const referee = stubArt('referee', 'sea-ref-mascot');
  const status = el('p', { class: 'sea-status', role: 'status', 'aria-live': 'polite' });
  const actions = el('div', { class: 'sea-actions' });
  root.append(bar, switcher, seas, el('div', { class: 'sea-ref' }, referee, status), actions);

  // ---- Helpers ----
  const mySeat = () => state?.seat ?? -1;
  const other = () => (mySeat() === -1 ? 1 : 1 - mySeat());
  const nameOfSeat = (i: number) => state?.players[i]?.name ?? '';
  const cellName = (i: number) => tx('cell', { col: COLS[i % size]!, row: Math.floor(i / size) + 1 });
  const myShips = () => checkFleet(SEA_RULES, places) ?? [];
  const placing = () => state?.phase === 'place' && mySeat() >= 0 && !state.players[mySeat()]?.ready;

  // GHOST: the Test Lab's "go silent" keeps this page quiet, as a dead connection would be.
  const quiet = silence();
  function send(message: SeaClientMessage): void {
    if (quiet.on) return;
    if (ws?.readyState === OPEN) ws.send(JSON.stringify(message));
  }
  function sendKeepalive(): void {
    if (!quiet.on && ws?.readyState === OPEN) ws.send(KEEPALIVE);
  }

  function setNote(text: string): void {
    note = text;
    render();
  }

  /** Moves ship `ship` so that its grabbed cell lands on `cell`; false if it doesn't fit. */
  function moveShip(ship: number, cell: number, down = places[ship]!.down): boolean {
    const r = Math.floor(cell / size);
    const c = cell % size;
    const at = down ? (r - grab) * size + c : r * size + (c - grab);
    if (at < 0 || (!down && c - grab < 0)) return false;
    const next = places.map((p, i) => (i === ship ? { at, down } : p));
    if (!checkFleet(SEA_RULES, next)) return false;
    places = next;
    send({ t: 'place', ships: places });
    return true;
  }

  function turnShip(): void {
    if (picked === null) return setNote(tx('pickShip'));
    const p = places[picked]!;
    grab = 0;
    const r = Math.floor(p.at / size);
    const c = p.at % size;
    // Turn around the ship's first cell; if it doesn't fit, try sliding it back onto the sea.
    for (let back = 0; back < SEA_RULES.fleet[picked]!; back++) {
      const at = p.down ? r * size + Math.max(0, c - back) : Math.max(0, r - back) * size + c;
      const next = places.map((q, i) => (i === picked ? { at, down: !p.down } : q));
      if (checkFleet(SEA_RULES, next)) {
        places = next;
        send({ t: 'place', ships: places });
        note = '';
        return render();
      }
    }
    setNote(tx('noRoom'));
  }

  // ---- Clicks on the seas ----
  function onMine(cell: number): void {
    if (!placing()) return;
    const ships = myShips();
    const hitShip = ships.findIndex((s) => s.includes(cell));
    if (hitShip >= 0) {
      picked = picked === hitShip ? null : hitShip;
      grab = picked === null ? 0 : ships[hitShip]!.indexOf(cell);
      note = '';
      return render();
    }
    if (picked === null) return setNote(tx('pickShip'));
    if (!moveShip(picked, cell)) return setNote(tx('noRoom'));
    note = '';
    render();
  }
  /**
   * The owner's pick A (GP2): on a phone a cell is 34 px, so the first tap only aims (a crosshair and the cell's name)
   * and a second tap on it, or the big Fire button, fires; a wrong tap costs nothing. A computer fires on one click.
   */
  let aimAt: number | null = null;
  /**
   * NG1 (owner's pick 7B): on a phone the first tap also zooms the enemy sea into the quarter of that cell (cells twice
   * as big); a second tap on any free cell of the zoomed quarter fires there. "Whole sea" goes back; a shot does too.
   */
  let zoomQ: number | null = null;
  const quarterOf = (cell: number) => (Math.floor(cell / size) >= size / 2 ? 2 : 0) + (cell % size >= size / 2 ? 1 : 0);
  function onTheirs(cell: number): void {
    if (!state || state.phase !== 'play' || state.turn !== mySeat()) return;
    if (state.seas[other()]!.shots.some(([c]) => c === cell)) return;
    if (isPhoneLayout()) {
      if (zoomQ === null || quarterOf(cell) !== zoomQ) {
        zoomQ = quarterOf(cell);
        aimAt = cell;
        playSound('seaAim');
        return render();
      }
    }
    fire(cell);
  }
  function fire(cell: number): void {
    aimAt = null;
    zoomQ = null;
    send({ t: 'shot', cell });
    // The whole sea comes back at once, not when the server's answer arrives.
    render();
  }
  function unzoom(): void {
    zoomQ = null;
    aimAt = null;
    render();
  }
  const wholeSea = el('button', { type: 'button', class: 'btn small-btn sea-whole', hidden: '' }, `↩ ${tx('wholeSea')}`) as HTMLButtonElement;
  wholeSea.addEventListener('click', unzoom);
  // B2's find: over the zoomed grid it covered the bottom cells it was next to (H10 could not be shot in the bottom-right
  // quarter). It sits in the sea's own title row instead, never over a cell.
  theirs.head.append(wholeSea);
  mine.grid.addEventListener('click', (e) => {
    const cell = (e.target as HTMLElement).closest<HTMLElement>('.sea-cell');
    if (cell && !dragged) onMine(Number(cell.dataset.cell));
    dragged = false;
  });
  theirs.grid.addEventListener('click', (e) => {
    const cell = (e.target as HTMLElement).closest<HTMLElement>('.sea-cell');
    if (cell) onTheirs(Number(cell.dataset.cell));
  });
  // Drag a ship (mouse or finger): press on a ship, let go over water.
  let dragging: number | null = null;
  let dragGrab = 0;
  let dragged = false;
  mine.grid.addEventListener('pointerdown', (e) => {
    if (!placing()) return;
    const cell = (e.target as HTMLElement).closest<HTMLElement>('.sea-cell');
    if (!cell) return;
    const i = Number(cell.dataset.cell);
    const ships = myShips();
    const ship = ships.findIndex((s) => s.includes(i));
    if (ship < 0) return;
    // Only a drag starts here; a plain tap picks the ship in the click handler.
    dragging = ship;
    dragGrab = ships[ship]!.indexOf(i);
    dragged = false;
  });
  const onUp = (e: PointerEvent) => {
    if (dragging === null) return;
    const ship = dragging;
    dragging = null;
    const target = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('.sea-mine .sea-cell');
    if (!target) return;
    const cell = Number(target.dataset.cell);
    if (myShips()[ship]!.includes(cell)) return;
    dragged = true;
    picked = ship;
    grab = dragGrab;
    if (!moveShip(ship, cell)) setNote(tx('noRoom'));
    else render();
  };
  document.addEventListener('pointerup', onUp);
  root.addEventListener('keydown', (e) => {
    if ((e.key === 'r' || e.key === 'R') && placing()) {
      e.preventDefault();
      e.stopPropagation();
      // KEYREP: a held R turns the ship once; key-repeat sent a `place` ~30 times a second and could trip the
      // server's per-connection message limit (QUOTA1a).
      if (!e.repeat) turnShip();
    }
  });
  for (const tab of [tabTheirs, tabMine]) {
    tab.addEventListener('click', () => {
      view = tab.dataset.sea as 'mine' | 'theirs';
      viewChosen = true;
      render();
    });
  }
  watchOpen.addEventListener('click', () => {
    watchPop.hidden = !watchPop.hidden;
    watchOpen.setAttribute('aria-expanded', String(!watchPop.hidden));
  });
  const closeWatch = (e: PointerEvent) => {
    if (!watchPop.hidden && !watchPop.contains(e.target as Node) && e.target !== watchOpen) {
      watchPop.hidden = true;
      watchOpen.setAttribute('aria-expanded', 'false');
    }
  };
  document.addEventListener('pointerdown', closeWatch);

  // ---- Drawing ----
  function drawSea(box: typeof mine, seat: number, isMine: boolean): void {
    const s = state!;
    const side = s.seas[seat]!;
    const ships = isMine && placing() ? myShips() : (side.ships ?? (!isMine && revealed ? revealed : []));
    const shipOf = new Map<number, number>();
    ships.forEach((cells, n) => cells.forEach((c) => shipOf.set(c, n)));
    const shot = new Map(side.shots.map(([c, h]) => [c, h]));
    const sunk = new Set(side.sunk.flat());
    const empty = knownEmpty(SEA_RULES, side);
    const myTurn = s.phase === 'play' && s.turn === mySeat() && !isMine;
    box.box.classList.toggle('aim', myTurn);
    // The sea being shot at now (for everyone, watchers too).
    box.box.classList.toggle('target', s.phase === 'play' && seat === 1 - s.turn);
    box.cells.forEach((cell, i) => {
      const h = shot.get(i);
      const ship = shipOf.get(i);
      cell.className = 'sea-cell';
      if (ship !== undefined) cell.classList.add('ship');
      if (ship !== undefined && isMine && placing() && ship === picked) cell.classList.add('picked');
      if (h === 0) cell.classList.add('miss');
      if (h === 1) cell.classList.add('hit');
      if (sunk.has(i)) cell.classList.add('sunk');
      if (h === undefined && empty.has(i)) cell.classList.add('clear');
      if (s.last && s.last.cell === i && s.last.by !== seat) cell.classList.add('last');
      if (!isMine && myTurn && aimAt === i) cell.classList.add('aimed');
      const can = isMine ? placing() : myTurn && h === undefined;
      cell.disabled = !can;
      const what = h === undefined ? (ship !== undefined && (isMine || s.phase === 'over') ? tx('myShip') : tx('water')) : sunk.has(i) ? tx('shotSunk') : h ? tx('shotHit') : tx('shotMiss');
      cell.setAttribute('aria-label', `${cellName(i)}: ${what}`);
    });
  }

  function seatHead(head: HTMLElement, seat: number, label: string): void {
    const p = state!.players[seat];
    const who = p?.bot ? stubArt('opponent', 'sea-avatar sea-bot-avatar') : p ? avatarNode(p.avatar, 'sea-avatar') : el('span', { class: 'sea-avatar vacant' });
    const left = p ? el('span', { class: 'sea-left', title: p.left === 1 ? tx('leftOne') : tx('left', { n: p.left }) }, ...Array.from({ length: p.left }, () => el('i', { 'aria-hidden': 'true' })), el('span', { class: 'sr-only' }, p.left === 1 ? tx('leftOne') : tx('left', { n: p.left }))) : '';
    const ready = state!.phase === 'place' && p?.ready ? el('span', { class: 'sea-ready' }, '✓') : '';
    head.replaceChildren(who, el('span', { class: 'sea-name' }, el('b', {}, label), p ? el('small', {}, p.name) : el('small', {}, tx('waiting'))), ready, left);
    if (head === theirs.head) head.append(wholeSea);
    head.classList.toggle('offline', !!p && !p.online);
  }

  function statusText(): string {
    const s = state!;
    const me = mySeat();
    if (note) return note;
    if (s.players.some((p) => !p)) return tx('waiting');
    if (s.phase === 'place') {
      if (me < 0) return tx('otherPlacing', { name: s.players.find((p) => !p?.ready)?.name ?? '' });
      if (s.players[me]?.ready) return tx('placeWait', { name: nameOfSeat(1 - me) });
      return tx('placeHint');
    }
    if (s.phase === 'over') {
      if (me < 0) return tx('winner', { name: nameOfSeat(s.winner ?? 0) });
      return s.winner === me ? tx('youWin') : tx('youLose', { name: nameOfSeat(1 - me) });
    }
    const last = s.last;
    let said = '';
    if (last) {
      if (last.by === me) said = last.result === 'miss' ? tx('miss') : last.result === 'sunk' ? tx('sunk') : SEA_RULES.again ? tx('hit') : tx('hitOnce');
      else if (me >= 0) said = tx(last.result === 'miss' ? 'theyMiss' : last.result === 'sunk' ? 'theySunk' : 'theyHit', { name: nameOfSeat(last.by) });
    }
    if (aimAt !== null && s.turn === me) return tx('aimed', { cell: cellName(aimAt) });
    const turn = s.turn === me ? tx('yourTurn') : s.players[s.turn]?.bot ? tx('botTurn') : me < 0 ? tx('watchTurn', { name: nameOfSeat(s.turn) }) : tx('theirTurn', { name: nameOfSeat(s.turn) });
    return said ? `${said} ${turn}` : turn;
  }

  function drawBar(): void {
    const s = state!;
    const a = s.players[0];
    const b = s.players[1];
    score.textContent = `${a?.wins ?? 0} – ${b?.wins ?? 0}`; // QA2 (14): the same "0 – 0" as the Classics
    score.setAttribute('aria-label', `${a?.name ?? '?'} ${a?.wins ?? 0}, ${b?.name ?? '?'} ${b?.wins ?? 0}`);
    // Stub: offered to a seated player while the other seat is free (or Stub's), not mid-battle.
    const me = mySeat();
    const opp = me >= 0 ? s.players[1 - me] : null;
    const canBot = me >= 0 && (!opp || !!opp.bot) && s.phase !== 'play';
    botBox.hidden = !canBot && !opp?.bot;
    if (canBot || opp?.bot) {
      const level = (n: 1 | 2, label: string) => {
        const btn = el('button', { type: 'button', class: `btn small-btn sea-bot-level${opp?.bot === n ? ' on' : ''}`, 'aria-pressed': String(opp?.bot === n) }, label);
        btn.addEventListener('click', () => send({ t: 'bot', level: n }));
        return btn;
      };
      const leave = el('button', { type: 'button', class: 'btn small-btn sea-bot-leave', title: tx('botLeave'), 'aria-label': tx('botLeave') }, '✕');
      leave.addEventListener('click', () => send({ t: 'bot', level: 0 }));
      botBox.replaceChildren(
        el('span', { class: 'sea-bot-label' }, stubArt('small', 'sea-bot-icon'), opp?.bot ? '' : tx('bot')),
        ...(canBot || opp?.bot ? [level(1, tx('botEasy')), level(2, tx('botMedium'))] : []),
        opp?.bot && s.phase !== 'play' ? leave : '',
      );
    }
    // QA2 (12): the chip says what the eye counts (people watching, not playing).
    watchOpen.textContent = tx('watchShort', { n: s.watchers.length });
    watchOpen.setAttribute('aria-label', `${tx('watchers')}: ${s.watchers.length}`);
    watchPop.replaceChildren(
      el('b', {}, tx('watchers')),
      s.watchers.length ? el('ul', {}, ...s.watchers.map((w) => el('li', {}, avatarNode(w.avatar, 'sea-avatar small'), w.name))) : el('p', { class: 'muted' }, tx('noWatchers')),
    );
  }

  function drawActions(): void {
    const s = state!;
    const me = mySeat();
    const buttons: HTMLElement[] = [];
    const button = (label: string, cls: string, run: () => void, primary = false) => {
      const b = el('button', { type: 'button', class: `btn ${primary ? '' : 'ghost '}${cls}` }, label);
      b.addEventListener('click', run);
      buttons.push(b);
      return b;
    };
    if (me >= 0 && s.phase === 'place') {
      const ready = !!s.players[me]?.ready;
      if (!ready) {
        button(`🔀 ${tx('shuffle')}`, 'sea-shuffle', () => {
          picked = null;
          send({ t: 'shuffle' });
        });
        button(`↻ ${tx('turn')}`, 'sea-turn', turnShip);
      }
      button(ready ? tx('notReady') : `✓ ${tx('ready')}`, 'sea-ready-btn', () => send({ t: 'ready', on: !ready }), !ready);
    }
    if (me >= 0 && s.phase === 'play' && s.turn === me && aimAt !== null) {
      const at = aimAt;
      button(`🎯 ${tx('fire', { cell: cellName(at) })}`, 'sea-fire', () => fire(at), true);
    }
    if (me >= 0 && s.phase === 'over') button(tx('rematch'), 'sea-rematch', () => send({ t: 'rematch' }), true);
    if (me < 0 && s.players.some((p) => !p || (!p.bot && !p.online))) button(tx('sit'), 'sea-sit', () => send({ t: 'sit' }), true);
    actions.replaceChildren(...buttons);
  }

  function render(): void {
    if (!state) return;
    const s = state;
    const me = mySeat();
    // An aim lasts only while it is still my turn and the cell still free.
    if (aimAt !== null && (s.phase !== 'play' || s.turn !== me || s.seas[other()]!.shots.some(([c]) => c === aimAt))) aimAt = null;
    // The zoom (NG1) lasts as long as the aim does.
    if (aimAt === null) zoomQ = null;
    theirs.frame.classList.toggle('zoomed', zoomQ !== null);
    theirs.frame.dataset.q = zoomQ === null ? '' : String(zoomQ);
    wholeSea.hidden = zoomQ === null;
    wholeSea.textContent = `↩ ${tx('wholeSea')}`;
    wholeSea.title = tx('wholeSeaTitle');
    root.dataset.phase = s.phase;
    root.classList.toggle('watching', me < 0);
    // My sea is seat `me` (or seat 0 for a watcher); "theirs" is the other.
    const mineSeat = me >= 0 ? me : 0;
    const theirSeat = other();
    // A narrow window: placing shows my sea; in battle the sea to look at follows the turn unless chosen.
    if (s.phase === 'place' && me >= 0) view = 'mine';
    else if (!viewChosen && s.phase === 'play') view = s.turn === me || me < 0 ? 'theirs' : 'mine';
    root.dataset.view = view;
    const theirLabel = me >= 0 ? tx('theirSea') : tx('seaOf', { name: nameOfSeat(theirSeat) });
    const mineLabel = me >= 0 ? tx('mySea') : tx('seaOf', { name: nameOfSeat(mineSeat) });
    tabTheirs.textContent = theirLabel;
    tabMine.textContent = mineLabel;
    tabTheirs.setAttribute('aria-selected', String(view === 'theirs'));
    tabMine.setAttribute('aria-selected', String(view === 'mine'));
    theirs.grid.setAttribute('aria-label', theirLabel);
    mine.grid.setAttribute('aria-label', mineLabel);
    seatHead(theirs.head, theirSeat, theirLabel);
    seatHead(mine.head, mineSeat, mineLabel);
    drawSea(theirs, theirSeat, false);
    drawSea(mine, mineSeat, me >= 0);
    drawBar();
    drawActions();
    status.textContent = statusText();
    if (s.phase === 'over' && s.winner !== null) {
      const [a, b] = s.players;
      const rematch = actions.querySelector<HTMLElement>('.sea-rematch');
      result.show({
        key: `${a?.wins ?? 0}:${b?.wins ?? 0}`,
        outcome: me < 0 ? 'over' : s.winner === me ? 'win' : 'lose',
        title: me < 0 ? tx('winner', { name: nameOfSeat(s.winner) }) : s.winner === me ? tx('youWin') : tx('youLose', { name: nameOfSeat(1 - me) }),
        line: `${a?.name ?? '?'} ${a?.wins ?? 0} – ${b?.wins ?? 0} ${b?.name ?? '?'}`,
        actions: rematch ? [rematch] : [],
        see: tx('seeBoard'),
      });
    } else result.hide();
    const reacting = [...referee.classList].filter((c) => c.startsWith('react-')).join(' ');
    referee.className = `sea-ref-mascot${s.phase === 'over' && s.winner === me ? ' cheer' : ''}${s.phase !== 'play' ? ' wait' : ''}${reacting ? ` ${reacting}` : ''}`;
    syncRefereePose(referee);
    setGameLive(me >= 0 && s.phase === 'play' && !s.players.some((p) => p?.bot));
  }

  function sounds(prev: State | null, s: State): void {
    const key = s.last ? `${s.last.by}:${s.last.cell}` : '';
    if (s.last && key !== lastShot && prev) {
      playSound(s.last.result === 'miss' ? 'seaMiss' : s.last.result === 'sunk' ? 'seaSunk' : 'seaHit');
      // GP2: Stub jumps for my hit, gasps when mine is hit (the words are in the status line).
      if (s.last.result !== 'miss' && s.seat >= 0) {
        const mood = s.last.by === s.seat ? 'react-cheer' : 'react-gasp';
        referee.classList.remove('react-cheer', 'react-gasp');
        void referee.offsetWidth;
        referee.classList.add(mood);
        syncRefereePose(referee);
        setTimeout(() => {
          referee.classList.remove(mood);
          syncRefereePose(referee);
        }, 700);
      }
    }
    lastShot = key;
    if (prev && s.phase === 'over' && lastPhase !== 'over' && s.seat >= 0) playSound(s.winner === s.seat ? 'win' : 'lose');
    lastPhase = s.phase;
  }

  // ---- The connection (reconnects when it drops) ----
  let ws: SwmSocket | null = null;
  let stopped = false;
  function connect(): void {
    if (stopped) return;
    const socket = openSocket(`${location.origin.replace(/^http/, 'ws')}/api/sea/${encodeURIComponent(gameId)}/ws`);
    ws = socket;
    socket.addEventListener('open', () => socket.send(JSON.stringify({ t: 'hello', v: SEA_PROTOCOL_VERSION, name, avatar, cid: clientId() } satisfies SeaClientMessage)));
    socket.addEventListener('message', (event) => {
      if (event.data === KEEPALIVE_ACK) return;
      let m: SeaServerMessage;
      try {
        m = JSON.parse(String(event.data)) as SeaServerMessage;
      } catch {
        return;
      }
      if (m.t === 'state') {
        const prev = state;
        if (m.places) places = m.places;
        if (m.phase !== 'place') picked = null;
        if (prev?.phase !== m.phase) {
          viewChosen = false;
          note = '';
          if (m.phase === 'place') revealed = null;
        }
        if (prev && prev.last?.cell !== m.last?.cell) note = '';
        state = m;
        sounds(prev, m);
        render();
      } else if (m.t === 'reveal') {
        revealed = m.ships;
        render();
      } else if (m.t === 'error') {
        if (m.code === 'bad_fleet') setNote(tx('noRoom'));
        else if (m.code === 'full') setNote(tx('full'));
        else if (m.code === 'version') {
          stopped = true;
          setNote(tx('version'));
        }
      }
    });
    socket.addEventListener('close', () => {
      if (ws !== socket || stopped) return;
      status.textContent = tx('reconnecting');
      setTimeout(connect, 1500);
    });
  }
  connect();
  // QUOTA1a: the free keepalive (answered without waking the table), a real ping once a minute (the clock offset).
  const ping = window.setInterval(
    keepaliveTicks(GAME_CLOCK_EVERY, sendKeepalive, () => {
      send({ t: 'ping' });
    }),
    GAME_KEEPALIVE_MS,
  );
  const close = () => {
    stopped = true;
    ws?.close();
  };
  const onLang = () => render();
  addEventListener('pagehide', close);
  addEventListener('langchange', onLang);
  // Test Lab: ready-made moments (the server does them only as a local lab server).
  const offLab = debugHooks.register('table.sea', () => ({
    commands: [
      quiet.command('sea', { en: 'Sea Battle', tr: 'Amiral Battı' }),
      { id: 'sea.bot', title: { en: 'Sea Battle: Stub takes the other seat', tr: 'Amiral Battı: Stub diğer koltuğa otursun' }, help: { en: 'Medium level; only while the other seat is free.', tr: 'Orta seviye; sadece diğer koltuk boşken.' }, tab: 'games' as const, available: () => (!!state && state.seat >= 0) || { en: 'take a seat at the table first', tr: 'önce masada bir koltuğa otur' }, where: { en: 'at a Sea Battle table, seated', tr: 'Amiral Battı masasında, oturmuşken' }, run: () => send({ t: 'bot', level: 2 }) },
      { id: 'sea.oneLeft', title: { en: 'Sea Battle: one ship left each', tr: 'Amiral Battı: herkese tek gemi kalsın' }, help: { en: 'Local lab server only: everything but the last ship of each fleet is sunk, my turn.', tr: 'Sadece yerel test sunucusunda: iki filonun da son gemisi dışında hepsi batar, sıra bende.' }, tab: 'games' as const, available: () => !labServerHere() ? LOCAL_ONLY : (!!state && state.seat >= 0 && state.phase === 'play') || { en: 'only during the battle (both fleets ready)', tr: 'sadece savaş sırasında (iki filo da hazır)' }, where: { en: 'at a Sea Battle table, seated', tr: 'Amiral Battı masasında, oturmuşken' }, run: () => send({ t: 'lab', op: 'oneLeft' }) },
      { id: 'sea.zoom', title: { en: 'Sea Battle: zoom into the next quarter (phone view)', tr: 'Amiral Battı: sonraki çeyreğe yakınlaş (telefon görünümü)' }, help: { en: 'Shows the phone zoom on any screen: each run aims at the middle of the next quarter of their sea; Whole sea goes back.', tr: 'Telefondaki yakınlaşmayı her ekranda gösterir: her çalıştırmada rakibin denizinin sonraki çeyreğinin ortasına nişan alır; Bütün deniz geri döner.' }, tab: 'games' as const, available: () => (!!state && state.phase === 'play') || { en: 'only during the battle (both fleets ready)', tr: 'sadece savaş sırasında (iki filo da hazır)' }, where: { en: 'at a Sea Battle table, during the battle', tr: 'Amiral Battı masasında, savaş sırasında' }, run: () => { const q = zoomQ === null ? 0 : (zoomQ + 1) % 4; const half = size / 2; zoomQ = q; aimAt = (Math.floor(q / 2) * half + Math.floor(half / 2)) * size + (q % 2) * half + Math.floor(half / 2); render(); } },
      { id: 'sea.reveal', title: { en: 'Sea Battle: show their fleet (this tab)', tr: 'Amiral Battı: rakibin filosunu göster (bu sekmede)' }, help: { en: 'Local lab server only: the other fleet shows faintly on their sea.', tr: 'Sadece yerel test sunucusunda: rakibin filosu kendi denizinde silik görünür.' }, tab: 'games' as const, available: () => !labServerHere() ? LOCAL_ONLY : (!!state && state.seat >= 0 && state.phase !== 'over') || { en: 'take a seat at the table first', tr: 'önce masada bir koltuğa otur' }, where: { en: 'at a Sea Battle table, seated', tr: 'Amiral Battı masasında, oturmuşken' }, run: () => send({ t: 'lab', op: 'reveal' }) },
    ],
  }));
  // GP2: the same "How to play" cards as every game (first time, and the "?" in the head).
  const how = tableHowTo(app, 'sea:howSeen', () => [
    { art: sea1Art, title: tx('how1'), line: tx('how1Line') },
    { art: sea2Art, title: tx('how2'), line: tx('how2Line') },
    { art: sea3Art, title: tx('how3'), line: tx('how3Line') },
  ]);
  return () => {
    offLab();
    how.destroy();
    document.removeEventListener('pointerdown', closeWatch);
    document.removeEventListener('pointerup', onUp);
    setGameLive(false);
    close();
    clearInterval(ping);
    removeEventListener('pagehide', close);
    removeEventListener('langchange', onLang);
  };
}
