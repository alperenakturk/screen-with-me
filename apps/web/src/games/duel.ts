// ⚔️ Five Frames Duel, the page (card FFDUEL, Game Studio; notes in docs/internal/design/games/five-frames-duel.md).
// A lazy chunk with its own texts (EN + TR). Two players race to the same five-letter word. The server holds the word
// and judges every guess: this page knows only my own letters, and the other board as marks (✓ • ×). It looks like
// the solo Five Frames (its `.ff` styles): my tickets on the left, the other player's marks on the right, the letter
// tray under them. Like there, the physical keyboard types only while the board has the focus (click it).
import './five-frames.css';
import './duel.css';
import './lobby.css';
import { OPEN, openSocket, type SwmSocket } from '@swm/shared/socket';
import { DUEL_MAX_SEATS, DUEL_PROTOCOL_VERSION, DUEL_TIMES, type DuelClientMessage, type DuelPlayer, type DuelServerMessage } from '@swm/shared/games/duel';
import { ALPHABET, MAX_TRIES, WORD_LENGTH, letters, normalize, upper, type Lang, type Mark } from '@swm/shared/games/five-frames';
import type { Avatar } from '@swm/shared/protocol';
import { el } from '../dom.ts';
import { lang as pageLang } from '../i18n.ts';
import { clientId } from '../storage.ts';
import { avatarNode } from '../ui/avatar.ts';
import { playSound } from '../sound.ts';
import { setGameLive } from './live.ts';
import { LOCAL_ONLY, labServerHere } from './lab-server.ts';
import { debugHooks } from '../debug-lab.ts';
import { stubArt } from './stub.ts';
import { grabKeys, keepKeys } from './word-keys.ts';
import how1 from './art/tutorial/word-1-guess.svg?raw';
import how2 from './art/tutorial/word-2-colours.svg?raw';
import how3 from './art/tutorial/quiz-3-podium.svg?raw';
import { tableHowTo } from './how-to-play.ts';
import { resultCard } from './result.ts';
import { silence } from './silent.ts';
import { watchLink } from './link-watch.ts';
import { GAME_CLOCK_EVERY, GAME_KEEPALIVE_MS, KEEPALIVE, KEEPALIVE_ACK, keepaliveTicks } from '@swm/shared/keepalive';

type State = Extract<DuelServerMessage, { t: 'state' }>;

const TEXT = {
  en: {
    daily: 'Word of the day #{n}',
    lobbyTitle: 'Five Frames Duel',
    lobbyRules: 'One word for 2 to 6 players, seven tries each. You see their marks, never their letters; first to find it wins.',
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
    you: 'you',
    practice: 'Practice word',
    langTitle: 'Word language (both play in it)',
    waiting: 'Waiting for a second player…',
    readyHint: 'Same word, a board each. Press Ready when you are.',
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
    watchers: '👁 {n} watching',
    watchersTitle: 'Watching: {names}',
    full: 'The table is full.',
    version: 'Reload the page for the new version.',
    reconnecting: 'Reconnecting…',
    seeBoard: 'See the boards',
    how1: 'The same word for everyone',
    how1Line: 'Two to six players, each on their own board: seven tries to find the same five-letter word, like Five Frames.',
    how2: 'Marks, never letters',
    how2Line: 'You see the others’ marks as they come, never their letters: ✓ right place, • in the word, × not in it.',
    how3: 'First to find it wins',
    how3Line: 'With three or more, the rest play on: the order you find it in is your place. Nobody finds it: a draw. Play again for a practice word.',
    // GMP b: three to six players racing on the same word.
    raceGo: 'Race on: {n} players, one word!',
    youSolvedWait: 'Found it! You are {place}. The others are still racing.',
    youOutMany: 'Out of tries. Watch the others finish.',
    readyWaitAll: 'Ready. Waiting for everyone…',
    rematchWaitAll: 'Waiting for the others to play again…',
    matchLineMany: 'Game {n} of 3',
    yourPlace: 'You finished {place}.',
    places: 'Places',
    noWord: 'no word',
    lobbyTime: 'Time limit',
    timeOff: 'No limit',
    timeMinutes: '{n} min a game',
    timeTitle: 'When the time runs out, everyone who hasn’t found the word is out.',
    timeLeft: 'Time left: {t}',
    timeUp: 'Time is up!',
    timeUpMine: 'Time is up. Watch the others finish.',
    lateTime: 'Too late: the time ran out.',
    pointsTitle: 'Points: 7 for finding it on the first guess down to 1 on the seventh, +3 for the first to find it.',
    gained: '+{n}',
    youGot: '+{n} points',
    points: '{n} pts',
  },
  tr: {
    daily: 'Günün kelimesi #{n}',
    lobbyTitle: 'Beş Kare Düellosu',
    lobbyRules: '2–6 kişiye aynı kelime, herkese yedi hak. İşaretleri görürsün, harfleri asla; önce bulan kazanır.',
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
    you: 'sen',
    practice: 'Alıştırma kelimesi',
    langTitle: 'Kelime dili (ikiniz de bu dilde oynarsınız)',
    waiting: 'İkinci oyuncu bekleniyor…',
    readyHint: 'Aynı kelime, herkese bir tahta. Hazır olunca Hazır’a bas.',
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
    watchers: '👁 {n} izliyor',
    watchersTitle: 'İzleyenler: {names}',
    full: 'Masa dolu.',
    version: 'Yeni sürüm için sayfayı yenile.',
    reconnecting: 'Yeniden bağlanıyor…',
    seeBoard: 'Tahtalara bak',
    how1: 'Herkese aynı kelime',
    how1Line: 'İki ile altı oyuncu, herkes kendi tahtasında: aynı beş harfli kelimeyi bulmak için yedi hak, Beş Kare gibi.',
    how2: 'İşaretler var, harfler yok',
    how2Line: 'Diğerlerinin işaretlerini anında görürsün, harflerini asla: ✓ doğru yerde, • kelimede var, × yok.',
    how3: 'Önce bulan kazanır',
    how3Line: 'Üç ve daha fazla kişide diğerleri oynamaya devam eder: bulma sıran, derecendir. Kimse bulamazsa berabere. Yeniden oyna: alıştırma kelimesi gelir.',
    raceGo: 'Yarış: {n} oyuncu, tek kelime!',
    youSolvedWait: 'Buldun! {place} sıradasın. Diğerleri hâlâ yarışıyor.',
    youOutMany: 'Hakların bitti. Diğerlerinin bitirmesini izle.',
    readyWaitAll: 'Hazırsın. Herkes bekleniyor…',
    rematchWaitAll: 'Diğerlerinin yeniden oynaması bekleniyor…',
    matchLineMany: '{n}. oyun / 3',
    yourPlace: '{place} sırada bitirdin.',
    places: 'Sıralama',
    noWord: 'bulamadı',
    lobbyTime: 'Süre sınırı',
    timeOff: 'Sınırsız',
    timeMinutes: 'Oyun başı {n} dk',
    timeTitle: 'Süre bitince kelimeyi bulamayan herkes oyun dışı kalır.',
    timeLeft: 'Kalan süre: {t}',
    timeUp: 'Süre doldu!',
    timeUpMine: 'Süre doldu. Diğerlerinin bitirmesini izle.',
    lateTime: 'Geç kaldın: süre doldu.',
    pointsTitle: 'Puan: ilk tahminde bulana 7, yedincide bulana 1; ilk bulana +3.',
    gained: '+{n}',
    youGot: '+{n} puan',
    points: '{n} puan',
  },
} as const;
type TextKey = keyof (typeof TEXT)['en'];
function tx(key: TextKey, values: Record<string, string | number> = {}): string {
  const table: Record<string, string> = pageLang() === 'tr' ? TEXT.tr : TEXT.en;
  return (table[key] ?? TEXT.en[key]).replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ''));
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
  // rules, the two faces, the word language, then Stub's line and Ready (moved into the card while it shows).
  const lobbyLangButtons = (['en', 'tr'] as const).map((l) => {
    const b = el('button', { type: 'button', class: 'game-chip', 'data-lang': l }, l === 'en' ? 'English' : 'Türkçe');
    b.addEventListener('click', () => send({ t: 'lang', lang: l }));
    return b;
  });
  const lobbyTitle = el('h3', {});
  const lobbyRules = el('p', { class: 'duel-lobby-rules' });
  const lobbyFaces = el('ul', { class: 'duel-lobby-faces' });
  const lobbyLangLabel = el('span', { class: 'duel-lobby-label game-setting-label' });
  const lobbyBody = el('div', { class: 'duel-lobby-body' });
  // NG1: one game or best of three, and hard mode (owner's picks 9.3, 9.4); FW2: the time a game. FW2 (a fourth and
  // fifth setting no longer fit a phone as rows of chips): each is a select, two a row on a phone (duel.css).
  type Pick<V> = { label: HTMLElement; select: HTMLSelectElement; values: readonly V[]; name: (v: V) => string; title: () => string; text: () => string; now: (s: State) => V };
  const picks: Pick<never>[] = [];
  function pick<V extends string | number | boolean>(values: readonly V[], name: (v: V) => string, text: () => string, title: () => string, now: (s: State) => V, change: (v: V) => DuelClientMessage): HTMLElement {
    const label = el('label', { class: 'duel-lobby-label game-setting-label' });
    const select = el('select', { class: 'game-setting-select duel-select' }) as HTMLSelectElement;
    select.addEventListener('change', () => send(change(values[select.selectedIndex]!)));
    const one = { label, select, values, name, title, text, now } as unknown as Pick<never>;
    picks.push(one);
    const id = `duel-pick-${gameId}-${picks.length}`;
    select.id = id;
    label.htmlFor = id;
    return el('div', { class: 'duel-lobby-lang game-setting duel-pick' }, label, select);
  }
  const gamesPick = pick([1, 3] as const, (v) => (v === 1 ? tx('oneGame') : tx('bestOf3')), () => tx('lobbyGames'), () => '', (s) => s.bestOf, (v) => ({ t: 'settings', bestOf: v }));
  const hardPick = pick([false, true] as const, (v) => (v ? tx('hardOn') : tx('hardOff')), () => tx('hardMode'), () => tx('hardTitle'), (s) => s.hard, (v) => ({ t: 'settings', hard: v }));
  const timePick = pick(DUEL_TIMES, (n) => (n ? tx('timeMinutes', { n: n / 60 }) : tx('timeOff')), () => tx('lobbyTime'), () => tx('timeTitle'), (s) => s.time, (v) => ({ t: 'settings', time: v }));
  // QA3 (one lobby family): what the game is (title, rules, faces) and the setup (the settings as the other tables
  // show them, Ready in Start's place, Stub's hint under it); lobby.css lays the two halves out like the others.
  const lobby = el(
    'section',
    { class: 'duel-lobby lobby-card', hidden: '' },
    el('div', { class: 'lobby-intro' }, lobbyTitle, lobbyRules, lobbyFaces),
    el(
      'div',
      { class: 'lobby-setup' },
      el(
        'div',
        { class: 'duel-lobby-settings game-settings' },
        el('div', { class: 'duel-lobby-lang game-setting' }, lobbyLangLabel, el('span', { class: 'game-chips', role: 'group' }, ...lobbyLangButtons)),
        gamesPick,
        timePick,
        hardPick,
      ),
      lobbyBody,
    ),
  );
  const watchers = el('span', { class: 'duel-watchers' });
  // FW2: the time left of the running game (from the server's `left`, counted down here).
  const clock = el('span', { class: 'duel-clock', role: 'timer' });
  let endsAt = 0;
  const bar = el('div', { class: 'ff-head duel-bar' }, score0, tag, clock, el('span', { class: 'ff-gap' }), watchers, langs);

  // My board: seven tickets like the solo game.
  const board = el('div', { class: 'ff-board duel-board', tabindex: '0', role: 'group', 'data-takes-keys': '' });
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
  // GMP b: a small board for every other seat (up to six at the table).
  const minis = Array.from({ length: DUEL_MAX_SEATS }, () => miniBoard());
  const side = el('div', { class: 'duel-side' }, ...minis.map((m) => m.box));
  const main = el('div', { class: 'duel-main' }, board, side);

  const referee = stubArt('plain', 'duel-glow');
  const status = el('p', { class: 'duel-status', role: 'status', 'aria-live': 'polite' });
  const actions = el('div', { class: 'duel-actions' });
  const tray = el('div', { class: 'ff-tray' });
  // The table id is no secret (the room lists it); harnesses join it as a second player.
  const refRow = el('div', { class: 'duel-ref' }, referee, status);
  const box = el('div', { class: 'ff duel', 'data-table': gameId }, bar, main, lobby, refRow, actions, tray);
  app.replaceChildren(box);
  const result = resultCard(main, stubArt('plain', 'duel-glow'), (moved) => actions.prepend(...moved));
  // Buttons never keep the focus (the room's keys stay the room's).
  box.addEventListener('mousedown', (event) => {
    if ((event.target as Element).closest('button')) event.preventDefault();
  });

  // ---- Helpers ----
  const mySeat = () => state?.seat ?? -1;
  const wordLang = (): Lang => state?.lang ?? 'en';
  let langSet = false;
  const nameOf = (i: number) => state?.players[i]?.name ?? '';
  /** The seated players' seats (GMP b: two to six). */
  const seated = (): number[] => (state?.players ?? []).flatMap((p, i) => (p ? [i] : []));
  const many = () => seated().length > 2;
  /** Two players: the other one; more: the first other seat (only used in two-player texts). */
  const other = () => seated().find((i) => i !== mySeat()) ?? (mySeat() === 0 ? 1 : 0);
  const placeName = (n: number): string => (pageLang() === 'tr' ? `${n}.` : `${n}${n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'}`);
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
    // The letters show on the marks whenever the server sends them: to a watcher live (GMP), to everyone at the end.
    const words = p.words ?? [];
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
    const two = seated().length >= 2;
    if (mySeat() < 0) {
      // GMP b: a free or left seat, or a new one while the table has fewer than six.
      const free = s.players.some((p) => !p || !p.online) || s.players.length < DUEL_MAX_SEATS;
      if (s.phase !== 'play' && free) items.push(actionButton('duel-sit', tx('sit'), () => send({ t: 'sit' })));
    } else if (s.phase === 'wait' && !two) {
      // QA3: like Start at the other tables, Ready is there but greyed until a second player sits down.
      const wait = actionButton('duel-ready', tx('ready'), () => undefined);
      wait.disabled = true;
      items.push(wait);
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
    if (many()) {
      const mine = me();
      if (s.phase === 'wait') return seat >= 0 && mine?.ready ? tx('readyWaitAll') : tx('readyHint');
      if (s.phase === 'play') {
        if (seat < 0) return tx('watchGo');
        if (mine?.timeUp) return tx('timeUpMine');
        if (mine?.out) return tx('youOutMany');
        if (mine?.solved) return tx('youSolvedWait', { place: placeName(mine.place ?? s.players.filter((p) => p?.solved).length) });
        return tx('raceGo', { n: seated().length });
      }
      const word = s.answer ? tx('theWord', { word: upper(s.answer, s.lang) }) : '';
      return seat >= 0 && mine?.ready ? `${word} · ${tx('rematchWaitAll')}` : word;
    }
    if (s.phase === 'wait') {
      if (seated().length < 2) return tx('waiting');
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
    // Stub's line and Ready sit in the card while it shows, under the board otherwise.
    if (waiting && refRow.parentElement !== lobbyBody) lobbyBody.append(actions, refRow);
    else if (!waiting && refRow.parentElement === lobbyBody) main.after(refRow, actions);
    if (!waiting) return;
    lobbyTitle.textContent = tx('lobbyTitle');
    lobbyRules.textContent = tx('lobbyRules');
    lobbyLangLabel.textContent = tx('lobbyLang');
    for (const p of picks as unknown as Pick<string | number | boolean>[]) {
      p.label.textContent = p.text();
      p.label.title = p.title();
      const now = p.now(s);
      if (p.select.options.length !== p.values.length || p.select.dataset.lang !== pageLang()) {
        p.select.replaceChildren(...p.values.map((v) => el('option', {}, p.name(v))));
        p.select.dataset.lang = pageLang();
      }
      p.select.selectedIndex = p.values.indexOf(now);
      p.select.disabled = mySeat() < 0;
    }
    lobbyLangButtons.forEach((b) => {
      const on = b.dataset.lang === s.lang;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
      b.title = tx('langTitle');
      b.disabled = mySeat() < 0;
    });
    // GMP b: every seat, and one free chair while fewer than six sit.
    const chairs = Array.from({ length: Math.min(DUEL_MAX_SEATS, Math.max(2, s.players.length + (s.players.every((p) => p) ? 1 : 0))) }, (_, i) => i);
    lobbyFaces.replaceChildren(
      ...chairs.map((i) => {
        const p = s.players[i];
        if (!p) return el('li', { class: 'duel-face duel-face-free' }, el('span', { class: 'duel-face-q', 'aria-hidden': 'true' }, '?'), el('span', {}, tx('lobbyWaiting')));
        const face = avatarNode(p.avatar, p.name);
        face.classList.add('duel-avatar');
        return el('li', { class: `duel-face${i === mySeat() ? ' me' : ''}${p.ready ? ' ready' : ''}` }, face, el('span', {}, `${i === 0 ? '👑 ' : ''}${p.name}${i === mySeat() ? ` (${tx('you')})` : ''}${p.ready ? ' ✓' : ''}`));
      }),
    );
  }

  /** FW2: the time left, m:ss (hidden without a limit or between games). */
  function drawClock(): void {
    const on = state?.phase === 'play' && endsAt > 0;
    clock.hidden = !on;
    if (!on) return;
    const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
    const text = `⏱ ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    if (clock.textContent !== text) clock.textContent = text;
    clock.setAttribute('aria-label', tx('timeLeft', { t: text.slice(2) }));
    clock.classList.toggle('low', left <= 15);
  }
  const clockTimer = window.setInterval(drawClock, 250);

  /** GMP b: the places at the end, 1st to 6th (a shared place for everyone who didn't find the word). */
  function placesList(s: State): HTMLElement {
    const order = seated().sort((x, y) => (s.ranks?.[x] ?? 9) - (s.ranks?.[y] ?? 9));
    return el(
      'ol',
      { class: 'duel-places', 'aria-label': tx('places') },
      ...order.map((i) => {
        const p = s.players[i]!;
        const face = avatarNode(p.avatar, p.name);
        face.classList.add('duel-avatar');
        return el('li', { class: `${i === s.seat ? 'me' : ''}${p.solved ? '' : ' unsolved'}` }, el('b', { class: 'duel-place' }, placeName(s.ranks?.[i] ?? 0)), face, el('span', { class: 'duel-place-name' }, p.name), el('span', { class: 'duel-place-tries' }, p.solved ? tx('tries', { n: p.marks.length }) : tx('noWord')), el('b', { class: 'duel-place-points', title: tx('pointsTitle') }, tx('gained', { n: p.gained ?? 0 })));
      }),
    );
  }

  function render(): void {
    const s = state;
    if (!s) return;
    const seat = mySeat();
    box.dataset.phase = s.phase;
    box.classList.toggle('watching', seat < 0);
    box.classList.toggle('many', many());
    const [a, b] = seated().map((i) => s.players[i]!);
    // Best of three: during a match the bar shows the match score and which game this is.
    const playing = s.phase === 'play';
    const inMatch = s.bestOf === 3 && (playing || (s.match.games > 0 && !s.match.over));
    const gameNo = playing ? s.match.games + 1 : s.match.games;
    score0.textContent = !(a && b)
      ? ''
      : many()
        ? inMatch
          ? tx('matchLineMany', { n: gameNo })
          : // GMP b: six "name 0" never fit; only who has won so far, most wins first (the whole list in the tooltip).
            seated()
              .filter((i) => s.players[i]!.points > 0)
              .sort((x, y) => s.players[y]!.points - s.players[x]!.points)
              .slice(0, 3)
              .map((i) => `⭐ ${s.players[i]!.name} ${s.players[i]!.points}`)
              .join(' · ')
        : inMatch
        ? tx('matchLine', { n: gameNo, a: a.name, b: b.name, wa: s.match.wins[0] ?? 0, wb: s.match.wins[1] ?? 0 })
        : `${a.name} ${a.points} – ${b.points} ${b.name}`;
    // FW2: the bar counts points (the tooltip: everyone's, and how they are won).
    score0.title = `${seated().map((i) => `${s.players[i]!.name} ${tx('points', { n: s.players[i]!.points })}`).join(' · ')}\n${tx('pointsTitle')}`;
    tag.textContent = s.phase === 'wait' ? '' : `${s.daily !== null ? tx('daily', { n: s.daily }) : tx('practice')}${s.hard ? ` · ${tx('hardLine')}` : ''}`;
    langButtons.forEach((btn) => {
      const on = btn.dataset.lang === s.lang;
      btn.classList.toggle('on', on);
      btn.setAttribute('aria-pressed', String(on));
      btn.title = tx('langTitle');
      btn.disabled = seat < 0 || s.phase === 'play';
    });
    drawLobby(s);
    drawClock();
    watchers.textContent = s.watchers.length ? tx('watchers', { n: s.watchers.length }) : '';
    watchers.title = tx('watchersTitle', { names: s.watchers.map((w) => w.name).join(', ') });
    // A player: my board + their marks; a watcher: both players' marks.
    board.hidden = seat < 0;
    // GMP b: a mini board per other seated player (all of them for a watcher).
    const shown = seated().filter((i) => i !== seat);
    minis.forEach((mini, k) => {
      if (k < shown.length) drawMini(mini, shown[k]!);
      else mini.box.hidden = true;
    });
    side.dataset.count = String(shown.length);
    if (seat >= 0) drawMine(me());
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
      if (many() && !(s.bestOf === 3 && s.match.over)) title = s.draw ? tx('draw') : s.winner === seat ? tx('youWin') : tx('winner', { name: nameOf(s.winner ?? 0) });
      const lineParts = [s.answer ? tx('theWord', { word: upper(s.answer, s.lang) }) : ''];
      if (seat >= 0 && me()?.gained) lineParts.push(tx('youGot', { n: me()!.gained! }));
      if (s.players.some((p) => p?.timeUp)) lineParts.unshift(tx('timeUp'));
      if (many() && seat >= 0 && s.ranks?.[seat]) lineParts.unshift(tx('yourPlace', { place: placeName(s.ranks[seat]!) }));
      if (s.bestOf === 3 && !s.match.over) lineParts.push(many() ? tx('matchLineMany', { n: s.match.games }) : tx('matchLine', { n: s.match.games, a: nameOf(0), b: nameOf(1), wa, wb }));
      if (s.hard) lineParts.push(tx('hardLine'));
      result.show({
        key: `${s.round}`,
        outcome: s.bestOf === 3 && s.match.over ? (s.match.winner === null ? 'draw' : seat < 0 ? 'over' : s.match.winner === seat ? 'win' : 'lose') : outcome,
        title,
        line: lineParts.filter(Boolean).join(' · '),
        actions: rematch ? [rematch] : [],
        see: tx('seeBoard'),
        extra: many() ? placesList(s) : null,
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
    link.attach(socket);
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
        endsAt = m.phase === 'play' && m.left !== undefined ? Date.now() + m.left : 0;
        // QA2 (13): a fresh table takes the opener's page language for its words (Turkish page → Turkish words), once;
        // the other player can still switch it in the lobby.
        if (!langSet && m.phase === 'wait' && m.round === 0 && m.seat >= 0 && m.players.filter(Boolean).length === 1) {
          langSet = true;
          const want = pageLang() === 'tr' ? 'tr' : 'en';
          if (m.lang !== want) send({ t: 'lang', lang: want });
        }
        sounds(prev, m);
        render();
        // BUG6: the race starts (or I came back to a running one): the keyboard goes straight to the word.
        if (m.phase === 'play' && prev?.phase !== 'play' && m.seat >= 0) grabKeys(board);
      } else if (m.t === 'reveal') {
        revealed = m.answer;
        render();
      } else if (m.t === 'error') {
        if (m.code === 'short' || m.code === 'letters' || m.code === 'unknown' || m.code === 'repeat') shake(tx(m.code));
        else if (m.code === 'hard' && m.letter) {
          const letter = upper(m.letter, wordLang());
          shake(m.at !== undefined ? tx('hardMissAt', { letter, n: m.at + 1 }) : tx('hardMiss', { letter }));
        }
        else if (m.code === 'time') {
          typed = '';
          say(tx('lateTime'), 3000);
        } else if (m.code === 'over') {
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
  // GD1: a line that died without a close event is found and replaced (`link-watch.ts`).
  const link = watchLink('duel', () => ws, quiet, () => {
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
  // Test Lab: the server tells the answer only as a local lab server.
  const where = { en: 'at a Five Frames Duel table, seated, while a game is on', tr: 'Beş Kare Düellosu masasında, oturmuşken, oyun sürerken' };
  const offLab = debugHooks.register('table.duel', () => ({
    commands: [
      quiet.command('duel', { en: 'Five Frames Duel', tr: 'Beş Kare Düellosu' }),
      // GMP: what this tab sees (players, watchers, and how many boards show their letters here: 1 as a player, all as a watcher).
      { id: 'duel.state', title: { en: 'Five Frames Duel: what this tab sees', tr: 'Beş Kare Düellosu: bu sekme ne görüyor' }, help: { en: 'Players, their tries, who watches, and how many boards show their letters here (a watcher sees them all).', tr: 'Oyuncular, denemeleri, kim izliyor ve burada kaç tahtanın harfleri görünüyor (izleyen hepsini görür).' }, tab: 'games' as const, available: () => !!state || { en: 'open a Duel table first', tr: 'önce bir Düello masası aç' }, where: { en: 'at a Five Frames Duel table', tr: 'Beş Kare Düellosu masasında' }, run: () => { const s = state!; return JSON.stringify({ phase: s.phase, seat: s.seat, players: s.players.map((p) => p && { name: p.name, ready: p.ready, tries: p.marks.length, solved: p.solved, place: p.place ?? 0, points: p.points, gained: p.gained ?? null, timeUp: !!p.timeUp }), time: s.time, left: s.left ?? null, seats: s.players.length, ranks: s.ranks ?? null, watchers: s.watchers.map((w) => w.name), boardsWithLetters: s.players.filter((p) => (p?.words?.length ?? 0) > 0).length }); } },
      {
        id: 'duel.answer',
        title: { en: 'Five Frames Duel: show the word (this tab)', tr: 'Beş Kare Düellosu: kelimeyi göster (bu sekmede)' },
        help: { en: 'Local lab server only: the word shows in the status line of this tab.', tr: 'Sadece yerel test sunucusunda: kelime bu sekmenin durum satırında görünür.' },
        tab: 'games' as const, available: () => !labServerHere() ? LOCAL_ONLY : (!!state && state.phase === 'play') || { en: 'only during the race (both pressed Ready)', tr: 'sadece yarış sırasında (ikisi de Hazır’a bastı)' },
        where,
        run: () => send({ t: 'lab', op: 'answer' }),
      },
      {
        id: 'duel.match',
        title: { en: 'Five Frames Duel: best of three in hard mode', tr: 'Beş Kare Düellosu: zor modda üç oyunluk maç' },
        help: { en: 'Sets the table to best of three with hard mode on (both players press Ready again).', tr: 'Masayı üç oyunluk maça ve zor moda alır (iki oyuncu da yeniden Hazır’a basar).' },
        tab: 'games' as const, available: () => (!!state && state.seat >= 0 && state.phase !== 'play') || { en: 'only between games (in the lobby)', tr: 'sadece iki oyun arasında (lobide)' },
        where,
        run: () => send({ t: 'settings', bestOf: 3, hard: true }),
      },
      {
        id: 'duel.timeup',
        title: { en: 'Five Frames Duel: run out of time now', tr: 'Beş Kare Düellosu: süreyi şimdi bitir' },
        help: { en: 'Local lab server only: the game’s time runs out at once; whoever hasn’t found the word is out, points are given.', tr: 'Sadece yerel test sunucusunda: oyunun süresi hemen biter; kelimeyi bulamayan oyun dışı kalır, puanlar verilir.' },
        tab: 'games' as const, available: () => !labServerHere() ? LOCAL_ONLY : (!!state && state.phase === 'play' && state.seat >= 0) || { en: 'only during the race (both pressed Ready)', tr: 'sadece yarış sırasında (ikisi de Hazır’a bastı)' },
        where,
        run: () => send({ t: 'lab', op: 'timeup' }),
      },
      {
        id: 'duel.win',
        title: { en: 'Five Frames Duel: guess the word now', tr: 'Beş Kare Düellosu: kelimeyi şimdi tahmin et' },
        help: { en: 'Local lab server only: asks for the word, then sends it as my guess (I win).', tr: 'Sadece yerel test sunucusunda: kelimeyi ister, sonra tahminim olarak gönderir (kazanırım).' },
        tab: 'games' as const, available: () => !labServerHere() ? LOCAL_ONLY : (!!state && state.phase === 'play' && state.seat >= 0) || { en: 'only during the race (both pressed Ready)', tr: 'sadece yarış sırasında (ikisi de Hazır’a bastı)' },
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
  ]);
  const offKeys = keepKeys(box, board);
  return () => {
    offKeys();
    offLab();
    how.destroy();
    clearTimeout(noteTimer);
    setGameLive(false);
    close();
    clearInterval(ping);
    clearInterval(clockTimer);
    link.stop();
    removeEventListener('pagehide', close);
    removeEventListener('langchange', onLang);
  };
}

