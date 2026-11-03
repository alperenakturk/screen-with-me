// The Sidelit logo (D1 "night gold", owner's pick on 3 Nov 2026; spec: docs/internal/design/logo-sidelit.md) and the
// mascot N1 "Glowbeam". The one source of their shapes: the site (live SVG), the extension overlay (SVG in the DOM),
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

export type MascotMood = 'default' | 'happy' | 'waiting' | 'wow' | 'watching';

export interface MascotOptions {
  /** Simple cut for 24–32 px: no glow, glints or mouth. */
  small?: boolean;
  mood?: MascotMood;
  id?: string;
}

/** Glowbeam (N1): the light itself, alive, with the logo's eyes. No box; only eyes and mouth change with the mood. */
function mascotTree(o: MascotOptions): SvgNode {
  const p = o.id ?? 'slm';
  const small = o.small ?? false;
  const mood = o.mood ?? 'default';
  const url = (name: string) => `url(#${p}-${name})`;
  const defs: SvgNode[] = [
    linear(`${p}-f`, 4, 0, 60, 0, [
      [0, LIGHT_CREAM],
      [0.45, LIGHT_GOLD],
      [1, MASCOT_AMBER],
    ]),
  ];
  const parts: SvgNode[] = [];
  if (!small) {
    defs.push(
      radial(`${p}-g`, 40, 32, 23, [
        [0, LIGHT_GOLD, 0.45],
        [1, LIGHT_GOLD, 0],
      ]),
    );
    parts.push(['circle', { class: 'mascot-glow', cx: 40, cy: 32, r: 23, fill: url('g') }]);
  }
  parts.push([
    'path',
    {
      d: small ? 'M4 32 L27 15 A18.5 18.5 0 1 1 27 49 Z' : 'M5 32 L28 17.5 A17 17 0 1 1 28 46.5 Z',
      fill: url('f'),
      stroke: url('f'),
      'stroke-width': 2,
      'stroke-linejoin': 'round',
    },
  ]);
  const face: SvgNode[] = [];
  if (small) {
    for (const cx of [37, 48]) face.push(['ellipse', { cx, cy: 31, rx: 3.6, ry: 5.2, fill: MASCOT_INK }]);
  } else {
    const shift = mood === 'watching' ? -1.2 : 0;
    for (const cx of [38, 47]) {
      if (mood === 'happy' || mood === 'waiting') {
        const q = mood === 'happy' ? 28 : 32.6;
        face.push(['path', { d: `M${cx - 2.6} 30.5 Q${cx} ${q} ${cx + 2.6} 30.5`, fill: 'none', stroke: MASCOT_INK, 'stroke-width': 1.8, 'stroke-linecap': 'round' }]);
      } else {
        face.push(['ellipse', { cx: cx + shift, cy: 30, rx: 2.8, ry: 3.9, fill: MASCOT_INK }]);
        face.push(['circle', { cx: cx - 0.8 + shift, cy: 28.52, r: 0.84, fill: '#fff', opacity: 0.9 }]);
      }
    }
    if (mood === 'wow') face.push(['ellipse', { cx: 42.5, cy: 39, rx: 1.7, ry: 2.1, fill: MASCOT_INK }]);
    else {
      const d = mood === 'happy' ? 'M38.5 37.5 Q42.5 42 46.5 37.5' : mood === 'waiting' ? 'M40.5 38.5 L44.5 38.5' : 'M39.5 38 Q42.5 40.4 45.5 38';
      face.push(['path', { d, fill: 'none', stroke: MASCOT_INK, 'stroke-width': 1.6, 'stroke-linecap': 'round' }]);
    }
  }
  parts.push(['g', { class: 'mascot-face' }, face]);
  return ['svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 64 64' }, [['defs', {}, defs], ...parts]];
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
