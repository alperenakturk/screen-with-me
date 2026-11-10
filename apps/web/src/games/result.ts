// GP2 (one result screen for the tables): when a Classics board or Sea Battle ends, a card comes up over the board:
// Stub (cheering a win, a little sorry for a loss), "You won!" / "{name} won" / "A draw", the score, and the game's
// own buttons (Rematch, Change game…) moved into it, plus "See the board" to look at the final position (the card then
// stays away until the next result). The same look everywhere; each game passes its own words and buttons.

import './result.css';
import type { Avatar } from '@swm/shared/protocol';
import { el } from '../dom.ts';
import { lang } from '../i18n.ts';
import { podium } from './ui.ts';
import { setStubPose, stubArt } from './stub.ts';

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
  /** Something shown under the line (Quiz / Draw & Guess: the podium). */
  extra?: HTMLElement | null;
}

export interface ResultCard {
  show(view: ResultShow): void;
  hide(): void;
  readonly open: boolean;
}

/** Mounts the card into `host` (positioned over the board) with the mascot's picture `mascot` (a `stubArt` changes pose with the outcome). */
export function resultCard(host: HTMLElement, mascot: HTMLElement, onHide?: (moved: HTMLElement[]) => void): ResultCard {
  const title = el('b', { class: 'gr-title' });
  const line = el('p', { class: 'gr-line' });
  const buttons = el('div', { class: 'gr-actions' });
  const see = el('button', { type: 'button', class: 'btn ghost small-btn gr-see' });
  const extra = el('div', { class: 'gr-extra' });
  const card = el('div', { class: 'gr-card', role: 'dialog', 'aria-live': 'polite' }, el('span', { class: 'gr-mascot' }, mascot), title, line, extra, buttons, see);
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
      // MASCOT3: Stub cheers a win and is a little sorry for a loss; a draw or a watcher's view gets him plain.
      if (mascot.dataset.stub) setStubPose(mascot, view.outcome === 'win' ? 'win' : view.outcome === 'lose' ? 'sorry' : 'plain');
      title.textContent = view.title;
      line.textContent = view.line;
      line.hidden = !view.line;
      extra.replaceChildren(...(view.extra ? [view.extra] : []));
      card.classList.toggle('wide', !!view.extra);
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

/** Stub for a result card (MASCOT3): the card turns him to the outcome's pose when it shows. */
export function resultStub(): HTMLElement {
  return stubArt('plain', 'gr-glow');
}

/** A points game's end (Quiz, Draw & Guess): who won by the score, a tie on top is a draw; watchers see "over". */
export function pointsOutcome(players: readonly { id: string; name: string; score: number }[], me: string | null): { outcome: Outcome; winner: string | null } {
  const ranked = [...players].sort((a, b) => b.score - a.score);
  const top = ranked[0];
  if (!top || (ranked[1] && ranked[1].score === top.score)) return { outcome: 'draw', winner: null };
  const playing = !!me && players.some((p) => p.id === me);
  return { outcome: !playing ? 'over' : top.id === me ? 'win' : 'lose', winner: top.name };
}

/** The points games' card words (Quiz, Draw & Guess); each game adds Stub's own lines. */
const TEXT = {
  en: {
    youWon: 'You won!',
    wonBy: '{name} won',
    tie: 'A tie at the top',
    over: 'Game over',
    again: '▶ Play again',
    waitHost: 'Waiting for {name} to start',
    needTwo: 'Two players needed',
    seeScores: 'Settings & scores',
  },
  tr: {
    youWon: 'Kazandın!',
    wonBy: '{name} kazandı',
    tie: 'Zirvede beraberlik',
    over: 'Oyun bitti',
    again: '▶ Yeniden oyna',
    waitHost: '{name} başlatacak',
    needTwo: 'İki oyuncu gerek',
    seeScores: 'Ayarlar ve puanlar',
  },
} as const;
const rt = (key: keyof (typeof TEXT)['en'], name = ''): string => (lang() === 'tr' ? TEXT.tr : TEXT.en)[key].replace('{name}', name);

export interface PointsLines {
  win: string;
  lose: string;
  draw: string;
  over: string;
}

/**
 * GP3: the end of a points game (Quiz, Draw & Guess) on the same card as the tables: Stub, who won, his line, the
 * podium inside, and "Play again" (only the game's host starts it; the others see who will).
 */
export function showPointsResult(
  card: ResultCard,
  game: string,
  players: readonly { id: string; name: string; avatar?: Avatar; score: number; online?: boolean }[],
  host: string | null | undefined,
  me: string | null,
  lines: PointsLines,
  start: () => void,
): void {
  const { outcome, winner } = pointsOutcome(players, me);
  const online = players.filter((p) => p.online !== false).length;
  const lead = players.find((p) => p.id === host);
  const again = el('button', { type: 'button', class: 'btn primary gr-again' });
  if (online < 2) {
    again.textContent = rt('needTwo');
    again.disabled = true;
  } else if (lead && host !== me) {
    again.textContent = rt('waitHost', lead.name);
    again.disabled = true;
  } else {
    again.textContent = rt('again');
    again.addEventListener('click', start);
  }
  card.show({
    key: `${game}:${players.map((p) => `${p.id}=${p.score}`).join(',')}`,
    outcome,
    title: outcome === 'win' ? rt('youWon') : outcome === 'draw' ? rt('tie') : winner ? rt('wonBy', winner) : rt('over'),
    line: lines[outcome === 'win' ? 'win' : outcome === 'lose' ? 'lose' : outcome === 'draw' ? 'draw' : 'over'],
    extra: podium(players),
    actions: [again],
    see: rt('seeScores'),
  });
}
