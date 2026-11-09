import type { ServerClock } from './clock.ts';
import { PROTOCOL_VERSION, type Avatar, type ClientKind, type ClientMessage, type ServerMessage } from './protocol.ts';
import { KEEPALIVE, KEEPALIVE_ACK, ROOM_CLOCK_EVERY, ROOM_KEEPALIVE_MS, keepaliveTicks } from './keepalive.ts';
import { OPEN, UPGRADE_CODE, openSocket, type SwmSocket, type Transport } from './socket.ts';

export type ConnectionStatus = 'connecting' | 'open' | 'reconnecting' | 'closed';

export interface RoomConnectionOptions {
  /** Örn. "http://localhost:8787" veya "https://screen-with-me.example.workers.dev" */
  serverUrl: string;
  roomId: string;
  name: string;
  avatar?: Avatar;
  /** Tarayıcının kalıcı kimliği (bkz. hello.cid). */
  cid?: string;
  /** Site mi eklenti mi (bkz. hello.client). */
  client?: ClientKind;
  /** A paired TV's link token (hello.tv): the TV joins as its person's second device. */
  tv?: string;
  clock: ServerClock;
  onMessage: (message: ServerMessage) => void;
  onStatus?: (status: ConnectionStatus) => void;
  /** Art arda kaç kez bağlanılamadığı (açıldıktan sonra kopanlar sayılmaz); açılınca 0. */
  onFailures?: (count: number) => void;
  /** Which way the connection went: a WebSocket, or the HTTP fallback (`socket.ts`) on networks without WebSockets. */
  onTransport?: (transport: Transport) => void;
  /**
   * `false`: this connection neither takes nor leaves the tab's member id handover (`swm:prev:<room>`). For the 🐞 Test
   * Lab's fake friends, which share the tab with the real room connection.
   */
  handover?: boolean;
}

/** Bağlanınca saati hızlıca öğrenmek için ilk birkaç ping sık atılır. */
const INITIAL_PINGS_MS = [0, 250, 600, 1200];
const MAX_RETRY_DELAY_MS = 10_000;
/**
 * Gönderilen ping'e bu kadar süre hiçbir cevap gelmezse bağlantı yarı açık sayılır ve
 * yeniden kurulur (Wi-Fi değişimi, uykudan uyanma: tarayıcı "kapandı" demeyebilir).
 */
const SILENCE_TIMEOUT_MS = 15_000;
/**
 * If the connection has not opened by then it is given up and tried again. Within it `openSocket` gives a hanging
 * WebSocket `WS_OPEN_MS` (6 s; some mobile networks neither open nor close it, "Bağlanıyor…" forever) and then tries
 * the HTTP fallback.
 */
const OPEN_TIMEOUT_MS = 16_000;

/**
 * Sunucuyla WebSocket bağlantısı. Bağlantı koparsa kendiliğinden, giderek
 * artan aralıklarla yeniden bağlanır; yeniden bağlanınca sunucu odanın güncel
 * durumunu tekrar yollar, böylece kopukluk sırasında kaçanlar telafi edilir.
 */
export class RoomConnection {
  private ws: SwmSocket | null = null;
  /** My member id from the last welcome: sent as `prev` on reconnect so the server drops the old connection. */
  private memberId: string | null = null;
  private retries = 0;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private stopped = false;
  /** Sunucudan en son mesaj geldiği an. */
  private lastHeard = 0;
  /** Düzenli ping'in en son gönderildiği an (cevap bekleniyor mu?). */
  private lastPingAt = 0;
  /** Art arda açılamayan bağlantı sayısı. */
  private failures = 0;
  /**
   * 🐞 Test Lab (card DL4) only, inert otherwise: the network is "down" until this time (no new connection opens), every
   * message waits this long each way, and the transport forced for new connections.
   */
  private offlineUntil = 0;
  private latencyMs = 0;
  private forced: Transport | null = null;

  constructor(private readonly options: RoomConnectionOptions) {
    this.memberId = options.handover === false ? null : takeHandover(options.roomId);
  }

  connect(): void {
    this.stopped = false;
    this.open(this.retries === 0 ? 'connecting' : 'reconnecting');
  }

  /** Yeniden bağlanınca hello'da gidecek ismi/avatarı günceller (isim değiştirince). */
  setIdentity(name: string, avatar?: Avatar): void {
    this.options.name = name;
    this.options.avatar = avatar;
  }

  send(message: ClientMessage): boolean {
    if (this.ws?.readyState !== OPEN) return false;
    const ws = this.ws;
    const data = JSON.stringify(message);
    // Lab latency: the same delay for every message keeps their order.
    if (this.latencyMs > 0) setTimeout(() => ws.readyState === OPEN && ws.send(data), this.latencyMs);
    else ws.send(data);
    return true;
  }

  /** Sends a ready-made text (the keepalive), with the lab latency like `send`. */
  private sendRaw(data: string): void {
    const ws = this.ws;
    if (ws?.readyState !== OPEN) return;
    if (this.latencyMs > 0) setTimeout(() => ws.readyState === OPEN && ws.send(data), this.latencyMs);
    else ws.send(data);
  }

  /** 🐞 Test Lab: the connection drops (as on a network blip) and none opens again for `downMs`. */
  labDrop(downMs: number): void {
    this.offlineUntil = Date.now() + Math.max(0, downMs);
    this.ws?.close(4000, 'lab drop');
  }

  /** 🐞 Test Lab: every message in and out waits `ms` (0 = off). */
  labLatency(ms: number): void {
    this.latencyMs = Math.max(0, Math.min(10_000, Math.round(ms)));
  }

  get labLatencyMs(): number {
    return this.latencyMs;
  }

  /** 🐞 Test Lab: new connections go this way (`null` = the normal choice); reconnects now. */
  labForce(transport: Transport | null): void {
    this.forced = transport;
    this.reconnect();
  }

  get labForced(): Transport | null {
    return this.forced;
  }

  /** Which way the open connection goes (null while connecting). */
  get transport(): Transport | null {
    return this.ws?.readyState === OPEN ? this.ws.transport : null;
  }

  /** Bağlantıyı hemen baştan kurar (kullanıcının "bağlantıyı yenile" düğmesi). */
  reconnect(): void {
    this.clearTimers();
    const old = this.ws;
    this.ws = null;
    old?.close(1000);
    this.retries = 0;
    this.stopped = false;
    this.open('connecting');
  }

  close(): void {
    // A reload (or a quick trip to the film page) comes back as the same member: its hello carries `prev` and the
    // server drops this connection if it is still there. A WebSocket closes with the page by itself; an HTTP fallback
    // session's last request may not get out of a closing tab.
    if (this.memberId && this.options.handover !== false) giveHandover(this.options.roomId, this.memberId);
    this.stopped = true;
    this.clearTimers();
    this.ws?.close(1000);
    this.ws = null;
    this.options.onStatus?.('closed');
  }

  private open(status: ConnectionStatus): void {
    this.options.onStatus?.(status);
    // Lab "network down": try again once it is back.
    const down = this.offlineUntil - Date.now();
    if (down > 0) {
      this.options.onStatus?.('reconnecting');
      this.timers.push(setTimeout(() => this.open('reconnecting'), down));
      return;
    }
    const base = this.options.serverUrl.replace(/^http/, 'ws').replace(/\/$/, '');
    const forced = this.forced;
    const ws = openSocket(`${base}/api/rooms/${encodeURIComponent(this.options.roomId)}/ws`, {
      upgrade: forced === null,
      ...(forced ? { force: forced } : {}),
      onTransport: (transport) => this.options.onTransport?.(transport),
    });
    this.ws = ws;
    let opened = false;
    const openTimer = setTimeout(() => {
      if (!opened && this.ws === ws) ws.close();
    }, OPEN_TIMEOUT_MS);
    this.timers.push(openTimer);

    ws.addEventListener('open', () => {
      opened = true;
      clearTimeout(openTimer);
      this.retries = 0;
      this.failures = 0;
      this.options.onFailures?.(0);
      this.options.onStatus?.('open');
      const { name, avatar, cid, client, tv } = this.options;
      const prev = this.memberId;
      this.send({ t: 'hello', v: PROTOCOL_VERSION, name, ...(avatar ? { avatar } : {}), ...(cid ? { cid } : {}), ...(client ? { client } : {}), ...(prev ? { prev } : {}), ...(tv ? { tv } : {}) });
      for (const delay of INITIAL_PINGS_MS) this.timers.push(setTimeout(() => this.ping(), delay));
      this.lastHeard = Date.now();
      this.lastPingAt = 0;
      // QUOTA1a: mostly the free keepalive (the object answers it without waking), a real ping (a clock sample) once a
      // minute; either answer counts as "heard".
      const tick = keepaliveTicks(ROOM_CLOCK_EVERY, () => this.sendRaw(KEEPALIVE), () => this.ping());
      this.pingTimer = setInterval(() => {
        // Son ping'e hiç cevap gelmediyse (ve üstünden yeterince geçtiyse) bağlantı yarı açık:
        // yeniden kur. Sadece "uzun süredir ses yok"a bakmayız; Chrome arka plandaki
        // sekmelerde zamanlayıcıyı dakikada bire yavaşlatır, o zaman sağlam bağlantı da
        // sessiz görünür.
        const now = Date.now();
        if (this.lastPingAt > 0 && this.lastHeard < this.lastPingAt) {
          // Önceki ping hâlâ cevapsız: süreyi o ping'den say, tekrar dene.
          if (now - this.lastPingAt > SILENCE_TIMEOUT_MS) {
            this.reconnect();
            return;
          }
          this.ping();
          return;
        }
        this.lastPingAt = now;
        tick();
      }, ROOM_KEEPALIVE_MS);
    });

    const receive = (event: { data: unknown }) => {
      this.lastHeard = Date.now();
      if (event.data === KEEPALIVE_ACK) return;
      let message: ServerMessage;
      try {
        message = JSON.parse(String(event.data)) as ServerMessage;
      } catch {
        return;
      }
      if (message.t === 'pong') this.options.clock.addSample(message.c, message.s);
      if (message.t === 'welcome') this.memberId = message.you;
      this.options.onMessage(message);
    };
    ws.addEventListener('message', (event) => {
      // Lab latency: the message arrives `latencyMs` later (still in order, and only from this connection).
      if (this.latencyMs > 0) setTimeout(() => this.ws === ws && receive(event), this.latencyMs);
      else receive(event);
    });

    ws.addEventListener('close', (event) => {
      if (this.ws !== ws) return;
      this.clearTimers();
      this.ws = null;
      if (this.stopped) return;
      if (!opened) this.options.onFailures?.(++this.failures);
      // The HTTP fallback found that WebSockets work again: switch over at once.
      const delay = event.code === UPGRADE_CODE ? 0 : Math.min(MAX_RETRY_DELAY_MS, 500 * 2 ** this.retries) + Math.random() * 300;
      this.retries++;
      this.options.onStatus?.('reconnecting');
      this.timers.push(setTimeout(() => this.open('reconnecting'), delay));
    });
  }

  private ping(): void {
    this.send({ t: 'ping', c: Date.now() });
  }

  private clearTimers(): void {
    for (const timer of this.timers) clearTimeout(timer);
    this.timers = [];
    if (this.pingTimer !== null) clearInterval(this.pingTimer);
    this.pingTimer = null;
  }
}

/** How long a closed page's member id waits for the next page of the same tab (`close` → constructor). */
const HANDOVER_MS = 30_000;
const handoverKey = (roomId: string) => `swm:prev:${roomId}`;

function giveHandover(roomId: string, id: string): void {
  try {
    sessionStorage.setItem(handoverKey(roomId), JSON.stringify({ id, at: Date.now() }));
  } catch {
    // No storage (tests, blocked): a reload simply joins as new.
  }
}

/** The member id the tab's previous page of this room left (once; old entries are ignored). */
function takeHandover(roomId: string): string | null {
  try {
    const raw = sessionStorage.getItem(handoverKey(roomId));
    if (raw === null) return null;
    sessionStorage.removeItem(handoverKey(roomId));
    const saved = JSON.parse(raw) as { id?: unknown; at?: unknown };
    return typeof saved.id === 'string' && typeof saved.at === 'number' && Date.now() - saved.at < HANDOVER_MS ? saved.id : null;
  } catch {
    return null;
  }
}
