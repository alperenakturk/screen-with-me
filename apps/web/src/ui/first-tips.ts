import { el } from '../dom.ts';
import { t } from '../i18n.ts';
import { load, save } from '../storage.ts';

/**
 * Three short tips the first time someone enters a room (0.9.91.20, owner's choice for PDF item 1 "first-time
 * path"): invite a friend → paste a link or search → join voice. Each bubble points at its button; "Sonraki" goes on,
 * "Anladım" or ✕ / Esc ends them, and they never come back in this browser (`tipsSeen`). A tip whose button isn't on
 * screen (phones fold the link box into ＋) is pointed at the button that is.
 */
interface Tip {
  /** First match that is on screen wins. */
  anchors: string[];
  text: 'tips.invite' | 'tips.add' | 'tips.voice';
}

// The second anchor of each is the phone's (0.9.92.3): ⋯ holds Invite, ＋ adds a video, the strip's 🎙 joins voice.
const TIPS: Tip[] = [
  { anchors: ['#invite-btn', '#strip-more'], text: 'tips.invite' },
  { anchors: ['#media-input', '#chat-plus'], text: 'tips.add' },
  { anchors: ['#voice-join', '#strip-mic'], text: 'tips.voice' },
];

const KEY = 'tipsSeen';

function visible(element: Element | null): element is HTMLElement {
  if (!(element instanceof HTMLElement)) return false;
  const r = element.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(element).visibility !== 'hidden';
}

export function showFirstTips(): void {
  if (load(KEY) === '1') return;
  let step = 0;
  let bubble: HTMLElement | null = null;
  const shown = () => TIPS.filter((tip) => tip.anchors.some((sel) => visible(document.querySelector(sel))));

  const finish = () => {
    save(KEY, '1');
    bubble?.remove();
    bubble = null;
    removeEventListener('resize', place);
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') finish();
  };

  let anchor: HTMLElement | null = null;
  function place(): void {
    if (!bubble || !anchor) return;
    const r = anchor.getBoundingClientRect();
    const b = bubble.getBoundingClientRect();
    const below = r.bottom + 12 + b.height < innerHeight;
    bubble.classList.toggle('above', !below);
    const top = below ? r.bottom + 12 : r.top - 12 - b.height;
    const left = Math.min(Math.max(8, r.left + r.width / 2 - b.width / 2), innerWidth - b.width - 8);
    bubble.style.top = `${Math.round(top)}px`;
    bubble.style.left = `${Math.round(left)}px`;
    bubble.style.setProperty('--arrow-x', `${Math.round(r.left + r.width / 2 - left)}px`);
  }

  function show(): void {
    // A window is open (the invite window opens by itself in an empty room): the tips wait until it closes.
    const waiting = document.documentElement.classList.contains('invite-pending') || document.querySelector('.dialog-backdrop:not([hidden])');
    if (step === 0 && !bubble && waiting) return void setTimeout(show, 700);
    const tips = shown();
    if (step >= tips.length) return finish();
    const tip = tips[step]!;
    anchor = tip.anchors.map((sel) => document.querySelector(sel)).find(visible) ?? null;
    if (!anchor) return finish();
    const last = step === tips.length - 1;
    const next = el('button', { type: 'button', class: 'btn primary small-btn' }, t(last ? 'tips.done' : 'tips.next'));
    const close = el('button', { type: 'button', class: 'icon-btn first-tip-close', 'aria-label': t('close') }, '✕');
    bubble?.remove();
    // Card A11y (K6): the tip is named by its text, and its "Next" takes the focus unless the person is typing.
    bubble = el(
      'div',
      { class: 'first-tip', role: 'dialog', 'aria-live': 'polite', 'aria-labelledby': 'first-tip-text' },
      el('p', { id: 'first-tip-text' }, t(tip.text)),
      el('div', { class: 'first-tip-row' }, el('span', { class: 'muted small' }, `${step + 1}/${tips.length}`), next),
      close,
    );
    document.body.append(bubble);
    next.addEventListener('click', () => {
      step++;
      show();
    });
    close.addEventListener('click', finish);
    place();
    if (!document.activeElement?.matches('input, textarea, [contenteditable]')) next.focus({ preventScroll: true });
  }

  addEventListener('resize', place);
  document.addEventListener('keydown', onKey);
  // After the room has drawn itself (and the intro animation has had its moment).
  setTimeout(show, 1600);
}
