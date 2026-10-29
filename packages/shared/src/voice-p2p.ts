// Eşler arası sesli sohbet: her kişi seste olan diğer herkesle ayrı bir WebRTC bağlantısı kurar, sesini doğrudan
// yollar (sunucu sesi hiç görmez; sadece bağlantı kurma mesajlarını, ikisi de seste ise aktarır). Kart/hesap
// gerektirmez; bedeli: en fazla birkaç kişi (herkes herkese ayrı akış yollar) ve seste olanlar birbirinin genel IP
// adresini teknik olarak görebilir. Ses WebRTC'de her zaman şifrelidir (DTLS-SRTP).
//
// Kim teklif yapar: üye kimliği küçük olan. Böylece iki taraf aynı anda teklif yapıp birbirini kilitlemez.

import type { Member, Signal } from './protocol.ts';
import type { Voice } from './voice.ts';

export interface P2pVoiceOptions {
  /** Bir üyeye bağlantı mesajı yolla (sunucu iletir). */
  signal: (to: string, data: Signal) => void;
  announce: (on: boolean, mic?: boolean, cam?: boolean) => void;
  onRemote: (memberId: string, stream: MediaStream | null) => void;
  /** Bir üyenin kamera görüntüsü geldi (ya da gitti: null). Görünüp görünmeyeceğine üyenin `voice.cam`'i karar verir. */
  onRemoteVideo?: (memberId: string, stream: MediaStream | null) => void;
  /** Kamerayı alma işi (testte sahte verilebilir). */
  getCam?: () => Promise<MediaStream>;
  /** Biriyle bağlantı kurulamadı (sıkı ağ: okul/şirket, bazı mobil hatlar). */
  onFailed?: (memberId: string) => void;
  getMic?: () => Promise<MediaStream>;
}

// Cloudflare only: every STUN server learns the IP of each person in voice (security review 1, W3).
const ICE: RTCIceServer[] = [{ urls: 'stun:stun.cloudflare.com:3478' }];

/**
 * Kamera: küçük ve hafif (herkes herkese ayrı kopya yollar; 5 kişiye ~1,5 Mbit/s yükleme). Video kanalı bağlantı
 * kurulurken baştan açılır (görüntü yoksa boş): kamera açılıp kapanınca yeniden pazarlık gerekmez.
 */
export const CAM_CONSTRAINTS: MediaTrackConstraints = { width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 15, max: 15 } };
const CAM_MAX_BITRATE = 280_000;
/** Waits before rebuilding a lost connection (then gives up and says so). */
const RETRY_DELAYS_MS = [2000, 5000, 10000];
const DISCONNECTED_GRACE_MS = 5000;

interface Peer {
  pc: RTCPeerConnection;
  /** Karşının teklifi/cevabı gelmeden gelen ağ adayları (sırayla eklenir). */
  pending: RTCIceCandidateInit[];
  failed: boolean;
}

export class P2pVoice implements Voice {
  private mic: MediaStream | null = null;
  private cam: MediaStream | null = null;
  private readonly peers = new Map<string, Peer>();
  private myId: string | null = null;
  private joined = false;
  private micOn = true;
  /** Last member list (a retry re-checks who is still in voice). */
  private members: Member[] = [];
  /** Failed connections are rebuilt a few times before giving up (network hiccup, Wi-Fi switch). */
  private readonly attempts = new Map<string, number>();
  private readonly retries = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(private readonly options: P2pVoiceOptions) {}

  get active(): boolean {
    return this.joined;
  }

  get micEnabled(): boolean {
    return this.micOn;
  }

  get camEnabled(): boolean {
    return this.cam !== null;
  }

  get camera(): MediaStream | null {
    return this.cam;
  }

  /** Kendi mikrofonum (seviye göstergesi için). */
  get microphone(): MediaStream | null {
    return this.mic;
  }

  /** Kamerayı aç/kapa: bağlantılar kalır, sadece video kanalının görüntüsü değişir. */
  async setCam(on: boolean): Promise<void> {
    if (!this.joined || on === this.camEnabled) return;
    if (on) {
      this.cam = await (this.options.getCam?.() ?? navigator.mediaDevices.getUserMedia({ video: CAM_CONSTRAINTS, audio: false }));
      // Kişi kamera açılırken sesten ayrıldıysa.
      if (!this.joined) {
        for (const track of this.cam.getTracks()) track.stop();
        this.cam = null;
        return;
      }
    } else {
      for (const track of this.cam?.getTracks() ?? []) track.stop();
      this.cam = null;
    }
    const track = this.cam?.getVideoTracks()[0] ?? null;
    for (const peer of this.peers.values()) await this.sendVideo(peer.pc, track);
    this.options.announce(true, this.micOn, this.camEnabled);
  }

  private async sendVideo(pc: RTCPeerConnection, track: MediaStreamTrack | null): Promise<void> {
    const transceiver = pc.getTransceivers().find((t) => t.receiver.track.kind === 'video');
    if (!transceiver) return;
    await transceiver.sender.replaceTrack(track).catch(() => {});
    if (!track) return;
    try {
      const params = transceiver.sender.getParameters();
      if (params.encodings?.length) {
        params.encodings[0]!.maxBitrate = CAM_MAX_BITRATE;
        params.encodings[0]!.maxFramerate = 15;
        await transceiver.sender.setParameters(params);
      }
    } catch {
      // Sınır konamadıysa tarayıcının kendi ayarı.
    }
  }

  async join(mic = true): Promise<void> {
    if (this.joined) return;
    this.mic = await (this.options.getMic?.() ??
      navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false }));
    this.joined = true;
    // A muted person stays muted when voice is rebuilt after a reconnect (the track is disabled before anyone hears it).
    this.micOn = mic;
    for (const track of this.mic.getAudioTracks()) track.enabled = mic;
    this.options.announce(true, mic);
  }

  setMic(on: boolean): void {
    if (!this.joined) return;
    this.micOn = on;
    for (const track of this.mic?.getAudioTracks() ?? []) track.enabled = on;
    this.options.announce(true, on, this.camEnabled);
  }

  /** Another microphone while in voice: every connection gets the new track in place (no one sees me leave). */
  async switchMic(stream: MediaStream): Promise<void> {
    const track = stream.getAudioTracks()[0];
    if (!this.joined || !track) {
      for (const t of stream.getTracks()) t.stop();
      return;
    }
    track.enabled = this.micOn;
    const old = this.mic;
    this.mic = stream;
    for (const peer of this.peers.values()) {
      const transceiver = peer.pc.getTransceivers().find((t) => t.receiver.track.kind === 'audio');
      await transceiver?.sender.replaceTrack(track).catch(() => {});
    }
    for (const t of old?.getTracks() ?? []) t.stop();
  }

  leave(): void {
    if (!this.joined && !this.peers.size) return;
    this.joined = false;
    for (const track of [...(this.mic?.getTracks() ?? []), ...(this.cam?.getTracks() ?? [])]) track.stop();
    this.mic = null;
    this.cam = null;
    for (const memberId of [...this.peers.keys()]) this.close(memberId);
    for (const timer of this.retries.values()) clearTimeout(timer);
    this.retries.clear();
    this.attempts.clear();
    this.options.announce(false);
  }

  /** Seste olanlarla bağlantı kur (kimliği büyük olana ben teklif yaparım), gidenlerle bağlantıyı kapat. */
  sync(members: Member[], myId: string | null): void {
    this.myId = myId;
    this.members = members;
    if (!this.joined || !myId) return;
    const inVoice = new Set(members.filter((m) => m.voice && m.id !== myId).map((m) => m.id));
    for (const memberId of [...this.peers.keys()]) if (!inVoice.has(memberId)) this.close(memberId);
    for (const memberId of [...this.retries.keys()]) {
      if (inVoice.has(memberId)) continue;
      clearTimeout(this.retries.get(memberId));
      this.retries.delete(memberId);
      this.attempts.delete(memberId);
    }
    for (const memberId of inVoice) {
      if (!this.peers.has(memberId) && !this.retries.has(memberId) && myId < memberId) void this.call(memberId);
    }
  }

  /** Sunucudan gelen bağlantı mesajı. */
  async receive(from: string, data: Signal): Promise<void> {
    if (!this.joined) return;
    if ('sdp' in data) {
      if (data.sdp.type === 'offer') {
        // Karşı taraf teklif yaptı (kimliği benden küçük): bağlantıyı kur, mikrofonumu ekle, cevapla.
        this.close(from);
        const peer = this.peer(from);
        await peer.pc.setRemoteDescription(data.sdp);
        // Teklifteki kanallar: ses (mikrofonum) ve varsa görüntü (kameram ya da boş; eski sürüm teklifinde görüntü yok).
        for (const transceiver of peer.pc.getTransceivers()) {
          const kind = transceiver.receiver.track.kind;
          if (kind === 'audio') {
            const track = this.mic?.getAudioTracks()[0];
            if (track) await transceiver.sender.replaceTrack(track);
          } else if (kind === 'video') {
            await this.sendVideo(peer.pc, this.cam?.getVideoTracks()[0] ?? null);
          }
          transceiver.direction = 'sendrecv';
        }
        await peer.pc.setLocalDescription(await peer.pc.createAnswer());
        this.options.signal(from, { sdp: { type: 'answer', sdp: peer.pc.localDescription!.sdp } });
        await this.flush(peer);
      } else {
        const peer = this.peers.get(from);
        if (!peer || peer.pc.signalingState !== 'have-local-offer') return;
        await peer.pc.setRemoteDescription(data.sdp);
        await this.flush(peer);
      }
      return;
    }
    const peer = this.peers.get(from);
    if (!peer) return;
    if (peer.pc.remoteDescription) await peer.pc.addIceCandidate(data.candidate).catch(() => {});
    else peer.pending.push(data.candidate);
  }

  levels(): Map<string, number> {
    const out = new Map<string, number>();
    for (const [memberId, peer] of this.peers) {
      const receiver = peer.pc.getReceivers().find((r) => r.track.kind === 'audio');
      out.set(memberId, receiver?.getSynchronizationSources?.()[0]?.audioLevel ?? 0);
    }
    return out;
  }

  private async call(memberId: string): Promise<void> {
    const peer = this.peer(memberId);
    const track = this.mic?.getAudioTracks()[0];
    if (track) peer.pc.addTransceiver(track, { direction: 'sendrecv' });
    // Görüntü kanalı hep açılır (kamera kapalıyken boş): sonradan açınca yeniden pazarlık gerekmez.
    const cam = this.cam?.getVideoTracks()[0];
    peer.pc.addTransceiver(cam ?? 'video', { direction: 'sendrecv' });
    if (cam) void this.sendVideo(peer.pc, cam);
    await peer.pc.setLocalDescription(await peer.pc.createOffer());
    this.options.signal(memberId, { sdp: { type: 'offer', sdp: peer.pc.localDescription!.sdp } });
  }

  private peer(memberId: string): Peer {
    const pc = new RTCPeerConnection({ iceServers: ICE });
    const peer: Peer = { pc, pending: [], failed: false };
    this.peers.set(memberId, peer);
    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      const { candidate, sdpMid, sdpMLineIndex } = event.candidate;
      this.options.signal(memberId, { candidate: { candidate, sdpMid, sdpMLineIndex } });
    };
    pc.ontrack = (event) => {
      if (this.peers.get(memberId) !== peer) return;
      if (event.track.kind === 'video') this.options.onRemoteVideo?.(memberId, new MediaStream([event.track]));
      else this.options.onRemote(memberId, new MediaStream([event.track]));
    };
    let lost: ReturnType<typeof setTimeout> | null = null;
    pc.onconnectionstatechange = () => {
      if (this.peers.get(memberId) !== peer) return;
      const state = pc.connectionState;
      if (state === 'connected') {
        this.attempts.delete(memberId);
        if (lost) clearTimeout(lost);
        lost = null;
      } else if (state === 'disconnected' && !lost) {
        // Often recovers by itself within a few seconds; if not, rebuild it like a failed one.
        lost = setTimeout(() => {
          lost = null;
          if (this.peers.get(memberId) === peer && pc.connectionState !== 'connected') this.lostPeer(memberId, peer);
        }, DISCONNECTED_GRACE_MS);
      } else if (state === 'failed') {
        if (lost) clearTimeout(lost);
        lost = null;
        this.lostPeer(memberId, peer);
      }
    };
    return peer;
  }

  /**
   * A connection died: close it (its frozen camera tile and silent audio go away) and, if we make the offers to this
   * person, call again after a short backoff. The other side simply waits for the new offer. After the last attempt
   * the person is told that the connection can't be made (strict networks).
   */
  private lostPeer(memberId: string, peer: Peer): void {
    if (peer.failed) return;
    peer.failed = true;
    this.close(memberId);
    const attempt = (this.attempts.get(memberId) ?? 0) + 1;
    this.attempts.set(memberId, attempt);
    if (attempt > RETRY_DELAYS_MS.length) {
      this.options.onFailed?.(memberId);
      return;
    }
    this.retries.set(
      memberId,
      setTimeout(() => {
        this.retries.delete(memberId);
        if (this.joined) this.sync(this.members, this.myId);
      }, RETRY_DELAYS_MS[attempt - 1]),
    );
  }

  private async flush(peer: Peer): Promise<void> {
    for (const candidate of peer.pending.splice(0)) await peer.pc.addIceCandidate(candidate).catch(() => {});
  }

  private close(memberId: string): void {
    const peer = this.peers.get(memberId);
    if (!peer) return;
    this.peers.delete(memberId);
    peer.pc.close();
    this.options.onRemote(memberId, null);
    this.options.onRemoteVideo?.(memberId, null);
  }
}
