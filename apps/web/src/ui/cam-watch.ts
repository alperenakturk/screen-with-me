// CAM1 (owner's test with a friend: "a friend on a phone sometimes went black"): every camera picture on the page is
// watched once a second. A paused picture is played again (phones pause a <video> when the page was hidden or its
// track was muted), a picture whose track comes back (`unmute`) is played at once, and one that shows no new frame
// for a while gets a note over it ("camera changing…" while that person switches cameras, otherwise "waiting for the
// picture…") and is attached again (a fresh `srcObject` makes WebKit draw a track that was muted when it was
// attached). Nothing is sent anywhere; the 🐞 Test Lab reads `camStates()`.
import { t } from '../i18n.ts';

interface Watch {
  /** Where the note goes (positioned; the picture's tile). */
  host: HTMLElement;
  /** A note that wins over the frame check (e.g. "camera changing…"), or null. */
  note: () => string | null;
  /** Who the picture is (for the Test Lab). */
  label: string;
  frames: number;
  time: number;
  lastFrameAt: number;
  reattachedAt: number;
  track: MediaStreamTrack | null;
}

/** No new frame for this long = the picture is stuck (the camera sends 15 a second). */
const STALL_MS = 2000;
/** Attach a stuck picture again after this long, and not more often. */
const REATTACH_MS = 5000;

const watched = new Map<HTMLVideoElement, Watch>();
let timer: ReturnType<typeof setInterval> | null = null;

function frameCount(video: HTMLVideoElement): number {
  return video.getVideoPlaybackQuality?.().totalVideoFrames ?? 0;
}

function replay(video: HTMLVideoElement): void {
  if (video.paused && video.srcObject) void video.play().catch(() => {});
}

function check(video: HTMLVideoElement, watch: Watch, now: number): void {
  const stream = video.srcObject instanceof MediaStream ? video.srcObject : null;
  const track = stream?.getVideoTracks()[0] ?? null;
  if (track !== watch.track) {
    watch.track = track;
    watch.lastFrameAt = now;
    track?.addEventListener('unmute', () => replay(video));
  }
  // A hidden picture (another layout shows it) draws no frames: nothing to judge.
  const shown = video.getClientRects().length > 0;
  const frames = frameCount(video);
  if (frames !== watch.frames || video.currentTime !== watch.time) {
    watch.frames = frames;
    watch.time = video.currentTime;
    watch.lastFrameAt = now;
  }
  if (!shown || !track) {
    watch.lastFrameAt = now;
    setNote(watch, watch.note());
    return;
  }
  replay(video);
  const stuck = now - watch.lastFrameAt > STALL_MS || track.readyState === 'ended';
  if (stuck && track.readyState === 'live' && now - watch.lastFrameAt > REATTACH_MS && now - watch.reattachedAt > REATTACH_MS) {
    watch.reattachedAt = now;
    video.srcObject = null;
    video.srcObject = stream;
    replay(video);
  }
  setNote(watch, watch.note() ?? (stuck ? t('voice.camWaiting') : null));
}

function setNote(watch: Watch, note: string | null): void {
  if (note) watch.host.dataset.camNote = note;
  else delete watch.host.dataset.camNote;
}

function tick(): void {
  if (document.hidden) return;
  const now = performance.now();
  for (const [video, watch] of [...watched]) {
    if (!video.isConnected) {
      // Taken out of the page for a moment (a redraw puts it back): forget it only when it has no picture.
      if (!video.srcObject) watched.delete(video);
      continue;
    }
    check(video, watch, now);
  }
  if (!watched.size && timer) {
    clearInterval(timer);
    timer = null;
  }
}

/** Who is switching cameras right now (member ids; the voice card keeps it current). */
const switchingIds = new Set<string>();
export function markSwitching(ids: Iterable<string>): void {
  switchingIds.clear();
  for (const id of ids) switchingIds.add(id);
}
/** "Camera changing…" for that person's picture while they switch, otherwise null (the frame check decides). */
export const switchNote = (memberId: string): string | null => (switchingIds.has(memberId) ? t('voice.camChanging') : null);

/** Watch a camera picture (`host` gets the note; `note` may force one, e.g. "camera changing…"). */
export function watchCamVideo(video: HTMLVideoElement, host: HTMLElement, label: string, note: () => string | null = () => null): void {
  const known = watched.get(video);
  if (known) {
    known.host = host;
    known.note = note;
    known.label = label;
    return;
  }
  watched.set(video, { host, note, label, frames: -1, time: -1, lastFrameAt: performance.now(), reattachedAt: 0, track: null });
  timer ??= setInterval(tick, 1000);
}

/** Stop watching (the picture is gone for good). */
export function unwatchCamVideo(video: HTMLVideoElement): void {
  const watch = watched.get(video);
  if (watch) setNote(watch, null);
  watched.delete(video);
}

/** Back from the background: every picture plays again at once (not on the next tick). */
document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  for (const video of watched.keys()) replay(video);
  tick();
});

/** 🐞 Test Lab: each picture on screen, its state and how long since its last frame. */
export function camStates(): { label: string; state: string; ms: number }[] {
  const now = performance.now();
  return [...watched]
    .filter(([video]) => video.isConnected && video.getClientRects().length > 0)
    .map(([video, w]) => ({
      label: w.label,
      state: w.host.dataset.camNote ? `note: ${w.host.dataset.camNote}` : video.paused ? 'paused' : (w.track?.muted ? 'muted' : 'playing'),
      ms: Math.round(now - w.lastFrameAt),
    }));
}
