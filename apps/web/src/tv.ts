// TV version (owner chose A + C, 30 Oct 2026): the TV shows the room, a phone in the room is its remote.
//   /tv          on the TV: a 6-digit code + QR; a phone in a room types the code ("📺 TV'yi bağla") or scans the QR.
//   /tv/<code>   on the phone (from the QR): pick which of my rooms the TV joins.
// When paired, the TV gets the room and a link token and opens the room in TV mode (`/r/<room>?tv=1`).

import { qrSvg } from '@swm/shared/qr';
import { ROOM_ID_PATTERN, TV_CODE, TV_TOKEN } from '@swm/shared/protocol';
import { newRoomId } from '@swm/shared/room-id';
import { el } from './dom.ts';
import { t } from './i18n.ts';
import { savedRooms } from './saved-rooms.ts';
import { load, roomIdentity, save, sessionSave } from './storage.ts';

/** A paired TV may come back to its room with the same token for this long (the server keeps it as long). */
const LINK_TTL_MS = 12 * 60 * 60_000;
const KEEPALIVE_MS = 30_000;

export interface TvLink {
  room: string;
  token: string;
  at: number;
}

/** This TV's last pairing (the room it may return to). */
export function tvLink(): TvLink | null {
  try {
    const link = JSON.parse(load('tvLink') ?? 'null') as TvLink | null;
    if (link && ROOM_ID_PATTERN.test(link.room) && TV_TOKEN.test(link.token) && Date.now() - link.at < LINK_TTL_MS) return link;
  } catch {
    // A broken record counts as none.
  }
  return null;
}

export function saveTvLink(room: string, token: string): void {
  save('tvLink', JSON.stringify({ room, token, at: Date.now() }));
}

export function clearTvLink(): void {
  save('tvLink', '');
}

/** A code typed or scanned on the phone, waiting for the room to connect (sent after the room's welcome). */
export function rememberPairing(code: string): void {
  sessionSave('tvPair', JSON.stringify({ code, at: Date.now() }));
}

function roomLabel(id: string): string {
  return savedRooms().find((r) => r.id === id)?.name ?? t('roomCode', { id });
}

function newCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0]! % 900000;
  return String(100000 + n);
}

/** The TV's pairing screen. */
export function renderTvPair(app: HTMLElement): void {
  document.documentElement.classList.add('tv-pair-page');
  const codeEl = el('div', { class: 'tvp-code', 'aria-live': 'polite' });
  const qr = el('img', { class: 'tvp-qr', alt: '' });
  const status = el('p', { class: 'tvp-status muted' });
  const actions = el('div', { class: 'tvp-actions' });
  app.replaceChildren(
    el(
      'section',
      { class: 'tvp' },
      el(
        'div',
        { class: 'tvp-text' },
        el('h1', {}, t('tv.pairTitle')),
        el('p', { class: 'tvp-how' }, t('tv.pairHow')),
        codeEl,
        status,
        actions,
      ),
      el('div', { class: 'tvp-side' }, qr, el('p', { class: 'muted' }, t('tv.pairQr'))),
    ),
  );

  const last = tvLink();
  if (last) {
    const back = el('button', { type: 'button', class: 'btn primary tvp-btn' }, `↩ ${t('tv.backTo', { room: roomLabel(last.room) })}`);
    back.addEventListener('click', () => location.assign(`/r/${last.room}?tv=1`));
    actions.append(back);
  }
  const test = el('a', { class: 'btn tvp-btn', href: '/tv-test' }, `🔎 ${t('tvtest.title')}`);
  actions.append(test);
  (actions.querySelector<HTMLElement>('.tvp-btn') ?? test).focus();
  // Arrow keys move between the buttons (some TV browsers have no focus movement of their own).
  addEventListener('keydown', (event) => {
    const buttons = [...actions.querySelectorAll<HTMLElement>('.tvp-btn')];
    const i = buttons.indexOf(document.activeElement as HTMLElement);
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') buttons[(i + 1) % buttons.length]?.focus();
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') buttons[(i - 1 + buttons.length) % buttons.length]?.focus();
  });

  let socket: WebSocket | null = null;
  let keepalive: ReturnType<typeof setInterval> | null = null;
  const wait = () => {
    const code = newCode();
    codeEl.textContent = `${code.slice(0, 3)} ${code.slice(3)}`;
    qr.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrSvg(`${location.origin}/tv/${code}`))}`;
    status.textContent = t('tv.pairWaiting');
    const ws = new WebSocket(`${location.origin.replace(/^http/, 'ws')}/api/tv/${code}/ws`);
    socket = ws;
    let paired = false;
    ws.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data)) as { t: string; room?: string; token?: string };
      if (message.t === 'paired' && message.room && message.token && ROOM_ID_PATTERN.test(message.room) && TV_TOKEN.test(message.token)) {
        paired = true;
        saveTvLink(message.room, message.token);
        status.textContent = t('tv.pairDone');
        location.assign(`/r/${message.room}?tv=1`);
      }
    });
    ws.addEventListener('close', () => {
      if (socket !== ws || paired) return;
      // The code expired (10 min), another TV had it, or the network blinked: a new code.
      if (keepalive) clearInterval(keepalive);
      setTimeout(wait, 1000);
    });
    if (keepalive) clearInterval(keepalive);
    keepalive = setInterval(() => ws.readyState === WebSocket.OPEN && ws.send('{"t":"ping"}'), KEEPALIVE_MS);
  };
  wait();
}

/** On the phone, opened from the TV's QR: which room should the TV join? */
export function renderTvChooser(app: HTMLElement, code: string): void {
  if (!TV_CODE.test(code)) {
    location.replace('/');
    return;
  }
  let ids: string[] = [];
  try {
    const list = JSON.parse(load('meRooms') ?? '[]') as unknown;
    if (Array.isArray(list)) ids = list.filter((x): x is string => typeof x === 'string' && ROOM_ID_PATTERN.test(x) && roomIdentity(x) !== null).reverse();
  } catch {
    // No rooms yet.
  }
  for (const saved of savedRooms()) if (!ids.includes(saved.id)) ids.push(saved.id);
  const go = (room: string) => {
    rememberPairing(code);
    location.assign(`/r/${room}`);
  };
  const list = el('div', { class: 'tvc-list' });
  for (const id of ids.slice(0, 8)) {
    const button = el('button', { type: 'button', class: 'btn tvc-room' }, `🎬 ${roomLabel(id)}`);
    button.addEventListener('click', () => go(id));
    list.append(button);
  }
  const fresh = el('button', { type: 'button', class: 'btn primary tvc-room' }, `＋ ${t('tv.chooseNew')}`);
  fresh.addEventListener('click', () => go(newRoomId()));
  list.append(fresh);
  app.replaceChildren(
    el(
      'section',
      { class: 'card tvc' },
      el('h1', {}, `📺 ${t('tv.chooseTitle')}`),
      el('p', { class: 'muted' }, ids.length ? t('tv.chooseText', { code: `${code.slice(0, 3)} ${code.slice(3)}` }) : t('tv.chooseNone')),
      list,
    ),
  );
}
