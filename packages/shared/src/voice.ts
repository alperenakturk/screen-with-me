// Sesli sohbetin tarayıcı tarafı: mikrofonu Cloudflare Realtime'a (SFU) yayınlar, odadaki diğerlerinin sesini
// çeker. Herkes kendi sesini bir kez yollar, SFU dağıtır (eşler arası değil: IP'ler birbirine görünmez). Bağlantı
// işleri (oturum, yayın, çekme) oda sunucusu üzerinden gider (`rtc`); uygulama anahtarı sunucuda kalır.
//
// Tek RTCPeerConnection: kendi akışım gönderilir, her dinlenen kişi için bir alıcı eklenir. Pazarlıklar (SDP)
// sırayla yapılır; aynı anda iki pazarlık bağlantıyı bozar.

import type { Member, RtcRequest, RtcResult } from './protocol.ts';

/** Sesli sohbetin ortak yüzü: site hangi taşıma yolu (eşler arası / Cloudflare) kullanılırsa kullanılsın aynı kartı çizer. */
export interface Voice {
  readonly active: boolean;
  readonly micEnabled: boolean;
  /** `mic`: start with the microphone on (default) or muted — a reconnect keeps the person's choice. */
  join(mic?: boolean): Promise<void>;
  setMic(on: boolean): void;
  leave(): void;
  sync(members: Member[], myId: string | null): void;
  levels(): Map<string, number>;
  /** Görüntülü sohbet (sadece eşler arası yolda): kamera açık mı, aç/kapa, kendi görüntüm (önizleme). */
  readonly camEnabled?: boolean;
  setCam?(on: boolean): Promise<void>;
  readonly camera?: MediaStream | null;
  /** Kendi mikrofonum (seviye göstergesi için; olmayan yolda yok). */
  readonly microphone?: MediaStream | null;
  /** Another microphone while in voice, without leaving (peer-to-peer only; 0.9.90.6 device choice). */
  switchMic?(stream: MediaStream): Promise<void>;
}

export interface VoiceOptions {
  /** Sunucuya bağlantı işi gönder, cevabını bekle. */
  rpc: (request: RtcRequest) => Promise<RtcResult>;
  /** Odaya seste olduğumu / mikrofonumu / akışımın adını bildir. */
  announce: (on: boolean, mic?: boolean) => void;
  /** Bir üyenin sesi geldi (ya da gitti: null). Site bunu bir <audio> ile çalar. */
  onRemote: (memberId: string, stream: MediaStream | null) => void;
  /** Tarayıcının mikrofonunu alma işi (testte sahte verilebilir). */
  getMic?: () => Promise<MediaStream>;
}

const ICE: RTCIceServer[] = [{ urls: 'stun:stun.cloudflare.com:3478' }];

/** Cloudflare Realtime (SFU) ile ses: sunucuda anahtar varsa (`voiceMode: 'sfu'`). */
export class VoiceClient implements Voice {
  private pc: RTCPeerConnection | null = null;
  private mic: MediaStream | null = null;

  get microphone(): MediaStream | null {
    return this.mic;
  }
  /** Dinlediğim kişiler: üye kimliği → { mid, akışın adı }. */
  private readonly pulled = new Map<string, { mid: string; track: string }>();
  private readonly byMid = new Map<string, string>();
  private queue: Promise<unknown> = Promise.resolve();
  private joined = false;
  private micOn = true;

  constructor(private readonly options: VoiceOptions) {}

  get active(): boolean {
    return this.joined;
  }

  get micEnabled(): boolean {
    return this.micOn;
  }

  /** Sese katıl: mikrofonu al, odaya bildir, Cloudflare oturumu aç ve sesimi yayınla. */
  async join(mic = true): Promise<void> {
    if (this.joined) return;
    // Önce mikrofon: izin verilmezse odaya hiç "seste" görünmeyiz.
    this.mic = await (this.options.getMic?.() ??
      navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false }));
    this.joined = true;
    this.micOn = mic;
    for (const track of this.mic.getAudioTracks()) track.enabled = mic;
    this.options.announce(true, mic);
    const pc = new RTCPeerConnection({ iceServers: ICE, bundlePolicy: 'max-bundle' });
    this.pc = pc;
    pc.ontrack = (event) => {
      const memberId = event.transceiver.mid ? this.byMid.get(event.transceiver.mid) : undefined;
      if (memberId) this.options.onRemote(memberId, new MediaStream([event.track]));
    };
    try {
      await this.serial(async () => {
        await this.ok(this.options.rpc({ op: 'session' }));
        const track = this.mic!.getAudioTracks()[0]!;
        const transceiver = pc.addTransceiver(track, { direction: 'sendonly' });
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        const name = `mic-${Math.random().toString(36).slice(2, 10)}`;
        const answer = await this.ok(this.options.rpc({ op: 'publish', sdp: pc.localDescription!.sdp, mid: transceiver.mid ?? '0', track: name }));
        if (!answer.sdp) throw new Error('voice: cevap yok');
        await pc.setRemoteDescription({ type: 'answer', sdp: answer.sdp });
      });
    } catch (error) {
      this.leave();
      throw error;
    }
  }

  /** Mikrofonu aç/kapat (bağlantı kalır, diğerlerini duymaya devam ederim). */
  setMic(on: boolean): void {
    if (!this.joined) return;
    this.micOn = on;
    for (const track of this.mic?.getAudioTracks() ?? []) track.enabled = on;
    this.options.announce(true, on);
  }

  /** Sesten ayrıl: her şeyi kapat, mikrofon ışığı sönsün. */
  leave(): void {
    if (!this.joined && !this.pc) return;
    this.joined = false;
    for (const track of this.mic?.getTracks() ?? []) track.stop();
    this.mic = null;
    this.pc?.close();
    this.pc = null;
    for (const memberId of this.pulled.keys()) this.options.onRemote(memberId, null);
    this.pulled.clear();
    this.byMid.clear();
    this.queue = Promise.resolve();
    this.options.announce(false);
  }

  /** Odadaki üyeler değişti: seste olan ve yayını hazır olanları dinle, gidenleri bırak. */
  sync(members: Member[], myId: string | null): void {
    if (!this.joined || !this.pc) return;
    const live = new Map<string, string>();
    for (const member of members) if (member.id !== myId && member.voice?.track) live.set(member.id, member.voice.track);
    for (const [memberId, info] of this.pulled) {
      // Gitti ya da yeniden katılıp yeni akış açtı: eskisini bırak.
      if (live.get(memberId) !== info.track) this.drop(memberId);
    }
    for (const [memberId, track] of live) if (!this.pulled.has(memberId)) this.listen(memberId, track);
  }

  /** Dinlediğim kişilerin anlık ses seviyesi (0–1): kim konuşuyor göstergesi için. */
  levels(): Map<string, number> {
    const out = new Map<string, number>();
    for (const receiver of this.pc?.getReceivers() ?? []) {
      const mid = this.pc?.getTransceivers().find((t) => t.receiver === receiver)?.mid;
      const memberId = mid ? this.byMid.get(mid) : undefined;
      const level = receiver.getSynchronizationSources?.()[0]?.audioLevel ?? 0;
      if (memberId) out.set(memberId, level);
    }
    return out;
  }

  private listen(memberId: string, track: string): void {
    // Yer tutucu: aynı kişiyi iki kez istemeyelim (cevap gelene kadar).
    this.pulled.set(memberId, { mid: '', track });
    void this.serial(async () => {
      const pc = this.pc;
      if (!pc || this.pulled.get(memberId)?.track !== track) return;
      const result = await this.options.rpc({ op: 'pull', from: memberId });
      if (!result.ok || !result.mid) {
        this.pulled.delete(memberId);
        return;
      }
      this.pulled.set(memberId, { mid: result.mid, track });
      this.byMid.set(result.mid, memberId);
      if (result.renegotiate && result.sdp) {
        await pc.setRemoteDescription({ type: 'offer', sdp: result.sdp });
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await this.ok(this.options.rpc({ op: 'renegotiate', sdp: pc.localDescription!.sdp }));
      }
    }).catch(() => this.pulled.delete(memberId));
  }

  private drop(memberId: string): void {
    const info = this.pulled.get(memberId);
    this.pulled.delete(memberId);
    this.options.onRemote(memberId, null);
    if (!info?.mid) return;
    this.byMid.delete(info.mid);
    const mid = info.mid;
    void this.serial(() => this.options.rpc({ op: 'close', mids: [mid] })).catch(() => {});
  }

  private serial<T>(work: () => Promise<T>): Promise<T> {
    const next = this.queue.then(work, work);
    this.queue = next.catch(() => {});
    return next;
  }

  private async ok(pending: Promise<RtcResult>): Promise<Extract<RtcResult, { ok: true }>> {
    const result = await pending;
    if (!result.ok) throw new Error(`voice: ${result.error}`);
    return result;
  }
}
