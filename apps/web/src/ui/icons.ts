/**
 * Line icons for the voice / camera / stream buttons (0.9.91, owner: "the emoji icons look bad, make them clear and
 * fit the site"). Drawn here (24×24, 2 px rounded strokes in the text color), no icon package: nothing third-party
 * ships to users. Built with DOM calls, never innerHTML.
 */
export type IconName = 'mic' | 'mic-off' | 'cam' | 'cam-off' | 'screen' | 'screen-stop' | 'screen-watch' | 'leave';

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
  leave: [['path', { d: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3' }], ['path', { d: 'M10 17l-5-5 5-5' }], ['line', { x1: 5, y1: 12, x2: 15, y2: 12 }]],
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
