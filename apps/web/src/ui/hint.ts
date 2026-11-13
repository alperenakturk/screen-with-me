import { el } from '../dom.ts';

/**
 * A small bubble that briefly appears over a button (e.g. "you are alone"). It opens no dialog and goes away by itself;
 * only one at a time. Any click elsewhere, Esc or scrolling closes it early, and pressing the same button again
 * closes it instead of reopening it (owner's feedback, 0.9.87: the "Why?" bubble stayed far too long).
 */
let current: { bubble: HTMLElement; anchor: HTMLElement } | null = null;
let timer = 0;
/** The anchor whose bubble was just closed by pressing it, so its click handler doesn't reopen it at once. */
let closedBy: { anchor: HTMLElement; at: number } | null = null;

function close(): void {
  if (!current) return;
  current.bubble.remove();
  current = null;
  clearTimeout(timer);
  document.removeEventListener('pointerdown', onPointerDown, true);
  document.removeEventListener('keydown', onKey, true);
  window.removeEventListener('scroll', close, true);
}

function onPointerDown(event: PointerEvent): void {
  if (!current) return;
  const target = event.target as Node | null;
  if (target && current.anchor.contains(target)) closedBy = { anchor: current.anchor, at: Date.now() };
  close();
}

function onKey(event: KeyboardEvent): void {
  if (event.key === 'Escape') close();
}

export function flashHint(anchor: HTMLElement, text: string, ms = 2800, below = false): void {
  if (closedBy?.anchor === anchor && Date.now() - closedBy.at < 600) {
    closedBy = null;
    return;
  }
  close();
  const bubble = el('div', { class: 'hint-bubble', role: 'status' }, text);
  document.body.append(bubble);
  const r = anchor.getBoundingClientRect();
  const w = bubble.offsetWidth;
  // Centered on the button and kept on screen; below it when there is no room above (or when asked).
  const left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8);
  const above = r.top - bubble.offsetHeight - 8;
  const top = above > 8 && !below ? above : r.bottom + 8;
  // A scaled page (a phone held sideways with a game open, device.ts `holdUpright`) makes <body> the fixed bubble's
  // frame: screen points are turned into its own.
  const page = document.body.getBoundingClientRect();
  const scale = document.body.offsetWidth ? page.width / document.body.offsetWidth : 1;
  const fixed = Math.abs(scale - 1) > 0.01;
  bubble.style.left = `${fixed ? (left - page.left) / scale : left}px`;
  bubble.style.top = `${fixed ? (top - page.top) / scale : top}px`;
  current = { bubble, anchor };
  timer = window.setTimeout(close, ms);
  document.addEventListener('pointerdown', onPointerDown, true);
  document.addEventListener('keydown', onKey, true);
  window.addEventListener('scroll', close, true);
}
