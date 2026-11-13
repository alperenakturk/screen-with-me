// Açılış animasyonunun sesi: dosya yok, Web Audio ile o an üretilir (lisans/indirme derdi
// yok, ~0 KB). Zamanlama intro.ts'teki animasyonla eş: 0 sn logo belirir, 0,72 sn "oynat"a
// basılır, 1,1–1,4 sn ⏸ ve yazı çıkar, toplam ~2,7 sn. Birkaç sürüm var (A–F); çalan
// INTRO_VARIANT. Tarayıcı sesi engellerse (sayfayla hiç etkileşim yoksa) sessizce vazgeçer.

type Ctx = BaseAudioContext;

/** Sesin genel yüksekliği; kulak tırmalamasın, arka planda kalsın. */
const VOLUME = 0.16;

export type IntroVariant = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

/** Sitede ve eklentide çalan sürüm. */
export const INTRO_VARIANT: IntroVariant = 'F';

/**
 * PH1: with an already running context (the site's shared one, unlocked by the "Enter room" tap) the sound starts on
 * this very frame, together with the picture; a context that isn't running yet means the picture alone (a sound that
 * comes late is worse than none). The shared context is not closed here.
 */
export function playIntroSoundOn(ctx: AudioContext): boolean {
  if (ctx.state !== 'running') return false;
  try {
    scheduleIntroSound(ctx);
    return true;
  } catch {
    return false;
  }
}

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
export function scheduleIntroSound(ctx: Ctx, variant: IntroVariant = INTRO_VARIANT): void {
  VARIANTS[variant](ctx, ctx.currentTime + 0.03);
}

const VARIANTS: Record<IntroVariant, (ctx: Ctx, t0: number) => void> = {
  // A — çan: yuvarlak pop, tık, Fmaj9 çan arpeji + parıltı.
  A(ctx, t0) {
    const out = room(ctx, { delay: 0.19, feedback: 0.28, wet: 0.35, cutoff: 3200 });
    pop(ctx, out, t0, 330, 660);
    tick(ctx, out, t0 + 0.72);
    const notes = [349.23, 440, 523.25, 659.25, 783.99]; // F4 A4 C5 E5 G5
    notes.forEach((f, i) => bell(ctx, out, t0 + 1.1 + i * 0.075, f, i === notes.length - 1 ? 1.6 : 1.2));
    bell(ctx, out, t0 + 1.42, 1046.5, 1.4, 0.35);
  },

  // B — marimba: tahta tokmak sesi; pes iki nota, kısa tahta tık, Gmaj7 yukarı arpej.
  B(ctx, t0) {
    const out = room(ctx, { delay: 0.16, feedback: 0.25, wet: 0.3, cutoff: 4000, volume: 1.6 });
    strike(ctx, out, t0, 196, 0.5, MARIMBA, 1.2); // G3
    strike(ctx, out, t0 + 0.09, 392, 0.3, MARIMBA); // G4
    strike(ctx, out, t0 + 0.72, 1046.5, 0.12, MARIMBA, 0.12); // kısa "tok"
    const notes = [392, 493.88, 587.33, 739.99]; // G4 B4 D5 F#5
    notes.forEach((f, i) => strike(ctx, out, t0 + 1.1 + i * 0.08, f, 0.38, MARIMBA, 1.3));
    strike(ctx, out, t0 + 1.44, 783.99, 0.3, MARIMBA, 1.8); // G5
    strike(ctx, out, t0 + 1.44, 987.77, 0.22, MARIMBA, 1.8); // B5
  },

  // C — müzik kutusu: ince "ding-ding", kurma tıkırtısı, tatlı küçük bir melodi.
  C(ctx, t0) {
    const out = room(ctx, { delay: 0.23, feedback: 0.3, wet: 0.38, cutoff: 5000, volume: 1.6 });
    strike(ctx, out, t0, 523.25, 0.32, MUSIC_BOX, 1.2); // C5
    strike(ctx, out, t0 + 0.12, 783.99, 0.28, MUSIC_BOX, 1.2); // G5
    click(ctx, out, t0 + 0.72, 0.18);
    strike(ctx, out, t0 + 1.1, 659.25, 0.3, MUSIC_BOX, 1.3); // E5
    strike(ctx, out, t0 + 1.19, 783.99, 0.28, MUSIC_BOX, 1.3); // G5
    strike(ctx, out, t0 + 1.28, 1174.66, 0.22, MUSIC_BOX, 1.3); // D6
    strike(ctx, out, t0 + 1.42, 1046.5, 0.28, MUSIC_BOX, 1.9); // C6
    strike(ctx, out, t0 + 1.42, 523.25, 0.2, MUSIC_BOX, 1.9); // C5 alttan
  },

  // D — yumuşak piyano: pes F oktavı, hafif bir dokunuş, yayılan Fmaj9 akoru.
  D(ctx, t0) {
    const out = room(ctx, { delay: 0.21, feedback: 0.22, wet: 0.25, cutoff: 3500, volume: 1.15 });
    piano(ctx, out, t0, 174.61, 0.3, 1.1); // F3
    piano(ctx, out, t0, 349.23, 0.28, 1.1); // F4
    piano(ctx, out, t0 + 0.72, 880, 0.12, 0.2); // A5, kısa
    piano(ctx, out, t0 + 1.1, 174.61, 0.22, 1.8); // F3
    const notes = [440, 523.25, 659.25, 783.99]; // A4 C5 E5 G5
    notes.forEach((f, i) => piano(ctx, out, t0 + 1.1 + i * 0.07, f, 0.24, 1.6));
    piano(ctx, out, t0 + 1.42, 880, 0.2, 1.8); // A5
  },

  // E — hışırtı + rüzgâr çanı: hava gibi "vuuş", tık, yükselen hışırtı ve çanlar.
  E(ctx, t0) {
    const out = room(ctx, { delay: 0.27, feedback: 0.35, wet: 0.42, cutoff: 5500, volume: 1.8 });
    whoosh(ctx, out, t0, 0.45, 500, 2400, 0.5, 0.35);
    pop(ctx, out, t0 + 0.05, 220, 440, 0.3);
    tick(ctx, out, t0 + 0.72);
    whoosh(ctx, out, t0 + 0.82, 0.36, 700, 4000, 0.35, 0.8);
    const notes: Array<[number, number]> = [
      [1.1, 587.33], [1.17, 739.99], [1.26, 880], [1.34, 987.77], [1.46, 1174.66], // D5 F#5 A5 B5 D6
    ];
    for (const [at, f] of notes) strike(ctx, out, t0 + at, f, 0.26, CHIME, 1.3, 0.003);
  },

  // F — sıcak pad: pes bir yastık ses yavaşça açılır, tık yerine yumuşak bir pıt,
  // ⏸'da Fmaj9'a açılıp üstünde ince bir parıltı.
  F(ctx, t0) {
    const out = room(ctx, { delay: 0.3, feedback: 0.3, wet: 0.3, cutoff: 2600, volume: 1.8 });
    pop(ctx, out, t0, 110, 220, 0.45);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.7;
    filter.frequency.setValueAtTime(260, t0);
    filter.frequency.exponentialRampToValueAtTime(700, t0 + 1.0);
    filter.frequency.exponentialRampToValueAtTime(1800, t0 + 1.35);
    filter.frequency.exponentialRampToValueAtTime(500, t0 + 2.8);
    filter.connect(out);
    pad(ctx, filter, t0, t0 + 1.2, [174.61, 261.63], 0.09); // F3 C4
    pad(ctx, filter, t0 + 1.05, t0 + 2.75, [174.61, 220, 261.63, 329.63, 392], 0.06); // F3 A3 C4 E4 G4
    strike(ctx, out, t0 + 0.72, 523.25, 0.2, [[1, 1, 0.22], [2, 0.2, 0.08]]); // C5 pıt
    bell(ctx, out, t0 + 1.12, 880, 1.3, 0.16);
    bell(ctx, out, t0 + 1.3, 1318.5, 1.3, 0.1);
  },
};

/** Hafif yankı: kısa gecikme + geri besleme, sesi "oda"ya yayar; alçak geçiren süzgeç yumuşatır. */
function room(ctx: Ctx, o: { delay: number; feedback: number; wet: number; cutoff: number; volume?: number }): GainNode {
  const master = ctx.createGain();
  master.gain.value = VOLUME * (o.volume ?? 1);
  const delay = ctx.createDelay(1);
  delay.delayTime.value = o.delay;
  const feedback = ctx.createGain();
  feedback.gain.value = o.feedback;
  const wet = ctx.createGain();
  wet.gain.value = o.wet;
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = o.cutoff;
  delay.connect(feedback).connect(delay);
  delay.connect(wet).connect(tone);
  master.connect(tone);
  master.connect(delay);
  tone.connect(ctx.destination);
  return master;
}

function envelope(ctx: Ctx, at: number, peak: number, attack: number, decay: number): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
  return g;
}

function pop(ctx: Ctx, out: AudioNode, at: number, from: number, to: number, level = 0.55): void {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(from, at);
  osc.frequency.exponentialRampToValueAtTime(to, at + 0.12);
  const g = envelope(ctx, at, level, 0.012, 0.22);
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

/** [frekans oranı, miktar, sönme süresi]: üst tonlar temelden hızlı söner, çalgının rengi buradan gelir. */
type Partial = [ratio: number, amount: number, decay: number];

// Marimba: 4. kat üst ton tahta tokmağın "tok"unu verir, çabuk söner.
const MARIMBA: Partial[] = [[1, 1, 0.6], [4, 0.22, 0.08], [9.2, 0.04, 0.025]];
// Müzik kutusu dili: uyumsuz (5,4×) üst ton metal tını verir.
const MUSIC_BOX: Partial[] = [[1, 1, 0.9], [2, 0.12, 0.35], [5.4, 0.05, 0.1]];
// Rüzgâr çanı (borular): 2,76× ve 5,4× üst tonlar.
const CHIME: Partial[] = [[1, 1, 1], [2.76, 0.3, 0.45], [5.4, 0.08, 0.2]];
// Piyano telleri: tam katlar, yukarı çıktıkça daha kısa.
const PIANO: Partial[] = [[1, 1, 1], [2, 0.45, 0.6], [3, 0.2, 0.35], [4, 0.1, 0.25], [5, 0.05, 0.15]];

/** Vurmalı bir nota: her üst ton ayrı sinüs, kendi süresinde söner. length tüm süreleri çarpar. */
function strike(ctx: Ctx, out: AudioNode, at: number, freq: number, level: number, partials: Partial[], length = 1, attack = 0.004): void {
  for (const [ratio, amount, decay] of partials) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq * ratio;
    const d = decay * length;
    const g = envelope(ctx, at, level * amount, attack, d);
    osc.connect(g).connect(out);
    osc.start(at);
    osc.stop(at + attack + d + 0.05);
  }
}

/** Piyano notası: iki tel hafif farklı akortta, birlikte "canlı" ve sıcak duyulur. */
function piano(ctx: Ctx, out: AudioNode, at: number, freq: number, level: number, length: number): void {
  strike(ctx, out, at, freq, level, PIANO, length, 0.006);
  strike(ctx, out, at, freq * 1.0015, level * 0.45, PIANO, length, 0.006);
}

function noise(ctx: Ctx, seconds: number): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/** Kurma çarkı gibi çok kısa, yumuşatılmış bir tıkırtı (süzülmüş gürültü). */
function click(ctx: Ctx, out: AudioNode, at: number, level: number): void {
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx, 0.05);
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 2500;
  band.Q.value = 2;
  const g = envelope(ctx, at, level, 0.002, 0.03);
  src.connect(band).connect(g).connect(out);
  src.start(at);
}

/** Hava hışırtısı: gürültü, süzgeci from→to kayarak geçer. peakAt: tepe noktası (0–1 arası). */
function whoosh(ctx: Ctx, out: AudioNode, at: number, dur: number, from: number, to: number, level: number, peakAt: number): void {
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx, dur + 0.05);
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.Q.value = 1.1;
  band.frequency.setValueAtTime(from, at);
  band.frequency.exponentialRampToValueAtTime(to, at + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(level, at + dur * peakAt);
  g.gain.linearRampToValueAtTime(0, at + dur);
  src.connect(band).connect(g).connect(out);
  src.start(at);
  src.stop(at + dur + 0.05);
}

/** Yastık gibi yumuşak akor: her notaya hafif farklı akortlu iki testere dalgası, yavaş giriş/çıkış. */
function pad(ctx: Ctx, out: AudioNode, from: number, to: number, freqs: number[], level: number): void {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, from);
  g.gain.linearRampToValueAtTime(level, from + 0.35);
  g.gain.setValueAtTime(level, to - 0.45);
  g.gain.linearRampToValueAtTime(0, to);
  g.connect(out);
  for (const f of freqs) {
    for (const cents of [-7, 7]) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = f;
      osc.detune.value = cents;
      osc.connect(g);
      osc.start(from);
      osc.stop(to + 0.05);
    }
  }
}
