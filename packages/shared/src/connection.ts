import type { ServerClock } from './clock.ts';
import { PROTOCOL_VERSION, type Avatar, type ClientMessage, type ServerMessage } from './protocol.ts';

export type ConnectionStatus = 'connecting' | 'open' | 'reconnecting' | 'closed';

export interface RoomConnectionOptions {
  /** Örn. "http://localhost:8787" veya "https://screen-with-me.example.workers.dev" */
  serverUrl: string;
  roomId: string;
  name: string;
  avatar?: Avatar;
  /** Tarayıcının kalıcı kimliği (bkz. hello.cid). */
  cid?: string;
  clock: ServerClock;
  onMessage: (message: ServerMessage) => void;
  onStatus?: (status: ConnectionStatus) => void;
}

const PING_INTERVAL_MS = 10_000;
/** Bağlanınca saati hızlıca öğrenmek için ilk birkaç ping sık atılır. */
const INITIAL_PINGS_MS = [0, 250, 600, 1200];
const MAX_RETRY_DELAY_MS = 10_000;
/**
 * Gönderilen ping'e bu kadar süre hiçbir cevap gelmezse bağlantı yarı açık sayılır ve
 * yeniden kurulur (Wi-Fi değişimi, uykudan uyanma: tarayıcı "kapandı" demeyebilir).
 */
const SILENCE_TIMEOUT_MS = 15_000;

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
  /** Sunucudan en son mesaj geldiği an. */
  private lastHeard = 0;
  /** Düzenli ping'in en son gönderildiği an (cevap bekleniyor mu?). */
  private lastPingAt = 0;

  constructor(private readonly options: RoomConnectionOptions) {}

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
    if (this.ws?.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify(message));
    return true;
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
      const { name, avatar, cid } = this.options;
      this.send({ t: 'hello', v: PROTOCOL_VERSION, name, ...(avatar ? { avatar } : {}), ...(cid ? { cid } : {}) });
      for (const delay of INITIAL_PINGS_MS) this.timers.push(setTimeout(() => this.ping(), delay));
      this.lastHeard = Date.now();
      this.lastPingAt = 0;
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
        this.ping();
      }, PING_INTERVAL_MS);
    });

    ws.addEventListener('message', (event) => {
      this.lastHeard = Date.now();
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
