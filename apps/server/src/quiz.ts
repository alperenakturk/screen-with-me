import { hubOptions } from './fallback-gate.ts';
import { meterObject } from './meter.ts';
import { DurableObject } from 'cloudflare:workers';
import { PollHub } from './fallback.ts';
import { labOnRequest, labRemembered } from './lab.ts';
import {
  QUIZ_MAX_PLAYERS,
  QUIZ_PROTOCOL_VERSION,
  QUIZ_QUESTIONS,
  QUIZ_RECENT,
  QUIZ_REVEAL_MS,
  fiftyFifty,
  matchTyped,
  parseQuizMessage,
  quizAnswerMs,
  quizLevelBonus,
  quizOffer,
  roundWinners,
  typedHint,
  QUIZ_PICK_MS,
  QUIZ_ROUND_QUESTIONS,
  type QuizCategory,
  type QuizJoker,
  type QuizLaps,
  type QuizMode,
  QUIZ_SEEN_KEEP,
  decodeSeen,
  pickQuestions,
  type QuizClientMessage,
  type QuizCount,
  type QuizLang,
  type QuizPhase,
  type QuizPlayer,
  type QuizQuestion,
  type QuizServerMessage,
  type QuizTopic,
} from '@swm/shared/games/quiz';
import { quizPoints } from '@swm/shared/games/scoring';
import { QUIZ_BANK } from '@swm/shared/games/quiz-questions';
import type { Avatar } from '@swm/shared/protocol';
import { RateLimiter } from './rate-limit.ts';
import { GHOST_MS, closeAsGone, closeGhosts, nextGhostCheck, touch, wasGhost } from './ghost.ts';
import { FLOOD_CODE, floodGuard } from './limits.ts';
import { answerKeepalive, heardAt, startKeepalive } from './keepalive.ts';

const EMPTY_TTL_MS = 24 * 60 * 60 * 1000;
/** BHG: with fewer than two players online a running game waits this long before it goes back to the lobby, so one
 * player's reload or short drop no longer ends the game for both (as the room's host keeps the role for 20 s). */
const FEW_GRACE_MS = 20_000;
const MAX_SOCKETS = 40;

interface Attachment {
  id: string;
  /** GHOST: when the last message came, and whether the alarm closed it as a dead connection (`ghost.ts`). */
  seen?: number;
  ghost?: boolean;
  name: string | null;
  /** Kalıcı tarayıcı kimliği (puan buna bağlı; istemcilere gitmez). */
  key?: string;
}

interface Person {
  pid: string;
  name: string;
  avatar?: Avatar;
  score: number;
  /** Questions this person's browser has seen lately (from its hello; never sent anywhere). */
  seen?: number[];
}

interface Saved {
  phase: QuizPhase;
  lang: QuizLang;
  order: string[];
  people: Record<string, Person>;
  questions: QuizQuestion[];
  /** Şu anki soru (0'dan). */
  index: number;
  /** Bu sorudaki cevaplar: anahtar → şık, puan ve (doğruysa) kaçıncı doğru. */
  answers: Record<string, { pick: number; gained: number; rank?: number; said?: string }>;
  endsAt: number | null;
  emptySince: number | null;
  /** Since when fewer than two players are online in a running game (`FEW_GRACE_MS`). */
  fewSince?: number | null;
  topic: QuizTopic;
  count: QuizCount;
  /** Recently asked bank ids (a rematch asks new ones). */
  recent: number[];
  /** Keys that used their 50:50 this game, and what it hid (re-sent after a reconnect). */
  jokers: string[];
  fifty: Record<string, { n: number; hide: number[]; hint?: string }>;
  /** Right answers in a row, per key. */
  streak: Record<string, number>;
  /** QZ2: Classic or Tournament, and a tournament's laps. */
  mode: QuizMode;
  laps: QuizLaps;
  /** QZ2 jokers: the kinds each key used this game, the question each key last used one on (one per question), and
   * what is armed on the current question (Double; Second chance with the first wrong answer once tried). */
  used: Record<string, QuizJoker[]>;
  jokerAt: Record<string, number>;
  armed: Record<string, { double?: boolean; second?: boolean; tried?: { pick: number; said?: string } }>;
  /** Tournament: the round (1-based) of `rounds`, who picks in turn, the current offer, this round's points, rounds
   * won, and who won the last finished round. */
  round: number;
  rounds: number;
  pickers: string[];
  offer: QuizCategory[];
  roundPts: Record<string, number>;
  wins: Record<string, number>;
  roundWin: string[];
  /** Test Lab (QZ2): the next game asks only typed questions (local lab server only). */
  labTyped?: boolean;
}

const fresh = (): Saved => ({
  phase: 'lobby',
  lang: 'tr',
  order: [],
  people: {},
  questions: [],
  index: 0,
  answers: {},
  endsAt: null,
  emptySince: null,
  topic: 'mix',
  count: QUIZ_QUESTIONS,
  recent: [],
  jokers: [],
  fifty: {},
  streak: {},
  mode: 'classic',
  laps: 1,
  used: {},
  jokerAt: {},
  armed: {},
  round: 0,
  rounds: 0,
  pickers: [],
  offer: [],
  roundPts: {},
  wins: {},
  roundWin: [],
});

/**
 * Bilgi yarışması odası: lobi → soru (15 sn) → açıklama (4 sn) → … → kürsü. Süreler depo alarmıyla yürür. Doğru şık
 * açıklamaya kadar istemcilere gitmez.
 */
export class Quiz extends DurableObject<Env> {
  private data: Saved = fresh();
  /** A local lab server (`lab.ts`, Test Lab DL3b): only then does a `lab` message do anything. */
  private lab = false;
  private readonly limit = new RateLimiter(20, 8);

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    meterObject(this, ctx, env, 'quiz');
    startKeepalive(ctx);
    void ctx.blockConcurrencyWhile(async () => {
      const saved = await ctx.storage.get<Saved>('quiz');
      // Older saves lack the newer fields.
      if (saved && Array.isArray(saved.order)) this.data = { ...fresh(), ...saved };
    });
  }

  /** HTTP fallback connections (`fallback.ts`). */
  private readonly polls = new PollHub({
    admit: (socket) => this.admit(socket),
    message: (socket, raw) => this.webSocketMessage(socket, raw),
    closed: (socket, code) => this.webSocketClose(socket, code),
    schedule: () => this.scheduleAlarm(),
  }, hubOptions(this.env));

  override async fetch(request: Request): Promise<Response> {
    this.lab = await labOnRequest(this.ctx.storage, this.env, request, this.lab);
    // Networks where the WebSocket never opens (phone hotspots): the same connection over plain HTTP requests.
    const polled = await this.polls.handle(request);
    if (polled) return polled;
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected WebSocket', { status: 426 });
    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server);
    await this.admit(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  /** A new connection (WebSocket or HTTP fallback). */
  private async admit(server: WebSocket): Promise<void> {
    if (this.sockets().length > MAX_SOCKETS) {
      this.sendTo(server, { t: 'error', code: 'full' });
      server.close(4001, 'full');
    } else {
      server.serializeAttachment({ id: crypto.randomUUID().slice(0, 8), name: null, seen: Date.now() } satisfies Attachment);
      if (this.data.emptySince !== null) {
        this.data.emptySince = null;
        await this.save();
      }
    }
  }

  /** QUOTA1a: the per-connection message ceiling (`limits.ts`). */
  private readonly flood = floodGuard(this.env, 'MSG_RATE');
  /** QUOTA1a: a socket's last message or the runtime's last free-keepalive answer, whichever is later. */
  private readonly heard = (ws: unknown, seen: number | undefined) => heardAt(this.ctx, ws, seen);

  override async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    touch(ws);
    if (answerKeepalive(ws, raw)) return;
    // QUOTA1a: a connection that sends far more than any player would is closed (its leave runs once, here).
    if (!this.flood.allow(ws)) {
      closeAsGone(ws, FLOOD_CODE, 'flood', JSON.stringify({ t: 'error', code: 'rate' }));
      await this.left(ws);
      return;
    }
    const me = ws.deserializeAttachment() as Attachment;
    const message = typeof raw === 'string' ? parseQuizMessage(raw) : null;
    if (!message) return this.sendTo(ws, { t: 'error', code: 'bad' });
    // A phase whose time is up moves on now, whatever the alarm does (live alarms can run late right after a deploy;
    // 0.9.93.2): every message checks, so a late answer also finds the question already closed.
    if (this.data.endsAt !== null && Date.now() >= this.data.endsAt) {
      await this.advance(Date.now());
      await this.scheduleAlarm();
    }
    if (message.t === 'ping') return this.sendTo(ws, { t: 'pong', now: Date.now() });
    if (!this.limit.allow(me.id)) return this.sendTo(ws, { t: 'error', code: 'rate' });
    // One hello per connection, as in the room (review 3, R3-8).
    if (message.t === 'hello') return me.name === null ? this.hello(ws, me, message) : this.sendTo(ws, { t: 'error', code: 'bad' });
    if (me.name === null || !me.key || !this.data.people[me.key]) return this.sendTo(ws, { t: 'error', code: 'bad' });
    await this.apply(ws, me.key, message);
  }

  override async webSocketClose(ws: WebSocket, code: number): Promise<void> {
    try {
      ws.close(code === 1005 ? 1000 : code);
    } catch {
      // Zaten kapanmış.
    }
    if (wasGhost(ws)) return;
    await this.left(ws);
  }

  override async webSocketError(ws: WebSocket): Promise<void> {
    if (wasGhost(ws)) return;
    await this.left(ws);
  }

  /** Moves the game on to whatever its clock says now (from the alarm, or a message that found it overdue). */
  private async advance(now: number): Promise<void> {
    const d = this.data;
    if (d.endsAt !== null && now >= d.endsAt) {
      if (d.phase === 'question') await this.reveal();
      else if (d.phase === 'reveal') await this.next();
      // Tournament: the picker's time is up, a random offered category.
      else if (d.phase === 'pick') await this.beginRound(d.offer[Math.floor(Math.random() * d.offer.length)] ?? 'general');
    }
  }

  override async alarm(): Promise<void> {
    const now = Date.now();
    await this.polls.sweepDue(now);
    // GHOST: sockets silent past `GHOST_MS` died without a close frame; they leave like a real close.
    for (const ws of closeGhosts(this.sockets(), Date.now(), GHOST_MS, this.heard)) await this.left(ws);
    await this.advance(now);
    const d = this.data;
    if ((d.phase === 'question' || d.phase === 'reveal' || d.phase === 'pick') && d.fewSince && this.tooFew(now)) await this.toLobby();
    if (this.sockets().length === 0 && d.emptySince !== null && now - d.emptySince >= EMPTY_TTL_MS) {
      await this.ctx.storage.deleteAll();
      this.data = fresh();
      return;
    }
    await this.scheduleAlarm();
  }

  private async hello(ws: WebSocket, me: Attachment, message: Extract<QuizClientMessage, { t: 'hello' }>): Promise<void> {
    if (message.v !== QUIZ_PROTOCOL_VERSION) {
      this.sendTo(ws, { t: 'error', code: 'version' });
      ws.close(4000, 'version');
      return;
    }
    const key = message.cid ?? `conn:${me.id}`;
    const d = this.data;
    if (!d.people[key]) {
      if (d.order.length >= QUIZ_MAX_PLAYERS) {
        const gone = d.order.find((k) => !this.online(k));
        if (!gone) {
          this.sendTo(ws, { t: 'error', code: 'full' });
          ws.close(4001, 'full');
          return;
        }
        d.order = d.order.filter((k) => k !== gone);
        delete d.people[gone];
      }
      if (d.order.length === 0 && d.phase === 'lobby') d.lang = message.lang ?? 'tr';
      d.order.push(key);
      d.people[key] = { pid: crypto.randomUUID().slice(0, 8), name: message.name, score: 0, ...(message.avatar ? { avatar: message.avatar } : {}) };
    } else {
      d.people[key]!.name = message.name;
      if (message.avatar) d.people[key]!.avatar = message.avatar;
    }
    if (message.seen) d.people[key]!.seen = decodeSeen(message.seen).slice(-QUIZ_SEEN_KEEP);
    me.name = message.name;
    me.key = key;
    ws.serializeAttachment(me);
    await this.save();
    this.sendTo(ws, { t: 'welcome', you: d.people[key]!.pid, now: Date.now() });
    const fifty = d.fifty[key];
    if (d.phase === 'question' && fifty && fifty.n === this.qn()) this.sendTo(ws, { t: 'fifty', ...fifty });
    const tried = d.armed[key]?.tried;
    if (d.phase === 'question' && tried && !d.answers[key]) this.sendTo(ws, { t: 'again', n: this.qn(), ...(tried.said ? {} : { wrong: tried.pick }) });
    this.broadcastState();
    // GHOST: the alarm also watches this connection for silence.
    await this.scheduleAlarm();
  }

  /** The host: the first player (in arrival order) who is still connected. */
  private hostKey(except?: WebSocket): string | null {
    return this.data.order.find((k) => this.online(k, except)) ?? null;
  }

  private async apply(ws: WebSocket, key: string, message: QuizClientMessage): Promise<void> {
    const d = this.data;
    switch (message.t) {
      case 'lab':
        // Test Lab (DL3b): the current phase ends now, on a local lab server only (`lab.ts`).
        this.lab ||= await labRemembered(this.ctx.storage, this.env);
        if (!this.lab) return this.sendTo(ws, { t: 'error', code: 'lab_off' });
        if (message.op === 'typed') {
          this.data.labTyped = true;
          await this.save();
          return;
        }
        if (this.data.endsAt !== null) {
          this.data.endsAt = Date.now();
          await this.advance(this.data.endsAt);
        }
        return;
      case 'settings':
        if (d.phase !== 'lobby' && d.phase !== 'over') return;
        if (this.hostKey() !== key) return this.sendTo(ws, { t: 'error', code: 'not_host' });
        if (message.lang) d.lang = message.lang;
        if (message.topic) d.topic = message.topic;
        if (message.count) d.count = message.count;
        if (message.mode) d.mode = message.mode;
        if (message.laps) d.laps = message.laps;
        await this.save();
        this.broadcastState();
        return;
      case 'start':
        // Lobide ya da kürsüde (yeni oyun): puanlar sıfırlanır.
        if (d.phase !== 'lobby' && d.phase !== 'over') return;
        if (this.hostKey() !== key) return this.sendTo(ws, { t: 'error', code: 'not_host' });
        if (this.onlineKeys().length < 2) return this.sendTo(ws, { t: 'error', code: 'too_few' });
        for (const person of Object.values(d.people)) person.score = 0;
        d.jokers = [];
        d.fifty = {};
        d.streak = {};
        d.used = {};
        d.jokerAt = {};
        d.armed = {};
        d.wins = {};
        d.roundWin = [];
        d.roundPts = {};
        if (d.mode === 'tournament') {
          // QZ2: every player picks a round's category in turn, once or twice round the table.
          d.pickers = this.onlineKeys();
          d.rounds = d.pickers.length * d.laps;
          d.round = 0;
          await this.startRound();
          return;
        }
        d.round = 0;
        d.rounds = 0;
        d.questions = this.choose(d.count, d.labTyped ? 'mix' : d.topic);
        d.labTyped = false;
        d.index = -1;
        await this.next();
        return;
      case 'pick':
        if (d.phase !== 'pick' || d.pickers[(d.round - 1) % d.pickers.length] !== key || !d.offer.includes(message.cat)) return;
        await this.beginRound(message.cat);
        return;
      case 'joker': {
        const kind = message.kind ?? 'fifty';
        // Before answering, each kind once per game, one joker per question (QZ2).
        if (d.phase !== 'question' || message.n !== this.qn() || d.answers[key] || d.armed[key]?.tried) return;
        if ((d.used[key] ?? []).includes(kind) || (kind === 'fifty' && d.jokers.includes(key)) || d.jokerAt[key] === message.n) return;
        const q = d.questions[d.index]!;
        if (kind === 'fifty') {
          // One hidden pair per question for everyone: a fresh pair per person let two identities' jokers together
          // show the answer (security review 2, L6). On a typed question: the first letter and the length.
          const hint = q.typed ? typedHint(q.accept?.[0] ?? '') : undefined;
          const hide = q.typed ? [] : (Object.values(d.fifty).find((f) => f.n === message.n)?.hide ?? fiftyFifty(q));
          if (!hide.length && !hint) return;
          d.jokers.push(key);
          d.fifty[key] = { n: message.n, hide, ...(hint ? { hint } : {}) };
          this.sendTo(ws, { t: 'fifty', n: message.n, hide, ...(hint ? { hint } : {}) });
        } else d.armed[key] = { ...d.armed[key], [kind]: true };
        d.used[key] = [...(d.used[key] ?? []), kind];
        d.jokerAt[key] = message.n;
        await this.save();
        this.broadcastState();
        return;
      }
      case 'answer': {
        if (d.phase !== 'question' || message.n !== this.qn() || d.answers[key]) return;
        const q = d.questions[d.index]!;
        // A typed question takes only text, an option question only a pick (QZ2).
        let right: boolean;
        let pick: number;
        let said: string | undefined;
        const armed = d.armed[key];
        if ('text' in message) {
          if (!q.typed) return;
          right = matchTyped(message.text, q.accept ?? []);
          pick = right ? 0 : 1;
          said = message.text;
        } else {
          if (q.typed || message.pick >= q.options.length || d.fifty[key]?.n === message.n && d.fifty[key]!.hide.includes(message.pick)) return;
          // Second chance: the second try must be another option.
          if (armed?.tried && armed.tried.pick === message.pick) return;
          right = message.pick === q.correct;
          pick = message.pick;
        }
        // QZ2 Second chance: a first wrong answer is kept aside and only this player hears "try again".
        if (!right && armed?.second && !armed.tried) {
          armed.tried = { pick, ...(said ? { said } : {}) };
          await this.save();
          this.sendTo(ws, { t: 'again', n: message.n, ...(said ? {} : { wrong: pick }) });
          return;
        }
        if (right) {
          const rank = Object.values(d.answers).filter((a) => a.rank).length + 1;
          const streak = (d.streak[key] ?? 0) + 1;
          const base = quizPoints((d.endsAt ?? Date.now()) - Date.now(), quizAnswerMs(q.typed), rank, streak);
          // QZ2: a hard question (and a typed answer) is worth more; Double ×2, a second try half.
          let gained = Math.round(base * quizLevelBonus(QUIZ_BANK[q.id]?.d, q.typed));
          if (armed?.double) gained *= 2;
          if (armed?.tried) gained = Math.round(gained / 2);
          d.answers[key] = { pick, gained, rank, ...(said ? { said } : {}) };
        } else d.answers[key] = { pick, gained: 0, ...(said ? { said } : {}) };
        // Herkes cevapladıysa beklemeden açıkla.
        if (this.onlineKeys().every((k) => d.answers[k])) await this.reveal();
        else {
          await this.save();
          this.broadcastState();
        }
        return;
      }
      default:
        return;
    }
  }

  /** Questions asked in the tournament's earlier rounds (0 in Classic). */
  private base(): number {
    const d = this.data;
    return d.rounds > 0 ? (Math.min(d.round, d.rounds) - 1) * QUIZ_ROUND_QUESTIONS : 0;
  }

  /** The current question's number in the whole game (a tournament counts on across rounds, so a joker or a 50:50
   * on question 1 of a round never matches question 1 of another). */
  private qn(): number {
    return this.base() + this.data.index + 1;
  }

  /** Fresh questions, avoiding what this table asked lately and what the players' browsers have seen (P9). */
  private choose(count: number, topic: QuizTopic): QuizQuestion[] {
    const d = this.data;
    const seen = this.onlineKeys().flatMap((k) => d.people[k]?.seen ?? []);
    const questions = pickQuestions(d.lang, count, Math.random, topic, [...new Set([...d.recent, ...seen])], d.labTyped ? (e) => !!e.typed : undefined);
    d.recent = [...questions.map((q) => q.id), ...d.recent.filter((id) => !questions.some((q) => q.id === id))].slice(0, QUIZ_RECENT);
    return questions;
  }

  /** Tournament: the next round's picker gets an offer of categories (or the game ends after the last round). */
  private async startRound(): Promise<void> {
    const d = this.data;
    if (this.tooFew(Date.now())) return this.toLobby();
    d.round += 1;
    if (d.round > d.rounds) {
      d.phase = 'over';
      d.endsAt = null;
      d.offer = [];
      await this.save();
      this.broadcastState();
      await this.scheduleAlarm();
      return;
    }
    d.offer = quizOffer(d.lang);
    d.phase = 'pick';
    d.questions = [];
    d.index = -1;
    d.answers = {};
    d.armed = {};
    // A picker who is away: the round starts at once with a random category.
    const picker = d.pickers[(d.round - 1) % d.pickers.length]!;
    if (!this.online(picker)) return this.beginRound(d.offer[Math.floor(Math.random() * d.offer.length)] ?? 'general');
    d.endsAt = Date.now() + QUIZ_PICK_MS;
    await this.save();
    this.broadcastState();
    await this.scheduleAlarm();
  }

  /** Tournament: the round's three questions in the picked category. */
  private async beginRound(cat: QuizCategory): Promise<void> {
    const d = this.data;
    d.questions = this.choose(QUIZ_ROUND_QUESTIONS, cat);
    d.labTyped = false;
    d.roundPts = {};
    d.roundWin = [];
    d.offer = [];
    d.index = -1;
    await this.next();
  }

  /** Tournament: the round's winners get a round win; then the next round's pick. */
  private async endRound(): Promise<void> {
    const d = this.data;
    d.roundWin = roundWinners(d.roundPts);
    for (const key of d.roundWin) d.wins[key] = (d.wins[key] ?? 0) + 1;
    await this.startRound();
  }

  private async next(): Promise<void> {
    const d = this.data;
    if (d.phase !== 'lobby' && this.tooFew(Date.now())) return this.toLobby();
    d.index += 1;
    if (d.index >= d.questions.length && d.mode === 'tournament' && d.rounds > 0) return this.endRound();
    if (d.index >= d.questions.length) {
      d.phase = 'over';
      d.endsAt = null;
    } else {
      d.phase = 'question';
      d.answers = {};
      d.armed = {};
      d.endsAt = Date.now() + quizAnswerMs(d.questions[d.index]!.typed);
    }
    await this.save();
    this.broadcastState();
    await this.scheduleAlarm();
  }

  private async reveal(): Promise<void> {
    const d = this.data;
    // A Second chance whose second try never came: the first (wrong) answer stands.
    for (const [key, armed] of Object.entries(d.armed)) if (armed.tried && !d.answers[key]) d.answers[key] = { pick: armed.tried.pick, gained: 0, ...(armed.tried.said ? { said: armed.tried.said } : {}) };
    for (const [key, answer] of Object.entries(d.answers)) {
      if (d.people[key]) d.people[key]!.score += answer.gained;
      if (d.rounds > 0) d.roundPts[key] = (d.roundPts[key] ?? 0) + answer.gained;
    }
    // Streaks move at the reveal (earlier they would tell who was right): a wrong or missing answer breaks it.
    for (const key of d.order) d.streak[key] = d.answers[key]?.rank ? (d.streak[key] ?? 0) + 1 : 0;
    d.phase = 'reveal';
    d.endsAt = Date.now() + QUIZ_REVEAL_MS;
    await this.save();
    this.broadcastState();
    await this.scheduleAlarm();
  }

  /** Fewer than two players online for longer than the grace (`FEW_GRACE_MS`)? Starts or clears the count. */
  private tooFew(now: number, except?: WebSocket): boolean {
    const d = this.data;
    if (this.onlineKeys(except).length >= 2) {
      d.fewSince = null;
      return false;
    }
    d.fewSince ??= now;
    return now - d.fewSince >= FEW_GRACE_MS;
  }

  private async toLobby(): Promise<void> {
    const d = this.data;
    d.fewSince = null;
    d.phase = 'lobby';
    d.round = 0;
    d.rounds = 0;
    d.offer = [];
    d.questions = [];
    d.index = 0;
    d.answers = {};
    d.endsAt = null;
    await this.save();
    this.broadcastState();
    await this.scheduleAlarm();
  }

  private async left(ws: WebSocket): Promise<void> {
    const d = this.data;
    const remaining = this.sockets(ws);
    if (remaining.length === 0) {
      d.emptySince = Date.now();
      d.phase = 'lobby';
      d.endsAt = null;
      await this.save();
      await this.scheduleAlarm();
      return;
    }
    const online = this.onlineKeys(ws);
    if ((d.phase === 'question' || d.phase === 'reveal' || d.phase === 'pick') && this.tooFew(Date.now(), ws)) return this.toLobby();
    if (d.fewSince) {
      await this.save();
      await this.scheduleAlarm();
    }
    if (d.phase === 'question' && online.every((k) => d.answers[k])) return this.reveal();
    this.broadcastState(ws);
  }

  private async scheduleAlarm(): Promise<void> {
    const d = this.data;
    const times: number[] = [];
    if (d.endsAt !== null) times.push(d.endsAt);
    if (d.fewSince && d.phase !== 'lobby') times.push(d.fewSince + FEW_GRACE_MS);
    if (d.emptySince !== null) times.push(d.emptySince + EMPTY_TTL_MS);
    // BH8: HTTP fallback sessions that stop polling are closed in the alarm.
    const due = this.polls.nextDue();
    if (due !== null) times.push(due);
    const ghost = nextGhostCheck(this.sockets(), this.heard);
    if (ghost !== null) times.push(ghost);
    if (times.length) await this.ctx.storage.setAlarm(Math.min(...times));
    else await this.ctx.storage.deleteAlarm();
  }

  private onlineKeys(except?: WebSocket): string[] {
    return this.data.order.filter((k) => this.online(k, except));
  }

  private online(key: string, except?: WebSocket): boolean {
    return this.sockets(except).some((ws) => (ws.deserializeAttachment() as Attachment | null)?.key === key);
  }

  private state(except?: WebSocket): QuizServerMessage {
    const d = this.data;
    const reveal = d.phase === 'reveal';
    const players: QuizPlayer[] = d.order.map((k) => {
      const p = d.people[k]!;
      const answer = d.answers[k];
      return {
        id: p.pid,
        name: p.name,
        ...(p.avatar ? { avatar: p.avatar } : {}),
        score: p.score,
        answered: !!answer,
        ...(reveal && answer ? { pick: answer.pick, gained: answer.gained, ...(answer.rank ? { rank: answer.rank } : {}), ...(answer.said ? { said: answer.said } : {}) } : {}),
        streak: d.streak[k] ?? 0,
        joker: d.jokers.includes(k),
        ...(d.used[k]?.length ? { jokers: d.used[k] } : {}),
        ...(d.rounds > 0 ? { wins: d.wins[k] ?? 0, round: d.roundPts[k] ?? 0 } : {}),
        online: this.online(k, except),
      };
    });
    const q = (d.phase === 'question' || reveal) && d.questions[d.index] ? d.questions[d.index]! : null;
    return {
      t: 'state',
      phase: d.phase,
      players,
      n: d.phase === 'lobby' ? 0 : this.base() + Math.min(d.index + 1, d.questions.length),
      total: d.rounds > 0 ? d.rounds * QUIZ_ROUND_QUESTIONS : d.questions.length || d.count,
      ...(q ? { question: q.question, options: q.options, cat: q.cat, qid: q.id, ...(q.typed ? { typed: true } : {}) } : {}),
      // The accepted answers stay here; the reveal shows the first one.
      ...(q && reveal ? { correct: q.correct, ...(q.typed ? { answer: q.accept?.[0] ?? '' } : {}) } : {}),
      endsAt: d.endsAt,
      mode: d.mode,
      laps: d.laps,
      ...(d.rounds > 0
        ? {
            round: Math.min(d.round, d.rounds),
            rounds: d.rounds,
            ...(d.pickers.length ? { picker: d.people[d.pickers[(Math.min(d.round, d.rounds) - 1 + d.pickers.length) % d.pickers.length]!]?.pid } : {}),
            ...(d.phase === 'pick' ? { offer: d.offer } : {}),
            roundWin: d.roundWin.map((k) => d.people[k]?.pid).filter((id): id is string => !!id),
          }
        : {}),
      lang: d.lang,
      topic: d.topic,
      count: d.count,
      host: (() => {
        const hk = this.hostKey(except);
        return hk ? d.people[hk]!.pid : null;
      })(),
    };
  }

  private broadcastState(except?: WebSocket): void {
    const text = JSON.stringify(this.state(except));
    for (const ws of this.sockets(except)) {
      if (!(ws.deserializeAttachment() as Attachment | null)?.name) continue;
      try {
        ws.send(text);
      } catch {
        // Kapanmış.
      }
    }
  }

  private async save(): Promise<void> {
    await this.ctx.storage.put('quiz', this.data);
  }

  private sockets(except?: WebSocket): WebSocket[] {
    return [...this.ctx.getWebSockets(), ...this.polls.sockets()].filter((ws) => ws !== except && ws.readyState === WebSocket.OPEN && !wasGhost(ws));
  }

  private sendTo(ws: WebSocket, message: QuizServerMessage): void {
    try {
      ws.send(JSON.stringify(message));
    } catch {
      // Kapanmış.
    }
  }
}
