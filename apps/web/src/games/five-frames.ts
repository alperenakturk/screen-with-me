// 🎟️ Five Frames (TR "Beş Kare"), the daily word game played on the side (CARDS.md "Daily word game"; look: the
// owner's board A "ticket row", `docs/internal/design/side-games/README.md`; research `research/word-game.md`). The
// rules are `@swm/shared/games/five-frames`; the word lists are their own chunks per language (`./words/en.ts`,
// `./words/tr.ts`, credits in /third-party-notices.txt). One guess = one ticket: a numbered stub, a tear line, five
// cells (card GP, the owner's request: green ✓ = right place, gold • = in the word, grey = not in it, with a legend
// until the first guess; a scored row turns over cell by cell). The letter tray is alphabetical, never
// a keyboard strip under the board. The room's keys stay the room's: the physical keyboard types here only while the
// board itself has the focus (click it), and its buttons never take the focus.

import './five-frames.css';
import {
  ALPHABET, FRAMES_KEY, MAX_TRIES, WORD_LENGTH, answerFor, dayNumber, finished, liveStreak, guess, letters, loadFrames, normalize,
  record, saveFrames, score, shareLine, solved, today, trayMarks, upper, type FramesSave, type Lang, type Mark,
} from '@swm/shared/games/five-frames';
import { el } from '../dom.ts';
import { lang as pageLang } from '../i18n.ts';
import { playSound } from '../sound.ts';
import { load, save } from '../storage.ts';
import how1 from './art/tutorial/word-1-guess.svg?raw';
import how2 from './art/tutorial/word-2-colours.svg?raw';
import how3 from './art/tutorial/word-3-daily.svg?raw';
import { howToPlay } from './how-to-play.ts';

const TEXT = {
  en: {
    how1Title: 'Guess the five-letter word',
    how1: 'Type a word and press Enter.',
    how2Title: 'Colours help',
    how2: 'Green ✓ right place, yellow • in the word, grey not in it.',
    how3Title: 'Seven tries, one word a day',
    how3: 'Everyone gets the same word; a new one every day.',
    title: 'Five Frames',
    day: '#{n}',
    streak: '🔥 {n}',
    streakTitle: 'Days in a row',
    board: 'Your guesses. Click here to type with your keyboard.',
    enter: 'Enter',
    back: '⌫',
    backTitle: 'Delete a letter',
    short: 'Five letters, please',
    letters: 'Only letters of this alphabet',
    unknown: 'Not in the word list',
    repeat: 'You tried that one already',
    won: 'Solved in {n}/7! 🎉',
    lost: 'The word was {word}',
    next: 'A new word in {time}',
    share: '📋 Copy result',
    copied: 'Copied ✓',
    langTitle: 'Word language',
    loading: 'Loading the words…',
    legendHit: 'Right place',
    legendNear: 'In the word',
    legendMiss: 'Not in the word',
    played: '{won}/{played} won · best run {best}',
  },
  tr: {
    how1Title: 'Beş harfli kelimeyi bul',
    how1: "Bir kelime yaz ve Tamam'a bas.",
    how2Title: 'Renkler yol gösterir',
    how2: 'Yeşil ✓ doğru yerde, sarı • kelimede var, gri kelimede yok.',
    how3Title: 'Yedi hak, günde bir kelime',
    how3: 'Herkese aynı kelime; her gün yenisi.',
    title: 'Beş Kare',
    day: '#{n}',
    streak: '🔥 {n}',
    streakTitle: 'Art arda gün',
    board: 'Tahminlerin. Klavyeyle yazmak için buraya tıkla.',
    enter: 'Tamam',
    back: '⌫',
    backTitle: 'Bir harf sil',
    short: 'Beş harf olmalı',
    letters: 'Sadece bu alfabenin harfleri',
    unknown: 'Kelime listesinde yok',
    repeat: 'Bunu zaten denedin',
    won: '{n}/7 denemede buldun! 🎉',
    lost: 'Kelime {word} idi',
    next: 'Yeni kelime {time} sonra',
    share: '📋 Sonucu kopyala',
    copied: 'Kopyalandı ✓',
    langTitle: 'Kelime dili',
    loading: 'Kelimeler yükleniyor…',
    legendHit: 'Doğru yerde',
    legendNear: 'Kelimede var',
    legendMiss: 'Kelimede yok',
    played: '{won}/{played} kazandın · en uzun seri {best}',
  },
} as const;
type TextKey = keyof (typeof TEXT)['en'];
function t(key: TextKey, values: Record<string, string | number> = {}): string {
  const table: Record<string, string> = pageLang() === 'tr' ? TEXT.tr : TEXT.en;
  return (table[key] ?? TEXT.en[key]).replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ''));
}

/** The word language: the page's, until I pick the other one here (`fiveFrames:lang`). */
const LANG_KEY = 'fiveFrames:lang';

interface List {
  allowed: Set<string>;
  answers: string[];
}
const lists = new Map<Lang, Promise<List>>();
function wordList(lang: Lang): Promise<List> {
  let list = lists.get(lang);
  if (!list) {
    list = (lang === 'tr' ? import('./words/tr.ts') : import('./words/en.ts')).then(({ WORDS, ANSWERS }) => {
      const chars = Array.from(WORDS);
      const words: string[] = [];
      for (let i = 0; i + WORD_LENGTH <= chars.length; i += WORD_LENGTH) words.push(chars.slice(i, i + WORD_LENGTH).join(''));
      const answers = ANSWERS.split(',').map((n) => words[parseInt(n, 36)]!).filter(Boolean);
      return { allowed: new Set(words), answers };
    });
    lists.set(lang, list);
  }
  return list;
}

/** "3 h 12 min" until the player's next midnight. */
function untilMidnight(now = new Date()): string {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const min = Math.max(1, Math.ceil((next.getTime() - now.getTime()) / 60_000));
  const h = Math.floor(min / 60);
  return h > 0 ? `${h} h ${min % 60} min` : `${min} min`;
}

export function mountFiveFrames(root: HTMLElement): () => void {
  let stopped = false;
  let state: FramesSave = loadFrames(load(FRAMES_KEY));
  let wordLang: Lang = load(LANG_KEY) === 'tr' ? 'tr' : load(LANG_KEY) === 'en' ? 'en' : pageLang() === 'tr' ? 'tr' : 'en';
  let list: List | null = null;
  let answer = '';
  let typed = '';
  let day = dayNumber();

  const title = el('b', { class: 'ff-title' });
  const dayLabel = el('span', { class: 'ff-day' });
  const streak = el('span', { class: 'ff-streak' });
  const langButtons = (['en', 'tr'] as const).map((l) => {
    const b = el('button', { type: 'button', class: 'ff-lang', 'data-lang': l }, l.toUpperCase());
    b.addEventListener('click', () => {
      if (wordLang === l) return;
      wordLang = l;
      save(LANG_KEY, l);
      typed = '';
      void start();
    });
    return b;
  });
  const head = el('div', { class: 'ff-head' }, title, dayLabel, streak, el('span', { class: 'ff-gap' }), el('span', { class: 'ff-langs', role: 'group' }, ...langButtons));

  const board = el('div', { class: 'ff-board', tabindex: '0', role: 'group' });
  const rows = Array.from({ length: MAX_TRIES }, (_, i) => {
    const cells = Array.from({ length: WORD_LENGTH }, () => el('span', { class: 'ff-cell' }));
    const row = el('div', { class: 'ff-row' }, el('span', { class: 'ff-stub' }, String(i + 1)), el('span', { class: 'ff-cells' }, ...cells));
    board.append(row);
    return { row, cells };
  });

  const message = el('p', { class: 'ff-message', role: 'status' });
  const share = el('button', { type: 'button', class: 'ff-share' });
  // The three colours with their marks, until the first guess is scored (then the game's "?" explains them).
  const swatch = (mark: Mark, letter: string) => el('span', { class: `ff-cell ff-swatch ${mark}`, 'aria-hidden': 'true' }, letter);
  const legendLabels = [el('span'), el('span'), el('span')];
  const legend = el(
    'div',
    { class: 'ff-legend' },
    el('span', { class: 'ff-legend-item' }, swatch('hit', 'A'), legendLabels[0]!),
    el('span', { class: 'ff-legend-item' }, swatch('near', 'L'), legendLabels[1]!),
    el('span', { class: 'ff-legend-item' }, swatch('miss', 'P'), legendLabels[2]!),
  );
  // The legend and the result line share one slot: the legend before the first guess, the result after.
  const result = el('div', { class: 'ff-result' }, legend, message, share);
  const tray = el('div', { class: 'ff-tray' });
  const box = el('div', { class: 'ff' }, head, board, result, tray);
  root.replaceChildren(box);
  const how = howToPlay(box, 'fiveFrames:howSeen', () => [
    { art: how1, title: t('how1Title'), line: t('how1') },
    { art: how2, title: t('how2Title'), line: t('how2') },
    { art: how3, title: t('how3Title'), line: t('how3') },
  ]);
  head.append(how.button);
  box.addEventListener('mousedown', (event) => {
    if ((event.target as Element).closest('button')) event.preventDefault();
  });

  let messageTimer: ReturnType<typeof setTimeout> | undefined;
  function say(text: string, ms = 2200): void {
    message.textContent = text;
    message.classList.add('flash');
    legend.hidden = true;
    clearTimeout(messageTimer);
    if (ms) messageTimer = setTimeout(() => draw(), ms);
  }

  const game = () => today(state, wordLang, day);

  // ---- The turn of a scored row (Design's `side-games-polish.md` §4) ----
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  /** Each cell turns 110 ms + 110 ms, starting 80 ms after the one before; the tray changes after the last. */
  const TURN_HALF = 110;
  const TURN_STEP = 80;
  let revealing: number | null = null;
  let turned = 0;
  let marked = 0;
  let hopRow: number | null = null;
  let flipTimers: ReturnType<typeof setTimeout>[] = [];
  let popAt = -1;
  function clearFlip(): void {
    for (const id of flipTimers) clearTimeout(id);
    flipTimers = [];
    revealing = null;
    hopRow = null;
  }
  /** Turns row `index` over cell by cell, then runs `after` (the result's sound) and a hop when it was the answer. */
  function reveal(index: number, after: () => void): void {
    clearFlip();
    if (reduced.matches) {
      // Colours cross-fade (CSS), nothing moves.
      after();
      return draw();
    }
    revealing = index;
    turned = 0;
    marked = 0;
    const at = (ms: number, fn: () => void) => flipTimers.push(setTimeout(fn, ms));
    for (let j = 0; j < WORD_LENGTH; j++) {
      at(j * TURN_STEP, () => ((turned = j + 1), draw()));
      at(j * TURN_STEP + TURN_HALF, () => ((marked = j + 1), draw()));
    }
    at((WORD_LENGTH - 1) * TURN_STEP + 2 * TURN_HALF, () => {
      revealing = null;
      const word = game().guesses[index];
      if (word && word === answer) {
        hopRow = index;
        at(4 * 60 + 240, () => ((hopRow = null), draw()));
      }
      after();
      draw();
    });
  }

  function press(key: string): void {
    if (!list || stopped) return;
    // Typing waits while a row turns over.
    if (revealing !== null) return;
    if (finished(game(), answer)) return;
    if (key === 'Enter') return submit();
    if (key === 'Backspace') {
      typed = letters(typed).slice(0, -1).join('');
      return draw();
    }
    const letter = normalize(key, wordLang);
    if (letters(letter).length !== 1 || !ALPHABET[wordLang].includes(letter)) return;
    if (letters(typed).length >= WORD_LENGTH) return;
    typed += letter;
    playSound('place');
    popAt = letters(typed).length - 1;
    draw();
    popAt = -1;
  }

  function submit(): void {
    if (!list) return;
    const g = game();
    const error = guess(g, typed, answer, wordLang, { allowed: (w) => list!.allowed.has(w) });
    if (error) {
      if (error !== 'done') {
        playSound('guessWrong');
        const row = rows[g.guesses.length]?.row;
        const cls = reduced.matches ? 'bad' : 'shake';
        row?.classList.remove(cls);
        void row?.offsetWidth;
        row?.classList.add(cls);
        setTimeout(() => row?.classList.remove(cls), 600);
        say(t(error === 'short' ? 'short' : error === 'letters' ? 'letters' : error === 'repeat' ? 'repeat' : 'unknown'));
      }
      return;
    }
    typed = '';
    const done = finished(g, answer);
    const recorded = done && record(state, wordLang, g, answer);
    save(FRAMES_KEY, saveFrames(state));
    // The sound comes with the last cell's colour.
    reveal(g.guesses.length - 1, () => {
      if (recorded) playSound(solved(g, answer) ? 'guessRight' : 'lose');
      else if (!done) playSound('locked');
    });
  }

  board.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const key = event.key;
    // Only while the board has the focus: these keys are the game's, the room never sees them.
    if (key === 'Enter' || key === 'Backspace' || letters(key).length === 1) {
      event.preventDefault();
      event.stopPropagation();
      if (key === ' ') return;
      press(key);
    } else if (key === 'Escape') {
      board.blur();
    }
  });

  function drawTray(): void {
    // A row still turning over doesn't tell the tray anything yet.
    const seen = revealing === null ? game().guesses : game().guesses.slice(0, revealing);
    const marks = list ? trayMarks(seen, answer) : new Map<string, Mark>();
    // Turkish has 29 letters: eleven a row keeps the tray at three rows.
    tray.style.setProperty('--ff-cols', wordLang === 'tr' ? '11' : '10');
    const keys = [...ALPHABET[wordLang].map((c) => ({ key: c, label: upper(c, wordLang) })), { key: 'Backspace', label: t('back') }, { key: 'Enter', label: t('enter') }];
    tray.replaceChildren(
      ...keys.map(({ key, label }) => {
        const b = el('button', { type: 'button', class: `ff-key${key === 'Enter' ? ' enter' : key === 'Backspace' ? ' back' : ''}`, 'data-key': key }, label);
        const mark = marks.get(key);
        if (mark) b.classList.add(mark);
        if (key === 'Backspace') b.title = t('backTitle');
        b.addEventListener('click', () => press(key));
        return b;
      }),
    );
  }

  function draw(): void {
    title.textContent = t('title');
    dayLabel.textContent = t('day', { n: day });
    const stats = state.stats[wordLang];
    streak.textContent = t('streak', { n: liveStreak(stats, day) });
    streak.title = `${t('streakTitle')} · ${t('played', { won: stats.won, played: stats.played, best: stats.best })}`;
    langButtons.forEach((b) => {
      b.classList.toggle('on', b.dataset.lang === wordLang);
      b.setAttribute('aria-pressed', String(b.dataset.lang === wordLang));
      b.title = t('langTitle');
    });
    board.setAttribute('aria-label', t('board'));
    legendLabels[0]!.textContent = t('legendHit');
    legendLabels[1]!.textContent = t('legendNear');
    legendLabels[2]!.textContent = t('legendMiss');
    if (!list) {
      message.textContent = t('loading');
      share.hidden = true;
      tray.replaceChildren();
      return;
    }
    const g = game();
    const done = finished(g, answer);
    rows.forEach(({ row, cells }, i) => {
      const word = g.guesses[i];
      const current = !done && i === g.guesses.length;
      const turning = i === revealing;
      row.className = `ff-row${word ? ' done' : current ? ' current' : ' future'}${turning ? ' turning' : ''}${i === hopRow ? ' hop' : ''}`;
      const chars = word ? letters(word) : current ? letters(typed) : [];
      const marks = word ? score(word, answer) : [];
      cells.forEach((cell, j) => {
        const mark = turning && j >= marked ? '' : marks[j] ?? '';
        const typedCell = chars[j] && !mark;
        cell.className = `ff-cell${mark ? ` ${mark}` : typedCell ? ' typed' : ''}${turning && j < turned ? ' turn' : ''}${current && j === popAt ? ' pop' : ''}`;
        cell.style.setProperty('--i', String(j));
        cell.textContent = chars[j] ? upper(chars[j]!, wordLang) : '';
      });
    });
    // The legend shows until the first guess has its colours.
    const scored = g.guesses.length - (revealing === null ? 0 : 1);
    legend.hidden = scored > 0;
    if (done) {
      const n = g.guesses.indexOf(answer);
      message.textContent = `${n >= 0 ? t('won', { n: n + 1 }) : t('lost', { word: upper(answer, wordLang) })} · ${t('next', { time: untilMidnight() })}`;
      message.classList.remove('flash');
      share.hidden = false;
      share.textContent = t('share');
    } else {
      message.textContent = '';
      message.classList.remove('flash');
      share.hidden = true;
    }
    if (revealing !== null && done) {
      // The result waits for the last cell.
      message.textContent = '';
      share.hidden = true;
    }
    legend.hidden = legend.hidden || !!message.textContent;
    drawTray();
  }

  share.addEventListener('click', () => {
    const text = shareLine(t('title'), game(), answer);
    void navigator.clipboard?.writeText(text).then(
      () => (share.textContent = t('copied')),
      () => (share.textContent = text),
    );
  });

  async function start(): Promise<void> {
    list = null;
    draw();
    const want = wordLang;
    const loaded = await wordList(want);
    if (stopped || want !== wordLang) return;
    list = loaded;
    day = dayNumber();
    answer = answerFor(day, list.answers, wordLang);
    draw();
  }

  // A new day while the game is open (midnight), and a save from another tab.
  const timer = setInterval(() => {
    if (dayNumber() !== day && list) {
      day = dayNumber();
      answer = answerFor(day, list.answers, wordLang);
      typed = '';
      draw();
    } else if (finished(game(), answer) && !message.classList.contains('flash')) draw();
  }, 30_000);
  const onStorage = (event: StorageEvent) => {
    if (event.key === FRAMES_KEY) {
      state = loadFrames(load(FRAMES_KEY));
      draw();
    }
  };
  addEventListener('storage', onStorage);
  const onLang = () => draw();
  addEventListener('langchange', onLang);
  void start();

  return () => {
    how.destroy();
    stopped = true;
    clearInterval(timer);
    clearTimeout(messageTimer);
    clearFlip();
    removeEventListener('storage', onStorage);
    removeEventListener('langchange', onLang);
    root.replaceChildren();
  };
}
