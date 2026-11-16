// The results list's styles, loaded on the first search (the room page's CSS budget; card SR2), with the Test Lab's
// look at the list (the room page's JS budget).
import './search-list.css';
import { debugHooks } from '../debug-lab.ts';

export const loaded = true;

/** Card SR2: Test Lab `search.results`, from the first search on. */
export function watchResults(panel: HTMLElement, query: () => string): void {
  // Card SR2: what the open results list offers, row by row (a row plays; its "＋ Queue" queues).
  debugHooks.register('search', () => ({
    commands: [
      {
        id: 'search.results',
        tab: 'status',
        title: { en: 'Search results: each row and its buttons', tr: 'Arama sonuçları: her satır ve düğmeleri' },
        help: {
          en: 'Writes the open results list into the log: each row’s title, that a tap plays it, its “＋ Queue” button and their sizes.',
          tr: 'Açık sonuç listesini kayda yazar: her satırın başlığı, dokununca açıldığı, “＋ Sıraya” düğmesi ve boyutları.',
        },
        run: () => {
          const size = (node: Element | null) => {
            const r = node?.getBoundingClientRect();
            return r ? `${Math.round(r.width)}×${Math.round(r.height)}` : null;
          };
          const rows = [...panel.querySelectorAll('.search-row')].map((row) => ({
            title: row.querySelector('.search-title')?.textContent ?? '',
            play: row.querySelector('.search-main')?.getAttribute('title') ?? null,
            playSize: size(row.querySelector('.search-main')),
            queue: row.querySelector('.search-queue')?.textContent ?? null,
            queueSize: size(row.querySelector('.search-queue')),
          }));
          return JSON.stringify({ open: !panel.hidden, query: query(), rows });
        },
      },
    ],
  }));
}
