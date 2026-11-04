import { DurableObject } from 'cloudflare:workers';
import { PollHub } from './fallback.ts';
import { labServer } from './lab.ts';
import {
  QUIZ_ANSWER_MS,
  QUIZ_MAX_PLAYERS,
  QUIZ_PROTOCOL_VERSION,
  QUIZ_QUESTIONS,
  QUIZ_RECENT,
  QUIZ_REVEAL_MS,
  fiftyFifty,
  parseQuizMessage,
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
import type { Avatar } from '@swm/shared/protocol';
import { RateLimiter } from './rate-limit.ts';

const EMPTY_TTL_MS = 24 * 60 * 60 * 1000;
/** BHG: with fewer than two players online a running game waits this long before it goes back to the lobby, so one
 * player's reload or short drop no longer ends the game for both (as the room's host keeps the role for 20 s). */
const FEW_GRACE_MS = 20_000;
const MAX_SOCKETS = 40;

interface Attachment {
  id: string;
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
  answers: Record<string, { pick: number; gained: number; rank?: number }>;
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
  fifty: Record<string, { n: number; hide: number[] }>;
  /** Right answers in a row, per key. */
  streak: Record<string, number>;
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
  });

  override async fetch(request: Request): Promise<Response> {
    this.lab ||= labServer(this.env, request);
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
      server.serializeAttachment({ id: crypto.randomUUID().slice(0, 8), name: null } satisfies Attachment);
      if (this.data.emptySince !== null) {
        this.data.emptySince = null;
        await this.save();
      }
    }
  }

  override async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
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
    await this.left(ws);
  }

  override async webSocketError(ws: WebSocket): Promise<void> {
    await this.left(ws);
  }

  /** Moves the game on to whatever its clock says now (from the alarm, or a message that found it overdue). */
  private async advance(now: number): Promise<void> {
    const d = this.data;
    if (d.endsAt !== null && now >= d.endsAt) {
      if (d.phase === 'question') await this.reveal();
      else if (d.phase === 'reveal') await this.next();
    }
  }

  override async alarm(): Promise<void> {
    const now = Date.now();
    await this.advance(now);
    const d = this.data;
    if ((d.phase === 'question' || d.phase === 'reveal') && d.fewSince && this.tooFew(now)) await this.toLobby();
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
    if (d.phase === 'question' && fifty && fifty.n === d.index + 1) this.sendTo(ws, { t: 'fifty', ...fifty });
    this.broadcastState();
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
        if (!this.lab) return this.sendTo(ws, { t: 'error', code: 'lab_off' });
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
        await this.save();
        this.broadcastState();
        return;
      case 'start':
        // Lobide ya da kürsüde (yeni oyun): puanlar sıfırlanır.
        if (d.phase !== 'lobby' && d.phase !== 'over') return;
        if (this.hostKey() !== key) return this.sendTo(ws, { t: 'error', code: 'not_host' });
        if (this.onlineKeys().length < 2) return this.sendTo(ws, { t: 'error', code: 'too_few' });
        for (const person of Object.values(d.people)) person.score = 0;
        // Avoid what this table asked lately and what the players' browsers have seen (P9: always new questions).
        const seen = this.onlineKeys().flatMap((k) => d.people[k]?.seen ?? []);
        d.questions = pickQuestions(d.lang, d.count, Math.random, d.topic, [...new Set([...d.recent, ...seen])]);
        d.recent = [...d.questions.map((q) => q.id), ...d.recent.filter((id) => !d.questions.some((q) => q.id === id))].slice(0, QUIZ_RECENT);
        d.jokers = [];
        d.fifty = {};
        d.streak = {};
        d.index = -1;
        await this.next();
        return;
      case 'joker': {
        if (d.phase !== 'question' || message.n !== d.index + 1 || d.answers[key] || d.jokers.includes(key)) return;
        // One hidden pair per question for everyone: a fresh pair per person let two identities' jokers together
        // show the answer (security review 2, L6).
        const hide = Object.values(d.fifty).find((f) => f.n === message.n)?.hide ?? fiftyFifty(d.questions[d.index]!);
        if (!hide.length) return;
        d.jokers.push(key);
        d.fifty[key] = { n: message.n, hide };
        await this.save();
        this.sendTo(ws, { t: 'fifty', n: message.n, hide });
        this.broadcastState();
        return;
      }
      case 'answer': {
        if (d.phase !== 'question' || message.n !== d.index + 1 || d.answers[key]) return;
        const q = d.questions[d.index]!;
        if (message.pick >= q.options.length || d.fifty[key]?.n === message.n && d.fifty[key]!.hide.includes(message.pick)) return;
        if (message.pick === q.correct) {
          const rank = Object.values(d.answers).filter((a) => a.rank).length + 1;
          const streak = (d.streak[key] ?? 0) + 1;
          d.answers[key] = { pick: message.pick, gained: quizPoints((d.endsAt ?? Date.now()) - Date.now(), QUIZ_ANSWER_MS, rank, streak), rank };
        } else d.answers[key] = { pick: message.pick, gained: 0 };
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

  private async next(): Promise<void> {
    const d = this.data;
    if (d.phase !== 'lobby' && this.tooFew(Date.now())) return this.toLobby();
    d.index += 1;
    if (d.index >= d.questions.length) {
      d.phase = 'over';
      d.endsAt = null;
    } else {
      d.phase = 'question';
      d.answers = {};
      d.endsAt = Date.now() + QUIZ_ANSWER_MS;
    }
    await this.save();
    this.broadcastState();
    await this.scheduleAlarm();
  }

  private async reveal(): Promise<void> {
    const d = this.data;
    for (const [key, answer] of Object.entries(d.answers)) if (d.people[key]) d.people[key]!.score += answer.gained;
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
    if ((d.phase === 'question' || d.phase === 'reveal') && this.tooFew(Date.now(), ws)) return this.toLobby();
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
        ...(reveal && answer ? { pick: answer.pick, gained: answer.gained, ...(answer.rank ? { rank: answer.rank } : {}) } : {}),
        streak: d.streak[k] ?? 0,
        joker: d.jokers.includes(k),
        online: this.online(k, except),
      };
    });
    const q = (d.phase === 'question' || reveal) && d.questions[d.index] ? d.questions[d.index]! : null;
    return {
      t: 'state',
      phase: d.phase,
      players,
      n: d.phase === 'lobby' ? 0 : Math.min(d.index + 1, d.questions.length),
      total: d.questions.length || d.count,
      ...(q ? { question: q.question, options: q.options, cat: q.cat, qid: q.id } : {}),
      ...(q && reveal ? { correct: q.correct } : {}),
      endsAt: d.endsAt,
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
    return [...this.ctx.getWebSockets(), ...this.polls.sockets()].filter((ws) => ws !== except && ws.readyState === WebSocket.OPEN);
  }

  private sendTo(ws: WebSocket, message: QuizServerMessage): void {
    try {
      ws.send(JSON.stringify(message));
    } catch {
      // Kapanmış.
    }
  }
}
