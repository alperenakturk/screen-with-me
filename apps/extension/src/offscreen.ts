// Eklentinin görünmeyen sayfası (offscreen belge): film sayfasındaki katmanda sesli sohbet burada çalışır.
//
// Neden burada: katmandaki site mikrofon isteseydi Chrome izni film sitesinin adına sorardı ("film.com mikrofonunuzu
// kullanmak istiyor"), her film sitesinde ayrı ayrı; film sitesinin kendi betikleri de sonra mikrofonu açabilirdi.
// Burada izin bir kez, eklentinin adına verilir. Bu sayfa film sayfası yenilense de, başka bölüme geçilse de yaşar:
// ses kopmaz. Oda bağlantısı yine katmandaki sitede; site ⇄ shell.html ⇄ arka plan ⇄ burası (bağlantı mesajlarını,
// "seste miyim" bildirimini site kendi bağlantısından yollar). Başkalarının sesi burada <audio> ile çalar.
//
// İzin yoksa (ilk sefer) bu sayfa soramaz: arka plan küçük bir izin sekmesi (mic.html) açar, izin verilince katılır.

import type { Member, RtcRequest, RtcResult, VoiceMode } from '@swm/shared/protocol';
import type { VoiceDown, VoiceUp } from '@swm/shared/shell';
import { LevelMeter } from '@swm/shared/level-meter';
import { VoiceClient, type Voice } from '@swm/shared/voice';
import { P2pVoice } from '@swm/shared/voice-p2p';
import { VOICE_PORT_NAME, type OffscreenIn, type OffscreenOut } from './messages.ts';

const RPC_TIMEOUT_MS = 12_000;

let port: chrome.runtime.Port | null = null;
/** Sesi kullanan sekme ve oda (aynı anda tek oda). */
let owner: { tabId: number; roomId: string } | null = null;
let client: Voice | null = null;
let p2p: P2pVoice | null = null;
let mic: MediaStream | null = null;
let members: Member[] = [];
let myId: string | null = null;
/** İzin sekmesi açıkken bekleyen katılma. */
let pendingJoin: { mode: VoiceMode } | null = null;
const audios = new Map<string, HTMLAudioElement>();
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
  toSite({ op: 'state', active: !!client?.active, mic: client?.micEnabled ?? true });
}

const getMic = async (): Promise<MediaStream> => {
  mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
  meter.watch('me', mic);
  return mic;
};

function makeClient(mode: VoiceMode): Voice {
  const announce = (on: boolean, micOn?: boolean) => toSite(on ? { op: 'announce', on, mic: micOn ?? true } : { op: 'announce', on: false });
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
    document.body.append(audio);
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
    onFailed: (memberId) => toSite({ op: 'failed', memberId }),
    getMic,
  });
  return p2p;
}

async function micAllowed(): Promise<boolean> {
  try {
    const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    return status.state === 'granted';
  } catch {
    return false;
  }
}

async function join(mode: VoiceMode, quiet = false): Promise<void> {
  if (!(await micAllowed())) {
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
    await client.join();
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
  client?.leave();
  client = null;
  p2p = null;
  mic = null;
  meter.clear();
  for (const audio of audios.values()) audio.remove();
  audios.clear();
  sendState();
}

function handle(tabId: number, roomId: string, msg: VoiceUp): void {
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
      break;
    case 'join':
      members = msg.members;
      myId = msg.myId;
      void join(msg.mode, msg.quiet === true);
      break;
    case 'reset': {
      // Site yeniden bağlandı (film sayfası yenilendi, başka bölüm): yeni kimlikle bağlantılar baştan.
      members = msg.members;
      myId = msg.myId;
      if (!client) break;
      const micOn = client.micEnabled;
      client.leave();
      void client.join().then(
        () => {
          if (!micOn) client?.setMic(false);
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
      if (pendingJoin && message.granted) void join(pendingJoin.mode);
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
