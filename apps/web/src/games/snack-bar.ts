// 🍿 Snack Bar, the solo side game (CARDS.md "Snack Bar"; look: the owner's pick A "counter scene", art in
// `./art/snack-bar/` from `docs/internal/design/side-games/snack-bar/`). The rules are `@swm/shared/games/snack-bar`;
// this file draws them and ticks them once a second with the room's state (`room()`). A lazy chunk with its own
// stylesheet, loaded only when the game opens. It never takes the room's keys or the focus: its buttons don't keep
// the focus after a click (so 1–8, Enter, P, V still reach the room), and it has no key handlers of its own.

import './snack-bar.css';
import {
  MILESTONES, SNACK_KEY, STANDS, STAR_BONUS, PRESTIGE_MIN, affordable, buy, collectAway, costOf, formatCoins, incomeRate,
  loadSnack, milestoneFactor, newCinema, nextMilestone, saveSnack, serve, standRate, starsFor, starFactor, tick,
  togetherFactor, unlocked, type SnackContext, type SnackSave, type StandId,
} from '@swm/shared/games/snack-bar';
import { el } from '../dom.ts';
import { t } from '../i18n.ts';
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

const ART: Record<StandId, string> = { popcorn, soda, nachos, candy, 'second-counter': second };
/** Scene groups shown once their stand has a level (the second counter has no group: a badge instead). */
const SCENE_GROUP: Partial<Record<StandId, string>> = { popcorn: 'popcorn-machine', soda: 'soda', nachos: 'nachos', candy: 'candy' };
/** Below this height (in the game's own pixels) only three upgrade rows show. */
const COMPACT_H = 380;
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
  const sceneBox = el('div', { class: 'sb-scene-box' }, sceneButton, pops);
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
      flash(t('snack.closed'), 2500);
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
    const yes = await confirmDialog({ icon: '🎬', title: t('snack.newCinema'), text: t('snack.newCinemaAsk', { stars, bonus: Math.round(STAR_BONUS * 100) }), yes: t('snack.newCinemaYes') });
    if (!yes || stopped || !newCinema(game)) return;
    playSound('snackCinema');
    persist();
    draw();
    flash(t('snack.newCinemaDone', { n: game.cinemas + 1, stars: game.stars }));
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
    coins.title = t('snack.coinsTitle');
    rate.textContent = t('snack.rate', { n: fmtRate(income) });
    state.textContent = ctx.playing ? t('snack.playing') : t('snack.paused');
    state.classList.toggle('on', ctx.playing);
    together.textContent = t('snack.together', { n: bonus });
    together.hidden = bonus <= 0;
    together.title = t('snack.togetherTitle');
    state.title = ctx.playing ? t('snack.playing') : t('snack.closed');
    sceneButton.setAttribute('aria-label', t('snack.serve'));
    sceneButton.title = ctx.playing ? t('snack.serve') : t('snack.closed');
    box.classList.toggle('sb-idle', !ctx.playing);
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
      row.name.textContent = t(`snack.stand.${stand.id}`);
      row.level.textContent = open
        ? level > 0
          ? t('snack.level', { n: level, rate: fmtRate(standRate(stand, level) * starFactor(game)) })
          : t('snack.new', { rate: fmtRate(standRate(stand, 1) * starFactor(game)) })
        : t('snack.locked', { name: t(`snack.stand.${STANDS[i - 1]?.id ?? stand.id}`) });
      row.bar.style.width = `${next ? Math.round(((level - last) / (next - last)) * 100) : 100}%`;
      row.bar.parentElement!.title = next ? t('snack.milestone', { n: next }) : '';
      row.price.replaceChildren(art(coin, 'sb-coin small'), formatCoins(price));
      const can = open && affordable(game, stand.id, 1) > 0 && !blocked;
      row.price.disabled = !can;
      row.price.title = open ? t('snack.buy', { price: formatCoins(price) }) : t('snack.locked', { name: t(`snack.stand.${STANDS[i - 1]?.id ?? stand.id}`) });
    });
    const hidden = STANDS.length - shown.size;
    more.hidden = hidden < 1;
    more.textContent = t('snack.more', { n: hidden });
    cinema.textContent = t('snack.cinema', { n: game.cinemas + 1, stars: game.stars });
    const stars = starsFor(game);
    prestige.textContent = stars > 0 ? t('snack.newCinemaStars', { stars }) : t('snack.newCinema');
    prestige.disabled = stars < 1 || blocked;
    prestige.title = stars > 0 ? t('snack.newCinemaAsk', { stars, bonus: Math.round(STAR_BONUS * 100) }) : t('snack.newCinemaWhen', { min: formatCoins(PRESTIGE_MIN) });
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
      elsewhere.querySelector('p')!.textContent = t('snack.otherTab');
      elsewhere.querySelector('button')!.textContent = t('snack.playHere');
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

  // ---- Start: the away bonus, then a tick a second ----
  if (lockedByOther()) setBlocked(true);
  else {
    takeLock();
    const away = collectAway(game);
    if (away.coins > 0) flash(t('snack.away', { n: formatCoins(away.coins) }), 7000);
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
