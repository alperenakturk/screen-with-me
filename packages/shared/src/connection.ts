import type { ServerClock } from './clock.ts';
import { PROTOCOL_VERSION, type Avatar, type ClientMessage, type ServerMessage } from './protocol.ts';

export type ConnectionStatus = 'connecting' | 'open' | 'reconnecting' | 'closed';

export interface RoomConnectionOptions {
  /** Örn. "http://localhost:8787" veya "https://screen-with-me.example.workers.dev" */
  serverUrl: string;
  roomId: string;
  name: string;
  avatar?: Avatar;
  clock: ServerClock;
  onMessage: (message: ServerMessage) => void;
  onStatus?: (status: ConnectionStatus) => void;
}

const PING_INTERVAL_MS = 10_000;
/** Bağlanınca saati hızlıca öğrenmek için ilk birkaç ping sık atılır. */
const INITIAL_PINGS_MS = [0, 250, 600, 1200];
const MAX_RETRY_DELAY_MS = 10_000;

/**
 * Sunucuyla WebSocket bağlantısı. Bağlantı koparsa kendiliğinden, giderek
 * artan aralıklarla yeniden bağlanır; yeniden bağlanınca sunucu odanın güncel
 * durumunu tekrar yollar, böylece kopukluk sırasında kaçanlar telafi edilir.
 */
export class RoomConnection {
  private ws: WebSocket | null = null;
  private retries = 0;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private stopped = false;

  constructor(private readonly options: RoomConnectionOptions) {}

  connect(): void {
    this.stopped = false;
    this.open(this.retries === 0 ? 'connecting' : 'reconnecting');
  }

  send(message: ClientMessage): boolean {
    if (this.ws?.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify(message));
    return true;
  }

  close(): void {
    this.stopped = true;
    this.clearTimers();
    this.ws?.close(1000);
    this.ws = null;
    this.options.onStatus?.('closed');
  }

  private open(status: ConnectionStatus): void {
    this.options.onStatus?.(status);
    const base = this.options.serverUrl.replace(/^http/, 'ws').replace(/\/$/, '');
    const ws = new WebSocket(`${base}/api/rooms/${encodeURIComponent(this.options.roomId)}/ws`);
    this.ws = ws;

    ws.addEventListener('open', () => {
      this.retries = 0;
      this.options.onStatus?.('open');
      const { name, avatar } = this.options;
      this.send(avatar ? { t: 'hello', v: PROTOCOL_VERSION, name, avatar } : { t: 'hello', v: PROTOCOL_VERSION, name });
      for (const delay of INITIAL_PINGS_MS) this.timers.push(setTimeout(() => this.ping(), delay));
      this.pingTimer = setInterval(() => this.ping(), PING_INTERVAL_MS);
    });

    ws.addEventListener('message', (event) => {
      let message: ServerMessage;
      try {
        message = JSON.parse(String(event.data)) as ServerMessage;
      } catch {
        return;
      }
      if (message.t === 'pong') this.options.clock.addSample(message.c, message.s);
      this.options.onMessage(message);
    });

    ws.addEventListener('close', () => {
      if (this.ws !== ws) return;
      this.clearTimers();
      this.ws = null;
      if (this.stopped) return;
      const delay = Math.min(MAX_RETRY_DELAY_MS, 500 * 2 ** this.retries) + Math.random() * 300;
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
