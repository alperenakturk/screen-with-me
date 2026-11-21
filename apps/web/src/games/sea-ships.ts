// 🚢 Sea Battle ship themes (card SB2): drawn ships instead of plain squares. Every ship is drawn here as an SVG string
// (our own drawing, no third-party art), lying left to right with its bow on the right: one cell = 100 units, so a
// ship of length n is n × 100 wide and 100 high. The page lays a ship over its cells and turns it for a ship that runs
// down. One source for the game and the design previews (`docs/internal/design/games/sea-ships/`).

export const SEA_THEMES = ['navy', 'pirate', 'toys'] as const;
export type SeaTheme = (typeof SEA_THEMES)[number];
export const DEFAULT_SEA_THEME: SeaTheme = 'navy';

const svg = (len: number, body: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${len * 100} 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">${body}</svg>`;

/** A hull from stern (left) to a pointed bow (right), inside the ship's box with a small margin. */
function hull(w: number, top = 12, bottom = 88, stern = 12): string {
  const mid = (top + bottom) / 2;
  const bowStart = Math.max(stern + 30, w - 70);
  return `M${stern} ${mid}C${stern} ${top + 6} ${stern + 8} ${top} ${stern + 26} ${top}L${bowStart} ${top}C${w - 34} ${top} ${w - 12} ${mid - 18} ${w - 6} ${mid}C${w - 12} ${mid + 18} ${w - 34} ${bottom} ${bowStart} ${bottom}L${stern + 26} ${bottom}C${stern + 8} ${bottom} ${stern} ${bottom - 6} ${stern} ${mid}Z`;
}

/** Navy: grey steel ships seen from above (patrol boat, submarine, destroyer, battleship). */
function navy(len: number): string {
  const w = len * 100;
  const shadow = `<path d="${hull(w, 20, 90)}" fill="#000" opacity=".28"/>`;
  if (len === 3) {
    // A submarine: a long dark oval with its tower.
    return svg(len, `${shadow}<rect x="10" y="22" width="${w - 20}" height="56" rx="28" fill="#4a5470"/><rect x="18" y="30" width="${w - 36}" height="20" rx="10" fill="#66718f" opacity=".7"/><rect x="${w * 0.42}" y="34" width="54" height="32" rx="14" fill="#2e3550"/><rect x="${w * 0.42 + 14}" y="44" width="26" height="12" rx="6" fill="#8e98b8"/><path d="M14 50h-8" stroke="#2e3550" stroke-width="8" stroke-linecap="round"/>`);
  }
  const turret = (x: number, dir = 1) => `<g><rect x="${x}" y="46" width="${dir * 40}" height="8" rx="3" fill="#2e3550" transform="${dir < 0 ? `translate(${0} 0)` : ''}"/><circle cx="${x}" cy="50" r="17" fill="#5a6584" stroke="#2e3550" stroke-width="4"/></g>`;
  let parts = `${shadow}<path d="${hull(w)}" fill="#8b93b8" stroke="#3a4260" stroke-width="5"/><path d="${hull(w, 28, 72, 26)}" fill="#a7aecb"/>`;
  if (len === 2) {
    parts += `<rect x="58" y="34" width="52" height="32" rx="8" fill="#5a6584"/><rect x="66" y="40" width="20" height="20" rx="4" fill="#cfe3ff"/>`;
  } else {
    const bridge = w * 0.42;
    parts += `<rect x="${bridge}" y="30" width="${w * 0.16}" height="40" rx="8" fill="#5a6584"/><rect x="${bridge + 10}" y="38" width="${w * 0.16 - 20}" height="12" rx="4" fill="#cfe3ff"/><circle cx="${bridge + w * 0.08}" cy="60" r="5" fill="#ffc65a"/>`;
    parts += turret(w - 110) + turret(60, 1);
    if (len === 5) parts += turret(w - 190) + `<circle cx="${bridge - 40}" cy="50" r="11" fill="#2e3550"/>`;
  }
  return svg(len, parts);
}

/** Pirates: wooden ships with sails seen from above (a rowboat, then one sail per cell). */
function pirate(len: number): string {
  const w = len * 100;
  let parts = `<path d="${hull(w, 20, 90)}" fill="#000" opacity=".28"/><path d="${hull(w)}" fill="#8a5a2b" stroke="#4a2c12" stroke-width="5"/><path d="${hull(w, 26, 74, 24)}" fill="#b07a40"/>`;
  for (let y = 36; y <= 64; y += 14) parts += `<path d="M30 ${y}H${w - 40}" stroke="#7a4c22" stroke-width="2.5" opacity=".8"/>`;
  if (len === 2) {
    parts += `<path d="M70 18L50 -2M70 82L50 102M120 18L100 -2M120 82L100 102" stroke="#4a2c12" stroke-width="7" stroke-linecap="round"/><rect x="80" y="40" width="34" height="20" rx="4" fill="#5c3818"/>`;
    return svg(len, parts);
  }
  const masts = len - 1;
  for (let m = 0; m < masts; m++) {
    const x = 70 + m * ((w - 150) / Math.max(1, masts - 1 || 1));
    const cx = masts === 1 ? w / 2 : x;
    parts += `<path d="M${cx - 16} 2Q${cx + 34} 50 ${cx - 16} 98L${cx - 26} 98Q${cx + 8} 50 ${cx - 26} 2Z" fill="#f3e6c4" stroke="#a88a52" stroke-width="3"/><path d="M${cx - 8} 22Q${cx + 12} 50 ${cx - 8} 78" stroke="#c9b27e" stroke-width="3" fill="none"/><path d="M${cx - 26} 2V98" stroke="#4a2c12" stroke-width="5"/><circle cx="${cx - 26}" cy="50" r="8" fill="#4a2c12"/>`;
  }
  parts += `<path d="M${w - 18} 50L${w + 4} 50" stroke="#4a2c12" stroke-width="5" stroke-linecap="round"/><path d="M22 50l-14 -12v24z" fill="#1d1d24"/><circle cx="14" cy="50" r="3" fill="#f3e6c4"/>`;
  return svg(len, parts);
}

/** Toys: bath toys afloat (a rubber duck, a paper boat, a tugboat, a striped liner). */
function toys(len: number): string {
  const w = len * 100;
  const shadow = `<ellipse cx="${w / 2}" cy="58" rx="${w / 2 - 10}" ry="38" fill="#000" opacity=".25"/>`;
  if (len === 2) {
    return svg(len, `${shadow}<ellipse cx="88" cy="52" rx="74" ry="38" fill="#ffd23f" stroke="#c99400" stroke-width="5"/><path d="M24 52q-14 -14 -6 -24q10 10 22 14z" fill="#ffd23f" stroke="#c99400" stroke-width="4"/><circle cx="146" cy="50" r="30" fill="#ffd23f" stroke="#c99400" stroke-width="5"/><path d="M170 44q22 2 24 8q-4 8 -24 8z" fill="#ff8a1f" stroke="#c25a00" stroke-width="3"/><circle cx="156" cy="40" r="6" fill="#1d1d24"/><circle cx="158" cy="38" r="2" fill="#fff"/><path d="M70 40q22 -10 40 4" stroke="#c99400" stroke-width="4" fill="none" stroke-linecap="round"/>`);
  }
  if (len === 3) {
    return svg(len, `${shadow}<path d="M10 50L60 14H240L290 50L240 86H60Z" fill="#fbfbff" stroke="#9aa3c7" stroke-width="5" stroke-linejoin="round"/><path d="M60 14L150 50L60 86M240 14L150 50L240 86" stroke="#c9cfe6" stroke-width="4" fill="none"/><path d="M150 16L150 84" stroke="#9aa3c7" stroke-width="5"/><path d="M110 50L150 26L190 50L150 74Z" fill="#e8ecfb" stroke="#9aa3c7" stroke-width="3"/>`);
  }
  if (len === 4) {
    return svg(len, `${shadow}<path d="${hull(w)}" fill="#e8413c" stroke="#8e1c19" stroke-width="5"/><path d="${hull(w, 30, 70, 30)}" fill="#ffffff"/><rect x="90" y="32" width="110" height="36" rx="10" fill="#2f7de1" stroke="#1a4f96" stroke-width="4"/><rect x="104" y="40" width="22" height="20" rx="4" fill="#cfe3ff"/><rect x="134" y="40" width="22" height="20" rx="4" fill="#cfe3ff"/><circle cx="240" cy="50" r="18" fill="#ffd23f" stroke="#c99400" stroke-width="4"/><circle cx="240" cy="50" r="8" fill="#1d1d24"/><g fill="#1d1d24">${[40, 300, 350].map((x) => `<circle cx="${x}" cy="${x === 40 ? 50 : 50}" r="6"/>`).join('')}</g><path d="M14 30v40" stroke="#ffd23f" stroke-width="8" stroke-linecap="round"/>`);
  }
  // Five: a striped toy liner with three funnels.
  let stripes = '';
  for (let x = 40; x < w - 70; x += 40) stripes += `<rect x="${x}" y="24" width="20" height="52" fill="#2f7de1" opacity=".9"/>`;
  const funnels = [150, 240, 330].map((x) => `<circle cx="${x}" cy="50" r="20" fill="#ffd23f" stroke="#c99400" stroke-width="4"/><circle cx="${x}" cy="50" r="9" fill="#e8413c"/>`).join('');
  return svg(len, `${shadow}<path d="${hull(w)}" fill="#ffffff" stroke="#1a4f96" stroke-width="5"/><clipPath id="toy5"><path d="${hull(w, 22, 78, 20)}"/></clipPath><g clip-path="url(#toy5)">${stripes}</g>${funnels}<circle cx="${w - 40}" cy="50" r="8" fill="#e8413c"/>`);
}

const DRAW: Record<SeaTheme, (len: number) => string> = { navy, pirate, toys };

/** The SVG of a ship of `len` cells in `theme`, lying left to right (bow right). */
export function shipSvg(theme: SeaTheme, len: number): string {
  return DRAW[theme](Math.max(2, Math.min(5, Math.round(len))));
}
