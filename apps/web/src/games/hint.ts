// GP3: one hint style for every game. `gameHint` turns an element into the shared hint (`hint.css`) and shows a line for
// a while; a new line replaces the old one. The element is a live region, so a screen reader reads it once.

import './hint.css';

export interface GameHint {
  show(text: string, ms?: number, mood?: 'good' | 'plain'): void;
  hide(): void;
}

export function gameHint(node: HTMLElement): GameHint {
  node.classList.add('game-hint');
  node.setAttribute('role', 'status');
  node.hidden = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const hide = () => {
    clearTimeout(timer);
    node.hidden = true;
  };
  return {
    show(text, ms = 2600, mood = 'plain') {
      clearTimeout(timer);
      node.textContent = text;
      node.dataset.mood = mood;
      // Restart the entrance when a line replaces one still showing.
      node.hidden = true;
      void node.offsetWidth;
      node.hidden = false;
      if (ms > 0) timer = setTimeout(hide, ms);
    },
    hide,
  };
}
