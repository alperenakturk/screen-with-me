import type { Member, RtcRequest, Signal, VoiceMode } from '@swm/shared/protocol';
import type { VoiceDown, VoiceUp } from '@swm/shared/shell';
import type { Voice } from '@swm/shared/voice';

/** İzin sekmesi açılırsa kişinin izin vermesi biraz sürebilir. */
const JOIN_TIMEOUT_MS = 120_000;

export interface ExtVoiceHooks {
  announce: (on: boolean, mic?: boolean) => void;
  signal: (to: string, data: Signal) => void;
  rpc: (id: number, request: RtcRequest) => void;
  failed: (memberId: string) => void;
  /** Durum değişti (kart yeniden çizilsin). */
  changed: () => void;
}

/**
 * Film sayfasındaki katmanda ses: mikrofon ve bağlantılar eklentinin görünmeyen sayfasında (offscreen), bu sınıf
 * sadece aracı. İzin eklentinin adına bir kez sorulur, film sayfası yenilense de ses kopmaz (yeni site örneği gelince
 * "reset" ile bağlantılar yeni üye kimliğiyle kurulur).
 */
export class ExtVoice implements Voice {
  private state = { active: false, mic: true };
  private last = new Map<string, number>();
  /** Kendi mikrofonumun seviyesi (0–1). */
  me = 0;
  private members: Member[] = [];
  private myId: string | null = null;
  private needsReset = false;
  private joining: { resolve: () => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> } | null = null;
  mode: VoiceMode = 'p2p';

  constructor(
    private readonly post: (msg: VoiceUp) => void,
    private readonly hooks: ExtVoiceHooks,
  ) {
    post({ op: 'hello' });
  }

  get active(): boolean {
    return this.state.active;
  }

  get micEnabled(): boolean {
    return this.state.mic;
  }

  join(quiet = false): Promise<void> {
    if (this.state.active) return Promise.resolve();
    if (!this.myId) return Promise.reject(new Error('voice: bağlı değil'));
    this.joining?.reject(new Error('voice: yeniden'));
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.joining = null;
        reject(new Error('voice: süre doldu'));
      }, JOIN_TIMEOUT_MS);
      this.joining = { resolve, reject, timer };
      this.post({ op: 'join', mode: this.mode, myId: this.myId!, members: this.members, ...(quiet ? { quiet } : {}) });
    });
  }

  setMic(on: boolean): void {
    if (!this.state.active) return;
    this.state.mic = on;
    this.post({ op: 'mic', on });
  }

  leave(): void {
    if (!this.state.active && !this.joining) return;
    this.state.active = false;
    this.post({ op: 'leave' });
  }

  sync(members: Member[], myId: string | null): void {
    this.members = members;
    this.myId = myId;
    if (this.needsReset && myId) {
      this.needsReset = false;
      this.post({ op: 'reset', myId, members });
      return;
    }
    if (this.state.active) this.post({ op: 'members', myId, members });
  }

  /** Oda bağlantısı yeniden kuruldu (yeni üye kimliği): seste isek bağlantılar baştan (mikrofon kalır). */
  reconnected(): void {
    if (this.state.active) this.needsReset = true;
  }

  levels(): Map<string, number> {
    return this.last;
  }

  signal(from: string, data: Signal): void {
    if (this.state.active) this.post({ op: 'signal', from, data });
  }

  rtcResult(id: number, result: Extract<VoiceUp, { op: 'rtc-result' }>['result']): void {
    this.post({ op: 'rtc-result', id, result });
  }

  /** Eklentinin ses sayfasından gelen. */
  receive(msg: VoiceDown): void {
    switch (msg.op) {
      case 'state': {
        const wasActive = this.state.active;
        this.state = { active: msg.active, mic: msg.mic };
        if (!msg.active) {
          this.last = new Map();
          this.me = 0;
        }
        // Yeni site örneği (film sayfası yenilendi) ve ses sürüyor: yeni kimlikle yeniden kurulsun.
        if (msg.active && !wasActive && !this.joining) {
          this.needsReset = true;
          if (this.myId) this.sync(this.members, this.myId);
        }
        if (this.joining) {
          const { resolve, reject, timer } = this.joining;
          // Katılma sürerken gelen "seste değil": sessiz yeniden katılmada izin yok (kişi "Sese katıl"a basınca izin
          // sekmesi açılır).
          this.joining = null;
          clearTimeout(timer);
          if (msg.active) resolve();
          else reject(new Error('voice: izin yok'));
        }
        this.hooks.changed();
        break;
      }
      case 'announce':
        this.hooks.announce(msg.on, msg.mic);
        break;
      case 'signal':
        this.hooks.signal(msg.to, msg.data);
        break;
      case 'rpc':
        this.hooks.rpc(msg.id, msg.request);
        break;
      case 'levels':
        this.last = new Map(msg.levels);
        this.me = msg.me;
        break;
      case 'failed':
        this.hooks.failed(msg.memberId);
        break;
      case 'error': {
        const joining = this.joining;
        this.joining = null;
        if (joining) {
          clearTimeout(joining.timer);
          joining.reject(new DOMException('voice', msg.code === 'denied' ? 'NotAllowedError' : 'AbortError'));
        }
        this.hooks.changed();
        break;
      }
    }
  }
}
