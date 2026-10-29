/**
 * Screen share with my camera in the corner (0.9.90.8, owner's request: "a plain camera stream is pointless, voice
 * already has cameras; let a screen stream show my camera too"). The screen's frames drive the picture: every screen
 * frame is drawn with the latest camera frame in the bottom-right corner (Chrome's MediaStreamTrackProcessor /
 * MediaStreamTrackGenerator), so the stream keeps going while this tab is in the background — timers and
 * requestAnimationFrame would be throttled there and the stream would freeze. Where the browser lacks them the screen
 * goes out alone (`supported` is false and the option is hidden).
 */
interface TrackProcessor {
  readable: ReadableStream<VideoFrame>;
}
interface TrackGenerator extends MediaStreamTrack {
  writable: WritableStream<VideoFrame>;
}
type ProcessorCtor = new (init: { track: MediaStreamTrack }) => TrackProcessor;
type GeneratorCtor = new (init: { kind: 'video' }) => TrackGenerator;

const scope = globalThis as unknown as { MediaStreamTrackProcessor?: ProcessorCtor; MediaStreamTrackGenerator?: GeneratorCtor };

export const composeSupported = typeof scope.MediaStreamTrackProcessor === 'function' && typeof scope.MediaStreamTrackGenerator === 'function' && typeof OffscreenCanvas === 'function';

/** Share of the picture's width the camera takes, and its margin. */
const CAM_SHARE = 0.22;
const MARGIN = 0.02;

export interface Composed {
  stream: MediaStream;
  /** The real screen track (quality changes go to it: the picture follows its frames). */
  screen: MediaStreamTrack;
  /** Stops the camera, the screen and the drawing (the stream's own tracks are stopped by the caller). */
  close(): void;
}

/**
 * `screen` and `camera` are live streams; the result has the composed video and the screen's audio. When the screen
 * share ends (the browser's "Stop sharing"), the composed track fires `ended` like a real one.
 */
export function composeScreenWithCamera(screen: MediaStream, camera: MediaStream): Composed {
  const screenTrack = screen.getVideoTracks()[0]!;
  const camTrack = camera.getVideoTracks()[0];
  const Processor = scope.MediaStreamTrackProcessor!;
  const Generator = scope.MediaStreamTrackGenerator!;
  const generator = new Generator({ kind: 'video' });
  const canvas = new OffscreenCanvas(1280, 720);
  const ctx = canvas.getContext('2d')!;
  let face: VideoFrame | null = null;
  let closed = false;

  // The newest camera frame, kept until the next one arrives.
  if (camTrack) {
    const reader = new Processor({ track: camTrack }).readable.getReader();
    void (async () => {
      for (;;) {
        const { value, done } = await reader.read().catch(() => ({ value: undefined, done: true }));
        if (done || !value) break;
        if (closed) {
          value.close();
          break;
        }
        face?.close();
        face = value;
      }
    })();
  }

  const draw = new TransformStream<VideoFrame, VideoFrame>({
    transform(frame, controller) {
      const w = frame.displayWidth;
      const h = frame.displayHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.drawImage(frame, 0, 0, w, h);
      if (face) {
        const fw = Math.round(w * CAM_SHARE);
        const fh = Math.round((fw * face.displayHeight) / Math.max(1, face.displayWidth));
        const x = Math.round(w - fw - w * MARGIN);
        const y = Math.round(h - fh - w * MARGIN);
        const r = Math.round(fw * 0.06);
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x, y, fw, fh, r);
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = Math.round(fw * 0.05);
        ctx.fillStyle = '#000';
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.clip();
        ctx.drawImage(face, x, y, fw, fh);
        ctx.restore();
      }
      const out = new VideoFrame(canvas, { timestamp: frame.timestamp });
      frame.close();
      controller.enqueue(out);
    },
  });
  void new Processor({ track: screenTrack }).readable.pipeThrough(draw).pipeTo(generator.writable).catch(() => {});

  const close = () => {
    if (closed) return;
    closed = true;
    for (const track of [...screen.getTracks(), ...camera.getTracks()]) track.stop();
    face?.close();
    face = null;
  };
  // The browser's "Stop sharing": the composed track ends like the screen's own would (LiveP2p listens for it).
  screenTrack.addEventListener('ended', () => {
    close();
    generator.stop();
    generator.dispatchEvent(new Event('ended'));
  });

  return { stream: new MediaStream([generator, ...screen.getAudioTracks()]), screen: screenTrack, close };
}
