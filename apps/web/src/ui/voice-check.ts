import { CAM_CONSTRAINTS } from '@swm/shared/voice-p2p';
import { el } from '../dom.ts';
import { t } from '../i18n.ts';
import { load, save } from '../storage.ts';
import { confirmDialog } from './confirm.ts';

/**
 * Pre-join check (0.9.90.6, rest of camera layout 2): before joining voice a small window shows a camera preview, a
 * bar that moves with my voice, and which microphone / camera / speaker to use, plus "join muted" and "join with my
 * camera on" (like Meet). "Don't ask again" skips it; my own person menu opens it again ("🎛"). The choices live in this
 * browser: `opt:micDevice`, `opt:camDevice`, `opt:speakerDevice`, `opt:joinMuted`, `opt:joinCam`, `opt:voiceCheck`.
 * Not in the shell: there voice runs in the extension's offscreen page with the default devices.
 */
const MIC_KEY = 'opt:micDevice';
const CAM_KEY = 'opt:camDevice';
const SPEAKER_KEY = 'opt:speakerDevice';
const AUDIO: MediaTrackConstraints = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };

type SinkElement = HTMLMediaElement & { setSinkId?: (id: string) => Promise<void> };
const canPickSpeaker = typeof (HTMLMediaElement.prototype as SinkElement).setSinkId === 'function';

/** getUserMedia with the chosen device; the default one if that device is gone (unplugged headset). */
async function open(kind: 'audio' | 'video', base: MediaTrackConstraints, key: string, id = load(key) ?? ''): Promise<MediaStream> {
  const other = kind === 'audio' ? 'video' : 'audio';
  if (id) {
    try {
      return await navigator.mediaDevices.getUserMedia({ [kind]: { ...base, deviceId: { exact: id } }, [other]: false });
    } catch (error) {
      if (!(error instanceof DOMException) || (error.name !== 'OverconstrainedError' && error.name !== 'NotFoundError')) throw error;
    }
  }
  return navigator.mediaDevices.getUserMedia({ [kind]: base, [other]: false });
}

export const openMic = (id?: string) => open('audio', AUDIO, MIC_KEY, id);
export const openCam = (id?: string) => open('video', CAM_CONSTRAINTS, CAM_KEY, id);

/** Voices play through the chosen speaker (where the browser allows choosing). */
export function applySpeaker(audio: HTMLMediaElement, id = load(SPEAKER_KEY) ?? ''): void {
  const sink = audio as SinkElement;
  if (canPickSpeaker && id) void sink.setSinkId?.(id).catch(() => {});
}

export interface VoiceChoice {
  /** Join with the microphone on. */
  mic: boolean;
  /** Join with the camera on. */
  cam: boolean;
  /** A device changed (only in the settings form, while in voice: the voice is rebuilt). */
  changed: boolean;
}

/**
 * `join`: before joining (skipped after "don't ask again"; resolves null on "Vazgeç"). `settings`: from my person menu,
 * only the devices and whether to ask before joining.
 */
/** `cam`: joining from a 📷 button (the dock, the Shorts bar) ticks "join with my camera on" for this time only. */
export async function voiceCheck(opts: { mode: 'join' | 'settings'; canCam: boolean; cam?: boolean }): Promise<VoiceChoice | null> {
  const join = opts.mode === 'join';
  const remembered = { mic: load('opt:joinMuted') !== '1', cam: opts.canCam && (opts.cam ?? load('opt:joinCam') === '1') };
  if (join && load('opt:voiceCheck') === 'skip') return { ...remembered, changed: false };

  const before = { mic: load(MIC_KEY) ?? '', cam: load(CAM_KEY) ?? '', speaker: load(SPEAKER_KEY) ?? '' };
  const preview = el('video', { class: 'voice-check-video', autoplay: '', playsinline: '', 'aria-hidden': 'true' }) as HTMLVideoElement;
  preview.muted = true;
  const camOff = el('div', { class: 'voice-check-off' }, `📷 ${t('voiceCheck.camOff')}`);
  const level = el('i');
  const meter = el('span', { class: 'voice-check-level', 'aria-hidden': 'true' }, level);
  const note = el('p', { class: 'voice-check-note small', role: 'status' });
  const select = (label: string) => {
    const s = el('select', { class: 'voice-check-select', 'aria-label': label }) as HTMLSelectElement;
    return { s, row: el('label', { class: 'voice-check-row' }, el('span', {}, label), s) };
  };
  const micSel = select(`🎙 ${t('voiceCheck.mic')}`);
  const camSel = select(`📷 ${t('voiceCheck.cam')}`);
  const speakerSel = select(`🔈 ${t('voiceCheck.speaker')}`);
  camSel.row.hidden = !opts.canCam;
  speakerSel.row.hidden = !canPickSpeaker;
  const box = (text: string, checked: boolean) => {
    const input = el('input', { type: 'checkbox' }) as HTMLInputElement;
    input.checked = checked;
    return { input, row: el('label', { class: 'voice-check-toggle small' }, input, el('span', {}, text)) };
  };
  const muted = box(t('voiceCheck.muted'), !remembered.mic);
  const withCam = box(t('voiceCheck.withCam'), remembered.cam);
  withCam.row.hidden = !opts.canCam;
  const ask = box(t('voiceCheck.ask'), load('opt:voiceCheck') !== 'skip');
  const shown = el('div', { class: 'voice-check-preview' }, preview, camOff, meter);
  const extra = el(
    'div',
    { class: 'voice-check' },
    shown,
    note,
    micSel.row,
    camSel.row,
    speakerSel.row,
    join ? muted.row : '',
    join ? withCam.row : '',
    ask.row,
  );

  let mic: MediaStream | null = null;
  let cam: MediaStream | null = null;
  let audio: AudioContext | null = null;
  let frame = 0;
  let closed = false;
  const stop = (stream: MediaStream | null) => stream?.getTracks().forEach((track) => track.stop());

  /** The bar moves with my voice (the same check as the 🎙 bar in the card). */
  async function startMic(): Promise<void> {
    stop(mic);
    mic = null;
    try {
      mic = await openMic(micSel.s.value || undefined);
    } catch (error) {
      const denied = error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'SecurityError');
      note.textContent = t(denied ? 'voice.denied' : 'voice.failed');
      return;
    }
    if (closed) return stop(mic);
    note.textContent = '';
    audio ??= new AudioContext();
    const analyser = audio.createAnalyser();
    analyser.fftSize = 512;
    audio.createMediaStreamSource(mic).connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    cancelAnimationFrame(frame);
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let peak = 0;
      for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
      level.style.width = `${Math.min(100, Math.round((peak / 64) * 100))}%`;
      frame = requestAnimationFrame(tick);
    };
    tick();
  }

  /** The camera only opens for the preview when "join with my camera on" is ticked (or in the settings form). */
  async function startCam(): Promise<void> {
    stop(cam);
    cam = null;
    preview.srcObject = null;
    const want = opts.canCam && (join ? withCam.input.checked : true);
    camOff.hidden = want;
    // Without a camera picture the preview is only a strip with my voice level.
    shown.classList.toggle('off', !want);
    if (!want) return;
    try {
      cam = await openCam(camSel.s.value || undefined);
    } catch {
      camOff.hidden = false;
      camOff.textContent = `📷 ${t('voice.camDenied')}`;
      return;
    }
    if (closed) return stop(cam);
    preview.srcObject = cam;
    void preview.play().catch(() => {});
  }

  /** Device names only come after a permission: filled once the microphone (and camera) opened. */
  async function fillDevices(): Promise<void> {
    const devices = await navigator.mediaDevices.enumerateDevices().catch(() => [] as MediaDeviceInfo[]);
    const fill = (s: HTMLSelectElement, kind: MediaDeviceKind, saved: string) => {
      const list = devices.filter((d) => d.kind === kind && d.deviceId);
      const current = s.value || saved;
      s.replaceChildren(
        el('option', { value: '' }, t('voiceCheck.default')),
        ...list.filter((d) => d.deviceId !== 'default').map((d, i) => el('option', { value: d.deviceId }, d.label || `${t('voiceCheck.device')} ${i + 1}`)),
      );
      s.value = list.some((d) => d.deviceId === current) ? current : '';
    };
    fill(micSel.s, 'audioinput', before.mic);
    fill(camSel.s, 'videoinput', before.cam);
    fill(speakerSel.s, 'audiooutput', before.speaker);
  }

  micSel.s.addEventListener('change', () => void startMic());
  camSel.s.addEventListener('change', () => void startCam());
  withCam.input.addEventListener('change', () => void startCam().then(fillDevices));
  void (async () => {
    // Saved choices first, so the right device opens straight away.
    await fillDevices();
    await startMic();
    await startCam();
    await fillDevices();
  })();

  const ok = await confirmDialog({
    icon: '🎙',
    title: t(join ? 'voiceCheck.title' : 'voiceCheck.settingsTitle'),
    text: t(join ? 'voiceCheck.text' : 'voiceCheck.settingsText'),
    yes: t(join ? 'voiceCheck.join' : 'voiceCheck.save'),
    extra,
  });
  closed = true;
  cancelAnimationFrame(frame);
  stop(mic);
  stop(cam);
  void (audio as AudioContext | null)?.close().catch(() => {});
  if (!ok) return null;
  save(MIC_KEY, micSel.s.value);
  save(CAM_KEY, camSel.s.value);
  save(SPEAKER_KEY, speakerSel.s.value);
  save('opt:voiceCheck', ask.input.checked ? '' : 'skip');
  if (join) {
    save('opt:joinMuted', muted.input.checked ? '1' : '0');
    if (opts.canCam && opts.cam === undefined) save('opt:joinCam', withCam.input.checked ? '1' : '0');
  }
  const changed = micSel.s.value !== before.mic || camSel.s.value !== before.cam || speakerSel.s.value !== before.speaker;
  return { mic: join ? !muted.input.checked : remembered.mic, cam: join ? opts.canCam && withCam.input.checked : remembered.cam, changed };
}
