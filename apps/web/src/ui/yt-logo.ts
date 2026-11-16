/**
 * YouTube's own logo (card YTQ1), shown at the start of every "Results from YouTube · Terms" line. The PNGs are the
 * official files, byte for byte (docs/internal/youtube-audit/brand/); only the browser scales them. The clear space is
 * inside the file: the drawing fills 289 of its 573 px, so 40 px here draws the logo 20 px tall. White wordmark on the
 * dark themes, Almost Black on Matinee (the pair is switched in room.css).
 */
import { el } from '../dom.ts';

export const YT_LOGO_HEIGHT = 40;
const WIDTH = String(Math.round((1705 / 573) * YT_LOGO_HEIGHT));
const LINK = { class: 'yt-logo', href: 'https://www.youtube.com', target: '_blank', rel: 'noopener', 'aria-label': 'YouTube' };
const img = (c: 'white' | 'almostblack') => ({
  class: `yt-logo-${c[0]}`,
  src: `/brand/yt_logo_fullcolor_${c}_digital.png`,
  alt: '',
  width: WIDTH,
  height: String(YT_LOGO_HEIGHT),
  style: 'vertical-align: middle',
});
const attrs = (a: Record<string, string>) => Object.entries(a).map(([k, v]) => `${k}="${v}"`).join(' ');

/** The linked logo as HTML, for the room page's static markup (fixed text, no user data). */
export function ytLogoHtml(): string {
  return `<a ${attrs(LINK)}><img ${attrs(img('white'))} /><img ${attrs(img('almostblack'))} /></a>`;
}

/** The same linked logo as an element, for lists built in code. */
export function ytLogo(): HTMLElement {
  return el('a', LINK, el('img', img('white')), el('img', img('almostblack')));
}
