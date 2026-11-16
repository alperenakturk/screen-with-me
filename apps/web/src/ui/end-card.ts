import { el } from '../dom.ts';
import { t } from '../i18n.ts';
import { debugHooks } from '../debug-lab.ts';
import { loadChunk } from './lazy.ts';

const AUTO_CLOSE_MS = 60_000;

/** What is showing now (the Test Lab reads it). */
let shown: { kind: 'dialog' | 'shorts'; title: string; close: () => void } | null = null;

/** The card closes itself when the room moves on (someone else started the next video). */
export function closeNextCard(): void {
  opening++;
  shown?.close();
}

/**
 * The video ended and "play the next one automatically" is off: "Video ended", its title and "▶ Start next".
 *
 * Card EC1 (owner, 15 Nov 2026): a centered dialog over the room view, the same kind as Settings (`.dialog-backdrop`,
 * a light dim, focus on "▶ Start next"; Esc, Close or a click outside close it; it closes itself after a minute). The
 * title is plain text (two lines at most), the link only a small ↗ beside it. It only ever appears after the video
 * ended, as a page dialog, never as a layer on the YouTube player. The Shorts view keeps its own small card in its
 * notes corner (card BH12), placed by room.ts `placeNotices` (`.end-card`).
 */
export function showNextCard(container: HTMLElement, title: string, url: string | null, startNext: () => void): void {
  closeNextCard();
  if (document.documentElement.classList.contains('shorts-view')) return shortsCard(container, title, url, startNext);
  // The dialog and its styles come with a small chunk (the room page's JS and CSS budget): it opens once that is in.
  // A newer card or the next video in between cancels it (`opening`).
  const mine = ++opening;
  void styles().then((chunk) => {
    if (mine !== opening || !chunk) return;
    closeNextCard();
    const close = chunk.openDialog(title, url, startNext, () => {
      if (shown?.close === close) shown = null;
    });
    shown = { kind: 'dialog', title, close };
  });
}

let opening = 0;
let styled: Promise<typeof import('./end-card-css.ts') | null> | null = null;
const styles = () => (styled ??= loadChunk(() => import('./end-card-css.ts')));

/** The Shorts view's small card, as before EC1: it waits in the notes corner beside the upright video. */
function shortsCard(container: HTMLElement, title: string, url: string | null, startNext: () => void): void {
  const close = el('button', { type: 'button', class: 'btn small-btn' }, t('close'));
  const next = el('button', { type: 'button', class: 'btn small-btn primary' }, t('startNext'));
  const card = el(
    'div',
    { class: 'end-card next-card', role: 'dialog', 'aria-label': t('videoEnded') },
    el('h3', {}, t('videoEnded')),
    el('p', { class: 'end-name' }, url ? el('a', { href: url, target: '_blank', rel: 'noopener noreferrer', title: t('endOpenLink') }, title) : title),
    el('div', { class: 'end-actions' }, next, close),
  );
  const timer = setTimeout(() => done(), AUTO_CLOSE_MS);
  function done(): void {
    clearTimeout(timer);
    card.remove();
    if (shown?.close === done) shown = null;
  }
  close.addEventListener('click', done);
  next.addEventListener('click', () => {
    done();
    startNext();
  });
  container.append(card);
  shown = { kind: 'shorts', title, close: done };
}

debugHooks.register('endCard', () => ({
  commands: [
    {
      id: 'endcard.show',
      tab: 'video',
      title: { en: 'Show the "Video ended" card', tr: '"Video bitti" kartını göster' },
      help: {
        en: 'Opens the card people see when a video ends and the next one does not start by itself (a sample title; "Start next" only closes it). Run it again to read what is showing.',
        tr: 'Bir video bitince ve sıradaki kendiliğinden başlamayınca görünen kartı açar (örnek başlık; "Sıradakini başlat" yalnızca kapatır). Yeniden çalıştırınca açık olanı yazar.',
      },
      run: () => {
        if (shown) return JSON.stringify({ open: shown.kind, title: shown.title, focus: document.activeElement?.className ?? null });
        const wrap = document.querySelector<HTMLElement>('.player-wrap') ?? document.body;
        showNextCard(wrap, 'A walk through the old harbour at night, filmed in one long take from the pier to the lighthouse', 'https://example.com/video', () => {});
        return JSON.stringify({ opening: true });
      },
    },
  ],
}));
