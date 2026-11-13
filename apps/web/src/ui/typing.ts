/**
 * The room's keyboard shortcuts stay quiet while someone types: in a text box, or on an element that takes the keys
 * itself (`[data-takes-keys]`, e.g. a word game's board: T, M, F or Space there is a letter, not cinema mode or mute).
 */
export function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.closest('[data-takes-keys]') !== null;
}
