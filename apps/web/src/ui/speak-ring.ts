/**
 * Card SH1 (3): the speaking ring on a face (the Shorts seats on a computer and in the phone's Shorts bar). A green
 * ring with a soft glow that grows with the voice's level, and the face grows a little (up to 8 %; 4 % and a tighter glow in the phone's thin Shorts bar). Under "reduce
 * motion" only the ring shows: no glow pulse, no growth. Inline styles on purpose (the room's CSS budget is full);
 * the seat's own halo stays under the ring.
 */
const still = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
const HALO = '0 0 0 4px color-mix(in srgb, var(--bg) 70%, transparent)';

/** Level (0–1, about 0.03 quiet to 0.33 loud speech) to a 0–1 strength. */
export function speakStrength(level: number): number {
  return Math.min(1, Math.max(0, (level - 0.03) / 0.3));
}

export function ringFace(node: HTMLElement, on: boolean, level: number): void {
  if (!on) {
    if (node.dataset.speak === undefined) return;
    delete node.dataset.speak;
    node.style.removeProperty('box-shadow');
    node.style.removeProperty('transform');
    node.style.removeProperty('transition');
    return;
  }
  node.dataset.speak = '';
  if (still?.matches) {
    node.style.boxShadow = `0 0 0 3px var(--ok), ${HALO}`;
    node.style.removeProperty('transform');
    node.style.removeProperty('transition');
    return;
  }
  const k = speakStrength(level);
  // The phone's Shorts bar is a thin scrolling row that clips anything outside it: a tighter glow and growth there.
  const tight = !!node.closest('.ph-faces');
  node.style.transition = 'box-shadow 0.12s, transform 0.12s';
  node.style.boxShadow = tight
    ? `0 0 0 2px var(--ok), 0 0 ${Math.round(2 + 4 * k)}px ${Math.round(1 + k)}px var(--ok)`
    : `0 0 0 3px var(--ok), 0 0 ${Math.round(6 + 14 * k)}px ${Math.round(1 + 4 * k)}px var(--ok), ${HALO}`;
  node.style.transform = `scale(${(1 + (tight ? 0.04 : 0.08) * k).toFixed(3)})`;
}
