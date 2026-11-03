// 🎧 Podcasts in the link box's results (card P2): the same words as a podcast search (`/api/podcasts/search`, Apple's
// iTunes Search through our Worker), a show's newest episodes (`/api/podcasts/episodes`, its RSS feed read by the
// Worker), and an episode goes to the room as an audio file with the show's cover art (`{kind:'html5', url, poster}`),
// which everyone hears in sync like any video file. A lazy chunk with its own texts; it reuses the YouTube results'
// row classes (arrow keys and Esc work the same).

import { parseEpisodesAnswer, parseShowsAnswer, type EpisodesAnswer, type PodcastShow, type ShowsAnswer } from '@swm/shared/podcasts';
import { formatDuration } from '@swm/shared/youtube-search';
import type { Media } from '@swm/shared/protocol';
import { el } from '../dom.ts';
import { lang } from '../i18n.ts';

const TEXT = {
  en: {
    for: '🎧 Podcasts for “{q}”',
    searching: 'Looking for podcasts…',
    none: 'No podcasts found for these words.',
    empty: 'This show has no episodes we can play.',
    busy: 'Too many searches right now. Try again in a minute.',
    failed: 'Podcasts can’t be reached right now. Try again later.',
    gone: 'This show can’t be found any more.',
    back: '‹ Shows',
    add: 'Add to the queue',
    now: 'Play now',
    by: 'by {name}',
  },
  tr: {
    for: '🎧 “{q}” için podcastler',
    searching: 'Podcastler aranıyor…',
    none: 'Bu kelimelerle podcast bulunamadı.',
    empty: 'Bu programda oynatabileceğimiz bölüm yok.',
    busy: 'Şu an çok fazla arama var. Bir dakika sonra tekrar dene.',
    failed: 'Podcastlere şu an ulaşılamıyor. Sonra tekrar dene.',
    gone: 'Bu program artık bulunamıyor.',
    back: '‹ Programlar',
    add: 'Sıraya ekle',
    now: 'Şimdi aç',
    by: '{name}',
  },
} as const;
type TextKey = keyof (typeof TEXT)['en'];
function t(key: TextKey, values: Record<string, string | number> = {}): string {
  const table: Record<string, string> = lang() === 'tr' ? TEXT.tr : TEXT.en;
  return (table[key] ?? TEXT.en[key]).replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ''));
}

type Pick = (media: Media, title: string, mode: 'enqueue' | 'load') => void;
const shows = new Map<string, Promise<ShowsAnswer>>();
const episodes = new Map<string, Promise<EpisodesAnswer>>();
async function getJson<T>(url: string, parse: (body: unknown) => T, fallback: T): Promise<T> {
  try {
    const response = await fetch(url);
    return response.ok ? parse(await response.json()) : fallback;
  } catch {
    return fallback;
  }
}

function art(src: string | null): HTMLElement {
  if (!src) return el('span', { class: 'search-thumb podcast-art', 'aria-hidden': 'true' }, '🎧');
  const img = el('img', { class: 'search-thumb podcast-art', src, alt: '', loading: 'lazy' });
  img.addEventListener('error', () => (img.style.visibility = 'hidden'), { once: true });
  return img;
}

/** Fills the results panel with podcasts for these words. `close` is the panel's ✕ (kept in the new head). */
export function showPodcasts(panel: HTMLElement, query: string, close: HTMLElement, pick: Pick): void {
  const head = (text: string, back?: () => void) => {
    const parts: Node[] = [];
    if (back) {
      const b = el('button', { type: 'button', class: 'btn small-btn podcast-back' }, t('back'));
      b.addEventListener('click', back);
      parts.push(b);
    }
    parts.push(el('span', { class: 'muted small' }, text), close);
    return el('div', { class: 'search-head' }, ...parts);
  };
  const note = (text: string) => el('p', { class: 'search-note' }, text);
  let token = 0;

  async function list(): Promise<void> {
    const mine = ++token;
    panel.replaceChildren(head(t('for', { q: query })), note(t('searching')));
    panel.hidden = false;
    const key = `${lang()}|${query.toLowerCase()}`;
    if (!shows.has(key)) shows.set(key, getJson(`/api/podcasts/search?hl=${lang()}&q=${encodeURIComponent(query)}`, parseShowsAnswer, { error: 'failed' } as ShowsAnswer));
    const answer = await shows.get(key)!;
    if (mine !== token) return;
    if ('error' in answer) {
      shows.delete(key);
      return void panel.replaceChildren(head(t('for', { q: query })), note(t(answer.error)));
    }
    if (!answer.items.length) return void panel.replaceChildren(head(t('for', { q: query })), note(t('none')));
    panel.replaceChildren(
      head(t('for', { q: query })),
      el(
        'ol',
        { class: 'search-list podcast-shows' },
        ...answer.items.map((show) => {
          const main = el(
            'button',
            { type: 'button', class: 'search-main', 'data-show': show.id },
            art(show.art),
            el('span', { class: 'search-text' }, el('span', { class: 'search-title' }, show.title), el('span', { class: 'muted small search-meta' }, show.author ? t('by', { name: show.author }) : '')),
          );
          main.addEventListener('click', () => void open(show));
          return el('li', { class: 'search-row' }, main);
        }),
      ),
    );
  }

  async function open(show: PodcastShow): Promise<void> {
    const mine = ++token;
    const back = () => void list();
    panel.replaceChildren(head(show.title, back), note(t('searching')));
    if (!episodes.has(show.id)) episodes.set(show.id, getJson(`/api/podcasts/episodes?id=${show.id}`, parseEpisodesAnswer, { error: 'failed' } as EpisodesAnswer));
    const answer = await episodes.get(show.id)!;
    if (mine !== token) return;
    if ('error' in answer) {
      episodes.delete(show.id);
      return void panel.replaceChildren(head(show.title, back), note(t(answer.error === 'none' ? 'gone' : answer.error)));
    }
    if (!answer.items.length) return void panel.replaceChildren(head(show.title, back), note(t('empty')));
    const poster = answer.show.art ?? show.art;
    const locale = lang() === 'tr' ? 'tr-TR' : 'en-GB';
    panel.replaceChildren(
      head(answer.show.title || show.title, back),
      el(
        'ol',
        { class: 'search-list podcast-episodes' },
        ...answer.items.map((episode) => {
          const media: Media = poster ? { kind: 'html5', url: episode.url, poster } : { kind: 'html5', url: episode.url };
          const title = `${answer.show.title || show.title} · ${episode.title}`.slice(0, 200);
          const meta = [episode.date ? new Date(episode.date).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }) : '', episode.duration ? formatDuration(episode.duration) : '']
            .filter(Boolean)
            .join(' · ');
          const main = el(
            'button',
            { type: 'button', class: 'search-main', title: t('add') },
            art(poster),
            el('span', { class: 'search-text' }, el('span', { class: 'search-title' }, episode.title), el('span', { class: 'muted small search-meta' }, meta)),
          );
          main.addEventListener('click', () => pick(media, title, 'enqueue'));
          const now = el('button', { type: 'button', class: 'btn small-btn search-now', title: t('now') }, `▶ ${t('now')}`);
          now.addEventListener('click', () => pick(media, title, 'load'));
          return el('li', { class: 'search-row' }, main, now);
        }),
      ),
    );
  }

  void list();
}
