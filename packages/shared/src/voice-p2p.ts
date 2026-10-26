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
  announce: (on: boolean, mic?: boolean) => void;
  onRemote: (memberId: string, stream: MediaStream | null) => void;
  /** Biriyle bağlantı kurulamadı (sıkı ağ: okul/şirket, bazı mobil hatlar). */
  onFailed?: (memberId: string) => void;
  getMic?: () => Promise<MediaStream>;
}

const ICE: RTCIceServer[] = [{ urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] }];

interface Peer {
  pc: RTCPeerConnection;
  /** Karşının teklifi/cevabı gelmeden gelen ağ adayları (sırayla eklenir). */
  pending: RTCIceCandidateInit[];
  failed: boolean;
}

export class P2pVoice implements Voice {
  private mic: MediaStream | null = null;
  private readonly peers = new Map<string, Peer>();
  private myId: string | null = null;
  private joined = false;
  private micOn = true;

  constructor(private readonly options: P2pVoiceOptions) {}

  get active(): boolean {
    return this.joined;
  }

  get micEnabled(): boolean {
    return this.micOn;
  }

  async join(): Promise<void> {
    if (this.joined) return;
    this.mic = await (this.options.getMic?.() ??
      navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false }));
    this.joined = true;
    this.micOn = true;
    this.options.announce(true, true);
  }

  setMic(on: boolean): void {
    if (!this.joined) return;
    this.micOn = on;
    for (const track of this.mic?.getAudioTracks() ?? []) track.enabled = on;
    this.options.announce(true, on);
  }

  leave(): void {
    if (!this.joined && !this.peers.size) return;
    this.joined = false;
    for (const track of this.mic?.getTracks() ?? []) track.stop();
    this.mic = null;
    for (const memberId of [...this.peers.keys()]) this.close(memberId);
    this.options.announce(false);
  }

  /** Seste olanlarla bağlantı kur (kimliği büyük olana ben teklif yaparım), gidenlerle bağlantıyı kapat. */
  sync(members: Member[], myId: string | null): void {
    this.myId = myId;
    if (!this.joined || !myId) return;
    const inVoice = new Set(members.filter((m) => m.voice && m.id !== myId).map((m) => m.id));
    for (const memberId of [...this.peers.keys()]) if (!inVoice.has(memberId)) this.close(memberId);
    for (const memberId of inVoice) {
      if (!this.peers.has(memberId) && myId < memberId) void this.call(memberId);
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
        const transceiver = peer.pc.getTransceivers()[0];
        const track = this.mic?.getAudioTracks()[0];
        if (transceiver && track) {
          await transceiver.sender.replaceTrack(track);
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
      const receiver = peer.pc.getReceivers()[0];
      out.set(memberId, receiver?.getSynchronizationSources?.()[0]?.audioLevel ?? 0);
    }
    return out;
  }

  private async call(memberId: string): Promise<void> {
    const peer = this.peer(memberId);
    const track = this.mic?.getAudioTracks()[0];
    if (track) peer.pc.addTransceiver(track, { direction: 'sendrecv' });
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
      if (this.peers.get(memberId) === peer) this.options.onRemote(memberId, event.streams[0] ?? new MediaStream([event.track]));
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState !== 'failed' || peer.failed || this.peers.get(memberId) !== peer) return;
      peer.failed = true;
      this.options.onFailed?.(memberId);
    };
    return peer;
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
  }
}
