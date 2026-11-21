import { avatarText } from '@swm/shared/protocol';
import { RATE_AGAIN, RATE_WORDS, topWord, type FilmRate, type RateAgain, type RateAnswer, type RatePerson, type RateResults, type RateWord } from '@swm/shared/film-rate';
import { el } from '../dom.ts';
import { lang } from '../i18n.ts';
import { sessionLoad, sessionSave } from '../storage.ts';
import './film-rate.css';

/**
 * Card FR1 (owner, 21 Nov 2026): "⭐ Rate the film". The host starts it from the film page's rail; everyone gets the
 * same five questions one after another in a small ticket-like window (the film page's hole closes while it is open,
 * like every dialog of ours), then the results card for all, which invites "why?" in the chat. The answers go to the
 * server once, after the last question; the results carry only counts and the names of the people picked.
 */

/** This chunk's own words (EN + TR; `check-game-text.mjs` checks the keys match). */
const TEXT = {
  en: {
    title: 'Rate the film',
    startedBy: '{name} asks: how was the film?',
    step: 'Question {n} of {all}',
    stars: 'How many stars?',
    starsHint: 'Half stars too: press the left half of a star.',
    starLabel: '{n} stars',
    most: 'Who liked it most?',
    least: 'Who liked it least?',
    again: 'Would you watch it again?',
    word: 'One word for it',
    yes: '👍 Yes',
    maybe: '🤔 Maybe',
    no: '👎 No',
    fun: '😄 Fun',
    moving: '🥹 Moving',
    gripping: '😱 Gripping',
    clever: '🧠 Clever',
    cozy: '☕ Cozy',
    meh: '😐 Meh',
    me: '(you)',
    back: '‹ Back',
    next: 'Next ›',
    skip: 'Skip',
    send: 'Send ✓',
    later: 'Not now',
    waiting: 'Thanks! {done} of {all} answered.',
    waitingHint: 'The results show when everyone has answered.',
    showNow: 'Show the results now',
    close: 'Close',
    closeAll: 'Close for everyone',
    results: 'Our rating',
    votes1: 'from 1 person',
    votesN: 'from {n} people',
    noVotes: 'Nobody answered this time.',
    likedMost: 'Who liked it most',
    likedLeast: 'Who liked it least',
    againShort: 'Watch it again?',
    resultsBy: 'How the room rated it',
    histLow: '½ ★',
    histHigh: '5 ★',
    inOneWord: 'In one word',
    why: 'Why? Tell each other in the chat 💬',
    toChat: '💬 To the chat',
  },
  tr: {
    title: 'Filmi puanla',
    startedBy: '{name} soruyor: film nasıldı?',
    step: 'Soru {n} / {all}',
    stars: 'Kaç yıldız?',
    starsHint: 'Yarım yıldız da olur: yıldızın sol yarısına bas.',
    starLabel: '{n} yıldız',
    most: 'En çok kim beğendi?',
    least: 'En az kim beğendi?',
    again: 'Yine izler miydin?',
    word: 'Tek kelimeyle',
    yes: '👍 Evet',
    maybe: '🤔 Belki',
    no: '👎 Hayır',
    fun: '😄 Eğlenceli',
    moving: '🥹 Duygusal',
    gripping: '😱 Sürükleyici',
    clever: '🧠 Zekice',
    cozy: '☕ Sıcacık',
    meh: '😐 İdare eder',
    me: '(sen)',
    back: '‹ Geri',
    next: 'İleri ›',
    skip: 'Geç',
    send: 'Gönder ✓',
    later: 'Şimdi değil',
    waiting: 'Teşekkürler! {all} kişiden {done} kişi cevapladı.',
    waitingHint: 'Herkes cevaplayınca sonuçlar görünür.',
    showNow: 'Sonuçları şimdi göster',
    close: 'Kapat',
    closeAll: 'Herkes için kapat',
    results: 'Puanımız',
    votes1: '1 kişiden',
    votesN: '{n} kişiden',
    noVotes: 'Bu sefer kimse cevaplamadı.',
    likedMost: 'En çok kim beğendi',
    likedLeast: 'En az kim beğendi',
    againShort: 'Yine izler miydiniz?',
    resultsBy: 'Herkesin cevabı bir arada',
    histLow: '½ ★',
    histHigh: '5 ★',
    inOneWord: 'Tek kelimeyle',
    why: 'Neden? Sohbette anlatın 💬',
    toChat: '💬 Sohbete',
  },
};
type Key = keyof (typeof TEXT)['en'];
const tx = (key: Key, params: Record<string, string | number> = {}) => TEXT[lang() === 'tr' ? 'tr' : 'en'][key].replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? ''));

export interface RateContext {
  myId: () => string | null;
  host: () => boolean;
  send: (message: { t: 'rate-answer'; id: string } & RateAnswer) => void;
  showNow: () => void;
  closeAll: () => void;
  /** Opens the chat and puts the cursor in it. */
  toChat: () => void;
}

const STEPS = ['stars', 'most', 'least', 'again', 'word'] as const;
type Step = (typeof STEPS)[number];

let poll: FilmRate | null = null;
let ctx: RateContext | null = null;
let step = 0;
let answer: Partial<RateAnswer> = {};
let backdrop: HTMLElement | null = null;
/** The view now: the questions, the wait after sending, the results, or nothing. */
let view: 'ask' | 'wait' | 'results' | null = null;

const sentKey = (id: string) => `rate:sent:${id}`;
const closedKey = (id: string, what: 'ask' | 'results') => `rate:closed:${what}:${id}`;

/** The room's poll changed (or the room joined with one, or it closed: `null`). */
export function showRate(next: FilmRate | null, context: RateContext): void {
  ctx = context;
  if (!next) {
    poll = null;
    close();
    return;
  }
  if (poll?.id !== next.id) {
    step = 0;
    answer = {};
  }
  poll = next;
  if (next.results) {
    if (sessionLoad(closedKey(next.id, 'results')) === '1') return close();
    return render('results');
  }
  if (sessionLoad(sentKey(next.id)) === '1') {
    // Only an open window follows the count; a closed one stays closed until the results.
    if (view === 'wait' || (view === null && sessionLoad(closedKey(next.id, 'ask')) !== '1')) render('wait');
    return;
  }
  if (sessionLoad(closedKey(next.id, 'ask')) === '1') return;
  if (view !== 'ask') render('ask');
  else updateWait();
}

/** Test Lab `film.rate.state`. */
export function rateState(): { poll: string | null; view: string | null; step: Step | null; answered: number; waiting: number; results: RateResults | null } {
  return {
    poll: poll?.id ?? null,
    view,
    step: view === 'ask' ? STEPS[step]! : null,
    answered: poll?.answered ?? 0,
    waiting: poll?.waiting ?? 0,
    results: poll?.results ?? null,
  };
}

function close(): void {
  backdrop?.remove();
  backdrop = null;
  view = null;
  document.removeEventListener('keydown', onKey, true);
}

function onKey(event: KeyboardEvent): void {
  if (event.key !== 'Escape' || !backdrop) return;
  event.stopPropagation();
  dismiss();
}

/** "Not now" / ✕ / Esc: closed for me (this tab) until the next stage. */
function dismiss(): void {
  if (poll) sessionSave(closedKey(poll.id, view === 'results' ? 'results' : 'ask'), '1');
  close();
}

function updateWait(): void {
  const line = backdrop?.querySelector('.fr-count');
  if (line && poll) line.textContent = tx('waiting', { done: poll.answered, all: Math.max(poll.waiting, poll.answered) });
}

function button(text: string, cls: string, onClick: () => void, extra: Record<string, string> = {}): HTMLButtonElement {
  const b = el('button', { type: 'button', class: cls, ...extra }, text);
  b.addEventListener('click', onClick);
  return b;
}

function render(next: 'ask' | 'wait' | 'results'): void {
  if (!poll || !ctx) return;
  const firstOpen = !backdrop;
  view = next;
  const card = el('div', { class: `fr-card card fr-${next}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': tx('title') });
  const x = button('✕', 'icon-btn fr-x', dismiss, { 'aria-label': tx('close'), title: tx('close') });
  const head = el('div', { class: 'fr-head' }, el('span', { class: 'fr-ticket', 'aria-hidden': 'true' }, '🎟️'), el('div', {}, el('b', {}, next === 'results' ? tx('results') : tx('title')), el('span', { class: 'fr-by' }, next === 'results' ? tx('resultsBy') : tx('startedBy', { name: poll.by }))), x);
  card.append(head);
  if (next === 'ask') card.append(...askBody());
  else if (next === 'wait') card.append(...waitBody());
  else card.append(...resultsBody(poll.results!));
  if (!backdrop) {
    backdrop = el('div', { class: 'dialog-backdrop fr-backdrop' });
    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) dismiss();
    });
    document.addEventListener('keydown', onKey, true);
    document.body.append(backdrop);
  }
  backdrop.replaceChildren(card);
  const focus = card.querySelector<HTMLElement>('.fr-focus') ?? card.querySelector<HTMLElement>('.fr-body button:not(:disabled)');
  if (focus || firstOpen) (focus ?? x).focus({ preventScroll: true });
}

function askBody(): HTMLElement[] {
  const name: Step = STEPS[step]!;
  const body = el('div', { class: 'fr-body' });
  const dots = el('div', { class: 'fr-dots', 'aria-hidden': 'true' }, ...STEPS.map((_, i) => el('i', { class: i === step ? 'on' : i < step ? 'done' : '' })));
  const question = el('h3', { class: 'fr-q', id: 'fr-q' }, tx(name));
  const last = step === STEPS.length - 1;
  const go = (delta: number) => {
    if (delta > 0 && last) return submit();
    step = Math.max(0, Math.min(STEPS.length - 1, step + delta));
    render('ask');
  };
  const chosen = name === 'stars' ? answer.stars !== undefined : answer[name] !== undefined;
  const nextBtn = button(last ? tx('send') : tx('next'), 'btn primary fr-next', () => go(1));
  nextBtn.disabled = name === 'stars' && !chosen;
  const nav = el(
    'div',
    { class: 'fr-nav' },
    step > 0 ? button(tx('back'), 'btn fr-back', () => go(-1)) : button(tx('later'), 'btn fr-later', dismiss),
    el('span', { class: 'fr-step' }, tx('step', { n: step + 1, all: STEPS.length })),
    name !== 'stars' && !chosen ? button(tx('skip'), 'btn fr-skip', () => go(1)) : nextBtn,
  );
  if (name === 'stars') body.append(stars(nextBtn), el('p', { class: 'fr-hint' }, tx('starsHint')));
  else if (name === 'most' || name === 'least') body.append(choices(poll!.people.map((p) => [p.id, personText(p)] as const), name, () => go(1)));
  else if (name === 'again') body.append(choices(RATE_AGAIN.map((a) => [a, tx(a)] as const), name, () => go(1)));
  // The last question waits for "Send ✓" (a choice only marks it).
  else body.append(choices(RATE_WORDS.map((w) => [w, tx(w)] as const), name, () => render('ask')));
  return [dots, question, body, nav];
}

function personText(p: RatePerson): string {
  const me = p.id === ctx?.myId() ? ` ${tx('me')}` : '';
  return `${p.avatar ? `${avatarText(p.avatar)} ` : ''}${p.name}${me}`;
}

/** Five stars, each two half buttons (left = .5); the value shows beside them. */
function stars(nextBtn: HTMLButtonElement): HTMLElement {
  const value = el('span', { class: 'fr-value', 'aria-live': 'polite' }, answer.stars ? `${answer.stars} / 5` : '– / 5');
  const row = el('div', { class: 'fr-stars', role: 'group', 'aria-labelledby': 'fr-q' });
  const paint = (v: number) => {
    row.querySelectorAll<HTMLElement>('.fr-star').forEach((s, i) => {
      s.style.setProperty('--fill', `${Math.max(0, Math.min(1, v - i)) * 100}%`);
    });
  };
  for (let i = 1; i <= 5; i++) {
    const star = el('span', { class: 'fr-star' });
    for (const v of [i - 0.5, i]) {
      const half = button('', `fr-half ${v % 1 ? 'fr-left' : 'fr-right'}`, () => {
        answer.stars = v;
        value.textContent = `${v} / 5`;
        nextBtn.disabled = false;
        row.querySelectorAll('.fr-half').forEach((h) => h.setAttribute('aria-pressed', String(h === half)));
        paint(v);
        nextBtn.focus({ preventScroll: true });
      }, { 'aria-label': tx('starLabel', { n: v }), title: tx('starLabel', { n: v }), 'aria-pressed': String(answer.stars === v) });
      if (answer.stars === v) half.classList.add('fr-focus');
      half.addEventListener('pointerenter', () => paint(v));
      half.addEventListener('pointerleave', () => paint(answer.stars ?? 0));
      star.append(half);
    }
    row.append(star);
  }
  paint(answer.stars ?? 0);
  return el('div', { class: 'fr-star-row' }, row, value);
}

function choices(items: readonly (readonly [string, string])[], name: 'most' | 'least' | 'again' | 'word', next: () => void): HTMLElement {
  const box = el('div', { class: `fr-choices fr-${name}`, role: 'group', 'aria-labelledby': 'fr-q' });
  for (const [id, text] of items) {
    const on = answer[name] === id;
    box.append(
      button(text, `fr-chip${on ? ' on fr-focus' : ''}`, () => {
        if (name === 'again') answer.again = id as RateAgain;
        else if (name === 'word') answer.word = id as RateWord;
        else answer[name] = id;
        next();
      }, { 'aria-pressed': String(on) }),
    );
  }
  return box;
}

function submit(): void {
  if (!poll || !ctx || answer.stars === undefined) return;
  const out: { t: 'rate-answer'; id: string } & RateAnswer = { t: 'rate-answer', id: poll.id, stars: answer.stars };
  if (answer.most) out.most = answer.most;
  if (answer.least) out.least = answer.least;
  if (answer.again) out.again = answer.again;
  if (answer.word) out.word = answer.word;
  ctx.send(out);
  sessionSave(sentKey(poll.id), '1');
  poll = { ...poll, answered: poll.answered + 1 };
  render('wait');
}

function waitBody(): HTMLElement[] {
  const all = Math.max(poll!.waiting, poll!.answered);
  const body = el('div', { class: 'fr-body fr-waitbox' }, el('div', { class: 'fr-big', 'aria-hidden': 'true' }, '🍿'), el('p', { class: 'fr-count', role: 'status' }, tx('waiting', { done: poll!.answered, all })), el('p', { class: 'fr-hint' }, tx('waitingHint')));
  const nav = el('div', { class: 'fr-nav' }, button(tx('close'), 'btn', dismiss), ctx!.host() ? button(tx('showNow'), 'btn primary fr-focus', () => ctx?.showNow()) : '');
  return [body, nav];
}

/** Read-only stars for the average (fills by tenths). */
function starsShow(v: number): HTMLElement {
  return el('span', { class: 'fr-stars fr-show', 'aria-hidden': 'true' }, ...Array.from({ length: 5 }, (_, i) => {
    const s = el('span', { class: 'fr-star' });
    s.style.setProperty('--fill', `${Math.max(0, Math.min(1, v - i)) * 100}%`);
    return s;
  }));
}

function resultsBody(r: RateResults): HTMLElement[] {
  const body = el('div', { class: 'fr-body fr-res' });
  if (!r.votes) body.append(el('p', { class: 'fr-hint' }, tx('noVotes')));
  else {
    const peak = Math.max(...r.hist, 1);
    body.append(
      el('div', { class: 'fr-score' }, el('b', { class: 'fr-avg' }, r.stars.toFixed(1)), el('div', {}, starsShow(r.stars), el('span', { class: 'fr-by' }, r.votes === 1 ? tx('votes1') : tx('votesN', { n: r.votes })))),
      el(
        'div',
        { class: 'fr-chart', 'aria-hidden': 'true' },
        el('div', { class: 'fr-hist' }, ...r.hist.map((n) => {
          const bar = el('i', { class: n ? 'on' : '' });
          bar.style.height = `${8 + (n / peak) * 92}%`;
          return bar;
        })),
        el('div', { class: 'fr-ticks' }, el('span', {}, tx('histLow')), el('span', {}, tx('histHigh'))),
      ),
    );
    const pick = (label: Key, list: RateResults['most']): HTMLElement | '' =>
      list.length ? el('div', { class: 'fr-row' }, el('span', { class: 'fr-label' }, tx(label)), el('span', { class: 'fr-pick' }, list.slice(0, 2).map((p) => `${p.avatar ? `${avatarText(p.avatar)} ` : ''}${p.name} (${p.n})`).join(' · '))) : '';
    const againTotal = r.again.yes + r.again.maybe + r.again.no;
    const word = topWord(r);
    body.append(
      ...[
        pick('likedMost', r.most),
        pick('likedLeast', r.least),
        againTotal ? el('div', { class: 'fr-row' }, el('span', { class: 'fr-label' }, tx('againShort')), el('span', { class: 'fr-pick' }, `👍 ${r.again.yes} · 🤔 ${r.again.maybe} · 👎 ${r.again.no}`)) : '',
        word ? el('div', { class: 'fr-row' }, el('span', { class: 'fr-label' }, tx('inOneWord')), el('span', { class: 'fr-pick' }, tx(word))) : '',
      ].filter((n) => n !== ''),
      el('p', { class: 'fr-why' }, tx('why')),
    );
  }
  const nav = el(
    'div',
    { class: 'fr-nav' },
    ctx!.host() ? button(tx('closeAll'), 'btn', () => ctx?.closeAll()) : button(tx('close'), 'btn', dismiss),
    button(tx('toChat'), 'btn primary fr-focus', () => {
      dismiss();
      ctx?.toChat();
    }),
  );
  return [body, nav];
}
