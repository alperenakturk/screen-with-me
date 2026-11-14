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
 */
export type Source = 'youtube' | 'vimeo' | 'web';
const SOURCES: readonly Source[] = ['youtube', 'vimeo', 'web'];
const KEY = 'searchSource';
/** One general search engine (no tracking tied to the person; no site filters). */
const WEB_SEARCH = 'https://duckduckgo.com/';

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
  let last: { source: Source; words: string; result: string } | null = null;
  /** Set when "Search the web" opened a tab: the next time the room is shown again, the paste hint. */
  let awayForWeb = false;

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
    );
  }

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
    if (!awayForWeb || document.hidden) return;
    awayForWeb = false;
    input.focus();
    flashHint(input, t('sources.pasteHint'), 4500);
  };
  document.addEventListener('visibilitychange', back);
  addEventListener('focus', back);

  function note(value: Source, words: string, result: string): void {
    last = { source: value, words, result };
  }

  label();
  // A language change re-applies the box's default placeholder: put this source's back.
  addEventListener('langchange', () => {
    label();
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
        run: async () => JSON.stringify({ source, vimeoOn: await checkVimeo(), last }),
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
