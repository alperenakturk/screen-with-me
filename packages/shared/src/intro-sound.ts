// Açılış animasyonunun sesi: dosya yok, Web Audio ile o an üretilir (lisans/indirme derdi
// yok, ~0 KB). Zamanlama intro.ts'teki animasyonla eş: logo belirirken yumuşak bir "pop",
// "oynat"a basılırken hafif bir "tık", ⏸ ve yazı çıkarken tatlı, çan gibi bir akor.
// Tarayıcı sesi engellerse (sayfayla hiç etkileşim yoksa) sessizce vazgeçer.

type Ctx = BaseAudioContext;

/** Sesin genel yüksekliği; kulak tırmalamasın, arka planda kalsın. */
const VOLUME = 0.16;

export function playIntroSound(): void {
  const AC: typeof AudioContext | undefined =
    globalThis.AudioContext ?? (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  let ctx: AudioContext;
  try {
    ctx = new AC();
  } catch {
    return;
  }
  const start = () => {
    try {
      scheduleIntroSound(ctx);
    } catch {
      // Eski tarayıcıda bir düğüm desteklenmezse ses olmadan devam.
    }
    setTimeout(() => void ctx.close().catch(() => {}), 4000);
  };
  if (ctx.state === 'running') {
    start();
    return;
  }
  // Askıdaysa bir kez dene; kısa sürede açılmazsa sessiz kal (geç gelen ses tuhaf olur).
  let done = false;
  void ctx.resume().then(() => {
    if (done) return;
    done = true;
    start();
  }, () => {});
  setTimeout(() => {
    if (done) return;
    done = true;
    void ctx.close().catch(() => {});
  }, 250);
}

/** Sesleri verilen bağlama dizer (çevrimdışı bağlamla WAV'a da basılabilir). */
export function scheduleIntroSound(ctx: Ctx): void {
  const t0 = ctx.currentTime + 0.03;
  const master = ctx.createGain();
  master.gain.value = VOLUME;

  // Hafif yankı: kısa gecikme + geri besleme, sesi "oda"ya yayar ve yumuşatır.
  const delay = ctx.createDelay(1);
  delay.delayTime.value = 0.19;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.28;
  const wet = ctx.createGain();
  wet.gain.value = 0.35;
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 3200;
  delay.connect(feedback).connect(delay);
  delay.connect(wet).connect(tone);
  master.connect(tone);
  master.connect(delay);
  tone.connect(ctx.destination);

  // 0 sn: logo belirir — aşağıdan yukarı kayan yuvarlak bir "pop".
  pop(ctx, master, t0, 330, 660);
  // 0,72 sn: "oynat"a basılır — kısa, yumuşak bir tık.
  tick(ctx, master, t0 + 0.72);
  // 1,1 sn: ⏸ belirir — Fmaj9 arpeji, çan gibi (sinüs + hafif üst ton).
  const notes = [349.23, 440, 523.25, 659.25, 783.99]; // F4 A4 C5 E5 G5
  notes.forEach((f, i) => bell(ctx, master, t0 + 1.1 + i * 0.075, f, i === notes.length - 1 ? 1.6 : 1.2));
  // 1,3 sn: yazı çıkarken üstte ince bir parıltı.
  bell(ctx, master, t0 + 1.42, 1046.5, 1.4, 0.35);
}

function envelope(ctx: Ctx, at: number, peak: number, attack: number, decay: number): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
  return g;
}

function pop(ctx: Ctx, out: AudioNode, at: number, from: number, to: number): void {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(from, at);
  osc.frequency.exponentialRampToValueAtTime(to, at + 0.12);
  const g = envelope(ctx, at, 0.55, 0.012, 0.22);
  osc.connect(g).connect(out);
  osc.start(at);
  osc.stop(at + 0.3);
}

function tick(ctx: Ctx, out: AudioNode, at: number): void {
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(1200, at);
  osc.frequency.exponentialRampToValueAtTime(700, at + 0.05);
  const g = envelope(ctx, at, 0.22, 0.004, 0.07);
  osc.connect(g).connect(out);
  osc.start(at);
  osc.stop(at + 0.1);
}

function bell(ctx: Ctx, out: AudioNode, at: number, freq: number, decay: number, level = 0.42): void {
  const g = envelope(ctx, at, level, 0.015, decay);
  g.connect(out);
  // Temel ton + biraz kaydırılmış ikinci sinüs (sıcak dalgalanma) + yumuşak üst ton.
  const parts: Array<[number, OscillatorType, number]> = [
    [freq, 'sine', 1],
    [freq * 1.003, 'sine', 0.5],
    [freq * 2, 'triangle', 0.12],
  ];
  for (const [f, type, amount] of parts) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = f;
    const mix = ctx.createGain();
    mix.gain.value = amount;
    osc.connect(mix).connect(g);
    osc.start(at);
    osc.stop(at + decay + 0.1);
  }
}
