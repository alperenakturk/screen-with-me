/**
 * PH4 (owner, 19 Nov 2026: "everything upright, except watching the video; if we can't control the turn, show a
 * note"). A phone held sideways keeps only the video: the room's sideways view (the video, ⛶ Watch fullscreen, 💬 and
 * 🎙 beside it) and the video's fullscreen. Anything else held sideways (the Games, Search and Me tabs, any game or
 * the games hall, a dialog or sheet, the room before its first video, the home page, joining) is covered by one calm
 * full-screen note, "📱↻ Turn your phone upright", and nothing under it can be tapped or reached with a key. Where the
 * browser allows it (Android, in fullscreen or an installed app) the screen is locked upright instead, which turns the
 * page and takes the note away by itself. Tablets and computers never see it (`isPhone()`).
 */
import { el } from '../dom.ts';
import { isPhone, isSideways, lockPortrait, onTurn } from '../device.ts';
import { t } from '../i18n.ts';
import { debugHooks } from '../debug-lab.ts';

const shown = (node: Element | null): boolean => !!node && node.getClientRects().length > 0;

/** Only the video is on screen: the room's video (or its fullscreen), with nothing over it but the chat sheet. */
function watching(): boolean {
  const html = document.documentElement;
  if (!document.querySelector('.room.has-item')) return false;
  if (html.classList.contains('ph-room') && (html.dataset.phTab ?? 'room') !== 'room') return false;
  const error = document.getElementById('player-error');
  if (error && !error.hidden) return false;
  if (shown(document.querySelector('#game-stage:not([hidden])')) || shown(document.querySelector('#game-menu:not([hidden])'))) return false;
  // A dialog or a sheet over the room; the chat sheet beside the sideways video (💬) is part of watching.
  for (const modal of document.querySelectorAll<HTMLElement>('[aria-modal="true"], .dialog-backdrop:not([hidden])')) {
    if (modal.id === 'turn-note' || modal.dataset.sheet === 'shorts-chat' || modal.hidden) continue;
    if (shown(modal)) return false;
  }
  return true;
}

export function startTurnNote(): void {
  const icon = el('div', { class: 'turn-note-ico', 'aria-hidden': 'true' }, '📱↻');
  const title = el('p', { class: 'turn-note-t', id: 'turn-note-t' });
  const why = el('p', { class: 'turn-note-why muted' });
  const note = el('div', { class: 'turn-note', id: 'turn-note', role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'turn-note-t', tabindex: '-1', hidden: '' }, icon, title, why);
  const label = () => {
    title.textContent = t('phone.turnNote');
    why.textContent = t('phone.turnNote.why');
  };
  label();
  addEventListener('langchange', label);
  document.body.append(note);

  /** The page's other parts made inert while the note shows (given back as they were). */
  const madeInert = new Set<Element>();
  let locked = false;
  let asked = false;
  let watched: MutationObserver | null = null;

  const check = () => {
    const html = document.documentElement;
    const phone = isPhone();
    const watch = watching();
    const on = phone && isSideways() && !watch;
    if (note.hidden === on) {
      note.hidden = !on;
      html.classList.toggle('turn-noted', on);
      if (on) note.focus({ preventScroll: true });
    }
    if (on) {
      for (const child of document.body.children) {
        if (child === note || child.hasAttribute('inert')) continue;
        child.setAttribute('inert', '');
        madeInert.add(child);
      }
      // The browser may hold the screen upright itself (it turns the page, and the note goes); asked once per showing.
      if (!asked) {
        asked = true;
        void lockPortrait().then((ok) => {
          locked = ok;
        });
      }
    } else {
      for (const child of madeInert) child.removeAttribute('inert');
      madeInert.clear();
      asked = false;
    }
    // Back to the video: an upright lock of ours lets go, so the phone can turn to watch.
    if (locked && watch) {
      locked = false;
      screen.orientation?.unlock?.();
    }
    // Only a sideways phone (or one we hold upright) watches the page for dialogs, tabs and games coming and going.
    const follow = phone && (isSideways() || locked);
    if (follow && !watched) {
      watched = new MutationObserver(soon);
      watched.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'class'] });
    } else if (!follow && watched) {
      watched.disconnect();
      watched = null;
    }
  };
  let queued = false;
  function soon(): void {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      check();
    });
  }
  onTurn(soon);
  addEventListener('resize', soon);
  new MutationObserver(soon).observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-ph-tab'] });
  check();

  // 🐞 Test Lab (PH4): whether the note shows, and why.
  debugHooks.register('phone', () => ({
    commands: [
      {
        id: 'phone.turnNote',
        tab: 'screen',
        run: () =>
          JSON.stringify({
            shown: !note.hidden,
            phone: isPhone(),
            sideways: isSideways(),
            watching: watching(),
            locked,
            text: title.textContent,
          }),
      },
    ],
    status: () => (note.hidden ? [] : [[{ en: 'Turn note', tr: 'Dik tut notu' }, 'on']]),
  }));
}
