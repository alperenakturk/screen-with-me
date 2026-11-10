// NG3 (owner's pick 10: 4): a little motion in the games, all of it skipped under "reduce motion" (the system setting).
// Web Animations from code, so the room page's stylesheet (at its budget) gets no new rules:
// - `slideIn`: the game window comes up as it opens;
// - `slidePiece`: a board piece slides from its old square to the new one (a copy moves, the real one waits hidden);
// - `flipIn`: a card that turns face up flips over.

/** The person asked their system for less motion. */
export const reducedMotion = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const can = (node: Element | null | undefined): node is HTMLElement => !!node && typeof (node as HTMLElement).animate === 'function' && !reducedMotion();

/** The game window comes up and in (220 ms). */
export function slideIn(node: HTMLElement): void {
  if (!can(node)) return;
  // `translate`, not `transform`: the window's own transform (its fit scale) stays as it is.
  node.animate([{ opacity: 0, translate: '0 14px' }, { opacity: 1, translate: '0 0' }], { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' });
}

/** Classes that paint the square, not the piece: the copy that slides leaves them behind. */
const SQUARE = ['dark', 'lit', 'target', 'picked', 'movable', 'in-check', 'placed', 'win'];

/** The piece now on `to` slides there from `from` (two cells of the same board; layout offsets, so a scaled window is fine). */
export function slidePiece(from: HTMLElement | null | undefined, to: HTMLElement | null | undefined, ms = 240): void {
  const board = to?.parentElement;
  // The copy goes into the board itself (its piece styles hang off the board); the board is the offset parent.
  if (!from || !can(to) || from === to || !board || from.parentElement !== board || to.offsetParent !== board) return;
  const ghost = to.cloneNode(true) as HTMLElement;
  ghost.removeAttribute('id');
  ghost.removeAttribute('aria-label');
  ghost.setAttribute('aria-hidden', 'true');
  ghost.classList.remove(...SQUARE);
  ghost.classList.add('move-ghost');
  Object.assign(ghost.style, {
    position: 'absolute', left: `${to.offsetLeft}px`, top: `${to.offsetTop}px`, width: `${to.offsetWidth}px`, height: `${to.offsetHeight}px`,
    margin: '0', zIndex: '3', pointerEvents: 'none', background: 'none', boxShadow: 'none', animation: 'none',
  });
  board.append(ghost);
  to.classList.add('arriving');
  const dx = from.offsetLeft - to.offsetLeft;
  const dy = from.offsetTop - to.offsetTop;
  const run = ghost.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: ms, easing: 'cubic-bezier(.3,.7,.2,1)' });
  const done = () => {
    ghost.remove();
    to.classList.remove('arriving');
  };
  run.onfinish = done;
  run.oncancel = done;
}

/** A card turning face up flips over (rotateY). */
export function flipIn(node: HTMLElement, delay = 0): void {
  if (!can(node)) return;
  node.animate(
    [{ transform: 'perspective(400px) rotateY(90deg)', opacity: 0.6 }, { transform: 'perspective(400px) rotateY(0deg)', opacity: 1 }],
    { duration: 280, delay, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'backwards' },
  );
}
