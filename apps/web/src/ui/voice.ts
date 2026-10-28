import { CAM_MAX, VOICE_MAX, VOICE_MAX_P2P, type ClientMessage, type Member, type RtcRequest, type RtcResult, type ServerMessage, type Signal, type VoiceMode } from '@swm/shared/protocol';
import { isPushToTalkKey } from '@swm/shared/embed';
import type { VoiceDown } from '@swm/shared/shell';
import { VoiceClient, type Voice } from '@swm/shared/voice';
import { LevelMeter } from '@swm/shared/level-meter';
import { SpeechDetector } from '@swm/shared/speech-detector';
import { P2pVoice } from '@swm/shared/voice-p2p';
import { el } from '../dom.ts';
import { t } from '../i18n.ts';
import { load, postToExtension, save } from '../storage.ts';
import { avatarNode } from './avatar.ts';
import { createCamWindow } from './cam-float.ts';
import { flashHint } from './hint.ts';
import { confirmIpNotice } from './ip-notice.ts';
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

export function createVoice(root: HTMLElement, send: (message: ClientMessage) => void, myId: () => string | null, roomId: string, isShell: boolean) {
  const card = root.querySelector<HTMLElement>('#voice-card')!;
  const joinButton = root.querySelector<HTMLButtonElement>('#voice-join')!;
  const onBox = root.querySelector<HTMLElement>('#voice-on')!;
  const micButton = root.querySelector<HTMLButtonElement>('#voice-mic')!;
  // Düğmenin içi: simge ve altında kendi sesimin seviye çubuğu ("mikrofonum sesimi alıyor mu").
  const micIcon = el('span', {}, '🎙');
  const micBar = el('i');
  micButton.replaceChildren(micIcon, el('span', { class: 'mic-level', 'aria-hidden': 'true' }, micBar));
  const leaveButton = root.querySelector<HTMLButtonElement>('#voice-leave')!;
  const peopleBox = root.querySelector<HTMLElement>('#voice-people')!;
  const camButton = root.querySelector<HTMLButtonElement>('#voice-cam')!;
  const limitEl = root.querySelector<HTMLElement>('#voice-limit')!;
  const camsBox = root.querySelector<HTMLElement>('#voice-cams')!;
  // Kameralar kartta, sayfada yüzen pencerede ya da tam ekranda videonun içinde (sürüklenir, boyutlandırılır).
  const camWindow = createCamWindow({
    box: camsBox,
    theater: root.querySelector<HTMLElement>('#theater')!,
    wrap: root.querySelector<HTMLElement>('.player-wrap')!,
    onMove: () => dispatchEvent(new Event('swm-layout')),
  });
  const hint = root.querySelector<HTMLElement>('#voice-hint')!;
  // "People in voice can see your IP · Why?" (peer-to-peer only; Cloudflare's server hides addresses).
  const ipLine = root.querySelector<HTMLElement>('#voice-ip')!;
  const ipWhy = root.querySelector<HTMLButtonElement>('#voice-ip-why')!;
  ipWhy.addEventListener('click', () => flashHint(ipWhy, t('ipNotice.whyText'), 12_000));
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
    audio.muted = isMyOtherTab(memberId);
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
    if (mode === 'sfu') return new VoiceClient({ rpc, announce, onRemote });
    p2p = new P2pVoice({
      signal: (to, data) => send({ t: 'signal', to, data }),
      announce,
      onRemote,
      onRemoteVideo,
      onFailed: failed,
    });
    return p2p;
  };
  let client: Voice = makeClient();
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
    micIcon.textContent = client.micEnabled ? '🎙' : '🔇';
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
        if (m.voice && !m.voice.mic) face.append(el('span', { class: 'voice-muted' }, '🔇'));
        const label = m.id === me ? t('voice.me') : m.name;
        return el('span', { class: 'together-person', title: m.voice ? `${m.name} · ${t('voice.inVoice')}` : m.name }, face, el('span', { class: 'together-name' }, label));
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
    renderCams();
  }

  // ---- Kameralar: tek kutu takımı; kartta, yüzen pencerede ya da tam ekranda videonun içinde (cam-float.ts) ----
  /** Üye → kutu (her çizimde yeniden yaratılmaz: görüntü titremesin). */
  const tiles = new Map<string, HTMLElement>();
  function tile(memberId: string, name: string, stream: MediaStream, mine: boolean): HTMLElement {
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
    return box;
  }
  function renderCams(): void {
    const me = myId();
    const shown: HTMLElement[] = [];
    const keep = new Set<string>();
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
        const stream = member.id === me ? (client.camera ?? null) : (videos.get(member.id) ?? null);
        if (!stream) continue;
        keep.add(member.id);
        shown.push(tile(member.id, member.name, stream, member.id === me));
      }
    }
    for (const id of [...tiles.keys()]) if (!keep.has(id)) tiles.delete(id);
    camWindow.grid.replaceChildren(...shown);
    camsBox.hidden = shown.length === 0;
    camWindow.update(shown.length);
  }

  /** Bu odada seste en fazla kaç kişi (eşler arası 6, Cloudflare yolunda 10). */
  function voiceMax(): number {
    return mode === 'sfu' ? VOICE_MAX : VOICE_MAX_P2P;
  }

  joinButton.addEventListener('click', async () => {
    const inVoice = members.filter((m) => m.voice).length;
    if (inVoice >= voiceMax()) {
      flashHint(joinButton, t('voice.fullHint', { n: inVoice, max: voiceMax() }), 7000);
      return;
    }
    if (mode === 'p2p') {
      const others = members.filter((m) => m.voice && m.id !== myId()).map((m) => m.name);
      if (!(await confirmIpNotice('voice', others))) return;
    }
    joinButton.disabled = true;
    try {
      client.sync(members, myId());
      await client.join();
      remember(true);
      save(micKey, '1');
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
    // Remembered for this room: a reload or a reconnect must never switch a muted microphone back on.
    save(micKey, client.micEnabled ? '1' : '0');
    render();
  });
  // Bas-konuş: tuş ya da 🎙 basılı tutulurken konuşulur; pencereden çıkınca (tuş bırakılmadan) kapanır.
  function talk(on: boolean): void {
    if (!ptt || !client.active || talking === on) return;
    talking = on;
    client.setMic(on);
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
        void client.join(micWas).then(
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
      // My other tab in voice must not play my own voice back here.
      for (const [memberId, audio] of audios) audio.muted = isMyOtherTab(memberId);
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
  };
}
