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

/**
 * Card FD1b: in the Shorts view a note from the rail (or ▲▼) never covers the rail, the chat panel or the player: on a
 * computer it sits under the Short when there is room, else at the Short's foot on its left; on a phone it sits over
 * the bar under the Short. Elsewhere (and in the narrow window's bottom bar) it stays at its button.
 */
function shortsSpot(anchor: HTMLElement, bubble: HTMLElement): { left: number; top: number } | null {
  const html = document.documentElement;
  if (!html.classList.contains('shorts-view') || !anchor.closest('#shorts-bar, #shorts-nav, .ph-shorts-bar')) return null;
  const h = bubble.offsetHeight;
  const bar = html.classList.contains('ph-shorts') ? document.querySelector<HTMLElement>('.ph-shorts-bar') : null;
  if (bar) {
    const b = bar.getBoundingClientRect();
    return { left: Math.max(8, (innerWidth - bubble.offsetWidth) / 2), top: b.top + Math.max(0, (b.height - h) / 2) };
  }
  const p = document.querySelector('.room.shorts .player-wrap')?.getBoundingClientRect();
  const rail = document.querySelector('#shorts-bar')?.getBoundingClientRect();
  // The narrow window's bottom bar sits under the Short: the button's own place is fine there.
  if (!p || !rail || rail.top >= p.bottom - 4) return null;
  bubble.style.maxWidth = `${Math.max(200, p.width)}px`;
  if (innerHeight - p.bottom >= bubble.offsetHeight + 8) {
    return { left: Math.max(8, p.left + p.width / 2 - bubble.offsetWidth / 2), top: p.bottom + 4 };
  }
  bubble.style.maxWidth = '';
  if (p.left < 180) return null;
  bubble.style.maxWidth = `${Math.min(320, p.left - 20)}px`;
  return { left: p.left - 12 - bubble.offsetWidth, top: p.bottom - bubble.offsetHeight };
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
  const spot = shortsSpot(anchor, bubble);
  const left = spot?.left ?? Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8);
  const above = r.top - bubble.offsetHeight - 8;
  const top = spot?.top ?? (above > 8 && !below ? above : r.bottom + 8);
  bubble.style.left = `${left}px`;
  bubble.style.top = `${top}px`;
  current = { bubble, anchor };
  timer = window.setTimeout(close, ms);
  document.addEventListener('pointerdown', onPointerDown, true);
  document.addEventListener('keydown', onKey, true);
  window.addEventListener('scroll', close, true);
}
