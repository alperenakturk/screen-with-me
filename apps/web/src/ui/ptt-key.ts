import { DEFAULT_PTT_CODE, cleanPttCode } from '@swm/shared/embed';
import { t, type I18nKey } from '../i18n.ts';
import { load, save } from '../storage.ts';
import { flashHint } from './hint.ts';
import { debugHooks, labFail } from '../debug-lab.ts';

/**
 * Card PTT1: the push-to-talk key, chosen by pressing it. Matched by `KeyboardEvent.code` (the physical key, so Shift
 * or the keyboard layout never change it); the label is what the key printed when it was picked. Saved per browser
 * (`opt:pttKey`, `opt:pttLabel`); the film page learns it through the overlay's layout (`ShellLayout.ptt`).
 */
const CODE_KEY = 'opt:pttKey';
const LABEL_KEY = 'opt:pttLabel';

const MODIFIERS = new Set(['ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight']);

/** Keys that can never be the push-to-talk key, and why (the room's own shortcuts, navigation, the OS key). */
const REFUSED: ReadonlyArray<[RegExp, I18nKey]> = [
  [/^(Digit|Numpad)[1-8]$|^Key[PMKT]$|^Slash$/, 'voice.pttKeyTaken'],
  [/^(Tab|Enter|NumpadEnter|Space|Backspace|Delete|Arrow\w+|Page(Up|Down)|Home|End)$/, 'voice.pttKeyTaken'],
  [/^(Meta|OS)(Left|Right)$|^ContextMenu$|^CapsLock$|^F(5|11|12)$|^(Browser|Media|Audio|Launch)\w*$/, 'voice.pttKeySystem'],
];

const listeners = new Set<() => void>();

/** Push-to-talk is on and I'm in voice (set by voice.ts): only then does the film page pass the key on. */
let live = false;

export function setPttLive(on: boolean): void {
  if (live === on) return;
  live = on;
  dispatchEvent(new Event('swm-layout'));
}

/** The key the film page should pass on (the overlay's layout `ptt`), or null while push-to-talk isn't in use. */
export function pttLayoutCode(): string | null {
  return live ? pttCode() : null;
}

export function pttCode(): string {
  return cleanPttCode(load(CODE_KEY)) ?? DEFAULT_PTT_CODE;
}

export function pttLabel(): string {
  const code = pttCode();
  const label = load(LABEL_KEY);
  return code !== DEFAULT_PTT_CODE && label && label.length <= 16 ? label : labelOf(code, '');
}

/** Something to call when the key changes (the card's text, the overlay's layout, the shortcuts card). */
export function onPttKeyChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Why this key can't be the push-to-talk key, or null when it can. */
export function refusal(code: string): I18nKey | null {
  if (!cleanPttCode(code)) return 'voice.pttKeySystem';
  for (const [re, why] of REFUSED) if (re.test(code)) return why;
  return null;
}

export function setPttKey(code: string, key = ''): boolean {
  const clean = cleanPttCode(code);
  if (!clean || refusal(clean)) return false;
  save(CODE_KEY, clean);
  save(LABEL_KEY, labelOf(clean, key));
  for (const fn of listeners) fn();
  dispatchEvent(new Event('swm-layout'));
  return true;
}

/**
 * Is this key event the push-to-talk key? An old extension forwards only `key: 'v'` (no `code`) from the film page:
 * that still counts when the key is V. Other modifiers held turn it into a shortcut (Ctrl+V pastes), unless the
 * push-to-talk key is itself a modifier.
 */
export function isPttEvent(event: Pick<KeyboardEvent, 'key' | 'code' | 'ctrlKey' | 'metaKey' | 'altKey'>, down: boolean): boolean {
  const code = pttCode();
  const same = event.code ? event.code === code : code === DEFAULT_PTT_CODE && event.key.toLowerCase() === 'v';
  if (!same) return false;
  if (!down || MODIFIERS.has(code)) return true;
  return !event.ctrlKey && !event.metaKey && !event.altKey;
}

function labelOf(code: string, key: string): string {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (/^Numpad\d$/.test(code)) return `Num ${code.slice(6)}`;
  if (/^F\d{1,2}$/.test(code)) return code;
  const named: Record<string, string> = {
    ShiftLeft: 'Left Shift',
    ShiftRight: 'Right Shift',
    ControlLeft: 'Left Ctrl',
    ControlRight: 'Right Ctrl',
    AltLeft: 'Left Alt',
    AltRight: 'Right Alt',
    Backquote: '`',
    Insert: 'Insert',
    Pause: 'Pause',
    ScrollLock: 'Scroll Lock',
  };
  if (named[code]) return named[code]!;
  // A printing key on this layout (ö, ç, -, =, …): what it prints.
  if (key.length === 1 && key.trim()) return key.toUpperCase();
  return code.replace(/([a-z])([A-Z])/g, '$1 $2');
}

/**
 * The "change key" button: shows the key; pressing it waits for the next key (Esc cancels, a click elsewhere too).
 * A modifier alone counts when it is let go without another key; a modifier with a key is a shortcut and refused.
 */
export function pttKeyButton(button: HTMLButtonElement): void {
  let waiting: (() => void) | null = null;
  const draw = () => {
    button.textContent = waiting ? t('voice.pttKeyPress') : pttLabel();
    button.title = waiting ? t('voice.pttKeyPress') : t('voice.pttKey', { key: pttLabel() });
    button.setAttribute('aria-label', button.title);
    button.classList.toggle('waiting', !!waiting);
  };
  onPttKeyChange(draw);
  draw();
  button.addEventListener('click', () => {
    if (waiting) return waiting();
    let modifier = '';
    let modifierKey = '';
    const stop = (event: Event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    const finish = () => {
      removeEventListener('keydown', onDown, true);
      removeEventListener('keyup', onUp, true);
      removeEventListener('pointerdown', onAway, true);
      removeEventListener('blur', finish);
      waiting = null;
      draw();
    };
    const take = (code: string, key: string) => {
      const why = refusal(code);
      finish();
      if (why) flashHint(button, t(why, { key: labelOf(code, key) }), 3500);
      else if (setPttKey(code, key)) flashHint(button, t('voice.pttKeySet', { key: pttLabel() }), 2200);
    };
    const onDown = (event: KeyboardEvent) => {
      stop(event);
      if (event.repeat) return;
      if (event.key === 'Escape') return finish();
      if (MODIFIERS.has(event.code)) {
        modifier = event.code;
        modifierKey = event.key;
        return;
      }
      if (modifier || event.ctrlKey || event.metaKey || event.altKey) {
        finish();
        flashHint(button, t('voice.pttKeyCombo'), 3500);
        return;
      }
      take(event.code, event.key);
    };
    const onUp = (event: KeyboardEvent) => {
      stop(event);
      if (modifier && event.code === modifier) take(modifier, modifierKey);
    };
    const onAway = (event: PointerEvent) => {
      if (event.target !== button && !button.contains(event.target as Node)) finish();
    };
    addEventListener('keydown', onDown, true);
    addEventListener('keyup', onUp, true);
    addEventListener('pointerdown', onAway, true);
    addEventListener('blur', finish);
    waiting = finish;
    draw();
  });
}

// 🐞 Test Lab (card PTT1): `voice.pttKey` reports the key; with a code ("KeyB", "Backquote", "ControlRight") it sets it,
// `reset` goes back to V. A refused key says why (the picker's own rule).
debugHooks.register('ptt', () => ({
  commands: [
    {
      id: 'voice.pttKey',
      tab: 'status',
      run: (arg?: string) => {
        const want = arg?.trim() ?? '';
        if (want === 'reset') setPttKey(DEFAULT_PTT_CODE, 'v');
        else if (want) {
          const why = refusal(want);
          if (why) throw labFail({ en: `refused (${why}): ${want}`, tr: `reddedildi (${why}): ${want}` });
          setPttKey(want);
        }
        const text = JSON.stringify({ code: pttCode(), label: pttLabel(), filmPage: pttLayoutCode() });
        return { en: text, tr: text };
      },
    },
  ],
}));
