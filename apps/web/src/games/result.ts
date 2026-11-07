// GP2 (one result screen for the tables): when a Classics board or Sea Battle ends, a card comes up over the board:
// Glowbeam (cheering a win, a little sorry for a loss), "You won!" / "{name} won" / "A draw", the score, and the game's
// own buttons (Rematch, Change game…) moved into it, plus "See the board" to look at the final position (the card then
// stays away until the next result). The same look everywhere; each game passes its own words and buttons.

import './result.css';
import { el } from '../dom.ts';

export type Outcome = 'win' | 'lose' | 'draw' | 'over';

export interface ResultShow {
  /** A key for this one result (a new game's result shows again even after "See the board"). */
  key: string;
  outcome: Outcome;
  title: string;
  line: string;
  /** The game's own buttons for this moment (they move into the card while it shows). */
  actions: HTMLElement[];
  /** The label of the "look at the board" button. */
  see: string;
}

export interface ResultCard {
  show(view: ResultShow): void;
  hide(): void;
  readonly open: boolean;
}

/** Mounts the card into `host` (positioned over the board) with Glowbeam's picture `mascot`. */
export function resultCard(host: HTMLElement, mascot: HTMLElement, onHide?: (moved: HTMLElement[]) => void): ResultCard {
  const title = el('b', { class: 'gr-title' });
  const line = el('p', { class: 'gr-line' });
  const buttons = el('div', { class: 'gr-actions' });
  const see = el('button', { type: 'button', class: 'btn ghost small-btn gr-see' });
  const card = el('div', { class: 'gr-card', role: 'dialog', 'aria-live': 'polite' }, el('span', { class: 'gr-mascot' }, mascot), title, line, buttons, see);
  const layer = el('div', { class: 'gr-layer' }, card);
  layer.hidden = true;
  host.append(layer);
  let moved: HTMLElement[] = [];
  let seen = '';
  let current = '';
  const putBack = () => {
    if (moved.length) onHide?.(moved);
    moved = [];
  };
  see.addEventListener('click', () => {
    seen = current;
    hide();
  });
  function hide(): void {
    if (layer.hidden) return;
    layer.hidden = true;
    putBack();
  }
  return {
    show(view) {
      current = view.key;
      if (seen === view.key) return hide();
      layer.dataset.outcome = view.outcome;
      title.textContent = view.title;
      line.textContent = view.line;
      line.hidden = !view.line;
      see.textContent = `👁 ${view.see}`;
      if (layer.hidden) putBack();
      moved = view.actions;
      buttons.replaceChildren(...view.actions);
      layer.hidden = false;
    },
    hide,
    get open() {
      return !layer.hidden;
    },
  };
}
