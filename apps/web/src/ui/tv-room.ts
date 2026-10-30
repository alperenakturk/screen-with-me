// The room on a TV (owner chose A + C, 30 Oct 2026): the video fills the screen, messages and emojis fly over it, the
// faces of the people in the room sit at the top (a green ring while someone speaks), and the remote has only the
// basics. OK opens a bar of big buttons: play / pause, emojis, messages on / off, voice volume, disconnect the TV.
// ↑ opens the emojis directly; Back closes what is open, or asks before disconnecting. Typing, voice, camera and the
// rest happen on the paired phone (its remote mode), which also sends commands here (`{t:'tv', op}`).

import type { Member, Reaction, ServerMessage, TvOp } from '@swm/shared/protocol';
import { REACTIONS } from '@swm/shared/protocol';
import { el } from '../dom.ts';
import { avatarNode } from './avatar.ts';
import { t } from '../i18n.ts';
import { load, save } from '../storage.ts';

export interface TvRoomDeps {
  theater: HTMLElement;
  togglePlay: () => void;
  react: (emoji: Reaction) => void;
  /** Relay to my phone. */
  tell: (op: TvOp, value?: number | boolean) => void;
  voice: { listen(): Promise<boolean>; toggleJoin(): void; state(): { active: boolean }; setMaster(volume: number): void; speakers(): Set<string> };
  myId: () => string | null;
  /** The TV disconnects (goes back to its pairing screen). */
  leave: () => void;
}

/** Remote keys: Back on TV browsers arrives as Escape, GoBack, BrowserBack or one of these key codes. */
const BACK_CODES = new Set([4, 8, 27, 461, 10009]);
const OK_CODES = new Set([13, 23, 66]);
const PLAY_CODES = new Set([85, 179, 415, 19, 10252]);
const VOLUMES = [100, 70, 40, 0];
const TV_EMOJIS = REACTIONS.slice(0, 8);
const IDLE_MS = 8000;

export function createTvRoom(deps: TvRoomDeps) {
  document.documentElement.classList.add('tv-mode');
  let chatShown = load('tv:chat') !== '0';
  let volume = Number(load('tv:volume') ?? 100);
  if (!VOLUMES.includes(volume)) volume = 100;
  let listening = load('tv:voice') !== '0';
  let members: Member[] = [];

  const faces = el('div', { class: 'tv-faces' });
  const title = el('div', { class: 'tv-title' });
  const top = el('div', { class: 'tv-top' }, title, faces);
  const hint = el('div', { class: 'tv-hint' });
  const empty = el('div', { class: 'tv-empty', hidden: '' });

  const button = (icon: string, cls = '') => {
    const label = el('span', { class: 'tv-label' });
    const b = el('button', { type: 'button', class: `tv-btn ${cls}`.trim() }, el('span', { class: 'tv-icon', 'aria-hidden': 'true' }, icon), label);
    return { b, label };
  };
  const play = button('⏯');
  const emoji = button('😀');
  const chat = button('💬');
  const sound = button('🔊');
  const voice = button('🎧');
  const leave = button('🚪', 'tv-red');
  const bar = el('div', { class: 'tv-bar', hidden: '' }, play.b, emoji.b, chat.b, sound.b, voice.b, leave.b);
  const emojis = el('div', { class: 'tv-emojis', hidden: '' });
  for (const e of TV_EMOJIS) {
    const b = el('button', { type: 'button', class: 'tv-btn tv-emoji' }, e);
    b.addEventListener('click', () => deps.react(e));
    emojis.append(b);
  }
  const stay = button('↩');
  const bye = button('🚪', 'tv-red');
  const confirmText = el('p', { class: 'tv-confirm-text' });
  const confirm = el('div', { class: 'tv-confirm', hidden: '' }, confirmText, el('div', { class: 'tv-row' }, stay.b, bye.b));
  deps.theater.append(top, empty, hint, bar, emojis, confirm);

  const panels = [bar, emojis, confirm];
  const openPanel = () => panels.find((p) => !p.hidden) ?? null;
  let idle: ReturnType<typeof setTimeout> | null = null;
  function show(panel: HTMLElement | null, focus?: HTMLElement): void {
    for (const p of panels) p.hidden = p !== panel;
    document.documentElement.classList.toggle('tv-panel', panel !== null);
    if (panel) (focus ?? panel.querySelector<HTMLElement>('.tv-btn'))?.focus();
    else (document.activeElement as HTMLElement | null)?.blur?.();
    poke();
  }
  /** Any key: the hint shows again, an open panel stays a little longer. */
  function poke(): void {
    document.documentElement.classList.remove('tv-idle');
    if (idle) clearTimeout(idle);
    idle = setTimeout(() => {
      if (openPanel() !== confirm) show(null);
      document.documentElement.classList.add('tv-idle');
    }, IDLE_MS);
  }

  function render(): void {
    play.label.textContent = t('tv.play');
    emoji.label.textContent = t('tv.emoji');
    chat.label.textContent = chatShown ? t('tv.chatOn') : t('tv.chatOff');
    sound.label.textContent = volume === 0 ? t('tv.voiceMuted') : t('tv.voiceVolume', { n: volume });
    voice.label.textContent = listening ? t('tv.listenOn') : t('tv.listenOff');
    leave.label.textContent = t('tv.leave');
    stay.label.textContent = t('tv.stay');
    bye.label.textContent = t('tv.leave');
    confirmText.textContent = t('tv.leaveAsk');
    hint.textContent = t('tv.hint');
    document.documentElement.classList.toggle('tv-no-chat', !chatShown);
  }

  function setChat(on: boolean): void {
    chatShown = on;
    save('tv:chat', on ? '1' : '0');
    deps.tell('chat', on);
    render();
  }
  function setVolume(next: number): void {
    volume = next;
    save('tv:volume', String(next));
    deps.voice.setMaster(next / 100);
    deps.tell('volume', next);
    render();
  }
  function setListening(on: boolean): void {
    listening = on;
    save('tv:voice', on ? '1' : '0');
    deps.tell('voice', on);
    syncVoice();
    render();
  }

  play.b.addEventListener('click', () => deps.togglePlay());
  emoji.b.addEventListener('click', () => show(emojis));
  chat.b.addEventListener('click', () => setChat(!chatShown));
  sound.b.addEventListener('click', () => setVolume(VOLUMES[(VOLUMES.indexOf(volume) + 1) % VOLUMES.length]!));
  voice.b.addEventListener('click', () => setListening(!listening));
  leave.b.addEventListener('click', () => show(confirm, stay.b));
  stay.b.addEventListener('click', () => show(null));
  bye.b.addEventListener('click', () => deps.leave());

  /** Listen to voice while someone else (not me on my phone) is in it; leave when nobody is. */
  function syncVoice(): void {
    const me = members.find((m) => m.id === deps.myId());
    const others = members.some((m) => m.voice && m.id !== me?.id && !(me && m.name === me.name && (m.avatar ?? '') === (me.avatar ?? '')));
    const active = deps.voice.state().active;
    if (listening && others && !active) void deps.voice.listen().catch(() => {});
    else if ((!listening || !others) && active) deps.voice.toggleJoin();
  }

  function renderFaces(): void {
    const me = members.find((m) => m.id === deps.myId());
    const seen = new Set<string>();
    const people: Member[] = [];
    for (const m of members) {
      if (m.tv) continue;
      const key = `${m.name}|${m.avatar ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      people.push(m);
    }
    faces.replaceChildren(
      ...people.slice(0, 8).map((m) => {
        const img = avatarNode(m.avatar, 'tv-face-pic');
        const face = el('div', { class: m.voice ? 'tv-face in-voice' : 'tv-face', 'data-person': `${m.name}|${m.avatar ?? ''}` }, img, el('span', { class: 'tv-face-name' }, m.name));
        if (me && m.name === me.name && (m.avatar ?? '') === (me.avatar ?? '')) face.classList.add('me');
        return face;
      }),
      ...(people.length > 8 ? [el('div', { class: 'tv-face more' }, `+${people.length - 8}`)] : []),
    );
  }
  // Who is speaking: any connection of a person (their phone) glows on that person's face.
  setInterval(() => {
    const speaking = new Set([...deps.voice.speakers()].map((id) => members.find((m) => m.id === id)).filter((m): m is Member => !!m).map((m) => `${m.name}|${m.avatar ?? ''}`));
    for (const face of faces.querySelectorAll<HTMLElement>('.tv-face[data-person]')) face.classList.toggle('speaking', speaking.has(face.dataset.person!));
  }, 250);

  // ---- Remote keys (capture phase: the room's own shortcuts never see them on a TV) ----
  const isBack = (e: KeyboardEvent) => e.key === 'Escape' || e.key === 'GoBack' || e.key === 'BrowserBack' || e.key === 'Backspace' || BACK_CODES.has(e.keyCode);
  const isOk = (e: KeyboardEvent) => e.key === 'Enter' || OK_CODES.has(e.keyCode);
  function back(): void {
    const panel = openPanel();
    if (panel === emojis) show(bar, emoji.b);
    else if (panel) show(null);
    else show(confirm, stay.b);
  }
  function move(step: number): void {
    const panel = openPanel();
    if (!panel) return;
    const buttons = [...panel.querySelectorAll<HTMLElement>('.tv-btn')];
    const i = buttons.indexOf(document.activeElement as HTMLElement);
    buttons[(i + step + buttons.length) % buttons.length]?.focus();
  }
  let audioUnlocked = false;
  addEventListener(
    'keydown',
    (event) => {
      // The first press counts as the "click" browsers want before they play sound: voices start now.
      if (!audioUnlocked) {
        audioUnlocked = true;
        for (const audio of document.querySelectorAll('audio')) void audio.play().catch(() => {});
      }
      poke();
      const panel = openPanel();
      if (isBack(event)) back();
      else if (PLAY_CODES.has(event.keyCode) || event.key === 'MediaPlayPause' || event.key === 'MediaPlay' || event.key === 'MediaPause') deps.togglePlay();
      else if (isOk(event)) {
        if (!panel) show(bar);
        else (document.activeElement as HTMLElement | null)?.click();
      } else if (event.key === 'ArrowLeft') move(-1);
      else if (event.key === 'ArrowRight') move(1);
      else if (event.key === 'ArrowUp') {
        if (!panel) show(emojis);
        else move(-1);
      } else if (event.key === 'ArrowDown') {
        if (!panel) show(bar);
        else move(1);
      } else return;
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    true,
  );
  // Back as browser history (TV browsers): a history entry catches it, so Back never leaves the room by itself.
  history.pushState({ tv: true }, '');
  addEventListener('popstate', () => {
    history.pushState({ tv: true }, '');
    back();
  });

  render();
  poke();
  addEventListener('langchange', render);
  deps.voice.setMaster(volume / 100);

  return {
    members(next: Member[]): void {
      members = next;
      renderFaces();
      syncVoice();
    },
    title(text: string): void {
      title.textContent = text;
    },
    /** Nothing playing / something the TV can't play (a film page): a big note instead of a black screen. */
    empty(note: string | null): void {
      empty.hidden = note === null;
      empty.textContent = note ?? '';
    },
    /** From my phone. */
    message(message: Extract<ServerMessage, { t: 'tv' }>): void {
      if (message.op === 'unlink') deps.leave();
      else if (message.op === 'chat' && typeof message.value === 'boolean') setChat(message.value);
      else if (message.op === 'volume' && typeof message.value === 'number') {
        const wanted = message.value;
        setVolume(VOLUMES.reduce((a, b) => (Math.abs(b - wanted) < Math.abs(a - wanted) ? b : a)));
      }
      else if (message.op === 'voice' && typeof message.value === 'boolean') setListening(message.value);
      else if (message.op === 'play') deps.togglePlay();
      else if (message.op === 'state') reportState();
    },
    /** Tell my phone how this TV is set (after joining, or when my phone appears). */
    reportState,
  };

  function reportState(): void {
    deps.tell('chat', chatShown);
    deps.tell('volume', volume);
    deps.tell('voice', listening);
  }
}
