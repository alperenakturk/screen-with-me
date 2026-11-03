// 🎟️ Five Frames (TR "Beş Kare"), the daily word game played on the side (CARDS.md "Daily word game"; look: the
// owner's board A "ticket row", `docs/internal/design/side-games/README.md`; research `research/word-game.md`). The
// rules are `@swm/shared/games/five-frames`; the word lists are their own chunks per language (`./words/en.ts`,
// `./words/tr.ts`, credits in /third-party-notices.txt). One guess = one ticket: a numbered stub, a tear line, five
// cells (✓ gold = right place, • gold outline = in the word, faded = not in it). The letter tray is alphabetical, never
// a keyboard strip under the board. The room's keys stay the room's: the physical keyboard types here only while the
// board itself has the focus (click it), and its buttons never take the focus.

import './five-frames.css';
import {
  ALPHABET, FRAMES_KEY, MAX_TRIES, WORD_LENGTH, answerFor, dayNumber, finished, guess, letters, loadFrames, normalize,
  record, saveFrames, score, shareLine, solved, today, trayMarks, upper, type FramesSave, type Lang, type Mark,
} from '@swm/shared/games/five-frames';
import { el } from '../dom.ts';
import { lang as pageLang } from '../i18n.ts';
import { playSound } from '../sound.ts';
import { load, save } from '../storage.ts';

const TEXT = {
  en: {
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
    credits: 'About the word lists',
    loading: 'Loading the words…',
    played: '{won}/{played} won · best run {best}',
  },
  tr: {
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
    credits: 'Kelime listeleri hakkında',
    loading: 'Kelimeler yükleniyor…',
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
  const credits = el('a', { class: 'ff-credits', href: '/third-party-notices.txt', target: '_blank', rel: 'noopener' });
  const result = el('div', { class: 'ff-result' }, message, share, credits);
  const tray = el('div', { class: 'ff-tray' });
  const box = el('div', { class: 'ff' }, head, board, result, tray);
  root.replaceChildren(box);
  box.addEventListener('mousedown', (event) => {
    if ((event.target as Element).closest('button')) event.preventDefault();
  });

  let messageTimer: ReturnType<typeof setTimeout> | undefined;
  function say(text: string, ms = 2200): void {
    message.textContent = text;
    message.classList.add('flash');
    clearTimeout(messageTimer);
    if (ms) messageTimer = setTimeout(() => draw(), ms);
  }

  const game = () => today(state, wordLang, day);

  function press(key: string): void {
    if (!list || stopped) return;
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
    draw();
  }

  function submit(): void {
    if (!list) return;
    const g = game();
    const error = guess(g, typed, answer, wordLang, { allowed: (w) => list!.allowed.has(w) });
    if (error) {
      if (error !== 'done') {
        playSound('guessWrong');
        rows[g.guesses.length]?.row.classList.remove('shake');
        void rows[g.guesses.length]?.row.offsetWidth;
        rows[g.guesses.length]?.row.classList.add('shake');
        say(t(error === 'short' ? 'short' : error === 'letters' ? 'letters' : error === 'repeat' ? 'repeat' : 'unknown'));
      }
      return;
    }
    typed = '';
    const done = finished(g, answer);
    if (done && record(state, wordLang, g, answer)) playSound(solved(g, answer) ? 'guessRight' : 'lose');
    else if (!done) playSound(score(g.guesses[g.guesses.length - 1]!, answer).every((m) => m === 'hit') ? 'guessRight' : 'locked');
    save(FRAMES_KEY, saveFrames(state));
    draw();
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
    const marks = list ? trayMarks(game().guesses, answer) : new Map<string, Mark>();
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
    streak.textContent = t('streak', { n: stats.streak });
    streak.title = `${t('streakTitle')} · ${t('played', { won: stats.won, played: stats.played, best: stats.best })}`;
    langButtons.forEach((b) => {
      b.classList.toggle('on', b.dataset.lang === wordLang);
      b.setAttribute('aria-pressed', String(b.dataset.lang === wordLang));
      b.title = t('langTitle');
    });
    board.setAttribute('aria-label', t('board'));
    credits.textContent = t('credits');
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
      row.className = `ff-row${word ? ' done' : current ? ' current' : ' future'}`;
      const chars = word ? letters(word) : current ? letters(typed) : [];
      const marks = word ? score(word, answer) : [];
      cells.forEach((cell, j) => {
        cell.className = `ff-cell${marks[j] ? ` ${marks[j]}` : ''}`;
        cell.textContent = chars[j] ? upper(chars[j]!, wordLang) : '';
      });
    });
    if (done) {
      const n = g.guesses.indexOf(answer);
      message.textContent = `${n >= 0 ? t('won', { n: n + 1 }) : t('lost', { word: upper(answer, wordLang) })} · ${t('next', { time: untilMidnight() })}`;
      message.classList.remove('flash');
      share.hidden = false;
      share.textContent = t('share');
    } else {
      message.textContent = '';
      share.hidden = true;
    }
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
    stopped = true;
    clearInterval(timer);
    clearTimeout(messageTimer);
    removeEventListener('storage', onStorage);
    removeEventListener('langchange', onLang);
    root.replaceChildren();
  };
}
