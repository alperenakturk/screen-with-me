// Card SRC2: "What are we watching?", the big source picker (option A, "Marquee grid"; design/source-picker.md), and
// its styles, loaded the first time ⠿ opens (the room page's JS and CSS budgets). Card SR2: the ♪ TikTok door and its
// "📋 Paste and play" come with it.
import './sources.css';
import { el } from '../dom.ts';
import { lang, t } from '../i18n.ts';
import { flashHint } from './hint.ts';
import type { Placement, Source, SourceActions } from './sources.ts';

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

type Chip = 'all' | 'videos' | 'shorts' | 'music' | 'link';
const CHIPS: readonly Chip[] = ['all', 'videos', 'shorts', 'music', 'link'];
type TileId = 'youtube' | 'shorts' | 'videos' | 'tiktok' | 'vimeo' | 'podcasts' | 'ytmusic' | 'dailymotion' | 'link' | 'web' | 'extension' | 'games';

/** The picker's own words (a lazy chunk keeps its texts, `check-game-text.mjs`). */
const TEXT = {
  en: {
    title: 'What are we watching?',
    close: 'Close',
    chips: 'Show',
    'chip.all': 'All',
    'chip.videos': 'Videos',
    'chip.shorts': 'Shorts',
    'chip.music': 'Music',
    'chip.link': 'From a link',
    coming: 'Coming',
    current: 'In use',
    'youtube.name': 'YouTube',
    'youtube.line': 'Search videos',
    'shorts.name': 'Shorts feed',
    'shorts.line': 'Endless Shorts',
    'videos.name': 'Video feed',
    'videos.line': 'Popular, back to back',
    'tiktok.name': 'TikTok',
    'tiktok.line': 'Find one, paste its link',
    'vimeo.name': 'Vimeo',
    'vimeo.line': 'Search Vimeo',
    'vimeo.off': 'Not available yet',
    'podcasts.name': 'Podcasts',
    'podcasts.line': 'Shows and episodes',
    'ytmusic.name': 'YouTube Music',
    'ytmusic.line': 'Playlists and albums',
    'ytmusic.hint': 'Paste a YouTube Music playlist, album or song link here.',
    'dailymotion.name': 'Dailymotion',
    'dailymotion.line': 'Links',
    'dailymotion.note': 'Dailymotion is coming soon.',
    'link.name': 'Paste a link',
    'link.line': 'A video link or file address',
    'link.hint': 'Paste the video’s link here.',
    'web.name': 'Search the web',
    'web.line': 'Find a video, bring its link',
    'extension.name': 'Any film page',
    'extension.line': 'With the extension',
    'games.name': 'Games',
    'games.line': 'Opens the games hall',
    'subs.name': 'Subscription services',
    'subs.line': 'Everyone with their own subscription, through the extension',
    'subs.note': 'Subscription services are coming: everyone watches with their own subscription, through the extension.',
    'source.hint': 'Type here: the search uses {name}.',
  },
  tr: {
    title: 'Ne izliyoruz?',
    close: 'Kapat',
    chips: 'Göster',
    'chip.all': 'Hepsi',
    'chip.videos': 'Videolar',
    'chip.shorts': 'Shorts',
    'chip.music': 'Müzik',
    'chip.link': 'Linkten',
    coming: 'Yakında',
    current: 'Kullanılıyor',
    'youtube.name': 'YouTube',
    'youtube.line': 'Video ara',
    'shorts.name': 'Shorts akışı',
    'shorts.line': 'Bitmeyen Shorts',
    'videos.name': 'Video akışı',
    'videos.line': 'Popüler, art arda',
    'tiktok.name': 'TikTok',
    'tiktok.line': 'Bul, linkini yapıştır',
    'vimeo.name': 'Vimeo',
    'vimeo.line': 'Vimeo’da ara',
    'vimeo.off': 'Henüz kullanılamıyor',
    'podcasts.name': 'Podcastler',
    'podcasts.line': 'Programlar ve bölümler',
    'ytmusic.name': 'YouTube Music',
    'ytmusic.line': 'Çalma listeleri ve albümler',
    'ytmusic.hint': 'Bir YouTube Music çalma listesi, albüm ya da şarkı linkini buraya yapıştır.',
    'dailymotion.name': 'Dailymotion',
    'dailymotion.line': 'Linkler',
    'dailymotion.note': 'Dailymotion yakında geliyor.',
    'link.name': 'Link yapıştır',
    'link.line': 'Video linki ya da dosya adresi',
    'link.hint': 'Videonun linkini buraya yapıştır.',
    'web.name': 'Web’de ara',
    'web.line': 'Bir video bul, linkini getir',
    'extension.name': 'Herhangi bir film sayfası',
    'extension.line': 'Eklentiyle',
    'games.name': 'Oyunlar',
    'games.line': 'Oyun salonunu açar',
    'subs.name': 'Abonelik hizmetleri',
    'subs.line': 'Herkes kendi aboneliğiyle, eklenti üzerinden',
    'subs.note': 'Abonelik hizmetleri geliyor: herkes kendi aboneliğiyle, eklenti üzerinden izler.',
    'source.hint': 'Buraya yaz: arama {name} ile yapılır.',
  },
};
type Key = keyof typeof TEXT.en;
const tx = (key: Key, name = ''): string => TEXT[lang() === 'tr' ? 'tr' : 'en'][key].replace('{name}', name);

interface TileDef {
  id: TileId;
  /** Our own glyph in the round badge (never a brand mark). */
  glyph: string;
  chip: Exclude<Chip, 'all'> | null;
  /** A source tile sets where the box searches; the rest are actions; `coming` explains instead of acting. */
  kind: 'source' | 'action' | 'coming';
}
const TILES: readonly TileDef[] = [
  { id: 'youtube', glyph: '⌕', chip: 'videos', kind: 'source' },
  { id: 'shorts', glyph: '♾', chip: 'shorts', kind: 'action' },
  { id: 'videos', glyph: '▶', chip: 'videos', kind: 'action' },
  { id: 'tiktok', glyph: '♪', chip: 'shorts', kind: 'action' },
  { id: 'vimeo', glyph: '🎞', chip: 'videos', kind: 'source' },
  { id: 'podcasts', glyph: '🎙', chip: 'music', kind: 'source' },
  // Card CR2 is live: a playlist or album link fills the queue, so the tile points at the box.
  { id: 'ytmusic', glyph: '♫', chip: 'music', kind: 'action' },
  { id: 'dailymotion', glyph: '▷', chip: 'videos', kind: 'coming' },
  { id: 'link', glyph: '🔗', chip: 'link', kind: 'action' },
  { id: 'web', glyph: '🌐', chip: 'link', kind: 'source' },
  { id: 'extension', glyph: '🧩', chip: 'link', kind: 'action' },
  { id: 'games', glyph: '🎮', chip: null, kind: 'action' },
];
const SOURCE_OF: Partial<Record<TileId, Source>> = { youtube: 'youtube', vimeo: 'vimeo', podcasts: 'podcasts', web: 'web' };

export interface PickerDeps {
  form: HTMLFormElement;
  input: HTMLInputElement;
  button: HTMLButtonElement;
  source: () => Source;
  vimeoOn: () => boolean | null;
  choose: (value: Source) => void;
  note: (source: 'tiktok', words: string, result: string) => void;
  actions: SourceActions;
  shown: (on: boolean) => void;
}

export interface Picker {
  open(placement: Placement, opener: HTMLElement): void;
  close(focus?: boolean): void;
  isOpen(): boolean;
  redraw(): void;
  /** Back in the room: true when the TikTok door took over (it shows "📋 Paste and play"). */
  back(): boolean;
  pasteShown(): boolean;
  relabel(): void;
  state(): Record<string, unknown>;
}

export function createPicker(deps: PickerDeps): Picker {
  const { form, input, button, note, actions } = deps;
  let chip: Chip = 'all';
  let placement: Placement = 'video';
  let opener: HTMLElement = button;
  let lastAction = '';

  const title = el('h2', { class: 'srcp-title', id: 'srcp-title' });
  const head = el('div', { class: 'srcp-head' }, el('span', { class: 'theme-mascot srcp-mascot', 'aria-hidden': 'true' }), title);
  const chipRow = el('div', { class: 'srcp-chips', role: 'group' });
  const grid = el('div', { class: 'srcp-grid', role: 'list' });
  const status = el('p', { class: 'srcp-note', role: 'status' });
  // Card UI4: planned services are one row, with no service named (a name shows only once it really works).
  const subs = el('button', { type: 'button', class: 'srcp-subs', 'data-source': 'subs' });
  subs.addEventListener('click', () => {
    lastAction = 'subs';
    status.textContent = tx('subs.note');
  });
  const closeX = el('button', { type: 'button', class: 'icon-btn srcp-close', id: 'srcp-close' }, '✕');
  const pop = el('div', { class: 'srcp', id: 'sources-pop', role: 'dialog', 'aria-labelledby': 'srcp-title', hidden: '' }, head, chipRow, grid, subs, status, closeX);
  closeX.addEventListener('click', () => close(true));

  // ---- Card SR2: ♪ TikTok is not a source (no search API): a door to TikTok, then "📋 Paste and play". ----
  let away = false;
  let timer = 0;
  const paste = el('button', { type: 'button', class: 'btn primary sources-paste', id: 'sources-paste', hidden: '' }, `📋 ${t('sources.paste')}`);
  form.after(paste);
  function showPaste(on: boolean): void {
    paste.hidden = !on;
    clearTimeout(timer);
    if (on) timer = window.setTimeout(() => showPaste(false), PASTE_MS);
  }
  paste.addEventListener('click', async () => {
    let text = '';
    try {
      text = (await navigator.clipboard.readText()).trim();
    } catch {
      /* no clipboard access (refused, or an old browser): the box takes a normal paste */
    }
    showPaste(false);
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
  form.addEventListener('submit', () => showPaste(false));
  function goTikTok(): void {
    // A link already in the box is not a search: TikTok's home page.
    const query = /^\s*https?:/i.test(input.value) ? '' : input.value.trim();
    const opened = window.open(tiktokUrl(query), '_blank', 'noopener');
    note('tiktok', query, opened === null ? 'opened (no handle)' : 'opened');
    close();
    if (query) input.value = '';
    away = true;
    flashHint(button, t('sources.tiktokHint'), 4500);
  }

  /** Closes, then points at the box with a hint (it keeps the words). */
  function toBox(hint: string): void {
    close();
    input.focus();
    flashHint(input, hint, 4500);
  }

  function act(tile: TileDef): void {
    lastAction = tile.id;
    const source = SOURCE_OF[tile.id];
    if (source) {
      deps.choose(source);
      toBox(tx('source.hint', tx(`${tile.id}.name` as Key)));
      return;
    }
    switch (tile.id) {
      case 'shorts':
      case 'videos':
        close();
        actions.feed(tile.id);
        break;
      case 'tiktok':
        goTikTok();
        break;
      case 'ytmusic':
        toBox(tx('ytmusic.hint'));
        break;
      case 'dailymotion':
        status.textContent = tx('dailymotion.note');
        break;
      case 'link':
        toBox(tx('link.hint'));
        break;
      case 'extension':
        close();
        window.open('/extension.html', '_blank', 'noopener');
        break;
      case 'games':
        close();
        actions.games();
        break;
    }
  }

  function shownTiles(): TileDef[] {
    return TILES.filter((tile) => chip === 'all' || tile.chip === chip);
  }

  function draw(): void {
    // A redraw (Vimeo's answer, a language change) keeps the focus on the same tile or chip.
    const had = pop.contains(document.activeElement) ? (document.activeElement as HTMLElement) : null;
    const again = had?.dataset.source ? `[data-source="${had.dataset.source}"]` : had?.dataset.chip ? `[data-chip="${had.dataset.chip}"]` : '';
    title.textContent = tx('title');
    closeX.title = tx('close');
    closeX.setAttribute('aria-label', tx('close'));
    chipRow.setAttribute('aria-label', tx('chips'));
    chipRow.replaceChildren(
      ...CHIPS.map((value) => {
        const b = el('button', { type: 'button', class: 'srcp-chip', 'data-chip': value, 'aria-pressed': String(value === chip) }, tx(`chip.${value}` as Key));
        b.addEventListener('click', () => {
          chip = value;
          status.textContent = '';
          draw();
        });
        return b;
      }),
    );
    const current = deps.source();
    grid.replaceChildren(
      ...shownTiles().map((tile) => {
        const name = tx(`${tile.id}.name` as Key);
        const off = tile.id === 'vimeo' && deps.vimeoOn() === false;
        const line = off ? tx('vimeo.off') : tx(`${tile.id}.line` as Key);
        const on = SOURCE_OF[tile.id] === current;
        const b = el(
          'button',
          {
            type: 'button',
            class: `sources-tile srcp-${tile.kind}`,
            'data-source': tile.id,
            'aria-label': [name, line, tile.kind === 'coming' ? tx('coming') : '', on ? tx('current') : ''].filter(Boolean).join(', '),
          },
          el('span', { class: 'srcp-badge', 'aria-hidden': 'true', ...(tile.glyph === '⌕' ? { 'data-glyph': 'lens' } : {}) }, tile.glyph),
          el('span', { class: 'srcp-name' }, name),
          // A Coming tile shows the word where the line goes (same height as the others).
          tile.kind === 'coming' ? el('span', { class: 'srcp-soon', 'aria-hidden': 'true' }, tx('coming')) : el('span', { class: 'srcp-line' }, line),
        );
        if (tile.kind === 'source') b.setAttribute('aria-pressed', String(on));
        if (on) b.append(el('span', { class: 'srcp-check', 'aria-hidden': 'true' }, '✓'));
        if (off) b.classList.add('off');
        b.addEventListener('click', () => act(tile));
        return el('div', { role: 'listitem', class: 'srcp-cell' }, b);
      }),
    );
    subs.replaceChildren(
      el('span', { class: 'srcp-subs-glyph', 'aria-hidden': 'true' }, '🎬'),
      el('span', { class: 'srcp-name' }, tx('subs.name')),
      el('span', { class: 'srcp-soon', 'aria-hidden': 'true' }, tx('coming')),
      el('span', { class: 'srcp-line' }, tx('subs.line')),
    );
    subs.setAttribute('aria-label', [tx('subs.name'), tx('coming'), tx('subs.line')].join(', '));
    pop.dataset.chip = chip;
    if (again) pop.querySelector<HTMLElement>(again)?.focus();
  }

  /** The room's element the picker covers for this placement. */
  function host(where: Placement): HTMLElement {
    if (where === 'sheet') return document.body;
    if (where === 'side') return document.querySelector<HTMLElement>('.room > .side') ?? document.body;
    return document.getElementById('theater') ?? document.body;
  }
  function place(): void {
    document.querySelector('.srcp-host')?.classList.remove('srcp-host');
    const target = host(placement);
    if (target !== document.body) target.classList.add('srcp-host');
    target.append(pop);
    pop.dataset.place = placement;
    // A sheet stands on the phone's tab bar (or the screen's bottom).
    const bar = document.querySelector('.ph-tabs')?.getBoundingClientRect();
    pop.style.bottom = placement === 'sheet' && bar && bar.height > 0 && bar.top > innerHeight / 2 ? `${Math.round(innerHeight - bar.top)}px` : '';
  }

  function open(where: Placement, from: HTMLElement): void {
    placement = where;
    opener = from;
    chip = 'all';
    status.textContent = '';
    draw();
    place();
    pop.hidden = false;
    deps.shown(true);
    (grid.querySelector<HTMLButtonElement>('[aria-pressed="true"]') ?? grid.querySelector<HTMLButtonElement>('button'))?.focus();
  }
  function close(focus = false): void {
    if (pop.hidden) return;
    pop.hidden = true;
    document.querySelector('.srcp-host')?.classList.remove('srcp-host');
    deps.shown(false);
    if (focus && opener.isConnected) opener.focus();
  }

  pop.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close(true);
      return;
    }
    const tiles = [...grid.querySelectorAll<HTMLButtonElement>('.sources-tile')];
    const index = tiles.indexOf(document.activeElement as HTMLButtonElement);
    const steps: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 0, ArrowUp: 0 };
    if (index < 0 || !(event.key in steps)) return;
    event.preventDefault();
    // 2-D: the columns are what the grid shows now.
    const cols = Math.max(1, getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length);
    const step = event.key === 'ArrowDown' ? cols : event.key === 'ArrowUp' ? -cols : steps[event.key]!;
    const next = index + step;
    if (next >= 0 && next < tiles.length) tiles[next]!.focus();
    else if (steps[event.key]) tiles[(next + tiles.length) % tiles.length]!.focus();
  });
  document.addEventListener('pointerdown', (event) => {
    if (!pop.hidden && !pop.contains(event.target as Node) && !button.contains(event.target as Node) && !(event.target as Element).closest?.('#empty-sources, #empty-search')) close();
  });

  return {
    open,
    close,
    isOpen: () => !pop.hidden,
    redraw: () => !pop.hidden && draw(),
    back() {
      if (!away) return false;
      away = false;
      showPaste(true);
      paste.focus();
      return true;
    },
    pasteShown: () => !paste.hidden,
    relabel() {
      paste.textContent = `📋 ${t('sources.paste')}`;
      if (!pop.hidden) draw();
    },
    state() {
      const r = pop.getBoundingClientRect();
      const tiles = [...grid.querySelectorAll<HTMLElement>('.sources-tile')];
      const small = tiles.reduce((min, b) => Math.min(min, b.getBoundingClientRect().height), Infinity);
      return {
        open: !pop.hidden,
        placement,
        chip,
        tiles: tiles.map((b) => b.dataset.source),
        cols: getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length,
        smallestTile: Number.isFinite(small) ? Math.round(small) : 0,
        box: `${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}×${Math.round(r.height)}`,
        onScreen: r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1,
        scrolls: pop.scrollHeight > pop.clientHeight + 1 || grid.scrollHeight > grid.clientHeight + 1,
        lastAction,
        note: status.textContent,
        // Card UI4: the block (title to the last row) sits in the middle of its place, not at the top.
        balance: (() => {
          const top = head.getBoundingClientRect().top - r.top;
          const bottom = r.bottom - Math.max(subs.getBoundingClientRect().bottom, status.getBoundingClientRect().bottom);
          return { top: Math.round(top), bottom: Math.round(bottom) };
        })(),
        subs: subs.textContent,
      };
    },
  };
}
