import { el } from '../dom.ts';
import { t } from '../i18n.ts';

/**
 * Card SR2: one row of a results list (YouTube, Vimeo, podcast episodes). A click or tap anywhere on the row plays it
 * now for everyone; the "＋ Queue" button beside it adds it to the queue without playing, and the list stays open so
 * several can be queued. Arrow keys move between the rows' `.search-main` buttons (search.ts); Tab reaches the
 * queue button.
 */
export function resultRow(thumb: HTMLElement, title: string, meta: string, play: () => void, queue: () => void): HTMLLIElement {
  const main = el(
    'button',
    { type: 'button', class: 'search-main', title: t('result.play') },
    thumb,
    el('span', { class: 'search-text' }, el('span', { class: 'search-title' }, title), el('span', { class: 'muted small search-meta' }, meta)),
  );
  main.addEventListener('click', play);
  const add = el(
    'button',
    { type: 'button', class: 'btn small-btn search-queue', title: t('result.queueTitle'), 'aria-label': t('result.queueLabel', { title }) },
    `＋ ${t('result.queue')}`,
  );
  let timer = 0;
  add.addEventListener('click', () => {
    queue();
    // A clear "it worked" on the button itself; it stays usable (the same video may be queued twice on purpose).
    add.textContent = `✓ ${t('result.queued')}`;
    add.classList.add('done');
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      add.textContent = `＋ ${t('result.queue')}`;
      add.classList.remove('done');
    }, 2000);
  });
  return el('li', { class: 'search-row' }, main, add);
}
