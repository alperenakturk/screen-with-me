import { CAM_CONSTRAINTS } from '@swm/shared/voice-p2p';
import { load, save } from '../storage.ts';
import type { DevicePicks } from '@swm/shared/shell';

/**
 * The chosen microphone / camera / speaker (card SZ: the small helpers the room needs from its first paint; the
 * pre-join check window itself, `voice-check.ts`, is a lazy chunk loaded on the first press).
 */
export const MIC_KEY = 'opt:micDevice';
export const CAM_KEY = 'opt:camDevice';
export const SPEAKER_KEY = 'opt:speakerDevice';
/**
 * The same choices by name (0.9.91.14): device ids differ per site, so the film page's voice (in the extension) finds
 * the device with that name. Shared with the extension like every setting.
 */
export const MIC_NAME = 'opt:micName';
export const CAM_NAME = 'opt:camName';
export const SPEAKER_NAME = 'opt:speakerName';

export const permission = (name: 'microphone' | 'camera'): Promise<PermissionState | 'unknown'> =>
  navigator.permissions?.query({ name: name as PermissionName }).then((s) => s.state, () => 'unknown' as const) ?? Promise.resolve('unknown' as const);

/**
 * Choices made before names were kept (before 0.9.91.14): look the names up once (only possible with the permission,
 * which a chosen device implies), so the film page uses the same devices.
 */
export function rememberDeviceNames(): void {
  const pairs: [string, string, MediaDeviceKind][] = [
    [MIC_KEY, MIC_NAME, 'audioinput'],
    [CAM_KEY, CAM_NAME, 'videoinput'],
    [SPEAKER_KEY, SPEAKER_NAME, 'audiooutput'],
  ];
  if (!pairs.some(([id, name]) => load(id) && load(name) === null)) return;
  void navigator.mediaDevices
    ?.enumerateDevices()
    .then((list) => {
      for (const [idKey, nameKey, kind] of pairs) {
        const id = load(idKey);
        if (!id || load(nameKey) !== null) continue;
        const label = list.find((d) => d.kind === kind && d.deviceId === id)?.label;
        if (label) save(nameKey, label);
      }
    })
    .catch(() => {});
}

/** My chosen devices by name ('' = the default one). */
export function devicePicks(): DevicePicks {
  return { mic: load(MIC_NAME) ?? '', cam: load(CAM_NAME) ?? '', speaker: load(SPEAKER_NAME) ?? '' };
}
export const chosenName = (s: HTMLSelectElement) => (s.value ? (s.selectedOptions[0]?.textContent ?? '') : '');
export const AUDIO: MediaTrackConstraints = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };

type SinkElement = HTMLMediaElement & { setSinkId?: (id: string) => Promise<void> };
export const canPickSpeaker = typeof (HTMLMediaElement.prototype as SinkElement).setSinkId === 'function';

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

