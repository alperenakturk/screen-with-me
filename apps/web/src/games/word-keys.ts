// BUG6 (owner, 10 Nov 2026): "when I open the word game, my keyboard should go straight to it". The word games (Five
// Frames, the Five Frames Duel) give their board the focus as they open and as a round starts, so letters, Enter and
// Backspace go into the guess at once. They never take the keys from a text box the person is typing in (the chat);
// a click anywhere on the game, or Esc in that text box, brings them back. On a touch-only device the game's own
// letter tray is the keyboard, so nothing is focused there.
import { hasMouse, isTouch } from '../device.ts';

const TYPING = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]';

/** The board takes the keys now, unless someone is typing elsewhere or the "How to play" cards are up. */
export function grabKeys(board: HTMLElement, force = false): void {
  if (!board.isConnected || (isTouch() && !hasMouse())) return;
  const active = document.activeElement;
  if (!force && active instanceof HTMLElement && active !== board && active.matches(TYPING)) return;
  if (board.closest('[hidden]') || board.closest('#game-stage')?.querySelector('.htp:not([hidden])')) return;
  board.focus({ preventScroll: true });
}

/** Wires the ways the keys come back to `board`; returns the cleanup. */
export function keepKeys(box: HTMLElement, board: HTMLElement): () => void {
  // A press anywhere on the game (its buttons keep the focus where it is, so the board takes it after them).
  const onDown = (event: PointerEvent) => {
    if ((event.target as Element).closest(TYPING)) return;
    setTimeout(() => grabKeys(board, true));
  };
  // Esc in the chat (or any text box outside the game): back to the word.
  const onKey = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    const target = event.target as Element;
    if (target.matches?.(TYPING) && !box.contains(target)) setTimeout(() => grabKeys(board, true));
  };
  // The "How to play" cards closed (`how-to-play.ts` fires `htp-close`).
  const onHow = () => setTimeout(() => grabKeys(board));
  box.addEventListener('pointerdown', onDown);
  document.addEventListener('keydown', onKey, true);
  box.addEventListener('htp-close', onHow);
  return () => {
    box.removeEventListener('pointerdown', onDown);
    document.removeEventListener('keydown', onKey, true);
    box.removeEventListener('htp-close', onHow);
  };
}
