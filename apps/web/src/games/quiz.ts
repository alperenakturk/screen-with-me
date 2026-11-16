// The in-room Quiz (on the game stage): question, four options (2×2), true / false or a typed answer, timer bar,
// players and points; the reveal shows the right option and who picked what (small avatars), then a podium. In the
// lobby the host picks the language and Classic (topic, length) or Tournament (QZ2: each player picks a round's topic
// in turn, once or twice round the table). Jokers (QZ2): 50:50, Double and Second chance, each once a game.

import './lobby.css';
import { gameHint } from './hint.ts';
import { OPEN, openSocket, type SwmSocket } from '@swm/shared/socket';
import {
  QUIZ_SEEN_KEEP,
  encodeSeen,
  QUIZ_CATEGORIES,
  QUIZ_COUNTS,
  QUIZ_MAX_PLAYERS,
  QUIZ_PROTOCOL_VERSION,
  QUIZ_REVEAL_MS,
  QUIZ_TYPED_MAX,
  QUIZ_LAPS,
  QUIZ_PICK_MS,
  QUIZ_ROUND_QUESTIONS,
  tournamentOrder,
  quizAnswerMs,
  type QuizJoker,
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
import { LOCAL_ONLY, labServerHere } from './lab-server.ts';
import { debugHooks } from '../debug-lab.ts';
import { referee } from './referee.ts';
import { lang } from '../i18n.ts';
import quiz1Art from './art/tutorial/quiz-1-answer.svg?raw';
import quiz2Art from './art/tutorial/quiz-2-reveal.svg?raw';
import quiz3Art from './art/tutorial/quiz-3-podium.svg?raw';
import { tableHowTo } from './how-to-play.ts';
import { resultCard, resultStub, showPointsResult } from './result.ts';
import { langChoices, lobbyPlayers, podium, settingsPanel } from './ui.ts';
import { silence } from './silent.ts';
import { hasMouse } from '../device.ts';
import { GAME_CLOCK_EVERY, GAME_KEEPALIVE_MS, KEEPALIVE, KEEPALIVE_ACK, keepaliveTicks } from '@swm/shared/keepalive';

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
    refAll: 'Everyone got it!',
    refStreak: '{n} in a row!',
    refTricky: 'A tricky one!',
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
    refAll: 'Herkes bildi!',
    refStreak: 'Üst üste {n}!',
    refTricky: 'Zorlu bir soruydu!',
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
              <span id="quiz-jokers" class="quiz-jokers"></span>
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
  /** Options my 50:50 hid on question `n` (on a typed question: the hint). */
  let fifty: { n: number; hide: number[]; hint?: string } | null = null;
  /** QZ2 jokers: the question I played one on (one per question) and which; my Second chance's wrong first try. */
  let myJoker: { n: number; kind: QuizJoker } | null = null;
  let retry: { n: number; wrong?: number } | null = null;
  /** The jokers in the top bar: always the same three small buttons in the same place (hidden off a question, the
   * space kept), an icon each with the full name for screen readers and as a tooltip. */
  const jokerRow = $('#quiz-jokers');
  const JOKER_ICON: Record<QuizJoker, string> = { fifty: '½', double: '×2', second: '↺' };
  const jokerButtons = (['fifty', 'double', 'second'] as const).map((kind) => {
    const b = el('button', { type: 'button', class: `quiz-joker joker-${kind}` }) as HTMLButtonElement;
    b.addEventListener('click', () => {
      const s = state;
      if (!s || s.phase !== 'question' || b.disabled) return;
      myJoker = { n: s.n, kind };
      send({ t: 'joker', n: s.n, kind });
      render();
    });
    jokerRow.append(b);
    return { kind, b };
  });
  /** The previous state (sounds play on changes only: joining mid-game is quiet). */
  let lastKey = '';
  /** The question whose options already slid in (later renders of it don't replay that). */
  let shownN = 0;
  let lastTick = 0;
  const body = $('#quiz-body');
  /** The question on screen (QZ2: kept between states so a press always lands on the button it started on). */
  let view: { n: number; q: string; texts: string[]; list: HTMLElement; buttons: HTMLButtonElement[]; note: HTMLElement; fresh: boolean; typed?: Typed } | null = null;
  /** A typed-answer question's box (QZ2): the field, its button, and the reveal's right answer and players' answers. */
  interface Typed {
    input: HTMLInputElement;
    go: HTMLButtonElement;
    said: HTMLElement;
  }
  /** What I typed for question `n` (shown back in the field until the reveal). */
  let myText: { n: number; text: string } | null = null;
  function answerTyped(n: number, text: string): void {
    const clean = text.trim().slice(0, QUIZ_TYPED_MAX);
    if (!clean || !state || state.phase !== 'question' || state.n !== n || (myPick && myPick.n === n)) return;
    if (state.players.find((p) => p.id === me)?.answered) return;
    myPick = { n, pick: -1 };
    myText = { n, text: clean };
    send({ t: 'answer', n, text: clean });
    playSound('locked');
    render();
  }
  function buildTyped(n: number, question: string): NonNullable<typeof view> {
    const input = el('input', { type: 'text', class: 'quiz-type-input', maxlength: String(QUIZ_TYPED_MAX), autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', enterkeyhint: 'send', 'aria-label': t('quiz.typeLabel'), placeholder: t('quiz.typeHere') }) as HTMLInputElement;
    const go = el('button', { type: 'submit', class: 'btn primary quiz-type-go' }, t('quiz.typeSend')) as HTMLButtonElement;
    const form = el('form', { class: 'quiz-type' }, input, go);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      answerTyped(n, input.value);
    });
    const said = el('ul', { class: 'quiz-said' });
    const note = el('p', { class: 'quiz-note' });
    // The note sits right under the field, so "locked in" and the reveal's verdict appear in the same place.
    body.replaceChildren(el('h3', { class: 'quiz-question' }, question), form, note, said);
    shownN = n;
    // A keyboard is there: the field is ready to type into (a phone's keyboard opens on a tap).
    if (hasMouse()) queueMicrotask(() => input.focus({ preventScroll: true }));
    return { n, q: question, texts: [], list: form, buttons: [], note, fresh: false, typed: { input, go, said } };
  }
  /** My answer to option `i` of question `n`: once, on the first press (pointer, key or screen reader). */
  function answer(n: number, i: number): void {
    if (!state || state.phase !== 'question' || state.n !== n || (myPick && myPick.n === n)) return;
    if (fifty && fifty.n === n && fifty.hide.includes(i)) return;
    if (retry && retry.n === n && retry.wrong === i) return;
    if (state.players.find((p) => p.id === me)?.answered) return;
    myPick = { n, pick: i };
    send({ t: 'answer', n, pick: i });
    playSound('locked');
    render();
  }
  function buildQuestion(n: number, question: string, texts: string[]): NonNullable<typeof view> {
    const buttons = texts.map((text, i) => {
      const b = el(
        'button',
        { type: 'button', class: `quiz-option opt-${i}` },
        el('span', { class: 'quiz-letter', 'aria-hidden': 'true' }, LETTERS[i]!),
        el('span', { class: 'quiz-text' }, text),
        el('span', { class: 'quiz-pickers' }),
      );
      // The press counts at once (a touch or mouse press, not its release); keys and screen readers come as a click.
      b.addEventListener('pointerdown', (e) => {
        if (e.button === 0 && !b.disabled) answer(n, i);
      });
      b.addEventListener('click', () => answer(n, i));
      return b;
    });
    const list = el('div', { class: `quiz-options${texts.length === 2 ? ' two' : ''}` }, ...buttons);
    const note = el('p', { class: 'quiz-note' });
    body.replaceChildren(el('h3', { class: 'quiz-question' }, question), list, note);
    // The slide-in plays once, on the question's first render.
    const built = { n, q: question, texts: [...texts], list, buttons, note, fresh: shownN !== n };
    shownN = n;
    return built;
  }
  /** Who had used their joker at the last state (a new one is announced to everyone). */
  let jokers = new Set<string>();
  let primed = false;
  const hint = gameHint($('#quiz-flash'));
  const flash = (text: string) => hint.show(text, 2200);
  // GP3: the tables' result card at the end, with the podium inside.
  const result = resultCard(app.firstElementChild as HTMLElement, resultStub());
  const endLines = () => ({ win: tx('endWin'), lose: tx('endLose'), draw: tx('endDraw'), over: tx('endOver') });
  // GP4: Stub the referee says a kind word at a reveal (everyone right, my streak, a tricky one); never a mistake.
  const ref = referee(app.firstElementChild as HTMLElement);
  function refereeLine(s: State): void {
    const playing = s.players.filter((p) => p.online);
    const right = playing.filter((p) => p.pick === s.correct);
    const mine = s.players.find((p) => p.id === me);
    if (playing.length >= 2 && right.length === playing.length) ref.say(tx('refAll'), 'cheer');
    else if (mine && mine.pick === s.correct && mine.streak >= 3) ref.say(tx('refStreak').replace('{n}', String(mine.streak)), 'cheer');
    else if (playing.length >= 1 && right.length === 0) ref.say(tx('refTricky'), 'gasp');
  }

  function sounds(s: State, mine: State['players'][number] | undefined): void {
    const key = `${s.phase}:${s.n}`;
    if (lastKey !== '' && key !== lastKey && s.phase === 'reveal') refereeLine(s);
    if (lastKey !== '' && key !== lastKey && mine) {
      if (s.phase === 'question') playSound('roundMine');
      else if (s.phase === 'reveal') playSound(mine.gained ? 'guessRight' : 'wrong');
      else if (s.phase === 'over') playSound('podium');
    }
    lastKey = key;
  }

  /** Tournament (QZ2): the round's picker chooses a topic (the others watch); the last round's winners above. */
  let pickView: { key: string; buttons: HTMLButtonElement[] } | null = null;
  function renderPick(s: State): void {
    const mine = s.picker === me;
    const picker = s.players.find((p) => p.id === s.picker);
    const offer = s.offer ?? [];
    const key = `${s.round}:${offer.join(',')}:${mine}`;
    const last = (s.round ?? 1) - 1;
    const names = (s.roundWin ?? []).map((id) => s.players.find((p) => p.id === id)?.name).filter(Boolean).join(', ');
    // Built once per round (a state while the picker presses must not swap the button under the press).
    if (!pickView || pickView.key !== key || !body.contains(pickView.buttons[0] ?? null)) {
      const buttons = offer.map((cat) => {
        const b = el('button', { type: 'button', class: 'quiz-option quiz-pick-cat' }, el('span', { class: 'quiz-text' }, t(`quiz.cat.${cat}`))) as HTMLButtonElement;
        const choose = () => {
          if (!b.disabled && state?.phase === 'pick' && state.picker === me) {
            send({ t: 'pick', cat });
            for (const x of buttons) x.disabled = true;
            b.classList.add('picked');
          }
        };
        b.addEventListener('pointerdown', (e) => e.button === 0 && choose());
        b.addEventListener('click', choose);
        b.disabled = !mine;
        return b;
      });
      body.replaceChildren(
        el('p', { class: 'quiz-round-result' }, last > 0 ? (names ? t('quiz.roundWon', { names, n: last }) : t('quiz.roundNone', { n: last })) : ''),
        el('h3', { class: 'quiz-question' }, mine ? t('quiz.pickYours') : t('quiz.pickWait', { name: picker?.name ?? '…' })),
        el('div', { class: 'quiz-options quiz-pick' }, ...buttons),
      );
      pickView = { key, buttons };
      if (mine) playSound('roundMine');
    }
  }

  function render(): void {
    if (state) setGameLive(state.phase !== 'lobby' && state.phase !== 'over' && state.players.some((p) => p.id === me));
    if (!state) return;
    const s = state;
    const mine = s.players.find((p) => p.id === me);
    sounds(s, mine);
    // Every new joker is announced to the table (not on the first state: joining mid-game announces nothing).
    const used = new Set(s.players.flatMap((p) => [...(p.jokers ?? (p.joker ? ['fifty'] : []))].map((k) => `${p.id}:${k}`)));
    if (primed && s.phase === 'question')
      for (const p of s.players)
        for (const kind of p.jokers ?? (p.joker ? ['fifty' as const] : []))
          // My own Double / Second chance shows on its pressed button; the others' are announced.
          if (!jokers.has(`${p.id}:${kind}`) && (kind === 'fifty' || p.id !== me)) flash(t(kind === 'fifty' ? 'quiz.jokerBy' : kind === 'double' ? 'quiz.doubleBy' : 'quiz.secondBy', { name: p.id === me ? t('games.you') : p.name }));
    jokers = used;
    primed = true;
    if (s.phase === 'lobby' || s.phase === 'over' || s.phase === 'pick') retry = null;
    $('#quiz-players').replaceChildren(
      ...(s.rounds ? tournamentOrder(s.players) : [...s.players].sort((a, b) => b.score - a.score))
        .map((p) =>
          el(
            'li',
            { class: `draw-player${p.online ? '' : ' away'}${s.phase === 'question' && p.answered ? ' guessed' : ''}` },
            avatarNode(p.avatar, 'draw-avatar'),
            el('span', { class: 'draw-pname' }, p.id === me ? `${p.name} (${t('games.you')})` : p.name),
            el('span', { class: 'draw-badge', 'aria-hidden': 'true' }, s.phase === 'question' && p.answered ? '✅' : s.phase === 'reveal' && p.gained ? `+${p.gained}` : ''),
            p.streak >= 2 && s.phase !== 'lobby' ? el('span', { class: 'quiz-streak', title: t('quiz.streak', { n: p.streak }) }, `🔥${p.streak}`) : null,
            s.phase !== 'lobby' && s.phase !== 'over' && (p.jokers?.length || p.joker)
              ? el('span', { class: 'quiz-joker-used', title: t('quiz.joker') }, (p.jokers ?? ['fifty']).map((k) => JOKER_ICON[k]).join(' '))
              : null,
            s.rounds ? el('span', { class: 'quiz-wins', title: t('quiz.wins', { n: p.wins ?? 0 }) }, `🏆${p.wins ?? 0}`) : null,
            el('b', { class: 'draw-score' }, String(p.score)),
          ),
        ),
    );
    app.firstElementChild!.classList.toggle('draw-lobby', s.phase === 'lobby' || s.phase === 'over');
    // A tournament counts its questions per round ("Round 2/4 · Question 1/3").
    const inRound = s.rounds ? ((s.n - 1) % QUIZ_ROUND_QUESTIONS) + 1 : s.n;
    $('#quiz-n').textContent =
      s.phase === 'lobby'
        ? t('draw.players', { n: s.players.filter((p) => p.online).length, max: QUIZ_MAX_PLAYERS })
        : s.phase === 'over'
          ? ''
          : s.rounds
            ? `${t('quiz.roundN', { round: s.round ?? 1, rounds: s.rounds })}${s.phase === 'pick' ? '' : ` · ${inRound}/${QUIZ_ROUND_QUESTIONS}`}`
            : t('quiz.n', { n: s.n, total: s.total });
    // The topic, and the question's difficulty as stars (P9: the bank's `d`, easy questions first).
    const level = typeof s.qid === 'number' ? (QUIZ_BANK[s.qid]?.d ?? 2) : 0;
    $('#quiz-cat').textContent =
      s.cat && (s.phase === 'question' || s.phase === 'reveal') ? `${t(`quiz.cat.${s.cat}`)}${level ? ` · ${'★'.repeat(level)}${'☆'.repeat(3 - level)}` : ''}` : '';
    // QZ2 jokers: while I can still answer; each kind once a game, one per question (the server checks too). The row
    // keeps its place off a question (hidden, not removed), so nothing below it moves.
    const answeredNow = (myPick && myPick.n === s.n) || !!mine?.answered || (retry?.n === s.n);
    const asking = s.phase === 'question' && !!mine;
    jokerRow.classList.toggle('off', !asking);
    const usedKinds = new Set<QuizJoker>(mine?.jokers ?? (mine?.joker ? ['fifty'] : []));
    for (const { kind, b } of jokerButtons) {
      const label = kind === 'fifty' ? `½ ${t('quiz.joker')}` : t(kind === 'double' ? 'quiz.double' : 'quiz.second');
      if (b.textContent !== JOKER_ICON[kind]) b.textContent = JOKER_ICON[kind];
      b.setAttribute('aria-label', label);
      const onThis = myJoker?.n === s.n;
      const twoOptions = !s.typed && (s.options?.length ?? 0) < 4;
      b.disabled = !asking || usedKinds.has(kind) || onThis || !!answeredNow || (kind === 'fifty' && twoOptions);
      b.setAttribute('aria-pressed', String(onThis && myJoker?.kind === kind));
      b.title = `${label}: ` + (usedKinds.has(kind) && !(onThis && myJoker?.kind === kind) ? t('quiz.jokerUsed') : t(kind === 'fifty' ? 'quiz.jokerTitle' : kind === 'double' ? 'quiz.doubleTitle' : 'quiz.secondTitle'));
    }

    // A tournament ranks by round wins, then points: the podium shows both (the score only orders it).
    const ranked = s.rounds ? tournamentOrder(s.players).map((p) => ({ ...p, score: (p.wins ?? 0) * 1_000_000 + p.score, label: t('quiz.podium', { wins: p.wins ?? 0, points: p.score }) })) : s.players;
    if (s.phase === 'over') showPointsResult(result, `quiz:${gameId}`, ranked, s.host, me, endLines(), () => send({ t: 'start' }));
    else result.hide();
    const tour = s.mode === 'tournament';
    if (s.phase === 'lobby' || s.phase === 'over') {
      // A new game numbers its questions from 1 again: what I picked in the last one must not carry over.
      myPick = null;
      myText = null;
      fifty = null;
      myJoker = null;
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
          ? el('div', { class: 'quiz-intro lobby-intro' }, el('h3', {}, t('games.over')), podium(ranked))
          : el('div', { class: 'quiz-intro lobby-intro' }, el('h3', {}, t('games.quiz.title')), el('p', { class: 'quiz-rules' }, tour ? t('quiz.rulesTour', { rounds: Math.max(2, online) * (s.laps ?? 1) }) : t('quiz.rules', { count: s.count })));
      const parts: HTMLElement[] = [];
      const host = s.players.find((p) => p.id === s.host);
      const topics: QuizTopic[] = ['mix', ...QUIZ_CATEGORIES];
      parts.push(
        settingsPanel(
          [
            { label: t('games.lang'), value: s.lang, choices: langChoices, pick: (lang) => send({ t: 'settings', lang: lang as 'tr' | 'en' }) },
            { label: t('quiz.mode'), value: s.mode ?? 'classic', choices: [{ value: 'classic', label: t('quiz.mode.classic') }, { value: 'tournament', label: t('quiz.mode.tournament') }], pick: (mode) => send({ t: 'settings', mode: mode as 'classic' | 'tournament' }) },
            // Classic: a topic and a length; Tournament: each player picks a round's topic once or twice.
            ...(tour
              ? [{ label: t('quiz.laps'), value: s.laps ?? 1, choices: QUIZ_LAPS.map((n) => ({ value: n, label: String(n) })), pick: (laps: string | number) => send({ t: 'settings', laps: laps as 1 | 2 }) }]
              : [
                  { label: t('quiz.topic'), value: s.topic, select: true, choices: topics.map((topic) => ({ value: topic, label: t(`quiz.cat.${topic}`) })), pick: (topic: string | number) => send({ t: 'settings', topic: topic as QuizTopic }) },
                  { label: t('quiz.count'), value: s.count, choices: QUIZ_COUNTS.map((n) => ({ value: n, label: String(n) })), pick: (count: string | number) => send({ t: 'settings', count: count as 5 | 10 | 15 }) },
                ]),
          ],
          s.host === me || !host ? null : host.name,
        ),
      );
      if (s.phase === 'over') go.textContent = t('games.again');
      parts.push(go, el('p', { class: 'muted small' }, online < 2 ? t('draw.needTwo') : t('draw.ready', { n: online })));
      // CL2: the players are a row of faces in the card (no players column beside the lobby).
      if (s.phase === 'lobby') intro.append(lobbyPlayers(s.players, me, s.host));
      body.replaceChildren(el('div', { class: 'quiz-center lobby-card' }, intro, el('div', { class: 'quiz-setup lobby-setup' }, ...parts)));
    } else if (s.phase === 'pick') {
      renderPick(s);
    } else {
      const reveal = s.phase === 'reveal';
      const picked = myPick && myPick.n === s.n ? myPick.pick : (mine?.pick ?? null);
      const hidden = fifty && fifty.n === s.n ? fifty.hide : [];
      // QZ2: the question's nodes are built once and then patched. Rebuilding them on every state (another player
      // answers, a joker) swapped the button under a press, so the click never came and a second one was needed.
      const texts = s.options ?? [];
      if (!view || view.n !== s.n || view.q !== (s.question ?? '') || !!view.typed !== !!s.typed || view.texts.join('\n') !== texts.join('\n') || !body.contains(view.list))
        view = s.typed ? buildTyped(s.n, s.question ?? '') : buildQuestion(s.n, s.question ?? '', texts);
      const v = view;
      if (v.typed) {
        // QZ2: the typed answer. Others' answers are never sent before the reveal; then each shows with ✅ / ❌.
        const ty = v.typed;
        const done = reveal || picked !== null;
        ty.input.disabled = done;
        // 50:50 on a typed question: the hint in the empty field.
        const hintText = fifty && fifty.n === s.n && fifty.hint ? t('quiz.hint', { hint: fifty.hint }) : t('quiz.typeHere');
        if (ty.input.placeholder !== hintText) ty.input.placeholder = hintText;
        ty.go.disabled = done;
        ty.go.textContent = picked !== null ? t('quiz.typeSent') : t('quiz.typeSend');
        if (myText && myText.n === s.n && ty.input.value !== myText.text) ty.input.value = myText.text;
        ty.said.replaceChildren(
          ...(reveal
            ? s.players
                .filter((p) => p.said)
                .map((p) => el('li', { class: `quiz-said-one${p.pick === 0 ? ' right' : ''}` }, avatarNode(p.avatar, 'quiz-picker'), el('span', { class: 'quiz-said-text' }, p.said!), el('span', { 'aria-hidden': 'true' }, p.pick === 0 ? '✅' : '❌')))
            : []),
        );
      }
      if (!reveal) v.list.classList.toggle('fresh', v.fresh);
      else v.list.classList.remove('fresh');
      v.buttons.forEach((b, i) => {
        b.classList.toggle('gone', hidden.includes(i));
        b.classList.toggle('picked', picked === i);
        b.classList.toggle('correct', reveal && i === s.correct);
        b.classList.toggle('wrong', reveal && picked === i && i !== s.correct);
        const tried = !reveal && retry?.n === s.n && retry.wrong === i;
        b.classList.toggle('tried', tried);
        b.disabled = reveal || picked !== null || hidden.includes(i) || tried;
        const pickers = reveal ? s.players.filter((p) => p.pick === i) : [];
        const box = b.querySelector('.quiz-pickers')!;
        if (box.childElementCount !== pickers.length || !reveal) box.replaceChildren(...pickers.map((p) => avatarNode(p.avatar, 'quiz-picker')));
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
      // A typed question's reveal names the right answer on the verdict's line (QZ2).
      v.note.textContent = v.typed && reveal ? `${note} · ${t('quiz.typedAnswer', { answer: s.answer ?? '' })}` : note;
      v.note.classList.toggle('good', reveal && !!mine?.gained);
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
    const total = s.phase === 'question' ? quizAnswerMs(s.typed) : s.phase === 'pick' ? QUIZ_PICK_MS : QUIZ_REVEAL_MS;
    bar.style.width = `${Math.min(100, (left / total) * 100)}%`;
    bar.classList.toggle('low', s.phase === 'question' && left < 5000);
    timer.textContent = s.phase === 'question' || s.phase === 'pick' ? `${Math.ceil(left / 1000)}` : '';
    // The last 3 seconds tick, only while I still have to answer.
    const secs = Math.ceil(left / 1000);
    const waitingForMe = s.phase === 'question' && !(myPick && myPick.n === s.n) && s.players.some((p) => p.id === me && !p.answered);
    if (waitingForMe && secs >= 1 && secs <= 3 && secs !== lastTick) playSound('tick');
    lastTick = waitingForMe && secs <= 3 ? secs : 0;
    // Time is up but the phase hasn't moved: nudge the table with a real ping (any message makes it catch up). Since
    // QUOTA1a the page's keepalive no longer reaches the table, so this is the page's way to say "it's late".
    const now = Date.now();
    if (left === 0 && s.endsAt + 1500 < now + offset && now - nudgedAt > 3000) {
      nudgedAt = now;
      send({ t: 'ping' });
    }
  }
  let nudgedAt = 0;
  const ticker = window.setInterval(tick, 200);

  // ---- Bağlantı ----
  let ws: SwmSocket | null = null;
  let stopped = false;
  let pingAt = 0;
  // GHOST: the Test Lab's "go silent" keeps this page quiet, as a dead connection would be.
  const quiet = silence();
  function send(message: QuizClientMessage): void {
    if (quiet.on) return;
    if (ws?.readyState === OPEN) ws.send(JSON.stringify(message));
  }
  function sendKeepalive(): void {
    if (!quiet.on && ws?.readyState === OPEN) ws.send(KEEPALIVE);
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
      if (event.data === KEEPALIVE_ACK) return;
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
        fifty = { n: m.n, hide: m.hide, ...(m.hint ? { hint: m.hint } : {}) };
        render();
      } else if (m.t === 'again') {
        // QZ2 Second chance: my first answer was wrong; the question opens again for me (that option stays out).
        retry = { n: m.n, ...(m.wrong !== undefined ? { wrong: m.wrong } : {}) };
        if (myPick?.n === m.n) myPick = null;
        if (myText?.n === m.n) myText = null;
        if (view?.typed && view.n === m.n) view.typed.input.value = '';
        flash(t('quiz.tryAgain'));
        render();
        if (view?.typed && view.n === m.n && hasMouse()) view.typed.input.focus({ preventScroll: true });
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
  // QUOTA1a: the free keepalive (answered without waking the table), a real ping once a minute (the clock offset).
  const ping = window.setInterval(
    keepaliveTicks(GAME_CLOCK_EVERY, sendKeepalive, () => {
      pingAt = performance.now();
      send({ t: 'ping' });
    }),
    GAME_KEEPALIVE_MS,
  );
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
      quiet.command('quiz', { en: 'Quiz', tr: 'Bilgi yarışması' }),
      { id: 'quiz.referee', title: { en: 'Quiz: Stub reacts', tr: 'Bilgi yarışması: Stub tepki versin' }, help: { en: 'Stub says one of his reveal lines in the corner of the table.', tr: 'Stub masanın köşesinde cevap anındaki sözlerinden birini söyler.' }, tab: 'games', where: { en: 'at a Quiz table', tr: 'Bilgi yarışması masasında' }, run: () => ref.say(tx('refAll'), 'cheer') },
      { id: 'quiz.skip', title: { en: 'Quiz: end this phase now', tr: 'Bilgi yarışması: bu aşamayı hemen bitir' }, help: { en: 'Local lab server only: the question / round / reveal ends at once.', tr: 'Sadece yerel test sunucusunda: soru / tur / cevap ekranı hemen biter.' }, tab: 'games', available: () => !labServerHere() ? LOCAL_ONLY : (!!state && state.phase !== 'lobby' && state.phase !== 'over') || { en: 'only while a game is going: start one first', tr: 'sadece oyun sürerken: önce bir oyun başlat' }, where: { en: 'at a Quiz table', tr: 'Bilgi yarışması masasında' }, run: () => send({ t: 'lab', op: 'skip' }) },
      // QZ2 (card hook): a one-lap tournament starts now (the host, two or more at the table: a 🤖 friend will do).
      { id: 'quiz.tournament', title: { en: 'Quiz: start a tournament', tr: 'Bilgi yarışması: turnuva başlat' }, help: { en: 'Sets Tournament, one pick each, and starts: everyone picks a round’s topic in turn. Add a 🤖 friend first if you are alone.', tr: 'Turnuvayı seçer (kişi başı bir seçim) ve başlatır: herkes sırayla bir turun konusunu seçer. Yalnızsan önce bir 🤖 arkadaş ekle.' }, tab: 'games' as const, where: { en: 'at a Quiz table', tr: 'Bilgi yarışması masasında' }, available: () => (!state ? { en: 'open a Quiz table first', tr: 'önce bir Bilgi yarışması masası aç' } : state.phase !== 'lobby' && state.phase !== 'over' ? { en: 'only between games', tr: 'sadece oyunlar arasında' } : state.host !== me ? { en: 'only the table’s host can start', tr: 'sadece masanın yöneticisi başlatabilir' } : state.players.filter((p) => p.online).length < 2 ? { en: 'needs two players: add a 🤖 friend', tr: 'iki oyuncu gerekir: bir 🤖 arkadaş ekle' } : true), run: () => { send({ t: 'settings', mode: 'tournament', laps: 1 }); send({ t: 'start' }); } },
      // QZ2: the next game asks only typed-answer questions (to try the field and the forgiving match).
      { id: 'quiz.typed', title: { en: 'Quiz: next game only typed answers', tr: 'Bilgi yarışması: sonraki oyun sadece yazılı cevap' }, help: { en: 'Local lab server only: the next game this table starts asks only questions you answer by typing.', tr: 'Sadece yerel test sunucusunda: bu masanın başlattığı sonraki oyun yalnızca yazarak cevaplanan sorular sorar.' }, tab: 'games' as const, available: () => !labServerHere() ? LOCAL_ONLY : !!state || { en: 'open a Quiz table first', tr: 'önce bir Bilgi yarışması masası aç' }, where: { en: 'at a Quiz table', tr: 'Bilgi yarışması masasında' }, run: () => send({ t: 'lab', op: 'typed' }) },
      // LAB2: straight to the result card (the same skip as above, once a phase, until the game is over).
      { id: 'quiz.toEnd', title: { en: 'Quiz: jump to the result card', tr: 'Bilgi yarışması: sonuç kartına atla' }, help: { en: 'Local lab server only: every phase is skipped until the game is over and the result card shows (a few seconds).', tr: 'Sadece yerel test sunucusunda: oyun bitene kadar her aşama atlanır ve sonuç kartı görünür (birkaç saniye).' }, tab: 'games' as const, available: () => !labServerHere() ? LOCAL_ONLY : (!!state && state.phase !== 'lobby' && state.phase !== 'over') || { en: 'only while a game is going: start one first', tr: 'sadece oyun sürerken: önce bir oyun başlat' }, run: () => { let n = 0; const step = () => { if (!state || state.phase === 'over' || ++n > 80) return; send({ t: 'lab', op: 'skip' }); setTimeout(step, 350); }; step(); } },
    ],
  }));
  // GP2: the same "How to play" cards as every game (first time, and the "?" in the head).
  const how = tableHowTo(app, 'quiz:howSeen', () => [
    { art: quiz1Art, title: tx('how1'), line: tx('how1Line') },
    { art: quiz2Art, title: tx('how2'), line: tx('how2Line') },
    { art: quiz3Art, title: tx('how3'), line: tx('how3Line') },
  ]);
  return () => {
    offLab();
    ref.destroy();
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
