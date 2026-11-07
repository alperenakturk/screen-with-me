// The in-room Quiz (on the game stage): question, four options (2×2) or true / false, timer bar, players and
// points; the reveal shows the right option and who picked what (small avatars), then a podium. In the lobby the
// host picks the language, topic and length; everyone has one 50:50 joker per game.

import './lobby.css';
import { gameHint } from './hint.ts';
import { OPEN, openSocket, type SwmSocket } from '@swm/shared/socket';
import {
  QUIZ_SEEN_KEEP,
  encodeSeen,
  QUIZ_ANSWER_MS,
  QUIZ_CATEGORIES,
  QUIZ_COUNTS,
  QUIZ_MAX_PLAYERS,
  QUIZ_PROTOCOL_VERSION,
  QUIZ_REVEAL_MS,
  type QuizClientMessage,
  type QuizServerMessage,
  type QuizTopic,
} from '@swm/shared/games/quiz';
import { QUIZ_BANK } from '@swm/shared/games/quiz-questions';
import type { Avatar } from '@swm/shared/protocol';
import { el } from '../dom.ts';
import { t, translate } from '../i18n.ts';
import { clientId, load, save } from '../storage.ts';
import { avatarNode } from '../ui/avatar.ts';
import { playSound } from '../sound.ts';
import { setGameLive } from './live.ts';
import { debugHooks } from '../debug-lab.ts';
import { lang } from '../i18n.ts';
import quiz1Art from './art/tutorial/quiz-1-answer.svg?raw';
import quiz2Art from './art/tutorial/quiz-2-reveal.svg?raw';
import quiz3Art from './art/tutorial/quiz-3-podium.svg?raw';
import { tableHowTo } from './how-to-play.ts';
import { resultCard, resultGlowbeam, showPointsResult } from './result.ts';
import { langChoices, lobbyPlayers, podium, settingsPanel } from './ui.ts';

type State = Extract<QuizServerMessage, { t: 'state' }>;
const LETTERS = ['A', 'B', 'C', 'D'];

/** Oyunu `app`'in içine kurar; dönen işlev bağlantıyı ve zamanlayıcıları kapatır. */
/** Questions this browser has seen (newest last), so the next games pick others (P9). */
const SEEN_KEY = 'quiz:seen';
function seenIds(): number[] {
  try {
    const list = JSON.parse(load(SEEN_KEY) || '[]') as unknown;
    return Array.isArray(list) ? list.filter((id): id is number => Number.isInteger(id) && id >= 0).slice(-QUIZ_SEEN_KEEP) : [];
  } catch {
    return [];
  }
}
function rememberSeen(id: number): void {
  const list = seenIds();
  if (list.includes(id)) return;
  save(SEEN_KEY, JSON.stringify([...list, id].slice(-QUIZ_SEEN_KEEP)));
}


/** GP2: this game's "How to play" texts (its own, like every game chunk's; the room page's i18n stays small). */
const TEXT = {
  en: {
    how1: 'Answer fast',
    how1Line: 'Pick one of four answers before the time runs out; the faster, the more points.',
    how2: 'See who was right',
    how2Line: 'The right answer lights up, with everyone’s picks.',
    how3: 'Top the podium',
    how3Line: 'After ten questions, the most points win.',
    endWin: 'The sharpest mind in the room!',
    endLose: 'So close. One more round?',
    endDraw: 'Neck and neck! Play again to settle it.',
    endOver: 'What a quiz!',
  },
  tr: {
    how1: 'Hızlı cevapla',
    how1Line: 'Süre bitmeden dört cevaptan birini seç; ne kadar hızlı, o kadar puan.',
    how2: 'Kim bildi, gör',
    how2Line: 'Doğru cevap yanar, herkesin seçtiğiyle birlikte.',
    how3: 'Kürsüye çık',
    how3Line: 'On sorunun sonunda puanı en çok olan kazanır.',
    endWin: 'Odanın en keskin zekâsı!',
    endLose: 'Çok yaklaştın. Bir tur daha?',
    endDraw: 'Başa baş! Yeniden oynayıp kapatın.',
    endOver: 'Ne yarışmaydı!',
  },
} as const;
const tx = (key: keyof (typeof TEXT)['en']): string => (lang() === 'tr' ? TEXT.tr : TEXT.en)[key];

export function mountQuiz(app: HTMLElement, gameId: string, name: string, avatar: Avatar): () => void {
  app.innerHTML = `
    <div class="xox-page draw-page quiz-page">
      <div class="draw-main">
        <section class="card quiz-main">
          <div class="draw-top">
            <span id="quiz-n" class="muted small"></span>
            <span id="quiz-cat" class="quiz-cat"></span>
            <span class="quiz-top-right">
              <button id="quiz-joker" type="button" class="quiz-joker" hidden></button>
              <span id="quiz-timer" class="draw-timer"></span>
            </span>
          </div>
          <div class="draw-bar" aria-hidden="true"><i id="quiz-time"></i></div>
          <div id="quiz-body" class="quiz-body" aria-live="polite"></div>
        </section>
        <aside class="card draw-side">
          <ul id="quiz-players" class="draw-players"></ul>
        </aside>
      </div>
      <div id="quiz-flash" hidden></div>
    </div>`;
  translate(app);
  const $ = <T extends HTMLElement = HTMLElement>(sel: string) => app.querySelector<T>(sel)!;

  let state: State | null = null;
  let me: string | null = null;
  let offset = 0;
  /** Bu soruda benim seçtiğim (sunucu açıklamaya kadar söylemez). */
  let myPick: { n: number; pick: number } | null = null;
  /** Options my 50:50 hid on question `n`. */
  let fifty: { n: number; hide: number[] } | null = null;
  const joker = $<HTMLButtonElement>('#quiz-joker');
  joker.addEventListener('click', () => {
    if (state?.phase === 'question') send({ t: 'joker', n: state.n });
  });
  /** The previous state (sounds play on changes only: joining mid-game is quiet). */
  let lastKey = '';
  /** The question whose options already slid in (later renders of it don't replay that). */
  let shownN = 0;
  let lastTick = 0;
  const body = $('#quiz-body');
  /** Who had used their joker at the last state (a new one is announced to everyone). */
  let jokers = new Set<string>();
  let primed = false;
  const hint = gameHint($('#quiz-flash'));
  const flash = (text: string) => hint.show(text, 2200);
  // GP3: the tables' result card at the end, with the podium inside.
  const result = resultCard(app.firstElementChild as HTMLElement, resultGlowbeam());
  const endLines = () => ({ win: tx('endWin'), lose: tx('endLose'), draw: tx('endDraw'), over: tx('endOver') });

  function sounds(s: State, mine: State['players'][number] | undefined): void {
    const key = `${s.phase}:${s.n}`;
    if (lastKey !== '' && key !== lastKey && mine) {
      if (s.phase === 'question') playSound('roundMine');
      else if (s.phase === 'reveal') playSound(mine.gained ? 'guessRight' : 'wrong');
      else if (s.phase === 'over') playSound('podium');
    }
    lastKey = key;
  }

  function render(): void {
    if (state) setGameLive(state.phase !== 'lobby' && state.phase !== 'over' && state.players.some((p) => p.id === me));
    if (!state) return;
    const s = state;
    const mine = s.players.find((p) => p.id === me);
    sounds(s, mine);
    const used = new Set(s.players.filter((p) => p.joker).map((p) => p.id));
    // Not on the first state (joining mid-game announces nothing).
    if (primed) for (const p of s.players) if (used.has(p.id) && !jokers.has(p.id) && s.phase === 'question') flash(t('quiz.jokerBy', { name: p.id === me ? t('games.you') : p.name }));
    jokers = used;
    primed = true;
    $('#quiz-players').replaceChildren(
      ...[...s.players]
        .sort((a, b) => b.score - a.score)
        .map((p) =>
          el(
            'li',
            { class: `draw-player${p.online ? '' : ' away'}${s.phase === 'question' && p.answered ? ' guessed' : ''}` },
            avatarNode(p.avatar, 'draw-avatar'),
            el('span', { class: 'draw-pname' }, p.id === me ? `${p.name} (${t('games.you')})` : p.name),
            el('span', { class: 'draw-badge', 'aria-hidden': 'true' }, s.phase === 'question' && p.answered ? '✅' : s.phase === 'reveal' && p.gained ? `+${p.gained}` : ''),
            p.streak >= 2 && s.phase !== 'lobby' ? el('span', { class: 'quiz-streak', title: t('quiz.streak', { n: p.streak }) }, `🔥${p.streak}`) : null,
            p.joker && s.phase !== 'lobby' && s.phase !== 'over' ? el('span', { class: 'quiz-joker-used', title: t('quiz.joker') }, '½') : null,
            el('b', { class: 'draw-score' }, String(p.score)),
          ),
        ),
    );
    app.firstElementChild!.classList.toggle('draw-lobby', s.phase === 'lobby' || s.phase === 'over');
    $('#quiz-n').textContent = s.phase === 'lobby' ? t('draw.players', { n: s.players.filter((p) => p.online).length, max: QUIZ_MAX_PLAYERS }) : s.phase === 'over' ? '' : t('quiz.n', { n: s.n, total: s.total });
    // The topic, and the question's difficulty as stars (P9: the bank's `d`, easy questions first).
    const level = typeof s.qid === 'number' ? (QUIZ_BANK[s.qid]?.d ?? 2) : 0;
    $('#quiz-cat').textContent =
      s.cat && (s.phase === 'question' || s.phase === 'reveal') ? `${t(`quiz.cat.${s.cat}`)}${level ? ` · ${'★'.repeat(level)}${'☆'.repeat(3 - level)}` : ''}` : '';
    // The joker: only while I can still answer a four-option question.
    const asking = s.phase === 'question' && (s.options?.length ?? 0) === 4;
    const answeredNow = (myPick && myPick.n === s.n) || !!mine?.answered;
    joker.hidden = !asking || !mine;
    joker.disabled = !!mine?.joker || !!answeredNow;
    joker.textContent = `½ ${t('quiz.joker')}`;
    joker.title = mine?.joker ? t('quiz.jokerUsed') : t('quiz.jokerTitle');

    if (s.phase === 'over') showPointsResult(result, `quiz:${gameId}`, s.players, s.host, me, endLines(), () => send({ t: 'start' }));
    else result.hide();
    if (s.phase === 'lobby' || s.phase === 'over') {
      const online = s.players.filter((p) => p.online).length;
      const go = el('button', { type: 'button', class: 'btn primary' }, t(s.phase === 'over' ? 'quiz.again' : 'draw.start'));
      const lead = s.players.find((p) => p.id === s.host);
      // Only the host starts (the server checks too).
      go.disabled = online < 2 || (!!lead && s.host !== me);
      go.addEventListener('click', () => send({ t: 'start' }));
      // Two halves: what this is (title + rules / podium) and the setup (settings + start); side by side when the
      // box is wide and short.
      const intro =
        s.phase === 'over'
          ? el('div', { class: 'quiz-intro' }, el('h3', {}, t('games.over')), podium(s.players))
          : el('div', { class: 'quiz-intro' }, el('h3', {}, t('games.quiz.title')), el('p', { class: 'quiz-rules' }, t('quiz.rules', { count: s.count })));
      const parts: HTMLElement[] = [];
      const host = s.players.find((p) => p.id === s.host);
      const topics: QuizTopic[] = ['mix', ...QUIZ_CATEGORIES];
      parts.push(
        settingsPanel(
          [
            { label: t('games.lang'), value: s.lang, choices: langChoices, pick: (lang) => send({ t: 'settings', lang: lang as 'tr' | 'en' }) },
            { label: t('quiz.topic'), value: s.topic, select: true, choices: topics.map((topic) => ({ value: topic, label: t(`quiz.cat.${topic}`) })), pick: (topic) => send({ t: 'settings', topic: topic as QuizTopic }) },
            { label: t('quiz.count'), value: s.count, choices: QUIZ_COUNTS.map((n) => ({ value: n, label: String(n) })), pick: (count) => send({ t: 'settings', count: count as 5 | 10 | 15 }) },
          ],
          s.host === me || !host ? null : host.name,
        ),
      );
      if (s.phase === 'over') go.textContent = t('games.again');
      parts.push(go, el('p', { class: 'muted small' }, online < 2 ? t('draw.needTwo') : t('draw.ready', { n: online })));
      // CL2: the players are a row of faces in the card (no players column beside the lobby).
      if (s.phase === 'lobby') intro.append(lobbyPlayers(s.players, me, s.host));
      body.replaceChildren(el('div', { class: 'quiz-center' }, intro, el('div', { class: 'quiz-setup' }, ...parts)));
    } else {
      const reveal = s.phase === 'reveal';
      const picked = myPick && myPick.n === s.n ? myPick.pick : (mine?.pick ?? null);
      const hidden = fifty && fifty.n === s.n ? fifty.hide : [];
      queueMicrotask(() => (shownN = s.n));
      const options = (s.options ?? []).map((text, i) => {
        const pickers = reveal ? s.players.filter((p) => p.pick === i) : [];
        const cls = ['quiz-option', `opt-${i}`];
        if (hidden.includes(i)) cls.push('gone');
        if (picked === i) cls.push('picked');
        if (reveal && i === s.correct) cls.push('correct');
        if (reveal && picked === i && i !== s.correct) cls.push('wrong');
        const b = el(
          'button',
          { type: 'button', class: cls.join(' ') },
          el('span', { class: 'quiz-letter', 'aria-hidden': 'true' }, LETTERS[i]!),
          el('span', { class: 'quiz-text' }, text),
          el('span', { class: 'quiz-pickers' }, ...pickers.map((p) => avatarNode(p.avatar, 'quiz-picker'))),
        );
        b.disabled = reveal || picked !== null || hidden.includes(i);
        b.addEventListener('click', () => {
          myPick = { n: s.n, pick: i };
          send({ t: 'answer', n: s.n, pick: i });
          playSound('locked');
          render();
        });
        return b;
      });
      const note = reveal
        ? mine?.gained
          ? mine.rank
            ? t('quiz.rightRank', { rank: mine.rank, points: mine.gained })
            : t('quiz.right', { points: mine.gained })
          : picked === null
            ? t('quiz.late')
            : t('quiz.wrongAnswer')
        : picked !== null
          ? t('quiz.waiting')
          : '';
      body.replaceChildren(el('h3', { class: 'quiz-question' }, s.question ?? ''), el('div', { class: `quiz-options${options.length === 2 ? ' two' : ''}${!reveal && shownN !== s.n ? ' fresh' : ''}` }, ...options), el('p', { class: `quiz-note${reveal && mine?.gained ? ' good' : ''}` }, note));
    }
    tick();
  }

  function tick(): void {
    const s = state;
    const bar = $('#quiz-time');
    const timer = $('#quiz-timer');
    if (!s || s.endsAt === null) {
      bar.style.width = '0%';
      timer.textContent = '';
      return;
    }
    const left = Math.max(0, s.endsAt - (Date.now() + offset));
    const total = s.phase === 'question' ? QUIZ_ANSWER_MS : QUIZ_REVEAL_MS;
    bar.style.width = `${Math.min(100, (left / total) * 100)}%`;
    bar.classList.toggle('low', s.phase === 'question' && left < 5000);
    timer.textContent = s.phase === 'question' ? `${Math.ceil(left / 1000)}` : '';
    // The last 3 seconds tick, only while I still have to answer.
    const secs = Math.ceil(left / 1000);
    const waitingForMe = s.phase === 'question' && !(myPick && myPick.n === s.n) && s.players.some((p) => p.id === me && !p.answered);
    if (waitingForMe && secs >= 1 && secs <= 3 && secs !== lastTick) playSound('tick');
    lastTick = waitingForMe && secs <= 3 ? secs : 0;
  }
  const ticker = window.setInterval(tick, 200);

  // ---- Bağlantı ----
  let ws: SwmSocket | null = null;
  let stopped = false;
  let pingAt = 0;
  function send(message: QuizClientMessage): void {
    if (ws?.readyState === OPEN) ws.send(JSON.stringify(message));
  }
  function connect(): void {
    if (stopped) return;
    const socket = openSocket(`${location.origin.replace(/^http/, 'ws')}/api/quiz/${encodeURIComponent(gameId)}/ws`);
    ws = socket;
    const lang = document.documentElement.lang === 'en' ? 'en' : 'tr';
    socket.addEventListener('open', () =>
      socket.send(JSON.stringify({ t: 'hello', v: QUIZ_PROTOCOL_VERSION, name, avatar, cid: clientId(), lang, seen: encodeSeen(seenIds()) } satisfies QuizClientMessage)),
    );
    socket.addEventListener('message', (event) => {
      let m: QuizServerMessage;
      try {
        m = JSON.parse(String(event.data)) as QuizServerMessage;
      } catch {
        return;
      }
      if (m.t === 'welcome') {
        me = m.you;
        offset = m.now - Date.now();
      } else if (m.t === 'pong') offset = m.now + (performance.now() - pingAt) / 2 - Date.now();
      else if (m.t === 'fifty') {
        fifty = { n: m.n, hide: m.hide };
        render();
      } else if (m.t === 'state') {
        state = m;
        if (typeof m.qid === 'number') rememberSeen(m.qid);
        render();
      } else if (m.t === 'error' && (m.code === 'version' || m.code === 'full')) {
        stopped = true;
        body.replaceChildren(el('p', { class: 'quiz-note' }, t(m.code === 'version' ? 'games.version' : 'games.full')));
      }
    });
    socket.addEventListener('close', () => {
      if (ws !== socket || stopped) return;
      setTimeout(connect, 1500);
    });
  }
  connect();
  const ping = window.setInterval(() => {
    pingAt = performance.now();
    send({ t: 'ping' });
  }, 15_000);
  const close = () => {
    stopped = true;
    ws?.close();
  };
  const onLang = () => {
    translate(app);
    render();
  };
  addEventListener('pagehide', close);
  addEventListener('langchange', onLang);
  // Test Lab (DL3b): the current phase ends now (local lab server only).
  const offLab = debugHooks.register('table.quiz', () => ({
    commands: [
      { id: 'quiz.skip', title: 'Quiz: end this phase now', help: 'Local lab server only: the question / round / reveal ends at once.', tab: 'games', where: 'at a Quiz table', run: () => send({ t: 'lab', op: 'skip' }) },
    ],
  }));
  // GP2: the same "How to play" cards as every game (first time, and the "?" in the head).
  const how = tableHowTo(app, 'quiz:howSeen', () => [
    { art: quiz1Art, title: tx('how1'), line: tx('how1Line') },
    { art: quiz2Art, title: tx('how2'), line: tx('how2Line') },
    { art: quiz3Art, title: tx('how3'), line: tx('how3Line') },
  ], app.querySelector<HTMLElement>('.draw-top'));
  return () => {
    offLab();
    how.destroy();
    setGameLive(false);
    close();
    clearInterval(ticker);
    clearInterval(ping);
    hint.hide();
    removeEventListener('pagehide', close);
    removeEventListener('langchange', onLang);
  };
}
