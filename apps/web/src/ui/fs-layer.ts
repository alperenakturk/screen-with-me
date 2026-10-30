/**
 * In real fullscreen the browser shows only the fullscreen element (the room's theater); windows and bubbles the
 * site adds to <body> (join-voice notices, the device check, confirm questions, hints, the person menu) were invisible
 * there (owner's report). While fullscreen lasts they are moved into the fullscreen element, and back to <body> when
 * it ends. In the shell (film page) and with the phones' own fullscreen nothing is fullscreen but the whole page, so
 * nothing moves.
 */
const FLOATING = '.dialog-backdrop, .recap-backdrop, .hint-bubble, .person-pop';

export function keepFloatingInFullscreen(): void {
  const moved = new Set<Element>();
  const lift = (node: Element) => {
    const fs = document.fullscreenElement;
    if (!fs || fs === document.documentElement || fs.contains(node)) return;
    fs.append(node);
    moved.add(node);
  };
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) if (node instanceof Element && node.matches(FLOATING)) lift(node);
    }
  }).observe(document.body, { childList: true });
  document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) {
      for (const node of [...document.body.children]) if (node.matches(FLOATING)) lift(node);
      return;
    }
    for (const node of moved) if (node.isConnected) document.body.append(node);
    moved.clear();
  });
}
