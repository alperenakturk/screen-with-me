import type { ClientMessage, Member, RtcRequest, RtcResult, ServerMessage, Signal, VoiceMode } from '@swm/shared/protocol';
import { VoiceClient, type Voice } from '@swm/shared/voice';
import { P2pVoice } from '@swm/shared/voice-p2p';
import { el } from '../dom.ts';
import { t } from '../i18n.ts';
import { avatarNode } from './avatar.ts';
import { flashHint } from './hint.ts';

/** Sunucu bu sürede cevap vermezse bağlantı işi başarısız sayılır. */
const RPC_TIMEOUT_MS = 12_000;

/**
 * Sesli sohbet kartı (sağ panelde, davet linkinin altında): "🎙 Sese katıl", katılınca 🎙/🔇 ve "Ayrıl";
 * seste olanların avatarları (konuşanın çevresi parlar). Katılmayan kimseyi duymaz (sürpriz ses yok).
 * Taşıma yolu sunucudan gelir: eşler arası (varsayılan, ücretsiz) ya da Cloudflare Realtime (anahtar varsa).
 * Şimdilik sadece sitede; film sayfasındaki katmanda (eklenti) mikrofon izni film sitesinin adına sorulduğu için
 * kapalı (bkz. docs/internal/ses-goruntu.md, 2. aşama).
 */
export function createVoice(root: HTMLElement, send: (message: ClientMessage) => void, myId: () => string | null) {
  const card = root.querySelector<HTMLElement>('#voice-card')!;
  const joinButton = root.querySelector<HTMLButtonElement>('#voice-join')!;
  const onBox = root.querySelector<HTMLElement>('#voice-on')!;
  const micButton = root.querySelector<HTMLButtonElement>('#voice-mic')!;
  const leaveButton = root.querySelector<HTMLButtonElement>('#voice-leave')!;
  const peopleBox = root.querySelector<HTMLElement>('#voice-people')!;
  const hint = root.querySelector<HTMLElement>('#voice-hint')!;

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

  const announce = (on: boolean, mic?: boolean) => send(on ? { t: 'voice', on, mic: mic ?? true } : { t: 'voice', on: false });
  const onRemote = (memberId: string, stream: MediaStream | null) => {
    audios.get(memberId)?.remove();
    audios.delete(memberId);
    if (!stream) return;
    // Görünmez <audio>: tarayıcı çalar (katılırken tıklandığı için otomatik oynatma engeline takılmaz).
    const audio = el('audio', { autoplay: '' }) as HTMLAudioElement;
    audio.srcObject = stream;
    audio.hidden = true;
    document.body.append(audio);
    void audio.play().catch(() => {});
    audios.set(memberId, audio);
  };
  let mode: VoiceMode = 'p2p';
  let p2p: P2pVoice | null = null;
  const makeClient = (): Voice => {
    if (mode === 'sfu') return new VoiceClient({ rpc, announce, onRemote });
    p2p = new P2pVoice({
      signal: (to, data) => send({ t: 'signal', to, data }),
      announce,
      onRemote,
      onFailed: (memberId) => {
        const who = members.find((m) => m.id === memberId)?.name ?? '';
        flashHint(peopleBox, t('voice.p2pFailed', { name: who }), 7000);
      },
    });
    return p2p;
  };
  let client: Voice = makeClient();

  function render(): void {
    card.hidden = !available;
    const active = client.active;
    joinButton.hidden = active;
    onBox.hidden = !active;
    micButton.textContent = client.micEnabled ? '🎙' : '🔇';
    const micLabel = client.micEnabled ? t('voice.mute') : t('voice.unmute');
    micButton.title = micLabel;
    micButton.setAttribute('aria-label', micLabel);
    micButton.classList.toggle('muted-mic', !client.micEnabled);
    const inVoice = members.filter((m) => m.voice);
    peopleBox.replaceChildren(
      ...inVoice.map((m) => {
        const face = el('span', { class: 'voice-face', title: m.name, 'data-voice-id': m.id }, avatarNode(m.avatar, 'voice-avatar'));
        if (m.voice && !m.voice.mic) face.append(el('span', { class: 'voice-muted' }, '🔇'));
        return face;
      }),
    );
    peopleBox.title = inVoice.length ? `${t('voice.inVoice')}: ${inVoice.map((m) => m.name).join(', ')}` : '';
  }

  joinButton.addEventListener('click', async () => {
    joinButton.disabled = true;
    try {
      await client.join();
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
    client.setMic(!client.micEnabled);
    render();
  });
  leaveButton.addEventListener('click', () => {
    client.leave();
    render();
  });

  // Kim konuşuyor: dinlediklerimin ses seviyesi (kendi sesim için mikrofon açıksa da göstermeyiz; yankı hissi olmasın).
  setInterval(() => {
    if (!client.active) return;
    const levels = client.levels();
    for (const face of peopleBox.querySelectorAll<HTMLElement>('[data-voice-id]')) {
      face.classList.toggle('speaking', (levels.get(face.dataset.voiceId!) ?? 0) > 0.04);
    }
  }, 250);

  return {
    /** Sunucu sesli sohbeti destekliyor mu (yeni bağlantıda). Yeniden bağlanınca ses de yeniden kurulur. */
    welcome(voice: boolean, nextMode: VoiceMode = 'p2p'): void {
      available = voice;
      const wasActive = client.active;
      client.leave();
      if (nextMode !== mode) {
        mode = nextMode;
        client = makeClient();
      }
      // Yeniden bağlandık (yeni üye kimliği): seste idiysek sessizce yeniden katıl (izin zaten verilmiş).
      if (wasActive && available) void client.join().then(() => client.sync(members, myId()), () => render());
      render();
    },
    /** Eşler arası seste bir üyeden gelen bağlantı mesajı. */
    signal(from: string, data: Signal): void {
      void p2p?.receive(from, data).catch(() => {});
    },
    members(next: Member[]): void {
      members = next;
      client.sync(members, myId());
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
      flashHint(joinButton, t(`error.${code}`), 6000);
      render();
    },
    /** Sayfadan çıkarken mikrofonu bırak. */
    leave(): void {
      client.leave();
    },
    relabel: render,
  };
}
