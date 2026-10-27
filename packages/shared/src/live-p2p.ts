// Yayın (ekran paylaşımı ya da kamera), eşler arası ve tek yönlü: yayıncı izlemeyi seçen her kişiye ayrı bir WebRTC
// bağlantısıyla görüntüsünü (ve paylaşılan sekmenin sesini) yollar; izleyiciler sadece alır, hiçbir şey göndermez
// (izlemek kamera/mikrofon izni istemez). Sunucu sadece bağlantı mesajlarını, yayıncı ile izleyicisi arasında taşır.
// Kart/hesap yok; bedeli: en fazla birkaç izleyici (her biri yayıncının yükleme hızından pay alır).
//
// Teklifi hep yayıncı yapar (izleyici yeni gelince ya da yayın yeniden başlayınca).

import type { LiveKind, Member, Signal } from './protocol.ts';

const ICE: RTCIceServer[] = [{ urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] }];

/** 720p ekran ~2,5 Mbit/s (yazı net kalsın), kamera ~1,2 Mbit/s. Yükleme yetmezse WebRTC kendisi düşürür. */
const MAX_BITRATE: Record<LiveKind, number> = { screen: 2_500_000, camera: 1_200_000 };

export const SCREEN_CONSTRAINTS: DisplayMediaStreamOptions = {
  video: { width: { max: 1280 }, height: { max: 720 }, frameRate: { ideal: 30, max: 30 } },
  // Sekme paylaşılırsa sesi de gelsin (Chrome kutusu çıkarır; pencere/ekranda çoğu zaman yok).
  audio: true,
};
export const LIVE_CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 30 } },
  audio: false,
};

export interface LiveOptions {
  signal: (to: string, data: Signal) => void;
  /** Odaya "yayındayım" / "izliyorum" bildir. */
  announce: (on: boolean, kind?: LiveKind) => void;
  watch: (on: boolean) => void;
  /** İzlediğim yayının akışı geldi (ya da gitti: null). */
  onStream: (stream: MediaStream | null) => void;
  /** Yayın kendiliğinden bitti (kişi tarayıcının "Paylaşımı durdur"una bastı). */
  onEnded?: () => void;
  /** Biriyle bağlantı kurulamadı. */
  onFailed?: (memberId: string) => void;
  /** Testte sahte akış verilebilir. */
  capture?: (kind: LiveKind) => Promise<MediaStream>;
}

interface Peer {
  pc: RTCPeerConnection;
  pending: RTCIceCandidateInit[];
  failed: boolean;
}

export class LiveP2p {
  /** Yayıncıysam: yayınladığım akış ve türü. */
  private stream: MediaStream | null = null;
  private kind: LiveKind | null = null;
  /** Yayıncıysam izleyicilerle, izleyiciysem yayıncıyla bağlantılar. */
  private readonly peers = new Map<string, Peer>();
  private watching = false;

  constructor(private readonly options: LiveOptions) {}

  get broadcasting(): LiveKind | null {
    return this.kind;
  }

  get preview(): MediaStream | null {
    return this.stream;
  }

  get isWatching(): boolean {
    return this.watching;
  }

  /** Yayını başlat: ekran seçme penceresi (ya da kamera) açılır; vazgeçilirse hata fırlatır. */
  async start(kind: LiveKind): Promise<void> {
    this.stop();
    this.stopWatching();
    const stream = await (this.options.capture?.(kind) ??
      (kind === 'screen' ? navigator.mediaDevices.getDisplayMedia(SCREEN_CONSTRAINTS) : navigator.mediaDevices.getUserMedia(LIVE_CAMERA_CONSTRAINTS)));
    const video = stream.getVideoTracks()[0];
    // Yazı/slayt net kalsın (ekran), hareket akıcı kalsın (kamera).
    if (video) video.contentHint = kind === 'screen' ? 'detail' : 'motion';
    // Tarayıcının "Paylaşımı durdur" düğmesi: yayın biter.
    video?.addEventListener('ended', () => {
      if (this.stream !== stream) return;
      this.stop();
      this.options.onEnded?.();
    });
    this.stream = stream;
    this.kind = kind;
    this.options.announce(true, kind);
  }

  stop(): void {
    if (!this.stream) return;
    for (const track of this.stream.getTracks()) track.stop();
    this.stream = null;
    this.kind = null;
    for (const memberId of [...this.peers.keys()]) this.close(memberId);
    this.options.announce(false);
  }

  watch(): void {
    if (this.watching || this.stream) return;
    this.watching = true;
    this.options.watch(true);
  }

  stopWatching(): void {
    if (!this.watching) return;
    this.watching = false;
    for (const memberId of [...this.peers.keys()]) this.close(memberId);
    this.options.onStream(null);
    this.options.watch(false);
  }

  /** Odadakiler değişti: yayıncıysam yeni izleyicilere teklif yap, gidenleri bırak; izleyiciysem yayın bitti mi bak. */
  sync(members: Member[], myId: string | null): void {
    if (this.stream && myId) {
      const viewers = new Set(members.filter((m) => m.watching && m.id !== myId).map((m) => m.id));
      for (const memberId of [...this.peers.keys()]) if (!viewers.has(memberId)) this.close(memberId);
      for (const memberId of viewers) if (!this.peers.has(memberId)) void this.offer(memberId);
      return;
    }
    if (this.watching) {
      const streamer = members.find((m) => m.live && m.id !== myId);
      const me = members.find((m) => m.id === myId);
      // Yayın bitti ya da sunucu izleyiciliğimi kaldırdı.
      if (!streamer || (me && !me.watching)) {
        this.watching = false;
        for (const memberId of [...this.peers.keys()]) this.close(memberId);
        this.options.onStream(null);
        return;
      }
      for (const memberId of [...this.peers.keys()]) if (memberId !== streamer.id) this.close(memberId);
    }
  }

  async receive(from: string, data: Signal): Promise<void> {
    if ('sdp' in data) {
      if (data.sdp.type === 'offer') {
        // Yayıncının teklifi: sadece alırım.
        if (!this.watching) return;
        this.close(from);
        const peer = this.peer(from);
        await peer.pc.setRemoteDescription(data.sdp);
        for (const t of peer.pc.getTransceivers()) t.direction = 'recvonly';
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

  private async offer(memberId: string): Promise<void> {
    const stream = this.stream;
    if (!stream || !this.kind) return;
    const peer = this.peer(memberId);
    for (const track of stream.getTracks()) {
      const transceiver = peer.pc.addTransceiver(track, { direction: 'sendonly', streams: [stream] });
      if (track.kind !== 'video') continue;
      try {
        const params = transceiver.sender.getParameters();
        if (params.encodings?.length) {
          params.encodings[0]!.maxBitrate = MAX_BITRATE[this.kind];
          await transceiver.sender.setParameters(params);
        }
      } catch {
        // Sınır konamadıysa tarayıcının kendi ayarı.
      }
    }
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
      if (this.peers.get(memberId) !== peer || !this.watching) return;
      this.options.onStream(event.streams[0] ?? new MediaStream([event.track]));
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
  }
}
