// The Sidelit logo (D1 "night gold", owner's pick on 3 Nov 2026; spec: docs/internal/design/logo-sidelit.md) and the
// mascot Stub (card NP3; it was N1 "Glowbeam"). The one source of their shapes: the site (live SVG), the extension overlay (SVG in the DOM),
// the intro animation and scripts/make-icons.mjs (PNG icons + logo.svg). Drawn on a 64×64 grid.
//
// Logo: on a deep night square a white play triangle casts a warm light to the right; two eyes sit in that light.
// Full drawing from 33 px, the simple cut (`small`) at 32 px and below, `bleed` without the rounded corners (phone
// home-screen / PWA maskable icons: the platform masks it).

export const LOGO_SIZE = 64;
export const LOGO_RADIUS = 16;
/** Night background: diagonal gradient from the top left. */
export const LOGO_FROM = '#22174f';
export const LOGO_TO = '#08061a';
/** Eye ink (logo). */
export const LOGO_INK = '#140d33';
/** The light's colours (cream → gold → amber), shared by the logo and the mascot. */
export const LIGHT_CREAM = '#fff3d6';
export const LIGHT_GOLD = '#ffc65a';
export const LIGHT_AMBER = '#ff8f3a';
/** The mascot's eye / mouth ink and the end of its body gradient. */
export const MASCOT_INK = '#1a1036';
export const MASCOT_AMBER = '#ff9440';

/** [tag, attributes, children]: both the SVG text and the DOM element are built from this. */
type SvgNode = [tag: string, attrs: Record<string, string | number>, children?: SvgNode[]];

type Stop = [offset: number, color: string, opacity?: number];
const stops = (list: Stop[]): SvgNode[] =>
  list.map(([offset, color, opacity = 1]) => ['stop', { offset, 'stop-color': color, 'stop-opacity': opacity }]);
const linear = (id: string, x1: number, y1: number, x2: number, y2: number, list: Stop[]): SvgNode => [
  'linearGradient',
  { id, gradientUnits: 'userSpaceOnUse', x1, y1, x2, y2 },
  stops(list),
];
const radial = (id: string, cx: number, cy: number, r: number, list: Stop[]): SvgNode => [
  'radialGradient',
  { id, gradientUnits: 'userSpaceOnUse', cx, cy, r },
  stops(list),
];

export interface LogoOptions {
  /** Adds the pause bars (hidden by CSS) for the play ↔ pause animation. */
  animated?: boolean;
  /** The simple cut for 32 px and below: no vignette, bloom or glints, a flatter light, bigger eyes. */
  small?: boolean;
  /** No rounded corners (maskable / round-avatar icons). */
  bleed?: boolean;
  /** Prefix for the gradient / clip ids (unique per copy on one page). */
  id?: string;
}

/**
 * The logo's SVG tree. Parts are grouped for the animations: `logo-light` (cone + bloom), `logo-play` (the triangle),
 * `logo-pause` (two bars in the triangle's place, only when animated) and `logo-eyes`.
 */
function logoTree(o: LogoOptions): SvgNode {
  const p = o.id ?? 'sl';
  const small = o.small ?? false;
  const url = (name: string) => `url(#${p}-${name})`;
  const defs: SvgNode[] = [
    ['clipPath', { id: `${p}-c` }, [['rect', { width: LOGO_SIZE, height: LOGO_SIZE, rx: o.bleed ? 0 : LOGO_RADIUS }]]],
    linear(`${p}-b`, 0, 0, LOGO_SIZE, LOGO_SIZE, [
      [0, LOGO_FROM],
      [1, LOGO_TO],
    ]),
    linear(
      `${p}-l`,
      small ? 31 : 29,
      0,
      64,
      0,
      small
        ? [
            [0, LIGHT_CREAM],
            [0.45, LIGHT_GOLD, 0.95],
            [1, LIGHT_AMBER, 0.7],
          ]
        : [
            [0, LIGHT_CREAM],
            [0.35, LIGHT_GOLD, 0.92],
            [1, LIGHT_AMBER, 0.12],
          ],
    ),
    linear(`${p}-t`, small ? 10 : 12, 0, 32, 0, [
      [0, '#ffffff'],
      [1, '#fff0d0'],
    ]),
  ];
  if (!small) {
    defs.push(
      radial(`${p}-v`, 34, 28, 54, [
        [0.5, '#000', 0],
        [1, '#000', 0.4],
      ]),
      radial(`${p}-g`, 31, 32, 13, [
        [0, LIGHT_CREAM, 0.7],
        [1, LIGHT_CREAM, 0],
      ]),
    );
  }
  const triangle = small ? 'M10 17 L32 32 L10 47 Z' : 'M12 20 L31 32 L12 44 Z';
  const light: SvgNode[] = [['path', { d: small ? 'M31 25 L64 2 L64 62 L31 39 Z' : 'M29 27 L64 8 L64 56 L29 37 Z', fill: url('l') }]];
  if (!small) light.push(['circle', { cx: 31, cy: 32, r: 13, fill: url('g') }]);
  const eye = small ? { a: 44, b: 55, rx: 3.6, ry: 5.2 } : { a: 44, b: 53, rx: 2.6, ry: 3.6 };
  const eyes: SvgNode[] = [eye.a, eye.b].flatMap((cx): SvgNode[] => {
    const nodes: SvgNode[] = [['ellipse', { cx, cy: 32, rx: eye.rx, ry: eye.ry, fill: LOGO_INK }]];
    if (!small) nodes.push(['circle', { cx: cx - 0.9, cy: 30.6, r: 0.75, fill: '#fff', opacity: 0.9 }]);
    return nodes;
  });
  const groups: SvgNode[] = [
    ['g', { class: 'logo-light' }, light],
    ['g', { class: 'logo-play' }, [['path', { d: triangle, fill: url('t'), stroke: url('t'), 'stroke-width': small ? 5 : 4, 'stroke-linejoin': 'round' }]]],
  ];
  if (o.animated) {
    // Pause: two bars where the triangle sits, in the same white.
    const [x, y, h] = small ? [10, 17, 30] : [12, 20, 24];
    groups.push([
      'g',
      { class: 'logo-pause' },
      [
        ['rect', { x, y, width: 6.5, height: h, rx: 2.5, fill: url('t') }],
        ['rect', { x: x + 11, y, width: 6.5, height: h, rx: 2.5, fill: url('t') }],
      ],
    ]);
  }
  groups.push(['g', { class: 'logo-eyes' }, eyes]);
  const background: SvgNode[] = [['rect', { width: LOGO_SIZE, height: LOGO_SIZE, fill: url('b') }]];
  if (!small) background.push(['rect', { width: LOGO_SIZE, height: LOGO_SIZE, fill: url('v') }]);
  return [
    'svg',
    { xmlns: 'http://www.w3.org/2000/svg', viewBox: `0 0 ${LOGO_SIZE} ${LOGO_SIZE}` },
    [['defs', {}, defs], ['g', { 'clip-path': url('c') }, [...background, ...groups]]],
  ];
}

export type MascotMood = 'default' | 'happy' | 'waiting' | 'wow' | 'watching' | 'sorry';

export interface MascotOptions {
  /** Simple cut for ≤ 32 px: the ticket fills the box, a thick outline, big eyes without glints. */
  small?: boolean;
  mood?: MascotMood;
  /** Hold the usher's torch in the right hand (the home art's light starts at its lens, (63, 28.6) on the grid). */
  torch?: boolean;
  id?: string;
}

/** Stub's outline, arms and legs (dark enough on cream and on gold), its perforation and cheeks. */
export const STUB_LINE = '#9a4f16';
const STUB_PERF = '#b8661a';
const STUB_CHEEK = '#ff8f6a';
/** The face's centre on the card. */
const FX = 26.5;

const eye = (x: number, y: number, rx: number, ry: number, glint = true): SvgNode[] => [
  ['ellipse', { cx: x, cy: y, rx, ry, fill: LOGO_INK }],
  ...(glint ? [['circle', { cx: +(x - rx * 0.32).toFixed(2), cy: +(y - ry * 0.4).toFixed(2), r: +(rx * 0.3).toFixed(2), fill: '#fff', opacity: 0.92 }] as SvgNode] : []),
];
const ink = (d: string, width: number, extra: Record<string, string | number> = {}): SvgNode => [
  'path',
  { d, stroke: LOGO_INK, 'stroke-width': width, fill: 'none', 'stroke-linecap': 'round', ...extra },
];
/** An eye shut in a smile (`up`) or resting (down). */
const arc = (x: number, y: number, w: number, up = true, width = 2.1): SvgNode =>
  ink(`M${x - w} ${y} Q${x} ${+(up ? y - w * 1.15 : y + w).toFixed(2)} ${x + w} ${y}`, width);

/** The faces (Design's MASCOT3, `docs/internal/design/mascot-3/draw.mjs` FACES). */
function stubFace(mood: MascotMood): SvgNode[] {
  switch (mood) {
    case 'happy':
      return [
        arc(21.5, 31.6, 3),
        arc(31.5, 31.6, 3),
        ['path', { d: `M22.5 36.6 Q${FX} 41.6 30.5 36.6 Z`, fill: LOGO_INK }],
        ['path', { d: `M24.5 38.8 Q${FX} 40.6 28.5 38.8`, fill: '#ff8a8a', opacity: 0.9 }],
      ];
    case 'watching':
      return [...eye(22.7, 29.8, 2.8, 3.9), ...eye(32.7, 29.8, 2.8, 3.9), ink(`M24.6 37.4 Q${FX + 0.6} 39.6 29.2 37.2`, 1.8)];
    case 'waiting':
      return [arc(21.5, 30.6, 2.8, false, 1.9), arc(31.5, 30.6, 2.8, false, 1.9), ink('M24.2 38.4 H28.8', 1.8)];
    case 'wow':
      return [...eye(21.5, 30, 3.1, 4.3), ...eye(31.5, 30, 3.1, 4.3), ['ellipse', { cx: FX, cy: 38.6, rx: 1.9, ry: 2.4, fill: LOGO_INK }]];
    case 'sorry':
      return [
        ...eye(21.5, 31, 2.5, 3.4),
        ...eye(31.5, 31, 2.5, 3.4),
        ink('M18.6 25.6 L23.8 24.4 M34.4 25.6 L29.2 24.4', 1.5),
        ink('M23.4 39 Q25 37.6 26.5 38.6 Q28 39.6 29.6 38.2', 1.6),
      ];
    default:
      return [...eye(21.5, 30.5, 2.8, 3.9), ...eye(31.5, 30.5, 2.8, 3.9), arc(FX, 37.6, 2.6, false, 1.8)];
  }
}

const limb = (d: string): SvgNode => [
  'path',
  { d, stroke: STUB_LINE, 'stroke-width': 3.4, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
];
/** Arms per mood (left, right), as in Design's set. */
const ARMS: Record<MascotMood, [string, string]> = {
  default: ['M9 34 L4 40', 'M56 31 L61 37'],
  watching: ['M9 34 L4 40', 'M56 31 L61 37'],
  waiting: ['M9 34 L4 40', 'M56 31 L61 37'],
  sorry: ['M9 34 L4 40', 'M56 31 L61 37'],
  happy: ['M9 30 L3 20', 'M55 26 L61 16'],
  wow: ['M9 31 L1 28', 'M56 28 L63 24'],
};
const TILT: Record<MascotMood, number> = { default: -5, happy: -9, watching: -3, waiting: -2, wow: 4, sorry: 3 };

/**
 * Stub (card MASCOT3 / NP3, the owner's pick C, 10 Nov 2026): a cinema ticket that came along, with the logo's ink
 * eyes on the D1 light (cream → gold → amber). Drawn on the 64 grid; the moods change the face, the arms and the tilt.
 */
function mascotTree(o: MascotOptions): SvgNode {
  const p = o.id ?? 'slm';
  const mood = o.mood ?? 'default';
  const url = (name: string) => `url(#${p}-${name})`;
  // The card's diagonal (Design's gradient spans the ticket's own box).
  const [x1, y1, x2, y2] = o.small ? [4, 12, 60, 52] : [8, 16, 56, 48];
  const defs: SvgNode[] = [
    linear(`${p}-f`, x1!, y1!, x2!, y2!, [
      [0, LIGHT_CREAM],
      [0.5, LIGHT_GOLD],
      [1, MASCOT_AMBER],
    ]),
  ];
  const svg = (parts: SvgNode[]): SvgNode => ['svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 64 64' }, [['defs', {}, defs], ...parts]];
  if (o.small) {
    return svg([
      ['path', { d: 'M6 12 H58 Q60 12 60 14 V26 A6 6 0 0 0 60 38 V50 Q60 52 58 52 H6 Q4 52 4 50 V38 A6 6 0 0 0 4 26 V14 Q4 12 6 12Z', fill: url('f'), stroke: STUB_LINE, 'stroke-width': 2.6 }],
      ['path', { d: 'M46 15.5 V48.5', stroke: STUB_LINE, 'stroke-width': 2.6, 'stroke-dasharray': '3.4 3' }],
      ['g', { class: 'mascot-face' }, [...eye(18.5, 31, 3.9, 5.4, false), ...eye(33.5, 31, 3.9, 5.4, false)]],
    ]);
  }
  defs.push(
    radial(`${p}-g`, 32, 32, 28, [
      [0, LIGHT_GOLD, 0.5],
      [1, LIGHT_GOLD, 0],
    ]),
  );
  const cheeks: SvgNode[] = mood === 'sorry' ? [] : [16.5, 36.5].map((cx): SvgNode => ['ellipse', { cx, cy: 36, rx: 2.2, ry: 1.3, fill: STUB_CHEEK, opacity: 0.45 }]);
  const tilt = o.torch ? -6 : TILT[mood];
  const [left, right] = ARMS[mood];
  const arms: SvgNode[] = [limb(o.torch ? 'M9 34 L4 40' : left)];
  if (o.torch) {
    arms.push(limb('M56 30 L58.5 29'), [
      'g',
      { transform: 'rotate(-8 60 29)' },
      [
        ['rect', { x: 56.5, y: 27, width: 5.4, height: 4.2, rx: 1, fill: '#3a2d6e', stroke: STUB_LINE, 'stroke-width': 0.8 }],
        ['path', { d: 'M61.9 26.4 L64 25.4 V32.8 L61.9 31.8Z', fill: LIGHT_CREAM }],
      ],
    ]);
  } else arms.push(limb(right));
  return svg([
    ...(mood === 'sorry' ? [] : [['circle', { class: 'mascot-glow', cx: 32, cy: 32, r: 28, fill: url('g') }] as SvgNode]),
    [
      'g',
      { transform: `rotate(${tilt} 32 32)` },
      [
        ['path', { d: 'M10 16 H54 Q56 16 56 18 V27 A5 5 0 0 0 56 37 V46 Q56 48 54 48 H10 Q8 48 8 46 V37 A5 5 0 0 0 8 27 V18 Q8 16 10 16Z', fill: url('f'), stroke: STUB_LINE, 'stroke-width': 1.3 }],
        ['path', { d: 'M44 19 V45', stroke: STUB_PERF, 'stroke-width': 1.4, 'stroke-dasharray': '2 2.4' }],
        ['path', { d: 'M48 27.4 L53.6 32 L48 36.6Z', fill: STUB_PERF }],
        ['path', { d: 'M12 20 H40', stroke: '#fffaf0', 'stroke-width': 1.6, opacity: 0.75, 'stroke-linecap': 'round' }],
        ['g', { class: 'mascot-face' }, [...stubFace(mood), ...cheeks]],
      ],
    ],
    ...arms,
    limb('M24 50 L23 58'),
    limb('M38 49 L39 57'),
  ]);
}

function write([tag, attrs, children = []]: SvgNode): string {
  const a = Object.entries(attrs)
    .map(([k, v]) => ` ${k}="${v}"`)
    .join('');
  return children.length ? `<${tag}${a}>${children.map(write).join('')}</${tag}>` : `<${tag}${a}/>`;
}

/** SVG text to write into a file (favicon, logo.svg, the recap card's image). */
export function logoSvg(options: LogoOptions = {}): string {
  return write(logoTree(options));
}

/** The mascot as SVG text (theme art, files). */
export function mascotSvg(options: MascotOptions = {}): string {
  return write(mascotTree(options));
}

function build(doc: Document, node: SvgNode): Element {
  const [tag, attrs, children = []] = node;
  const el = doc.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) if (k !== 'xmlns') el.setAttribute(k, String(v));
  for (const child of children) el.append(build(doc, child));
  return el;
}

let counter = 0;
/**
 * The logo as an element. Uses createElementNS instead of innerHTML: it works on sites with Trusted Types or a strict
 * CSP too (the extension overlay). Several logos can be on one page, so every copy gets its own gradient ids.
 */
export function createLogo(doc: Document, options: Omit<LogoOptions, 'id'> = {}): SVGSVGElement {
  const svg = build(doc, logoTree({ ...options, id: `sl-logo-${++counter}` })) as SVGSVGElement;
  svg.setAttribute('aria-hidden', 'true');
  return svg;
}

/** The mascot as an element (see createLogo). */
export function createMascot(doc: Document, options: Omit<MascotOptions, 'id'> = {}): SVGSVGElement {
  const svg = build(doc, mascotTree({ ...options, id: `sl-mascot-${++counter}` })) as SVGSVGElement;
  svg.setAttribute('aria-hidden', 'true');
  return svg;
}
