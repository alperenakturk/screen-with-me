import { t, type I18nKey } from '../i18n.ts';
import { debugHooks } from '../debug-lab.ts';
import { flashHint } from './hint.ts';
import { loadChunk } from './lazy.ts';
import type { Picker } from './sources-pop.ts';

/**
 * Card SRC1: the ⠿ Sources button beside the link box (computer room and the phone's 🔍 Search tab) picks what typed
 * words search: YouTube (today's search), Vimeo (our Worker asks Vimeo; "not available yet" without the `VIMEO_TOKEN`
 * secret), 🎙 podcasts (card SRC2) or the web (a new tab with one general search engine; back in the room a hint says
 * to paste the link). The pick sticks per device (`searchSource`). No in-page browser, no site list, no site filter:
 * Sidelit stays a neutral sync tool. Test Lab: `sources.state` (the source, Vimeo on or off, the last search).
 *
 * Card SRC2: ⠿ (and the empty room's "🔍 Search a video") opens "What are we watching?", a big grid of tiles with
 * category chips (a lazy chunk, `sources-pop.ts`): source tiles set the search above, action tiles open the feeds, the
 * ♪ TikTok door (card SR2), the games hall, a link hint or the extension page. It sits in the video's place, in the
 * side panel's place while a YouTube video (or a film page) shows, or as a bottom sheet on a phone. Test Lab:
 * `sources.picker`, `sources.open`.
 */
export type Source = 'youtube' | 'vimeo' | 'podcasts' | 'web';
const SOURCES: readonly Source[] = ['youtube', 'vimeo', 'podcasts', 'web'];
const KEY = 'searchSource';
/** One general search engine (the owner's pick: Google; no site filters). */
const WEB_SEARCH = 'https://www.google.com/search';
export function webSearchUrl(words: string): string {
  const url = new URL(WEB_SEARCH);
  url.searchParams.set('q', words.trim());
  return url.toString();
}

const TILE: Record<Source, { name: I18nKey; placeholder: I18nKey }> = {
  youtube: { name: 'sources.youtube', placeholder: 'mediaPlaceholder' },
  vimeo: { name: 'sources.vimeo', placeholder: 'sources.vimeoPlaceholder' },
  podcasts: { name: 'sources.podcasts', placeholder: 'sources.podcastsPlaceholder' },
  web: { name: 'sources.web', placeholder: 'sources.webPlaceholder' },
};

/** Where the picker goes: the video's place, the side panel's place (a YouTube video or a film page shows) or a sheet. */
export type Placement = 'video' | 'side' | 'sheet';

export interface SourceActions {
  feed: (kind: 'shorts' | 'videos') => void;
  games: () => void;
  placement: () => Placement;
}

function stored(): Source {
  try {
    const value = localStorage.getItem(KEY);
    return SOURCES.includes(value as Source) ? (value as Source) : 'youtube';
  } catch {
    return 'youtube';
  }
}

export function createSources(form: HTMLFormElement, input: HTMLInputElement, button: HTMLButtonElement, actions: SourceActions) {
  let source = stored();
  /** Vimeo on the server: null until asked (once per page, when the picker first opens or Vimeo is searched). */
  let vimeoOn: boolean | null = null;
  let last: { source: Source | 'tiktok'; words: string; result: string } | null = null;
  /** Set when "Search the web" opened a tab: the next time the room is shown again, the paste hint. */
  let awayForWeb = false;
  /** The big grid and its ♪ TikTok door, from the lazy chunk (null until the first open). */
  let picker: Picker | null = null;

  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', 'sources-pop');

  function label(): void {
    const name = t(TILE[source].name);
    button.title = t('sources.button', { source: name });
    button.setAttribute('aria-label', t('sources.button', { source: name }));
    button.dataset.source = source;
    input.placeholder = t(TILE[source].placeholder);
    form.dataset.source = source;
  }

  async function checkVimeo(): Promise<boolean> {
    if (vimeoOn !== null) return vimeoOn;
    try {
      const answer = (await (await fetch('/api/vimeo/status')).json()) as { on?: unknown };
      vimeoOn = answer.on === true;
    } catch {
      return false;
    }
    picker?.redraw();
    return vimeoOn;
  }

  /** Opens "What are we watching?"; `opener` gets the focus back on Esc / ✕. */
  async function open(opener: HTMLElement = button): Promise<void> {
    if (!picker) {
      const chunk = await loadChunk(() => import('./sources-pop.ts'));
      if (!chunk) return;
      picker ??= chunk.createPicker({
        form,
        input,
        button,
        source: () => source,
        vimeoOn: () => vimeoOn,
        choose,
        note,
        actions,
        shown: (on) => button.setAttribute('aria-expanded', String(on)),
      });
    }
    picker.open(actions.placement(), opener);
    void checkVimeo();
  }
  function close(focus = false): void {
    picker?.close(focus);
  }

  function choose(value: Source): void {
    source = value;
    try {
      localStorage.setItem(KEY, value);
    } catch {
      /* private mode: the pick lasts for this page */
    }
    label();
  }

  button.addEventListener('click', () => (picker?.isOpen() ? close(true) : void open(button)));

  /** "Search the web": one new tab with the words; back in the room the box waits for the link. */
  function web(words: string): void {
    const opened = window.open(webSearchUrl(words), '_blank', 'noopener');
    note('web', words, opened === null ? 'opened (no handle)' : 'opened');
    input.value = '';
    awayForWeb = true;
  }
  const back = () => {
    if (document.hidden || picker?.back()) return;
    if (!awayForWeb) return;
    awayForWeb = false;
    input.focus();
    flashHint(input, t('sources.pasteHint'), 4500);
  };
  document.addEventListener('visibilitychange', back);
  addEventListener('focus', back);

  function note(value: Source | 'tiktok', words: string, result: string): void {
    last = { source: value, words, result };
  }

  label();
  // A language change re-applies the box's default placeholder: put this source's back.
  addEventListener('langchange', () => {
    label();
    picker?.relabel();
  });

  debugHooks.register('sources', () => ({
    commands: [
      {
        id: 'sources.state',
        tab: 'status',
        run: async () => JSON.stringify({ source, vimeoOn: await checkVimeo(), last, pasteShown: picker?.pasteShown() ?? false }),
      },
      {
        id: 'sources.picker',
        tab: 'status',
        run: () => JSON.stringify({ source, ...(picker?.state() ?? { open: false }) }),
      },
      {
        id: 'sources.open',
        tab: 'screen',
        run: () => open(button),
        undo: () => close(),
      },
    ],
  }));

  return {
    get source(): Source {
      return source;
    },
    web,
    note,
    open,
    /** The Vimeo search said "off": the tile shows "not available yet" from now on. */
    vimeoOff(): void {
      vimeoOn = false;
    },
    close,
    relabel: label,
  };
}

