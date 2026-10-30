/**
 * Line icons for the voice / camera / stream buttons (0.9.91, owner: "the emoji icons look bad, make them clear and
 * fit the site"). Drawn here (24×24, 2 px rounded strokes in the text color), no icon package: nothing third-party
 * ships to users. Built with DOM calls, never innerHTML.
 */
export type IconName =
  | 'mic'
  | 'mic-off'
  | 'cam'
  | 'cam-off'
  | 'screen'
  | 'screen-stop'
  | 'screen-watch'
  | 'leave'
  | 'chat'
  | 'smile'
  | 'pin'
  | 'skip'
  | 'fs-exit'
  | 'gamepad'
  | 'game-xox'
  | 'game-four'
  | 'game-draw'
  | 'game-quiz'
  | 'game-poker'
  | 'place-float'
  | 'place-stage'
  | 'place-below'
  | 'fs-enter'
  | 'image-add';

type Shape = [tag: 'path' | 'rect' | 'line' | 'circle', attrs: Record<string, string | number>];

const SLASH: Shape = ['line', { x1: 3, y1: 3, x2: 21, y2: 21 }];
const MIC: Shape[] = [
  ['rect', { x: 9, y: 2.5, width: 6, height: 12, rx: 3 }],
  ['path', { d: 'M5.5 10.5v.5a6.5 6.5 0 0 0 13 0v-.5' }],
  ['line', { x1: 12, y1: 17.5, x2: 12, y2: 21.5 }],
];
const CAM: Shape[] = [
  ['rect', { x: 2.5, y: 6, width: 13, height: 12, rx: 2.5 }],
  ['path', { d: 'M15.5 10.5 21.5 7v10l-6-3.5' }],
];
const SCREEN: Shape[] = [
  ['rect', { x: 2.5, y: 3.5, width: 19, height: 13, rx: 2 }],
  ['line', { x1: 8, y1: 21, x2: 16, y2: 21 }],
  ['line', { x1: 12, y1: 16.5, x2: 12, y2: 21 }],
];

const ICONS: Record<IconName, Shape[]> = {
  mic: MIC,
  'mic-off': [...MIC, SLASH],
  cam: CAM,
  'cam-off': [...CAM, SLASH],
  // Share: the screen with an arrow going out.
  screen: [...SCREEN, ['path', { d: 'M9 10l3-3 3 3' }], ['line', { x1: 12, y1: 7, x2: 12, y2: 13 }]],
  // My stream is on: a filled stop square inside the screen.
  'screen-stop': [...SCREEN, ['rect', { x: 9.5, y: 7.5, width: 5, height: 5, rx: 1, fill: 'currentColor' }]],
  // Someone streams: a play triangle inside the screen.
  'screen-watch': [...SCREEN, ['path', { d: 'M10.5 7.5v5l4-2.5z', fill: 'currentColor' }]],
  // The fullscreen dock (0.9.91.1).
  chat: [['path', { d: 'M4.5 5.5h15a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 3.5v-3.5h-1A1.5 1.5 0 0 1 3 16V7a1.5 1.5 0 0 1 1.5-1.5z' }]],
  smile: [
    ['circle', { cx: 12, cy: 12, r: 9 }],
    ['path', { d: 'M8.5 14.5a4.5 4.5 0 0 0 7 0' }],
    ['line', { x1: 9, y1: 9.5, x2: 9, y2: 10 }],
    ['line', { x1: 15, y1: 9.5, x2: 15, y2: 10 }],
  ],
  pin: [['path', { d: 'M9 3.5h6l-1 5 3.5 3.5v1.5h-11V12L10 8.5z' }], ['line', { x1: 12, y1: 13.5, x2: 12, y2: 20.5 }]],
  skip: [['path', { d: 'M5.5 5.5v13l9.5-6.5z' }], ['line', { x1: 18.5, y1: 5.5, x2: 18.5, y2: 18.5 }]],
  'fs-exit': [['path', { d: 'M9 3.5V9H3.5' }], ['path', { d: 'M15 3.5V9h5.5' }], ['path', { d: 'M9 20.5V15H3.5' }], ['path', { d: 'M15 20.5V15h5.5' }]],
  'fs-enter': [['path', { d: 'M3.5 9V3.5H9' }], ['path', { d: 'M15 3.5h5.5V9' }], ['path', { d: 'M3.5 15v5.5H9' }], ['path', { d: 'M20.5 15v5.5H15' }]],
  // Add a GIF / photo (custom emojis, chat pictures; 0.9.91.5 instead of 🖼️): a picture with a small plus.
  'image-add': [
    ['rect', { x: 2.5, y: 5.5, width: 15, height: 14, rx: 2.5 }],
    ['circle', { cx: 7.5, cy: 10.5, r: 1.5 }],
    ['path', { d: 'M17.5 15.5l-4-4-8.5 8' }],
    ['line', { x1: 19.5, y1: 2.5, x2: 19.5, y2: 8.5 }],
    ['line', { x1: 16.5, y1: 5.5, x2: 22.5, y2: 5.5 }],
  ],
  leave: [['path', { d: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3' }], ['path', { d: 'M10 17l-5-5 5-5' }], ['line', { x1: 5, y1: 12, x2: 15, y2: 12 }]],
  // The games hub (0.9.91.8): the pad and one icon per game.
  gamepad: [
    ['path', { d: 'M7 7h10a5 5 0 0 1 5 5l.5 4a3 3 0 0 1-5.3 2.2L15.5 16h-7l-1.7 2.2A3 3 0 0 1 1.5 16l.5-4a5 5 0 0 1 5-5z' }],
    ['line', { x1: 6.5, y1: 10.5, x2: 6.5, y2: 13.5 }],
    ['line', { x1: 5, y1: 12, x2: 8, y2: 12 }],
    ['circle', { cx: 16.5, cy: 11, r: 0.6 }],
    ['circle', { cx: 18, cy: 13, r: 0.6 }],
  ],
  'game-xox': [
    ['line', { x1: 9, y1: 3, x2: 9, y2: 21 }],
    ['line', { x1: 15, y1: 3, x2: 15, y2: 21 }],
    ['line', { x1: 3, y1: 9, x2: 21, y2: 9 }],
    ['line', { x1: 3, y1: 15, x2: 21, y2: 15 }],
    ['path', { d: 'M4.5 4.5l3 3M7.5 4.5l-3 3' }],
    ['circle', { cx: 18, cy: 18, r: 1.6 }],
  ],
  'game-four': [
    ['rect', { x: 3, y: 4, width: 18, height: 14, rx: 2.5 }],
    ['circle', { cx: 8, cy: 9, r: 1.6 }],
    ['circle', { cx: 8, cy: 13, r: 1.6 }],
    ['circle', { cx: 12, cy: 13, r: 1.6 }],
    ['circle', { cx: 16, cy: 13, r: 1.6 }],
    ['line', { x1: 6, y1: 18, x2: 5, y2: 21 }],
    ['line', { x1: 18, y1: 18, x2: 19, y2: 21 }],
  ],
  'game-draw': [['path', { d: 'M15.5 4.5l4 4L9 19l-5 1 1-5z' }], ['line', { x1: 13, y1: 7, x2: 17, y2: 11 }]],
  'game-quiz': [
    ['path', { d: 'M4.5 4.5h15A1.5 1.5 0 0 1 21 6v9a1.5 1.5 0 0 1-1.5 1.5H11l-4.5 3.5v-3.5h-2A1.5 1.5 0 0 1 3 15V6a1.5 1.5 0 0 1 1.5-1.5z' }],
    ['path', { d: 'M10 9a2 2 0 1 1 2.8 1.8c-.6.3-.8.7-.8 1.2' }],
    ['line', { x1: 12, y1: 14, x2: 12, y2: 14.2 }],
  ],
  // Where the game window sits: next to the video, floating over it, in its place, under it (phones).
  'place-float': [['rect', { x: 3, y: 5, width: 18, height: 14, rx: 2 }], ['rect', { x: 12, y: 11, width: 7, height: 6, rx: 1 }]],
  'place-stage': [['path', { d: 'M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4' }]],
  'place-below': [['rect', { x: 5, y: 3, width: 14, height: 18, rx: 2 }], ['line', { x1: 5, y1: 10, x2: 19, y2: 10 }]],
  // Life poker: a heart on a card.
  'game-poker': [
    ['rect', { x: 5, y: 3, width: 14, height: 18, rx: 2.5 }],
    ['path', { d: 'M12 16s-3.5-2.2-3.5-4.6A1.9 1.9 0 0 1 12 10.3a1.9 1.9 0 0 1 3.5 1.1C15.5 13.8 12 16 12 16z' }],
  ],
};

const NS = 'http://www.w3.org/2000/svg';

export function icon(name: IconName): SVGSVGElement {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', `ico ico-${name}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  for (const [tag, attrs] of ICONS[name]) {
    const node = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
    svg.append(node);
  }
  return svg;
}

/** Puts the icon in the element (replacing an earlier one) only when it changed: no flicker on every render. */
export function setIcon(target: Element, name: IconName): void {
  const old = target.querySelector(':scope > svg.ico');
  if (old?.classList.contains(`ico-${name}`)) return;
  const next = icon(name);
  if (old) old.replaceWith(next);
  else target.prepend(next);
}
