import { t } from '../i18n.ts';
import { isPttEvent, pttLabel } from './ptt-key.ts';

/**
 * Card PTT1: the talk window. Browsers never give keys to a tab that isn't in front (Discord's web app has the same
 * limit), so a friend who switched tabs could not push-to-talk any more. Chrome, Edge, Brave and Opera on a computer
 * can open a small always-on-top window from our page (Document Picture-in-Picture): it holds one big button (hold to
 * talk with push-to-talk, else mute / unmute), and the push-to-talk key works while it has focus. It needs a click
 * to open, shows only our own button, needs no extension and no permission. Only a top-level page may open one, so
 * the film page's overlay (an iframe) doesn't offer it.
 */
export interface TalkWindowState {
  active: boolean;
  ptt: boolean;
  mic: boolean;
  talking: boolean;
  deaf: boolean;
}

export interface TalkWindowHooks {
  state: () => TalkWindowState;
  talk: (on: boolean) => void;
  toggleMic: () => void;
}

interface PipApi {
  requestWindow(options?: { width?: number; height?: number }): Promise<Window>;
  window: Window | null;
}

function pipApi(): PipApi | null {
  const api = (window as unknown as { documentPictureInPicture?: PipApi }).documentPictureInPicture;
  return api && window.top === window ? api : null;
}

/** Can this browser and this page open the talk window? */
export function canTalkWindow(): boolean {
  return pipApi() !== null;
}

const CSS = `
:root { color-scheme: dark; }
body { margin: 0; height: 100vh; display: grid; place-items: center; background: #14121c; color: #f4f1ff;
  font: 14px/1.3 system-ui, sans-serif; user-select: none; overflow: hidden; }
.box { display: grid; gap: 8px; justify-items: center; padding: 10px; text-align: center; }
button { min-width: 140px; min-height: 64px; padding: 10px 16px; border-radius: 14px; border: 2px solid #5b5378;
  background: #2a2540; color: inherit; font: 600 16px/1.2 system-ui, sans-serif; cursor: pointer; touch-action: none; }
button:focus-visible { outline: 3px solid #ffd479; outline-offset: 2px; }
button.on { background: #1f7a4a; border-color: #43d18a; }
button.muted { background: #5a2230; border-color: #ff6b81; }
.note { color: #c9c2e6; font-size: 12px; max-width: 220px; }
`;

export interface TalkWindow {
  open: () => Promise<boolean>;
  close: () => void;
  update: () => void;
  isOpen: () => boolean;
  /** Does the talk window have the focus (the room's window lost it to the talk window, not to another app)? */
  hasFocus: () => boolean;
}

export function createTalkWindow(hooks: TalkWindowHooks): TalkWindow {
  let win: Window | null = null;
  let button: HTMLButtonElement | null = null;
  let note: HTMLElement | null = null;

  const update = () => {
    if (!win || !button || !note) return;
    const s = hooks.state();
    if (!s.active) return close();
    const label = s.ptt ? (s.talking ? t('voice.talkWinTalking') : t('voice.talkWinHold')) : s.mic ? t('voice.mute') : t('voice.unmute');
    button.textContent = `${s.ptt ? (s.talking ? '🎙' : '🔇') : s.mic ? '🎙' : '🔇'} ${label}`;
    button.classList.toggle('on', s.ptt ? s.talking : s.mic);
    button.classList.toggle('muted', !s.ptt && !s.mic);
    note.textContent = s.deaf ? t('voice.talkWinDeaf') : s.ptt ? t('voice.talkWinKey', { key: pttLabel() }) : t('voice.talkWinNote');
    win.document.title = t('voice.talkWin');
  };

  function close(): void {
    const w = win;
    win = button = note = null;
    w?.close();
  }

  async function open(): Promise<boolean> {
    const api = pipApi();
    if (!api) return false;
    if (win) return true;
    let w: Window;
    try {
      w = await api.requestWindow({ width: 260, height: 170 });
    } catch {
      return false;
    }
    win = w;
    const doc = w.document;
    const style = doc.createElement('style');
    style.textContent = CSS;
    doc.head.append(style);
    doc.documentElement.lang = document.documentElement.lang;
    button = doc.createElement('button');
    button.type = 'button';
    note = doc.createElement('p');
    note.className = 'note';
    const box = doc.createElement('div');
    box.className = 'box';
    box.append(button, note);
    doc.body.append(box);
    const b = button;
    b.addEventListener('pointerdown', (event) => {
      if (!hooks.state().ptt) return;
      try {
        b.setPointerCapture(event.pointerId);
      } catch {
        // A pointer the window doesn't own (rare): the button's own pointerup still ends talking.
      }
      hooks.talk(true);
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) b.addEventListener(type, () => hooks.state().ptt && hooks.talk(false));
    b.addEventListener('click', () => {
      if (!hooks.state().ptt) hooks.toggleMic();
    });
    b.addEventListener('contextmenu', (event) => event.preventDefault());
    // The push-to-talk key works while the talk window is the window in front.
    doc.addEventListener('keydown', (event) => {
      if (!hooks.state().ptt || !isPttEvent(event, true)) return;
      event.preventDefault();
      if (!event.repeat) hooks.talk(true);
    });
    doc.addEventListener('keyup', (event) => {
      if (isPttEvent(event, false)) hooks.talk(false);
    });
    w.addEventListener('blur', () => hooks.state().ptt && hooks.talk(false));
    w.addEventListener('pagehide', () => {
      if (win === w) win = button = note = null;
      hooks.talk(false);
    });
    update();
    return true;
  }

  return { open, close, update, isOpen: () => win !== null, hasFocus: () => win?.document.hasFocus() === true };
}
