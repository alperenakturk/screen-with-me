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
    askTitle: '✨ The recap is ready ({time})',
    askBody: 'The host shows it to everyone in the video\'s place.',
    ask: '🙋 Ask the host to show it',
    asked: '✓ Asked. The host decides.',
    asksOne: '🙋 {names} asks to see the recap',
    asksMany: '🙋 {names} ask to see the recap',
    showAll: '✨ Show to everyone',
    notNow: 'Not now',
    alone: 'Watch it alone',
    nudge: 'Long night! The recap of these {time} is ready under ✨ whenever you like.',
    lastTime: '✨ Last time\'s recap ({when}, {time}) ▸',
    dontRemind: 'Don\'t remind me',
    endHost: '✨ Show this session\'s recap to everyone',
    endGuest: '🙋 Ask the host to show the recap',
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
    askTitle: '✨ Özet hazır ({time})',
    askBody: 'Yönetici onu videonun yerinde herkese gösterir.',
    ask: '🙋 Yöneticiden göstermesini iste',
    asked: '✓ İstendi. Karar yöneticinin.',
    asksOne: '🙋 {names} özeti görmek istiyor',
    asksMany: '🙋 {names} özeti görmek istiyor',
    showAll: '✨ Herkese göster',
    notNow: 'Şimdi değil',
    alone: 'Tek başına izle',
    nudge: 'Uzun gece! Bu {time} izlemenin özeti ✨ altında hazır, ne zaman istersen.',
    lastTime: '✨ Geçen seferin özeti ({when}, {time}) ▸',
    dontRemind: 'Bana hatırlatma',
    endHost: '✨ Bu oturumun özetini herkese göster',
    endGuest: '🙋 Yöneticiden özeti göstermesini iste',
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

/** A soft pad of our own (Web Audio, the "warm pad" family in F major): no file, no licence. Low; off with room sounds off. */
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
  const level = () => 0.05 * soundVolume();
  const music = {
    muted: !soundsOn(),
    start() {
      if (music.muted || ctx) return;
      void runningAudio(400).then((audio) => {
        if (!audio || music.muted || ctx) return;
        ctx = audio;
        master = audio.createGain();
        master.gain.value = 0;
        master.gain.linearRampToValueAtTime(level(), audio.currentTime + 1.5);
        const lp = audio.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 900;
        master.connect(lp).connect(audio.destination);
        next = audio.currentTime + 0.05;
        const plan = () => {
          if (!ctx || !master) return;
          while (next < ctx.currentTime + 1.5) {
            for (const f of CHORDS[step % CHORDS.length]!) {
              for (const detune of [-5, 5]) {
                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.type = 'triangle';
                o.frequency.value = f;
                o.detune.value = detune;
                g.gain.setValueAtTime(0, next);
                g.gain.linearRampToValueAtTime(0.18, next + 1.2);
                g.gain.linearRampToValueAtTime(0, next + 3.1);
                o.connect(g).connect(master);
                o.start(next);
                o.stop(next + 3.2);
              }
            }
            step++;
            next += 2.8;
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
  state(): { scene: number; scenes: number; kind: string; paused: boolean; mine: boolean; music: boolean };
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
    const body = el('div', { class: 'rc-body' });
    if (fact.kind === 'summary') {
      const save = el('button', { type: 'button', class: 'btn primary' }, tx().save);
      save.addEventListener('click', () => downloadImage(show.recap));
      body.append(
        el('h2', { class: 'rc-title' }, text.title),
        el('div', { class: 'rc-grid' }, ...summaryLines(show.recap).map((line) => el('span', {}, line))),
        el('div', { class: 'rc-actions' }, save),
      );
    } else {
      body.append(el('div', { class: 'rc-big' }, text.big), el('h2', { class: 'rc-title' }, text.title), el('p', { class: 'rc-sub' }, text.sub));
    }
    const node = el('div', { class: `rc-scene rc-bg-${scene}${reduced ? '' : ' rc-enter'}` }, el('div', { class: 'rc-cone', 'aria-hidden': 'true' }), decor(scene, fact, show.recap), body);
    sceneBox.replaceChildren(node);
    live.textContent = [text.big, text.title, text.sub].filter(Boolean).join('. ');
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

  const handle: Stage = {
    close,
    refresh: () => draw(),
    state: () => ({ scene: sceneNow(), scenes: facts.length, kind: facts[Math.max(0, sceneNow())]!.kind, paused, mine: mine !== null, music: !music.muted }),
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

/** A small card by the ✨ button: a guest asks the host; the host shows or watches alone. */
export function recapCard(anchor: HTMLElement, o: { host: boolean; readySec: number; ask: () => void; show: () => void }): void {
  document.querySelector('.rc-card')?.remove();
  const close = el('button', { type: 'button', class: 'icon-btn rc-card-x', 'aria-label': t('close'), title: t('close') }, '✕');
  const action = el('button', { type: 'button', class: 'btn primary' }, o.host ? tx().showAll : tx().ask);
  const card = el('div', { class: 'rc-card card', role: 'dialog', 'aria-label': tx().title }, el('div', { class: 'rc-card-head' }, el('b', {}, fill(tx().askTitle, { time: duration(o.readySec) })), close), el('p', { class: 'small muted' }, tx().askBody), action);
  const done = () => {
    card.remove();
    document.removeEventListener('pointerdown', outside, true);
  };
  const outside = (event: PointerEvent) => {
    if (!card.contains(event.target as Node) && !anchor.contains(event.target as Node)) done();
  };
  action.addEventListener('click', () => {
    if (o.host) {
      o.show();
      done();
      return;
    }
    o.ask();
    action.textContent = tx().asked;
    action.setAttribute('disabled', '');
    setTimeout(done, 1800);
  });
  close.addEventListener('click', done);
  document.addEventListener('pointerdown', outside, true);
  document.body.append(card);
  const r = anchor.getBoundingClientRect();
  const w = card.offsetWidth;
  const h = card.offsetHeight;
  // A hidden anchor (a phone's sheet pressed it): the card sits in the middle of the screen.
  const left = !r.width ? (innerWidth - w) / 2 : r.right + 10 + w < innerWidth ? r.right + 10 : Math.max(8, r.left - 10 - w);
  card.style.left = `${Math.max(8, Math.min(left, innerWidth - w - 8))}px`;
  card.style.top = `${!r.width ? (innerHeight - h) / 2 : Math.max(8, Math.min(r.top, innerHeight - h - 8))}px`;
  action.focus();
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

/** N2 / N4: a quiet line with Glowbeam (under the video), ✕ and "Don't remind me"; it fades by itself. */
export function nudge(
  place: HTMLElement,
  text: { kind: 'late'; sec: number } | { kind: 'last'; recap: Recap } | { kind: 'end'; host: boolean },
  o: { open: () => void; never: () => void; ms: number },
): void {
  document.querySelector('.rc-nudge')?.remove();
  const line =
    text.kind === 'late'
      ? el('span', {}, fill(tx().nudge, { time: duration(text.sec) }))
      : el(
          'button',
          { type: 'button', class: 'rc-nudge-open' },
          text.kind === 'end' ? (text.host ? tx().endHost : tx().endGuest) : fill(tx().lastTime, { when: dateText(text.recap.from), time: duration(text.recap.watchSec) }),
        );
  const x = el('button', { type: 'button', class: 'icon-btn', 'aria-label': t('close'), title: t('close') }, '✕');
  const never = el('button', { type: 'button', class: 'rc-nudge-never' }, tx().dontRemind);
  const box = el('div', { class: 'rc-nudge', role: 'status' }, createMascot(document, { torch: true }), line, never, x);
  const done = () => box.remove();
  if (text.kind !== 'late') line.addEventListener('click', () => {
    done();
    o.open();
  });
  x.addEventListener('click', done);
  never.addEventListener('click', () => {
    o.never();
    done();
  });
  place.append(box);
  setTimeout(done, o.ms);
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
