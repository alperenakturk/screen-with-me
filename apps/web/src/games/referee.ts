// GP4: Stub the referee at the tables that have no board of his own (Quiz, Draw & Guess, Last Heart): a small
// Stub in a corner of the table with a short, kind line for a moment (a streak, everyone got it, a big pot), as he
// cheers or gasps at the Classics and Sea Battle (GP2). Never a line about a player's mistake. Each game picks its
// moments and words (EN + TR in its own texts); this file only draws him.
import './referee.css';
import { el } from '../dom.ts';
import { setStubPose, stubArt } from './stub.ts';

export type RefereeMood = 'cheer' | 'gasp' | 'plain';

export interface Referee {
  /** Stub says `text` for a moment (a new line replaces the old one). */
  say(text: string, mood?: RefereeMood): void;
  /** The line now on screen ('' when none), for the harnesses. */
  readonly line: string;
  destroy(): void;
}

const SHOW_MS = 2800;

/** Puts the referee into `host` (positioned): bottom right, over the table, never taking a click. */
export function referee(host: HTMLElement): Referee {
  const bubble = el('span', { class: 'rf-say', role: 'status', 'aria-live': 'polite' });
  // MASCOT3: Stub in his referee cap, plain, cheering or gasping with the line.
  const art = el('span', { class: 'rf-glow', 'aria-hidden': 'true' }, stubArt('referee', 'gr-glow'));
  const box = el('div', { class: 'rf', 'aria-hidden': 'false' }, bubble, art);
  box.hidden = true;
  host.append(box);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let line = '';
  return {
    say(text, mood = 'plain') {
      line = text;
      bubble.textContent = text;
      box.dataset.mood = mood;
      setStubPose(art.firstElementChild as HTMLElement, mood === 'plain' ? 'referee' : mood);
      box.hidden = false;
      // Restart the pop-in for a new line.
      box.classList.remove('rf-in');
      void box.offsetWidth;
      box.classList.add('rf-in');
      clearTimeout(timer);
      timer = setTimeout(() => {
        box.hidden = true;
        line = '';
      }, SHOW_MS);
    },
    get line() {
      return line;
    },
    destroy() {
      clearTimeout(timer);
      box.remove();
    },
  };
}
