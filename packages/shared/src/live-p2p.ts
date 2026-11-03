// Yayın (ekran paylaşımı ya da kamera), eşler arası ve tek yönlü: yayıncı izlemeyi seçen her kişiye ayrı bir WebRTC
// bağlantısıyla görüntüsünü (ve paylaşılan sekmenin sesini) yollar; izleyiciler sadece alır, hiçbir şey göndermez
// (izlemek kamera/mikrofon izni istemez). Sunucu sadece bağlantı mesajlarını, yayıncı ile izleyicisi arasında taşır.
// Kart/hesap yok; bedeli: en fazla birkaç izleyici (her biri yayıncının yükleme hızından pay alır).
//
// Teklifi hep yayıncı yapar (izleyici yeni gelince ya da yayın yeniden başlayınca).

import type { LiveKind, Member, Signal } from './protocol.ts';
import { watchIceBlocked } from './ice-watch.ts';

// Cloudflare only: every STUN server learns the IP of each person in voice (security review 1, W3).
const ICE: RTCIceServer[] = [{ urls: 'stun:stun.cloudflare.com:3478' }];

/** 720p ekran ~2,5 Mbit/s (yazı net kalsın), kamera ~1,2 Mbit/s. Yükleme yetmezse WebRTC kendisi düşürür. */
const MAX_BITRATE: Record<LiveKind, number> = { screen: 2_500_000, camera: 1_200_000 };

/**
 * Ekran paylaşımında kalite: `text` (yazı net: sunum, kod, site; saniyede 15 kare, bant genişliği keskinliğe gider) ya da
 * `motion` (akıcı: oyun, video; 30 kare, ağ yetmezse çözünürlük düşer ama kare sayısı korunur).
 */
export type LiveQuality = 'text' | 'motion';
export const FPS: Record<LiveQuality, number> = { text: 15, motion: 30 };

export function screenConstraints(quality: LiveQuality): DisplayMediaStreamOptions {
  return {
    video: { width: { max: 1280 }, height: { max: 720 }, frameRate: { ideal: FPS[quality], max: FPS[quality] } },
    // Sekme paylaşılırsa sesi de gelsin (Chrome kutusu çıkarır; pencere/ekranda çoğu zaman yok).
    audio: true,
  };
}
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
  /** The browser gathered no network address at all (it forbids direct connections, see `ice-watch.ts`). */
  onBlocked?: () => void;
  /** Testte sahte akış verilebilir. */
  capture?: (kind: LiveKind, quality: LiveQuality) => Promise<MediaStream>;
}

interface Peer {
  pc: RTCPeerConnection;
  pending: RTCIceCandidateInit[];
  failed: boolean;
}

/**
 * After a dropped room connection (a deploy restarts the room's object, a network blip) the server gives me my member id
 * back, but for a moment the member list lacks my stream / my watching, or the streamer's: the direct connections are
 * kept this long before a missing streamer or viewer counts as gone (owner's test round 1, card R1).
 */
export const LIVE_RETURN_MS = 15000;
/** Listed again but not (yet) streaming / watching: the re-announce follows the welcome at once, so wait less. */
export const LIVE_FLAG_MS = 4000;

export class LiveP2p {
  /** Yayıncıysam: yayınladığım akış ve türü. */
  private stream: MediaStream | null = null;
  private kind: LiveKind | null = null;
  private quality: LiveQuality = 'motion';
  /** Yayıncıysam izleyicilerle, izleyiciysem yayıncıyla bağlantılar. */
  private readonly peers = new Map<string, Peer>();
  private watching = false;
  /** Members missing from the list since (see LIVE_RETURN_MS), and the timer that looks again. */
  private readonly missing = new Map<string, number>();
  private recheck: ReturnType<typeof setTimeout> | undefined;
  private lastMembers: Member[] = [];
  private lastId: string | null = null;
  private rewatchAt = 0;

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
  async start(kind: LiveKind, quality: LiveQuality = 'motion'): Promise<void> {
    this.stop();
    this.stopWatching();
    const stream = await (this.options.capture?.(kind, quality) ??
      (kind === 'screen' ? navigator.mediaDevices.getDisplayMedia(screenConstraints(quality)) : navigator.mediaDevices.getUserMedia(LIVE_CAMERA_CONSTRAINTS)));
    const video = stream.getVideoTracks()[0];
    this.quality = quality;
    // Tarayıcıya ne korunacağını söyle: yazı keskinliği (detail) ya da hareket (motion). Kamera hep hareket.
    if (video) video.contentHint = kind === 'screen' && quality === 'text' ? 'detail' : 'motion';
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

  get currentQuality(): LiveQuality {
    return this.quality;
  }

  /** Yayın sürerken kaliteyi değiştir (ekran paylaşımında): kare sayısı ve tarayıcının önceliği. */
  async setQuality(quality: LiveQuality): Promise<void> {
    this.quality = quality;
    const video = this.stream?.getVideoTracks()[0];
    if (!video || this.kind !== 'screen') return;
    video.contentHint = quality === 'text' ? 'detail' : 'motion';
    await video.applyConstraints({ frameRate: { ideal: FPS[quality], max: FPS[quality] } }).catch(() => {});
    for (const peer of this.peers.values()) {
      const sender = peer.pc.getSenders().find((s) => s.track?.kind === 'video');
      if (sender) await this.limit(sender);
    }
  }

  /**
   * The room connection came back with the same member id: tell the server again that I stream / watch. The direct
   * connections were never touched, so the picture keeps flowing.
   */
  resume(): void {
    if (this.stream && this.kind) this.options.announce(true, this.kind);
    else if (this.watching) this.options.watch(true);
  }

  /** True while `memberId` has been missing for less than `ms` (then its connection is kept). */
  private stillComing(memberId: string, ms: number, now = Date.now()): boolean {
    const since = this.missing.get(memberId) ?? now;
    this.missing.set(memberId, since);
    if (now - since >= ms) return false;
    clearTimeout(this.recheck);
    this.recheck = setTimeout(() => this.sync(this.lastMembers, this.lastId), ms - (now - since) + 50);
    return true;
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
    this.lastMembers = members;
    this.lastId = myId;
    if (this.stream && myId) {
      const viewers = new Set(members.filter((m) => m.watching && m.id !== myId).map((m) => m.id));
      for (const memberId of [...this.peers.keys()]) {
        if (viewers.has(memberId)) this.missing.delete(memberId);
        // A viewer that is no longer in the room at all may be reconnecting: keep their connection a while.
        else if (!this.stillComing(memberId, members.some((m) => m.id === memberId) ? LIVE_FLAG_MS : LIVE_RETURN_MS)) {
          this.missing.delete(memberId);
          this.close(memberId);
        }
      }
      for (const memberId of viewers) if (!this.peers.has(memberId)) void this.offer(memberId);
      return;
    }
    if (this.watching) {
      const streamer = members.find((m) => m.live && m.id !== myId);
      const me = members.find((m) => m.id === myId);
      const lastStreamer = [...this.peers.keys()][0];
      // The same streamer is back, but the server let go of my watching while their connection was gone: ask again.
      if (streamer && streamer.id === lastStreamer && me && !me.watching && this.stillComing(lastStreamer, LIVE_RETURN_MS)) {
        if (Date.now() - this.rewatchAt > 2000) {
          this.rewatchAt = Date.now();
          this.options.watch(true);
        }
        return;
      }
      // The streamer (or I) dropped and is reconnecting: the picture keeps coming, wait for them to be listed again.
      if ((!streamer || (me && !me.watching)) && lastStreamer) {
        const listed = members.some((m) => m.id === lastStreamer) && (!myId || members.some((m) => m.id === myId));
        if (this.stillComing(lastStreamer, listed ? LIVE_FLAG_MS : LIVE_RETURN_MS)) return;
      }
      if (lastStreamer) this.missing.delete(lastStreamer);
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
      if (track.kind === 'video') await this.limit(transceiver.sender);
    }
    await peer.pc.setLocalDescription(await peer.pc.createOffer());
    this.options.signal(memberId, { sdp: { type: 'offer', sdp: peer.pc.localDescription!.sdp } });
  }

  /** Bit hızı sınırı ve ağ yetmezse neyin korunacağı (yazı netse çözünürlük, akıcıysa kare sayısı). */
  private async limit(sender: RTCRtpSender): Promise<void> {
    if (!this.kind) return;
    try {
      const params = sender.getParameters();
      if (params.encodings?.length) {
        params.encodings[0]!.maxBitrate = MAX_BITRATE[this.kind];
        params.encodings[0]!.maxFramerate = this.kind === 'screen' ? FPS[this.quality] : 30;
      }
      (params as RTCRtpSendParameters & { degradationPreference?: string }).degradationPreference =
        this.kind === 'screen' && this.quality === 'text' ? 'maintain-resolution' : 'maintain-framerate';
      await sender.setParameters(params);
    } catch {
      // Sınır konamadıysa tarayıcının kendi ayarı.
    }
  }

  private peer(memberId: string): Peer {
    const pc = new RTCPeerConnection({ iceServers: ICE });
    const peer: Peer = { pc, pending: [], failed: false };
    this.peers.set(memberId, peer);
    watchIceBlocked(pc, () => this.options.onBlocked?.());
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
