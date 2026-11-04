// 🍿 Snack Bar, the solo side game (CARDS.md "Snack Bar"; look: the owner's pick A "counter scene", art in
// `./art/snack-bar/` from `docs/internal/design/side-games/snack-bar/`). The rules are `@swm/shared/games/snack-bar`;
// this file draws them and ticks them once a second with the room's state (`room()`). A lazy chunk with its own
// stylesheet, loaded only when the game opens. It never takes the room's keys or the focus: its buttons don't keep
// the focus after a click (so 1–8, Enter, P, V still reach the room), and it has no key handlers of its own.

import './snack-bar.css';
import {
  MILESTONES, SNACK_KEY, STANDS, STAR_BONUS, PRESTIGE_MIN, affordable, buy, costOf, formatCoins, incomeRate,
  loadSnack, milestoneFactor, newCinema, nextMilestone, saveSnack, serve, standRate, starsFor, starFactor, tick,
  togetherFactor, unlocked, type SnackContext, type SnackSave, type StandId,
} from '@swm/shared/games/snack-bar';
import { el } from '../dom.ts';
import { lang } from '../i18n.ts';
import { playSound } from '../sound.ts';
import { load, save } from '../storage.ts';
import { confirmDialog } from '../ui/confirm.ts';
import scene from './art/snack-bar/counter-scene.svg?raw';
import coin from './art/snack-bar/coin.svg?raw';
import popcorn from './art/snack-bar/popcorn-machine.svg?raw';
import soda from './art/snack-bar/soda.svg?raw';
import nachos from './art/snack-bar/nachos.svg?raw';
import candy from './art/snack-bar/candy.svg?raw';
import second from './art/snack-bar/second-counter.svg?raw';
import how1 from './art/tutorial/snack-1-earn.svg?raw';
import how2 from './art/tutorial/snack-2-tap.svg?raw';
import how3 from './art/tutorial/snack-3-stands.svg?raw';
import how4 from './art/tutorial/snack-4-friends.svg?raw';
import { howToPlay } from './how-to-play.ts';

/** Snack Bar's own words (in its chunk, not the room page's): English first, Turkish second. */
const TEXT = {
  en: {
    how1Title: 'Earn while the room watches',
    how1: "Your snack bar makes coins only in a room while its video plays. Nothing changes while you're away.",
    how2Title: 'Tap to serve',
    how2: 'Tap the counter for an extra coin.',
    how3Title: 'Buy and level up stands',
    how3: 'Levels 10, 25, 50, 100 and 200 double a stand.',
    how4Title: 'Friends make it faster',
    how4: '+10% for each person in the room, +5% for each one in voice with you.',
    'coinsTitle': 'Your coins',
    'rate': '+{n}/s',
    'playing': '▶ Film on',
    'paused': '⏸ Paused',
    'closed': 'Customers come while the film plays',
    'together': '👥 +{n} %',
    'togetherTitle': 'Together bonus: +10 % for each other person in the room, +5 % more for each one in voice with you',
    'serve': 'Serve a customer',
    'stand.popcorn': 'Popcorn machine',
    'stand.soda': 'Soda fountain',
    'stand.nachos': 'Nachos',
    'stand.candy': 'Candy jar',
    'stand.second-counter': 'Second counter',
    'level': 'Lv {n} · +{rate}/s',
    'new': 'New · +{rate}/s',
    'locked': '🔒 Opens with the {name}',
    'buy': 'Buy for {price}',
    'milestone': 'Lv {n}: income ×2',
    'more': '+{n} more when the window is bigger',
    'cinema': 'Cinema #{n} · ★ {stars}',
    'newCinema': '🎬 Open a new cinema',
    'newCinemaStars': '🎬 New cinema · +{stars} ★',
    'newCinemaWhen': 'Earn {min} in this cinema to open a new one',
    'newCinemaAsk': 'Your coins and stands start over; you get {stars} ★, each one +{bonus} % income for good.',
    'newCinemaYes': 'Open the new cinema',
    'newCinemaDone': 'Cinema #{n} is open · ★ {stars} in all',
    rest: '⏸ Closed until the film plays',
    restLine: "Nothing changes while you're away",
    'otherTab': 'Snack Bar is open in another tab.',
    'playHere': 'Play here',
  },
  tr: {
    how1Title: 'Oda izlerken kazan',
    how1: 'Büfen yalnızca bir odadayken, odanın videosu oynarken kazanır. Sen yokken hiçbir şey değişmez.',
    how2Title: 'Dokun, servis yap',
    how2: 'Fazladan bir jeton için tezgâha dokun.',
    how3Title: 'Stant al, seviye atlat',
    how3: '10, 25, 50, 100 ve 200. seviyeler standı iki katına çıkarır.',
    how4Title: 'Arkadaşlar hızlandırır',
    how4: 'Odadaki her kişi %10, seste seninle olan her kişi %5 ekler.',
    'coinsTitle': 'Paran',
    'rate': '+{n}/sn',
    'playing': '▶ Film açık',
    'paused': '⏸ Durdu',
    'closed': 'Müşteriler film oynarken gelir',
    'together': '👥 +%{n}',
    'togetherTitle': 'Birlikte bonusu: odadaki her kişi +%10, seste olanlar +%5 daha',
    'serve': 'Müşteriye servis yap',
    'stand.popcorn': 'Patlamış mısır makinesi',
    'stand.soda': 'Gazoz',
    'stand.nachos': 'Nachos',
    'stand.candy': 'Şeker kavanozu',
    'stand.second-counter': 'İkinci tezgâh',
    'level': 'Sv {n} · +{rate}/sn',
    'new': 'Yeni · +{rate}/sn',
    'locked': '🔒 {name} ile açılır',
    'buy': '{price} karşılığında al',
    'milestone': 'Sv {n}: gelir ×2',
    'more': 'Pencere büyüyünce +{n} tane daha',
    'cinema': '{n}. sinema · ★ {stars}',
    'newCinema': '🎬 Yeni sinema aç',
    'newCinemaStars': '🎬 Yeni sinema · +{stars} ★',
    'newCinemaWhen': 'Yeni sinema için bu sinemada {min} kazan',
    'newCinemaAsk': 'Paran ve tezgâhların sıfırlanır; {stars} ★ alırsın, her biri gelirine kalıcı +%{bonus} katar.',
    'newCinemaYes': 'Yeni sinemayı aç',
    'newCinemaDone': '{n}. sinema açıldı · toplam ★ {stars}',
    rest: '⏸ Film oynayınca açılır',
    restLine: 'Sen yokken hiçbir şey değişmez',
    'otherTab': 'Büfe başka bir sekmede açık.',
    'playHere': 'Burada oyna',
  },
} as const;
type TextKey = keyof (typeof TEXT)['en'];
/** A Snack Bar text in the page's language, with `{name}` filled in. */
function t(key: TextKey, values: Record<string, string | number> = {}): string {
  const table: Record<string, string> = lang() === 'tr' ? TEXT.tr : TEXT.en;
  return (table[key] ?? TEXT.en[key]).replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ''));
}

const ART: Record<StandId, string> = { popcorn, soda, nachos, candy, 'second-counter': second };
/** Scene groups shown once their stand has a level (the second counter has no group: a badge instead). */
const SCENE_GROUP: Partial<Record<StandId, string>> = { popcorn: 'popcorn-machine', soda: 'soda', nachos: 'nachos', candy: 'candy' };
/** Below this height (in the game's own pixels) only three upgrade rows show. */
const COMPACT_H = 470;
const ROWS_COMPACT = 3;
/** One tab plays at a time (two tabs would earn twice and overwrite each other's save). */
const LOCK_KEY = 'snackBar:tab';
const LOCK_FRESH_MS = 4000;
const SAVE_EVERY = 5;

let idCounter = 0;
/** Our own static SVG art (never user data), with its ids made unique so two copies on one page don't clash. */
function art(raw: string, cls: string): HTMLElement {
  const prefix = `sb${++idCounter}-`;
  const svg = raw.replace(/id="([^"]+)"/g, `id="${prefix}$1"`).replace(/url\(#([^)]+)\)/g, `url(#${prefix}$1)`).replace(/href="#([^"]+)"/g, `href="#${prefix}$1"`);
  const box = el('span', { class: cls, 'aria-hidden': 'true' });
  box.innerHTML = svg;
  box.dataset.prefix = prefix;
  return box;
}

const fmtRate = (rate: number) => formatCoins(rate < 10 ? Math.round(rate * 10) / 10 : rate);

export function mountSnackBar(root: HTMLElement, room: () => SnackContext): () => void {
  const tabId = Math.random().toString(36).slice(2);
  let game: SnackSave = loadSnack(load(SNACK_KEY));
  let stopped = false;
  let blocked = false;

  // ---- Header: coins, income, the room's state, the together bonus ----
  const coins = el('b', { class: 'sb-coins' });
  const rate = el('span', { class: 'sb-rate' });
  const state = el('span', { class: 'sb-pill sb-state' });
  const together = el('span', { class: 'sb-pill sb-together' });
  const head = el('div', { class: 'sb-head' }, art(coin, 'sb-coin'), coins, rate, el('span', { class: 'sb-gap' }), state, together);

  // ---- The scene: a tap serves a customer ----
  const sceneArt = art(scene.replace('<svg ', '<svg preserveAspectRatio="xMidYMid slice" '), 'sb-scene-art');
  const secondBadge = el('span', { class: 'sb-second', 'aria-hidden': 'true' }, '×2');
  const sceneButton = el('button', { type: 'button', class: 'sb-scene' }, sceneArt, secondBadge);
  const pops = el('div', { class: 'sb-pops', 'aria-hidden': 'true' });
  // While the room's film does not play the counter is closed, and says so on the scene (owner, 4 Nov 2026).
  const restTitle = el('b', {});
  const restLine = el('small', {});
  const rest = el('span', { class: 'sb-rest', 'aria-hidden': 'true' }, restTitle, restLine);
  const sceneBox = el('div', { class: 'sb-scene-box' }, sceneButton, rest, pops);
  const group = (name: string) => sceneArt.querySelector<SVGGElement>(`#${sceneArt.dataset.prefix}${name}`);

  // ---- Upgrade rows ----
  interface Row { id: StandId; node: HTMLElement; level: HTMLElement; bar: HTMLElement; price: HTMLButtonElement; name: HTMLElement }
  const rows: Row[] = STANDS.map((stand) => {
    const name = el('b', { class: 'sb-name' });
    const level = el('small', { class: 'sb-level' });
    const bar = el('span', { class: 'sb-bar-fill' });
    const price = el('button', { type: 'button', class: 'sb-price' });
    const node = el(
      'li',
      { class: 'sb-row', 'data-stand': stand.id },
      art(ART[stand.id], 'sb-icon'),
      el('span', { class: 'sb-row-text' }, name, level, el('span', { class: 'sb-bar' }, bar)),
      price,
    );
    price.addEventListener('click', () => {
      if (blocked || !buy(game, stand.id, 1)) return;
      const level = game.levels[stand.id];
      playSound(milestoneFactor(level) > milestoneFactor(level - 1) ? 'snackMilestone' : 'snackBuy');
      node.classList.remove('sb-bought');
      void node.offsetWidth;
      node.classList.add('sb-bought');
      persist();
      draw();
    });
    return { id: stand.id, node, level, bar, price, name };
  });
  const list = el('ul', { class: 'sb-rows' }, ...rows.map((r) => r.node));
  const more = el('p', { class: 'sb-more' });

  // ---- Footer: cinema and prestige ----
  const cinema = el('span', { class: 'sb-cinema' });
  const prestige = el('button', { type: 'button', class: 'sb-prestige' });
  const foot = el('div', { class: 'sb-foot' }, cinema, prestige);

  const note = el('p', { class: 'sb-note', role: 'status' });
  note.hidden = true;
  const elsewhere = el('div', { class: 'sb-elsewhere' }, el('p', {}), el('button', { type: 'button', class: 'btn small-btn primary' }));
  elsewhere.hidden = true;
  const box = el('div', { class: 'sb' }, head, sceneBox, list, more, foot, note, elsewhere);
  root.replaceChildren(box);
  const how = howToPlay(box, 'snackBar:howSeen', () => [
    { art: how1, title: t('how1Title'), line: t('how1') },
    { art: how2, title: t('how2Title'), line: t('how2') },
    { art: how3, title: t('how3Title'), line: t('how3') },
    { art: how4, title: t('how4Title'), line: t('how4') },
  ]);
  head.append(how.button);

  // Buttons never keep the focus: the room's keys and the message box stay as they were.
  box.addEventListener('mousedown', (event) => {
    if ((event.target as Element).closest('button')) event.preventDefault();
  });

  function flash(text: string, ms = 5000): void {
    note.textContent = text;
    note.hidden = false;
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => (note.hidden = true), ms);
  }
  let noteTimer: ReturnType<typeof setTimeout> | undefined;

  sceneButton.addEventListener('click', (event) => {
    if (blocked) return;
    const ctx = room();
    const got = serve(game, ctx);
    if (!got) {
      flash(t('closed'), 2500);
      return;
    }
    playSound('snackServe');
    const r = sceneBox.getBoundingClientRect();
    const scale = r.width / sceneBox.offsetWidth || 1;
    const pop = el('span', { class: 'sb-pop' }, `+${formatCoins(got)}`);
    pop.style.left = `${event.clientX ? (event.clientX - r.left) / scale : sceneBox.offsetWidth / 2}px`;
    pop.style.top = `${event.clientY ? (event.clientY - r.top) / scale : sceneBox.offsetHeight / 2}px`;
    pops.append(pop);
    setTimeout(() => pop.remove(), 900);
    draw();
  });

  prestige.addEventListener('click', async () => {
    const stars = starsFor(game);
    if (blocked || stars < 1) return;
    const yes = await confirmDialog({ icon: '🎬', title: t('newCinema'), text: t('newCinemaAsk', { stars, bonus: Math.round(STAR_BONUS * 100) }), yes: t('newCinemaYes') });
    if (!yes || stopped || !newCinema(game)) return;
    playSound('snackCinema');
    persist();
    draw();
    flash(t('newCinemaDone', { n: game.cinemas + 1, stars: game.stars }));
  });

  /** Which rows show in a small window: the newest stand I can buy and its neighbours (the next locked one too). */
  function shownRows(compact: boolean): Set<StandId> {
    if (!compact) return new Set(STANDS.map((s) => s.id));
    const firstLocked = STANDS.findIndex((s) => !unlocked(game, s.id));
    const end = firstLocked < 0 ? STANDS.length - 1 : firstLocked;
    const start = Math.max(0, end - (ROWS_COMPACT - 1));
    return new Set(STANDS.slice(start, start + ROWS_COMPACT).map((s) => s.id));
  }

  let compact = false;
  function draw(): void {
    const ctx = room();
    const income = incomeRate(game, ctx);
    const bonus = Math.round((togetherFactor(ctx) - 1) * 100);
    coins.textContent = formatCoins(game.coins);
    coins.title = t('coinsTitle');
    rate.textContent = t('rate', { n: fmtRate(income) });
    state.textContent = ctx.playing ? t('playing') : t('paused');
    state.classList.toggle('on', ctx.playing);
    together.textContent = t('together', { n: bonus });
    together.hidden = bonus <= 0;
    together.title = t('togetherTitle');
    state.title = ctx.playing ? t('playing') : t('closed');
    sceneButton.setAttribute('aria-label', t('serve'));
    sceneButton.title = ctx.playing ? t('serve') : t('closed');
    box.classList.toggle('sb-idle', !ctx.playing);
    rest.hidden = ctx.playing || blocked;
    restTitle.textContent = t('rest');
    restLine.textContent = t('restLine');
    for (const stand of STANDS) {
      const name = SCENE_GROUP[stand.id];
      const node = name ? group(name) : null;
      if (node) node.style.display = game.levels[stand.id] > 0 ? '' : 'none';
    }
    secondBadge.hidden = game.levels['second-counter'] < 1;
    const shown = shownRows(compact);
    rows.forEach((row, i) => {
      const stand = STANDS[i]!;
      const level = game.levels[stand.id];
      const open = unlocked(game, stand.id);
      const price = costOf(stand.id, level);
      const next = nextMilestone(level);
      const last = [0, ...MILESTONES].filter((m) => m <= level).pop() ?? 0;
      row.node.hidden = !shown.has(stand.id);
      row.node.classList.toggle('locked', !open);
      row.name.textContent = t(`stand.${stand.id}`);
      row.level.textContent = open
        ? level > 0
          ? t('level', { n: level, rate: fmtRate(standRate(stand, level) * starFactor(game)) })
          : t('new', { rate: fmtRate(standRate(stand, 1) * starFactor(game)) })
        : t('locked', { name: t(`stand.${STANDS[i - 1]?.id ?? stand.id}`) });
      row.bar.style.width = `${next ? Math.round(((level - last) / (next - last)) * 100) : 100}%`;
      row.bar.parentElement!.title = next ? t('milestone', { n: next }) : '';
      row.price.replaceChildren(art(coin, 'sb-coin small'), formatCoins(price));
      const can = open && affordable(game, stand.id, 1) > 0 && !blocked;
      row.price.disabled = !can;
      row.price.title = open ? t('buy', { price: formatCoins(price) }) : t('locked', { name: t(`stand.${STANDS[i - 1]?.id ?? stand.id}`) });
    });
    const hidden = STANDS.length - shown.size;
    more.hidden = hidden < 1;
    more.textContent = t('more', { n: hidden });
    cinema.textContent = t('cinema', { n: game.cinemas + 1, stars: game.stars });
    const stars = starsFor(game);
    prestige.textContent = stars > 0 ? t('newCinemaStars', { stars }) : t('newCinema');
    prestige.disabled = stars < 1 || blocked;
    prestige.title = stars > 0 ? t('newCinemaAsk', { stars, bonus: Math.round(STAR_BONUS * 100) }) : t('newCinemaWhen', { min: formatCoins(PRESTIGE_MIN) });
  }

  // ---- One tab at a time ----
  function lockedByOther(): boolean {
    try {
      const lock = JSON.parse(load(LOCK_KEY) || 'null') as { id?: string; at?: number } | null;
      return !!lock && lock.id !== tabId && typeof lock.at === 'number' && Date.now() - lock.at < LOCK_FRESH_MS;
    } catch {
      return false;
    }
  }
  const takeLock = () => save(LOCK_KEY, JSON.stringify({ id: tabId, at: Date.now() }));
  function setBlocked(on: boolean): void {
    blocked = on;
    elsewhere.hidden = !on;
    box.classList.toggle('sb-blocked', on);
    if (on) {
      elsewhere.querySelector('p')!.textContent = t('otherTab');
      elsewhere.querySelector('button')!.textContent = t('playHere');
    }
  }
  elsewhere.querySelector('button')!.addEventListener('click', () => {
    takeLock();
    game = loadSnack(load(SNACK_KEY));
    setBlocked(false);
    last = performance.now();
    draw();
  });

  function persist(): void {
    if (!blocked) save(SNACK_KEY, saveSnack(game));
  }

  // ---- Start, then a tick a second (nothing is paid for the time the game was closed) ----
  if (lockedByOther()) setBlocked(true);
  else {
    takeLock();
    game.seen = Date.now();
    persist();
  }
  let last = performance.now();
  let ticks = 0;
  const timer = setInterval(() => {
    const now = performance.now();
    const seconds = (now - last) / 1000;
    last = now;
    if (blocked) {
      if (!lockedByOther()) setBlocked(false);
      return draw();
    }
    if (lockedByOther()) {
      // Another tab took over ("Play here" there): stop here without saving over it.
      setBlocked(true);
      return draw();
    }
    takeLock();
    tick(game, seconds, room());
    if (++ticks % SAVE_EVERY === 0) persist();
    draw();
  }, 1000);

  const fit = new ResizeObserver(() => {
    const next = root.clientHeight > 0 && root.clientHeight < COMPACT_H;
    if (next !== compact) {
      compact = next;
      draw();
    }
  });
  fit.observe(root);
  const onHide = () => persist();
  addEventListener('pagehide', onHide);
  const onLang = () => draw();
  addEventListener('langchange', onLang);
  draw();

  return () => {
    how.destroy();
    if (stopped) return;
    stopped = true;
    clearInterval(timer);
    clearTimeout(noteTimer);
    fit.disconnect();
    removeEventListener('pagehide', onHide);
    removeEventListener('langchange', onLang);
    if (!blocked) {
      game.seen = Date.now();
      persist();
      save(LOCK_KEY, '');
    }
    root.replaceChildren();
  };
}
