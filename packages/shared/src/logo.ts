// ScreenWithMe logosu: mor yuvarlak kare, iki göz ve ağız yerinde "oynat" düğmesi.
// Tek kaynak burası: site (canlı SVG), eklenti katmanı (DOM'da SVG) ve
// scripts/make-icons.mjs (PNG simgeler + logo.svg) aynı şekilleri kullanır.
// Çizim 64x64'lük ızgarada.

export const LOGO_SIZE = 64;
export const LOGO_RADIUS = 16;
/** Arka plan: sol üstten sağ alta çapraz geçiş. */
export const LOGO_FROM = '#8f74ff';
export const LOGO_TO = '#5b3cf0';
/** Göz bebeklerinin rengi (koyu mor). */
export const LOGO_INK = '#1f1450';

export type LogoShape =
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number; fill: string; part: LogoPart }
  | { kind: 'rect'; x: number; y: number; w: number; h: number; r: number; fill: string; part: LogoPart }
  /** Köşeleri `round` kadar yuvarlatılmış üçgen (SVG'de aynı renkte kalın kenar çizgisi). */
  | { kind: 'triangle'; points: [number, number][]; round: number; fill: string; part: LogoPart };

/** Parçalar canlandırma için gruplanır: gözler kırpılır, ağız oynat ↔ duraklat olur. */
export type LogoPart = 'eyes' | 'play' | 'pause';

const WHITE = '#ffffff';
const EYE = { y: 25.5, rx: 8.5, ry: 11 };
const PUPIL = { r: 4.8, dx: 2.5, dy: -1.5 };

function eye(cx: number): LogoShape[] {
  const px = cx + PUPIL.dx;
  const py = EYE.y + PUPIL.dy;
  return [
    { kind: 'ellipse', cx, cy: EYE.y, rx: EYE.rx, ry: EYE.ry, fill: WHITE, part: 'eyes' },
    { kind: 'ellipse', cx: px, cy: py, rx: PUPIL.r, ry: PUPIL.r, fill: LOGO_INK, part: 'eyes' },
    { kind: 'ellipse', cx: px + 1.55, cy: py - 1.6, rx: 1.6, ry: 1.6, fill: WHITE, part: 'eyes' },
  ];
}

/** Arka plan hariç bütün şekiller, çizim sırasıyla. `pause` normalde gizlidir. */
export const LOGO_SHAPES: LogoShape[] = [
  ...eye(22),
  ...eye(42),
  { kind: 'triangle', points: [[28.5, 38.5], [38, 44], [28.5, 49.5]], round: 1.25, fill: WHITE, part: 'play' },
  { kind: 'rect', x: 26.5, y: 38.5, w: 4.5, h: 11, r: 1.5, fill: WHITE, part: 'pause' },
  { kind: 'rect', x: 34, y: 38.5, w: 4.5, h: 11, r: 1.5, fill: WHITE, part: 'pause' },
];

/** [etiket, öznitelikler] listesi: hem SVG metni hem DOM öğesi bundan üretilir. */
type SvgNode = [tag: string, attrs: Record<string, string | number>, children?: SvgNode[]];

function shapeNode(s: LogoShape): SvgNode {
  switch (s.kind) {
    case 'ellipse':
      return ['ellipse', { cx: s.cx, cy: s.cy, rx: s.rx, ry: s.ry }];
    case 'rect':
      return ['rect', { x: s.x, y: s.y, width: s.w, height: s.h, rx: s.r }];
    case 'triangle':
      return ['path', {
        d: `M${s.points.map((p) => p.join(' ')).join(' L')} Z`,
        stroke: s.fill,
        'stroke-width': s.round * 2,
        'stroke-linejoin': 'round',
      }];
  }
}

/**
 * Logonun SVG ağacı. `animated` açıksa duraklat çubukları da eklenir (CSS ile gizli);
 * kapalıysa sadece duran logo çizilir (favicon, simge).
 */
function logoTree(gradientId: string, animated: boolean): SvgNode {
  const groups: SvgNode[] = (['eyes', 'play', 'pause'] as const)
    .filter((part) => animated || part !== 'pause')
    .map((part) => ['g', { class: `logo-${part}` }, LOGO_SHAPES.filter((s) => s.part === part).map((s) => {
      const node = shapeNode(s);
      node[1].fill = s.fill;
      return node;
    })]);
  return ['svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: `0 0 ${LOGO_SIZE} ${LOGO_SIZE}` }, [
    ['defs', {}, [['linearGradient', { id: gradientId, x1: 0, y1: 0, x2: LOGO_SIZE, y2: LOGO_SIZE, gradientUnits: 'userSpaceOnUse' }, [
      ['stop', { offset: 0, 'stop-color': LOGO_FROM }],
      ['stop', { offset: 1, 'stop-color': LOGO_TO }],
    ]]]],
    ['rect', { width: LOGO_SIZE, height: LOGO_SIZE, rx: LOGO_RADIUS, fill: `url(#${gradientId})` }],
    ...groups,
  ]];
}

/** Dosyaya yazmak için SVG metni (favicon, logo.svg). */
export function logoSvg(options: { animated?: boolean; gradientId?: string } = {}): string {
  const write = ([tag, attrs, children = []]: SvgNode): string => {
    const a = Object.entries(attrs).map(([k, v]) => ` ${k}="${v}"`).join('');
    return children.length ? `<${tag}${a}>${children.map(write).join('')}</${tag}>` : `<${tag}${a}/>`;
  };
  return write(logoTree(options.gradientId ?? 'swm-logo', options.animated ?? false));
}

let counter = 0;
/**
 * Sayfaya eklenecek SVG öğesi. innerHTML yerine createElementNS kullanır:
 * Trusted Types / sıkı CSP olan sitelerde de (eklenti katmanı) çalışır.
 */
export function createLogo(doc: Document, options: { animated?: boolean } = {}): SVGSVGElement {
  const NS = 'http://www.w3.org/2000/svg';
  const build = ([tag, attrs, children = []]: SvgNode): Element => {
    const el = doc.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) if (k !== 'xmlns') el.setAttribute(k, String(v));
    for (const child of children) el.append(build(child));
    return el;
  };
  // Aynı sayfada birden çok logo olabilir; geçiş kimliği benzersiz olmalı.
  const svg = build(logoTree(`swm-logo-${++counter}`, options.animated ?? false)) as SVGSVGElement;
  svg.setAttribute('aria-hidden', 'true');
  return svg;
}
