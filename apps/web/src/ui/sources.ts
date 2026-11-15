import { el } from '../dom.ts';
import { t, type I18nKey } from '../i18n.ts';
import { debugHooks } from '../debug-lab.ts';
import { flashHint } from './hint.ts';
import { loadChunk } from './lazy.ts';

/**
 * Card SRC1: the ⠿ Sources picker beside the link box (computer room and the phone's 🔍 Search tab). Three tiles pick
 * what typed words search: YouTube (today's search), Vimeo (our Worker asks Vimeo; "not available yet" without the
 * `VIMEO_TOKEN` secret) or the web (a new tab with one general search engine; back in the room a hint says to paste
 * the link). The pick sticks per device (`searchSource`). No in-page browser, no site list, no site filter: Sidelit
 * stays a neutral sync tool. Test Lab: `sources.state` (the source, Vimeo on or off, the last search).
 *
 * Card SR2: a fourth tile, ♪ TikTok. TikTok has no search API, so it is not a source: the tile opens TikTok itself (a
 * new tab; on a phone the TikTok app takes the link when it is installed), with the typed words as a TikTok search.
 * Back in the room a big "📋 Paste and play" button reads the clipboard after a tap (the browser may ask first) and
 * plays the pasted link (several links: the first plays, the rest are queued). Plain text, a generic ♪, no TikTok
 * logo, no scraping, no extension.
 */
export type Source = 'youtube' | 'vimeo' | 'web';
const SOURCES: readonly Source[] = ['youtube', 'vimeo', 'web'];
const KEY = 'searchSource';
/** One general search engine (the owner's pick: Google; no site filters). */
const WEB_SEARCH = 'https://www.google.com/search';
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

export function webSearchUrl(words: string): string {
  const url = new URL(WEB_SEARCH);
  url.searchParams.set('q', words.trim());
  return url.toString();
}

const TILE: Record<Source, { icon: string; name: I18nKey; note: I18nKey; placeholder: I18nKey }> = {
  youtube: { icon: '▶', name: 'sources.youtube', note: 'sources.youtubeNote', placeholder: 'mediaPlaceholder' },
  vimeo: { icon: '🎞️', name: 'sources.vimeo', note: 'sources.vimeoNote', placeholder: 'sources.vimeoPlaceholder' },
  web: { icon: '🌐', name: 'sources.web', note: 'sources.webNote', placeholder: 'sources.webPlaceholder' },
};

function stored(): Source {
  try {
    const value = localStorage.getItem(KEY);
    return SOURCES.includes(value as Source) ? (value as Source) : 'youtube';
  } catch {
    return 'youtube';
  }
}

export function createSources(form: HTMLFormElement, input: HTMLInputElement, button: HTMLButtonElement) {
  let source = stored();
  /** Vimeo on the server: null until asked (once per page, when the picker first opens or Vimeo is searched). */
  let vimeoOn: boolean | null = null;
  let last: { source: Source | 'tiktok'; words: string; result: string } | null = null;
  /** Set when "Search the web" opened a tab: the next time the room is shown again, the paste hint. */
  let awayForWeb = false;
  /** Set when the ♪ TikTok tile opened TikTok: coming back shows "📋 Paste and play". */
  let awayForTikTok = false;
  let pasteTimer = 0;
  const paste = el('button', { type: 'button', class: 'btn primary sources-paste', id: 'sources-paste', hidden: '' }, `📋 ${t('sources.paste')}`);
  form.after(paste);

  const pop = el('div', { class: 'sources-pop', id: 'sources-pop', role: 'radiogroup', hidden: '' });
  form.append(pop);
  button.setAttribute('aria-haspopup', 'true');
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
    if (!pop.hidden) draw();
    return vimeoOn;
  }

  function draw(): void {
    pop.replaceChildren(
      el('p', { class: 'sources-title muted small' }, t('sources.title')),
      ...SOURCES.map((value) => {
        const off = value === 'vimeo' && vimeoOn === false;
        const tile = el(
          'button',
          { type: 'button', class: 'sources-tile', role: 'radio', 'aria-checked': String(value === source), 'data-source': value },
          el('span', { class: 'sources-icon', 'aria-hidden': 'true' }, TILE[value].icon),
          el('span', { class: 'sources-name' }, t(TILE[value].name)),
          el('span', { class: 'sources-note muted small' }, off ? t('sources.vimeoOff') : t(TILE[value].note)),
        );
        if (off) tile.classList.add('off');
        tile.addEventListener('click', () => choose(value));
        return tile;
      }),
      tiktokTile(),
    );
  }

  /** ♪ TikTok: not a source (no search API), a door to TikTok itself. */
  function tiktokTile(): HTMLButtonElement {
    const tile = el(
      'button',
      { type: 'button', class: 'sources-tile sources-tiktok', 'data-source': 'tiktok', title: t('sources.tiktokHint') },
      el('span', { class: 'sources-icon', 'aria-hidden': 'true' }, '♪'),
      el('span', { class: 'sources-name' }, t('sources.tiktok')),
      el('span', { class: 'sources-note muted small' }, t('sources.tiktokNote')),
    );
    tile.addEventListener('click', () => tiktok(input.value));
    return tile;
  }

  function tiktok(words: string): void {
    // A link already in the box is not a search: TikTok's home page.
    const query = /^\s*https?:/i.test(words) ? '' : words;
    const opened = window.open(tiktokUrl(query), '_blank', 'noopener');
    note('tiktok', query.trim(), opened === null ? 'opened (no handle)' : 'opened');
    close();
    if (query.trim()) input.value = '';
    awayForTikTok = true;
    flashHint(button, t('sources.tiktokHint'), 4500);
  }

  function showPaste(on: boolean): void {
    paste.hidden = !on;
    clearTimeout(pasteTimer);
    if (on) pasteTimer = window.setTimeout(() => showPaste(false), PASTE_MS);
  }
  paste.addEventListener('click', async () => {
    let text = '';
    try {
      text = (await navigator.clipboard.readText()).trim();
    } catch {
      /* no clipboard access (refused, or an old browser): the box takes a normal paste */
    }
    if (!text) {
      showPaste(false);
      input.focus();
      flashHint(input, t('sources.pasteManual'), 4500);
      return;
    }
    showPaste(false);
    input.value = text;
    note('tiktok', '', 'pasted');
    // The room's own path for links: one link plays now; several, the first plays and the rest are queued.
    form.requestSubmit(form.querySelector<HTMLButtonElement>('button[value=load]'));
  });
  // Typing or submitting something else means the person moved on.
  form.addEventListener('submit', () => showPaste(false));

  let styled = false;
  async function open(): Promise<void> {
    // The tiles' styles come with a small chunk on the first open (the room page's CSS budget).
    if (!styled) styled = !!(await loadChunk(() => import('./sources-pop.ts')));
    draw();
    pop.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    pop.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
    void checkVimeo();
  }
  function close(focus = false): void {
    if (pop.hidden) return;
    pop.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    if (focus) button.focus();
  }

  function choose(value: Source): void {
    source = value;
    try {
      localStorage.setItem(KEY, value);
    } catch {
      /* private mode: the pick lasts for this page */
    }
    label();
    close();
    input.focus();
  }

  button.addEventListener('click', () => (pop.hidden ? void open() : close(true)));
  pop.addEventListener('keydown', (event) => {
    const tiles = [...pop.querySelectorAll<HTMLButtonElement>('.sources-tile')];
    const index = tiles.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close(true);
    } else if (index >= 0 && ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
      tiles[(index + step + tiles.length) % tiles.length]!.focus();
    }
  });
  document.addEventListener('pointerdown', (event) => {
    if (!pop.hidden && !pop.contains(event.target as Node) && !button.contains(event.target as Node)) close();
  });

  /** "Search the web": one new tab with the words; back in the room the box waits for the link. */
  function web(words: string): void {
    const opened = window.open(webSearchUrl(words), '_blank', 'noopener');
    note('web', words, opened === null ? 'opened (no handle)' : 'opened');
    input.value = '';
    awayForWeb = true;
  }
  const back = () => {
    if (document.hidden) return;
    if (awayForTikTok) {
      awayForTikTok = false;
      showPaste(true);
      paste.focus();
      return;
    }
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
    paste.textContent = `📋 ${t('sources.paste')}`;
    if (!pop.hidden) draw();
  });

  debugHooks.register('sources', () => ({
    commands: [
      {
        id: 'sources.state',
        tab: 'status',
        title: { en: 'Search sources: the chosen one and the last search', tr: 'Arama kaynakları: seçili olan ve son arama' },
        help: {
          en: 'Writes the ⠿ source (YouTube, Vimeo or the web), whether Vimeo search is on at the server and the last search into the log.',
          tr: '⠿ kaynağını (YouTube, Vimeo ya da web), Vimeo aramasının sunucuda açık olup olmadığını ve son aramayı kayda yazar.',
        },
        run: async () => JSON.stringify({ source, vimeoOn: await checkVimeo(), last, pasteShown: !paste.hidden }),
      },
    ],
  }));

  return {
    get source(): Source {
      return source;
    },
    web,
    note,
    /** The Vimeo search said "off": the tile shows "not available yet" from now on. */
    vimeoOff(): void {
      vimeoOn = false;
    },
    close,
    relabel: label,
  };
}
