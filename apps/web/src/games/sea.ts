// 🚢 Sea Battle, the page (Game Studio, notes in docs/internal/design/games/sea-battle.md). A lazy chunk with its own
// texts (EN + TR). The server holds both fleets; this page only ever knows my own ships (and, after the game, both).
// Placing: a random fleet comes from the server; drag a ship (it snaps to the nearest spot that fits), tap it (or R) to
// turn it, or pick it and tap water. Shooting: tap a cell of the enemy sea on my turn. SB2: a sunk fleet goes out with
// a short explosion and "ALEX SANK!".
import './sea.css';
import { OPEN, openSocket, type SwmSocket } from '@swm/shared/socket';
import {
  SEA_MAX_SEATS,
  SEA_PROTOCOL_VERSION,
  SEA_RULES,
  checkFleet,
  knownEmpty,
  nearestPlace,
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
import { watchLink } from './link-watch.ts';
import { GAME_CLOCK_EVERY, GAME_KEEPALIVE_MS, KEEPALIVE, KEEPALIVE_ACK, keepaliveTicks } from '@swm/shared/keepalive';

type State = Extract<SeaServerMessage, { t: 'state' }>;

const TEXT = {
  en: {
    theirSea: 'Their sea',
    mySea: 'My sea',
    seaOf: "{name}'s sea",
    waiting: 'Waiting for a second player…',
    placeHint: 'Place your fleet: drag a ship onto the sea, tap it (or R) to turn it. Then Ready.',
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
    bot: 'Play against Stub (our bot)',
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
    how1Line: 'Drag your ships where you like (tap one, or press R, to turn it) or shuffle them; they may not touch. Then press Ready.',
    how2: 'Call your shots',
    how2Line: 'Tap a cell on their sea. A hit shoots again; a miss passes the turn.',
    how3: 'Sink them all',
    how3Line: 'A sunk ship shows the water around it. Sink the whole fleet first to win.',
    how4: 'Three or more players',
    how4Line: 'On your turn, tap a friend’s chip to pick their sea, then fire. A player with no ships left is out and watches; the last fleet afloat wins.',
    targets: 'Seas',
    targetChip: "{name}'s sea: {left}",
    myChip: 'My sea: {left}',
    outTag: 'Sunk',
    yourTurnMany: 'Your turn: pick a sea, then a cell',
    placeWaitAll: 'Ready. Waiting for the others…',
    shotAt: '{name} fired at {target}: {what}.',
    youOut: 'Your fleet is sunk: you watch the rest.',
    yourPlace: 'You came {place}.',
    places: 'Places',
    afloat: '🚢 {n} left',
    aimsAt: '{name} aims at {target}’s sea',
    aimsAtMe: '{name} aims at you!',
    sank: '{name} SANK!',
    sankMe: 'YOUR FLEET SANK!',
    sankLine: 'Every ship of {name} is under water.',
    sankLineMe: 'Every ship of yours is under water.',
  },
  tr: {
    theirSea: 'Onun denizi',
    mySea: 'Benim denizim',
    seaOf: '{name} denizi',
    waiting: 'İkinci oyuncu bekleniyor…',
    placeHint: 'Filonu yerleştir: gemiyi denize sürükle, döndürmek için ona dokun (ya da R). Sonra Hazır.',
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
    bot: 'Stub’a (bota) karşı oyna',
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
    how1Line: 'Gemilerini istediğin yere sürükle (döndürmek için dokun ya da R’ye bas) veya karıştır; birbirine değemezler. Sonra Hazır de.',
    how2: 'Atışını yap',
    how2Line: 'Onların denizinde bir kareye dokun. İsabet edersen yine atarsın; ıska sırayı geçirir.',
    how3: 'Hepsini batır',
    how3Line: 'Batan geminin çevresindeki su görünür. Bütün filoyu ilk batıran kazanır.',
    how4: 'Üç ve daha fazla oyuncu',
    how4Line: 'Sıra sende olunca bir arkadaşının çipine dokunup denizini seç, sonra ateş et. Gemisi kalmayan oyundan çıkar ve izler; son kalan filo kazanır.',
    targets: 'Denizler',
    targetChip: '{name} denizi: {left}',
    myChip: 'Benim denizim: {left}',
    outTag: 'Battı',
    yourTurnMany: 'Sıra sende: bir deniz, sonra bir kare seç',
    placeWaitAll: 'Hazırsın. Diğerleri bekleniyor…',
    shotAt: '{name}, {target} oyuncusuna ateş etti: {what}.',
    youOut: 'Filon battı: kalanları izliyorsun.',
    yourPlace: 'Sen {place} oldun.',
    places: 'Sıralama',
    afloat: '🚢 {n} kaldı',
    aimsAt: '{name}, {target} denizine nişan alıyor',
    aimsAtMe: '{name} sana nişan alıyor!',
    sank: '{name} BATTI!',
    sankMe: 'FİLON BATTI!',
    sankLine: '{name} oyuncusunun bütün gemileri suyun altında.',
    sankLineMe: 'Bütün gemilerin suyun altında.',
  },
} as const;

const tx = (key: keyof (typeof TEXT)['en'], values: Record<string, string | number> = {}): string =>
  (lang() === 'tr' ? TEXT.tr : TEXT.en)[key].replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ''));


const COLS = 'ABCDEFGHIJ';
/** GMP b: "1st", "2nd"… (EN) or "1.", "2."… (TR). */
const placeName = (n: number): string => (lang() === 'tr' ? `${n}.` : `${n}${n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'}`);

/** Mounts Sea Battle into `app`; the returned function closes the connection and timers. */
export function mountSea(app: HTMLElement, gameId: string, name: string, avatar: Avatar): () => void {
  const size = SEA_RULES.size;
  const root = el('div', { class: 'sea', 'data-phase': 'place' });
  // The table's id, for the harnesses (GMP b: the games sweep seats five more players at it).
  root.dataset.table = gameId;
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
  /** GMP b: the sea picked with the chips (a player's target, or the sea a watcher looks at). */
  let chosenTarget: number | null = null;
  /** SB2: my last target, picked again when my turn comes back. */
  let myTarget: number | null = null;
  /** SB2: with three or more, the shooter's live aim (the server passes it on): whose sea, which cell. */
  let follow: { by: number; target: number; cell: number | null } | null = null;
  let lastShot = '';
  let lastPhase = '';
  let note = '';
  /** SB2: the ship that just sank (its cells wobble and go under for a moment). */
  let justSunk: { seat: number; cells: Set<number> } | null = null;
  /** SB2: the seats whose fleet just went under (their chip pops its ✕), and until when the "ALEX SANK!" moment shows. */
  const justOut = new Set<number>();
  let sankUntil = 0;

  // ---- The layout ----
  const score = el('span', { class: 'sea-score' });
  const botBox = el('span', { class: 'sea-bot' });
  const watchOpen = el('button', { type: 'button', class: 'btn small-btn sea-watch-open', 'aria-expanded': 'false' });
  const watchPop = el('section', { class: 'card sea-watch-pop', hidden: '' });
  // GMP b: with three or more players a row of chips (in the bar) picks the sea in the big box (a player's target).
  const targets = el('div', { class: 'sea-targets', role: 'group', hidden: '' });
  const bar = el('div', { class: 'sea-bar' }, score, botBox, targets, el('span', { class: 'sea-gap' }), watchOpen, watchPop);
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
  // SB2: "ALEX SANK!": a short explosion over the seas when a whole fleet goes under (before the result card).
  const sankText = el('b', { class: 'sea-sank-title' });
  const sankLine = el('span', { class: 'sea-sank-line' });
  const sankBox = el('div', { class: 'sea-sank', role: 'status', 'aria-live': 'assertive', hidden: '' }, el('span', { class: 'sea-sank-boom', 'aria-hidden': 'true' }, ...Array.from({ length: 8 }, (_, k) => el('i', { style: `--k:${k}` }))), sankText, sankLine);
  seas.append(sankBox);
  let sankTimer = 0;
  const SANK_MS = 2200;
  /** Shows "{NAME} SANK!" for `seat` (mine: "YOUR FLEET SANK!"); the result card waits until it is over. */
  function showSank(seat: number): void {
    const who = nameOfSeat(seat);
    const me = seat === mySeat();
    const upper = who.toLocaleUpperCase(lang() === 'tr' ? 'tr' : 'en');
    sankText.textContent = me ? tx('sankMe') : tx('sank', { name: upper });
    sankLine.textContent = me ? tx('sankLineMe') : tx('sankLine', { name: who });
    sankBox.dataset.me = String(me);
    // First look: held inside the sea that sank when it is on screen (else over both seas), never over the other board.
    const host = state && seat === other() ? theirs.box : state && seat === (mySeat() >= 0 ? mySeat() : many() ? watcherMine() : 0) ? mine.box : seas;
    if (sankBox.parentElement !== host) host.append(sankBox);
    sankBox.hidden = false;
    // Restart the animation for a second fleet in a row.
    sankBox.classList.remove('go');
    void sankBox.offsetWidth;
    sankBox.classList.add('go');
    sankUntil = Date.now() + SANK_MS;
    justOut.add(seat);
    clearTimeout(sankTimer);
    sankTimer = window.setTimeout(() => {
      sankBox.hidden = true;
      sankBox.classList.remove('go');
      justOut.clear();
      render();
    }, SANK_MS);
  }
  const referee = stubArt('referee', 'sea-ref-mascot');
  const status = el('p', { class: 'sea-status', role: 'status', 'aria-live': 'polite' });
  const actions = el('div', { class: 'sea-actions' });
  root.append(bar, switcher, seas, el('div', { class: 'sea-ref' }, referee, status), actions);

  // ---- Helpers ----
  const mySeat = () => state?.seat ?? -1;
  /** GMP b: three or more seats. */
  const many = () => (state?.players.length ?? 2) > 2;
  const isOut = (i: number) => !!state?.players[i]?.out;
  /** The sea in a watcher's small box with three or more: the seat whose turn it is (seat 1 before the battle). */
  const watcherMine = () => (state?.phase === 'play' ? state.turn : 0);
  /** Whether seat `i`'s sea may go in the big box: never my own (or a watcher's small one); a player aims only at fleets afloat. */
  function canShow(i: number): boolean {
    const s = state;
    if (!s || i < 0 || i >= s.players.length || !s.players[i]) return false;
    const me = mySeat();
    if (i === (me >= 0 ? me : watcherMine())) return false;
    return me < 0 || s.phase !== 'play' || !isOut(i);
  }
  /**
   * The seat whose sea is in the big ("theirs") box. Two players: the other seat. More (GMP b): the chip picked, else for a
   * watcher the sea last shot at, else the next fleet afloat after me (or after the shooter).
   */
  function other(): number {
    const s = state;
    const me = mySeat();
    if (!s || !many()) return me === -1 ? 1 : 1 - me;
    if (chosenTarget !== null && canShow(chosenTarget)) return chosenTarget;
    // SB2: on someone else's turn the big box follows the shooter: the sea they aim at, else the sea they last shot at.
    if (following()) {
      if (follow && canShow(follow.target)) return follow.target;
      if (s.last?.by === s.turn && s.last.target !== undefined && canShow(s.last.target)) return s.last.target;
    }
    // A watcher, or a player whose fleet sank, follows the sea last shot at.
    if ((me < 0 || isOut(me)) && s.last?.target !== undefined && canShow(s.last.target)) return s.last.target;
    const n = s.players.length;
    const from = me >= 0 ? me : watcherMine();
    for (const afloat of [true, false]) {
      for (let k = 1; k < n; k++) {
        const i = (from + k) % n;
        if (canShow(i) && (!afloat || !isOut(i))) return i;
      }
    }
    return me === 0 ? 1 : 0;
  }
  /** SB2: three or more, in battle, and someone else shoots: the second view follows them. */
  function following(): boolean {
    const s = state;
    return !!s && many() && s.phase === 'play' && s.turn !== mySeat();
  }
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
    // SB2: no room right there: the nearest spot where it fits turned.
    const near = nearestPlace(SEA_RULES, places, picked, r, c, !p.down, 2);
    if (near) {
      places = places.map((q, i) => (i === picked ? near : q));
      send({ t: 'place', ships: places });
      note = '';
      return render();
    }
    setNote(tx('noRoom'));
  }

  // ---- Clicks on the seas ----
  function onMine(cell: number): void {
    if (!placing()) return;
    const ships = myShips();
    const hitShip = ships.findIndex((s) => s.includes(cell));
    if (hitShip >= 0) {
      // SB2: a tap on the picked ship turns it; a tap on another ship picks that one.
      if (picked === hitShip) return turnShip();
      picked = hitShip;
      grab = ships[hitShip]!.indexOf(cell);
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
  /**
   * SB2: my live aim for the others' second view (three or more, my turn): the sea in my big box and the cell under my
   * pointer (or my phone's aim). At most one message every 150 ms, the latest one last; nothing when it didn't change.
   */
  let aimSent = '';
  let aimAtMs = 0;
  let aimTimer = 0;
  let aimCell: number | null = null;
  function queueAim(cell: number | null): void {
    aimCell = cell;
    if (!state || !many() || state.phase !== 'play' || state.turn !== mySeat()) return;
    const wait = aimAtMs + 150 - Date.now();
    if (wait > 0) {
      if (!aimTimer) aimTimer = window.setTimeout(flushAim, wait);
      return;
    }
    flushAim();
  }
  function flushAim(): void {
    aimTimer = 0;
    if (!state || !many() || state.phase !== 'play' || state.turn !== mySeat()) return;
    const target = other();
    const key = `${target}:${aimCell}`;
    if (key === aimSent) return;
    aimSent = key;
    aimAtMs = Date.now();
    send({ t: 'aim', target, cell: aimCell });
  }
  theirs.grid.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const cell = (e.target as HTMLElement).closest<HTMLElement>('.sea-cell');
    queueAim(cell ? Number(cell.dataset.cell) : null);
  });
  theirs.grid.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'mouse') queueAim(null);
  });
  function onTheirs(cell: number): void {
    if (!state || state.phase !== 'play' || state.turn !== mySeat()) return;
    if (state.seas[other()]!.shots.some(([c]) => c === cell)) return;
    if (isPhoneLayout()) {
      if (zoomQ === null || quarterOf(cell) !== zoomQ) {
        zoomQ = quarterOf(cell);
        aimAt = cell;
        queueAim(cell);
        playSound('seaAim');
        return render();
      }
    }
    fire(cell);
  }
  function fire(cell: number): void {
    aimAt = null;
    zoomQ = null;
    myTarget = other();
    send({ t: 'shot', cell, target: myTarget });
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
  });
  theirs.grid.addEventListener('click', (e) => {
    const cell = (e.target as HTMLElement).closest<HTMLElement>('.sea-cell');
    if (cell) onTheirs(Number(cell.dataset.cell));
  });
  /**
   * SB2: drag a ship (mouse or finger) straight onto the sea. While it moves, a gold ghost shows the nearest spot that
   * fits (`nearestPlace`), a red one when nothing fits near; letting go puts it there. R turns it mid-drag.
   */
  interface Drag { ship: number; grab: number; down: boolean; id: number; x: number; y: number; moved: boolean; row: number; col: number; spot: ShipPlace | null }
  let drag: Drag | null = null;
  let dragged = false;
  /** The cell under a point of my sea (may be off the sea: then row / col run past its edges). */
  function cellAt(x: number, y: number): { row: number; col: number } {
    const rect = mine.grid.getBoundingClientRect();
    const pad = 4;
    const step = (rect.width - pad * 2) / size;
    return { row: Math.floor((y - rect.top - pad) / step), col: Math.floor((x - rect.left - pad) / step) };
  }
  function aimDrag(x: number, y: number): void {
    if (!drag) return;
    const { row, col } = cellAt(x, y);
    drag.row = drag.down ? row - drag.grab : row;
    drag.col = drag.down ? col : col - drag.grab;
    drag.spot = nearestPlace(SEA_RULES, places, drag.ship, drag.row, drag.col, drag.down, 2);
  }
  mine.grid.addEventListener('pointerdown', (e) => {
    if (!placing() || e.button > 0) return;
    const cell = (e.target as HTMLElement).closest<HTMLElement>('.sea-cell');
    if (!cell) return;
    const i = Number(cell.dataset.cell);
    const ships = myShips();
    const ship = ships.findIndex((s) => s.includes(i));
    if (ship < 0) return;
    // Only a drag starts here; a plain tap picks (or turns) the ship in the click handler.
    drag = { ship, grab: ships[ship]!.indexOf(i), down: places[ship]!.down, id: e.pointerId, x: e.clientX, y: e.clientY, moved: false, row: 0, col: 0, spot: null };
    dragged = false;
  });
  mine.grid.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;
    // Captured only once it is a drag: a plain tap keeps its click on the cell (a capture moves the click to the grid).
    if (!drag.moved) {
      try {
        mine.grid.setPointerCapture(e.pointerId);
      } catch {
        // A synthetic event has no pointer to capture.
      }
    }
    drag.moved = true;
    drag.x = e.clientX;
    drag.y = e.clientY;
    aimDrag(e.clientX, e.clientY);
    render();
  });
  const endDrag = (e: PointerEvent, drop: boolean) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    if (!d.moved) return;
    // The click that follows a drag must not pick a ship or move one.
    dragged = true;
    setTimeout(() => (dragged = false), 0);
    if (drop && placing()) {
      if (d.spot) {
        places = places.map((p, i) => (i === d.ship ? d.spot! : p));
        send({ t: 'place', ships: places });
        picked = d.ship;
        grab = 0;
        note = '';
        playSound('seaAim');
      } else note = tx('noRoom');
    }
    render();
  };
  mine.grid.addEventListener('pointerup', (e) => {
    if (drag && drag.moved) aimDrag(e.clientX, e.clientY);
    endDrag(e, true);
  });
  mine.grid.addEventListener('pointercancel', (e) => endDrag(e, false));
  root.addEventListener('keydown', (e) => {
    if ((e.key === 'r' || e.key === 'R') && placing()) {
      e.preventDefault();
      e.stopPropagation();
      // SB2: R mid-drag turns the ship being dragged (around the cell held).
      if (drag?.moved) {
        if (!e.repeat) {
          drag.down = !drag.down;
          aimDrag(drag.x, drag.y);
          render();
        }
        return;
      }
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
    const shotAt = !many() ? 1 - s.turn : following() && follow ? follow.target : s.last?.by === s.turn ? (s.last.target ?? -1) : -1;
    // SB2: the shooter's live pointer on the sea they aim at.
    const peer = following() && follow && follow.target === seat ? follow.cell : null;
    box.box.classList.toggle('target', s.phase === 'play' && seat === shotAt);
    // SB2: a ship being dragged: its old cells fade, the ghost shows where it would land (red when nothing fits near).
    const lifting = new Set<number>();
    const ghost = new Set<number>();
    let ghostBad = false;
    if (isMine && placing() && drag?.moved) {
      for (const c of ships[drag.ship] ?? []) lifting.add(c);
      const len = SEA_RULES.fleet[drag.ship]!;
      const spot = drag.spot ?? { at: drag.row * size + drag.col, down: drag.down };
      ghostBad = !drag.spot;
      // Nothing fits near: the red ghost stays whole on the sea, at the edge nearest the pointer.
      const row0 = Math.max(0, Math.min(size - (drag.down ? len : 1), drag.row));
      const col0 = Math.max(0, Math.min(size - (drag.down ? 1 : len), drag.col));
      for (let k = 0; k < len; k++) {
        const r = drag.spot ? Math.floor(spot.at / size) + (spot.down ? k : 0) : row0 + (drag.down ? k : 0);
        const c = drag.spot ? (spot.at % size) + (spot.down ? 0 : k) : col0 + (drag.down ? 0 : k);
        if (r >= 0 && r < size && c >= 0 && c < size) ghost.add(r * size + c);
      }
    }
    box.box.classList.toggle('dragging', lifting.size > 0);
    // SB2: the ship that just sank wobbles and goes under for a moment.
    const sinking = justSunk && justSunk.seat === seat ? justSunk.cells : null;
    box.cells.forEach((cell, i) => {
      const h = shot.get(i);
      const ship = shipOf.get(i);
      cell.className = 'sea-cell';
      if (ship !== undefined) cell.classList.add('ship');
      if (ship !== undefined && isMine && placing() && ship === picked && !lifting.size) cell.classList.add('picked');
      if (lifting.has(i)) cell.classList.add('lifting');
      if (ghost.has(i)) cell.classList.add('ghost', ...(ghostBad ? ['bad'] : []));
      if (sinking?.has(i)) cell.classList.add('sinking');
      if (peer === i) cell.classList.add('peer-aim');
      if (h === 0) cell.classList.add('miss');
      if (h === 1) cell.classList.add('hit');
      if (sunk.has(i)) cell.classList.add('sunk');
      if (h === undefined && empty.has(i)) cell.classList.add('clear');
      if (s.last && s.last.cell === i && (s.last.target ?? 1 - s.last.by) === seat) cell.classList.add('last');
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
    const out = p?.out || (p && p.left === 0 && state!.phase !== 'place') ? el('span', { class: 'sea-out' }, `✕ ${tx('outTag')}`) : '';
    head.replaceChildren(who, el('span', { class: 'sea-name' }, el('b', {}, label), p ? el('small', {}, p.name) : el('small', {}, tx('waiting'))), ready, out || left);
    head.classList.toggle('out', !!p?.out);
    head.classList.toggle('just-out', justOut.has(seat) && !!p && p.left === 0);
    if (head === theirs.head) head.append(wholeSea);
    head.classList.toggle('offline', !!p && !p.online);
  }

  function statusText(): string {
    const s = state!;
    const me = mySeat();
    if (note) return note;
    if (s.players.length < 2 || s.players.some((p) => !p)) return tx('waiting');
    if (s.phase === 'place') {
      if (me < 0) return tx('otherPlacing', { name: s.players.find((p) => !p?.ready)?.name ?? '' });
      if (s.players[me]?.ready) return many() ? tx('placeWaitAll') : tx('placeWait', { name: nameOfSeat(1 - me) });
      return tx('placeHint');
    }
    if (s.phase === 'over') {
      if (me < 0) return tx('winner', { name: nameOfSeat(s.winner ?? 0) });
      const place = many() && s.winner !== me && s.ranks?.[me] ? ` ${tx('yourPlace', { place: placeName(s.ranks[me]!) })}` : '';
      return overTitle() + place;
    }
    const last = s.last;
    let said = '';
    if (last) {
      if (last.by === me) said = last.result === 'miss' ? tx('miss') : last.result === 'sunk' ? tx('sunk') : SEA_RULES.again ? tx('hit') : tx('hitOnce');
      else if (many() && last.target !== undefined && last.target !== me) said = tx('shotAt', { name: nameOfSeat(last.by), target: nameOfSeat(last.target), what: tx(last.result === 'miss' ? 'shotMiss' : last.result === 'sunk' ? 'shotSunk' : 'shotHit') });
      else if (me >= 0) said = tx(last.result === 'miss' ? 'theyMiss' : last.result === 'sunk' ? 'theySunk' : 'theyHit', { name: nameOfSeat(last.by) });
    }
    if (me >= 0 && isOut(me)) said = `${tx('youOut')} ${said}`.trim();
    if (aimAt !== null && s.turn === me) return tx('aimed', { cell: cellName(aimAt) });
    // SB2: with three or more, who the shooter aims at (live).
    const aiming = following() && follow ? (follow.target === me ? tx('aimsAtMe', { name: nameOfSeat(s.turn) }) : tx('aimsAt', { name: nameOfSeat(s.turn), target: nameOfSeat(follow.target) })) : '';
    const turn = aiming ? aiming : s.turn === me ? tx(many() ? 'yourTurnMany' : 'yourTurn') : s.players[s.turn]?.bot ? tx('botTurn') : me < 0 || isOut(me) ? tx('watchTurn', { name: nameOfSeat(s.turn) }) : tx('theirTurn', { name: nameOfSeat(s.turn) });
    return said ? `${said} ${turn}` : turn;
  }

  /** The result's title: who won, from where this tab sits. */
  function overTitle(): string {
    const s = state!;
    const me = mySeat();
    if (me < 0) return tx('winner', { name: nameOfSeat(s.winner ?? 0) });
    if (s.winner === me) return tx('youWin');
    // GMP b: with three or more the place comes on the result's line ("You came 3rd.").
    return many() ? tx('winner', { name: nameOfSeat(s.winner ?? 0) }) : tx('youLose', { name: nameOfSeat(1 - me) });
  }

  /** GMP b: the places at the end of a game of three or more (the result card's list). */
  function placesList(s: State): HTMLElement {
    const order = s.players.map((p, i) => ({ p, i, rank: s.ranks?.[i] ?? 0 })).filter((x) => x.p).sort((x, y) => x.rank - y.rank);
    return el(
      'ol',
      { class: 'sea-places', 'aria-label': tx('places') },
      ...order.map(({ p, i, rank }) => el('li', { class: i === s.seat ? 'me' : '' }, el('b', { class: 'sea-place' }, placeName(rank)), avatarNode(p!.avatar, 'sea-avatar small'), el('span', { class: 'sea-place-name' }, p!.name), el('span', { class: 'sea-place-left' }, rank === 1 ? tx('afloat', { n: p!.left }) : `✕ ${tx('outTag')}`))),
    );
  }

  /**
   * GMP b: one chip per sea, with its ships left; a sunk fleet is crossed out. A chip puts that sea in the big box (a
   * player's target; a fleet that sank can't be picked). In a narrow window the seas show one at a time, so the chips
   * replace the two tabs: my own chip (a watcher: the shooter's) shows the small box's sea.
   */
  function drawTargets(): void {
    const s = state!;
    targets.hidden = !many();
    if (!many()) return void targets.replaceChildren();
    const me = mySeat();
    const shown = other();
    const small = me >= 0 ? me : watcherMine();
    targets.setAttribute('aria-label', tx('targets'));
    targets.replaceChildren(
      ...s.players.flatMap((p, i) => {
        if (!p) return [];
        const left = p.out ? tx('outTag') : p.left === 1 ? tx('leftOne') : tx('left', { n: p.left });
        const isSmall = i === small;
        const pressed = isSmall ? view === 'mine' : i === shown && view === 'theirs';
        const chip = el(
          'button',
          { type: 'button', class: `sea-target${isSmall ? ' small-sea' : ''}${i === me ? ' me' : ''}${p.out ? ' out' : ''}${justOut.has(i) ? ' just-out' : ''}${s.phase === 'play' && s.turn === i ? ' turn' : ''}`, 'data-seat': String(i), 'aria-pressed': String(pressed), 'aria-label': i === me ? tx('myChip', { left }) : tx('targetChip', { name: p.name, left }), title: i === me ? tx('mySea') : p.name },
          avatarNode(p.avatar, 'sea-avatar small'),
          el('span', { class: 'sea-target-name' }, p.name),
          el('span', { class: 'sea-target-left', 'aria-hidden': 'true' }, p.out ? '✕' : el('span', { class: 'sea-target-ship' }, '🚢'), p.out ? '' : String(p.left)),
        ) as HTMLButtonElement;
        chip.disabled = !isSmall && !canShow(i);
        chip.addEventListener('click', () => {
          if (isSmall) view = 'mine';
          else {
            chosenTarget = i;
            view = 'theirs';
          }
          if (state?.turn === mySeat()) {
            myTarget = i;
            // The others' view follows my pick at once (the cell comes with my pointer).
            aimSent = '';
            window.setTimeout(() => queueAim(null), 0);
          }
          aimAt = null;
          zoomQ = null;
          viewChosen = true;
          render();
        });
        return [chip];
      }),
    );
  }

  function drawBar(): void {
    const s = state!;
    const a = s.players[0];
    const b = s.players[1];
    // GMP b: with three or more the wins show in the places list at the end, not as a long "0 – 0 – 0" here.
    score.hidden = many();
    if (!many()) {
      score.textContent = `${a?.wins ?? 0} – ${b?.wins ?? 0}`; // QA2 (14): the same "0 – 0" as the Classics
      score.setAttribute('aria-label', `${a?.name ?? '?'} ${a?.wins ?? 0}, ${b?.name ?? '?'} ${b?.wins ?? 0}`);
    }
    // Stub: offered to a seated player while the other seat is free (or Stub's), not mid-battle; two seats only.
    const me = mySeat();
    const opp = me >= 0 && !many() ? s.players[1 - me] : null;
    const canBot = me >= 0 && !many() && (!opp || !!opp.bot) && s.phase !== 'play';
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
    // GMP b: beside the sea chips only the number fits ("👁 2"); the label says the rest.
    watchOpen.textContent = many() ? `👁 ${s.watchers.length}` : tx('watchShort', { n: s.watchers.length });
    // PH2: the phone's Games tab hides a 👁 nobody is behind (its bar is one row there).
    watchOpen.dataset.n = String(s.watchers.length);
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
    // GMP b: a watcher may also take a new seat before the battle (up to six), unless Stub plays.
    const room = s.phase !== 'play' && s.players.length < SEA_MAX_SEATS && !s.players.some((p) => p?.bot);
    if (me < 0 && (room || s.players.some((p) => !p || (!p.bot && !p.online)))) button(tx('sit'), 'sea-sit', () => send({ t: 'sit' }), true);
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
    root.classList.toggle('many', many());
    // SB2: someone else shoots (three or more) and aims at me: my own sea is the big one (else the followed sea is).
    root.classList.toggle('following', following() && me >= 0 && follow?.target === me);
    root.dataset.count = String(s.players.length);
    // My sea is seat `me` (or seat 0 for a watcher; with three or more, the shooter's); "theirs" is the other.
    const mineSeat = me >= 0 ? me : many() ? watcherMine() : 0;
    const theirSeat = other();
    // A narrow window: placing shows my sea; in battle the sea to look at follows the turn unless chosen.
    if (s.phase === 'place' && me >= 0) view = 'mine';
    // A watcher (GMP) looks at the sea being shot at: seat 1's ("theirs") on seat 0's turn, seat 0's on seat 1's.
    else if (!viewChosen && following() && me >= 0 && !isOut(me)) view = follow && follow.target !== me ? 'theirs' : 'mine';
    else if (!viewChosen && s.phase === 'play') view = me < 0 ? (many() || s.turn === mineSeat ? 'theirs' : 'mine') : s.turn === me || isOut(me) ? 'theirs' : 'mine';
    root.dataset.view = view;
    const theirLabel = me >= 0 && !many() ? tx('theirSea') : tx('seaOf', { name: nameOfSeat(theirSeat) });
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
    drawTargets();
    drawActions();
    status.textContent = statusText();
    if (s.phase === 'over' && s.winner !== null && Date.now() < sankUntil) result.hide();
    else if (s.phase === 'over' && s.winner !== null) {
      const [a, b] = s.players;
      const rematch = actions.querySelector<HTMLElement>('.sea-rematch');
      result.show({
        key: s.players.map((p) => p?.wins ?? 0).join(':'),
        outcome: me < 0 ? 'over' : s.winner === me ? 'win' : 'lose',
        title: overTitle(),
        line: many() ? (me >= 0 && s.ranks?.[me] ? tx('yourPlace', { place: placeName(s.ranks[me]!) }) : '') : `${a?.name ?? '?'} ${a?.wins ?? 0} – ${b?.wins ?? 0} ${b?.name ?? '?'}`,
        actions: rematch ? [rematch] : [],
        see: tx('seeBoard'),
        extra: many() ? placesList(s) : null,
      });
    } else result.hide();
    const reacting = [...referee.classList].filter((c) => c.startsWith('react-')).join(' ');
    referee.className = `sea-ref-mascot${s.phase === 'over' && s.winner === me ? ' cheer' : ''}${s.phase !== 'play' ? ' wait' : ''}${reacting ? ` ${reacting}` : ''}`;
    syncRefereePose(referee);
    setGameLive(me >= 0 && s.phase === 'play' && !s.players.some((p) => p?.bot));
  }

  function sounds(prev: State | null, s: State): void {
    const key = s.last ? `${s.last.by}:${s.last.target ?? ''}:${s.last.cell}` : '';
    if (s.last && key !== lastShot && prev) {
      playSound(s.last.result === 'miss' ? 'seaMiss' : s.last.result === 'sunk' ? 'seaSunk' : 'seaHit');
      // GP2: Stub jumps for my hit, gasps when mine is hit (the words are in the status line).
      if (s.last.result !== 'miss' && s.seat >= 0) {
        const mood = s.last.by === s.seat ? 'react-cheer' : (s.last.target ?? s.seat) === s.seat ? 'react-gasp' : '';
        referee.classList.remove('react-cheer', 'react-gasp');
        if (mood) {
          void referee.offsetWidth;
          referee.classList.add(mood);
          syncRefereePose(referee);
          setTimeout(() => {
            referee.classList.remove(mood);
            syncRefereePose(referee);
          }, 700);
        }
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
    link.attach(socket);
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
          chosenTarget = null;
          note = '';
          if (m.phase === 'place') revealed = null;
        }
        if (prev && prev.last?.cell !== m.last?.cell) note = '';
        // SB2: a new turn: the follow view starts over; my own turn brings back my last target.
        if (prev && (prev.turn !== m.turn || prev.phase !== m.phase)) {
          follow = null;
          aimSent = '';
          if (m.phase === 'play' && m.turn === m.seat) chosenTarget = myTarget;
          else if (m.phase === 'play') {
            chosenTarget = null;
            viewChosen = false;
          }
        }
        // SB2: a ship that just sank, and a fleet that just went under.
        const sunkNow = prev && m.last?.result === 'sunk' && `${m.last.by}:${m.last.target ?? ''}:${m.last.cell}` !== lastShot;
        const gone = prev && prev.phase === 'play' ? m.players.flatMap((p, i) => (p && prev.players[i]?.id === p.id && prev.players[i]!.left > 0 && p.left === 0 ? [i] : [])) : [];
        state = m;
        if (sunkNow && m.last) {
          const seat = m.last.target ?? 1 - m.last.by;
          const ship = m.seas[seat]?.sunk.find((cells) => cells.includes(m.last!.cell));
          justSunk = ship ? { seat, cells: new Set(ship) } : null;
          setTimeout(() => {
            justSunk = null;
            render();
          }, 900);
        }
        for (const seat of gone) showSank(seat);
        sounds(prev, m);
        render();
      } else if (m.t === 'aim') {
        // SB2: only the shooter of this turn; a late one from the turn before is dropped.
        if (!state || state.phase !== 'play' || m.by !== state.turn || m.by === state.seat) return;
        const moved = follow?.target !== m.target;
        follow = { by: m.by, target: m.target, cell: m.cell };
        if (moved) viewChosen = false;
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
  // GD1: a line that died without a close event is found and replaced (`link-watch.ts`).
  const link = watchLink('sea', () => ws, quiet, () => {
    const old = ws;
    ws = null;
    old?.close();
    connect();
  });
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
      // GMP: what this tab sees (players, turn, watchers, and how many seas it may see whole: 1 as a player, all as a watcher).
      { id: 'seaBattle.state', title: { en: 'Sea Battle: what this tab sees', tr: 'Amiral Battı: bu sekme ne görüyor' }, help: { en: 'Players (sunk or afloat), whose turn, the sea in the big box (the target), the places, who watches, and how many seas show their ships here (a watcher sees them all).', tr: 'Oyuncular (batmış ya da yüzüyor), sıra kimde, büyük kutudaki deniz (hedef), sıralama, kim izliyor ve burada kaç denizin gemileri görünüyor (izleyen hepsini görür).' }, tab: 'games' as const, available: () => !!state || { en: 'open a Sea Battle table first', tr: 'önce bir Amiral Battı masası aç' }, where: { en: 'at a Sea Battle table', tr: 'Amiral Battı masasında' }, run: () => { const s = state!; return JSON.stringify({ phase: s.phase, seat: s.seat, turn: s.turn, target: other(), players: s.players.map((p) => p && { name: p.name, ready: p.ready, left: p.left, online: p.online, out: !!p.out }), ranks: s.ranks ?? null, lastTarget: s.last?.target ?? null, watchers: s.watchers.map((w) => w.name), seasWithShips: s.seas.filter((x) => (x.ships?.length ?? 0) > 0).length, sank: sankBox.hidden ? null : sankText.textContent, dragging: drag?.moved ? { ship: drag.ship, fits: !!drag.spot } : null, following: following(), follow, peerAim: [...root.querySelectorAll<HTMLElement>('.sea-cell.peer-aim')].map((c) => `${c.closest<HTMLElement>('.sea-sea')?.dataset.sea}:${c.dataset.cell}`) }); } },
      { id: 'sea.sank', title: { en: 'Sea Battle: show the "sank" moment', tr: 'Amiral Battı: "battı" anını göster' }, help: { en: 'Plays the explosion and "NAME SANK!" in this tab for the other seat (nothing changes in the game); the result card waits for it the same way.', tr: 'Bu sekmede diğer koltuk için patlamayı ve "AD BATTI!" yazısını oynatır (oyunda bir şey değişmez); sonuç kartı da aynı şekilde onu bekler.' }, tab: 'games' as const, available: () => (!!state && state.players.filter(Boolean).length >= 2) || { en: 'two people (or Stub) at the table first', tr: 'önce masada iki kişi (ya da Stub) olsun' }, where: { en: 'at a Sea Battle table', tr: 'Amiral Battı masasında' }, run: () => { showSank(other()); render(); return sankText.textContent ?? ''; } },
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
    // GT1: the rules for a bigger table, only where it has three or more seats.
    ...(many() ? [{ art: sea2Art, title: tx('how4'), line: tx('how4Line') }] : []),
  ]);
  return () => {
    offLab();
    how.destroy();
    document.removeEventListener('pointerdown', closeWatch);
    setGameLive(false);
    close();
    clearInterval(ping);
    link.stop();
    removeEventListener('pagehide', close);
    removeEventListener('langchange', onLang);
    clearTimeout(sankTimer);
    clearTimeout(aimTimer);
  };
}
