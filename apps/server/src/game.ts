import { DurableObject } from 'cloudflare:workers';
import type { BoardState, Mark } from '@swm/shared/games/board';
import {
  GAME_MAX_PEOPLE,
  GAME_PROTOCOL_VERSION,
  GAME_RULES,
  parseGameMessage,
  type GameClientMessage,
  type GameKind,
  type GamePerson,
  type GameScore,
  type GameServerMessage,
} from '@swm/shared/games/protocol';
import type { Avatar } from '@swm/shared/protocol';
import { RateLimiter } from './rate-limit.ts';

/** Oyun odası boş kaldıktan bu kadar sonra silinir. */
const EMPTY_TTL_MS = 24 * 60 * 60 * 1000;

interface Attachment {
  id: string;
  /** hello gelene kadar yok. */
  name: string | null;
  avatar?: Avatar;
  /** Kalıcı tarayıcı kimliği (koltuk buna bağlı; sayfa yenilense de oyuncu koltuğunda kalır). İstemcilere gitmez. */
  key?: string;
}

/** Koltuk: kimin (kalıcı anahtar), adı ve avatarı. Sahibi çıkınca koltuk ona ayrılı kalır, izleyiciler oturabilir. */
interface Seat {
  key: string;
  name: string;
  avatar?: Avatar;
}

interface Saved {
  kind: GameKind;
  state: BoardState;
  seats: [Seat | null, Seat | null];
  score: GameScore;
  emptySince: number | null;
}

const fresh = (kind: GameKind = 'xox'): Saved => ({ kind, state: GAME_RULES[kind].newGame(), seats: [null, null], score: { X: 0, O: 0, draw: 0 }, emptySince: null });

const MARKS: readonly [Mark, Mark] = ['X', 'O'];

/**
 * PlayWithMe oyun odası (XOX, Dört Taş): bir maç = bir nesne. Türü ilk gelen belirler (adresteki tür). İlk iki kişi X ve O koltuklarına oturur, sonra gelenler
 * izler. Hamleleri sunucu doğrular (sıra, boş hücre). Koltuk kalıcı tarayıcı kimliğine bağlı: oyuncu sayfayı yenilerse
 * koltuğunda kalır; çıkıp gittiyse izleyicilerden biri yerine oturabilir. Durum depoya yazılır (nesne uyusa da kalır).
 */
export class Game extends DurableObject<Env> {
  private data: Saved = fresh();
  private readonly limit = new RateLimiter(20, 8);
  private readonly reactLimit = new RateLimiter(6, 2);

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    void ctx.blockConcurrencyWhile(async () => {
      // Eski kayıt (sürüm 1) `xox` alanında tutuyordu.
      const saved = await ctx.storage.get<Saved & { xox?: unknown }>('game');
      const kind = saved?.kind ?? 'xox';
      const state = saved?.state ?? saved?.xox;
      if (saved && GAME_RULES[kind]?.isState(state)) this.data = { kind, state, seats: saved.seats, score: saved.score, emptySince: saved.emptySince };
    });
  }

  override async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected WebSocket', { status: 426 });
    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server);
    if (this.sockets().length > GAME_MAX_PEOPLE) {
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
    const message = typeof raw === 'string' ? parseGameMessage(raw) : null;
    if (!message) return this.sendTo(ws, { t: 'error', code: 'bad' });
    if (message.t === 'ping') return this.sendTo(ws, { t: 'pong' });
    if (!this.limit.allow(me.id)) return this.sendTo(ws, { t: 'error', code: 'rate' });
    if (message.t === 'hello') return this.hello(ws, me, message);
    if (me.name === null) return this.sendTo(ws, { t: 'error', code: 'bad' });
    await this.apply(ws, me as Attachment & { name: string }, message);
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
    if (this.sockets().length > 0 || this.data.emptySince === null) return;
    if (Date.now() - this.data.emptySince >= EMPTY_TTL_MS) {
      await this.ctx.storage.deleteAll();
      this.data = fresh();
    } else {
      await this.ctx.storage.setAlarm(this.data.emptySince + EMPTY_TTL_MS);
    }
  }

  private async hello(ws: WebSocket, me: Attachment, message: Extract<GameClientMessage, { t: 'hello' }>): Promise<void> {
    if (message.v !== GAME_PROTOCOL_VERSION) {
      this.sendTo(ws, { t: 'error', code: 'version' });
      ws.close(4000, 'version');
      return;
    }
    // Tür: hiç oynanmamış odayı ilk gelen belirler; başka türün sürdüğü koda gelen (adresi elle değiştirdiyse) giremez.
    if (message.game !== this.data.kind) {
      const untouched = this.data.seats.every((seat) => seat === null) && this.data.state.board.every((c) => c === null);
      if (!untouched) {
        this.sendTo(ws, { t: 'error', code: 'kind' });
        ws.close(4002, 'kind');
        return;
      }
      this.data = { ...fresh(message.game), emptySince: null };
    }
    me.name = message.name;
    if (message.avatar) me.avatar = message.avatar;
    // Kalıcı kimlik yoksa bağlantıya özel anahtar: yenileyince koltuk ayrılı kalır, başkası oturabilir.
    me.key = message.cid ?? `conn:${me.id}`;
    ws.serializeAttachment(me);
    // Koltuğum varsa adım/avatarım güncellensin; yoksa boş koltuk varsa otur (ilk iki kişi oynar).
    const mine = this.seatOf(me.key);
    if (mine !== -1) {
      this.data.seats[mine] = { key: me.key, name: me.name, ...(me.avatar ? { avatar: me.avatar } : {}) };
    } else {
      const free = this.data.seats.findIndex((seat) => seat === null);
      if (free !== -1) this.data.seats[free] = { key: me.key, name: me.name, ...(me.avatar ? { avatar: me.avatar } : {}) };
    }
    await this.save();
    this.sendTo(ws, { t: 'welcome', you: me.id, game: this.data.kind });
    this.broadcastState();
  }

  private async apply(ws: WebSocket, me: Attachment & { name: string }, message: GameClientMessage): Promise<void> {
    const seat = this.seatOf(me.key);
    switch (message.t) {
      case 'move': {
        if (seat === -1) return this.sendTo(ws, { t: 'error', code: 'not_player' });
        // İki koltuk dolmadan oyun başlamaz (tek başına iki taraf oynanmasın).
        if (this.data.seats.some((s) => s === null)) return this.sendTo(ws, { t: 'error', code: 'not_your_turn' });
        const next = GAME_RULES[this.data.kind].play(this.data.state, MARKS[seat]!, message.cell);
        if (!next) return this.sendTo(ws, { t: 'error', code: 'not_your_turn' });
        this.data.state = next;
        if (next.winner) this.data.score[next.winner] += 1;
        break;
      }
      case 'rematch':
        if (seat === -1) return this.sendTo(ws, { t: 'error', code: 'not_player' });
        if (this.data.state.winner === null) return;
        this.data.state = GAME_RULES[this.data.kind].rematch(this.data.state);
        break;
      case 'sit': {
        if (seat !== -1) return;
        const current = this.data.seats[message.seat];
        // Dolu koltuğa ancak sahibi bağlı değilse oturulur.
        if (current && this.online(current.key)) return this.sendTo(ws, { t: 'error', code: 'seat_taken' });
        this.data.seats[message.seat] = { key: me.key!, name: me.name, ...(me.avatar ? { avatar: me.avatar } : {}) };
        // Yeni rakip: el yarıda kaldıysa baştan.
        if (current && current.key !== me.key && this.data.state.winner === null && this.data.state.board.some((c) => c !== null)) {
          this.data.state = GAME_RULES[this.data.kind].newGame(this.data.state.starter);
        }
        break;
      }
      case 'stand':
        if (seat === -1) return;
        this.data.seats[seat] = null;
        break;
      case 'react':
        if (!this.reactLimit.allow(me.key ?? me.id)) return;
        this.broadcast({ t: 'react', from: this.person(me), emoji: message.emoji });
        return;
      default:
        return;
    }
    await this.save();
    this.broadcastState();
  }

  private async left(ws: WebSocket): Promise<void> {
    this.broadcastState(ws);
    if (this.sockets(ws).length === 0) {
      this.data.emptySince = Date.now();
      await this.save();
      await this.ctx.storage.setAlarm(this.data.emptySince + EMPTY_TTL_MS);
    }
  }

  private seatOf(key: string | undefined): number {
    if (!key) return -1;
    return this.data.seats.findIndex((seat) => seat?.key === key);
  }

  private online(key: string, except?: WebSocket): boolean {
    return this.sockets(except).some((ws) => (ws.deserializeAttachment() as Attachment | null)?.key === key);
  }

  private person(me: Attachment & { name: string }): GamePerson {
    return { id: me.id, name: me.name, ...(me.avatar ? { avatar: me.avatar } : {}), online: true };
  }

  private broadcastState(except?: WebSocket): void {
    const joined = this.sockets(except)
      .map((ws) => ws.deserializeAttachment() as Attachment | null)
      .filter((a): a is Attachment & { name: string } => !!a?.name);
    const seats = this.data.seats.map((seat, index) => {
      if (!seat) return null;
      const conn = joined.find((a) => a.key === seat.key);
      return { id: conn?.id ?? `seat-${index}`, name: seat.name, ...(seat.avatar ? { avatar: seat.avatar } : {}), online: !!conn };
    }) as [GamePerson | null, GamePerson | null];
    const seated = new Set(this.data.seats.map((s) => s?.key));
    // Aynı tarayıcının birden çok sekmesi tek izleyici sayılır.
    const watchers: GamePerson[] = [];
    const seen = new Set<string>();
    for (const a of joined) {
      if (seated.has(a.key) || seen.has(a.key!)) continue;
      seen.add(a.key!);
      watchers.push(this.person(a));
    }
    this.broadcast({ t: 'state', kind: this.data.kind, game: this.data.state, seats, watchers, score: this.data.score }, except);
  }

  private async save(): Promise<void> {
    await this.ctx.storage.put('game', this.data);
  }

  private sockets(except?: WebSocket): WebSocket[] {
    return this.ctx.getWebSockets().filter((ws) => ws !== except && ws.readyState === WebSocket.OPEN);
  }

  private sendTo(ws: WebSocket, message: GameServerMessage): void {
    try {
      ws.send(JSON.stringify(message));
    } catch {
      // Kapanmış.
    }
  }

  private broadcast(message: GameServerMessage, except?: WebSocket): void {
    const text = JSON.stringify(message);
    for (const ws of this.sockets(except)) {
      if (!(ws.deserializeAttachment() as Attachment | null)?.name) continue;
      try {
        ws.send(text);
      } catch {
        // Kapanmış.
      }
    }
  }
}
