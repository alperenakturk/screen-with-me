import { FEED_RESULTS, formatDuration, normalizeQuery, parseSearchAnswer, type SearchAnswer, wordsRequest } from '@swm/shared/youtube-search';
import { el } from '../dom.ts';
import { lang, t } from '../i18n.ts';

/**
 * Shorts search in the Shorts bar's "＋ Ekle" box (0.9.91.12, owner): words + Enter list YouTube Shorts only (the same
 * `short=1` search as the ♾ feed: one search ≈ 1 % of the day's quota, answers cached for a day on the server and
 * for this page here). A row's ＋ adds that Short to the queue; the box stays open to add more. `search` answers the
 * first Short it shows (card YTK: "▶ Play now" with words opens it), or null (no result, an error, a newer search).
 */
export function createShortsSearch(list: HTMLElement, add: (id: string) => void) {
  const answers = new Map<string, SearchAnswer>();
  const added = new Set<string>();
  let current = 0;

  function note(text: string): void {
    list.replaceChildren(el('li', { class: 'muted small shorts-result-note' }, text));
    list.hidden = false;
  }

  function show(answer: SearchAnswer): void {
    if ('error' in answer) return note(t(`searchError.${answer.error}`));
    const items = answer.items.filter((item) => !item.live);
    if (items.length === 0) return note(t('searchNone'));
    list.replaceChildren(
      ...items.map((item) => {
        const thumb = el('img', { class: 'shorts-result-thumb', src: `https://i.ytimg.com/vi/${item.id}/mqdefault.jpg`, alt: '', loading: 'lazy' });
        thumb.addEventListener('error', () => (thumb.style.visibility = 'hidden'), { once: true });
        const button = el('button', { type: 'button', class: 'shorts-result', title: t('addToQueue') },
          thumb,
          el('span', { class: 'shorts-result-text' }, el('span', { class: 'shorts-result-title' }, item.title), el('span', { class: 'muted small' }, item.duration ? formatDuration(item.duration) : '')),
          el('span', { class: 'shorts-result-add', 'aria-hidden': 'true' }, added.has(item.id) ? '✓' : '＋'),
        );
        button.classList.toggle('added', added.has(item.id));
        button.addEventListener('click', () => {
          if (added.has(item.id)) return;
          added.add(item.id);
          add(item.id);
          button.classList.add('added');
          button.querySelector('.shorts-result-add')!.textContent = '✓';
        });
        return el('li', {}, button);
      }),
    );
    list.hidden = false;
  }

  const firstOf = (answer: SearchAnswer): string | null => ('items' in answer ? (answer.items.find((item) => !item.live)?.id ?? null) : null);

  async function search(raw: string): Promise<string | null> {
    const query = normalizeQuery(raw);
    if (query === null) return null;
    const key = `${lang()}|${query}`;
    const mine = ++current;
    const known = answers.get(key);
    if (known) {
      show(known);
      return firstOf(known);
    }
    note(t('searching'));
    let answer: SearchAnswer;
    try {
      const response = await fetch(`/api/youtube/search?short=1&hl=${lang()}`, wordsRequest(query));
      answer = response.ok ? parseSearchAnswer(await response.json(), FEED_RESULTS) : { error: 'failed' };
    } catch {
      answer = { error: 'failed' };
    }
    if ('items' in answer) answers.set(key, answer);
    if (mine !== current) return null;
    show(answer);
    return firstOf(answer);
  }

  function clear(): void {
    current++;
    list.hidden = true;
    list.replaceChildren();
  }

  return { search, clear };
}
