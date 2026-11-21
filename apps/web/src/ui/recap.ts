import { avatarText } from '@swm/shared/protocol';
import { createLogo, createMascot, logoSvg } from '@swm/shared/logo';
import { chooseFacts, RECAP_SCENE_MS, STICKER_MARK, type Fact, type Recap, type RecapPerson, type RecapShow } from '@swm/shared/recap';
import { el } from '../dom.ts';
import { lang, t, type I18nKey } from '../i18n.ts';
import { runningAudio, soundsOn, soundVolume } from '../sound.ts';
import './recap.css';

/**
 * Card RC1 (owner's picks: look A "night stage", flow A "host shows, guests ask", music A): the session recap plays in
 * the video's place, one 16:9 scene per fact, each on its own background with our logo and its light cone, a filmstrip
 * under it. In a room show everyone sees the same scene at the same moment (`show.at` on the server's clock); a click
 * on a frame or ← / → moves only me ("for yourself"). "Earlier recaps" replay the same way, alone. Never over the
 * YouTube player: the player is hidden while the stage is up (the video is paused by the server, not covered).
 * Card RC2 (owner's picks, 21 Nov 2026): look C "marquee sign" (each fact on a theatre sign with chasing bulbs under
 * the night sky) and music 1 (our own pad re-voiced: quieter, slower, warmer, a soft piano pluck).
 */

/** This chunk's own words (EN + TR; `check-game-text.mjs` checks the keys match). */
const TEXT = {
  en: {
    title: 'Session recap',
    region: 'Session recap show',
    pause: 'Pause the show (for me)',
    play: 'Play the show',
    prev: 'Previous scene',
    next: 'Next scene',
    frame: 'Scene {n}',
    mute: 'Music off',
    unmute: 'Music on',
    closeMe: '✕ Close for me',
    back: '▶ Back to the video',
    backHint: 'Ends the recap for everyone; the video plays on',
    save: '⬇ Save image',
    starts: 'Starting in',
    by: 'Shown by {name}',
    one: { videos: '1 video', chat: '1 message', reactions: '1 reaction', pins: '1 pin', people: '1 person' },
    many: { videos: '{n} videos', chat: '{n} messages', reactions: '{n} reactions', pins: '{n} pins', people: '{n} people' },
    timeSub: '{videos} · {people}',
    nowShowing: 'Now showing',
    ourNight: 'Our movie night',
    asksOne: '🙋 {names} asks to see the recap',
    asksMany: '🙋 {names} ask to see the recap',
    showAll: '✨ Show to everyone',
    notNow: 'Not now',
  },
  tr: {
    title: 'Oturum özeti',
    region: 'Oturum özeti gösterisi',
    pause: 'Gösteriyi duraklat (benim için)',
    play: 'Gösteriyi oynat',
    prev: 'Önceki sahne',
    next: 'Sonraki sahne',
    frame: 'Sahne {n}',
    mute: 'Müziği kapat',
    unmute: 'Müziği aç',
    closeMe: '✕ Benim için kapat',
    back: '▶ Videoya dön',
    backHint: 'Özeti herkes için bitirir; video kaldığı yerden sürer',
    save: '⬇ Görseli kaydet',
    starts: 'Başlıyor',
    by: '{name} gösteriyor',
    one: { videos: '1 video', chat: '1 mesaj', reactions: '1 tepki', pins: '1 pin', people: '1 kişi' },
    many: { videos: '{n} video', chat: '{n} mesaj', reactions: '{n} tepki', pins: '{n} pin', people: '{n} kişi' },
    timeSub: '{videos} · {people}',
    nowShowing: 'Şimdi gösterimde',
    ourNight: 'Bizim film gecemiz',
    asksOne: '🙋 {names} özeti görmek istiyor',
    asksMany: '🙋 {names} özeti görmek istiyor',
    showAll: '✨ Herkese göster',
    notNow: 'Şimdi değil',
  },
};
type Count = keyof (typeof TEXT)['en']['one'];
const tx = () => TEXT[lang() === 'tr' ? 'tr' : 'en'];
const fill = (s: string, params: Record<string, string | number> = {}) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? ''));
/** "1 person" / "3 people" (the old recap said "1 people"). */
export function count(kind: Count, n: number): string {
  return fill(n === 1 ? tx().one[kind] : tx().many[kind], { n });
}

/** "1 h 12 min" / "38 min". */
export function duration(sec: number): string {
  const m = Math.max(1, Math.round(sec / 60));
  return m >= 60 ? t('leftHM', { h: Math.floor(m / 60), m: m % 60 }) : t('endMinutes', { m });
}

function who(p: RecapPerson): string {
  return p.avatar ? `${avatarText(p.avatar)} ${p.name}` : p.name;
}

/** Each fact's scene (design note: night sky, emoji rain, bubbles, film reel, front row, popcorn, poster). */
type Scene = 'night' | 'rain' | 'bubbles' | 'reel' | 'seats' | 'popcorn' | 'poster';
function sceneOf(fact: Fact): Scene {
  switch (fact.kind) {
    case 'time':
      return 'night';
    case 'emoji':
    case 'reactor':
    case 'laugh':
    case 'sad':
      return 'rain';
    case 'talker':
      return 'bubbles';
    case 'videos':
    case 'speed':
      return 'reel';
    case 'crowd':
    case 'pins':
      return 'seats';
    case 'pauser':
    case 'seeker':
      return 'popcorn';
    case 'summary':
      return 'poster';
  }
}

/** The emoji that falls in a scene's background. */
function rainOf(fact: Fact): string {
  if (fact.kind === 'emoji') return fact.emoji === STICKER_MARK ? '🖼️' : fact.emoji;
  if (fact.kind === 'reactor') return fact.person.top && fact.person.top !== STICKER_MARK ? fact.person.top : '🎉';
  if (fact.kind === 'sad') return '😢';
  if (fact.kind === 'laugh') return '😂';
  return '✨';
}

/** A scene's big line, title and sub line. */
function sceneText(fact: Fact, r: Recap): { big: string; title: string; sub: string } {
  const k = (key: string, params?: Record<string, string | number>) => t(`recap.${key}` as I18nKey, params);
  const people = Math.max(r.peak, r.people.length);
  switch (fact.kind) {
    case 'time':
      return { big: duration(r.watchSec), title: k('time'), sub: fill(tx().timeSub, { videos: count('videos', r.videos), people: count('people', people) }) };
    case 'videos':
      return { big: String(r.videos), title: k('videos'), sub: r.titles.slice(-3).join(' · ') };
    case 'speed': {
      const gained = Math.abs(r.videoSec - r.watchSec);
      return fact.rate > 1
        ? { big: `${fact.rate}×`, title: k('fast'), sub: k('fastSub', { time: duration(gained) }) }
        : { big: `${fact.rate}×`, title: k('slow'), sub: k('slowSub') };
    }
    case 'talker':
      return { big: '💬', title: k('talker', { name: who(fact.person) }), sub: count('chat', fact.person.chat) };
    case 'reactor':
      return { big: rainOf(fact), title: k('reactor', { name: who(fact.person) }), sub: k('reactorSub', { n: fact.person.reactions }) };
    case 'sad':
      return { big: '😢', title: k('sad', { name: who(fact.person) }), sub: k('sadSub', { n: fact.person.sad }) };
    case 'laugh':
      return { big: '😂', title: k('laugh', { name: who(fact.person) }), sub: k('laughSub', { n: fact.person.laugh }) };
    case 'emoji':
      return { big: rainOf(fact), title: k('emoji'), sub: k('emojiSub', { n: fact.count }) };
    case 'pins':
      return { big: `📌 ${r.pins}`, title: k('pins'), sub: k('pinsSub', { name: who(fact.person), n: fact.person.pins }) };
    case 'pauser':
      return { big: '⏸', title: k('pauser', { name: who(fact.person) }), sub: k('pauserSub', { n: fact.person.pauses }) };
    case 'seeker':
      return { big: '⏩', title: k('seeker', { name: who(fact.person) }), sub: k('seekerSub', { n: fact.person.seeks }) };
    case 'crowd':
      return { big: String(r.peak), title: k('crowd'), sub: k('crowdSub', { n: r.peak }) };
    case 'summary':
      return { big: '', title: k('summary'), sub: '' };
  }
}

/** The summary's numbers; a zero gets no line. */
function summaryLines(r: Recap): string[] {
  return [
    `⏱ ${duration(r.watchSec)}`,
    r.videos ? `🎬 ${count('videos', r.videos)}` : '',
    r.chat ? `💬 ${count('chat', r.chat)}` : '',
    r.reactions ? `😂 ${count('reactions', r.reactions)}` : '',
    r.pins ? `📌 ${count('pins', r.pins)}` : '',
    `👥 ${count('people', Math.max(r.peak, r.people.length, 1))}`,
  ].filter(Boolean);
}

function timeText(at: number): string {
  return new Date(at).toLocaleTimeString(lang() === 'tr' ? 'tr-TR' : 'en-US', { hour: '2-digit', minute: '2-digit' });
}

export function dateText(at: number): string {
  return new Date(at).toLocaleString(lang() === 'tr' ? 'tr-TR' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/** RC2: a fact's three lines on the sign: a small kicker, the big red headline, a small line under it. */
function signLines(fact: Fact, text: { big: string; title: string; sub: string }, r: Recap): { kicker: string; big: string; sub: string } {
  if (fact.kind === 'time') return { kicker: tx().nowShowing, big: tx().ourNight, sub: `${duration(r.watchSec)} · ${count('people', Math.max(r.peak, r.people.length, 1))}` };
  return { kicker: text.title, big: text.big, sub: text.sub };
}

/** How many bulbs run along the sign's top and bottom, and down each side. */
export const MARQUEE_BULBS = { across: 22, down: 6 };
/** RC2: the theatre sign: a gold frame, bulbs chasing round it (still with "reduce motion"), the cream letter board. */
function marquee(board: HTMLElement): HTMLElement {
  let n = 0;
  // Every third bulb lights together; the rows run clockwise, so the light chases round the frame.
  const bulb = () => el('i', { class: 'rc-bulb', style: `animation-delay:${((n++ % 3) * 0.3).toFixed(1)}s` });
  const row = (cls: string, count: number) => el('div', { class: `rc-bulbs ${cls}`, 'aria-hidden': 'true' }, ...Array.from({ length: count }, bulb));
  const top = row('rc-b-top', MARQUEE_BULBS.across);
  const right = row('rc-b-right', MARQUEE_BULBS.down);
  const bottom = row('rc-b-bottom', MARQUEE_BULBS.across);
  const left = row('rc-b-left', MARQUEE_BULBS.down);
  bottom.style.flexDirection = 'row-reverse';
  left.style.flexDirection = 'column-reverse';
  return el('div', { class: 'rc-sign' }, el('div', { class: 'rc-sign-frame' }, top, left, el('div', { class: 'rc-board' }, board), right, bottom), el('div', { class: 'rc-post', 'aria-hidden': 'true' }));
}

/** Decorations for a scene's background (aria-hidden; still when the person prefers less motion). */
function decor(scene: Scene, fact: Fact, r: Recap): HTMLElement {
  const box = el('div', { class: 'rc-deco', 'aria-hidden': 'true' });
  const many = (n: number, make: (i: number) => HTMLElement) => box.append(...Array.from({ length: n }, (_, i) => make(i)));
  const spread = (i: number, n: number) => `${((i * 61) % 97) / 97 * 100}%`;
  switch (scene) {
    case 'night':
      many(18, (i) => el('i', { class: 'rc-star', style: `left:${spread(i, 18)};top:${(i * 37) % 70}%;animation-delay:${(i % 6) * 0.4}s` }));
      box.append(createMascot(document, { mood: 'happy' }));
      break;
    case 'rain':
      many(12, (i) => el('i', { class: 'rc-drop', style: `left:${spread(i, 12)};animation-delay:${(i % 6) * 0.55}s` }, rainOf(fact)));
      break;
    case 'bubbles':
      many(9, (i) => el('i', { class: 'rc-bubble', style: `left:${spread(i, 9)};animation-delay:${(i % 5) * 0.7}s` }));
      break;
    case 'reel':
      box.append(el('div', { class: 'rc-sprockets' }));
      break;
    case 'seats':
      box.append(el('div', { class: 'rc-seats' }, ...r.people.slice(0, 8).map((p) => el('span', { class: 'rc-seat' }, p.avatar ? avatarText(p.avatar) : '🙂'))));
      break;
    case 'popcorn':
      many(10, (i) => el('i', { class: 'rc-drop rc-pop', style: `left:${spread(i, 10)};animation-delay:${(i % 5) * 0.6}s` }, '🍿'));
      break;
    case 'poster':
      box.append(createMascot(document, { torch: true }));
      break;
  }
  return box;
}

/** RC2: the recap music's peak gain at full room volume (the room's 0–100 volume scales it) and its fade-in. */
export const RECAP_MUSIC_LEVEL = 0.025;
export const RECAP_FADE_S = 3;
/** RC2 (owner's pick: music 1): one chord's length in seconds; slow on purpose. */
export const RECAP_CHORD_S = 5.2;
/**
 * Our own soft pad (Web Audio, F major), re-voiced for RC2: quieter, slower, warmer (sine + triangle under a low
 * filter) with a soft piano-like pluck on each chord. No file, no licence. Off with room sounds off.
 */
function createMusic(): { start(): void; stop(): void; muted: boolean; setMuted(m: boolean): void } {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let timer = 0;
  let next = 0;
  let step = 0;
  const CHORDS = [
    [174.61, 220, 261.63],
    [146.83, 174.61, 220],
    [116.54, 146.83, 174.61],
    [130.81, 164.81, 196],
  ];
  /** The pluck's two notes per chord (an octave up, the chord's top then its middle). */
  const PLUCKS = [
    [523.25, 440],
    [440, 349.23],
    [349.23, 293.66],
    [392, 329.63],
  ];
  // RC2 (owner: "it starts terribly loud"): RC1 multiplied by soundVolume() as if it were 0–1, but it is 0–100, so the
  // pad played at 70× its level (gain 3.5, clipping). Now the room's volume as a fraction, faded in from silence over
  // RECAP_FADE_S.
  const level = () => (RECAP_MUSIC_LEVEL * soundVolume()) / 100;
  const music = {
    muted: !soundsOn(),
    start() {
      if (music.muted || ctx) return;
      void runningAudio(400).then((audio) => {
        if (!audio || music.muted || ctx) return;
        ctx = audio;
        master = audio.createGain();
        master.gain.value = 0;
        master.gain.setValueAtTime(0, audio.currentTime);
        master.gain.linearRampToValueAtTime(level(), audio.currentTime + RECAP_FADE_S);
        const lp = audio.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 1800;
        master.connect(lp).connect(audio.destination);
        // The pad under its own darker filter: the warmth; the pluck goes past it, a little brighter.
        const warm = audio.createBiquadFilter();
        warm.type = 'lowpass';
        warm.frequency.value = 620;
        warm.connect(master);
        next = audio.currentTime + 0.05;
        const pluck = (at: number, f: number) => {
          if (!ctx) return;
          for (const [mult, peak] of [
            [1, 0.16],
            [2, 0.035],
          ] as const) {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = 'sine';
            o.frequency.value = f * mult;
            g.gain.setValueAtTime(0, at);
            g.gain.linearRampToValueAtTime(peak, at + 0.012);
            g.gain.exponentialRampToValueAtTime(0.0008, at + 2.6);
            o.connect(g).connect(master!);
            o.start(at);
            o.stop(at + 2.7);
          }
        };
        const plan = () => {
          if (!ctx || !master) return;
          while (next < ctx.currentTime + 2) {
            const chord = step % CHORDS.length;
            for (const f of CHORDS[chord]!) {
              for (const [type, detune] of [
                ['sine', -4],
                ['triangle', 4],
              ] as const) {
                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.type = type;
                o.frequency.value = f;
                o.detune.value = detune;
                g.gain.setValueAtTime(0, next);
                g.gain.linearRampToValueAtTime(0.14, next + 2.2);
                g.gain.linearRampToValueAtTime(0, next + RECAP_CHORD_S + 0.8);
                o.connect(g).connect(warm);
                o.start(next);
                o.stop(next + RECAP_CHORD_S + 0.9);
              }
            }
            const [hi, mid] = PLUCKS[chord]!;
            pluck(next + 0.4, hi!);
            pluck(next + RECAP_CHORD_S / 2 + 0.2, mid!);
            step++;
            next += RECAP_CHORD_S;
          }
        };
        plan();
        timer = window.setInterval(plan, 500);
      });
    },
    stop() {
      clearInterval(timer);
      if (ctx && master) {
        const m = master;
        m.gain.cancelScheduledValues(ctx.currentTime);
        m.gain.setValueAtTime(m.gain.value, ctx.currentTime);
        m.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
        setTimeout(() => m.disconnect(), 800);
      }
      ctx = null;
      master = null;
    },
    setMuted(m: boolean) {
      music.muted = m;
      if (m) music.stop();
      else music.start();
    },
  };
  return music;
}

export interface StageOptions {
  /** `room`: the show for everyone (in step); `alone`: an earlier recap, only for me. */
  mode: 'room' | 'alone';
  show: Pick<RecapShow, 'at' | 'facts' | 'recap'> & { by?: string };
  /** Server time now (room mode). */
  now: () => number;
  /** I am the host: "▶ Back to the video" ends it for everyone. */
  host: () => boolean;
  /** The name of who showed it (room mode). */
  byName?: string | null;
  onBack?: () => void;
  /** The stage went away for me (✕, Esc, the end of an alone show). */
  onClose: () => void;
}

export interface Stage {
  close(): void;
  refresh(): void;
  state(): { scene: number; scenes: number; kind: string; paused: boolean; mine: boolean; music: boolean; level: number; sign: { bulbs: number; chasing: boolean; lines: string[] } | null };
}

let current: Stage | null = null;
export function currentStage(): Stage | null {
  return current;
}

/** Puts the show in `box` (the video's place) and runs it. */
export function playRecap(box: HTMLElement, options: StageOptions): Stage {
  current?.close();
  const { show } = options;
  const facts = show.facts;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let mine: number | null = options.mode === 'alone' ? 0 : null;
  let mineAt = performance.now();
  let paused = false;
  let shown = -2;
  let timer = 0;
  const music = createMusic();

  const live = el('div', { class: 'rc-live', 'aria-live': 'polite' });
  const sceneBox = el('div', { class: 'rc-scenes' });
  const head = el('div', { class: 'rc-head' }, createLogo(document, { animated: !reduced }), el('div', {}, el('b', {}, `Sidelit · ${tx().title}`), el('span', {}, timeText(show.recap.from) === timeText(show.recap.to) ? dateText(show.recap.from) : `${dateText(show.recap.from)} – ${timeText(show.recap.to)}`)));
  const strip = el('div', { class: 'rc-strip', role: 'group', 'aria-label': tx().title });
  const frames = facts.map((fact, i) => {
    const b = el('button', { type: 'button', class: `rc-frame rc-bg-${sceneOf(fact)}`, title: fill(tx().frame, { n: i + 1 }), 'aria-label': fill(tx().frame, { n: i + 1 }) }, String(i + 1));
    b.addEventListener('click', () => jump(i));
    return b;
  });
  strip.append(...frames);
  const button = (cls: string, label: string, text: string, onClick: () => void) => {
    const b = el('button', { type: 'button', class: `rc-btn ${cls}`, title: label, 'aria-label': label }, text);
    b.addEventListener('click', onClick);
    return b;
  };
  const prev = button('rc-prev', tx().prev, '‹', () => jump(sceneNow() - 1));
  const next = button('rc-next', tx().next, '›', () => jump(sceneNow() + 1));
  const pause = button('rc-pause', tx().pause, '❚❚', () => setPaused(!paused));
  const mute = button('rc-mute', tx().mute, '🔊', () => {
    music.setMuted(!music.muted);
    drawMute();
  });
  const closeMe = el('button', { type: 'button', class: 'rc-btn rc-close', title: tx().closeMe.replace('✕ ', ''), 'aria-label': tx().closeMe.replace('✕ ', '') }, tx().closeMe);
  // Where the filmstrip has no room (a phone): "2 / 6".
  const step = el('span', { class: 'rc-step', 'aria-hidden': 'true' });
  closeMe.addEventListener('click', () => close());
  const back = el('button', { type: 'button', class: 'rc-btn rc-back', title: tx().backHint }, tx().back);
  back.addEventListener('click', () => options.onBack?.());
  const controls = el('div', { class: 'rc-controls' }, prev, pause, next, strip, step, mute, back, closeMe);
  const countdown = el('div', { class: 'rc-count', 'aria-hidden': 'true' });
  const stage = el('section', { class: 'rc-stage', role: 'region', 'aria-label': tx().region, tabindex: '-1' }, sceneBox, head, countdown, live, controls);

  function drawMute(): void {
    mute.textContent = music.muted ? '🔇' : '🔊';
    const label = music.muted ? tx().unmute : tx().mute;
    mute.title = label;
    mute.setAttribute('aria-label', label);
  }

  /** Which scene is on: the room's (from the server's start) unless I moved myself. */
  function sceneNow(): number {
    if (mine !== null) {
      const ahead = paused ? 0 : Math.floor((performance.now() - mineAt) / RECAP_SCENE_MS);
      return Math.min(facts.length - 1, mine + ahead);
    }
    const ms = options.now() - show.at;
    return ms < 0 ? -1 : Math.min(facts.length - 1, Math.floor(ms / RECAP_SCENE_MS));
  }

  function jump(i: number): void {
    mine = Math.max(0, Math.min(facts.length - 1, i));
    mineAt = performance.now();
    draw();
  }

  function setPaused(p: boolean): void {
    if (p && mine === null) {
      mine = Math.max(0, sceneNow());
    }
    if (!p) mineAt = performance.now();
    paused = p;
    pause.textContent = p ? '▶' : '❚❚';
    const label = p ? tx().play : tx().pause;
    pause.title = label;
    pause.setAttribute('aria-label', label);
    draw();
  }

  function renderScene(i: number): void {
    const fact = facts[i]!;
    const scene = sceneOf(fact);
    const text = sceneText(fact, show.recap);
    // RC2 (owner's pick C, "marquee sign"): every fact is lettered on a theatre sign with chasing bulbs over the night
    // sky; the scene's own decoration (emoji rain, seats, the reel …) plays around it.
    const lines = signLines(fact, text, show.recap);
    const body = el('div', { class: 'rc-body' });
    if (fact.kind === 'summary') {
      const save = el('button', { type: 'button', class: 'btn primary' }, tx().save);
      save.addEventListener('click', () => downloadImage(show.recap));
      body.append(
        el('p', { class: 'rc-kicker' }, tx().nowShowing),
        el('h2', { class: 'rc-title' }, text.title),
        el('div', { class: 'rc-grid' }, ...summaryLines(show.recap).map((line) => el('span', {}, line))),
        el('div', { class: 'rc-actions' }, save),
      );
    } else {
      body.append(el('p', { class: 'rc-kicker' }, lines.kicker), el('h2', { class: 'rc-big' }, lines.big), el('p', { class: 'rc-sub' }, lines.sub));
    }
    const node = el('div', { class: `rc-scene rc-marquee rc-at-${scene}${reduced ? '' : ' rc-enter'}` }, el('div', { class: 'rc-sky', 'aria-hidden': 'true' }), el('div', { class: 'rc-cone', 'aria-hidden': 'true' }), decor(scene, fact, show.recap), marquee(body));
    sceneBox.replaceChildren(node);
    live.textContent = fact.kind === 'summary' ? text.title : [lines.kicker, lines.big, lines.sub].filter(Boolean).join('. ');
    step.textContent = `${i + 1} / ${facts.length}`;
    frames.forEach((f, j) => {
      f.classList.toggle('on', j === i);
      f.classList.toggle('done', j < i);
      if (j === i) f.setAttribute('aria-current', 'step');
      else f.removeAttribute('aria-current');
    });
  }

  function draw(): void {
    clearTimeout(timer);
    const i = sceneNow();
    back.hidden = options.mode !== 'room' || !options.host();
    prev.disabled = i <= 0;
    next.disabled = i >= facts.length - 1;
    if (i < 0) {
      const left = Math.ceil((show.at - options.now()) / 1000);
      countdown.hidden = false;
      countdown.replaceChildren(createMascot(document, { torch: true }), el('b', {}, String(Math.max(1, left))), el('span', {}, options.byName ? fill(tx().by, { name: options.byName }) : tx().starts));
      timer = window.setTimeout(draw, 250);
      return;
    }
    countdown.hidden = true;
    if (i !== shown) {
      shown = i;
      renderScene(i);
    }
    if (paused) return;
    if (i >= facts.length - 1) return;
    timer = window.setTimeout(draw, 250);
  }

  const onKey = (event: KeyboardEvent) => {
    if ((event.target as HTMLElement | null)?.closest?.('input, textarea, [contenteditable="true"]')) return;
    if (event.key === 'Escape') close();
    else if (event.key === 'ArrowRight') jump(sceneNow() + 1);
    else if (event.key === 'ArrowLeft') jump(sceneNow() - 1);
    else return;
    event.preventDefault();
    event.stopPropagation();
  };

  function close(): void {
    if (current !== handle) return;
    current = null;
    clearTimeout(timer);
    music.stop();
    stage.remove();
    box.classList.remove('rc-on');
    document.removeEventListener('keydown', onKey, true);
    options.onClose();
  }

  /** RC2 for Test Lab `recap.state`: the sign's bulbs, whether they chase (not with "reduce motion") and its lines. */
  function signState(): { bulbs: number; chasing: boolean; lines: string[] } | null {
    const sign = sceneBox.querySelector('.rc-sign');
    if (!sign) return null;
    const bulb = sign.querySelector('.rc-bulb');
    return {
      bulbs: sign.querySelectorAll('.rc-bulb').length,
      chasing: !!bulb && getComputedStyle(bulb).animationName !== 'none',
      lines: [...sign.querySelectorAll('.rc-board p, .rc-board h2')].map((n) => n.textContent ?? ''),
    };
  }

  const handle: Stage = {
    close,
    refresh: () => draw(),
    state: () => ({ scene: sceneNow(), scenes: facts.length, kind: facts[Math.max(0, sceneNow())]!.kind, paused, mine: mine !== null, music: !music.muted, level: (RECAP_MUSIC_LEVEL * soundVolume()) / 100, sign: signState() }),
  };
  current = handle;
  box.classList.add('rc-on');
  box.append(stage);
  document.addEventListener('keydown', onKey, true);
  drawMute();
  if (reduced) setPaused(false);
  draw();
  music.start();
  stage.focus({ preventScroll: true });
  return handle;
}

/** An earlier recap, alone, in the video's place (its own scenes, chosen now). */
export function playAlone(box: HTMLElement, recap: Recap, onClose: () => void = () => {}): Stage {
  return playRecap(box, { mode: 'alone', show: { at: 0, facts: chooseFacts(recap, Math.random, 6), recap }, now: Date.now, host: () => false, onClose });
}

/** Profildeki "kaydedilen özetler" listesi (yenisi üstte). */
export function renderRecapHistory(container: HTMLElement, recaps: Recap[], open: (recap: Recap) => void): void {
  container.replaceChildren(
    ...[...recaps].reverse().map((recap) => {
      const button = el('button', { type: 'button', class: 'recap-past' }, `📊 ${dateText(recap.to)}`, el('span', { class: 'muted small' }, ` · ${duration(recap.watchSec)}`));
      button.addEventListener('click', () => open(recap));
      return button;
    }),
  );
}

/** The host's one toast for asks (names merge while it is up). */
const askers: string[] = [];
export function askToast(name: string, show: () => void): void {
  if (!askers.includes(name)) askers.push(name);
  let toast = document.querySelector<HTMLElement>('.rc-ask');
  const names = askers.join(', ');
  const line = fill(askers.length > 1 ? tx().asksMany : tx().asksOne, { names });
  if (toast) {
    toast.querySelector('.rc-ask-line')!.textContent = line;
    return;
  }
  const go = el('button', { type: 'button', class: 'btn primary small-btn' }, tx().showAll);
  const later = el('button', { type: 'button', class: 'btn small-btn' }, tx().notNow);
  toast = el('div', { class: 'rc-ask card', role: 'status' }, el('span', { class: 'rc-ask-line' }, line), el('div', { class: 'rc-ask-actions' }, go, later));
  const done = () => {
    askers.length = 0;
    toast?.remove();
  };
  go.addEventListener('click', () => {
    done();
    show();
  });
  later.addEventListener('click', done);
  document.body.append(toast);
  setTimeout(done, 30_000);
}

/** Özeti 1200×630 paylaşılabilir görsel olarak indirir (logomuzla, gece paletinde). */
function downloadImage(recap: Recap): void {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 630);
  g.addColorStop(0, '#22174f');
  g.addColorStop(1, '#08061a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1200, 630);
  const logo = new Image();
  // RC2: the marquee's gold frame and bulbs round the picture.
  ctx.strokeStyle = '#d6a447';
  ctx.lineWidth = 6;
  ctx.strokeRect(20, 20, 1160, 590);
  ctx.fillStyle = '#ffd76a';
  const bulb = (x: number, y: number) => {
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
  };
  for (let x = 44; x <= 1156; x += 37) [36, 594].forEach((y) => bulb(x, y));
  for (let y = 73; y <= 557; y += 37) [36, 1164].forEach((x) => bulb(x, y));
  logo.onload = () => {
    ctx.drawImage(logo, 70, 60, 84, 84);
    ctx.fillStyle = '#fff3d6';
    ctx.font = '800 52px system-ui, sans-serif';
    ctx.fillText(tx().title, 176, 118);
    ctx.font = '500 26px system-ui, sans-serif';
    ctx.fillStyle = 'rgb(255 243 214 / 0.8)';
    ctx.fillText(dateText(recap.to), 176, 152);
    ctx.fillStyle = '#fff3d6';
    ctx.font = '700 40px system-ui, sans-serif';
    summaryLines(recap).forEach((line, i) => ctx.fillText(line, 70 + (i % 2) * 540, 270 + Math.floor(i / 2) * 80));
    ctx.fillStyle = '#ffc65a';
    ctx.font = '800 30px system-ui, sans-serif';
    ctx.fillText('Sidelit', 70, 580);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'sidelit-recap.png';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }, 'image/png');
  };
  logo.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(logoSvg({ id: 'recap-logo' }))}`;
}
