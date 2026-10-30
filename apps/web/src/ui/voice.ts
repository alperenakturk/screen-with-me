import { CAM_MAX, VOICE_MAX, VOICE_MAX_P2P, type ClientMessage, type Member, type RtcRequest, type RtcResult, type ServerMessage, type Signal, type VoiceMode } from '@swm/shared/protocol';
import { isPushToTalkKey } from '@swm/shared/embed';
import type { VoiceDown } from '@swm/shared/shell';
import { VoiceClient, type Voice } from '@swm/shared/voice';
import { LevelMeter } from '@swm/shared/level-meter';
import { SpeechDetector } from '@swm/shared/speech-detector';
import { P2pVoice } from '@swm/shared/voice-p2p';
import { el } from '../dom.ts';
import { t } from '../i18n.ts';
import { playSound } from '../sound.ts';
import { load, postToExtension, save } from '../storage.ts';
import { avatarNode } from './avatar.ts';
import { createCamWindow } from './cam-float.ts';
import { flashHint } from './hint.ts';
import { confirmIpNotice } from './ip-notice.ts';
import { applySpeaker, openCam, openMic, voiceCheck } from './voice-check.ts';
import { setIcon } from './icons.ts';
import { ExtVoice } from './voice-ext.ts';

/** Sunucu bu sürede cevap vermezse bağlantı işi başarısız sayılır. */
const RPC_TIMEOUT_MS = 12_000;

/**
 * Sesli sohbet kartı (sağ panelde, davet linkinin altında): "🎙 Sese katıl", katılınca 🎙/🔇 ve "Ayrıl";
 * seste olanların avatarları (konuşanın çevresi parlar). Katılmayan kimseyi duymaz (sürpriz ses yok).
 * Taşıma yolu sunucudan gelir: eşler arası (varsayılan, ücretsiz) ya da Cloudflare Realtime (anahtar varsa).
 * Film sayfasındaki katmanda (kabuk) ses eklentinin görünmeyen sayfasında çalışır (`ExtVoice`): mikrofon izni film
 * sitesinin değil eklentinin adına sorulur, film sayfası değişse de ses kopmaz. Eski eklenti bunu bilmez (`caps`
 * gelmez): o zaman katmanda kart gizli kalır.
 *
 * Seste olduğum bu sekmeden bağımsız hatırlanır (`voice:<oda>`): sitedeki odadan filme geçince (ya da tersi) izin
 * zaten verilmişse ses kendiliğinden yeniden açılır.
 */
/** "Birlikte" kartında en fazla bu kadar kişi görünür (fazlası "+N"). */
const PEOPLE_SHOWN = 8;

export interface VoiceRoom {
  /** Am I the host (the person menu offers "remove from room")? */
  isHost: () => boolean;
  /** Ask (confirm) and remove someone from the room. */
  kick: (member: Member) => void;
  /** The cameras on screen right now (member → picture; hidden ones and "hide myself" left out): Shorts seats. */
  onCams?: (cams: Map<string, MediaStream>) => void;
}

export function createVoice(root: HTMLElement, send: (message: ClientMessage) => void, myId: () => string | null, roomId: string, isShell: boolean, room: VoiceRoom) {
  const card = root.querySelector<HTMLElement>('#voice-card')!;
  const joinButton = root.querySelector<HTMLButtonElement>('#voice-join')!;
  const onBox = root.querySelector<HTMLElement>('#voice-on')!;
  const micButton = root.querySelector<HTMLButtonElement>('#voice-mic')!;
  // Düğmenin içi: simge ve altında kendi sesimin seviye çubuğu ("mikrofonum sesimi alıyor mu").
  const micIcon = el('span', { class: 'mic-ico' });
  setIcon(joinButton, 'mic');
  const micBar = el('i');
  micButton.replaceChildren(micIcon, el('span', { class: 'mic-level', 'aria-hidden': 'true' }, micBar));
  const leaveButton = root.querySelector<HTMLButtonElement>('#voice-leave')!;
  const peopleBox = root.querySelector<HTMLElement>('#voice-people')!;
  const camButton = root.querySelector<HTMLButtonElement>('#voice-cam')!;
  const limitEl = root.querySelector<HTMLElement>('#voice-limit')!;
  const camsBox = root.querySelector<HTMLElement>('#voice-cams')!;
  // Kameralar kartta, sayfada yüzen pencerede ya da tam ekranda videonun içinde (sürüklenir, boyutlandırılır).
  // My mic, camera and stream outside the card are the dock's and the Shorts bar's quick buttons (0.9.91.5: no longer
  // in the camera pill). The stream button presses the stream card's own buttons, so the IP notice, limits and
  // "camera in the corner" choice stay in one place.
  const pressLive = () => {
    const stop = root.querySelector<HTMLButtonElement>('#live-stop');
    const watch = root.querySelector<HTMLButtonElement>('#live-watch');
    if (stop && !stop.hidden) stop.click();
    else if (watch && !watch.hidden) watch.click();
    else root.querySelector<HTMLButtonElement>('#live-screen')?.click();
  };
  // Quick voice buttons outside the card, pressing the card's own buttons: the Shorts bar (0.9.90.9, owner's idea: no
  // camera tiles there, cameras show inside the seats' avatar circles) and the fullscreen dock (0.9.91.1, with the
  // stream button too). Not in voice yet: the 🎙 joins.
  /** The next join comes from a quick 📷 button: join with the camera on. */
  let joinWithCam = false;
  const quick = (['shorts', 'dock'] as const).flatMap((id) => {
    const box = root.querySelector<HTMLElement>(`#${id}-voice`);
    const mic = root.querySelector<HTMLButtonElement>(`#${id}-mic`);
    const cam = root.querySelector<HTMLButtonElement>(`#${id}-cam`);
    if (!box || !mic || !cam) return [];
    mic.addEventListener('click', () => (client.active ? micButton : joinButton).click());
    // The 📷 shows before joining too (owner: both from the start); pressed outside voice it joins with the camera on.
    cam.addEventListener('click', () => {
      if (client.active) camButton.click();
      else {
        joinWithCam = true;
        joinButton.click();
      }
    });
    const live = root.querySelector<HTMLButtonElement>(`#${id}-live`);
    live?.addEventListener('click', pressLive);
    return [{ box, mic, cam, live }];
  });
  const camWindow = createCamWindow({
    box: camsBox,
    theater: root.querySelector<HTMLElement>('#theater')!,
    wrap: root.querySelector<HTMLElement>('.player-wrap')!,
    onMove: () => dispatchEvent(new Event('swm-layout')),
    onTileClick: (tileEl) => {
      const member = members.find((m) => m.id === tileEl.dataset.voiceId);
      if (member) openPersonMenu(member, tileEl);
    },
    onShowHidden: () => {
      hiddenCams = new Set();
      save('camHidden', '[]');
      renderCams();
    },
  });
  /** Camera shown big (person key); only in this tab. */
  let pinned: string | null = null;
  /** Hide my own camera preview (others still see me). */
  let hideSelf = load('opt:hideSelfCam') === '1';
  /** Cameras I hid (person keys; for me only, the others still see them), 0.9.90.5. */
  let hiddenCams = new Set<string>(
    (() => {
      try {
        const list = JSON.parse(load('camHidden') ?? '[]') as unknown;
        return Array.isArray(list) ? list.filter((k): k is string => typeof k === 'string').slice(0, 50) : [];
      } catch {
        return [];
      }
    })(),
  );
  const hint = root.querySelector<HTMLElement>('#voice-hint')!;
  // "People in voice can see your IP · Why?" (peer-to-peer only; Cloudflare's server hides addresses).
  const ipLine = root.querySelector<HTMLElement>('#voice-ip')!;
  const ipWhy = root.querySelector<HTMLButtonElement>('#voice-ip-why')!;
  ipWhy.addEventListener('click', () => flashHint(ipWhy, t('ipNotice.whyText'), 7000));
  const pttBox = root.querySelector<HTMLInputElement>('#voice-ptt')!;
  /** Bas-konuş: mikrofon kapalı durur, V tuşu (ya da 🎙) basılı tutulunca açılır. Tarayıcıda hatırlanır. */
  let ptt = load('opt:ptt') === '1';
  let talking = false;
  pttBox.checked = ptt;

  let available = false;
  let members: Member[] = [];
  let nextId = 1;
  const pending = new Map<number, { resolve: (result: RtcResult) => void; timer: ReturnType<typeof setTimeout> }>();
  const audios = new Map<string, HTMLAudioElement>();

  const rpc = (request: RtcRequest) =>
    new Promise<RtcResult>((resolve) => {
      const id = nextId++;
      const timer = setTimeout(() => {
        pending.delete(id);
        resolve({ ok: false, error: 'upstream' });
      }, RPC_TIMEOUT_MS);
      pending.set(id, { resolve, timer });
      send({ t: 'rtc', id, ...request } as ClientMessage);
    });

  const announce = (on: boolean, mic?: boolean, cam?: boolean) =>
    send(on ? { t: 'voice', on, mic: mic ?? true, ...(cam !== undefined ? { cam } : {}) } : { t: 'voice', on: false });
  /** Gelen kamera görüntüleri (üye → akış); görünüp görünmeyeceğine üyenin `voice.cam`'i karar verir. */
  const videos = new Map<string, MediaStream>();
  const onRemoteVideo = (memberId: string, stream: MediaStream | null) => {
    if (stream) videos.set(memberId, stream);
    else videos.delete(memberId);
    renderCams();
  };
  /** Gelen seslerin ve kendi mikrofonumun ("me") seviyesi (WebRTC'nin ölçüsü gelmeyebilir). */
  const meter = new LevelMeter();
  let meteredMic: MediaStream | null = null;
  /** Kendi sesimin seviyesi: çubuk sesle birlikte dolar (yumuşatılmış; mikrofon kapalıysa boş). */
  let shownLevel = 0;
  function myLevel(): number {
    if (!client.active || !client.micEnabled) return 0;
    if (client instanceof ExtVoice) return client.me;
    const mic = client.microphone ?? null;
    if (mic !== meteredMic) {
      meteredMic = mic;
      meter.watch('me', mic);
    }
    return meter.level('me');
  }
  const tickLevel = () => {
    const target = myLevel();
    // Hızlı yükselir, yavaş iner (VU göstergesi gibi).
    shownLevel = target > shownLevel ? target : shownLevel * 0.85 + target * 0.15;
    micBar.style.width = `${Math.round(Math.min(1, shownLevel * 1.6) * 100)}%`;
    micBar.classList.toggle('loud', shownLevel > 0.08);
  };
  setInterval(() => {
    if (client.active) tickLevel();
  }, 80);
  const onRemote = (memberId: string, stream: MediaStream | null) => {
    audios.get(memberId)?.remove();
    audios.delete(memberId);
    if (!stream) {
      meter.watch(memberId, null);
      return;
    }
    // Görünmez <audio>: tarayıcı çalar (katılırken tıklandığı için otomatik oynatma engeline takılmaz).
    const audio = el('audio', { autoplay: '' }) as HTMLAudioElement;
    audio.srcObject = stream;
    audio.hidden = true;
    applySpeaker(audio);
    setVolume(audio, memberId);
    document.body.append(audio);
    void audio.play().catch(() => {});
    audios.set(memberId, audio);
    // Chrome uzaktan gelen sesi Web Audio'ya ancak bir <audio>'da çalarken verir: ölçüm çalmaya başladıktan sonra.
    meter.watch(memberId, stream);
  };
  let mode: VoiceMode = 'p2p';
  let p2p: P2pVoice | null = null;
  let ext: ExtVoice | null = null;
  /** Sunucu sesi destekliyor mu / eklenti katmanda sesi destekliyor mu (sadece kabukta gerekir). */
  let serverVoice = false;
  let extVoice = false;
  const failed = (memberId: string) => {
    const who = members.find((m) => m.id === memberId)?.name ?? '';
    flashHint(peopleBox, t('voice.p2pFailed', { name: who }), 7000);
  };
  const makeClient = (): Voice => {
    if (isShell) {
      ext ??= new ExtVoice((msg) => postToExtension({ type: 'voice', msg }), {
        announce,
        signal: (to, data) => send({ t: 'signal', to, data }),
        rpc: (id, request) => void rpc(request).then((result) => ext?.rtcResult(id, result)),
        failed,
        changed: () => render(),
        onRemoteVideo,
      });
      ext.mode = mode;
      return ext;
    }
    // The devices chosen in the pre-join check (the default ones if none or gone).
    if (mode === 'sfu') return new VoiceClient({ rpc, announce, onRemote, getMic: () => openMic() });
    p2p = new P2pVoice({
      getMic: () => openMic(),
      getCam: () => openCam(),
      signal: (to, data) => send({ t: 'signal', to, data }),
      announce,
      onRemote,
      onRemoteVideo,
      onFailed: failed,
    });
    return p2p;
  };
  let client: Voice = makeClient();
  /**
   * Join with the microphone on or off. ExtVoice (film page) takes `(quiet, mic)`: `quiet` = no permission tab (silent
   * rejoins). Calling it as `join(mic)` turned a muted microphone back on after a reconnect on the film page.
   */
  const joinVoice = (mic: boolean, quiet = false) => (client instanceof ExtVoice ? client.join(quiet, mic) : client.join(mic));
  const wantKey = `voice:${roomId}`;
  const remember = (on: boolean) => save(wantKey, on ? '1' : '0');
  const micKey = `voiceMic:${roomId}`;
  /** Was my microphone on the last time I chose (default on)? With push-to-talk it always starts off (render). */
  const micWanted = () => load(micKey) !== '0';

  let wasActive = false;
  function render(): void {
    card.hidden = !available;
    ipLine.hidden = !available || mode !== 'p2p';
    const active = client.active;
    // Sese yeni girildi (düğmeyle ya da kendiliğinden): bas-konuşta mikrofon kapalı başlar.
    if (active && !wasActive && ptt) {
      talking = false;
      client.setMic(false);
    }
    wasActive = active;
    joinButton.hidden = active;
    onBox.hidden = !active;
    setIcon(micIcon, client.micEnabled ? 'mic' : 'mic-off');
    micButton.classList.toggle('ptt', ptt);
    micButton.classList.toggle('talking', ptt && talking);
    const micLabel = ptt ? t('voice.pttHold') : client.micEnabled ? t('voice.mute') : t('voice.unmute');
    micButton.title = micLabel;
    micButton.setAttribute('aria-label', micLabel);
    micButton.classList.toggle('muted-mic', !client.micEnabled);
    const inVoice = members.filter((m) => m.voice);
    // "Birlikte" kartında odadaki herkes (seste olanlar önde, yeşil halkayla; konuşanın çevresi parlar). Aynı kişinin
    // iki sekmesi (site + film) tek görünür; en fazla PEOPLE_SHOWN, fazlası "+N".
    const seen = new Set<string>();
    const people = [...members]
      .sort((a, b) => Number(!!b.voice) - Number(!!a.voice))
      .filter((m) => {
        const key = `${m.name}|${m.avatar ?? ''}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    const me = myId();
    peopleBox.replaceChildren(
      ...people.slice(0, PEOPLE_SHOWN).map((m) => {
        const face = el('span', { class: `voice-face${m.voice ? ' in-voice' : ''}`, 'data-voice-id': m.id }, avatarNode(m.avatar, 'voice-avatar'));
        if (m.voice && !m.voice.mic) {
          const badge = el('span', { class: 'voice-muted' });
          setIcon(badge, 'mic-off');
          face.append(badge);
        }
        const label = m.id === me ? t('voice.me') : m.name;
        const person = el('button', { type: 'button', class: 'together-person', title: m.voice ? `${m.name} · ${t('voice.inVoice')}` : m.name }, face, el('span', { class: 'together-name' }, label));
        // Discord-style menu: volume / mute for me, pin the camera, hide myself, host: remove from the room.
        person.addEventListener('click', () => openPersonMenu(m, person));
        return person;
      }),
      ...(people.length > PEOPLE_SHOWN ? [el('span', { class: 'together-more' }, `+${people.length - PEOPLE_SHOWN}`)] : []),
    );
    peopleBox.title = '';
    limitEl.hidden = !available;
    // Sınırlar hep görünür: "Seste 3/6 · 📷 1/4" (neden sınır var: üstüne gelince). Dolunca düğme soluk, basınca açıklama.
    const max = voiceMax();
    const cams = members.filter((m) => m.voice?.cam).length;
    const camsShown = mode === 'p2p' && !!client.setCam && inVoice.length > 0;
    limitEl.textContent = t('voice.limit', { n: inVoice.length, max }) + (camsShown ? ` · ${t('voice.camLimit', { n: cams, max: CAM_MAX })}` : '');
    limitEl.title = t('voice.limitTitle', { max }) + (camsShown ? `\n${t('voice.camLimitTitle', { max: CAM_MAX })}` : '');
    const full = !active && inVoice.length >= max;
    const left = max - inVoice.length;
    limitEl.classList.toggle('full', inVoice.length >= max);
    limitEl.classList.toggle('near', !full && left === 1 && !active);
    if (!active && !full && left === 1) limitEl.textContent += ` · ${t('voice.lastSeat', { n: left })}`;
    joinButton.classList.toggle('is-full', full);
    // Kamera düğmesi sadece eşler arası seste (Cloudflare yolunda ve eski eklentinin film sayfasında görüntü yok).
    camButton.hidden = !active || !client.setCam;
    camButton.classList.toggle('is-full', client.camEnabled !== true && cams >= CAM_MAX);
    const camOn = client.camEnabled === true;
    camButton.classList.toggle('on', camOn);
    const camLabel = camOn ? t('voice.camOff') : t('voice.camOn');
    camButton.title = camLabel;
    camButton.setAttribute('aria-label', camLabel);
    // Line icons (0.9.91): the picture says what will be (mic / mic struck through), red = off.
    if (camButton.textContent) camButton.textContent = '';
    setIcon(camButton, camOn ? 'cam' : 'cam-off');
    renderLiveButton();
    for (const { box, mic, cam } of quick) {
      box.hidden = !available || (!active && joinButton.hidden);
      const micText = active ? micLabel : t('voice.join');
      if (mic.textContent) mic.textContent = '';
      setIcon(mic, !active || client.micEnabled ? 'mic' : 'mic-off');
      mic.classList.toggle('off', active && !client.micEnabled);
      mic.title = micText;
      mic.setAttribute('aria-label', micText);
      cam.hidden = active ? camButton.hidden : !client.setCam;
      if (cam.textContent) cam.textContent = '';
      setIcon(cam, camOn ? 'cam' : 'cam-off');
      cam.classList.toggle('off', !camOn);
      cam.title = camLabel;
      cam.setAttribute('aria-label', camLabel);
    }
    renderCams();
  }

  // ---- Kameralar: tek kutu takımı; kartta, yüzen pencerede ya da tam ekranda videonun içinde (cam-float.ts) ----
  /** Üye → kutu (her çizimde yeniden yaratılmaz: görüntü titremesin). */
  const tiles = new Map<string, HTMLElement>();
  function tile(memberId: string, name: string, person: string, stream: MediaStream, mine: boolean): HTMLElement {
    let box = tiles.get(memberId);
    if (!box) {
      const video = el('video', { autoplay: '', playsinline: '', 'aria-hidden': 'true' }) as HTMLVideoElement;
      video.muted = true;
      box = el('div', { class: mine ? 'cam-tile mine' : 'cam-tile', 'data-voice-id': memberId }, video, el('span', { class: 'cam-name' }));
      tiles.set(memberId, box);
    }
    const video = box.querySelector('video')!;
    if (video.srcObject !== stream) {
      video.srcObject = stream;
      void video.play().catch(() => {});
    }
    box.querySelector('.cam-name')!.textContent = name;
    // The free layout remembers each camera's place by person (it survives reconnects).
    box.dataset.person = person;
    return box;
  }
  /**
   * Cameras of people whose connection dropped (0.9.90.5): the tile stays with "📶 reconnecting" for a while instead of
   * vanishing and popping up again; their new connection's tile takes its place.
   */
  const RECONNECT_TILE_MS = 12_000;
  const ghosts = new Map<string, { box: HTMLElement; timer: ReturnType<typeof setTimeout> }>();
  function dropGhost(person: string): void {
    const ghost = ghosts.get(person);
    if (!ghost) return;
    clearTimeout(ghost.timer);
    ghosts.delete(person);
  }
  /** The pill's stream button follows the room: who streams, am I watching, can I share at all. */
  function renderLiveButton(): void {
    const liveCard = root.querySelector<HTMLElement>('#live-card');
    const streamer = members.find((m) => m.live);
    const me = members.find((m) => m.id === myId());
    const canShare = !(root.querySelector<HTMLButtonElement>('#live-screen')?.hidden ?? true);
    const mine = !!streamer && streamer.id === me?.id;
    const label = mine ? t('live.stop') : streamer ? t(me?.watching ? 'live.unwatch' : 'live.watch') : t('live.screen');
    for (const button of quick.map((q) => q.live)) {
      if (!button) continue;
      button.hidden = !liveCard || liveCard.hidden || (!streamer && !canShare);
      setIcon(button, mine ? 'screen-stop' : streamer && !me?.watching ? 'screen-watch' : 'screen');
      button.classList.toggle('on', mine || !!me?.watching);
      button.title = label;
      button.setAttribute('aria-label', label);
    }
  }

  function renderCams(): void {
    const me = myId();
    const shown: HTMLElement[] = [];
    const keep = new Set<string>();
    let hidden = 0;
    if (client.active) {
      // One tile per person: my other tab (same name and avatar) is never shown as someone else, and if a person is
      // in the list twice (an old connection not gone yet) only their newest connection gets a tile.
      const self = members.find((m) => m.id === me);
      const person = (m: Member) => `${m.name}|${m.avatar ?? ''}`;
      const newest = new Map<string, Member>();
      for (const member of members) if (member.voice?.cam) newest.set(person(member), member);
      for (const member of members) {
        if (!member.voice?.cam) continue;
        if (member.id !== me && self && person(member) === person(self)) continue;
        if (member.id !== me && newest.get(person(member)) !== member) continue;
        // "Hide myself" only hides my own preview here; the others still see me. Hidden people: for me only.
        if (member.id === me && hideSelf) continue;
        if (member.id !== me && hiddenCams.has(person(member))) {
          hidden++;
          continue;
        }
        const stream = member.id === me ? (client.camera ?? null) : (videos.get(member.id) ?? null);
        if (!stream) continue;
        keep.add(member.id);
        const box = tile(member.id, member.name, person(member), stream, member.id === me);
        box.classList.toggle('pinned', pinned === person(member));
        shown.push(box);
      }
      // The pinned camera comes first and spans the whole width.
      shown.sort((a, b) => Number(b.classList.contains('pinned')) - Number(a.classList.contains('pinned')));
    }
    const shownPeople = new Set(shown.map((box) => box.dataset.person));
    for (const [id, box] of [...tiles]) {
      if (keep.has(id)) continue;
      tiles.delete(id);
      // Gone from the room (not "camera off" or "left voice"): keep the tile for a moment, it may be a reconnect.
      const person = box.dataset.person;
      if (client.active && person && !box.classList.contains('mine') && !members.some((m) => m.id === id) && !shownPeople.has(person)) {
        dropGhost(person);
        box.classList.add('reconnecting');
        box.append(el('span', { class: 'cam-note' }, `📶 ${t('voice.reconnecting')}`));
        ghosts.set(person, {
          box,
          timer: setTimeout(() => {
            ghosts.delete(person);
            renderCams();
          }, RECONNECT_TILE_MS),
        });
      }
    }
    for (const [person, ghost] of [...ghosts]) {
      if (!client.active || shownPeople.has(person) || hiddenCams.has(person)) dropGhost(person);
      else shown.push(ghost.box);
    }
    camWindow.grid.replaceChildren(...shown);
    camWindow.update(shown.length, hidden);
    // The Shorts view shows the same cameras inside the seats' avatar circles (0.9.90.9).
    const cams = new Map<string, MediaStream>();
    for (const [id, box] of tiles) {
      const stream = box.querySelector('video')?.srcObject;
      if (stream instanceof MediaStream) cams.set(id, stream);
    }
    room.onCams?.(cams);
  }

  // ---- Per person, for me only (Discord-like): volume, mute, pinned camera, hide my own preview ----
  /** Remembered by person (name + avatar), not by connection: it survives reconnects and other rooms. */
  type PersonSound = { v?: number; m?: boolean };
  const SOUND_KEY = 'voiceSound';
  let sound: Record<string, PersonSound> = (() => {
    try {
      const parsed = JSON.parse(load(SOUND_KEY) ?? '{}') as unknown;
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, PersonSound>) : {};
    } catch {
      return {};
    }
  })();
  const personOf = (m: Member) => `${m.name}|${m.avatar ?? ''}`;
  /** TV version: a phone paired to my TV plays no voices (the TV does), and the TV's own volume for all voices. */
  let silenced = false;
  let master = 1;
  function volumeOf(memberId: string): number {
    if (isMyOtherTab(memberId) || silenced) return 0;
    const member = members.find((m) => m.id === memberId);
    const s = member ? sound[personOf(member)] : undefined;
    return s?.m ? 0 : Math.min(1, Math.max(0, s?.v ?? 1)) * master;
  }
  function setVolume(audio: HTMLAudioElement, memberId: string): void {
    const volume = volumeOf(memberId);
    audio.volume = volume;
    audio.muted = volume === 0;
  }
  function applyVolumes(): void {
    for (const [memberId, audio] of audios) setVolume(audio, memberId);
    // On the film page the voices play in the extension.
    if (client instanceof ExtVoice) client.volumes(Object.fromEntries(members.filter((m) => m.voice).map((m) => [m.id, volumeOf(m.id)])));
  }
  function setSound(member: Member, next: PersonSound): void {
    const key = personOf(member);
    sound = { ...sound, [key]: { ...sound[key], ...next } };
    save(SOUND_KEY, JSON.stringify(sound));
    applyVolumes();
  }

  let menu: HTMLElement | null = null;
  function closeMenu(): void {
    if (!menu) return;
    menu.remove();
    menu = null;
    dispatchEvent(new Event('swm-layout'));
  }
  addEventListener('pointerdown', (event) => {
    if (menu && !menu.contains(event.target as Node) && !(event.target as Element).closest?.('.together-person, .cam-tile')) closeMenu();
  });
  addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });

  /** Small menu next to a person (their face in the card or their camera tile). */
  function openPersonMenu(member: Member, anchor: HTMLElement): void {
    const wasOpen = menu?.dataset.member === member.id;
    closeMenu();
    if (wasOpen) return;
    const isMe = member.id === myId();
    const key = personOf(member);
    const items: HTMLElement[] = [el('div', { class: 'person-pop-head' }, avatarNode(member.avatar, 'person-pop-avatar'), el('b', {}, isMe ? `${member.name} (${t('voice.me')})` : member.name))];
    const button = (text: string, onClick: () => void, cls = '') => {
      const b = el('button', { type: 'button', class: `person-pop-item ${cls}` }, text);
      b.addEventListener('click', () => {
        onClick();
        closeMenu();
        render();
      });
      return b;
    };
    const s = sound[key] ?? {};
    if (!isMe && member.voice && client.active) {
      const range = el('input', { type: 'range', min: '0', max: '100', step: '5', class: 'person-pop-range', 'aria-label': t('voice.volume') }) as HTMLInputElement;
      range.value = String(Math.round((s.v ?? 1) * 100));
      const value = el('span', { class: 'person-pop-value' }, `${range.value}%`);
      range.addEventListener('input', () => {
        value.textContent = `${range.value}%`;
        setSound(member, { v: Number(range.value) / 100, m: false });
      });
      items.push(el('label', { class: 'person-pop-volume' }, el('span', {}, `🔊 ${t('voice.volume')}`), range, value));
      items.push(button(s.m ? `🔊 ${t('voice.unmuteFor')}` : `🔇 ${t('voice.muteFor')}`, () => setSound(member, { m: !s.m })));
    }
    if (tiles.has(member.id) && camWindow.isFree()) {
      // Every camera has its own window: small / medium / large instead of "show big".
      const now = camWindow.sizeOf(key);
      const sizes = (['small', 'medium', 'large'] as const).map((size) => {
        const b = el('button', { type: 'button', class: size === now ? 'person-pop-size on' : 'person-pop-size', 'aria-pressed': String(size === now) }, t(`voice.size.${size}`));
        b.addEventListener('click', () => {
          camWindow.setSize(key, size);
          closeMenu();
        });
        return b;
      });
      items.push(el('div', { class: 'person-pop-sizes', role: 'group', 'aria-label': t('voice.size') }, el('span', {}, `↔ ${t('voice.size')}`), ...sizes));
    } else if (tiles.has(member.id)) {
      // Me too (0.9.90.5): my own camera can be the big one.
      items.push(button(pinned === key ? `📌 ${t('voice.unpin')}` : `📌 ${t('voice.pin')}`, () => (pinned = pinned === key ? null : key)));
    }
    // Hide anyone's camera, for me only (the others still see it); back from here or "👁 N".
    if (!isMe && member.voice?.cam && client.active) {
      const isHidden = hiddenCams.has(key);
      items.push(
        button(isHidden ? `👁 ${t('voice.showCam')}` : `🙈 ${t('voice.hideCam')}`, () => {
          if (isHidden) hiddenCams.delete(key);
          else hiddenCams.add(key);
          save('camHidden', JSON.stringify([...hiddenCams]));
          renderCams();
        }),
      );
    }
    if (isMe && client.active) {
      // My own controls (owner's feedback, 0.9.88: clicking myself while in voice used to say "you're not in voice").
      if (!ptt) items.push(button(client.micEnabled ? `🔇 ${t('voice.mute')}` : `🎙 ${t('voice.unmute')}`, () => micButton.click()));
      if (!camButton.hidden) items.push(button(client.camEnabled ? `📷 ${t('voice.camOff')}` : `📷 ${t('voice.camOn')}`, () => camButton.click()));
    }
    if (isMe && client.camEnabled) {
      items.push(
        button(hideSelf ? `👁 ${t('voice.showSelf')}` : `🙈 ${t('voice.hideSelf')}`, () => {
          hideSelf = !hideSelf;
          save('opt:hideSelfCam', hideSelf ? '1' : '0');
        }),
      );
    }
    if (isMe) {
      if (client.active) items.push(button(`🚪 ${t('voice.leaveVoice')}`, () => leaveButton.click()));
      else if (!joinButton.hidden) items.push(button(`🎙 ${t('voice.join')}`, () => joinButton.click()));
      if (!isShell) items.push(button(`🎛 ${t('voice.devices')}`, () => void changeDevices()));
      items.push(button(`👤 ${t('voice.editMe')}`, () => document.querySelector<HTMLElement>('.topbar-right .profile-btn')?.click()));
    }
    if (!isMe && room.isHost()) items.push(button(`🚪 ${t('voice.kick')}`, () => room.kick(member), 'danger'));
    if (items.length === 1) items.push(el('p', { class: 'person-pop-note' }, t(member.voice ? 'voice.menuNothing' : 'voice.notInVoice')));
    menu = el('div', { class: 'person-pop', role: 'menu', 'data-island': '', 'data-member': member.id }, ...items);
    document.body.append(menu);
    const r = anchor.getBoundingClientRect();
    const w = menu.offsetWidth;
    const h = menu.offsetHeight;
    const left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8);
    const top = r.bottom + 6 + h > innerHeight - 8 ? Math.max(8, r.top - h - 6) : r.bottom + 6;
    menu.style.left = `${Math.round(left)}px`;
    menu.style.top = `${Math.round(top)}px`;
    dispatchEvent(new Event('swm-layout'));
  }

  /** "🎛 Microphone and camera" on myself: the same check window; while in voice the new devices apply at once. */
  async function changeDevices(): Promise<void> {
    const before = { mic: load('opt:micDevice') ?? '', cam: load('opt:camDevice') ?? '', speaker: load('opt:speakerDevice') ?? '' };
    const result = await voiceCheck({ mode: 'settings', canCam: !!client.setCam });
    if (!result) return;
    if ((load('opt:speakerDevice') ?? '') !== before.speaker) for (const audio of audios.values()) applySpeaker(audio, load('opt:speakerDevice') ?? '');
    if (!client.active) return;
    try {
      if ((load('opt:micDevice') ?? '') !== before.mic) {
        if (client.switchMic) await client.switchMic(await openMic());
        else {
          // No in-place switch on this path: rejoin with the same microphone state.
          const on = client.micEnabled;
          client.leave();
          await joinVoice(on);
          client.sync(members, myId());
        }
      }
      if ((load('opt:camDevice') ?? '') !== before.cam && client.camEnabled && client.setCam) {
        await client.setCam(false);
        await client.setCam(true);
      }
    } catch {
      flashHint(camButton, t('voice.failed'), 6000);
    }
    render();
  }

  // M toggles my microphone while I'm in voice (not with push-to-talk; never while typing).
  document.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() !== 'm' || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
    if (!client.active || ptt || typing(event.target)) return;
    event.preventDefault();
    micButton.click();
  });

  /** Bu odada seste en fazla kaç kişi (eşler arası 6, Cloudflare yolunda 10). */
  function voiceMax(): number {
    return mode === 'sfu' ? VOICE_MAX : VOICE_MAX_P2P;
  }

  joinButton.addEventListener('click', async () => {
    const wantCam = joinWithCam;
    joinWithCam = false;
    const inVoice = members.filter((m) => m.voice).length;
    if (inVoice >= voiceMax()) {
      flashHint(joinButton, t('voice.fullHint', { n: inVoice, max: voiceMax() }), 7000);
      return;
    }
    if (mode === 'p2p') {
      const others = members.filter((m) => m.voice && m.id !== myId()).map((m) => m.name);
      if (!(await confirmIpNotice('voice', others))) return;
    }
    // Pre-join check (0.9.90.6): devices, "join muted", "join with my camera on" (not on the film page: there the
    // extension's offscreen page holds the microphone).
    // The peer-to-peer path is what has cameras.
    const canCam = !isShell && !!client.setCam;
    const choice = isShell ? { mic: true, cam: wantCam } : await voiceCheck({ mode: 'join', canCam, ...(wantCam ? { cam: true } : {}) });
    if (!choice) return;
    joinButton.disabled = true;
    try {
      client.sync(members, myId());
      await joinVoice(choice.mic);
      remember(true);
      playSound('meJoin');
      save(micKey, choice.mic ? '1' : '0');
      if (choice.cam && client.setCam) {
        if (members.filter((m) => m.voice?.cam).length >= CAM_MAX) flashHint(camButton, t('voice.camFullHint', { n: CAM_MAX, max: CAM_MAX }), 7000);
        else await client.setCam(true).catch(() => flashHint(camButton, t('voice.camDenied'), 6000));
      }
      // İlk katılışta kulaklık ipucu (film sesi hoparlörden karşıya gitmesin).
      hint.hidden = false;
      setTimeout(() => (hint.hidden = true), 9000);
      client.sync(members, myId());
    } catch (error) {
      const denied = error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'SecurityError');
      flashHint(joinButton, denied ? t('voice.denied') : t('voice.failed'), 6000);
    } finally {
      joinButton.disabled = false;
      render();
    }
  });
  micButton.addEventListener('click', () => {
    if (ptt) return;
    client.setMic(!client.micEnabled);
    // Confirms what isn't visible when M is pressed while watching (privacy: is my microphone really off?).
    playSound(client.micEnabled ? 'micOn' : 'micOff');
    // Remembered for this room: a reload or a reconnect must never switch a muted microphone back on.
    save(micKey, client.micEnabled ? '1' : '0');
    render();
  });
  // Bas-konuş: tuş ya da 🎙 basılı tutulurken konuşulur; pencereden çıkınca (tuş bırakılmadan) kapanır.
  function talk(on: boolean): void {
    if (!ptt || !client.active || talking === on) return;
    talking = on;
    client.setMic(on);
    playSound(on ? 'pttDown' : 'pttUp');
    render();
  }
  const typing = (target: EventTarget | null) =>
    target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
  document.addEventListener('keydown', (event) => {
    if (!ptt || !isPushToTalkKey(event.key) || event.ctrlKey || event.metaKey || event.altKey || typing(event.target)) return;
    if (!client.active) return;
    event.preventDefault();
    if (!event.repeat) talk(true);
  });
  document.addEventListener('keyup', (event) => {
    if (isPushToTalkKey(event.key)) talk(false);
  });
  addEventListener('blur', () => talk(false));
  micButton.addEventListener('pointerdown', (event) => {
    if (!ptt) return;
    micButton.setPointerCapture(event.pointerId);
    talk(true);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) micButton.addEventListener(type, () => talk(false));
  pttBox.addEventListener('change', () => {
    ptt = pttBox.checked;
    save('opt:ptt', ptt ? '1' : '0');
    talking = false;
    if (client.active) client.setMic(!ptt);
    render();
  });
  camButton.addEventListener('click', async () => {
    if (!client.setCam) return;
    const cams = members.filter((m) => m.voice?.cam).length;
    if (!client.camEnabled && cams >= CAM_MAX) {
      flashHint(camButton, t('voice.camFullHint', { n: cams, max: CAM_MAX }), 7000);
      return;
    }
    camButton.disabled = true;
    try {
      await client.setCam(!client.camEnabled);
    } catch {
      flashHint(camButton, t('voice.camDenied'), 6000);
    } finally {
      camButton.disabled = false;
      render();
    }
  });
  leaveButton.addEventListener('click', () => {
    if (client.active) playSound('meLeave');
    client.leave();
    remember(false);
    render();
  });

  /** Dinlediklerimin seviyesi: WebRTC'nin ölçüsü ile sesin kendisinden ölçülenin büyüğü (eklentide ölçüm orada). */
  function allLevels(): Map<string, number> {
    const out = new Map(client.levels());
    if (client instanceof ExtVoice) return out;
    for (const [memberId, level] of meter.levels()) if (memberId !== 'me') out.set(memberId, Math.max(out.get(memberId) ?? 0, level));
    return out;
  }

  /** Sitedeki odadan filme geçince (ya da tersi) seste idiysek ve izin zaten verilmişse sessizce yeniden katıl. */
  async function rejoin(): Promise<void> {
    if (client.active || load(wantKey) !== '1' || !available || !myId()) return;
    // Another tab of mine (e.g. the film tab while this room tab was opened from the popup) is already in voice:
    // don't join a second time (I would hear myself and appear twice). The "Join voice" button still works.
    if (myOtherTabInVoice()) return;
    if (client instanceof ExtVoice) {
      // Eklenti katılmak için üye kimliğimi ve odadakileri bilmeli.
      client.sync(members, myId());
      await client.join(true, micWanted()).catch(() => {});
    } else {
      const state = await navigator.permissions?.query({ name: 'microphone' as PermissionName }).then((s) => s.state, () => 'prompt');
      if (state !== 'granted') return;
      await client.join(micWanted()).catch(() => {});
    }
    client.sync(members, myId());
    render();
  }

  /** Is this member another connection of mine (same name and avatar)? */
  function isMyOtherTab(memberId: string): boolean {
    const me = members.find((m) => m.id === myId());
    const other = members.find((m) => m.id === memberId);
    return !!me && !!other && other.id !== me.id && other.name === me.name && (other.avatar ?? '') === (me.avatar ?? '');
  }

  /** Is the same person (same name and avatar, another connection) already in voice? */
  function myOtherTabInVoice(): boolean {
    const me = members.find((m) => m.id === myId());
    return !!me && members.some((m) => m.voice && m.id !== me.id && m.name === me.name && (m.avatar ?? '') === (me.avatar ?? ''));
  }

  // Kim konuşuyor: dinlediklerimin ses seviyesi (kendi sesim için mikrofon açıksa da göstermeyiz; yankı hissi olmasın).
  // Son sesten sonra kısa süre yanık kalır: kelime aralarında gösterge titremesin.
  const SPEAK_LEVEL = 0.04;
  const SPEAK_HOLD_MS = 600;
  const spokeAt = new Map<string, number>();
  setInterval(() => {
    if (!client.active) return;
    const now = Date.now();
    for (const [memberId, level] of allLevels()) if (level > SPEAK_LEVEL) spokeAt.set(memberId, now);
    for (const face of root.querySelectorAll<HTMLElement>('#voice-people [data-voice-id], .cam-tile[data-voice-id]')) {
      face.classList.toggle('speaking', now - (spokeAt.get(face.dataset.voiceId!) ?? 0) < SPEAK_HOLD_MS);
    }
  }, 250);

  // Real speech (not a click or a knock) for lowering the film's volume: sampled more often than the glow above.
  const speech = new SpeechDetector();
  setInterval(() => {
    if (!client.active) return;
    const now = Date.now();
    for (const [memberId, level] of allLevels()) speech.push(memberId, level, now);
  }, 100);

  return {
    /** Sunucu sesli sohbeti destekliyor mu (yeni bağlantıda). Yeniden bağlanınca ses de yeniden kurulur. */
    welcome(voice: boolean, nextMode: VoiceMode = 'p2p'): void {
      serverVoice = voice;
      available = serverVoice && (!isShell || extVoice);
      if (client instanceof ExtVoice) {
        // Ses eklentide sürüyor: yeni üye kimliğiyle bağlantılar baştan kurulur (mikrofon kalır).
        mode = nextMode;
        client.mode = mode;
        client.reconnected();
        render();
        // After this welcome's member list is in (room.ts sets it right after us): rejoin checks my other tabs.
        setTimeout(() => void rejoin(), 0);
        return;
      }
      const wasActive = client.active;
      const micWas = client.micEnabled;
      const camWas = client.camEnabled === true;
      client.leave();
      if (nextMode !== mode) {
        mode = nextMode;
        client = makeClient();
      }
      // Yeniden bağlandık (yeni üye kimliği): seste idiysek sessizce yeniden katıl (izin zaten verilmiş).
      // The camera comes back too (it used to stay off after a reconnect: "cameras come and go").
      if (wasActive && available)
        void joinVoice(micWas, true).then(
          async () => {
            client.sync(members, myId());
            if (camWas) await client.setCam?.(true).catch(() => {});
            render();
          },
          () => render(),
        );
      else setTimeout(() => void rejoin(), 0);
      render();
    },
    /** Kabuk: eklenti sesi destekliyor (shell.html söyler). */
    caps(voice: boolean, cam: boolean): void {
      extVoice = voice;
      if (cam) ext?.enableCam();
      available = serverVoice && (!isShell || extVoice);
      render();
      void rejoin();
    },
    /** Eklentinin ses sayfasından gelen (kabukta). */
    extMessage(msg: VoiceDown): void {
      ext?.receive(msg);
    },
    /** Biri konuşuyor mu (film sesini kısmak için). */
    speaking(): boolean {
      return client.active && speech.anyone(Date.now());
    },
    /** Eşler arası seste bir üyeden gelen bağlantı mesajı. */
    signal(from: string, data: Signal): void {
      if (client instanceof ExtVoice) client.signal(from, data);
      else void p2p?.receive(from, data).catch(() => {});
    },
    members(next: Member[]): void {
      members = next;
      client.sync(members, myId());
      applyVolumes();
      render();
    },
    rtc(message: Extract<ServerMessage, { t: 'rtc' }>): void {
      const waiting = pending.get(message.id);
      if (!waiting) return;
      pending.delete(message.id);
      clearTimeout(waiting.timer);
      const { t: _t, id: _id, ...result } = message;
      waiting.resolve(result as RtcResult);
    },
    error(code: 'voice_full' | 'voice_unavailable'): void {
      client.leave();
      flashHint(joinButton, code === 'voice_full' ? t('voice.fullHint', { n: voiceMax(), max: voiceMax() }) : t(`error.${code}`), 7000);
      render();
    },
    /** Sunucu kamerayı kabul etmedi (aynı anda biri daha açtı): kamera kapanır, neden söylenir. */
    camFull(): void {
      void client.setCam?.(false).finally(() => render());
      flashHint(camButton, t('voice.camFullHint', { n: CAM_MAX, max: CAM_MAX }), 7000);
    },
    /** Sayfadan çıkarken mikrofonu bırak. Kabukta ses eklentide sürer (film sayfası değişse de kopmaz). */
    leave(): void {
      if (!(client instanceof ExtVoice)) client.leave();
    },
    /** Odadan çıkarıldım: ses her yerde (eklentide de) biter, kendiliğinden yeniden açılmaz. */
    end(): void {
      client.leave();
      remember(false);
      available = false;
      render();
    },
    relabel: render,
    /** Am I in voice, with the microphone on? */
    state(): { active: boolean; mic: boolean; cam: boolean } {
      return { active: client.active, mic: client.active && client.micEnabled, cam: client.camEnabled === true };
    },
    /** TV: join voice without a microphone (hear and see the others; nothing is sent). Peer-to-peer voice only. */
    async listen(): Promise<boolean> {
      if (client.active || !available || mode !== 'p2p' || !p2p) return client.active;
      await p2p.join(false, true);
      client.sync(members, myId());
      render();
      return true;
    },
    /** Join (button) or leave voice from outside the card (the phone remote). */
    toggleJoin(): void {
      (client.active ? leaveButton : joinButton).click();
    },
    toggleCam(): void {
      camButton.click();
    },
    /** Push-to-talk from the phone remote's big button. */
    talk(on: boolean): void {
      if (!client.active || client.micEnabled === on) return;
      client.setMic(on);
      playSound(on ? 'pttDown' : 'pttUp');
      render();
    },
    /** My TV plays the voices: this device stays silent (`true`) or plays them again. */
    silence(on: boolean): void {
      silenced = on;
      applyVolumes();
    },
    /** TV: volume of all voices, 0–1. */
    setMaster(volume: number): void {
      master = Math.min(1, Math.max(0, volume));
      applyVolumes();
    },
    /** Who is speaking right now (member ids), for the TV's faces. */
    speakers(): Set<string> {
      const now = Date.now();
      return new Set([...spokeAt].filter(([, at]) => now - at < SPEAK_HOLD_MS).map(([id]) => id));
    },
  };
}
