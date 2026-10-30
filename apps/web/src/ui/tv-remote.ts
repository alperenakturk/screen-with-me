// The phone (or computer) side of the TV version: "📺 TV'yi bağla" pairs a TV showing a 6-digit code, and while my TV
// is in the room this device becomes its remote. The TV plays the video and the voices; here: push-to-talk (the
// phone's microphone would hear the TV's speakers, so it is only on while the big button is held), camera, voice in
// / out, the TV's messages and voice volume, play / pause, disconnect. With earphones ("Kulaklık takılı") the
// microphone works as usual and the voices play here instead.

import type { ClientMessage, ServerMessage, TvOp } from '@swm/shared/protocol';
import { TV_CODE } from '@swm/shared/protocol';
import { el } from '../dom.ts';
import { t } from '../i18n.ts';
import { load, save } from '../storage.ts';
import { flashHint } from './hint.ts';

export interface TvRemoteDeps {
  send: (message: ClientMessage) => void;
  voice: { state(): { active: boolean; mic: boolean; cam: boolean }; toggleJoin(): void; toggleCam(): void; talk(on: boolean): void; silence(on: boolean): void };
  /** My TV appeared (true) or left: the room mutes or unmutes its own player. */
  onPresent: (present: boolean) => void;
}

const VOLUMES = [100, 70, 40, 0];

export function createTvRemote(deps: TvRemoteDeps) {
  let present = false;
  let earphones = load('tv:earphones') === '1';
  let tvChat = true;
  let tvVolume = 100;
  let tvListening = true;

  // ---- Pair dialog ----
  const codeInput = el('input', { id: 'tv-code', class: 'tv-code-input', inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: '7', placeholder: '123 456' });
  const pairButton = el('button', { type: 'submit', class: 'btn primary' });
  const pairTitle = el('h2', {});
  // Three steps, so the person knows what happens before typing anything (owner's feedback, 30 Oct 2026).
  const step1 = el('span', {});
  const step2 = el('span', {});
  const step3 = el('span', {});
  const pairAddress = el('p', { class: 'tv-address' });
  const browserNote = el('p', { class: 'muted small' });
  const close = el('button', { type: 'button', class: 'icon-btn dialog-close' }, '✕');
  const form = el('form', { class: 'tv-pair-form' }, codeInput, pairButton);
  const step = (n: string, text: HTMLElement, ...extra: HTMLElement[]) => el('li', { class: 'tv-step' }, el('b', { class: 'tv-step-n' }, n), el('div', {}, text, ...extra));
  const dialog = el(
    'div',
    { class: 'dialog tv-pair-dialog', role: 'dialog', 'aria-modal': 'true' },
    close,
    pairTitle,
    el('ol', { class: 'tv-steps' }, step('1', step1, pairAddress, browserNote), step('2', step2, form), step('3', step3)),
  );
  const backdrop = el('div', { class: 'dialog-backdrop', hidden: '' }, dialog);
  document.body.append(backdrop);
  const hide = () => {
    backdrop.hidden = true;
    dispatchEvent(new Event('swm-layout'));
  };
  close.addEventListener('click', hide);
  backdrop.addEventListener('click', (event) => event.target === backdrop && hide());
  addEventListener('keydown', (event) => event.key === 'Escape' && !backdrop.hidden && hide());
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const code = codeInput.value.replace(/\D/g, '');
    if (!TV_CODE.test(code)) {
      flashHint(codeInput, t('tv.codeBad'), 4000);
      return;
    }
    pairButton.disabled = true;
    deps.send({ t: 'tv-link', code });
  });

  // ---- Remote card (shown while my TV is here) ----
  const card = el('div', { class: 'card tv-remote', hidden: '' });
  const cardTitle = el('div', { class: 'tv-remote-title' });
  const ptt = el('button', { type: 'button', class: 'tv-ptt' });
  const join = el('button', { type: 'button', id: 'tv-r-join', class: 'btn tv-r-btn' });
  const cam = el('button', { type: 'button', id: 'tv-r-cam', class: 'btn tv-r-btn' });
  const play = el('button', { type: 'button', id: 'tv-r-play', class: 'btn tv-r-btn' });
  const chat = el('button', { type: 'button', id: 'tv-r-chat', class: 'btn tv-r-btn' });
  const volume = el('button', { type: 'button', id: 'tv-r-volume', class: 'btn tv-r-btn' });
  const listen = el('button', { type: 'button', id: 'tv-r-listen', class: 'btn tv-r-btn' });
  const earBox = el('input', { type: 'checkbox', id: 'tv-earphones' }) as HTMLInputElement;
  const earLabel = el('label', { class: 'tv-ear', for: 'tv-earphones' }, earBox, el('span', {}));
  const unlink = el('button', { type: 'button', id: 'tv-r-unlink', class: 'btn small-btn tv-r-red' });
  card.append(el('div', { class: 'tv-remote-head' }, cardTitle, unlink), ptt, el('div', { class: 'tv-r-grid' }, join, cam, play, chat, volume, listen), earLabel);
  earBox.checked = earphones;

  const tell = (op: TvOp, value?: number | boolean) => deps.send(value === undefined ? { t: 'tv', op } : { t: 'tv', op, value });
  join.addEventListener('click', () => {
    deps.voice.toggleJoin();
    setTimeout(render, 300);
  });
  cam.addEventListener('click', () => {
    deps.voice.toggleCam();
    setTimeout(render, 600);
  });
  play.addEventListener('click', () => tell('play'));
  chat.addEventListener('click', () => tell('chat', !tvChat));
  volume.addEventListener('click', () => tell('volume', VOLUMES[(VOLUMES.indexOf(tvVolume) + 1) % VOLUMES.length]!));
  listen.addEventListener('click', () => tell('voice', !tvListening));
  unlink.addEventListener('click', () => tell('unlink'));
  earBox.addEventListener('change', () => {
    earphones = earBox.checked;
    save('tv:earphones', earphones ? '1' : '0');
    applyAudio();
    render();
  });
  // Push-to-talk: the microphone is on only while the button is held (pointer capture: sliding off still ends it).
  ptt.addEventListener('pointerdown', (event) => {
    if (!deps.voice.state().active || earphones) return;
    event.preventDefault();
    ptt.setPointerCapture(event.pointerId);
    deps.voice.talk(true);
    ptt.classList.add('on');
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
    ptt.addEventListener(type, () => {
      if (!ptt.classList.contains('on')) return;
      deps.voice.talk(false);
      ptt.classList.remove('on');
    });
  }
  ptt.addEventListener('contextmenu', (event) => event.preventDefault());
  ptt.addEventListener('click', () => {
    if (!deps.voice.state().active) {
      deps.voice.toggleJoin();
      setTimeout(render, 300);
    }
  });

  /** With my TV here and no earphones: this device plays no voices and the microphone stays off between presses. */
  function applyAudio(): void {
    const quiet = present && !earphones;
    deps.voice.silence(quiet);
    if (quiet && deps.voice.state().mic) deps.voice.talk(false);
  }

  function render(): void {
    const voice = deps.voice.state();
    cardTitle.textContent = `📺 ${t('tv.remoteTitle')}`;
    ptt.hidden = earphones;
    ptt.textContent = voice.active ? t('tv.pttHold') : t('tv.pttJoin');
    ptt.classList.toggle('idle', !voice.active);
    join.textContent = voice.active ? `🔇 ${t('tv.voiceLeave')}` : `🎙 ${t('tv.voiceJoin')}`;
    // Not in voice: the big button joins (no second "join" button); in voice this one leaves.
    join.hidden = !voice.active && !earphones;
    cam.textContent = voice.cam ? `📷 ${t('tv.camOff')}` : `📷 ${t('tv.camOn')}`;
    cam.disabled = !voice.active;
    play.textContent = `⏯ ${t('tv.play')}`;
    chat.textContent = `💬 ${tvChat ? t('tv.chatOn') : t('tv.chatOff')}`;
    volume.textContent = `🔊 ${tvVolume === 0 ? t('tv.voiceMuted') : t('tv.voiceVolume', { n: tvVolume })}`;
    listen.textContent = `🎧 ${tvListening ? t('tv.listenOn') : t('tv.listenOff')}`;
    (earLabel.lastElementChild as HTMLElement).textContent = t('tv.earphones');
    unlink.textContent = `🚪 ${t('tv.unlink')}`;
    pairTitle.textContent = `📺 ${t('tv.explainTitle')}`;
    step1.textContent = t('tv.explain1');
    step2.textContent = t('tv.explain2');
    step3.textContent = t('tv.explain3');
    browserNote.textContent = t('tv.explainBrowser');
    pairAddress.textContent = `${location.host}/tv`;
    pairButton.textContent = t('tv.connect');
    close.title = t('close');
  }
  render();
  addEventListener('langchange', render);
  setInterval(() => present && render(), 1000);

  return {
    card,
    open(): void {
      codeInput.value = '';
      pairButton.disabled = false;
      render();
      backdrop.hidden = false;
      dispatchEvent(new Event('swm-layout'));
      codeInput.focus();
    },
    /** A code from the TV's QR (it opened this room): pair at once. */
    pairNow(code: string): void {
      if (TV_CODE.test(code)) deps.send({ t: 'tv-link', code });
    },
    message(message: Extract<ServerMessage, { t: 'tv' }>): void {
      if (message.op === 'linked') {
        hide();
        pairButton.disabled = false;
      } else if (message.op === 'present') {
        present = message.value === true;
        card.hidden = !present;
        deps.onPresent(present);
        applyAudio();
        // Ask the TV how it is set (messages, volume, listening).
        if (present) tell('state');
      } else if (message.op === 'chat' && typeof message.value === 'boolean') tvChat = message.value;
      else if (message.op === 'volume' && typeof message.value === 'number') tvVolume = message.value;
      else if (message.op === 'voice' && typeof message.value === 'boolean') tvListening = message.value;
      render();
    },
    /** The code was wrong / expired, or too many tries. */
    error(text: string): void {
      pairButton.disabled = false;
      if (!backdrop.hidden) flashHint(codeInput, text, 6000);
    },
    /** Voice joined / left elsewhere: keep the microphone rule (off between presses while the TV plays the voices). */
    voiceChanged(): void {
      applyAudio();
      render();
    },
    get present(): boolean {
      return present;
    },
  };
}
