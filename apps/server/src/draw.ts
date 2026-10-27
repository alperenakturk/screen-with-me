import { DurableObject } from 'cloudflare:workers';
import {
  DRAWER_POINTS,
  DRAW_CHOOSE_MS,
  DRAW_MAX_PLAYERS,
  DRAW_PROTOCOL_VERSION,
  DRAW_REVEAL_MS,
  DRAW_ROUND_MS,
  guessPoints,
  isClose,
  isCorrect,
  maskWord,
  parseDrawMessage,
  revealOrder,
  revealTimes,
  type DrawClientMessage,
  type DrawLang,
  type DrawPhase,
  type DrawPlayer,
  type DrawServerMessage,
  type Stroke,
} from '@swm/shared/games/draw';
import { DRAW_WORDS } from '@swm/shared/games/draw-words';
import type { Avatar } from '@swm/shared/protocol';
import { RateLimiter } from './rate-limit.ts';

/** Oda boş kaldıktan bu kadar sonra silinir. */
const EMPTY_TTL_MS = 24 * 60 * 60 * 1000;
/** Odada en fazla bağlantı (aynı kişinin birkaç sekmesi dahil). */
const MAX_SOCKETS = 40;
/** Bir turdaki çizimin üst sınırı (nokta sayısı): geç gelen hepsini tek mesajda alır. */
const MAX_POINTS = 60_000;
/** Son kullanılan kelimeler tekrar gelmesin. */
const RECENT_WORDS = 60;

interface Attachment {
  id: string;
  /** hello gelene kadar yok. */
  name: string | null;
  /** Kalıcı tarayıcı kimliği (puan ve sıra buna bağlı; istemcilere gitmez). */
  key?: string;
}

interface Person {
  /** İstemcilere giden kimlik (kalıcı anahtar gizli kalır). */
  pid: string;
  name: string;
  avatar?: Avatar;
  score: number;
}

interface Saved {
  phase: DrawPhase;
  lang: DrawLang;
  round: number;
  /** Oyuncuların anahtarları, geliş sırasıyla (çizme sırası). */
  order: string[];
  people: Record<string, Person>;
  drawer: string | null;
  choices: string[];
  word: string | null;
  guessed: string[];
  endsAt: number | null;
  /** Açılacak harfler (sırasıyla), açılma anları, kaçı açıldı. */
  reveal: number[];
  revealAt: number[];
  revealed: number;
  recent: string[];
  emptySince: number | null;
}

const fresh = (): Saved => ({
  phase: 'lobby',
  lang: 'tr',
  round: 0,
  order: [],
  people: {},
  drawer: null,
  choices: [],
  word: null,
  guessed: [],
  endsAt: null,
  reveal: [],
  revealAt: [],
  revealed: 0,
  recent: [],
  emptySince: null,
});

/**
 * Çiz-Bil odası: bir oyun = bir nesne. Tur akışı lobi → kelime seçimi → çizim → kelimenin açıklanması → sıradaki
 * çizen. Süreler depo alarmıyla yürür (nesne uyusa da tur biter). Çizim sadece bellekte (uyanınca boş tuval: kabul).
 */
export class Draw extends DurableObject<Env> {
  private data: Saved = fresh();
  private strokes: Stroke[] = [];
  private points = 0;
  private readonly limit = new RateLimiter(20, 8);
  private readonly strokeLimit = new RateLimiter(80, 40);
  private readonly guessLimit = new RateLimiter(6, 2);

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    void ctx.blockConcurrencyWhile(async () => {
      const saved = await ctx.storage.get<Saved>('draw');
      if (saved && Array.isArray(saved.order)) this.data = saved;
    });
  }

  override async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected WebSocket', { status: 426 });
    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server);
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
    return new Response(null, { status: 101, webSocket: client });
  }

  override async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    const me = ws.deserializeAttachment() as Attachment;
    const message = typeof raw === 'string' ? parseDrawMessage(raw) : null;
    if (!message) return this.sendTo(ws, { t: 'error', code: 'bad' });
    if (message.t === 'ping') return this.sendTo(ws, { t: 'pong', now: Date.now() });
    const limiter = message.t === 'stroke' ? this.strokeLimit : message.t === 'guess' ? this.guessLimit : this.limit;
    if (!limiter.allow(me.id)) return this.sendTo(ws, { t: 'error', code: 'rate' });
    if (message.t === 'hello') return this.hello(ws, me, message);
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

  override async alarm(): Promise<void> {
    const now = Date.now();
    const d = this.data;
    if (d.phase === 'choose' && d.endsAt !== null && now >= d.endsAt) {
      // Süre doldu, seçmedi: ilk kelime.
      await this.beginDraw(d.choices[0] ?? this.pickWords(1)[0]!);
    } else if (d.phase === 'draw') {
      let changed = false;
      while (d.revealed < d.revealAt.length && now >= d.revealAt[d.revealed]!) {
        d.revealed++;
        changed = true;
      }
      if (d.endsAt !== null && now >= d.endsAt) await this.endRound();
      else if (changed) {
        await this.save();
        this.broadcastState();
      }
    } else if (d.phase === 'reveal' && d.endsAt !== null && now >= d.endsAt) {
      await this.nextRound();
    }
    if (this.sockets().length === 0 && d.emptySince !== null && now - d.emptySince >= EMPTY_TTL_MS) {
      await this.ctx.storage.deleteAll();
      this.data = fresh();
      this.strokes = [];
      return;
    }
    await this.scheduleAlarm();
  }

  private async hello(ws: WebSocket, me: Attachment, message: Extract<DrawClientMessage, { t: 'hello' }>): Promise<void> {
    if (message.v !== DRAW_PROTOCOL_VERSION) {
      this.sendTo(ws, { t: 'error', code: 'version' });
      ws.close(4000, 'version');
      return;
    }
    const key = message.cid ?? `conn:${me.id}`;
    const d = this.data;
    if (!d.people[key]) {
      // Yer yoksa bağlı olmayan birinin yeri boşalır (çizen değilse).
      if (d.order.length >= DRAW_MAX_PLAYERS) {
        const gone = d.order.find((k) => k !== d.drawer && !this.online(k));
        if (!gone) {
          this.sendTo(ws, { t: 'error', code: 'full' });
          ws.close(4001, 'full');
          return;
        }
        d.order = d.order.filter((k) => k !== gone);
        delete d.people[gone];
      }
      // Odanın dili ilk gelenin dili.
      if (d.order.length === 0 && d.phase === 'lobby') d.lang = message.lang ?? 'tr';
      d.order.push(key);
      d.people[key] = { pid: crypto.randomUUID().slice(0, 8), name: message.name, score: 0, ...(message.avatar ? { avatar: message.avatar } : {}) };
    } else {
      const person = d.people[key]!;
      person.name = message.name;
      if (message.avatar) person.avatar = message.avatar;
    }
    me.name = message.name;
    me.key = key;
    ws.serializeAttachment(me);
    await this.save();
    this.sendTo(ws, { t: 'welcome', you: d.people[key]!.pid, now: Date.now() });
    if (d.phase === 'draw' && this.strokes.length) this.sendTo(ws, { t: 'strokes', list: this.strokes });
    if (d.phase === 'choose' && d.drawer === key) this.sendTo(ws, { t: 'choices', words: d.choices });
    this.broadcastState();
  }

  private async apply(ws: WebSocket, key: string, message: DrawClientMessage): Promise<void> {
    const d = this.data;
    switch (message.t) {
      case 'start':
        if (d.phase !== 'lobby') return;
        if (this.onlineKeys().length < 2) return this.sendTo(ws, { t: 'error', code: 'too_few' });
        await this.nextRound();
        return;
      case 'choose':
        if (d.phase !== 'choose' || d.drawer !== key) return this.sendTo(ws, { t: 'error', code: 'not_drawer' });
        if (!d.choices[message.index]) return;
        await this.beginDraw(d.choices[message.index]!);
        return;
      case 'stroke':
        if (d.phase !== 'draw' || d.drawer !== key) return this.sendTo(ws, { t: 'error', code: 'not_drawer' });
        if (this.points + message.s.p.length / 2 > MAX_POINTS) return;
        this.points += message.s.p.length / 2;
        this.strokes.push(message.s);
        this.broadcast({ t: 'stroke', s: message.s }, ws);
        return;
      case 'clear':
        if (d.phase !== 'draw' || d.drawer !== key) return this.sendTo(ws, { t: 'error', code: 'not_drawer' });
        this.strokes = [];
        this.points = 0;
        this.broadcast({ t: 'clear' }, ws);
        return;
      case 'guess':
        await this.guess(ws, key, message.text);
        return;
      case 'reset':
        this.data = { ...fresh(), lang: d.lang, order: d.order, people: d.people, recent: d.recent };
        for (const person of Object.values(this.data.people)) person.score = 0;
        this.strokes = [];
        this.points = 0;
        await this.save();
        this.broadcast({ t: 'clear' });
        this.broadcastState();
        await this.scheduleAlarm();
        return;
      default:
        return;
    }
  }

  private async guess(ws: WebSocket, key: string, text: string): Promise<void> {
    const d = this.data;
    const person = d.people[key]!;
    // Lobide ve tur aralarında sohbet gibi (herkese).
    if (d.phase !== 'draw' || !d.word) {
      this.broadcast({ t: 'guess', from: person.pid, name: person.name, text });
      return;
    }
    // Çizen ve bilenler kendi aralarında yazışır (kelimeyi söylemesinler diye diğerlerine gitmez).
    if (key === d.drawer || d.guessed.includes(key)) {
      if (isCorrect(text, d.word, d.lang)) return;
      const insiders = new Set([d.drawer, ...d.guessed]);
      this.broadcast({ t: 'guess', from: person.pid, name: person.name, text, secret: true }, undefined, (k) => insiders.has(k));
      return;
    }
    if (isCorrect(text, d.word, d.lang)) {
      const points = guessPoints((d.endsAt ?? Date.now()) - Date.now());
      person.score += points;
      if (d.drawer && d.people[d.drawer]) d.people[d.drawer]!.score += DRAWER_POINTS;
      d.guessed.push(key);
      this.broadcast({ t: 'correct', from: person.pid, name: person.name, points });
      // Herkes bildiyse tur biter.
      if (this.onlineKeys().every((k) => k === d.drawer || d.guessed.includes(k))) await this.endRound();
      else {
        await this.save();
        this.broadcastState();
      }
      return;
    }
    if (isClose(text, d.word, d.lang)) this.sendTo(ws, { t: 'close', text });
    this.broadcast({ t: 'guess', from: person.pid, name: person.name, text });
  }

  /** Sıradaki çizen (bağlı olanlar arasında, sırayla); 2 kişiden az kaldıysa lobiye. */
  private async nextRound(): Promise<void> {
    const d = this.data;
    const online = d.order.filter((k) => this.online(k));
    if (online.length < 2) return this.toLobby();
    const from = d.drawer ? d.order.indexOf(d.drawer) : -1;
    let drawer = online[0]!;
    for (let i = 1; i <= d.order.length; i++) {
      const k = d.order[(from + i) % d.order.length]!;
      if (online.includes(k)) {
        drawer = k;
        break;
      }
    }
    d.phase = 'choose';
    d.round += 1;
    d.drawer = drawer;
    d.choices = this.pickWords(3);
    d.word = null;
    d.guessed = [];
    d.endsAt = Date.now() + DRAW_CHOOSE_MS;
    d.reveal = [];
    d.revealAt = [];
    d.revealed = 0;
    this.strokes = [];
    this.points = 0;
    await this.save();
    this.broadcast({ t: 'clear' });
    this.broadcast({ t: 'choices', words: d.choices }, undefined, (k) => k === drawer);
    this.broadcastState();
    await this.scheduleAlarm();
  }

  private async beginDraw(word: string): Promise<void> {
    const d = this.data;
    const now = Date.now();
    d.phase = 'draw';
    d.word = word;
    d.choices = [];
    d.endsAt = now + DRAW_ROUND_MS;
    d.reveal = revealOrder(word);
    d.revealAt = revealTimes(now, d.reveal.length);
    d.revealed = 0;
    d.recent = [word, ...d.recent.filter((w) => w !== word)].slice(0, RECENT_WORDS);
    await this.save();
    this.broadcastState();
    await this.scheduleAlarm();
  }

  private async endRound(): Promise<void> {
    const d = this.data;
    d.phase = 'reveal';
    d.endsAt = Date.now() + DRAW_REVEAL_MS;
    await this.save();
    this.broadcastState();
    await this.scheduleAlarm();
  }

  private async toLobby(): Promise<void> {
    const d = this.data;
    d.phase = 'lobby';
    d.drawer = null;
    d.word = null;
    d.choices = [];
    d.guessed = [];
    d.endsAt = null;
    this.strokes = [];
    this.points = 0;
    await this.save();
    this.broadcast({ t: 'clear' });
    this.broadcastState();
    await this.scheduleAlarm();
  }

  /** Son kullanılanlar dışından rastgele kelimeler. */
  private pickWords(count: number): string[] {
    const list = DRAW_WORDS[this.data.lang].filter((w) => !this.data.recent.includes(w));
    const pool = list.length >= count ? [...list] : [...DRAW_WORDS[this.data.lang]];
    const out: string[] = [];
    while (out.length < count && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]!);
    return out;
  }

  private async left(ws: WebSocket): Promise<void> {
    const d = this.data;
    const remaining = this.sockets(ws);
    if (remaining.length === 0) {
      d.emptySince = Date.now();
      // Oda boşaldı: oyun lobiye döner (geri gelen yeniden başlatır).
      d.phase = 'lobby';
      d.drawer = null;
      d.word = null;
      d.endsAt = null;
      await this.save();
      await this.scheduleAlarm();
      return;
    }
    const key = (ws.deserializeAttachment() as Attachment | null)?.key;
    const stillHere = (k: string) => remaining.some((s) => (s.deserializeAttachment() as Attachment | null)?.key === k);
    const online = d.order.filter(stillHere);
    if (d.phase !== 'lobby' && online.length < 2) return this.toLobby();
    // Çizen gitti: tur biter (kelime açıklanır, sıradakine geçilir).
    if (key && key === d.drawer && !stillHere(key) && (d.phase === 'choose' || d.phase === 'draw')) return this.endRound();
    // Kalanların hepsi bildiyse tur biter.
    if (d.phase === 'draw' && online.every((k) => k === d.drawer || d.guessed.includes(k))) return this.endRound();
    this.broadcastState(ws);
  }

  private async scheduleAlarm(): Promise<void> {
    const d = this.data;
    const times: number[] = [];
    if (d.endsAt !== null && d.phase !== 'lobby') times.push(d.endsAt);
    if (d.phase === 'draw' && d.revealed < d.revealAt.length) times.push(d.revealAt[d.revealed]!);
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

  private stateFor(key: string | undefined, except?: WebSocket): DrawServerMessage {
    const d = this.data;
    const players: DrawPlayer[] = d.order.map((k) => {
      const p = d.people[k]!;
      return { id: p.pid, name: p.name, ...(p.avatar ? { avatar: p.avatar } : {}), score: p.score, guessed: d.guessed.includes(k), online: this.online(k, except) };
    });
    const showWord = d.word !== null && (d.phase === 'reveal' || (d.phase === 'draw' && key === d.drawer));
    return {
      t: 'state',
      phase: d.phase,
      players,
      drawer: d.drawer ? (d.people[d.drawer]?.pid ?? null) : null,
      hint: d.word && d.phase === 'draw' ? maskWord(d.word, d.reveal.slice(0, d.revealed)) : '',
      ...(showWord ? { word: d.word! } : {}),
      endsAt: d.endsAt,
      round: d.round,
      lang: d.lang,
    };
  }

  /** Herkese kendi durumu (kelime sadece çizene gider). */
  private broadcastState(except?: WebSocket): void {
    for (const ws of this.sockets(except)) {
      const a = ws.deserializeAttachment() as Attachment | null;
      if (!a?.name) continue;
      this.sendTo(ws, this.stateFor(a.key, except));
    }
  }

  private async save(): Promise<void> {
    await this.ctx.storage.put('draw', this.data);
  }

  private sockets(except?: WebSocket): WebSocket[] {
    return this.ctx.getWebSockets().filter((ws) => ws !== except && ws.readyState === WebSocket.OPEN);
  }

  private sendTo(ws: WebSocket, message: DrawServerMessage): void {
    try {
      ws.send(JSON.stringify(message));
    } catch {
      // Kapanmış.
    }
  }

  /** Adı olan herkese (isteğe bağlı: biri hariç, ya da sadece anahtarı uyanlara). */
  private broadcast(message: DrawServerMessage, except?: WebSocket, only?: (key: string) => boolean): void {
    const text = JSON.stringify(message);
    for (const ws of this.sockets(except)) {
      const a = ws.deserializeAttachment() as Attachment | null;
      if (!a?.name || (only && (!a.key || !only(a.key)))) continue;
      try {
        ws.send(text);
      } catch {
        // Kapanmış.
      }
    }
  }
}
