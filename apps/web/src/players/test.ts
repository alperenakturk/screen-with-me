import type { PlayerAdapter, PlayerEvent } from '@swm/shared/player';

/** Test "videosunun" süresi (saniye). */
export const TEST_DURATION = 12;

/**
 * Senkron testi: dosya yok, sitenin çizdiği 12 saniyelik bir sayaç. Kocaman saniye sayısı,
 * her saniye soldan sağa geçen çizgi ve dönen halka: iki ekran yan yana tutulunca aynı
 * yerde oldukları gözle görülür. <video> gibi davranır (oynat/durdur/sar/hız ve olaylar),
 * böylece senkron motoru onu da gerçek bir video gibi yönetir. Tıklamak oynat/durdur yapar.
 */
export function createTestPlayer(container: HTMLElement): PlayerAdapter {
  const canvas = document.createElement('canvas');
  canvas.className = 'test-player';
  container.append(canvas);
  const ctx = canvas.getContext('2d')!;
  const listeners: Array<(event: PlayerEvent) => void> = [];
  let base = 0; // durduğu ya da son değiştiği andaki konum
  let since = performance.now();
  let playing = false;
  let rate = 1;
  let frame = 0;

  const emit = (event: PlayerEvent) => queueMicrotask(() => listeners.forEach((l) => l(event)));
  const now = () => (playing ? Math.min(TEST_DURATION, base + ((performance.now() - since) / 1000) * rate) : base);
  const settle = () => {
    base = now();
    since = performance.now();
  };

  function draw(): void {
    frame = requestAnimationFrame(draw);
    const w = (canvas.width = canvas.clientWidth * devicePixelRatio || 640);
    const h = (canvas.height = canvas.clientHeight * devicePixelRatio || 360);
    const t = now();
    if (playing && t >= TEST_DURATION) {
      settle();
      playing = false;
      emit('pause');
    }
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#1b1450');
    g.addColorStop(1, '#3a1f66');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // Her saniye soldan sağa geçen çizgi (iki ekranda aynı yerde olmalı)
    const frac = t % 1;
    ctx.fillStyle = 'rgb(255 210 122 / 0.9)';
    ctx.fillRect(frac * w - 3 * devicePixelRatio, 0, 6 * devicePixelRatio, h);
    // Dönen halka: tüm sürenin ilerlemesi
    const r = Math.min(w, h) * 0.32;
    ctx.lineWidth = 10 * devicePixelRatio;
    ctx.strokeStyle = 'rgb(255 255 255 / 0.15)';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#8b6cff';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, r, -Math.PI / 2, -Math.PI / 2 + (t / TEST_DURATION) * Math.PI * 2);
    ctx.stroke();
    // Kocaman saniye
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 ${Math.round(r * 0.75)}px system-ui, sans-serif`;
    ctx.fillText(t.toFixed(1), w / 2, h / 2);
    ctx.font = `600 ${Math.round(r * 0.14)}px system-ui, sans-serif`;
    ctx.fillStyle = 'rgb(255 255 255 / 0.75)';
    ctx.fillText(playing ? '' : '⏸', w / 2, h / 2 + r * 0.55);
  }
  draw();
  canvas.addEventListener('click', () => {
    if (playing) adapter.pause();
    else void adapter.play();
  });

  const adapter: PlayerAdapter = {
    fineRate: true,
    getTime: now,
    getDuration: () => TEST_DURATION,
    isPaused: () => !playing,
    isEnded: () => now() >= TEST_DURATION,
    canPlayThrough: () => true,
    getRate: () => rate,
    play: async () => {
      if (now() >= TEST_DURATION) base = 0;
      if (!playing) {
        settle();
        playing = true;
        emit('play');
      }
      return 'ok';
    },
    pause: () => {
      if (!playing) return;
      settle();
      playing = false;
      emit('pause');
    },
    seek: (seconds) => {
      base = Math.max(0, Math.min(TEST_DURATION, seconds));
      since = performance.now();
    },
    setRate: (next) => {
      if (next === rate) return;
      settle();
      rate = next;
      emit('ratechange');
    },
    onEvent: (listener) => {
      listeners.push(listener);
    },
    destroy: () => {
      cancelAnimationFrame(frame);
      listeners.length = 0;
      container.replaceChildren();
    },
  };
  return adapter;
}
