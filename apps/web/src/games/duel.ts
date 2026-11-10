// ⚔️ Five Frames Duel, the page (card FFDUEL, Game Studio; notes in docs/internal/design/games/five-frames-duel.md).
// A lazy chunk with its own texts (EN + TR). Two players race to the same five-letter word. The server holds the word
// and judges every guess: this page knows only my own letters, and the other board as marks (✓ • ×). It looks like
// the solo Five Frames (its `.ff` styles): my tickets on the left, the other player's marks on the right, the letter
// tray under them. Like there, the physical keyboard types only while the board has the focus (click it).
import './five-frames.css';
import './duel.css';
import { OPEN, openSocket, type SwmSocket } from '@swm/shared/socket';
import { DUEL_PROTOCOL_VERSION, type DuelClientMessage, type DuelPlayer, type DuelServerMessage } from '@swm/shared/games/duel';
import { ALPHABET, MAX_TRIES, WORD_LENGTH, letters, normalize, upper, type Lang, type Mark } from '@swm/shared/games/five-frames';
import type { Avatar } from '@swm/shared/protocol';
import { el } from '../dom.ts';
import { lang as pageLang } from '../i18n.ts';
import { clientId } from '../storage.ts';
import { avatarNode } from '../ui/avatar.ts';
import { playSound } from '../sound.ts';
import { setGameLive } from './live.ts';
import { debugHooks } from '../debug-lab.ts';
import glowbeamArt from './art/snack-bar/glowbeam.svg?raw';
import how1 from './art/tutorial/word-1-guess.svg?raw';
import how2 from './art/tutorial/word-2-colours.svg?raw';
import how3 from './art/tutorial/quiz-3-podium.svg?raw';
import { tableHowTo } from './how-to-play.ts';
import { resultCard } from './result.ts';
import { silence } from './silent.ts';
import { GAME_CLOCK_EVERY, GAME_KEEPALIVE_MS, KEEPALIVE, KEEPALIVE_ACK, keepaliveTicks } from '@swm/shared/keepalive';

type State = Extract<DuelServerMessage, { t: 'state' }>;

const TEXT = {
  en: {
    daily: 'Word of the day #{n}',
    lobbyTitle: 'Five Frames Duel',
    lobbyRules: 'The same word for both of you, seven tries each. You see their marks, never their letters; the first to find the word wins.',
    lobbyLang: 'Word language',
    lobbyGames: 'Games',
    oneGame: 'One game',
    bestOf3: 'Best of three',
    hardMode: 'Hard mode',
    hardOff: 'Off',
    hardOn: 'On',
    hardTitle: 'Letters you found must be used in your next guesses.',
    hardMiss: 'Hard mode: use {letter}',
    hardMissAt: 'Hard mode: {letter} goes in place {n}',
    hardLine: 'Hard mode',
    matchLine: 'Game {n} of 3 · {a} {wa} – {wb} {b}',
    matchWon: '{name} wins the match {wa}–{wb}! 🏆',
    youWonMatch: 'You win the match {wa}–{wb}! 🏆',
    matchTied: 'The match ends {wa}–{wb}: a tie.',
    nextGame: 'Next game',
    lobbyWaiting: 'Waiting…',
    practice: 'Practice word',
    langTitle: 'Word language (both play in it)',
    waiting: 'Waiting for a second player…',
    readyHint: 'Same word, two boards. Press Ready when you are.',
    readyWait: 'Ready. Waiting for {name}…',
    otherReady: '{name} is ready.',
    ready: 'Ready',
    notReady: 'Not ready',
    rematch: 'Play again',
    rematchWait: 'Waiting for {name} to play again…',
    otherRematch: '{name} wants to play again.',
    sit: 'Take the seat',
    yourGo: 'Find the word before {name} does!',
    youOut: 'Out of tries. Can {name} find it?',
    watchGo: 'Who finds the word first?',
    youWin: 'You found it first! 🎉',
    youLose: '{name} found it first.',
    draw: 'Nobody found it: a draw.',
    winner: '{name} wins!',
    theWord: 'The word: {word}',
    tries: '{n}/7',
    solved: 'Solved ✓',
    out: 'Out',
    offline: 'away',
    board: 'Your guesses. Click here to type with your keyboard.',
    marksOf: "{name}'s marks",
    enter: 'Enter',
    back: '⌫',
    backTitle: 'Delete a letter',
    short: 'Five letters, please',
    letters: 'Only letters of this alphabet',
    unknown: 'Not in the word list',
    repeat: 'You tried that one already',
    lateGuess: 'Too late: the game was already decided.',
    watchers: '👀 {n}',
    watchersTitle: 'Watching: {names}',
    full: 'The table is full.',
    version: 'Reload the page for the new version.',
    reconnecting: 'Reconnecting…',
    seeBoard: 'See the boards',
    how1: 'The same word for both',
    how1Line: 'Each of you guesses on your own board, seven tries, like Five Frames.',
    how2: 'Marks, never letters',
    how2Line: 'You see the other board’s marks as they come: ✓ right place, • in the word, × not in it.',
    how3: 'First to find it wins',
    how3Line: 'If neither finds it in seven tries, it is a draw. Play again for a practice word.',
  },
  tr: {
    daily: 'Günün kelimesi #{n}',
    lobbyTitle: 'Beş Kare Düellosu',
    lobbyRules: 'İkinize aynı kelime, herkese yedi hak. Onun işaretlerini görürsün, harflerini asla; kelimeyi önce bulan kazanır.',
    lobbyLang: 'Kelime dili',
    lobbyGames: 'Oyun',
    oneGame: 'Tek oyun',
    bestOf3: 'Üçte iki',
    hardMode: 'Zor mod',
    hardOff: 'Kapalı',
    hardOn: 'Açık',
    hardTitle: 'Bulduğun harfleri sonraki tahminlerinde kullanmalısın.',
    hardMiss: 'Zor mod: {letter} harfini kullan',
    hardMissAt: 'Zor mod: {letter} {n}. yerde olmalı',
    hardLine: 'Zor mod',
    matchLine: '{n}. oyun / 3 · {a} {wa} – {wb} {b}',
    matchWon: '{name} maçı {wa}–{wb} kazandı! 🏆',
    youWonMatch: 'Maçı {wa}–{wb} kazandın! 🏆',
    matchTied: 'Maç {wa}–{wb} bitti: berabere.',
    nextGame: 'Sonraki oyun',
    lobbyWaiting: 'Bekleniyor…',
    practice: 'Alıştırma kelimesi',
    langTitle: 'Kelime dili (ikiniz de bu dilde oynarsınız)',
    waiting: 'İkinci oyuncu bekleniyor…',
    readyHint: 'Aynı kelime, iki tahta. Hazır olunca Hazır’a bas.',
    readyWait: 'Hazırsın. {name} bekleniyor…',
    otherReady: '{name} hazır.',
    ready: 'Hazır',
    notReady: 'Hazır değilim',
    rematch: 'Yeniden oyna',
    rematchWait: '{name} bekleniyor…',
    otherRematch: '{name} yeniden oynamak istiyor.',
    sit: 'Yere otur',
    yourGo: 'Kelimeyi {name} oyuncusundan önce bul!',
    youOut: 'Hakların bitti. {name} bulabilecek mi?',
    watchGo: 'Kelimeyi önce kim bulacak?',
    youWin: 'Önce sen buldun! 🎉',
    youLose: '{name} önce buldu.',
    draw: 'Kimse bulamadı: berabere.',
    winner: '{name} kazandı!',
    theWord: 'Kelime: {word}',
    tries: '{n}/7',
    solved: 'Buldu ✓',
    out: 'Hakkı bitti',
    offline: 'ayrıldı',
    board: 'Tahminlerin. Klavyeyle yazmak için buraya tıkla.',
    marksOf: '{name} işaretleri',
    enter: 'Tamam',
    back: '⌫',
    backTitle: 'Bir harf sil',
    short: 'Beş harf olmalı',
    letters: 'Sadece bu alfabenin harfleri',
    unknown: 'Kelime listesinde yok',
    repeat: 'Bunu zaten denedin',
    lateGuess: 'Geç kaldın: oyun çoktan bitmişti.',
    watchers: '👀 {n}',
    watchersTitle: 'İzleyenler: {names}',
    full: 'Masa dolu.',
    version: 'Yeni sürüm için sayfayı yenile.',
    reconnecting: 'Yeniden bağlanıyor…',
    seeBoard: 'Tahtalara bak',
    how1: 'İkinize aynı kelime',
    how1Line: 'Herkes kendi tahtasında tahmin eder, yedi hak, Beş Kare gibi.',
    how2: 'İşaretler var, harfler yok',
    how2Line: 'Diğer tahtanın işaretlerini anında görürsün: ✓ doğru yerde, • kelimede var, × yok.',
    how3: 'Önce bulan kazanır',
    how3Line: 'Yedi denemede kimse bulamazsa berabere. Yeniden oyna: alıştırma kelimesi gelir.',
  },
} as const;
type TextKey = keyof (typeof TEXT)['en'];
function tx(key: TextKey, values: Record<string, string | number> = {}): string {
  const table: Record<string, string> = pageLang() === 'tr' ? TEXT.tr : TEXT.en;
  return (table[key] ?? TEXT.en[key]).replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ''));
}

function glowbeam(prefix: string): HTMLElement {
  const node = el('span', { class: 'duel-glow', 'aria-hidden': 'true' });
  // Our own static art (never user data), ids made unique.
  node.innerHTML = glowbeamArt.replace(/id="([^"]+)"/g, `id="${prefix}$1"`).replace(/url\(#([^)]+)\)/g, `url(#${prefix}$1)`);
  return node;
}

/** Mounts the duel into `app`; the returned function closes the connection and timers. */
export function mountDuel(app: HTMLElement, gameId: string, name: string, avatar: Avatar): () => void {
  let state: State | null = null;
  /** The letters I am typing (never sent until Enter). */
  let typed = '';
  let note = '';
  let noteTimer: ReturnType<typeof setTimeout> | undefined;
  /** Test Lab: the answer, shown in this tab only. */
  let revealed = '';
  let lastRound = -1;
  let lastPhase = '';
  let lastMarks = '';

  // ---- The layout ----
  const tag = el('span', { class: 'duel-tag' });
  const score0 = el('span', { class: 'duel-score' });
  const langButtons = (['en', 'tr'] as const).map((l) => {
    const b = el('button', { type: 'button', class: 'ff-lang', 'data-lang': l }, l.toUpperCase());
    b.addEventListener('click', () => send({ t: 'lang', lang: l }));
    return b;
  });
  const langs = el('span', { class: 'ff-langs', role: 'group' }, ...langButtons);
  // GPRO (one lobby look): while the table waits, a tinted card like Quiz / Draw & Guess / Last Heart: the title, the
  // rules, the two faces, the word language, then Glowbeam's line and Ready (moved into the card while it shows).
  const lobbyLangButtons = (['en', 'tr'] as const).map((l) => {
    const b = el('button', { type: 'button', class: 'game-chip', 'data-lang': l }, l === 'en' ? 'English' : 'Türkçe');
    b.addEventListener('click', () => send({ t: 'lang', lang: l }));
    return b;
  });
  const lobbyTitle = el('h3', {});
  const lobbyRules = el('p', { class: 'duel-lobby-rules' });
  const lobbyFaces = el('ul', { class: 'duel-lobby-faces' });
  const lobbyLangLabel = el('span', { class: 'duel-lobby-label' });
  const lobbyBody = el('div', { class: 'duel-lobby-body' });
  // NG1: one game or best of three, and hard mode (owner's picks 9.3, 9.4).
  const chip = (label: () => string, run: () => void) => {
    const b = el('button', { type: 'button', class: 'game-chip' }) as HTMLButtonElement;
    b.addEventListener('click', run);
    return { b, label };
  };
  const gamesChips = [
    { ...chip(() => tx('oneGame'), () => send({ t: 'settings', bestOf: 1 })), v: 1 as const },
    { ...chip(() => tx('bestOf3'), () => send({ t: 'settings', bestOf: 3 })), v: 3 as const },
  ];
  const hardChips = [
    { ...chip(() => tx('hardOff'), () => send({ t: 'settings', hard: false })), v: false },
    { ...chip(() => tx('hardOn'), () => send({ t: 'settings', hard: true })), v: true },
  ];
  const lobbyGamesLabel = el('span', { class: 'duel-lobby-label' });
  const lobbyHardLabel = el('span', { class: 'duel-lobby-label' });
  const lobby = el(
    'section',
    { class: 'duel-lobby', hidden: '' },
    lobbyTitle,
    lobbyRules,
    lobbyFaces,
    el('div', { class: 'duel-lobby-lang' }, lobbyLangLabel, el('span', { class: 'game-chips', role: 'group' }, ...lobbyLangButtons)),
    el('div', { class: 'duel-lobby-lang' }, lobbyGamesLabel, el('span', { class: 'game-chips', role: 'group' }, ...gamesChips.map((c) => c.b))),
    el('div', { class: 'duel-lobby-lang' }, lobbyHardLabel, el('span', { class: 'game-chips', role: 'group' }, ...hardChips.map((c) => c.b))),
    lobbyBody,
  );
  const watchers = el('span', { class: 'duel-watchers' });
  const bar = el('div', { class: 'ff-head duel-bar' }, score0, tag, el('span', { class: 'ff-gap' }), watchers, langs);

  // My board: seven tickets like the solo game.
  const board = el('div', { class: 'ff-board duel-board', tabindex: '0', role: 'group' });
  const rows = Array.from({ length: MAX_TRIES }, (_, i) => {
    const cells = Array.from({ length: WORD_LENGTH }, () => el('span', { class: 'ff-cell' }));
    const row = el('div', { class: 'ff-row' }, el('span', { class: 'ff-stub' }, String(i + 1)), el('span', { class: 'ff-cells' }, ...cells));
    board.append(row);
    return { row, cells };
  });

  /** A player's marks only: a small grid of 7 × 5 squares under their name. */
  function miniBoard(): { box: HTMLElement; head: HTMLElement; who: HTMLElement; count: HTMLElement; cells: HTMLElement[][] } {
    const who = el('span', { class: 'duel-who' });
    const count = el('span', { class: 'duel-count' });
    const head = el('div', { class: 'duel-mini-head' }, who, count);
    const grid = el('div', { class: 'duel-mini-grid', role: 'img' });
    const cells = Array.from({ length: MAX_TRIES }, () => {
      const row = Array.from({ length: WORD_LENGTH }, () => el('span', { class: 'duel-mark' }));
      grid.append(el('span', { class: 'duel-mini-row' }, ...row));
      return row;
    });
    const box = el('section', { class: 'duel-mini' }, head, grid);
    return { box, head, who, count, cells };
  }
  const minis = [miniBoard(), miniBoard()];
  const side = el('div', { class: 'duel-side' }, minis[0]!.box, minis[1]!.box);
  const main = el('div', { class: 'duel-main' }, board, side);

  const referee = glowbeam('duel-ref');
  const status = el('p', { class: 'duel-status', role: 'status', 'aria-live': 'polite' });
  const actions = el('div', { class: 'duel-actions' });
  const tray = el('div', { class: 'ff-tray' });
  // The table id is no secret (the room lists it); harnesses join it as a second player.
  const refRow = el('div', { class: 'duel-ref' }, referee, status);
  const box = el('div', { class: 'ff duel', 'data-table': gameId }, bar, main, lobby, refRow, actions, tray);
  app.replaceChildren(box);
  const result = resultCard(main, glowbeam('duel-gr'), (moved) => actions.prepend(...moved));
  // Buttons never keep the focus (the room's keys stay the room's).
  box.addEventListener('mousedown', (event) => {
    if ((event.target as Element).closest('button')) event.preventDefault();
  });

  // ---- Helpers ----
  const mySeat = () => state?.seat ?? -1;
  const wordLang = (): Lang => state?.lang ?? 'en';
  const nameOf = (i: number) => state?.players[i]?.name ?? '';
  const other = () => (mySeat() === 0 ? 1 : 0);
  const me = (): DuelPlayer | null => (mySeat() >= 0 ? (state?.players[mySeat()] ?? null) : null);
  const canType = () => state?.phase === 'play' && !!me() && !me()!.solved && !me()!.out;

  // GHOST: the Test Lab's "go silent" keeps this page quiet, as a dead connection would be.
  const quiet = silence();
  function send(message: DuelClientMessage): void {
    if (quiet.on) return;
    if (ws?.readyState === OPEN) ws.send(JSON.stringify(message));
  }
  function sendKeepalive(): void {
    if (!quiet.on && ws?.readyState === OPEN) ws.send(KEEPALIVE);
  }
  function say(text: string, ms = 2200): void {
    note = text;
    clearTimeout(noteTimer);
    if (ms) noteTimer = setTimeout(() => ((note = ''), render()), ms);
    render();
  }

  // ---- Typing ----
  function press(key: string): void {
    if (!canType()) return;
    if (key === 'Enter') {
      if (letters(typed).length !== WORD_LENGTH) return shake(tx('short'));
      send({ t: 'guess', word: typed });
      return;
    }
    if (key === 'Backspace') {
      typed = letters(typed).slice(0, -1).join('');
      return render();
    }
    const letter = normalize(key, wordLang());
    if (letters(letter).length !== 1 || !ALPHABET[wordLang()].includes(letter)) return;
    if (letters(typed).length >= WORD_LENGTH) return;
    typed += letter;
    playSound('place');
    render();
  }
  function shake(text: string): void {
    playSound('guessWrong');
    const row = rows[me()?.words?.length ?? 0]?.row;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cls = reduced ? 'bad' : 'shake';
    row?.classList.remove(cls);
    void row?.offsetWidth;
    row?.classList.add(cls);
    setTimeout(() => row?.classList.remove(cls), 600);
    say(text);
  }
  board.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const key = event.key;
    // Only while the board has the focus: these keys are the game's, the room never sees them.
    if (key === 'Enter' || key === 'Backspace' || letters(key).length === 1) {
      event.preventDefault();
      event.stopPropagation();
      if (key === ' ' || event.repeat) return;
      press(key);
    } else if (key === 'Escape') board.blur();
  });

  // ---- Drawing ----
  function drawMine(p: DuelPlayer | null): void {
    const words = p?.words ?? [];
    const playing = state?.phase === 'play' && canType();
    rows.forEach(({ row, cells }, i) => {
      const word = words[i];
      const current = playing && i === words.length;
      row.className = `ff-row${word ? ' done' : current ? ' current' : ' future'}`;
      const chars = word ? letters(word) : current ? letters(typed) : [];
      const marks: Mark[] = p?.marks[i] ?? [];
      cells.forEach((cell, j) => {
        const mark = word ? (marks[j] ?? '') : '';
        cell.className = `ff-cell${mark ? ` ${mark}` : chars[j] ? ' typed' : ''}`;
        cell.textContent = chars[j] ? upper(chars[j]!, wordLang()) : '';
      });
    });
    board.setAttribute('aria-label', tx('board'));
  }

  function drawMini(mini: (typeof minis)[number], seat: number): void {
    const p = state?.players[seat] ?? null;
    mini.box.hidden = !p;
    if (!p) return;
    const node = avatarNode(p.avatar, p.name);
    node.classList.add('duel-avatar');
    mini.who.replaceChildren(node, el('b', {}, p.name), p.online ? '' : el('span', { class: 'duel-away' }, ` · ${tx('offline')}`));
    mini.count.textContent = p.solved ? tx('solved') : p.out ? tx('out') : tx('tries', { n: p.marks.length });
    mini.box.classList.toggle('solved', p.solved);
    mini.box.classList.toggle('winner', state?.winner === seat);
    // Once the game is over every word shows on the marks.
    const words = state?.phase === 'over' ? (p.words ?? []) : [];
    mini.cells.forEach((row, i) => {
      const marks = p.marks[i];
      const chars = words[i] ? letters(words[i]!) : [];
      row.forEach((cell, j) => {
        cell.className = `duel-mark${marks ? ` ${marks[j]}` : ''}`;
        cell.textContent = chars[j] ? upper(chars[j]!, wordLang()) : '';
      });
    });
    const label = tx('marksOf', { name: p.name });
    mini.box.setAttribute('aria-label', label);
    mini.box.querySelector('.duel-mini-grid')?.setAttribute('aria-label', `${label}: ${p.marks.map((m) => m.map((x) => (x === 'hit' ? '✓' : x === 'near' ? '•' : '×')).join('')).join(' ')}`);
  }

  function drawTray(): void {
    const l = wordLang();
    const words = me()?.words ?? [];
    const best = new Map<string, Mark>();
    const rank: Record<Mark, number> = { miss: 0, near: 1, hit: 2 };
    words.forEach((w, i) => {
      const marks = me()!.marks[i] ?? [];
      letters(w).forEach((c, j) => {
        const m = marks[j];
        if (m && (!best.has(c) || rank[m] > rank[best.get(c)!])) best.set(c, m);
      });
    });
    tray.hidden = mySeat() < 0 || state?.phase !== 'play';
    tray.style.setProperty('--ff-cols', l === 'tr' ? '11' : '10');
    const keys = [...ALPHABET[l].map((c) => ({ key: c, label: upper(c, l) })), { key: 'Backspace', label: tx('back') }, { key: 'Enter', label: tx('enter') }];
    tray.replaceChildren(
      ...keys.map(({ key, label }) => {
        const b = el('button', { type: 'button', class: `ff-key${key === 'Enter' ? ' enter' : key === 'Backspace' ? ' back' : ''}`, 'data-key': key }, label);
        const mark = best.get(key);
        if (mark) b.classList.add(mark);
        if (key === 'Backspace') b.title = tx('backTitle');
        b.disabled = !canType();
        b.addEventListener('click', () => press(key));
        return b;
      }),
    );
  }

  function actionButton(cls: string, label: string, run: () => void, primary = true): HTMLButtonElement {
    const b = el('button', { type: 'button', class: `btn small-btn ${primary ? 'primary' : 'ghost'} ${cls}` }, label) as HTMLButtonElement;
    b.addEventListener('click', run);
    return b;
  }

  function drawActions(): void {
    const s = state!;
    const mine = me();
    const items: HTMLElement[] = [];
    const two = s.players.every((p) => p);
    if (mySeat() < 0) {
      const free = s.players.some((p) => !p || !p.online);
      if (s.phase !== 'play' && free) items.push(actionButton('duel-sit', tx('sit'), () => send({ t: 'sit' })));
    } else if (s.phase === 'wait' && two) {
      items.push(mine?.ready ? actionButton('duel-ready', tx('notReady'), () => send({ t: 'ready', on: false }), false) : actionButton('duel-ready', tx('ready'), () => send({ t: 'ready', on: true })));
    } else if (s.phase === 'over' && !mine?.ready) {
      items.push(actionButton('duel-rematch', s.match.over ? tx('rematch') : tx('nextGame'), () => send({ t: 'rematch' })));
    }
    actions.replaceChildren(...items);
  }

  function statusText(): string {
    const s = state!;
    const seat = mySeat();
    const them = s.players[other()];
    if (note) return note;
    if (s.phase === 'wait') {
      if (!s.players.every((p) => p)) return tx('waiting');
      if (seat < 0) return tx('readyHint');
      if (me()?.ready) return tx('readyWait', { name: them?.name ?? '' });
      return them?.ready ? tx('otherReady', { name: them.name }) : tx('readyHint');
    }
    if (s.phase === 'play') {
      if (seat < 0) return tx('watchGo');
      if (me()?.out) return tx('youOut', { name: them?.name ?? '' });
      return tx('yourGo', { name: them?.name ?? '' });
    }
    // Over: the word, and who wants to play again.
    const word = s.answer ? tx('theWord', { word: upper(s.answer, s.lang) }) : '';
    if (seat >= 0 && me()?.ready) return `${word} · ${tx('rematchWait', { name: them?.name ?? '' })}`;
    if (seat >= 0 && them?.ready) return `${word} · ${tx('otherRematch', { name: them.name })}`;
    return word;
  }

  function drawLobby(s: State): void {
    const waiting = s.phase === 'wait';
    lobby.hidden = !waiting;
    main.hidden = waiting;
    // Glowbeam's line and Ready sit in the card while it shows, under the board otherwise.
    if (waiting && refRow.parentElement !== lobbyBody) lobbyBody.append(refRow, actions);
    else if (!waiting && refRow.parentElement === lobbyBody) main.after(refRow, actions);
    if (!waiting) return;
    lobbyTitle.textContent = tx('lobbyTitle');
    lobbyRules.textContent = tx('lobbyRules');
    lobbyLangLabel.textContent = tx('lobbyLang');
    lobbyGamesLabel.textContent = tx('lobbyGames');
    lobbyHardLabel.textContent = tx('hardMode');
    lobbyHardLabel.title = tx('hardTitle');
    for (const c of [...gamesChips, ...hardChips]) {
      const on = 'v' in c && (typeof c.v === 'boolean' ? s.hard === c.v : s.bestOf === c.v);
      c.b.textContent = c.label();
      c.b.classList.toggle('on', on);
      c.b.setAttribute('aria-pressed', String(on));
      c.b.disabled = mySeat() < 0;
    }
    lobbyLangButtons.forEach((b) => {
      const on = b.dataset.lang === s.lang;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
      b.title = tx('langTitle');
      b.disabled = mySeat() < 0;
    });
    lobbyFaces.replaceChildren(
      ...[0, 1].map((i) => {
        const p = s.players[i];
        if (!p) return el('li', { class: 'duel-face duel-face-free' }, el('span', { class: 'duel-face-q', 'aria-hidden': 'true' }, '?'), el('span', {}, tx('lobbyWaiting')));
        const face = avatarNode(p.avatar, p.name);
        face.classList.add('duel-avatar');
        return el('li', { class: `duel-face${i === mySeat() ? ' me' : ''}${p.ready ? ' ready' : ''}` }, face, el('span', {}, `${p.name}${p.ready ? ' ✓' : ''}`));
      }),
    );
  }

  function render(): void {
    const s = state;
    if (!s) return;
    const seat = mySeat();
    box.dataset.phase = s.phase;
    box.classList.toggle('watching', seat < 0);
    const [a, b] = s.players;
    // Best of three: during a match the bar shows the match score and which game this is.
    const playing = s.phase === 'play';
    const inMatch = s.bestOf === 3 && (playing || (s.match.games > 0 && !s.match.over));
    const gameNo = playing ? s.match.games + 1 : s.match.games;
    score0.textContent = !(a && b)
      ? ''
      : inMatch
        ? tx('matchLine', { n: gameNo, a: a.name, b: b.name, wa: s.match.wins[0] ?? 0, wb: s.match.wins[1] ?? 0 })
        : `${a.name} ${a.wins} – ${b.wins} ${b.name}`;
    tag.textContent = s.phase === 'wait' ? '' : `${s.daily !== null ? tx('daily', { n: s.daily }) : tx('practice')}${s.hard ? ` · ${tx('hardLine')}` : ''}`;
    langButtons.forEach((btn) => {
      const on = btn.dataset.lang === s.lang;
      btn.classList.toggle('on', on);
      btn.setAttribute('aria-pressed', String(on));
      btn.title = tx('langTitle');
      btn.disabled = seat < 0 || s.phase === 'play';
    });
    drawLobby(s);
    watchers.textContent = s.watchers.length ? tx('watchers', { n: s.watchers.length }) : '';
    watchers.title = tx('watchersTitle', { names: s.watchers.map((w) => w.name).join(', ') });
    // A player: my board + their marks; a watcher: both players' marks.
    board.hidden = seat < 0;
    if (seat >= 0) {
      drawMine(me());
      minis[0]!.box.hidden = true;
      drawMini(minis[1]!, other());
    } else {
      drawMini(minis[0]!, 0);
      drawMini(minis[1]!, 1);
    }
    drawActions();
    drawTray();
    status.textContent = revealed && s.phase === 'play' ? `${statusText()} · (${upper(revealed, s.lang)})` : statusText();
    if (s.phase === 'over') {
      const rematch = actions.querySelector<HTMLElement>('.duel-rematch');
      const outcome = s.draw ? 'draw' : seat < 0 ? 'over' : s.winner === seat ? 'win' : 'lose';
      let title = s.draw ? tx('draw') : seat < 0 ? tx('winner', { name: nameOf(s.winner ?? 0) }) : s.winner === seat ? tx('youWin') : tx('youLose', { name: nameOf(other()) });
      // Best of three: the match result once it is decided.
      const [wa, wb] = [s.match.wins[0] ?? 0, s.match.wins[1] ?? 0];
      if (s.bestOf === 3 && s.match.over) {
        const mw = s.match.winner;
        title = mw === null ? tx('matchTied', { wa, wb }) : mw === seat ? tx('youWonMatch', { wa: Math.max(wa, wb), wb: Math.min(wa, wb) }) : tx('matchWon', { name: nameOf(mw), wa: Math.max(wa, wb), wb: Math.min(wa, wb) });
      }
      const lineParts = [s.answer ? tx('theWord', { word: upper(s.answer, s.lang) }) : ''];
      if (s.bestOf === 3 && !s.match.over) lineParts.push(tx('matchLine', { n: s.match.games, a: nameOf(0), b: nameOf(1), wa, wb }));
      if (s.hard) lineParts.push(tx('hardLine'));
      result.show({
        key: `${s.round}`,
        outcome: s.bestOf === 3 && s.match.over ? (s.match.winner === null ? 'draw' : seat < 0 ? 'over' : s.match.winner === seat ? 'win' : 'lose') : outcome,
        title,
        line: lineParts.filter(Boolean).join(' · '),
        actions: rematch ? [rematch] : [],
        see: tx('seeBoard'),
      });
    } else result.hide();
    referee.className = `duel-glow${s.phase === 'over' && s.winner === seat && seat >= 0 ? ' cheer' : ''}${s.phase !== 'play' ? ' wait' : ''}`;
    setGameLive(seat >= 0 && s.phase === 'play');
  }

  function sounds(prev: State | null, s: State): void {
    // The other board got a new row: a soft tick (their marks are news, their letters never are).
    const marks = s.players.map((p, i) => (i === s.seat ? '' : String(p?.marks.length ?? 0))).join(',');
    if (prev && marks !== lastMarks && s.phase === 'play' && prev.round === s.round) playSound('locked');
    lastMarks = marks;
    // My own row: right or not.
    const mine = s.seat >= 0 ? s.players[s.seat] : null;
    const before = prev && prev.seat >= 0 && prev.round === s.round ? (prev.players[prev.seat]?.marks.length ?? 0) : 0;
    if (mine && mine.marks.length > before && !mine.solved && s.phase === 'play') playSound('place');
    if (prev && s.phase === 'over' && lastPhase !== 'over') playSound(s.draw ? 'locked' : s.seat < 0 ? 'win' : s.winner === s.seat ? 'guessRight' : 'lose');
    lastPhase = s.phase;
  }

  // ---- The connection (reconnects when it drops) ----
  let ws: SwmSocket | null = null;
  let stopped = false;
  function connect(): void {
    if (stopped) return;
    const socket = openSocket(`${location.origin.replace(/^http/, 'ws')}/api/duel/${encodeURIComponent(gameId)}/ws`);
    ws = socket;
    socket.addEventListener('open', () => socket.send(JSON.stringify({ t: 'hello', v: DUEL_PROTOCOL_VERSION, name, avatar, cid: clientId() } satisfies DuelClientMessage)));
    socket.addEventListener('message', (event) => {
      if (event.data === KEEPALIVE_ACK) return;
      let m: DuelServerMessage;
      try {
        m = JSON.parse(String(event.data)) as DuelServerMessage;
      } catch {
        return;
      }
      if (m.t === 'state') {
        const prev = state;
        // My guess counted (my row grew) or a new game began: the typed letters go.
        const before = prev && prev.seat >= 0 ? (prev.players[prev.seat]?.words?.length ?? 0) : 0;
        const after = m.seat >= 0 ? (m.players[m.seat]?.words?.length ?? 0) : 0;
        if (after > before || m.round !== lastRound) typed = '';
        if (m.round !== lastRound) revealed = '';
        lastRound = m.round;
        state = m;
        sounds(prev, m);
        render();
      } else if (m.t === 'reveal') {
        revealed = m.answer;
        render();
      } else if (m.t === 'error') {
        if (m.code === 'short' || m.code === 'letters' || m.code === 'unknown' || m.code === 'repeat') shake(tx(m.code));
        else if (m.code === 'hard' && m.letter) {
          const letter = upper(m.letter, wordLang());
          shake(m.at !== undefined ? tx('hardMissAt', { letter, n: m.at + 1 }) : tx('hardMiss', { letter }));
        }
        else if (m.code === 'over') {
          typed = '';
          say(tx('lateGuess'), 3000);
        } else if (m.code === 'full') say(tx('full'));
        else if (m.code === 'version') {
          stopped = true;
          say(tx('version'), 0);
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
  // Test Lab: the server tells the answer only as a local lab server.
  const where = { en: 'at a Five Frames Duel table, seated, while a game is on', tr: 'Beş Kare Düellosu masasında, oturmuşken, oyun sürerken' };
  const offLab = debugHooks.register('table.duel', () => ({
    commands: [
      quiet.command('duel', { en: 'Five Frames Duel', tr: 'Beş Kare Düellosu' }),
      {
        id: 'duel.answer',
        title: { en: 'Five Frames Duel: show the word (this tab)', tr: 'Beş Kare Düellosu: kelimeyi göster (bu sekmede)' },
        help: { en: 'Local lab server only: the word shows in the status line of this tab.', tr: 'Sadece yerel lab sunucusunda: kelime bu sekmenin durum satırında görünür.' },
        tab: 'games' as const,
        where,
        run: () => send({ t: 'lab', op: 'answer' }),
      },
      {
        id: 'duel.win',
        title: { en: 'Five Frames Duel: guess the word now', tr: 'Beş Kare Düellosu: kelimeyi şimdi tahmin et' },
        help: { en: 'Local lab server only: asks for the word, then sends it as my guess (I win).', tr: 'Sadece yerel lab sunucusunda: kelimeyi ister, sonra tahminim olarak gönderir (kazanırım).' },
        tab: 'games' as const,
        where,
        run: () => {
          send({ t: 'lab', op: 'answer' });
          const started = Date.now();
          const wait = setInterval(() => {
            if (revealed) send({ t: 'guess', word: revealed });
            if (revealed || Date.now() - started > 5000) clearInterval(wait);
          }, 100);
        },
      },
    ],
  }));
  const how = tableHowTo(app, 'duel:howSeen', () => [
    { art: how1, title: tx('how1'), line: tx('how1Line') },
    { art: how2, title: tx('how2'), line: tx('how2Line') },
    { art: how3, title: tx('how3'), line: tx('how3Line') },
  ], bar);
  return () => {
    offLab();
    how.destroy();
    clearTimeout(noteTimer);
    setGameLive(false);
    close();
    clearInterval(ping);
    removeEventListener('pagehide', close);
    removeEventListener('langchange', onLang);
  };
}

