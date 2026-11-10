// Two-player board games in the room's game window: tic-tac-toe, Four in a Row and, inside 🎲 Classics (P6, the owner's
// picks in `docs/internal/design/games/classics.md`), dama, chess (P7), backgammon (P8) and reversi from a game shelf. The first two people sit (X / O, red /
// yellow, white / black), later ones watch; when a seat is free, a watcher can sit, and a lone player can play against
// Stub the bot (easy / medium; it plays on the server with the same rules). Stub is also the referee: it says
// whose turn it is and cheers the winner. The server checks every move; this page only draws what it gets.

import './classics.css';
import { OPEN, openSocket, type SwmSocket } from '@swm/shared/socket';
import type { Mark } from '@swm/shared/games/board';
import { COLS, dropRow } from '@swm/shared/games/four';
import { legalMoves as damaMoves, mustCapture, type DamaState } from '@swm/shared/games/dama';
import { legalMoves as chessMoves, PROMOTIONS, type ChessState } from '@swm/shared/games/chess';
import { counts as reversiCounts, legalMoves as reversiMoves, type ReversiState } from '@swm/shared/games/reversi';
import { BAR, OFF, ROLL, fromOf as bgFrom, legalMoves as bgMoves, pips, toOf as bgTo, type BackgammonState } from '@swm/shared/games/backgammon';
import { GAME_PROTOCOL_VERSION, type GameClientMessage, type GameKind, type GamePerson, type GameServerMessage } from '@swm/shared/games/protocol';
import type { Avatar } from '@swm/shared/protocol';
import { el } from '../dom.ts';
import { confirmDialog } from '../ui/confirm.ts';
import { lang, t, translate } from '../i18n.ts';
import { clientId } from '../storage.ts';
import { avatarNode } from '../ui/avatar.ts';
import { playSound } from '../sound.ts';
import { setGameLive } from './live.ts';
import { LOCAL_ONLY, labServerHere } from './lab-server.ts';
import { debugHooks } from '../debug-lab.ts';
import { LAB_POSITIONS } from '@swm/shared/games/lab-positions';
import { slidePiece } from './motion.ts';
import { stubArt, syncRefereePose } from './stub.ts';
import xox1Art from './art/tutorial/xox-1-turns.svg?raw';
import xox2Art from './art/tutorial/xox-2-line.svg?raw';
import four1Art from './art/tutorial/four-1-drop.svg?raw';
import four2Art from './art/tutorial/four-2-four.svg?raw';
import dama1Art from './art/tutorial/dama-1-move.svg?raw';
import dama2Art from './art/tutorial/dama-2-jump.svg?raw';
import chess1Art from './art/tutorial/chess-1-moves.svg?raw';
import chess2Art from './art/tutorial/chess-2-mate.svg?raw';
import backgammon1Art from './art/tutorial/backgammon-1-roll.svg?raw';
import backgammon2Art from './art/tutorial/backgammon-2-home.svg?raw';
import reversi1Art from './art/tutorial/reversi-1-flip.svg?raw';
import reversi2Art from './art/tutorial/reversi-2-count.svg?raw';
import { tableHowTo, type HowToPlay } from './how-to-play.ts';
import { resultCard } from './result.ts';
import { silence } from './silent.ts';
import { GAME_CLOCK_EVERY, GAME_KEEPALIVE_MS, KEEPALIVE, KEEPALIVE_ACK, keepaliveTicks } from '@swm/shared/keepalive';

const MARKS: readonly [Mark, Mark] = ['X', 'O'];
type State = Extract<GameServerMessage, { t: 'state' }>;
/** The shelf (owner's pick 2 B): boards to play now, and the ones coming. */
const SHELF: readonly { kind: GameKind; glyph: string }[] = [
  { kind: 'xox', glyph: '⭕' },
  { kind: 'four', glyph: '🔴' },
  { kind: 'dama', glyph: '⚪' },
  { kind: 'chess', glyph: '♞' },
  { kind: 'backgammon', glyph: '🎲' },
  { kind: 'reversi', glyph: '⚫' },
];

/** Chess, backgammon and reversi texts live in this chunk (the room page's i18n stays small). */
const TEXT = {
  en: {
    loading: 'Setting up the table…',
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
    roll: '🎲 Roll',
    rollNow: 'Your turn: roll the dice',
    enter: 'A checker on the bar must come in first',
    passed: '{name} could not move with that roll',
    pips: 'Pips',
    point: 'Point {n}',
    bar: 'Bar',
    off: 'Borne off',
    checkers: '{n} {colour}',
    chessTitle: 'Chess',
    chessText: 'Classic chess: castling, en passant, promotion, checkmate and stalemate. Tap a piece to light up where it can go.',
    backgammonTitle: 'Backgammon',
    backgammonText: 'Roll, race your checkers round to your home and bear them off. A lone checker can be hit and starts again; two hold a point.',
    pickTitle: 'Pick a game',
    pickLine: 'Two players, or one against Stub',
    change: 'Change game',
    changeTitle: 'Back to the games',
    players: '2 players · or vs Stub',
    xoxLine: 'Three in a row: quick and playful',
    fourLine: 'Drop discs, connect four',
    damaLine: 'Turkish draughts: jump and crown',
    chessLine: 'The classic, with every rule',
    backgammonLine: 'Roll the dice and race home',
    watchers: 'Watching: {n}',
    wins: '{n} won',
    offCount: '{n}/15 home',
    offTray: 'Checkers borne off',
    score: '🏆 {s}',
    endAsk: 'End this game and change?',
    endAskText: 'The game on the table ends for both players; the score starts again on the new board.',
    endYes: 'End and change',
    reversiTitle: 'Reversi',
    reversiText: 'Put a disc so it closes a line of the other colour; every closed line turns over. No move? You pass. The most discs at the end wins.',
    reversiLine: 'Close a line, turn it over',
    rvPassed: '{name} has no move and passes',
    rvDiscs: '{n} discs',
    seeBoard: 'See the board',
    sayTake: 'Nice capture!',
    sayOuch: 'Ouch!',
    sayTaken: 'Taken!',
    sayCheck: 'Check! Mind the king',
    sayFlips: '{n} discs at once!',
    how_xox1: 'Take turns',
    how_xox1Line: 'X and O put one mark each turn.',
    how_xox2: 'Three in a row',
    how_xox2Line: 'Three in a line, across, down or corner to corner, wins.',
    how_four1: 'Drop a disc',
    how_four1Line: 'Pick a column: your disc falls to the lowest free place.',
    how_four2: 'Connect four',
    how_four2Line: 'Four of your colour in a line wins, in any direction.',
    how_dama1: 'Forward or sideways',
    how_dama1Line: 'A man steps one square forward or sideways, never back.',
    how_dama2: 'Jump and crown',
    how_dama2Line: 'Jump over a piece to take it (taking is a must). Reach the far row to become a king.',
    how_chess1: 'Tap a piece',
    how_chess1Line: 'Its moves light up; tap one to play it.',
    how_chess2: 'Checkmate wins',
    how_chess2Line: 'Trap the other king so it has no way out.',
    how_backgammon1: 'Roll and move',
    how_backgammon1Line: 'Roll the dice. The checkers with a gold ring can move: tap one, then the point it goes to.',
    how_backgammon2: 'Bring them home',
    how_backgammon2Line: 'Bring all 15 to your home corner, then bear them off first. Pips: how far your checkers still have to go.',
    how_reversi1: 'Close a line',
    how_reversi1Line: 'Put a disc so the other colour sits between it and one of yours: those discs turn over.',
    how_reversi2: 'Most discs win',
    how_reversi2Line: 'No move? You pass. When nobody can move, the most discs win.',
  },
  tr: {
    loading: 'Masa hazırlanıyor…',
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
    roll: '🎲 Zar at',
    rollNow: 'Sıra sende: zar at',
    enter: 'Kırık pul önce oyuna girmeli',
    passed: '{name} bu zarla oynayamadı',
    pips: 'Kalan yol',
    point: '{n}. hane',
    bar: 'Kırık',
    off: 'Toplanan',
    checkers: '{n} {colour}',
    chessTitle: 'Satranç',
    chessText: 'Klasik satranç: rok, geçerken alma, terfi, şah mat ve pat. Taşına dokun, gidebileceği kareler yanar.',
    backgammonTitle: 'Tavla',
    backgammonText: 'Zar at, pullarını yol boyunca evine götür ve topla. Tek duran pul vurulur ve baştan girer; iki pul bir haneyi kapatır.',
    pickTitle: 'Bir oyun seç',
    pickLine: 'İki kişi ya da Stub’a karşı tek kişi',
    change: 'Oyunu değiştir',
    changeTitle: 'Oyunlara dön',
    players: '2 oyuncu · ya da Stub’a karşı',
    xoxLine: 'Üçünü yan yana diz: hızlı ve eğlenceli',
    fourLine: 'Pulları bırak, dördünü birleştir',
    damaLine: 'Türk daması: atla ve dama ol',
    chessLine: 'Klasik satranç, bütün kurallarıyla',
    backgammonLine: 'Zarları at, eve ilk sen var',
    watchers: 'İzleyen: {n}',
    wins: '{n} galibiyet',
    offCount: '{n}/15 toplandı',
    offTray: 'Toplanan pullar',
    score: '🏆 {s}',
    endAsk: 'Bu oyun bitsin ve oyun değişsin mi?',
    endAskText: 'Masadaki oyun iki oyuncu için de biter; yeni oyunda skor sıfırdan başlar.',
    endYes: 'Bitir ve değiştir',
    reversiTitle: 'Reversi',
    reversiText: 'Taşını, karşı rengin bir sırasını kapatacak yere koy; kapanan her sıra döner. Hamlen yoksa pas geçersin. Sonunda taşı çok olan kazanır.',
    reversiLine: 'Sırayı kapat, taşları çevir',
    rvPassed: '{name} oynayamıyor, pas geçti',
    rvDiscs: '{n} taş',
    seeBoard: 'Tahtaya bak',
    sayTake: 'Güzel aldın!',
    sayOuch: 'Ah, gitti!',
    sayTaken: 'Taş gitti!',
    sayCheck: 'Şah! Şahına dikkat',
    sayFlips: 'Bir anda {n} taş!',
    how_xox1: 'Sırayla oyna',
    how_xox1Line: 'X ve O her turda bir işaret koyar.',
    how_xox2: 'Üçü yan yana',
    how_xox2Line: 'Yan yana, alt alta ya da çapraz üç işaret kazanır.',
    how_four1: 'Pulu bırak',
    how_four1Line: 'Bir sütun seç: pulun en alttaki boş yere düşer.',
    how_four2: 'Dördünü birleştir',
    how_four2Line: 'Kendi renginden dördü bir hizada kazanır, her yönde.',
    how_dama1: 'İleri ya da yana',
    how_dama1Line: 'Taş bir kare ileri ya da yana gider, asla geri gitmez.',
    how_dama2: 'Atla ve dama ol',
    how_dama2Line: 'Bir taşın üstünden atlayıp onu al (almak zorunlu). Karşı sıraya varan dama olur.',
    how_chess1: 'Taşa dokun',
    how_chess1Line: 'Gidebileceği kareler yanar; birine dokunup oyna.',
    how_chess2: 'Şah mat kazanır',
    how_chess2Line: 'Karşı şahı kaçacak yeri kalmayacak şekilde kıstır.',
    how_backgammon1: 'Zar at ve oyna',
    how_backgammon1Line: 'Zarları at. Altın halkalı pullar oynayabilir: birine, sonra gideceği haneye dokun.',
    how_backgammon2: 'Eve topla',
    how_backgammon2Line: '15 pulun hepsini evine getir, sonra ilk sen topla. Kalan yol: pullarının daha ne kadar gideceği.',
    how_reversi1: 'Sırayı kapat',
    how_reversi1Line: 'Taşını, karşı renk seninkiyle onun arasında kalacak yere koy: o taşlar döner.',
    how_reversi2: 'Çok taş kazanır',
    how_reversi2Line: 'Hamlen yoksa pas geçersin. Kimse oynayamayınca taşı çok olan kazanır.',
  },
} as const;
const tc = (key: keyof (typeof TEXT)['en'], values: Record<string, string | number> = {}): string =>
  (lang() === 'tr' ? TEXT.tr : TEXT.en)[key].replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ''));
/** A board's name and line: chess and backgammon keep theirs in this chunk (the room page's i18n stays small). */
const boardTitle = (kind: GameKind): string => (kind === 'chess' || kind === 'backgammon' || kind === 'reversi' ? tc(`${kind}Title`) : t(`games.${kind}.title`));
const boardText = (kind: GameKind): string => (kind === 'chess' || kind === 'backgammon' || kind === 'reversi' ? tc(`${kind}Text`) : t(`games.${kind}.text`));
/** Dice faces ⚀–⚅. */
const DIE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
/** Chess pieces as text (the filled shapes for both sides, coloured by CSS; U+FE0E keeps them out of emoji style). */
const GLYPH: Record<string, string> = { p: '♟\uFE0E', n: '♞\uFE0E', b: '♝\uFE0E', r: '♜\uFE0E', q: '♛\uFE0E', k: '♚\uFE0E' };
const fromOf = (move: number) => Math.floor((move % 4096) / 64);
const toOf = (move: number) => move % 64;

/** The picker's little cover for each board (our own drawings). */
const COVER: Record<string, string> = {
  xox: '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="10" fill="#2a2350"/><g stroke="#8f84d8" stroke-width="3" stroke-linecap="round"><path d="M50 14v52M70 14v52M34 30h52M34 50h52"/></g><g stroke="#ff7aa8" stroke-width="5" stroke-linecap="round"><path d="M38 17l8 9M46 17l-8 9M74 57l8 9M82 57l-8 9"/></g><circle cx="60" cy="40" r="5.5" fill="none" stroke="#6fc8ff" stroke-width="4"/><circle cx="42" cy="60" r="5.5" fill="none" stroke="#6fc8ff" stroke-width="4"/></svg>',
  four: '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="10" fill="#1d2a4f"/><rect x="24" y="12" width="72" height="58" rx="7" fill="#2f5fd0"/><path d="M18 74h84" stroke="#1a3a8a" stroke-width="6" stroke-linecap="round"/><g fill="#0e1430"><circle cx="36" cy="24" r="6"/><circle cx="52" cy="24" r="6"/><circle cx="68" cy="24" r="6"/><circle cx="84" cy="24" r="6"/><circle cx="36" cy="41" r="6"/><circle cx="84" cy="41" r="6"/></g><g fill="#ff5d6c"><circle cx="52" cy="41" r="6"/><circle cx="36" cy="58" r="6"/><circle cx="68" cy="58" r="6"/></g><g fill="#ffd24a"><circle cx="68" cy="41" r="6"/><circle cx="52" cy="58" r="6"/><circle cx="84" cy="58" r="6"/></g></svg>',
  dama: '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="10" fill="#3a2516"/><g transform="translate(28 8)"><rect width="64" height="64" fill="#e8cf9e"/><g fill="#9a6236"><rect x="16" width="16" height="16"/><rect x="48" width="16" height="16"/><rect y="16" width="16" height="16"/><rect x="32" y="16" width="16" height="16"/><rect x="16" y="32" width="16" height="16"/><rect x="48" y="32" width="16" height="16"/><rect y="48" width="16" height="16"/><rect x="32" y="48" width="16" height="16"/></g><g fill="#fff8ec" stroke="#b9a37c" stroke-width="1.5"><circle cx="8" cy="40" r="6"/><circle cx="40" cy="56" r="6"/></g><g fill="#22202b" stroke="#000" stroke-width="1.5"><circle cx="24" cy="8" r="6"/><circle cx="56" cy="24" r="6"/></g></g></svg>',
  chess: '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="10" fill="#33241a"/><g transform="translate(28 8)"><rect width="64" height="64" fill="#ecd7b0"/><g fill="#a8724a"><rect x="16" width="16" height="16"/><rect x="48" width="16" height="16"/><rect y="16" width="16" height="16"/><rect x="32" y="16" width="16" height="16"/><rect x="16" y="32" width="16" height="16"/><rect x="48" y="32" width="16" height="16"/><rect y="48" width="16" height="16"/><rect x="32" y="48" width="16" height="16"/></g></g><text x="60" y="58" text-anchor="middle" font-size="44" fill="#1d1a24" stroke="#fff" stroke-width="1.2">\u265E</text></svg>',
  backgammon: '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="10" fill="#4a2c1c"/><rect x="10" y="8" width="100" height="64" rx="5" fill="#2e5d3c"/><rect x="57" y="8" width="6" height="64" fill="#4a2c1c"/><g fill="#e9c27a"><path d="M12 8l7 26 7-26zM40 8l7 26 7-26zM66 8l7 26 7-26zM94 8l7 26 7-26z"/><path d="M26 72l7-26 7 26zM80 72l7-26 7 26z"/></g><g fill="#c0533a"><path d="M26 8l7 26 7-26zM80 8l7 26 7-26z"/><path d="M12 72l7-26 7 26zM40 72l7-26 7 26zM66 72l7-26 7 26zM94 72l7-26 7 26z"/></g><circle cx="19" cy="64" r="5" fill="#fff8ec"/><circle cx="101" cy="16" r="5" fill="#22202b"/></svg>',
  reversi: '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="10" fill="#173826"/><g transform="translate(28 8)"><rect width="64" height="64" rx="3" fill="#2f7a4c"/><g stroke="#1d5534" stroke-width="1.2"><path d="M16 0v64M32 0v64M48 0v64M0 16h64M0 32h64M0 48h64"/></g><g fill="#22202b" stroke="#000" stroke-width="1"><circle cx="40" cy="24" r="6"/><circle cx="24" cy="40" r="6"/><circle cx="56" cy="40" r="6"/></g><g fill="#fff8ec" stroke="#b9a37c" stroke-width="1"><circle cx="24" cy="24" r="6"/><circle cx="40" cy="40" r="6"/></g><circle cx="40" cy="56" r="3" fill="#ffc65a"/><path d="M48 18a8 8 0 0 1 4 6" stroke="#ffc65a" stroke-width="2" fill="none" stroke-linecap="round"/></g></svg>',
};

/** GP2: each board's "How to play" pictures (our own, `docs/internal/design/games/tutorial-tables/gen.mjs`). */
const HOW_ART: Partial<Record<GameKind, string[]>> = {
  xox: [xox1Art, xox2Art],
  four: [four1Art, four2Art],
  dama: [dama1Art, dama2Art],
  chess: [chess1Art, chess2Art],
  backgammon: [backgammon1Art, backgammon2Art],
  reversi: [reversi1Art, reversi2Art],
};
const howCards = (board: GameKind) =>
  (HOW_ART[board] ?? []).map((art, i) => ({ art, title: tc(`how_${board}${i + 1}` as 'check'), line: tc(`how_${board}${i + 1}Line` as 'check') }));


/** Mounts the game into `app`; the returned function closes the connection and timers. */
export function mountMatch(app: HTMLElement, tableKind: GameKind | 'classics', gameId: string, name: string, avatar: Avatar): () => void {
  const classics = tableKind === 'classics';
  /** The board on the table now (a Classics table can change it from its shelf). */
  let kind: GameKind = classics ? 'xox' : tableKind;
  // Card CL2 (owner): the board is the hero. A Classics table first shows only its picker (no board behind it); a
  // board's screen is the opponent above the board, me below it (like a chess app), one status line, and small chips
  // for the score, Stub and the watchers (👁 with a popover).
  app.innerHTML = `
    <div class="xox-page mt${classics ? ' classics' : ''}">
      <section class="cl-picker" hidden></section>
      ${classics ? `<p class="mt-loading muted" role="status">${tc('loading')}</p>` : ''}
      <div class="mt-table"${classics ? ' hidden' : ''}>
        <div class="mt-bar">
          <span id="xox-score" class="mt-score"></span>
          <span class="cl-bot" hidden></span>
          <span class="mt-gap"></span>
          <button id="mt-watch-open" type="button" class="btn small-btn mt-watch-open" aria-expanded="false"></button>
        </div>
        <section class="card xox-watchers mt-watch-pop" hidden>
          <h4 data-i18n="games.watchers"></h4>
          <ul id="xox-watchers"></ul>
        </section>
        <section class="xox-players">
          <div class="xox-player" id="seat-0"></div>
          <div class="xox-player" id="seat-1"></div>
        </section>
        <div class="xox-board-wrap">
          <div id="xox-board" class="xox-board" role="group" aria-label="${t('games.board')}"></div>
          <div id="xox-floats" class="xox-floats" aria-hidden="true"></div>
          <div class="cl-promo" role="group" hidden></div>
        </div>
        <div class="bg-tray" hidden></div>
        <div class="cl-ref"><span class="cl-ref-slot"></span><p id="xox-status" class="xox-status" role="status" aria-live="polite"></p></div>
        <div class="xox-actions">
          <button id="xox-rematch" type="button" class="btn primary small-btn" data-i18n="games.rematch" hidden></button>
          <button id="xox-sit" type="button" class="btn primary small-btn" data-i18n="games.sit" hidden></button>
          <button id="xox-stand" type="button" class="btn small-btn" data-i18n="games.stand" hidden></button>
        </div>
      </div>
    </div>`;
  translate(app);
  const page = app.querySelector<HTMLElement>('.xox-page')!;

  const board = app.querySelector<HTMLElement>('#xox-board')!;
  const status = app.querySelector<HTMLElement>('#xox-status')!;
  const refSlot = app.querySelector<HTMLElement>('.cl-ref-slot')!;
  const referee = stubArt('referee', 'cl-ref-mascot');
  refSlot.replaceWith(referee);
  // GP2: Stub the referee reacts: a short line in a bubble and a little jump (a cheer for my good move, a gasp
  // when I lose a piece). Only words and a 0.6 s move; reduced motion keeps the words.
  const bubble = el('span', { class: 'cl-say', 'aria-hidden': 'true' });
  bubble.hidden = true;
  referee.after(bubble);
  let sayTimer: ReturnType<typeof setTimeout> | undefined;
  const say = (text: string, mood: 'cheer' | 'gasp' | 'plain') => {
    bubble.textContent = text;
    bubble.hidden = false;
    bubble.dataset.mood = mood;
    referee.classList.remove('react-cheer', 'react-gasp');
    void referee.offsetWidth;
    if (mood !== 'plain') referee.classList.add(`react-${mood}`);
    syncRefereePose(referee);
    clearTimeout(sayTimer);
    sayTimer = setTimeout(() => {
      bubble.hidden = true;
      referee.classList.remove('react-cheer', 'react-gasp');
      syncRefereePose(referee);
    }, 1800);
  };
  let prevCounts: { X: number; O: number } | null = null;
  const shelf = app.querySelector<HTMLElement>('.cl-picker')!;
  // "Change game" lives in the game window's head (its slot), so the board keeps the whole window.
  const shelfButton = el('button', { type: 'button', id: 'cl-shelf-open', class: 'btn small-btn cl-change' }) as HTMLButtonElement;
  shelfButton.hidden = true;
  const headSlot = app.closest('#game-stage')?.querySelector('.game-head-slot');
  if (classics) headSlot?.append(shelfButton);
  const watchOpen = app.querySelector<HTMLButtonElement>('#mt-watch-open')!;
  const watchPop = app.querySelector<HTMLElement>('.mt-watch-pop')!;
  watchOpen.addEventListener('click', () => {
    watchPop.hidden = !watchPop.hidden;
    watchOpen.setAttribute('aria-expanded', String(!watchPop.hidden));
  });
  const closeWatch = (event: Event) => {
    if (!watchPop.hidden && !watchPop.contains(event.target as Node) && !watchOpen.contains(event.target as Node)) {
      watchPop.hidden = true;
      watchOpen.setAttribute('aria-expanded', 'false');
    }
  };
  document.addEventListener('pointerdown', closeWatch);
  const botBox = app.querySelector<HTMLElement>('.cl-bot')!;
  const promoBox = app.querySelector<HTMLElement>('.cl-promo')!;
  const bgTray = app.querySelector<HTMLElement>('.bg-tray')!;
  const rematchButton = app.querySelector<HTMLButtonElement>('#xox-rematch')!;
  // GP2: the one result card over the board; Rematch moves into it while it shows and back after.
  const actionsBox = app.querySelector<HTMLElement>('.xox-actions')!;
  const result = resultCard(app.querySelector<HTMLElement>('.xox-board-wrap')!, stubArt('plain', 'gr-glow'), (moved) => actionsBox.prepend(...moved));
  const sitButton = app.querySelector<HTMLButtonElement>('#xox-sit')!;
  const standButton = app.querySelector<HTMLButtonElement>('#xox-stand')!;
  rematchButton.addEventListener('click', () => send({ t: 'rematch' }));
  standButton.addEventListener('click', () => send({ t: 'stand' }));
  sitButton.addEventListener('click', () => {
    const free = state?.seats.findIndex((s) => !s || !s.online || s.bot) ?? -1;
    if (free === 0 || free === 1) send({ t: 'sit', seat: free });
  });
  // CL2 (owner: "picked chess once, then couldn't switch"): "Change game" works at any time. Between games the picker
  // opens at once; while a game runs it asks first, and the pick then ends that game (`switch` with `end`).
  let endOnPick = false;
  let how: HowToPlay | null = null;
  let howTimer: ReturnType<typeof setTimeout> | undefined;
  const running = () => !!state?.started && state.game.winner === null;
  shelfButton.addEventListener('click', async () => {
    if (running()) {
      const yes = await confirmDialog({ icon: '🎲', title: tc('endAsk'), text: tc('endAskText'), yes: tc('endYes') });
      if (!yes) return;
      endOnPick = true;
    }
    shelfOpen = true;
    render();
  });

  // ---- The board's cells (built again when a Classics table changes its board) ----
  let cells: HTMLButtonElement[] = [];
  let built: GameKind | null = null;
  /** Dama / chess: the piece I picked to move. */
  let picked: number | null = null;
  /** Dama, chess and reversi share the 8 × 8 board. */
  const grid8 = () => kind === 'dama' || kind === 'chess' || kind === 'reversi';
  const four = () => kind === 'four';
  const colOf = (i: number) => i % COLS;
  // Card A11y (S2): a cell says where it is ("Row 1, column 2"), and what is in it (filled in on each state).
  const cellLabel = (i: number) =>
    kind === 'four' ? t('games.column', { n: colOf(i) + 1 }) : grid8() ? t('games.cell', { r: Math.floor(i / 8) + 1, c: (i % 8) + 1 }) : t('games.cell', { r: Math.floor(i / 3) + 1, c: (i % 3) + 1 });
  function build(): void {
    built = kind;
    picked = null;
    promoBox.hidden = true;
    bgTray.hidden = kind !== 'backgammon';
    if (kind === 'backgammon') {
      // 24 points in two rows (13–24 on top, 12–1 below), the bar in the middle, the borne-off tray on the right.
      board.className = 'bg-board';
      cells = Array.from({ length: 26 }, (_, i) => {
        const cell = el('button', { type: 'button', class: 'bg-point' });
        if (i < 24) {
          const top = i >= 12;
          const j = top ? i - 12 : 11 - i;
          cell.style.gridColumn = String(j < 6 ? j + 1 : j + 2);
          cell.style.gridRow = top ? '1' : '2';
        } else {
          cell.className = i === BAR ? 'bg-bar' : 'bg-off';
          cell.style.gridColumn = i === BAR ? '7' : '14';
          cell.style.gridRow = '1 / 3';
        }
        cell.addEventListener('click', () => press(i));
        return cell;
      });
      board.replaceChildren(...cells);
      lastBoard = '';
      return;
    }
    // Dama and chess have their own 8 × 8 board and cells (never the XOX marks' styles).
    board.className = grid8() ? `dama-board${kind === 'chess' ? ' chess-board' : kind === 'reversi' ? ' rv-board' : ''}` : `xox-board${kind === 'four' ? ' four-board' : ''}`;
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
    const moves = myMoves();
    // Reversi: a disc goes straight onto a legal cell.
    if (kind === 'reversi') return void (moves.includes(i) && send({ t: 'move', cell: i }));
    if (kind === 'backgammon') {
      // Backgammon: pick a point (or the bar) with a checker that can move, then where it goes.
      if (picked !== null && moves.includes(picked * 32 + i)) {
        send({ t: 'move', cell: picked * 32 + i });
        picked = null;
      } else picked = moves.some((m) => bgFrom(m) === i) ? i : null;
      return render();
    }
    // Dama / chess: pick one of my pieces that can move, then one of its targets.
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
  /** The board before this state (NG3: where a chess / dama piece slides from). */
  let prevCells: readonly (string | null)[] | null = null;
  /** The previous state's result (undefined before the first state: joining a finished game plays nothing). */
  let lastWinner: Mark | 'draw' | null | undefined;
  /** Classics: the picker shows until a board is picked (and again from "Change game" in the head). */
  let shelfOpen = classics;
  const markNode = (mark: Mark) =>
    kind === 'four'
      ? el('span', { class: `four-disc mark-${mark}`, role: 'img', 'aria-label': t(mark === 'X' ? 'games.red' : 'games.yellow') })
      : kind === 'reversi'
        ? el('span', { class: `dama-man rv-man mark-${mark}`, role: 'img', 'aria-label': t(mark === 'X' ? 'games.black' : 'games.white') })
      : kind === 'dama'
        ? el('span', { class: `dama-man mark-${mark}`, role: 'img', 'aria-label': t(mark === 'X' ? 'games.white' : 'games.black') })
        : kind === 'chess'
          ? el('span', { class: `chess-piece piece-${mark}`, role: 'img', 'aria-label': t(mark === 'X' ? 'games.white' : 'games.black') }, GLYPH.k!)
          : kind === 'backgammon'
            ? el('span', { class: `bg-checker piece-${mark}`, role: 'img', 'aria-label': t(mark === 'X' ? 'games.white' : 'games.black') })
        : el('span', { class: 'xox-mark' }, mark);

  function mySeat(): number {
    if (!state || !me) return -1;
    return state.seats.findIndex((s) => s?.id === me);
  }
  function myMoves(): number[] {
    if (!state || !(grid8() || kind === 'backgammon')) return [];
    const seat = mySeat();
    const ready = state.seats.every((s) => s !== null);
    if (seat === -1 || !ready || state.game.winner !== null || state.game.turn !== MARKS[seat]) return [];
    if (kind === 'backgammon') return bgMoves(state.game as BackgammonState).filter((m) => m !== ROLL);
    if (kind === 'reversi') return reversiMoves(state.game as ReversiState);
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
      person?.bot ? stubArt('opponent', 'xox-avatar cl-bot-avatar') : person ? avatarNode(person.avatar, 'xox-avatar') : el('span', { class: 'xox-avatar vacant' }),
      el(
        'span',
        { class: 'xox-name' },
        person ? `${person.bot ? t('classics.botName') : person.name}${person.id === me ? ` (${t('games.you')})` : ''}` : el('span', { class: 'muted' }, t('games.seatEmpty')),
        person && !person.online ? el('small', {}, ` · ${t('games.offline')}`) : '',
      ),
      seatExtra(mark),
      // THEMEG: the wins count says what it counts (a bare "0" beside the other counters meant nothing).
      el('span', { class: 'mt-wins', title: tc('wins', { n: state?.score[mark] ?? 0 }) }, el('i', { class: 'mt-cup', 'aria-hidden': 'true' }, '🏆'), String(state?.score[mark] ?? 0)),
    );
  }

  /** What a seat has won on the board: chess / dama captures, backgammon's checkers home and pips. */
  function seatExtra(mark: Mark): HTMLElement | string {
    if (!state) return '';
    const other: Mark = mark === 'X' ? 'O' : 'X';
    if (kind === 'chess') {
      const chess = state.game as ChessState;
      const left: Record<string, number> = { q: 0, r: 0, b: 0, n: 0, p: 0 };
      chess.board.forEach((c, i) => {
        const k = chess.kinds[i]!;
        if (c === other && k in left) left[k]!++;
      });
      const start: Record<string, number> = { q: 1, r: 2, b: 2, n: 2, p: 8 };
      const taken = Object.keys(start).flatMap((k) => Array<string>(Math.max(0, start[k]! - left[k]!)).fill(GLYPH[k]!));
      return el('span', { class: `mt-taken piece-${other}`, 'aria-hidden': 'true' }, taken.join(''));
    }
    if (kind === 'dama') {
      const n = 16 - state.game.board.filter((c) => c === other).length;
      return n ? el('span', { class: `mt-taken mark-${other}`, 'aria-hidden': 'true' }, el('span', { class: `dama-man mark-${other}` }), `×${n}`) : '';
    }
    if (kind === 'reversi') {
      const n = reversiCounts(state.game.board)[mark];
      return el('span', { class: 'mt-taken', title: tc('rvDiscs', { n }) }, el('span', { class: `dama-man rv-man mark-${mark}` }), String(n));
    }
    if (kind === 'backgammon') {
      const bg = state.game as BackgammonState;
      return el('span', { class: 'mt-taken' }, `${tc('offCount', { n: bg.off[mark] })} · ${tc('pips')} ${pips(bg, mark)}`);
    }
    return '';
  }

  function drawShelf(): void {
    const seat = mySeat();
    const busy = !!state?.started && state.game.winner === null;
    shelf.replaceChildren(
      el('h3', { class: 'cl-picker-title' }, tc('pickTitle')),
      el('p', { class: 'cl-picker-line muted' }, tc('pickLine')),
      el(
        'div',
        { class: 'cl-picker-grid' },
        ...SHELF.map((box) => {
          const art = el('span', { class: 'cl-card-art', 'aria-hidden': 'true' });
          art.innerHTML = COVER[box.kind] ?? '';
          const button = el(
            'button',
            { type: 'button', class: `cl-box cl-card cl-box-${box.kind}${box.kind === kind && state?.chosen ? ' on' : ''}`, 'data-board': box.kind },
            art,
            el('b', { class: 'cl-card-name' }, boardTitle(box.kind)),
            el('span', { class: 'cl-card-line' }, tc(`${box.kind}Line` as 'xoxLine')),
            el('span', { class: 'cl-card-players' }, tc('players')),
          );
          button.disabled = seat === -1;
          button.title = boardText(box.kind);
          button.addEventListener('click', () => {
            shelfOpen = false;
            const end = endOnPick && busy;
            endOnPick = false;
            // Back to the running game's own board: nothing to change.
            if (busy && box.kind === kind) return render();
            // Always sent otherwise: the table learns a board was chosen (CL2), even the one it already has.
            send({ t: 'switch', game: box.kind as GameKind, ...(end ? { end: true } : {}) });
            render();
          });
          return button;
        }),
      ),
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
    app.querySelector('#xox-score')!.setAttribute('title', tc('wins', { n: `${score.X} – ${score.O}` }));
    app.querySelector('#xox-score')!.textContent = tc('score', { s: score.draw ? `${score.X} – ${score.O} · ${score.draw}=` : `${score.X} – ${score.O}` });
    const ready = seats.every((s) => s !== null);
    const myTurn = seat !== -1 && ready && game.winner === null && game.turn === MARKS[seat];
    setGameLive(seat !== -1 && ready && game.winner === null && !!state.started && !seats.some((s) => s?.bot));
    const chess = game as ChessState;
    const bg = game as BackgammonState;
    const boardKey = game.board.join(',') + ((game as DamaState).kings ?? []).join('.') + (chess.kinds ?? '') + (bg.pts ? `${bg.pts.join(',')}|${bg.bar.X}${bg.bar.O}|${bg.off.X}${bg.off.O}` : '');
    const changed = lastBoard !== '' && boardKey !== lastBoard;
    const moves = myMoves();
    const dama = game as DamaState;
    if (kind === 'dama' && dama.chain !== null && moves.length) picked = dama.chain;
    const fromM = kind === 'backgammon' ? bgFrom : kind === 'reversi' ? (m: number) => m : fromOf;
    const toM = kind === 'backgammon' ? bgTo : toOf;
    if (picked !== null && !moves.some((m) => fromM(m) === picked)) picked = null;
    if (!moves.length) promoBox.hidden = true;
    const targets = new Set(picked === null ? [] : moves.filter((m) => fromM(m) === picked).map(toM));
    const movable = new Set(moves.map(fromM));
    // Chess: the king in check glows red; the last move's two squares are lit.
    const checked = kind === 'chess' && chess.check ? game.board.findIndex((c, i) => c === game.turn && chess.kinds[i] === 'k') : -1;
    const kings = new Set(dama.kings ?? []);
    if (kind === 'backgammon') drawBackgammon(bg, targets, movable, changed, myTurn && ready);
    else game.board.forEach((value, i) => {
      const cell = cells[i]!;
      const isNew = changed && value !== null && i === game.last;
      if (kind === 'xox') cell.setAttribute('aria-label', `${cellLabel(i)}, ${value || t('games.cellEmpty')}`);
      const dark = grid8() && (Math.floor(i / 8) + (i % 8)) % 2 === 1;
      if (kind === 'reversi') {
        // A legal cell shows a small gold dot on my turn; the discs the last move turned over flip.
        const legal = movable.has(i);
        const flip = changed && (game as ReversiState).flipped?.includes(i);
        cell.className = `dama-cell rv-cell${value ? ` mark-${value}` : ''}${legal ? ' target' : ''}${i === game.last ? ' lit' : ''}${isNew ? ' placed' : ''}${flip ? ' flip' : ''}`;
        cell.setAttribute('aria-label', `${cellLabel(i)}${value ? `, ${t(value === 'X' ? 'games.black' : 'games.white')}` : legal ? `, ${t('games.cellEmpty')} ✓` : ''}`);
        cell.disabled = !legal;
        return;
      }
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
    // NG3: a chess or dama piece slides from its old square (chess sends it; dama: the mover's piece that left).
    if (changed && game.last !== undefined && (kind === 'chess' || kind === 'dama')) {
      const mover = game.board[game.last];
      const from = kind === 'chess' ? chess.from : (prevCells?.findIndex((v, i) => v === mover && game.board[i] === null) ?? -1);
      if (from !== undefined && from !== null && from >= 0) slidePiece(cells[from], cells[game.last]);
    }
    prevCells = [...game.board];
    // The referee's reactions (GP2): a capture in chess / dama, a check, a big reversi flip.
    const counts = { X: game.board.filter((c) => c === 'X').length, O: game.board.filter((c) => c === 'O').length };
    if (changed && prevCounts && game.winner === null && (kind === 'chess' || kind === 'dama' || kind === 'reversi')) {
      const lost = (['X', 'O'] as const).find((m) => counts[m] < prevCounts![m] && kind !== 'reversi');
      const flips = kind === 'reversi' ? ((game as ReversiState).flipped?.length ?? 0) : 0;
      const mine = seat === -1 ? null : MARKS[seat]!;
      if (kind === 'chess' && chess.check) say(tc('sayCheck'), mine && game.turn === mine ? 'gasp' : 'plain');
      else if (lost) say(mine === null ? tc('sayTaken') : lost === mine ? tc('sayOuch') : tc('sayTake'), mine === null ? 'plain' : lost === mine ? 'gasp' : 'cheer');
      else if (flips >= 4) say(tc('sayFlips', { n: flips }), mine && game.board[game.last ?? -1] === mine ? 'cheer' : 'plain');
    }
    prevCounts = counts;
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
    const colour = (mark: Mark) => t(kind === 'four' ? (mark === 'X' ? 'games.red' : 'games.yellow') : kind === 'reversi' ? (mark === 'X' ? 'games.black' : 'games.white') : grid8() || kind === 'backgammon' ? (mark === 'X' ? 'games.white' : 'games.black') : 'games.you');
    const nameOf = (mark: Mark) => {
      const p = seats[mark === 'X' ? 0 : 1];
      return p?.bot ? t('classics.botName') : (p?.name ?? (kind === 'xox' ? mark : colour(mark)));
    };
    // Stub the referee (owner's pick 4 A): whose turn, then a small cheer for the winner.
    const reacting = [...referee.classList].filter((c) => c.startsWith('react-')).join(' ');
    referee.className = `cl-ref-mascot${game.winner ? ' cheer' : ''}${!ready ? ' wait' : ''}${reacting ? ` ${reacting}` : ''}`;
    syncRefereePose(referee);
    if (!ready) status.textContent = t('games.waiting');
    else if (game.winner === 'draw') status.textContent = kind === 'chess' && chess.end && chess.end !== 'mate' ? tc(chess.end) : t('games.draw');
    else if (game.winner) {
      const said = seat === -1 ? t('games.won', { name: nameOf(game.winner) }) : game.winner === MARKS[seat] ? t('games.youWon') : t('games.youLost', { name: nameOf(game.winner) });
      status.textContent = kind === 'chess' && chess.end === 'mate' ? `${tc('mate')} ${said}` : said;
    } else if (kind === 'backgammon' && myTurn && !bg.dice.length) status.textContent = tc('rollNow');
    else if (kind === 'backgammon' && myTurn && bg.bar[game.turn] > 0) status.textContent = tc('enter');
    else if (kind === 'backgammon' && bg.passed && bg.passed !== game.turn && !myTurn) status.textContent = `${tc('passed', { name: nameOf(bg.passed) })} · ${t('games.theirTurn', { name: nameOf(game.turn) })}`;
    else if (kind === 'backgammon' && bg.passed && myTurn) status.textContent = `${tc('passed', { name: nameOf(bg.passed) })} · ${t('games.yourTurn')}`;
    else if (kind === 'reversi' && (game as ReversiState).passed)
      status.textContent = `${tc('rvPassed', { name: nameOf((game as ReversiState).passed!) })} · ${myTurn ? t('games.yourTurn') : t('games.theirTurn', { name: nameOf(game.turn) })}`;
    else if (kind === 'chess' && chess.check) status.textContent = myTurn ? tc('youCheck') : `${tc('check')} ${t('games.theirTurn', { name: nameOf(game.turn) })}`;
    else if (myTurn && kind === 'dama' && dama.chain !== null) status.textContent = t('classics.chain');
    else if (myTurn && kind === 'dama' && mustCapture(dama)) status.textContent = t('classics.mustCapture');
    else status.textContent = myTurn ? t('games.yourTurn') : t('games.theirTurn', { name: nameOf(game.turn) });
    status.classList.toggle('mine', myTurn);
    status.title = status.textContent ?? '';
    rematchButton.hidden = seat === -1 || game.winner === null;
    if (game.winner !== null && ready && !(classics && shelfOpen)) {
      const outcome = game.winner === 'draw' ? 'draw' : seat === -1 ? 'over' : game.winner === MARKS[seat] ? 'win' : 'lose';
      result.show({
        key: `${kind}:${score.X}:${score.O}:${score.draw}`,
        outcome,
        title: status.textContent ?? '',
        line: `${nameOf('X')} ${score.X} – ${score.O} ${nameOf('O')}`,
        actions: seat === -1 ? [] : [rematchButton],
        see: tc('seeBoard'),
      });
    } else result.hide();
    sitButton.hidden = seat !== -1 || seats.every((s) => s && s.online && !s.bot);
    // THEMEG: "Just watch" (give up the seat) never sits under your own turn, where it read like a way to forfeit by mistake.
    standButton.hidden = seat === -1 || myTurn;
    // Stub the bot (owner's pick 6 A): offered to a seated player while the other seat is free.
    const other = seat === -1 ? null : seats[seat === 0 ? 1 : 0];
    const canBot = seat !== -1 && (!other || !other.online || !!other.bot);
    botBox.hidden = !canBot;
    if (canBot) {
      const level = (n: 1 | 2, label: string) => {
        const b = el('button', { type: 'button', class: `btn small-btn cl-bot-level${other?.bot === n ? ' on' : ''}` }, label);
        b.addEventListener('click', () => send({ t: 'bot', level: n }));
        return b;
      };
      const leave = el('button', { type: 'button', class: 'btn small-btn cl-bot-leave', title: t('classics.botLeave'), 'aria-label': t('classics.botLeave') }, '✕');
      leave.addEventListener('click', () => send({ t: 'bot', level: 0 }));
      botBox.replaceChildren(el('span', { class: 'cl-bot-label' }, stubArt('small', 'cl-bot-icon'), other?.bot ? '' : t('classics.bot')), level(1, t('classics.botEasy')), level(2, t('classics.botMedium')), other?.bot ? leave : '');
    }
    // Classics (CL2): the picker alone, or the board; "Change game" in the head brings the picker back at any time.
    shelfButton.hidden = !classics || shelfOpen || seat === -1;
    shelfButton.replaceChildren(el('span', { 'aria-hidden': 'true' }, '🎲'), el('span', { class: 'cl-change-text' }, ` ${tc('change')}`));
    shelfButton.title = tc('changeTitle');
    shelfButton.setAttribute('aria-label', tc('change'));
    shelfButton.setAttribute('aria-label', tc('change'));
    shelf.hidden = !classics || !shelfOpen;
    // CLFLASH: until the table's state came, a Classics table shows only a quiet line, never a board it may not have.
    app.querySelector('.mt-loading')?.remove();
    app.querySelector<HTMLElement>('.mt-table')!.hidden = !shelf.hidden;
    if (!shelf.hidden) drawShelf();
    // Me below the board, the other player above it.
    page.classList.toggle('flip', seat === 1);
    const screen = classics && shelfOpen ? 'picker' : kind;
    if (page.dataset.board !== screen) {
      page.dataset.board = screen;
      // GP2: the board's "How to play" cards (shown the first time this browser plays it) and its "?" in the head.
      // A pick first redraws the table's old board until the server's answer comes: wait a moment so only the board
      // that stays gets its cards.
      how?.destroy();
      how = null;
      clearTimeout(howTimer);
      if (screen !== 'picker' && HOW_ART[screen as GameKind])
        howTimer = setTimeout(() => {
          if (page.dataset.board === screen && !how) how = tableHowTo(app, `classics:${screen}:howSeen`, () => howCards(screen as GameKind), app.querySelector<HTMLElement>('.mt-bar'));
        }, 450);
      page.dispatchEvent(new Event('swm-game-size', { bubbles: true }));
    }
    watchOpen.textContent = `👁 ${watchers.length}`;
    watchOpen.title = tc('watchers', { n: watchers.length });
    watchOpen.setAttribute('aria-label', watchOpen.title);
    const list = app.querySelector<HTMLElement>('#xox-watchers')!;
    list.replaceChildren(
      ...(watchers.length
        ? watchers.map((w) => el('li', { class: 'person' }, avatarNode(w.avatar, 'person-avatar'), el('span', { class: 'person-name' }, w.id === me ? `${w.name} (${t('games.you')})` : w.name)))
        : [el('li', { class: 'muted small' }, seat === -1 ? t('games.watching') : t('games.noWatchers'))]),
    );
  }

  /** Backgammon: the points' checkers, the bar, the borne-off tray, then the dice and the roll button. */
  function drawBackgammon(bg: BackgammonState, targets: Set<number>, movable: Set<number>, changed: boolean, canRoll: boolean): void {
    const colourOf = (mark: 'X' | 'O') => t(mark === 'X' ? 'games.white' : 'games.black');
    const stack = (n: number, mark: 'X' | 'O') => {
      const discs = Array.from({ length: Math.min(n, 5) }, () => el('span', { class: `bg-checker piece-${mark}` }));
      if (n > 5) discs[4]!.textContent = String(n);
      return discs;
    };
    cells.forEach((cell, i) => {
      if (i < 24) {
        const n = bg.pts[i]!;
        const mark = n > 0 ? 'X' : 'O';
        const top = i >= 12;
        const isNew = changed && i === bg.last;
        cell.className = `bg-point${top ? ' top' : ''}${i % 2 ? ' alt' : ''}${picked === i ? ' picked' : ''}${targets.has(i) ? ' target' : ''}${movable.has(i) ? ' movable' : ''}${isNew ? ' placed' : ''}`;
        cell.replaceChildren(...(n ? stack(Math.abs(n), mark) : []));
        cell.setAttribute('aria-label', `${tc('point', { n: i + 1 })}${n ? `, ${tc('checkers', { n: Math.abs(n), colour: colourOf(mark) })}` : ''}`);
      } else if (i === BAR) {
        cell.className = `bg-bar${picked === i ? ' picked' : ''}${movable.has(i) ? ' movable' : ''}`;
        cell.replaceChildren(el('span', { class: 'bg-bar-o' }, ...stack(bg.bar.O, 'O')), el('span', { class: 'bg-bar-x' }, ...stack(bg.bar.X, 'X')));
        cell.setAttribute('aria-label', `${tc('bar')}: ${tc('checkers', { n: bg.bar.X, colour: colourOf('X') })}, ${tc('checkers', { n: bg.bar.O, colour: colourOf('O') })}`);
      } else {
        cell.className = `bg-off${targets.has(i) ? ' target' : ''}`;
        cell.replaceChildren(el('span', { class: 'bg-off-o' }, `⚫ ${bg.off.O}`), el('span', { class: 'bg-off-x' }, `⚪ ${bg.off.X}`));
        cell.title = tc('offTray');
        cell.setAttribute('aria-label', `${tc('off')}: ${tc('checkers', { n: bg.off.X, colour: colourOf('X') })}, ${tc('checkers', { n: bg.off.O, colour: colourOf('O') })}`);
      }
      cell.disabled = !(movable.has(i) || targets.has(i));
    });
    // The dice: the ones still to use are bright, used ones dim (a double shows four).
    const all = bg.rolled.length === 2 && bg.rolled[0] === bg.rolled[1] ? [bg.rolled[0]!, bg.rolled[0]!, bg.rolled[0]!, bg.rolled[0]!] : bg.rolled;
    const left = bg.dice.slice();
    const faces = all.map((d) => {
      const i = left.indexOf(d);
      const unused = i !== -1;
      if (unused) left.splice(i, 1);
      return el('span', { class: `bg-die${unused && bg.dice.length ? '' : ' used'}`, 'aria-hidden': 'true' }, DIE[d]!);
    });
    const roll = el('button', { type: 'button', id: 'bg-roll', class: 'btn primary small-btn' }, tc('roll'));
    roll.hidden = !(canRoll && !bg.dice.length && bg.winner === null);
    roll.addEventListener('click', () => send({ t: 'move', cell: ROLL }));
    bgTray.replaceChildren(
      el('span', { class: 'bg-dice', ...(bg.rolled.length ? { role: 'img', 'aria-label': bg.rolled.join(' – ') } : { 'aria-hidden': 'true' }) }, ...faces),
      roll,
      el('span', { class: 'bg-pips' }, `${tc('pips')}: ⚪ ${pips(bg, 'X')} · ⚫ ${pips(bg, 'O')}`),
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
  // GHOST: the Test Lab's "go silent" keeps this page quiet, as a dead connection would be.
  const quiet = silence();
  function send(message: GameClientMessage): void {
    if (quiet.on) return;
    if (ws?.readyState === OPEN) ws.send(JSON.stringify(message));
  }
  function sendKeepalive(): void {
    if (!quiet.on && ws?.readyState === OPEN) ws.send(KEEPALIVE);
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
      if (event.data === KEEPALIVE_ACK) return;
      let message: GameServerMessage;
      try {
        message = JSON.parse(String(event.data)) as GameServerMessage;
      } catch {
        return;
      }
      if (message.t === 'welcome') me = message.you;
      else if (message.t === 'state') {
        // Classics (CL2): the picker shows until someone picks a board (`chosen`); joining a chosen table goes straight
        // to its board. BH10: the game started, a board was picked or changed while my picker was open: the board.
        if (!state) shelfOpen = classics && !message.chosen && !message.started;
        else if ((message.started && !state.started) || (message.chosen && !state.chosen) || message.kind !== state.kind) shelfOpen = false;
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
  // QUOTA1a: the free keepalive (answered without waking the table), a real ping once a minute.
  const ping = window.setInterval(keepaliveTicks(GAME_CLOCK_EVERY, sendKeepalive, () => send({ t: 'ping' })), GAME_KEEPALIVE_MS);
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
  // LAB2: the boards by name in the lab's lists.
  const BOARD_NAMES: Record<string, { en: string; tr: string }> = {
    xox: { en: 'tic-tac-toe', tr: 'XOX' }, four: { en: 'Four in a Row', tr: 'Dört Taş' }, dama: { en: 'dama', tr: 'dama' },
    chess: { en: 'chess', tr: 'satranç' }, backgammon: { en: 'backgammon', tr: 'tavla' }, reversi: { en: 'reversi', tr: 'reversi' },
  };
  // Test Lab (DL3b): a ready-made position, set by the server only when it runs as a local lab server.
  const offLab = debugHooks.register('table.classics', () => ({
    commands: [
      quiet.command('classics', { en: 'Classics', tr: 'Klasikler' }),
      ...Object.values(LAB_POSITIONS).flat().map((position) => ({
        id: `classics.position.${position}`,
        title: { en: `Classics: set the "${position}" position`, tr: `Klasikler: "${position}" dizilişini kur` },
        help: { en: 'Local lab server only: chess mate1 (Ra1-a8 mates), dama chain (three captures), backgammon bearoff.', tr: 'Sadece yerel lab sunucusunda: satranç mate1 (Ra1-a8 mat eder), dama chain (üç taş birden alınır), tavla bearoff (taşlar toplanıyor).' },
        tab: 'games' as const,
        where: { en: 'at a Classics table, seated', tr: 'Klasikler masasında, oturmuşken' },
        // LAB2: the server sets the position (and switches to its board) only for a seated player.
        available: () =>
          !labServerHere() ? LOCAL_ONLY : mySeat() !== -1 || { en: 'take a seat at the table first', tr: 'önce masada bir koltuğa otur' },
        run: () => send({ t: 'lab', position }),
      })),
      // CL2: the picker → board flow in one step (the same path as a press on a card).
      { id: 'classics.picker', title: { en: 'Classics: show the picker', tr: 'Klasikler: oyun seçiciyi göster' }, help: { en: 'As "Change game" in the head (between games).', tr: 'Başlıktaki "Oyunu değiştir" gibi (iki oyun arasında).' }, tab: 'games' as const, where: { en: 'at a Classics table', tr: 'Klasikler masasında' }, run: () => shelfButton.click() },
      ...SHELF.map((box) => ({
        id: `classics.pick.${box.kind}`,
        title: { en: `Classics: pick ${BOARD_NAMES[box.kind]?.en ?? box.kind}`, tr: `Klasikler: ${BOARD_NAMES[box.kind]?.tr ?? box.kind} seç` },
        help: { en: "Presses this board's card in the picker (opens the picker first).", tr: 'Seçicide bu oyunun kartına basar (önce seçiciyi açar).' },
        tab: 'games' as const,
        where: { en: 'at a Classics table, seated', tr: 'Klasikler masasında, oturmuşken' },
        run: () => {
          if (!shelfOpen) shelfButton.click();
          shelf.querySelector<HTMLButtonElement>(`.cl-box[data-board="${box.kind}"]`)?.click();
        },
      })),
    ],
  }));
  return () => {
    offLab();
    clearTimeout(howTimer);
    clearTimeout(sayTimer);
    how?.destroy();
    shelfButton.remove();
    document.removeEventListener('pointerdown', closeWatch);
    setGameLive(false);
    close();
    clearInterval(ping);
    removeEventListener('pagehide', close);
    removeEventListener('langchange', onLang);
  };
}

