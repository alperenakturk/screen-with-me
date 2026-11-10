// MASCOT3: Stub, the cinema ticket, is the games' mascot (Design's set in docs/internal/design/mascot-3/, card NG3).
// One place for every pose the games draw: the referee (plain / cheer / gasp), the bot opponent's face, the small
// label cut, the result card (a win cheered, a little sorry for a loss) and Snack Bar's cashier. Each copy gets its own
// ids (two copies of one SVG on a page would share their gradients otherwise).
import { el } from '../dom.ts';
import plain from './art/stub/default.svg?raw';
import referee from './art/stub/referee.svg?raw';
import cheer from './art/stub/referee-cheer.svg?raw';
import gasp from './art/stub/referee-gasp.svg?raw';
import opponent from './art/stub/opponent.svg?raw';
import small from './art/stub/small.svg?raw';
import win from './art/stub/win.svg?raw';
import sorry from './art/stub/sorry.svg?raw';

/** The mascot's name in every language (owner, 10 Nov 2026: "Stub", also in Turkish). */
export const MASCOT_NAME = 'Stub';

const POSES = { plain, referee, cheer, gasp, opponent, small, win, sorry } as const;
export type StubPose = keyof typeof POSES;

let copies = 0;
/** Stub in `pose`, in a span with the class `cls`; `setStubPose` changes it later. */
export function stubArt(pose: StubPose, cls = ''): HTMLElement {
  const node = el('span', { class: cls, 'aria-hidden': 'true' });
  setStubPose(node, pose);
  return node;
}
/** Redraws `node` in another pose (nothing happens when it already shows that pose). */
export function setStubPose(node: HTMLElement, pose: StubPose): void {
  if (node.dataset.stub === pose) return;
  const prefix = `stb${++copies}-`;
  node.dataset.stub = pose;
  node.innerHTML = POSES[pose].replace(/id="([^"]+)"/g, `id="${prefix}$1"`).replace(/url\(#([^)]+)\)/g, `url(#${prefix}$1)`);
}

/** A referee picture that shows its mood in classes (`react-cheer` / `react-gasp` for a moment, `cheer` for a winner). */
export function syncRefereePose(node: HTMLElement): void {
  const c = node.classList;
  setStubPose(node, c.contains('react-gasp') ? 'gasp' : c.contains('react-cheer') || c.contains('cheer') ? 'cheer' : 'referee');
}
