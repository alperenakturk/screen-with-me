import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Member, RtcRequest, RtcResult } from './protocol.ts';
import { VoiceClient } from './voice.ts';

// Gerçek WebRTC yok: sahte bağlantı, sadece pazarlık adımlarını kaydeder.
class FakePc {
  static last: FakePc;
  ontrack: ((event: unknown) => void) | null = null;
  localDescription: { sdp: string } | null = null;
  closed = false;
  log: string[] = [];
  constructor() {
    FakePc.last = this;
  }
  addTransceiver() {
    return { mid: '0' };
  }
  async createOffer() {
    return { type: 'offer', sdp: 'v=0 offer' };
  }
  async createAnswer() {
    return { type: 'answer', sdp: 'v=0 answer' };
  }
  async setLocalDescription(d: { sdp: string }) {
    this.localDescription = d;
    this.log.push('local');
  }
  async setRemoteDescription(d: { type: string }) {
    this.log.push(`remote:${d.type}`);
  }
  getReceivers() {
    return [];
  }
  getTransceivers() {
    return [];
  }
  close() {
    this.closed = true;
  }
}

const track = { enabled: true, stop: vi.fn() };
const mic = { getAudioTracks: () => [track], getTracks: () => [track] } as unknown as MediaStream;
const member = (id: string, voice?: Member['voice']): Member => ({ id, name: id, ...(voice ? { voice } : {}) });
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('VoiceClient', () => {
  let requests: RtcRequest[];
  let announced: Array<[boolean, boolean | undefined]>;
  let remote: Array<[string, boolean]>;
  let client: VoiceClient;

  beforeEach(() => {
    vi.stubGlobal('RTCPeerConnection', FakePc);
    requests = [];
    announced = [];
    remote = [];
    client = new VoiceClient({
      rpc: async (request): Promise<RtcResult> => {
        requests.push(request);
        if (request.op === 'publish') return { ok: true, sdp: 'v=0 answer', sdpType: 'answer' };
        if (request.op === 'pull') return { ok: true, mid: `m-${request.from}`, renegotiate: true, sdp: 'v=0 offer', sdpType: 'offer' };
        return { ok: true };
      },
      announce: (on, m) => announced.push([on, m]),
      onRemote: (id, stream) => remote.push([id, stream !== null]),
      getMic: async () => mic,
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('joins: announces, opens a session and publishes the mic', async () => {
    await client.join();
    expect(announced[0]).toEqual([true, true]);
    expect(requests.map((r) => r.op)).toEqual(['session', 'publish']);
    expect(FakePc.last.log).toEqual(['local', 'remote:answer']);
  });

  it('listens to members with a published track (not me), drops those who leave', async () => {
    await client.join();
    client.sync([member('me', { mic: true, track: 'mine' }), member('ali', { mic: true, track: 't1' }), member('veli', { mic: true })], 'me');
    await flush();
    await flush();
    // Sadece yayını hazır olan ve ben olmayan dinlenir; Cloudflare'in teklifine cevap verilir.
    expect(requests.filter((r) => r.op === 'pull')).toEqual([{ op: 'pull', from: 'ali' }]);
    expect(requests.some((r) => r.op === 'renegotiate')).toBe(true);
    client.sync([member('me', { mic: true, track: 'mine' })], 'me');
    await flush();
    expect(remote).toContainEqual(['ali', false]);
    expect(requests.at(-1)).toEqual({ op: 'close', mids: ['m-ali'] });
  });

  it('mute keeps the connection, leave stops the mic and closes everything', async () => {
    await client.join();
    client.setMic(false);
    expect(track.enabled).toBe(false);
    expect(announced.at(-1)).toEqual([true, false]);
    client.leave();
    expect(track.stop).toHaveBeenCalled();
    expect(FakePc.last.closed).toBe(true);
    expect(announced.at(-1)).toEqual([false, undefined]);
    expect(client.active).toBe(false);
  });
});
