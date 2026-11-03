// "How to play" cards for the side games (card GP, Design's `side-games-polish.md` §5): 2–4 picture cards shown the
// first time a game opens (`<game>:howSeen`) and again from the "?" button in the game's own top bar. A layer over the
// game, the same size; the game keeps ticking behind it. ✕ and Esc skip it; ← / → and Enter work while it has the
// focus (it never takes the focus by itself, like the games' own buttons: the room's keys stay the room's). The
// pictures carry no words, so one set serves every language; each game passes its own titles and lines.

import './how-to-play.css';
import { el } from '../dom.ts';
import { lang } from '../i18n.ts';
import { load, save } from '../storage.ts';

const TEXT = {
  en: { next: 'Next', play: "Let's play", back: 'Back', skip: 'Skip', open: 'How to play', card: 'Card {n} of {all}' },
  tr: { next: 'İleri', play: 'Hadi oynayalım', back: 'Geri', skip: 'Geç', open: 'Nasıl oynanır', card: 'Kart {n} / {all}' },
} as const;
type Key = keyof (typeof TEXT)['en'];
const t = (key: Key, values: Record<string, number> = {}) =>
  (lang() === 'tr' ? TEXT.tr : TEXT.en)[key].replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ''));

export interface HowCard {
  /** Our own static SVG (never user data). */
  art: string;
  title: string;
  line: string;
}

let idCounter = 0;
/** The picture with its ids made unique (two games' cards may share a page). */
function picture(raw: string): HTMLElement {
  const prefix = `htp${++idCounter}-`;
  const svg = raw.replace(/id="([^"]+)"/g, `id="${prefix}$1"`).replace(/url\(#([^)]+)\)/g, `url(#${prefix}$1)`).replace(/href="#([^"]+)"/g, `href="#${prefix}$1"`);
  const box = el('div', { class: 'htp-art', 'aria-hidden': 'true' });
  box.innerHTML = svg;
  return box;
}

export interface HowToPlay {
  /** The "?" for the game's top bar. */
  button: HTMLButtonElement;
  show(): void;
  close(): void;
  destroy(): void;
}

/** Mounts the layer into `host` (the game's root box, `position: relative`) and shows it once if `key` is not set. */
export function howToPlay(host: HTMLElement, key: string, cards: () => HowCard[]): HowToPlay {
  const layer = el('div', { class: 'htp', role: 'dialog', tabindex: '0', 'data-how': '' });
  layer.hidden = true;
  const art = el('div', { class: 'htp-picture' });
  const title = el('b', { class: 'htp-title' });
  const line = el('p', { class: 'htp-line' });
  const dots = el('div', { class: 'htp-dots', 'aria-hidden': 'true' });
  const back = el('button', { type: 'button', class: 'htp-btn htp-back', 'data-how': 'back' });
  const next = el('button', { type: 'button', class: 'htp-btn htp-next', 'data-how': 'next' });
  const skip = el('button', { type: 'button', class: 'htp-skip', 'data-how': 'skip' }, '✕');
  layer.append(skip, art, el('div', { class: 'htp-words' }, title, line), dots, el('div', { class: 'htp-actions' }, back, next));
  host.append(layer);
  const button = el('button', { type: 'button', class: 'htp-open', 'data-how': 'open' }, '?');
  // Like the games' own buttons: a press never takes the focus.
  for (const b of [button, back, next, skip]) b.addEventListener('mousedown', (event) => event.preventDefault());

  let index = 0;
  const pictures = new Map<number, HTMLElement>();
  function draw(): void {
    const list = cards();
    const card = list[index]!;
    let pic = pictures.get(index);
    if (!pic) pictures.set(index, (pic = picture(card.art)));
    art.replaceChildren(pic);
    title.textContent = card.title;
    line.textContent = card.line;
    dots.replaceChildren(...list.map((_, i) => el('span', { class: `htp-dot${i === index ? ' on' : ''}` })));
    layer.setAttribute('aria-label', `${t('open')} · ${t('card', { n: index + 1, all: list.length })}`);
    back.textContent = t('back');
    back.hidden = index === 0;
    next.textContent = index === list.length - 1 ? t('play') : t('next');
    skip.title = t('skip');
    skip.setAttribute('aria-label', t('skip'));
    button.title = t('open');
    button.setAttribute('aria-label', t('open'));
  }
  function show(): void {
    index = 0;
    layer.hidden = false;
    draw();
  }
  function close(): void {
    if (layer.hidden) return;
    layer.hidden = true;
    save(key, '1');
    if (layer.contains(document.activeElement)) layer.blur();
  }
  function go(step: number): void {
    const all = cards().length;
    if (index + step >= all) return close();
    index = Math.max(0, index + step);
    draw();
  }
  button.addEventListener('click', () => (layer.hidden ? show() : close()));
  next.addEventListener('click', () => go(1));
  back.addEventListener('click', () => go(-1));
  skip.addEventListener('click', close);
  layer.addEventListener('keydown', (event) => {
    const keys: Record<string, () => void> = { Escape: close, ArrowRight: () => go(1), Enter: () => go(1), ArrowLeft: () => go(-1) };
    const fn = keys[event.key];
    if (!fn) return;
    // The game's keys: the room never sees them while the cards have the focus.
    event.preventDefault();
    event.stopPropagation();
    fn();
  });
  const onLang = () => !layer.hidden && draw();
  addEventListener('langchange', onLang);
  draw();
  if (!load(key)) show();
  return {
    button,
    show,
    close,
    destroy: () => {
      removeEventListener('langchange', onLang);
      layer.remove();
    },
  };
}
