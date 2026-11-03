// The games gallery (card GG, owner's pick B "two tabs" on https://claude.ai/artifact/XsUvwg9YL6KugDVP6VggMR): what
// 🎮 opens. "👥 Together" = the room's tables and a cover card per room game (a card opens a new table); "🍿 On the side"
// = the solo games with their cover, a line and my progress. Its own chunk with the covers (the Design session's art,
// `docs/internal/design/side-games/covers/`) and its own texts: loaded the first time 🎮 opens, never with the room page.
// `stage.ts` owns the state (tables, my table, the solo game) and passes it in; this file only draws.

import xox from './art/covers/xox.svg?raw';
import four from './art/covers/four.svg?raw';
import draw from './art/covers/draw.svg?raw';
import quiz from './art/covers/quiz.svg?raw';
import snack from './art/covers/snack-bar.svg?raw';
import garden from './art/covers/garden.svg?raw';
import word from './art/covers/word.svg?raw';
import poker from './art/covers/poker.svg?raw';
import { GAME_CATALOG, type SoloKind } from '@swm/shared/games/catalog';
import { formatCoins } from '@swm/shared/games/snack-bar';
import { MAX_TABLES, ROOM_GAME_KINDS, type Member, type RoomGame, type RoomGameKind } from '@swm/shared/protocol';
import type { GameNews } from '@swm/shared/games/catalog';
import { el } from '../dom.ts';
import { lang, t } from '../i18n.ts';
import { load } from '../storage.ts';
import { icon } from '../ui/icons.ts';

const COVERS: Record<string, string> = { xox, four, draw, quiz, poker, snack, garden, word };

/** The gallery's own words (English first, Turkish second). */
const TEXT = {
  en: {
    'hub.tab.together': 'Together',
    'hub.tab.side': 'On the side',
    'hub.sideNote': 'Just you · the film keeps going · saved in this browser',
    'hub.soon': 'SOON',
    'games.snack.short': 'Run the room’s snack bar while the film plays.',
    'games.garden.title': 'Window Garden',
    'games.garden.short': 'Plants grow over watched minutes. Water now and then.',
    'games.garden.text': 'A little garden on the window sill: plants grow only while the film plays, seeds come when a film ends or after a long evening with friends, every plant goes into your album.',
    'games.word.title': 'Five Frames',
    'games.word.short': 'One word a day, the same for everyone. 7 tries.',
    'games.word.text': 'Find the five-letter word of the day in 7 tries; English or Turkish, the same word for everyone.',
    'hub.playersExact': '{n} players',
  },
  tr: {
    'hub.tab.together': 'Birlikte',
    'hub.tab.side': 'Kenarda',
    'hub.sideNote': 'Sadece sen · film devam eder · kaydın bu tarayıcıda',
    'hub.soon': 'YAKINDA',
    'games.snack.short': 'Film oynarken odanın büfesini işlet.',
    'games.garden.title': 'Pencere Bahçesi',
    'games.garden.short': 'Bitkiler izlenen dakikalarla büyür. Arada bir sula.',
    'games.garden.text': 'Pencere önünde küçük bir bahçe: bitkiler sadece film oynarken büyür, film bitince ya da arkadaşlarla uzun bir akşamdan sonra tohum gelir, her bitki albümüne girer.',
    'games.word.title': 'Beş Kare',
    'games.word.short': 'Her gün bir kelime, herkese aynı. 7 hak.',
    'games.word.text': 'Günün beş harfli kelimesini 7 denemede bul; Türkçe ya da İngilizce, herkese aynı kelime.',
    'hub.playersExact': '{n} kişi',
  },
} as const;
type TextKey = keyof (typeof TEXT)['en'];
function g(key: TextKey, values: Record<string, string | number> = {}): string {
  const table: Record<string, string> = lang() === 'tr' ? TEXT.tr : TEXT.en;
  return (table[key] ?? TEXT.en[key]).replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ''));
}

let counter = 0;
/** A cover with its ids made unique (the same cover can be on the page twice). Our own static art, never user data. */
function cover(kind: string, fallback: () => Node): HTMLElement {
  const box = el('span', { class: 'hub-cover', 'aria-hidden': 'true' });
  const raw = COVERS[kind];
  if (!raw) {
    box.append(fallback());
    return box;
  }
  const prefix = `cv${++counter}-`;
  box.innerHTML = raw
    .replace(/id="([^"]+)"/g, `id="${prefix}$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${prefix}$1)`)
    .replace(/href="#([^"]+)"/g, `href="#${prefix}$1"`)
    .replace('<svg ', '<svg preserveAspectRatio="xMidYMid slice" ');
  return box;
}

type SideKind = 'snack' | 'garden' | 'word';
/** Solo games in the gallery: the ones built so far open, the others are announced. */
const SIDE_GAMES: readonly { kind: SideKind; solo: SoloKind | null }[] = [
  { kind: 'snack', solo: 'snack' },
  { kind: 'garden', solo: null },
  { kind: 'word', solo: null },
];
const sideTitle = (kind: SideKind) => (kind === 'snack' ? t('games.snack.title') : g(`games.${kind}.title`));
const sideText = (kind: SideKind) => (kind === 'snack' ? t('games.snack.text') : g(`games.${kind}.text`));

/** A one-line "how far am I" for a solo game, from its save in this browser. */
function progressOf(kind: SideKind): string | null {
  if (kind !== 'snack') return null;
  try {
    const saved = JSON.parse(load('snackBar') || 'null') as { coins?: unknown; cinemas?: unknown } | null;
    if (!saved || typeof saved.coins !== 'number') return null;
    return `🪙 ${formatCoins(saved.coins)}${typeof saved.cinemas === 'number' && saved.cinemas > 0 ? ` · 🎬 ${saved.cinemas + 1}` : ''}`;
  } catch {
    return null;
  }
}

export interface GalleryState {
  tab: 'together' | 'side';
  setTab: (tab: 'together' | 'side') => void;
  news: readonly GameNews[];
  tables: readonly RoomGame[];
  /** My table's id, and the solo game I have open. */
  currentId: string | null;
  solo: SoloKind | null;
  peopleAt: (id: string) => Member[];
  canClose: (table: RoomGame) => boolean;
  titleOf: (kind: RoomGameKind) => string;
  soloIcon: (kind: SoloKind) => HTMLElement;
  /** Passed in (not imported) so this chunk shares no module with the room page's own split. */
  gameIcon: (kind: RoomGameKind) => SVGSVGElement;
  avatarNode: (avatar: Member['avatar'], cls: string) => HTMLElement;
  redraw: () => void;
  join: (table: RoomGame) => void;
  close: (id: string) => void;
  openTable: (kind: RoomGameKind) => void;
  openSolo: (kind: SoloKind) => void;
}

/** The gallery's parts, for `#game-menu`. */
export function renderGallery(s: GalleryState): HTMLElement[] {
  const { news, tables } = s;
  const tabButton = (id: 'together' | 'side', glyph: string, count: number) => {
    const b = el('button', { type: 'button', role: 'tab', class: `hub-tab${s.tab === id ? ' on' : ''}`, 'data-tab': id, 'aria-selected': String(s.tab === id) }, `${glyph} ${g(`hub.tab.${id}`)} `, el('i', {}, String(count)));
    b.addEventListener('click', () => s.setTab(id));
    return b;
  };
  const parts: HTMLElement[] = [
    el('div', { class: 'hub-head' }, icon('gamepad'), el('b', {}, t('hub.title')), el('span', { class: 'hub-count' }, t('hub.count', { n: tables.length, max: MAX_TABLES }))),
    el('div', { class: 'hub-tabs', role: 'tablist' }, tabButton('together', '👥', ROOM_GAME_KINDS.length), tabButton('side', '🍿', SIDE_GAMES.length)),
  ];
    // ---- Together: the room's tables, then a card per game (a card opens a new table) ----
    const together = el('div', { class: 'hub-panel', role: 'tabpanel', 'data-panel': 'together' });
    together.hidden = s.tab !== 'together';
    if (news.length) {
      // The newest note in two lines (the gallery never scrolls); all of them in its tooltip.
      const text = (n: (typeof news)[number]) => (lang() === 'en' ? n.en : n.tr);
      const note = el('p', { class: 'hub-news hub-news-line', role: 'note' }, el('span', {}, el('b', {}, `✨ ${t('hub.news')}: `), text(news[0]!)));
      note.title = news.map(text).join('\n\n');
      together.append(note);
    }
    if (tables.length) {
      together.append(
        el('p', { class: 'hub-label' }, t('hub.tables')),
        el(
          'ul',
          { class: 'hub-tables' },
          ...tables.map((table) => {
            const people = s.peopleAt(table.id);
            const mine = s.currentId === table.id;
            const go = el('button', { type: 'button', class: `btn small-btn ${mine ? '' : 'primary'}` }, t(mine ? 'hub.show' : 'hub.join'));
            go.addEventListener('click', () => s.join(table));
            const row = el(
              'li',
              { class: `hub-table${mine ? ' mine' : ''}` },
              el('span', { class: 'hub-icon' }, s.gameIcon(table.kind)),
              el(
                'span',
                { class: 'hub-table-text' },
                el('b', {}, s.titleOf(table.kind)),
                el('small', {}, people.length ? people.map((p) => p.name).join(', ') : t('hub.empty', { name: table.by.name })),
              ),
              el('span', { class: 'hub-faces', 'aria-hidden': 'true' }, ...people.slice(0, 4).map((p) => s.avatarNode(p.avatar, 'hub-face'))),
              go,
            );
            if (s.canClose(table)) {
              const close = el('button', { type: 'button', class: 'hub-close', title: t('hub.close'), 'aria-label': t('hub.close') }, '✕');
              close.addEventListener('click', () => s.close(table.id));
              row.append(close);
            }
            return row;
          }),
        ),
      );
    }
    const full = tables.length >= MAX_TABLES;
    together.append(
      el('p', { class: 'hub-label' }, full ? t('hub.full') : t('hub.new')),
      el(
        'div',
        { class: `hub-games hub-cards${tables.length || news.length ? ' compact' : ''}` },
        ...ROOM_GAME_KINDS.map((kind) => {
          const info = GAME_CATALOG[kind];
          const badge = news.find((n) => n.kinds.includes(kind));
          const item = el(
            'button',
            { type: 'button', role: 'menuitem', class: 'hub-game hub-card', 'data-kind': kind },
            cover(kind, () => el('span', { class: 'hub-cover-icon' }, s.gameIcon(kind))),
            el(
              'span',
              { class: 'hub-game-text' },
              el('b', {}, s.titleOf(kind), badge ? el('span', { class: `hub-badge ${badge.badge}` }, t(`hub.badge.${badge.badge}`)) : null),
              el('small', {}, info.min === info.max ? g('hub.playersExact', { n: info.min }) : t('hub.players', { min: info.min, max: info.max })),
            ),
          );
          item.title = t(`games.${kind}.text`);
          item.disabled = full;
          item.addEventListener('click', () => s.openTable(kind));
          return item;
        }),
      ),
    );

    // ---- On the side: just me, the film keeps going; each game with its cover, a line and my progress ----
    const side = el('div', { class: 'hub-panel', role: 'tabpanel', 'data-panel': 'side' });
    side.hidden = s.tab !== 'side';
    side.append(
      el('p', { class: 'hub-label' }, g('hub.sideNote')),
      el(
        'div',
        { class: 'hub-sides' },
        ...SIDE_GAMES.map(({ kind, solo: soloKind }) => {
          const progress = soloKind ? progressOf(kind) : null;
          const item = el(
            'button',
            { type: 'button', role: 'menuitem', class: `hub-side${soloKind && s.solo === soloKind ? ' mine' : ''}`, ...(soloKind ? { 'data-solo': soloKind } : {}) },
            cover(kind, () => el('span', { class: 'hub-cover-icon' }, soloKind ? s.soloIcon(soloKind) : '✨')),
            el(
              'span',
              { class: 'hub-side-text' },
              el('b', {}, sideTitle(kind), soloKind ? null : el('span', { class: 'hub-badge soon' }, g('hub.soon'))),
              el('small', {}, g(`games.${kind}.short`)),
              progress ? el('span', { class: 'hub-progress' }, progress) : null,
            ),
          );
          item.title = sideText(kind);
          item.disabled = !soloKind;
          if (soloKind) item.addEventListener('click', () => s.openSolo(soloKind));
          return item;
        }),
      ),
    );
    parts.push(together, side);
  return parts;
}
