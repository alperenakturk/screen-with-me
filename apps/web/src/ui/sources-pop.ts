// Card SRC1: the ⠿ Sources picker's styles, loaded the first time it opens (the room page's CSS budget). Card SR2:
// the ♪ TikTok door and its "📋 Paste and play" come with it (the room page's JS budget).
import './sources.css';
import { el } from '../dom.ts';
import { t } from '../i18n.ts';
import { flashHint } from './hint.ts';

export const loaded = true;

const TIKTOK = 'https://www.tiktok.com/';
/** How long "📋 Paste and play" waits after coming back from TikTok. */
const PASTE_MS = 120_000;

/** TikTok's own page: its search for the words, or its home page with none. */
export function tiktokUrl(words: string): string {
  const query = words.trim();
  if (!query) return TIKTOK;
  const url = new URL('search', TIKTOK);
  url.searchParams.set('q', query);
  return url.toString();
}

export interface TikTokDoor {
  /** The ♪ TikTok tile for the picker (drawn with the other tiles). */
  tile(): HTMLButtonElement;
  /** Back in the room: true when it took over (it shows "📋 Paste and play"). */
  back(): boolean;
  pasteShown(): boolean;
  relabel(): void;
}

interface Picker {
  form: HTMLFormElement;
  input: HTMLInputElement;
  button: HTMLButtonElement;
  note: (source: 'tiktok', words: string, result: string) => void;
  close: () => void;
}

/**
 * ♪ TikTok is not a source (TikTok has no search API): the tile opens TikTok itself (a new tab; on a phone the TikTok
 * app takes the link) with the typed words as a TikTok search. Back in the room a big "📋 Paste and play" reads the
 * clipboard after a tap (the browser may ask) and plays the link through the box's own "Play now". Plain text, a
 * generic ♪, no TikTok logo, no scraping, no extension.
 */
export function tiktokDoor({ form, input, button, note, close }: Picker): TikTokDoor {
  let away = false;
  let timer = 0;
  const paste = el('button', { type: 'button', class: 'btn primary sources-paste', id: 'sources-paste', hidden: '' }, `📋 ${t('sources.paste')}`);
  form.after(paste);

  function show(on: boolean): void {
    paste.hidden = !on;
    clearTimeout(timer);
    if (on) timer = window.setTimeout(() => show(false), PASTE_MS);
  }
  paste.addEventListener('click', async () => {
    let text = '';
    try {
      text = (await navigator.clipboard.readText()).trim();
    } catch {
      /* no clipboard access (refused, or an old browser): the box takes a normal paste */
    }
    show(false);
    if (!text) {
      input.focus();
      flashHint(input, t('sources.pasteManual'), 4500);
      return;
    }
    input.value = text;
    note('tiktok', '', 'pasted');
    // The room's own path for links: one link plays now; several, the first plays and the rest are queued.
    form.requestSubmit(form.querySelector<HTMLButtonElement>('button[value=load]'));
  });
  // Submitting something else means the person moved on.
  form.addEventListener('submit', () => show(false));

  return {
    tile() {
      const tile = el(
        'button',
        { type: 'button', class: 'sources-tile sources-tiktok', 'data-source': 'tiktok', title: t('sources.tiktokHint') },
        el('span', { class: 'sources-icon', 'aria-hidden': 'true' }, '♪'),
        el('span', { class: 'sources-name' }, t('sources.tiktok')),
        el('span', { class: 'sources-note muted small' }, t('sources.tiktokNote')),
      );
      tile.addEventListener('click', () => {
        // A link already in the box is not a search: TikTok's home page.
        const query = /^\s*https?:/i.test(input.value) ? '' : input.value.trim();
        const opened = window.open(tiktokUrl(query), '_blank', 'noopener');
        note('tiktok', query, opened === null ? 'opened (no handle)' : 'opened');
        close();
        if (query) input.value = '';
        away = true;
        flashHint(button, t('sources.tiktokHint'), 4500);
      });
      return tile;
    },
    back() {
      if (!away) return false;
      away = false;
      show(true);
      paste.focus();
      return true;
    },
    pasteShown: () => !paste.hidden,
    relabel() {
      paste.textContent = `📋 ${t('sources.paste')}`;
    },
  };
}
