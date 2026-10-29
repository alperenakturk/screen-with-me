import { formatDuration, normalizeQuery, parseSearchAnswer, type SearchAnswer, type SearchResult } from '@swm/shared/youtube-search';
import { el } from '../dom.ts';
import { lang, t } from '../i18n.ts';

export type AddMode = 'enqueue' | 'load';

/**
 * YouTube search under the room's link box: words instead of a link + Enter → a list of videos (only on Enter, never
 * while typing: every search costs 1 % of the day's free quota). Pressing a row adds it to the queue (it plays at
 * once when nothing is playing), "▶ Şimdi aç" opens it now. Answers are kept for this page so the same words never
 * reach the server twice.
 */
export function createSearch(form: HTMLFormElement, input: HTMLInputElement, pick: (id: string, title: string, mode: AddMode) => void) {
  const panel = el('div', { class: 'search-results', id: 'search-results', role: 'region', hidden: '' });
  form.append(panel);
  const answers = new Map<string, SearchAnswer>();
  let current = 0;

  function close(): void {
    current++;
    panel.hidden = true;
    panel.replaceChildren();
  }

  function header(text: string): HTMLElement {
    const x = el('button', { type: 'button', class: 'icon-btn search-close', title: t('searchClose'), 'aria-label': t('searchClose') }, '✕');
    x.addEventListener('click', () => {
      close();
      input.focus();
    });
    return el('div', { class: 'search-head' }, el('span', { class: 'muted small' }, text), x);
  }

  function row(result: SearchResult): HTMLElement {
    const meta = [result.channel, result.live ? t('searchLive') : result.duration ? formatDuration(result.duration) : ''].filter(Boolean).join(' · ');
    const thumb = el('img', { class: 'search-thumb', src: `https://i.ytimg.com/vi/${result.id}/mqdefault.jpg`, alt: '', loading: 'lazy' });
    // No broken-image icon when the picture can't load: the empty grey box stays.
    thumb.addEventListener('error', () => (thumb.style.visibility = 'hidden'), { once: true });
    const main = el(
      'button',
      { type: 'button', class: 'search-main', title: t('addToQueue') },
      thumb,
      el('span', { class: 'search-text' }, el('span', { class: 'search-title' }, result.title), el('span', { class: 'muted small search-meta' }, meta)),
    );
    main.addEventListener('click', () => choose(result, 'enqueue'));
    const now = el('button', { type: 'button', class: 'btn small-btn search-now', title: t('playNow') }, `▶ ${t('playNow')}`);
    now.addEventListener('click', () => choose(result, 'load'));
    return el('li', { class: 'search-row' }, main, now);
  }

  function choose(result: SearchResult, mode: AddMode): void {
    close();
    input.value = '';
    pick(result.id, result.title, mode);
  }

  function show(query: string, answer: SearchAnswer): void {
    if ('error' in answer) {
      panel.replaceChildren(header(t('searchFor', { q: query })), el('p', { class: 'search-note' }, t(`searchError.${answer.error}`)));
    } else if (answer.items.length === 0) {
      panel.replaceChildren(header(t('searchFor', { q: query })), el('p', { class: 'search-note' }, t('searchNone')));
    } else {
      panel.replaceChildren(header(t('searchFor', { q: query })), el('ol', { class: 'search-list' }, ...answer.items.map(row)));
    }
    panel.hidden = false;
  }

  async function search(raw: string): Promise<void> {
    const query = normalizeQuery(raw);
    if (query === null) return;
    const key = `${lang()}|${query}`;
    const mine = ++current;
    const known = answers.get(key);
    if (known) return show(raw.trim(), known);
    panel.replaceChildren(header(t('searchFor', { q: raw.trim() })), el('p', { class: 'search-note muted' }, t('searching')));
    panel.hidden = false;
    let answer: SearchAnswer;
    try {
      const response = await fetch(`/api/youtube/search?hl=${lang()}&q=${encodeURIComponent(query)}`);
      answer = response.ok ? parseSearchAnswer(await response.json()) : { error: 'failed' };
    } catch {
      answer = { error: 'failed' };
    }
    // Only full answers are remembered: after "busy" or "quota" the same words may be tried again later.
    if ('items' in answer) answers.set(key, answer);
    if (mine === current) show(raw.trim(), answer);
  }

  // Arrow keys move between the input and the results, Esc closes (the box keeps its words).
  function buttons(): HTMLButtonElement[] {
    return [...panel.querySelectorAll<HTMLButtonElement>('.search-main')];
  }
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' && !panel.hidden) {
      const first = buttons()[0];
      if (first) {
        event.preventDefault();
        first.focus();
      }
    } else if (event.key === 'Escape' && !panel.hidden) {
      close();
    }
  });
  panel.addEventListener('keydown', (event) => {
    const list = buttons();
    const index = list.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      input.focus();
    } else if (index >= 0 && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      const next = index + (event.key === 'ArrowDown' ? 1 : -1);
      if (next < 0) input.focus();
      else list[Math.min(next, list.length - 1)]!.focus();
    }
  });
  // A press anywhere outside the box and the list closes it.
  document.addEventListener('pointerdown', (event) => {
    if (!panel.hidden && !form.contains(event.target as Node)) close();
  });

  return { search, close };
}
