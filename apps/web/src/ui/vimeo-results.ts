// Card SRC1: Vimeo results in the link box's list (the ⠿ Sources picker set to Vimeo). The words go to our Worker
// (`POST /api/vimeo/search`), which asks the Vimeo API with its own token and keeps only public videos any site may
// embed; a pick goes to the room as `{kind:'vimeo', id}` and plays in our Vimeo player like a pasted link. A lazy chunk
// with its own texts; it reuses the YouTube results' row classes (arrow keys and Esc work the same).

import { parseVimeoAnswer, type VimeoAnswer, type VimeoResult } from '@swm/shared/vimeo-search';
import { formatDuration, wordsRequest } from '@swm/shared/youtube-search';
import type { Media } from '@swm/shared/protocol';
import { el } from '../dom.ts';
import { lang } from '../i18n.ts';

const TEXT = {
  en: {
    for: 'Vimeo results for “{q}”',
    searching: 'Searching Vimeo…',
    none: 'No Vimeo videos found for these words.',
    off: 'Vimeo search is not available yet. Paste a Vimeo link instead, or pick another source with ⠿.',
    busy: 'Too many searches right now. Try again in a minute.',
    failed: 'Vimeo can’t be reached right now. Try again later.',
    add: 'Add to the queue',
    now: 'Play now',
    from: 'Results from Vimeo',
  },
  tr: {
    for: '“{q}” için Vimeo sonuçları',
    searching: 'Vimeo’da aranıyor…',
    none: 'Bu kelimelerle Vimeo videosu bulunamadı.',
    off: 'Vimeo araması henüz kullanılamıyor. Bunun yerine bir Vimeo linki yapıştır ya da ⠿ ile başka bir kaynak seç.',
    busy: 'Şu an çok fazla arama var. Bir dakika sonra tekrar dene.',
    failed: 'Vimeo’ya şu an ulaşılamıyor. Sonra tekrar dene.',
    add: 'Sıraya ekle',
    now: 'Şimdi aç',
    from: 'Sonuçlar Vimeo’dan',
  },
} as const;
type TextKey = keyof (typeof TEXT)['en'];
function t(key: TextKey, values: Record<string, string | number> = {}): string {
  const table: Record<string, string> = lang() === 'tr' ? TEXT.tr : TEXT.en;
  return (table[key] ?? TEXT.en[key]).replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ''));
}

type Pick = (media: Media, title: string, mode: 'enqueue' | 'load') => void;
/** Answers for this page: the same words never reach the server twice (only full answers are kept). */
const answers = new Map<string, VimeoAnswer>();

async function ask(query: string): Promise<VimeoAnswer> {
  const known = answers.get(query);
  if (known) return known;
  let answer: VimeoAnswer;
  try {
    const response = await fetch('/api/vimeo/search', wordsRequest(query));
    answer = response.ok ? parseVimeoAnswer(await response.json()) : { error: 'failed' };
  } catch {
    answer = { error: 'failed' };
  }
  if ('items' in answer) answers.set(query, answer);
  return answer;
}

function row(result: VimeoResult, pick: Pick): HTMLElement {
  const meta = [result.user, result.duration ? formatDuration(result.duration) : ''].filter(Boolean).join(' · ');
  const thumb = result.thumb
    ? el('img', { class: 'search-thumb', src: result.thumb, alt: '', loading: 'lazy' })
    : el('span', { class: 'search-thumb podcast-art', 'aria-hidden': 'true' }, '🎞️');
  if (thumb instanceof HTMLImageElement) thumb.addEventListener('error', () => (thumb.style.visibility = 'hidden'), { once: true });
  const media: Media = { kind: 'vimeo', id: result.id };
  const main = el(
    'button',
    { type: 'button', class: 'search-main', title: t('add') },
    thumb,
    el('span', { class: 'search-text' }, el('span', { class: 'search-title' }, result.title), el('span', { class: 'muted small search-meta' }, meta)),
  );
  main.addEventListener('click', () => pick(media, result.title, 'enqueue'));
  const now = el('button', { type: 'button', class: 'btn small-btn search-now', title: t('now') }, `▶ ${t('now')}`);
  now.addEventListener('click', () => pick(media, result.title, 'load'));
  return el('li', { class: 'search-row' }, main, now);
}

/**
 * Fills the results panel with Vimeo videos for these words. `close` is the panel's ✕ (kept in the head); `stale`
 * says a newer search replaced this one; `done` reports the outcome (for the Test Lab and the "off" tile).
 */
export async function showVimeo(panel: HTMLElement, query: string, shown: string, close: HTMLElement, pick: Pick, stale: () => boolean, done: (result: string) => void): Promise<void> {
  const head = el('div', { class: 'search-head' }, el('span', { class: 'muted small' }, t('for', { q: shown })), close);
  panel.replaceChildren(head, el('p', { class: 'search-note muted' }, t('searching')));
  panel.hidden = false;
  const answer = await ask(query);
  if (stale()) return;
  if ('error' in answer) {
    panel.replaceChildren(head, el('p', { class: 'search-note' }, t(answer.error)));
    done(answer.error);
  } else if (answer.items.length === 0) {
    panel.replaceChildren(head, el('p', { class: 'search-note' }, t('none')));
    done('none');
  } else {
    panel.replaceChildren(head, el('ol', { class: 'search-list' }, ...answer.items.map((item) => row(item, pick))), el('p', { class: 'yt-attrib small vimeo-attrib' }, t('from')));
    done(`${answer.items.length} results`);
  }
}
