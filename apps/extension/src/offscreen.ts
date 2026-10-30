// Eklentinin görünmeyen sayfası (offscreen belge): film sayfasındaki katmanda sesli sohbet burada çalışır.
//
// Neden burada: katmandaki site mikrofon isteseydi Chrome izni film sitesinin adına sorardı ("film.com mikrofonunuzu
// kullanmak istiyor"), her film sitesinde ayrı ayrı; film sitesinin kendi betikleri de sonra mikrofonu açabilirdi.
// Burada izin bir kez, eklentinin adına verilir. Bu sayfa film sayfası yenilense de, başka bölüme geçilse de yaşar:
// ses kopmaz. Oda bağlantısı yine katmandaki sitede; site ⇄ shell.html ⇄ arka plan ⇄ burası (bağlantı mesajlarını,
// "seste miyim" bildirimini site kendi bağlantısından yollar). Başkalarının sesi burada <audio> ile çalar.
//
// İzin yoksa (ilk sefer) bu sayfa soramaz: arka plan küçük bir izin sekmesi (mic.html) açar, izin verilince katılır.
//
// Kameralar da burada (bağlantılar burada olduğu için gelen görüntüler buraya düşer). Katmandaki site onları göstermek
// için bu sayfayla aynı bilgisayar içinde kalan küçük bir WebRTC bağlantısı (köprü) kurar: görüntüler bu sayfadan siteye
// bu yolla geçer (MediaStream sayfalar arasında başka türlü taşınamaz). Kamera her açılıp kapanınca köprü baştan.

import type { Member, RtcRequest, RtcResult, Signal, VoiceMode } from '@swm/shared/protocol';
import type { DeviceInfo, DevicePicks, VoiceDown, VoiceUp } from '@swm/shared/shell';
import { LevelMeter } from '@swm/shared/level-meter';
import { VoiceClient, type Voice } from '@swm/shared/voice';
import { CAM_CONSTRAINTS, P2pVoice } from '@swm/shared/voice-p2p';
import { VOICE_PORT_NAME, type OffscreenIn, type OffscreenOut } from './messages.ts';

const RPC_TIMEOUT_MS = 12_000;

let port: chrome.runtime.Port | null = null;
/** Sesi kullanan sekme ve oda (aynı anda tek oda). */
let owner: { tabId: number; roomId: string } | null = null;
let client: Voice | null = null;
let p2p: P2pVoice | null = null;
let mic: MediaStream | null = null;
/** Gelen kamera görüntüleri (üye → akış). */
const videos = new Map<string, MediaStream>();
/** İzin sekmesi açıkken bekleyen kamera. */
let pendingCam = false;
/** Görüntü köprüsü (bu sayfa → katmandaki site). */
let loop: RTCPeerConnection | null = null;
let loopTimer: ReturnType<typeof setTimeout> | null = null;
let members: Member[] = [];
let myId: string | null = null;
/** İzin sekmesi açıkken bekleyen katılma. */
let pendingJoin: { mode: VoiceMode } | null = null;
const audios = new Map<string, HTMLAudioElement>();
/** My volume for each person (from the site's person menu; 0 = muted for me). */
let volumes: Record<string, number> = {};
const rpcs = new Map<number, { resolve: (result: RtcResult) => void; timer: ReturnType<typeof setTimeout> }>();
/** Gelen seslerin ve kendi mikrofonumun seviyesi ("me"). */
const meter = new LevelMeter();
let nextRpc = 1;

function toSite(msg: VoiceDown): void {
  if (!owner) return;
  try {
    port?.postMessage({ tabId: owner.tabId, msg } satisfies OffscreenOut);
  } catch {
    port = null;
  }
}

function sendState(): void {
  toSite({ op: 'state', active: !!client?.active, mic: client?.micEnabled ?? true, cam: client?.camEnabled === true });
}

/** Kameralar değişti: köprü kısa bir beklemeyle baştan kurulur (art arda değişiklikler tek seferde). */
function refreshLoop(): void {
  if (loopTimer) clearTimeout(loopTimer);
  loopTimer = setTimeout(() => {
    loopTimer = null;
    void buildLoop();
  }, 120);
}

async function buildLoop(): Promise<void> {
  loop?.close();
  loop = null;
  const streams: [string, MediaStream][] = [...videos];
  const own = p2p?.camera;
  if (own) streams.push(['me', own]);
  if (!streams.length) {
    toSite({ op: 'loop' });
    return;
  }
  // Aynı bilgisayar içinde: STUN gerekmez.
  const pc = new RTCPeerConnection();
  loop = pc;
  const kinds = streams.map(([key, stream]) => {
    const track = stream.getVideoTracks()[0];
    return { key, transceiver: track ? pc.addTransceiver(track, { direction: 'sendonly' }) : null };
  });
  pc.onicecandidate = (event) => {
    if (!event.candidate || loop !== pc) return;
    const { candidate, sdpMid, sdpMLineIndex } = event.candidate;
    toSite({ op: 'loop', data: { candidate: { candidate, sdpMid, sdpMLineIndex } } });
  };
  await pc.setLocalDescription(await pc.createOffer());
  if (loop !== pc) return;
  const cams = kinds.flatMap(({ key, transceiver }) => (transceiver?.mid ? [[transceiver.mid, key] as [string, string]] : []));
  toSite({ op: 'loop', data: { sdp: { type: 'offer', sdp: pc.localDescription!.sdp } }, cams });
}

async function loopSignal(data: Signal): Promise<void> {
  if (!loop) return;
  if ('sdp' in data) {
    if (data.sdp.type === 'answer' && loop.signalingState === 'have-local-offer') await loop.setRemoteDescription(data.sdp);
  } else await loop.addIceCandidate(data.candidate).catch(() => {});
}

async function allowed(name: 'microphone' | 'camera'): Promise<boolean> {
  try {
    const status = await navigator.permissions.query({ name: name as PermissionName });
    return status.state === 'granted';
  } catch {
    return false;
  }
}

async function setCam(on: boolean): Promise<void> {
  // Cloudflare yolunda görüntü yok.
  if (!client?.setCam) return toSite({ op: 'cam-error' });
  if (on && !(await allowed('camera'))) {
    // İzin sekmesi kamerayı sorar; izin gelince `permission` ile açılır.
    pendingCam = true;
    port?.postMessage({ type: 'need-permission', cam: true } satisfies OffscreenOut);
    return;
  }
  pendingCam = false;
  try {
    await client.setCam(on);
  } catch {
    toSite({ op: 'cam-error' });
  }
  sendState();
  refreshLoop();
}

/**
 * The devices chosen on the site (0.9.91.14), by name: this page used the default microphone, so a headset chosen on
 * the site was not used on the film page ("my mic is quiet there"). Device ids differ per site; names don't.
 */
let picks: DevicePicks = { mic: '', cam: '', speaker: '' };
const AUDIO: MediaTrackConstraints = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };

async function deviceByName(kind: MediaDeviceKind, label: string): Promise<string | null> {
  if (!label) return null;
  const list = await navigator.mediaDevices.enumerateDevices().catch(() => [] as MediaDeviceInfo[]);
  return list.find((d) => d.kind === kind && d.label === label && d.deviceId !== 'default' && d.deviceId !== 'communications')?.deviceId ?? null;
}

/** getUserMedia with the chosen device; the default one if it is gone (an unplugged headset). */
async function open(kind: 'audio' | 'video', base: MediaTrackConstraints, label: string): Promise<MediaStream> {
  const other = kind === 'audio' ? 'video' : 'audio';
  const id = await deviceByName(kind === 'audio' ? 'audioinput' : 'videoinput', label);
  if (id) {
    try {
      return await navigator.mediaDevices.getUserMedia({ [kind]: { ...base, deviceId: { exact: id } }, [other]: false });
    } catch {
      // Fall back to the default one below.
    }
  }
  return navigator.mediaDevices.getUserMedia({ [kind]: base, [other]: false });
}

const getMic = async (): Promise<MediaStream> => {
  mic = await open('audio', AUDIO, picks.mic);
  meter.watch('me', mic);
  return mic;
};
const getCam = (): Promise<MediaStream> => open('video', CAM_CONSTRAINTS, picks.cam);

type SinkAudio = HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> };
/** Voices play through the chosen speaker. */
async function applySpeaker(audio: HTMLAudioElement): Promise<void> {
  const sink = audio as SinkAudio;
  if (!sink.setSinkId) return;
  const id = (await deviceByName('audiooutput', picks.speaker)) ?? '';
  await sink.setSinkId(id).catch(() => {});
}

/** New choices: a new microphone switches in place, a new camera re-opens, voices move to the new speaker. */
async function pick(next: DevicePicks): Promise<void> {
  const before = picks;
  picks = next;
  if (next.speaker !== before.speaker) for (const audio of audios.values()) void applySpeaker(audio);
  if (!client?.active) return;
  if (next.mic !== before.mic && p2p) await p2p.switchMic(await getMic()).catch(() => {});
  if (next.cam !== before.cam && client.camEnabled && client.setCam) {
    await client.setCam(false).catch(() => {});
    await client.setCam(true).catch(() => {});
    sendState();
    refreshLoop();
  }
}

/** The devices there are, by name (this page has the permission, so the names are known). */
async function listDevices(): Promise<DeviceInfo[]> {
  const list = await navigator.mediaDevices.enumerateDevices().catch(() => [] as MediaDeviceInfo[]);
  const out: DeviceInfo[] = [];
  for (const d of list) {
    if ((d.kind === 'audioinput' || d.kind === 'videoinput' || d.kind === 'audiooutput') && d.label && d.deviceId !== 'default' && d.deviceId !== 'communications') {
      if (!out.some((x) => x.kind === d.kind && x.label === d.label)) out.push({ kind: d.kind, label: d.label.slice(0, 120) });
    }
  }
  return out.slice(0, 40);
}

const clean = (value: unknown) => (typeof value === 'string' ? value.slice(0, 120) : '');

function makeClient(mode: VoiceMode): Voice {
  const announce = (on: boolean, micOn?: boolean, cam?: boolean) =>
    toSite(on ? { op: 'announce', on, mic: micOn ?? true, ...(cam !== undefined ? { cam } : {}) } : { op: 'announce', on: false });
  const onRemoteVideo = (memberId: string, stream: MediaStream | null) => {
    if (stream) videos.set(memberId, stream);
    else videos.delete(memberId);
    refreshLoop();
  };
  const onRemote = (memberId: string, stream: MediaStream | null) => {
    audios.get(memberId)?.remove();
    audios.delete(memberId);
    if (!stream) {
      meter.watch(memberId, null);
      return;
    }
    const audio = document.createElement('audio');
    audio.autoplay = true;
    audio.srcObject = stream;
    audio.volume = volumes[memberId] ?? 1;
    audio.muted = audio.volume === 0;
    document.body.append(audio);
    if (picks.speaker) void applySpeaker(audio);
    void audio.play().catch(() => {});
    audios.set(memberId, audio);
    // Chrome uzaktan gelen sesi Web Audio'ya ancak bir <audio>'da çalarken verir: ölçüm çalmaya başladıktan sonra.
    meter.watch(memberId, stream);
  };
  if (mode === 'sfu') {
    p2p = null;
    const rpc = (request: RtcRequest) =>
      new Promise<RtcResult>((resolve) => {
        const id = nextRpc++;
        const timer = setTimeout(() => {
          rpcs.delete(id);
          resolve({ ok: false, error: 'upstream' });
        }, RPC_TIMEOUT_MS);
        rpcs.set(id, { resolve, timer });
        toSite({ op: 'rpc', id, request });
      });
    return new VoiceClient({ rpc, announce, onRemote, getMic });
  }
  p2p = new P2pVoice({
    signal: (to, data) => toSite({ op: 'signal', to, data }),
    announce,
    onRemote,
    onRemoteVideo,
    onFailed: (memberId) => toSite({ op: 'failed', memberId }),
    getMic,
    getCam,
  });
  return p2p;
}

async function join(mode: VoiceMode, quiet = false, micOn = true): Promise<void> {
  if (!(await allowed('microphone'))) {
    if (quiet) {
      sendState();
      return;
    }
    // Bu sayfa izin isteyemez: arka plan izin sekmesini açar, izin gelince `permission` ile tekrar denenir.
    pendingJoin = { mode };
    port?.postMessage({ type: 'need-permission' } satisfies OffscreenOut);
    return;
  }
  pendingJoin = null;
  client?.leave();
  client = makeClient(mode);
  try {
    await client.join(micOn);
    client.sync(members, myId);
  } catch (error) {
    client.leave();
    client = null;
    const denied = error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'SecurityError');
    toSite({ op: 'error', code: denied ? 'denied' : 'failed' });
  }
  sendState();
}

function leave(): void {
  pendingJoin = null;
  pendingCam = false;
  client?.leave();
  client = null;
  p2p = null;
  mic = null;
  meter.clear();
  for (const audio of audios.values()) audio.remove();
  audios.clear();
  videos.clear();
  refreshLoop();
  sendState();
}

function handle(tabId: number, roomId: string, msg: VoiceUp): void {
  // Device choices and the device list are for anyone asking (not tied to the tab that holds the voice).
  if (msg.op === 'devices') {
    void listDevices().then((list) => port?.postMessage({ tabId, msg: { op: 'devices', list } } satisfies OffscreenOut));
    return;
  }
  if (msg.op === 'pick') {
    const d = msg.devices as Partial<DevicePicks> | undefined;
    void pick({ mic: clean(d?.mic), cam: clean(d?.cam), speaker: clean(d?.speaker) });
    return;
  }
  // Başka bir sekme/oda sesi istiyor: eskisi bırakılır (aynı anda tek oda).
  if (owner && (owner.tabId !== tabId || owner.roomId !== roomId)) {
    if (msg.op === 'hello') {
      port?.postMessage({ tabId, msg: { op: 'state', active: false, mic: true } } satisfies OffscreenOut);
      return;
    }
    if (msg.op !== 'join') return;
    leave();
  }
  owner = { tabId, roomId };
  switch (msg.op) {
    case 'hello':
      sendState();
      // Yeni site örneği (film sayfası yenilendi): kameralar ona da gelsin.
      refreshLoop();
      break;
    case 'join':
      members = msg.members;
      myId = msg.myId;
      void join(msg.mode, msg.quiet === true, msg.mic !== false);
      break;
    case 'reset': {
      // Site yeniden bağlandı (film sayfası yenilendi, başka bölüm): yeni kimlikle bağlantılar baştan.
      members = msg.members;
      myId = msg.myId;
      if (!client) break;
      const micOn = client.micEnabled;
      const camOn = client.camEnabled === true;
      client.leave();
      videos.clear();
      refreshLoop();
      void client.join(micOn).then(
        () => {
          if (camOn) void setCam(true);
          client?.sync(members, myId);
          sendState();
        },
        () => leave(),
      );
      break;
    }
    case 'leave':
      leave();
      break;
    case 'mic':
      client?.setMic(msg.on);
      sendState();
      break;
    case 'volume':
      volumes = {};
      for (const [memberId, volume] of Object.entries(msg.volumes ?? {})) {
        if (typeof volume === 'number' && Number.isFinite(volume)) volumes[memberId] = Math.min(1, Math.max(0, volume));
      }
      for (const [memberId, audio] of audios) {
        audio.volume = volumes[memberId] ?? 1;
        audio.muted = audio.volume === 0;
      }
      break;
    case 'cam':
      void setCam(msg.on);
      break;
    case 'loop':
      void loopSignal(msg.data).catch(() => {});
      break;
    case 'members':
      members = msg.members;
      myId = msg.myId;
      client?.sync(members, myId);
      break;
    case 'signal':
      void p2p?.receive(msg.from, msg.data).catch(() => {});
      break;
    case 'rtc-result': {
      const waiting = rpcs.get(msg.id);
      if (!waiting) break;
      rpcs.delete(msg.id);
      clearTimeout(waiting.timer);
      waiting.resolve(msg.result);
      break;
    }
  }
}

const round = (n: number) => Math.round(n * 100) / 100;
setInterval(() => {
  if (!client?.active) return;
  // WebRTC'nin ölçüsü gelmeyebilir: sesin kendisinden ölçülenle birleştirilir.
  const levels: [string, number][] = [];
  const own = client.levels();
  for (const memberId of new Set([...own.keys(), ...audios.keys()])) levels.push([memberId, round(Math.max(own.get(memberId) ?? 0, meter.level(memberId)))]);
  toSite({ op: 'levels', levels, me: client.micEnabled ? round(meter.level('me')) : 0 });
}, 250);

function connect(): void {
  port = chrome.runtime.connect({ name: VOICE_PORT_NAME });
  port.onMessage.addListener((message: OffscreenIn) => {
    if (message.type === 'voice') handle(message.tabId, message.roomId, message.msg);
    else if (message.type === 'permission') {
      if (pendingCam) {
        pendingCam = false;
        if (message.granted) void setCam(true);
        else toSite({ op: 'cam-error' });
      } else if (pendingJoin && message.granted) void join(pendingJoin.mode);
      else if (pendingJoin) {
        pendingJoin = null;
        toSite({ op: 'error', code: 'denied' });
      }
    } else if (message.type === 'end' && owner?.tabId === message.tabId) {
      // Sekmenin odası bitti (kapandı, sitedeki odaya dönüldü): ses de biter.
      leave();
      owner = null;
    }
  });
  port.onDisconnect.addListener(() => {
    port = null;
    setTimeout(connect, 300);
  });
}
connect();
