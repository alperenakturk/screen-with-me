// 🌱 Window Garden, the second solo side game (CARDS.md "Window Garden"; look: the owner's pick A "window sill", art
// in `./art/garden/` from `docs/internal/design/side-games/garden/`). The rules are `@swm/shared/games/garden`; this
// file draws them and ticks them once a second with the room's state (`room()`). A lazy chunk with its own stylesheet
// and texts. Like Snack Bar it never takes the room's keys or the focus, and one tab plays at a time.

import './garden.css';
import {
  GARDEN_KEY, PLANT_IDS, POTS, RARITIES, filmEnded, found, inBloom, loadGarden, minutesLeft, pick, plant, rarityOf,
  saveGarden, stageOf, tickGarden, water, type GardenSave, type Rarity,
} from '@swm/shared/games/garden';
import type { SoloRoom } from '@swm/shared/games/catalog';
import { el } from '../dom.ts';
import { lang } from '../i18n.ts';
import { playSound } from '../sound.ts';
import { load, save } from '../storage.ts';
import scene from './art/garden/window-sill.svg?raw';
import pot from './art/garden/pot.svg?raw';
import seed from './art/garden/stage-seed.svg?raw';
import sprout from './art/garden/stage-sprout.svg?raw';
import fern from './art/garden/fern.svg?raw';
import mint from './art/garden/mint.svg?raw';
import sunbell from './art/garden/sunbell.svg?raw';
import nightTulip from './art/garden/night-tulip.svg?raw';
import lanternCactus from './art/garden/lantern-cactus.svg?raw';
import moonbloom from './art/garden/moonbloom.svg?raw';
import reelVine from './art/garden/reel-vine.svg?raw';
import popcornShrub from './art/garden/popcorn-shrub.svg?raw';
import how1 from './art/tutorial/garden-1-plant.svg?raw';
import how2 from './art/tutorial/garden-2-water.svg?raw';
import how3 from './art/tutorial/garden-3-album.svg?raw';
import how4 from './art/tutorial/garden-4-film.svg?raw';
import { howToPlay } from './how-to-play.ts';

const PLANT_ART: Record<string, string> = {
  fern, mint, sunbell, 'night-tulip': nightTulip, 'lantern-cactus': lanternCactus, moonbloom, 'reel-vine': reelVine, 'popcorn-shrub': popcornShrub,
};

/** Window Garden's own words (in its chunk): English first, Turkish second. */
const TEXT = {
  en: {
    how1Title: 'Plant a seed',
    how1: 'Pick a pot and plant one of your seeds.',
    how2Title: 'Water it, then watch',
    how2: "Plants grow only in a room while its video plays, and never dry out while you're away. Water them when you see 💧.",
    how3Title: 'Pick the flower',
    how3: 'Every bloom goes into your album. Find all 8 plants.',
    how4Title: 'Films give seeds',
    how4: 'Watch a film of 20 minutes or more to the end for a new seed.',
    growing: '▶ Growing',
    paused: '⏸ Resting',
    restingTitle: 'Plants grow while the film plays',
    rest: '⏸ Resting until the film plays',
    restLine: "Nothing grows or dries while you're away",
    album: 'Album {n}/{all}',
    seeds: 'Seeds',
    water: '💧 Water',
    watered: 'Watered',
    pick: '✿ Pick it',
    plantSeed: 'Plant a seed',
    noSeeds: 'No seeds yet: one comes every 30 watched minutes',
    left: 'about {n} watched min to bloom',
    dry: 'Thirsty: it grows slowly until you water it',
    bloom: 'In bloom!',
    empty: 'Empty pot',
    sprouting: 'sprouting',
    picked: '{name} went into your album',
    pickedNew: 'New in your album: {name}!',
    seedCame: 'A seed! ({kind})',
    filmSeed: 'The film ended: a seed! ({kind})',
    eveningSeed: 'A long evening together: a rare seed!',
    bloomed: '{name} is in bloom',
    'rarity.common': 'common',
    'rarity.uncommon': 'uncommon',
    'rarity.rare': 'rare',
    'rarity.legendary': 'legendary',
    'plant.fern': 'Fern',
    'plant.mint': 'Mint',
    'plant.sunbell': 'Sunbell',
    'plant.night-tulip': 'Night tulip',
    'plant.lantern-cactus': 'Lantern cactus',
    'plant.moonbloom': 'Moonbloom',
    'plant.reel-vine': 'Reel vine',
    'plant.popcorn-shrub': 'Popcorn shrub',
    unknown: 'Not found yet',
    pot: 'Pot {n}',
    otherTab: 'Window Garden is open in another tab.',
    playHere: 'Play here',
  },
  tr: {
    how1Title: 'Tohum ek',
    how1: 'Bir saksı seç, tohumlarından birini ek.',
    how2Title: 'Sula, sonra izle',
    how2: 'Bitkiler yalnızca bir odada, video oynarken büyür; sen yokken kurumaz. 💧 görünce sula.',
    how3Title: 'Çiçeği topla',
    how3: 'Her çiçek albümüne girer. 8 bitkinin hepsini bul.',
    how4Title: 'Filmler tohum verir',
    how4: '20 dakikalık ya da daha uzun bir filmi sonuna kadar izle, yeni tohum kazan.',
    growing: '▶ Büyüyor',
    paused: '⏸ Dinleniyor',
    restingTitle: 'Bitkiler film oynarken büyür',
    rest: '⏸ Film oynayınca büyür',
    restLine: 'Sen yokken ne büyür ne kurur',
    album: 'Albüm {n}/{all}',
    seeds: 'Tohumlar',
    water: '💧 Sula',
    watered: 'Sulandı',
    pick: '✿ Topla',
    plantSeed: 'Tohum ek',
    noSeeds: 'Henüz tohum yok: her 30 izlenen dakikada bir gelir',
    left: 'açmasına yaklaşık {n} izlenen dk',
    dry: 'Susadı: sulayana kadar yavaş büyür',
    bloom: 'Çiçek açtı!',
    empty: 'Boş saksı',
    sprouting: 'filizleniyor',
    picked: '{name} albümüne girdi',
    pickedNew: 'Albümünde yeni: {name}!',
    seedCame: 'Bir tohum! ({kind})',
    filmSeed: 'Film bitti: bir tohum! ({kind})',
    eveningSeed: 'Birlikte uzun bir akşam: nadir bir tohum!',
    bloomed: '{name} çiçek açtı',
    'rarity.common': 'sıradan',
    'rarity.uncommon': 'az bulunur',
    'rarity.rare': 'nadir',
    'rarity.legendary': 'efsanevi',
    'plant.fern': 'Eğrelti',
    'plant.mint': 'Nane',
    'plant.sunbell': 'Güneş çanı',
    'plant.night-tulip': 'Gece lalesi',
    'plant.lantern-cactus': 'Fener kaktüsü',
    'plant.moonbloom': 'Ay çiçeği',
    'plant.reel-vine': 'Makara sarmaşığı',
    'plant.popcorn-shrub': 'Patlamış mısır çalısı',
    unknown: 'Henüz bulunmadı',
    pot: '{n}. saksı',
    otherTab: 'Pencere Bahçesi başka bir sekmede açık.',
    playHere: 'Burada oyna',
  },
} as const;
type TextKey = keyof (typeof TEXT)['en'];
function t(key: TextKey, values: Record<string, string | number> = {}): string {
  const table: Record<string, string> = lang() === 'tr' ? TEXT.tr : TEXT.en;
  return (table[key] ?? TEXT.en[key]).replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ''));
}
const plantName = (id: string) => t(`plant.${id}` as TextKey);
const rarityName = (r: Rarity) => t(`rarity.${r}` as TextKey);

const LOCK_KEY = 'windowGarden:tab';
const LOCK_FRESH_MS = 4000;
const SAVE_EVERY = 5;
/** A plant is thirsty below this much water (a 💧 shows above it). */
const THIRSTY = 0.25;
/** The pots' places on the sill: share of the scene's width (Design notes), the soil line at y = 154 of 226. */
const POT_X = [0.26, 0.5, 0.74];

let idCounter = 0;
/** Our own static SVG art (never user data), with its ids made unique. */
function art(raw: string, cls: string, extra = ''): HTMLElement {
  const prefix = `wg${++idCounter}-`;
  const svg = raw
    .replace(/id="([^"]+)"/g, `id="${prefix}$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${prefix}$1)`)
    .replace('<svg ', `<svg ${extra}`);
  const box = el('span', { class: cls, 'aria-hidden': 'true' });
  box.innerHTML = svg;
  box.dataset.prefix = prefix;
  return box;
}

export function mountGarden(root: HTMLElement, room: () => SoloRoom): () => void {
  const tabId = Math.random().toString(36).slice(2);
  let garden: GardenSave = loadGarden(load(GARDEN_KEY));
  let stopped = false;
  let blocked = false;
  let selected = Math.max(0, garden.pots.findIndex((p) => p !== null));

  // ---- Bar: the room's state, the album count, the seeds ----
  const state = el('span', { class: 'wg-pill wg-state' });
  const albumCount = el('span', { class: 'wg-pill wg-album-count' });
  const seedsLine = el('span', { class: 'wg-seeds' });
  const bar = el('div', { class: 'wg-bar' }, state, albumCount, el('span', { class: 'wg-gap' }), seedsLine);

  // ---- The scene with three pots on the sill ----
  const sceneArt = art(scene, 'wg-scene-art', 'preserveAspectRatio="xMidYMax slice" ');
  for (let i = 1; i <= POTS; i++) {
    const g = sceneArt.querySelector<SVGGElement>(`#${sceneArt.dataset.prefix}pot-${i}`);
    if (g) g.style.display = 'none';
  }
  const pots = Array.from({ length: POTS }, (_, i) => {
    const button = el('button', { type: 'button', class: 'wg-pot', 'data-pot': String(i) });
    button.style.left = `${POT_X[i]! * 100}%`;
    button.addEventListener('click', () => {
      if (blocked) return;
      selected = i;
      draw();
    });
    return button;
  });
  // While the room's film does not play the garden rests, and says so on the scene (owner, 4 Nov 2026).
  const restTitle = el('b', {});
  const restLine = el('small', {});
  const rest = el('span', { class: 'wg-rest', 'aria-hidden': 'true' }, restTitle, restLine);
  const sceneBox = el('div', { class: 'wg-scene' }, sceneArt, ...pots, rest);

  // ---- What the selected pot can do ----
  const actionTitle = el('b', { class: 'wg-action-title' });
  const actionText = el('small', { class: 'wg-action-text' });
  const actionButtons = el('div', { class: 'wg-action-buttons' });
  const action = el('div', { class: 'wg-action' }, el('span', { class: 'wg-action-words' }, actionTitle, actionText), actionButtons);

  // ---- The album: every plant, found ones in colour ----
  const album = el('div', { class: 'wg-album' });

  const note = el('p', { class: 'wg-note', role: 'status' });
  note.hidden = true;
  const elsewhere = el('div', { class: 'wg-elsewhere' }, el('p', {}), el('button', { type: 'button', class: 'btn small-btn primary' }));
  elsewhere.hidden = true;
  const box = el('div', { class: 'wg' }, bar, sceneBox, action, album, note, elsewhere);
  root.replaceChildren(box);
  const how = howToPlay(box, 'windowGarden:howSeen', () => [
    { art: how1, title: t('how1Title'), line: t('how1') },
    { art: how2, title: t('how2Title'), line: t('how2') },
    { art: how3, title: t('how3Title'), line: t('how3') },
    { art: how4, title: t('how4Title'), line: t('how4') },
  ]);
  bar.append(how.button);
  box.addEventListener('mousedown', (event) => {
    if ((event.target as Element).closest('button')) event.preventDefault();
  });

  let noteTimer: ReturnType<typeof setTimeout> | undefined;
  function flash(text: string, ms = 4500): void {
    note.textContent = text;
    note.hidden = false;
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => (note.hidden = true), ms);
  }

  function potArt(i: number): HTMLElement {
    const p = garden.pots[i];
    if (!p) return art(pot, 'wg-plant wg-empty-pot');
    const stage = stageOf(p);
    const raw = stage === 0 ? seed : stage === 1 ? sprout : PLANT_ART[p.plant] ?? fern;
    const node = art(raw, `wg-plant stage-${stage}`);
    return node;
  }

  function actionButton(label: string, cls: string, onClick: () => void, disabled = false): HTMLButtonElement {
    const b = el('button', { type: 'button', class: `wg-btn ${cls}` }, label);
    b.disabled = disabled || blocked;
    b.addEventListener('click', () => {
      if (!blocked) onClick();
    });
    return b;
  }

  function drawAction(): void {
    const p = garden.pots[selected] ?? null;
    actionButtons.replaceChildren();
    if (!p) {
      actionTitle.textContent = `${t('pot', { n: selected + 1 })} · ${t('empty')}`;
      const have = RARITIES.filter((r) => garden.seeds[r] > 0);
      actionText.textContent = have.length ? t('plantSeed') : t('noSeeds');
      for (const r of have) {
        actionButtons.append(
          actionButton(`🌰 ${rarityName(r)} ×${garden.seeds[r]}`, `seed-${r}`, () => {
            const id = plant(garden, selected, r);
            if (!id) return;
            playSound('gardenPlant');
            persist();
            draw();
          }),
        );
      }
      return;
    }
    const name = stageOf(p) >= 2 ? plantName(p.plant) : `${t('pot', { n: selected + 1 })} · ${t('sprouting')}`;
    if (inBloom(p)) {
      actionTitle.textContent = `${plantName(p.plant)} · ${t('bloom')}`;
      actionText.textContent = rarityName(rarityOf(p.plant) ?? 'common');
      actionButtons.append(
        actionButton(t('pick'), 'main', () => {
          const got = pick(garden, selected);
          if (!got) return;
          playSound(got.first ? 'gardenNew' : 'gardenPick');
          flash(got.first ? t('pickedNew', { name: plantName(got.plant) }) : t('picked', { name: plantName(got.plant) }));
          persist();
          draw();
        }),
      );
      return;
    }
    actionTitle.textContent = name;
    actionText.textContent = p.water < THIRSTY ? t('dry') : t('left', { n: minutesLeft(p) });
    const full = p.water >= 0.98;
    actionButtons.append(
      actionButton(full ? t('watered') : t('water'), 'main', () => {
        if (!water(garden, selected)) return;
        playSound('gardenWater');
        persist();
        draw();
      }, full),
    );
  }

  function draw(): void {
    const ctx = room();
    state.textContent = ctx.playing ? t('growing') : t('paused');
    state.classList.toggle('on', ctx.playing);
    state.title = t('restingTitle');
    albumCount.textContent = `📖 ${t('album', { n: found(garden), all: PLANT_IDS.length })}`;
    const seedText = RARITIES.filter((r) => garden.seeds[r] > 0).map((r) => `${r === 'common' ? '🌰' : r === 'uncommon' ? '🌰✦' : '🌰✦✦'}${garden.seeds[r]}`);
    seedsLine.textContent = seedText.length ? seedText.join(' ') : '🌰 0';
    seedsLine.title = `${t('seeds')}: ${RARITIES.map((r) => `${rarityName(r)} ${garden.seeds[r]}`).join(' · ')}`;
    box.classList.toggle('wg-idle', !ctx.playing);
    rest.hidden = ctx.playing || blocked;
    restTitle.textContent = t('rest');
    restLine.textContent = t('restLine');
    pots.forEach((button, i) => {
      const p = garden.pots[i] ?? null;
      const key = p ? `${p.plant}|${stageOf(p)}|${p.water < THIRSTY}|${blocked}` : `-|${blocked}`;
      button.classList.toggle('on', i === selected);
      if (button.dataset.key === key) return;
      button.dataset.key = key;
      button.replaceChildren(potArt(i));
      if (p && !inBloom(p) && p.water < THIRSTY) button.append(el('span', { class: 'wg-drop', 'aria-hidden': 'true' }, '💧'));
      if (p && inBloom(p)) button.append(el('span', { class: 'wg-spark', 'aria-hidden': 'true' }, '✿'));
      button.classList.toggle('bloom', inBloom(p));
      button.setAttribute('aria-label', `${t('pot', { n: i + 1 })}: ${p ? (stageOf(p) >= 2 ? plantName(p.plant) : '…') : t('empty')}`);
      button.disabled = blocked;
    });
    drawAction();
    const albumKey = PLANT_IDS.map((id) => garden.album[id] ?? 0).join(',') + lang();
    if (album.dataset.key === albumKey) return;
    album.dataset.key = albumKey;
    album.replaceChildren(
      ...PLANT_IDS.map((id) => {
        const count = garden.album[id] ?? 0;
        const cell = el('span', { class: `wg-album-cell${count ? ' found' : ''}`, title: count ? `${plantName(id)} ×${count}` : t('unknown') }, art(PLANT_ART[id] ?? fern, 'wg-album-art'));
        return cell;
      }),
    );
  }

  // ---- One tab at a time (as in Snack Bar) ----
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
    if (on) {
      elsewhere.querySelector('p')!.textContent = t('otherTab');
      elsewhere.querySelector('button')!.textContent = t('playHere');
    }
  }
  elsewhere.querySelector('button')!.addEventListener('click', () => {
    takeLock();
    garden = loadGarden(load(GARDEN_KEY));
    setBlocked(false);
    last = performance.now();
    draw();
  });
  const persist = () => {
    if (!blocked) save(GARDEN_KEY, saveGarden(garden));
  };

  if (lockedByOther()) setBlocked(true);
  else takeLock();
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
      setBlocked(true);
      return draw();
    }
    takeLock();
    const ctx = room();
    const result = tickGarden(garden, seconds, ctx);
    // A film of 20 min or more reached its end (the last 10 s): one seed, once per item.
    const item = ctx.item;
    if (item && item.duration > 0 && item.position >= item.duration - 10) {
      const kind = filmEnded(garden, item.id, item.duration);
      if (kind) {
        playSound('gardenSeed');
        flash(t('filmSeed', { kind: rarityName(kind) }));
      }
    }
    for (const kind of result.seeds) {
      playSound('gardenSeed');
      flash(kind === 'rare' ? t('eveningSeed') : t('seedCame', { kind: rarityName(kind) }));
    }
    for (const i of result.bloomed) {
      playSound('gardenBloom');
      const p = garden.pots[i];
      if (p) flash(t('bloomed', { name: plantName(p.plant) }));
    }
    if (result.seeds.length || result.bloomed.length || ++ticks % SAVE_EVERY === 0) persist();
    draw();
  }, 1000);

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
    removeEventListener('pagehide', onHide);
    removeEventListener('langchange', onLang);
    if (!blocked) {
      persist();
      save(LOCK_KEY, '');
    }
    root.replaceChildren();
  };
}
