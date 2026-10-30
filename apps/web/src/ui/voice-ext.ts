import type { Member, RtcRequest, Signal, VoiceMode } from '@swm/shared/protocol';
import type { DeviceInfo, DevicePicks, VoiceDown, VoiceUp } from '@swm/shared/shell';
import type { Voice } from '@swm/shared/voice';

/** İzin sekmesi açılırsa kişinin izin vermesi biraz sürebilir. */
const JOIN_TIMEOUT_MS = 120_000;

export interface ExtVoiceHooks {
  announce: (on: boolean, mic?: boolean, cam?: boolean) => void;
  signal: (to: string, data: Signal) => void;
  rpc: (id: number, request: RtcRequest) => void;
  failed: (memberId: string) => void;
  /** Durum değişti (kart yeniden çizilsin). */
  changed: () => void;
  /** Birinin kamera görüntüsü geldi/gitti (köprüden). */
  onRemoteVideo: (memberId: string, stream: MediaStream | null) => void;
  /** The devices I chose (by name), sent before every join. */
  picks?: () => DevicePicks;
}

/**
 * Film sayfasındaki katmanda ses: mikrofon ve bağlantılar eklentinin görünmeyen sayfasında (offscreen), bu sınıf
 * sadece aracı. İzin eklentinin adına bir kez sorulur, film sayfası yenilense de ses kopmaz (yeni site örneği gelince
 * "reset" ile bağlantılar yeni üye kimliğiyle kurulur).
 *
 * Kameralar da orada; görüntüler buraya aynı bilgisayar içinde kalan bir WebRTC köprüsüyle gelir (ses sayfası teklif
 * yapar, burası sadece alır). Eski eklentide köprü yok: `setCam` ancak eklenti `caps.cam` deyince var.
 */
export class ExtVoice implements Voice {
  private state = { active: false, mic: true, cam: false };
  private last = new Map<string, number>();
  /** Kendi mikrofonumun seviyesi (0–1). */
  me = 0;
  private members: Member[] = [];
  private myId: string | null = null;
  private needsReset = false;
  private joining: { resolve: () => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> } | null = null;
  mode: VoiceMode = 'p2p';
  /** Görüntü köprüsü ve köprüden gelenler (`me`: kendi önizlemem). */
  private loop: RTCPeerConnection | null = null;
  private loopPending: RTCIceCandidateInit[] = [];
  private loopVideos = new Map<string, MediaStream>();
  private camming: { on: boolean; resolve: () => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> } | null = null;
  /** Eklenti kamerayı destekliyorsa var (yoksa kamera düğmesi gizli). */
  setCam?: (on: boolean) => Promise<void>;
  /** Waiting for the extension's device list. */
  private listing: { resolve: (list: DeviceInfo[] | null) => void; timer: ReturnType<typeof setTimeout> } | null = null;

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

  get camEnabled(): boolean {
    return this.state.cam;
  }

  get camera(): MediaStream | null {
    return this.state.cam ? (this.loopVideos.get('me') ?? null) : null;
  }

  /** Eklenti kamerayı destekliyor (caps). */
  enableCam(): void {
    this.setCam ??= (on) => this.toggleCam(on);
  }

  private toggleCam(on: boolean): Promise<void> {
    if (!this.state.active || on === this.state.cam) return Promise.resolve();
    this.camming?.reject(new Error('voice: yeniden'));
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.camming = null;
        reject(new Error('voice: süre doldu'));
      }, JOIN_TIMEOUT_MS);
      this.camming = { on, resolve, reject, timer };
      this.post({ op: 'cam', on });
    });
  }

  /**
   * The microphone / camera / speaker I chose (by name), for the extension's voice page (0.9.91.14, owner: "my mic is
   * quiet on the film page": it used the default device). Sent before every join and whenever I change them.
   */
  pick(devices: DevicePicks): void {
    this.post({ op: 'pick', devices });
  }

  /** The extension's list of devices (names known there); null when it doesn't answer (an old extension). */
  devices(): Promise<DeviceInfo[] | null> {
    this.listing?.resolve(null);
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.listing = null;
        resolve(null);
      }, 3000);
      this.listing = { resolve, timer };
      this.post({ op: 'devices' });
    });
  }

  join(quiet = false, mic = true): Promise<void> {
    if (this.state.active) return Promise.resolve();
    if (!this.myId) return Promise.reject(new Error('voice: bağlı değil'));
    this.joining?.reject(new Error('voice: yeniden'));
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.joining = null;
        reject(new Error('voice: süre doldu'));
      }, JOIN_TIMEOUT_MS);
      this.joining = { resolve, reject, timer };
      const picks = this.hooks.picks?.();
      if (picks) this.pick(picks);
      this.post({ op: 'join', mode: this.mode, myId: this.myId!, members: this.members, ...(quiet ? { quiet } : {}), ...(mic ? {} : { mic: false }) });
    });
  }

  /** Per-person volume for me (0–1); the voices play in the extension's offscreen page. */
  volumes(volumes: Record<string, number>): void {
    if (this.state.active) this.post({ op: 'volume', volumes });
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
        this.state = { active: msg.active, mic: msg.mic, cam: msg.cam === true };
        if (this.camming && (this.state.cam === this.camming.on || !msg.active)) {
          const { resolve, timer } = this.camming;
          this.camming = null;
          clearTimeout(timer);
          resolve();
        }
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
        this.hooks.announce(msg.on, msg.mic, msg.cam);
        break;
      case 'cam-error': {
        const camming = this.camming;
        this.camming = null;
        if (camming) {
          clearTimeout(camming.timer);
          camming.reject(new Error('voice: kamera'));
        }
        this.hooks.changed();
        break;
      }
      case 'loop':
        void this.loopSignal(msg).catch(() => {});
        break;
      case 'devices': {
        const listing = this.listing;
        this.listing = null;
        if (listing) {
          clearTimeout(listing.timer);
          listing.resolve(msg.list);
        }
        break;
      }
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

  /** Köprüden gelen: yeni teklif (kameralar değişti) ya da ağ adayı. */
  private async loopSignal(msg: Extract<VoiceDown, { op: 'loop' }>): Promise<void> {
    const data = msg.data;
    if (!data || 'sdp' in data) {
      this.loop?.close();
      this.loop = null;
      this.loopPending = [];
      const cams = new Map(msg.cams ?? []);
      // Artık gelmeyecek görüntüler bırakılır (yenileri ontrack ile gelir).
      const keep = new Set(cams.values());
      for (const key of [...this.loopVideos.keys()]) {
        if (keep.has(key)) continue;
        this.loopVideos.delete(key);
        if (key !== 'me') this.hooks.onRemoteVideo(key, null);
      }
      if (!data || data.sdp.type !== 'offer') {
        this.hooks.changed();
        return;
      }
      const pc = new RTCPeerConnection();
      this.loop = pc;
      pc.ontrack = (event) => {
        if (this.loop !== pc) return;
        const key = event.transceiver.mid ? cams.get(event.transceiver.mid) : undefined;
        if (!key) return;
        const stream = new MediaStream([event.track]);
        this.loopVideos.set(key, stream);
        if (key === 'me') this.hooks.changed();
        else this.hooks.onRemoteVideo(key, stream);
      };
      pc.onicecandidate = (event) => {
        if (!event.candidate || this.loop !== pc) return;
        const { candidate, sdpMid, sdpMLineIndex } = event.candidate;
        this.post({ op: 'loop', data: { candidate: { candidate, sdpMid, sdpMLineIndex } } });
      };
      await pc.setRemoteDescription(data.sdp);
      await pc.setLocalDescription(await pc.createAnswer());
      if (this.loop !== pc) return;
      this.post({ op: 'loop', data: { sdp: { type: 'answer', sdp: pc.localDescription!.sdp } } });
      for (const candidate of this.loopPending.splice(0)) await pc.addIceCandidate(candidate).catch(() => {});
      return;
    }
    if (this.loop?.remoteDescription) await this.loop.addIceCandidate(data.candidate).catch(() => {});
    else this.loopPending.push(data.candidate);
  }
}
