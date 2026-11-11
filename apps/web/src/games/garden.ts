// 🌱 Window Garden, the second solo side game (CARDS.md "Window Garden"; look: the owner's pick A "window sill", art
// in `./art/garden/` from `docs/internal/design/side-games/garden/`). The rules are `@swm/shared/games/garden`; this
// file draws them and ticks them once a second with the room's state (`room()`). A lazy chunk with its own stylesheet
// and texts. Like Snack Bar it never takes the room's keys or the focus, and one tab plays at a time.

import './garden.css';
import { gameHint } from './hint.ts';
import {
  ALBUM_IDS, GARDEN_DECOR, GARDEN_KEY, VISITORS, buyGardenDecor, seeVisitor, visitorFor, type GardenDecorId, type VisitorId, HYBRID_COLORS, LAMP_BONUS, PLANT_IDS, POTS, RARITIES, albumId, plantColor, type HybridColor, filmEnded, found, freshGarden, lampFree, lampOn, placeLamp, inBloom, loadGarden, minutesLeft, pick, plant, rarityOf,
  saveGarden, stageOf, tickGarden, water, type GardenSave, type Rarity, canGift, giveCutting, plantGift, receiveCutting, type PlantId,
} from '@swm/shared/games/garden';
import type { SoloRoom } from '@swm/shared/games/catalog';
import { RESTORE_EVENT, labTicks, registerSideLab } from './lab-tools.ts';
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
// MASCOT3: Stub lights the pot with his usher's torch.
import stubLamp from './art/garden/stub-lamp.svg?raw';
import { takeFilmEnds, takeGifts } from './film-end.ts';
import how1 from './art/tutorial/garden-1-plant.svg?raw';
import how2 from './art/tutorial/garden-2-water.svg?raw';
import how3 from './art/tutorial/garden-3-album.svg?raw';
import how4 from './art/tutorial/garden-4-film.svg?raw';
import { howToPlay, restartButton } from './how-to-play.ts';

/** Garden decorations and visitors (pick 6), drawn here over the window scene (same 340 × 226 frame; our own art). */
const GARDEN_DECOR_ART: Record<GardenDecorId, string> = {
  curtains:
    '<path d="M44 16 H78 Q70 60 82 120 Q60 116 44 124 Z" fill="#b8475f" opacity=".92"/><path d="M52 18 Q50 70 56 120 M64 18 Q60 70 70 118" stroke="#8a2f45" stroke-width="2" fill="none"/><path d="M296 16 H262 Q270 60 258 120 Q280 116 296 124 Z" fill="#b8475f" opacity=".92"/><path d="M288 18 Q290 70 284 120 M276 18 Q280 70 270 118" stroke="#8a2f45" stroke-width="2" fill="none"/>',
  'fairy-lights':
    '<path d="M46 22 Q108 40 170 24 Q232 40 294 22" stroke="#3a2e57" stroke-width="1.2" fill="none"/><g class="wg-bulbs">' +
    [[60, 27], [82, 32], [104, 34], [126, 33], [148, 29], [192, 29], [214, 33], [236, 34], [258, 32], [280, 27]]
      .map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="2.6" fill="${['#ffd76a', '#ff9fc4', '#9fd8ff'][i % 3]}"/>`)
      .join('') +
    '</g>',
  cat: '<g transform="translate(300 146)"><ellipse cx="16" cy="18" rx="17" ry="9" fill="#2b2240"/><circle cx="4" cy="12" r="7" fill="#2b2240"/><path d="M0 7 L1 1 L5 6 M6 6 L9 1 L10 7" fill="#2b2240"/><path d="M1 12 q2 1.5 4 0 M6 12 q2 1.5 4 0" stroke="#ffc65a" stroke-width="1" fill="none"/><path d="M32 20 q8 -2 6 -10" stroke="#2b2240" stroke-width="4" fill="none" stroke-linecap="round"/></g>',
  lantern: '<g transform="translate(20 20)"><line x1="10" y1="0" x2="10" y2="18" stroke="#3a2e57" stroke-width="1.5"/><rect x="2" y="18" width="16" height="22" rx="4" fill="#3a2e57"/><rect x="5" y="22" width="10" height="14" rx="3" fill="#ffc65a" class="wg-lantern-glow"/><circle cx="10" cy="29" r="14" fill="#ffc65a" opacity=".12"/></g>',
};
const VISITOR_ART: Record<VisitorId, string> = {
  moth: '<g class="wg-moth"><path d="M0 0 q-10 -8 -12 2 q4 6 12 0 q10 -8 12 2 q-4 6 -12 0" fill="#e9dcc0"/><ellipse cx="0" cy="1" rx="1.4" ry="4" fill="#8a7a5a"/></g>',
  firefly: '<g class="wg-firefly"><circle r="6" fill="#d8ff7a" opacity=".25"/><circle r="2.2" fill="#e8ff9a"/></g>',
};

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
    paused: '🌙 Resting',
    restingTitle: 'Plants grow while the film plays',
    rest: '🌙 Resting until the film plays',
    restLine: "Nothing grows or dries while you're away",
    album: 'Album {n}/{all}',
    seeds: 'Seeds',
    water: '💧 Water',
    watered: 'Full of water',
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
    'color.gold': 'golden',
    'color.rose': 'rose',
    'color.sky': 'sky blue',
    'color.violet': 'violet',
    colorSeed: '🌈 {name}',
    colorSeedTitle: 'A colour seed: it grows a {color} {name}',
    giftSeed: '🎁 {name}',
    giftSeedTitle: 'A cutting from {from}: it grows a {name}',
    give: '🎁 Give a cutting',
    giveTitle: 'Give a cutting of this bloom to someone in the room (one per bloom)',
    giveTo: 'Who gets a cutting?',
    giveCancel: 'Cancel',
    giveSent: '🎁 A {name} cutting is on its way to {to}',
    giveFailed: 'The room is not connected: try again in a moment',
    giftFrom: '🎁 {from} gave you a {name} cutting: plant it in an empty pot',
    giftFull: 'A cutting from {from} came, but the tray is full (9): plant some first',
    hybridCame: 'A colour seed: {color} {name}!',
    albumPage: '{name}',
    albumNone: 'Not found yet',
    albumBloomed: 'Bloomed during {title}',
    albumWith: 'with {names}',
    albumAlone: 'on your own',
    albumHint: 'Two plants in bloom side by side can drop a colour seed.',
    close: 'Close',
    decor: 'Decorations',
    decorLine: '🌸 {n} petals · picking a bloom gives 1, a new album entry 3',
    'decor.curtains': 'Curtains',
    'decor.fairy-lights': 'Fairy lights',
    'decor.cat': 'Sleepy cat',
    'decor.lantern': 'Lantern',
    'decorHint.fairy-lights': 'a moth may visit at night',
    'decorHint.lantern': 'a firefly may visit at night',
    decorOwned: '✓ Yours',
    visitors: 'Night visitors',
    'visitor.moth': 'Moth',
    'visitor.firefly': 'Firefly',
    visitorNew: 'A {name} came to your window! It is in your album now.',
    visitorNone: 'None yet: they come at dusk and at night.',
    lamp: '✨ Stub',
    lampTitle: 'Stub shines on this pot until the film ends: +{n} % growth (once per film)',
    lampOn: 'Stub shines on it: +{n} % until the film ends',
    lampUsed: 'Stub is busy with another pot this film',
    restart: 'Start over',
    restartAsk: 'Start Window Garden over?',
    restartText: 'Your pots, seeds and album all go back to the start. This cannot be undone.',
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
    paused: '🌙 Dinleniyor',
    restingTitle: 'Bitkiler film oynarken büyür',
    rest: '🌙 Film oynayınca büyür',
    restLine: 'Sen yokken ne büyür ne kurur',
    album: 'Albüm {n}/{all}',
    seeds: 'Tohumlar',
    water: '💧 Sula',
    watered: 'Suyu dolu',
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
    'color.gold': 'altın',
    'color.rose': 'pembe',
    'color.sky': 'gök mavisi',
    'color.violet': 'mor',
    colorSeed: '🌈 {name}',
    colorSeedTitle: 'Renkli tohum: {color} bir {name} büyütür',
    giftSeed: '🎁 {name}',
    giftSeedTitle: '{from} verdi: bir {name} büyütür',
    give: '🎁 Çelik ver',
    giveTitle: 'Bu çiçekten odadaki birine bir çelik ver (her çiçekten bir tane)',
    giveTo: 'Çeliği kime vereceksin?',
    giveCancel: 'Vazgeç',
    giveSent: '🎁 Bir {name} çeliği {to} kişisine gidiyor',
    giveFailed: 'Oda bağlı değil: biraz sonra yeniden dene',
    giftFrom: '🎁 {from} sana bir {name} çeliği verdi: boş bir saksıya dik',
    giftFull: '{from} bir çelik gönderdi ama tepsi dolu (9): önce birkaçını dik',
    hybridCame: 'Renkli tohum: {color} {name}!',
    albumPage: '{name}',
    albumNone: 'Henüz bulunmadı',
    albumBloomed: '{title} izlenirken açtı',
    albumWith: '{names} ile',
    albumAlone: 'tek başına',
    albumHint: 'Yan yana çiçek açan iki bitki renkli bir tohum düşürebilir.',
    close: 'Kapat',
    decor: 'Süsler',
    decorLine: '🌸 {n} taç yaprağı · her çiçek 1, albüme yeni giren 3 verir',
    'decor.curtains': 'Perdeler',
    'decor.fairy-lights': 'Işık zinciri',
    'decor.cat': 'Uykucu kedi',
    'decor.lantern': 'Fener',
    'decorHint.fairy-lights': 'geceleri bir güve gelebilir',
    'decorHint.lantern': 'geceleri bir ateş böceği gelebilir',
    decorOwned: '✓ Senin',
    visitors: 'Gece ziyaretçileri',
    'visitor.moth': 'Güve',
    'visitor.firefly': 'Ateş böceği',
    visitorNew: 'Penceresine bir {name} geldi! Artık albümünde.',
    visitorNone: 'Henüz yok: akşamları ve geceleri gelirler.',
    lamp: '✨ Stub',
    lampTitle: 'Stub film bitene kadar bu saksıyı aydınlatır: büyüme +%{n} (her filmde bir kez)',
    lampOn: 'Stub onu aydınlatıyor: film bitene kadar +%{n}',
    lampUsed: 'Stub bu filmde başka bir saksıda',
    restart: 'Baştan başla',
    restartAsk: 'Pencere Bahçesi baştan başlasın mı?',
    restartText: 'Saksıların, tohumların ve albümün baştaki haline döner. Bu geri alınamaz.',
  },
} as const;
type TextKey = keyof (typeof TEXT)['en'];
function t(key: TextKey, values: Record<string, string | number> = {}): string {
  const table: Record<string, string> = lang() === 'tr' ? TEXT.tr : TEXT.en;
  return (table[key] ?? TEXT.en[key]).replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ''));
}
const plantName = (id: string) => t(`plant.${id}` as TextKey);
const colorName = (c: HybridColor) => t(`color.${c}` as TextKey);
/** "sky blue mint" (EN) / "gök mavisi nane" (TR): colour first in both languages. */
const coloredName = (id: string, c?: HybridColor) => (c ? `${colorName(c)} ${plantName(id).toLocaleLowerCase(lang())}` : plantName(id));
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
  // Decorations and visitors live in their own layer, drawn in the scene's own frame (pick 6).
  const decorLayer = el('span', { class: 'wg-decor-layer', 'aria-hidden': 'true' });
  decorLayer.innerHTML = `<svg viewBox="0 0 340 226" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg">${GARDEN_DECOR.map((d) => `<g data-decor="${d.id}" style="display:none">${GARDEN_DECOR_ART[d.id]}</g>`).join('')}<g data-visitor style="display:none"></g></svg>`;
  const sceneBox = el('div', { class: 'wg-scene' }, sceneArt, decorLayer, ...pots, rest);

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
  const restart = restartButton(
    () => ({ label: t('restart'), title: t('restartAsk'), text: t('restartText'), yes: t('restart') }),
    () => {
      if (blocked || stopped) return;
      garden = freshGarden();
      garden.seen = Date.now();
      selected = 0;
      persist();
      draw();
    },
  );
  const decorButton = el('button', { type: 'button', class: 'htp-open wg-decor-open' }, '🎨');
  decorButton.addEventListener('click', () => openDecor());
  bar.append(decorButton, restart, how.button);
  box.addEventListener('mousedown', (event) => {
    if ((event.target as Element).closest('button')) event.preventDefault();
  });

  const hint = gameHint(note);
  const flash = (text: string, ms = 4500) => hint.show(text, ms);

  function potArt(i: number): HTMLElement {
    const p = garden.pots[i];
    if (!p) return art(pot, 'wg-plant wg-empty-pot');
    const stage = stageOf(p);
    const raw = stage === 0 ? seed : stage === 1 ? sprout : PLANT_ART[p.plant] ?? fern;
    const node = art(raw, `wg-plant stage-${stage}${p.color && stage >= 2 ? ` wg-color-${p.color}` : ''}`);
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

  /** Who gets this bloom's cutting: up to three names, then Cancel. */
  function chooseFriend(people: { id: string; name: string }[]): void {
    const at = selected;
    actionText.textContent = t('giveTo');
    actionButtons.replaceChildren(
      ...people.slice(0, 3).map((person) =>
        actionButton(person.name, 'gift-to', () => {
          const p = garden.pots[at];
          if (!p || !canGift(garden, at)) return drawAction();
          if (!room().gift?.(person.id, p.plant)) {
            flash(t('giveFailed'));
            return drawAction();
          }
          const plantId = giveCutting(garden, at) as PlantId;
          playSound('gardenSeed');
          flash(t('giveSent', { name: plantName(plantId).toLocaleLowerCase(lang()), to: person.name }));
          persist();
          drawAction();
        }),
      ),
      actionButton(t('giveCancel'), '', () => drawAction()),
    );
  }

  function drawAction(): void {
    const p = garden.pots[selected] ?? null;
    actionButtons.replaceChildren();
    if (!p) {
      actionTitle.textContent = `${t('pot', { n: selected + 1 })} · ${t('empty')}`;
      const have = RARITIES.filter((r) => garden.seeds[r] > 0);
      actionText.textContent = have.length || garden.colorSeeds.length || garden.giftSeeds.length ? t('plantSeed') : t('noSeeds');
      // A friend's cutting first, then colour seeds (at most two buttons fit beside the seeds).
      const gift = garden.giftSeeds[0];
      if (gift) {
        const b = actionButton(t('giftSeed', { name: plantName(gift.plant) }), 'seed-gift', () => {
          if (!plantGift(garden, selected, 0)) return;
          playSound('gardenPlant');
          persist();
          draw();
        });
        b.title = t('giftSeedTitle', { from: gift.from, name: plantName(gift.plant).toLocaleLowerCase(lang()) });
        actionButtons.append(b);
      }
      garden.colorSeeds.slice(0, gift ? 1 : 2).forEach((c, index) => {
        const b = actionButton(t('colorSeed', { name: plantName(c.plant) }), `seed-color wg-color-btn-${c.color}`, () => {
          if (!plantColor(garden, selected, index)) return;
          playSound('gardenPlant');
          persist();
          draw();
        });
        b.title = t('colorSeedTitle', { color: colorName(c.color), name: plantName(c.plant).toLocaleLowerCase(lang()) });
        actionButtons.append(b);
      });
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
          const name = coloredName(got.plant, got.color);
          flash(got.first ? t('pickedNew', { name }) : t('picked', { name }));
          persist();
          draw();
        }),
      );
      // A cutting for a friend in the room (owner's pick 8): one per bloom, no trading.
      const people = room().people ?? [];
      if (canGift(garden, selected) && people.length) {
        const give = actionButton(t('give'), 'gift', () => chooseFriend(people));
        give.title = t('giveTitle');
        actionButtons.append(give);
      }
      return;
    }
    actionTitle.textContent = name;
    const itemId = room().item?.id;
    const lit = lampOn(garden, selected, itemId);
    const bonus = Math.round(LAMP_BONUS * 100);
    actionText.textContent = p.water < THIRSTY ? t('dry') : lit ? t('lampOn', { n: bonus }) : t('left', { n: minutesLeft(p) });
    const full = p.water >= 0.98;
    // THEMEG: always "💧 Water" (present tense); a full pot shows it as the quiet outlined button, full contrast, with
    // "Full of water" on hover, instead of a faded "Watered" that read as a broken button.
    const waterButton = actionButton(t('water'), full ? 'full' : 'main', () => {
      if (!water(garden, selected)) return;
      playSound('gardenWater');
      persist();
      draw();
    }, full);
    if (full) waterButton.title = t('watered');
    actionButtons.append(waterButton);
    // Stub the grow lamp: once per film, on a growing plant (owner's pick 9).
    if (!lit && itemId) {
      const free = lampFree(garden, itemId);
      const lampButton = actionButton(t('lamp'), 'lamp', () => {
        if (!placeLamp(garden, selected, room().item?.id)) return;
        playSound('gardenBloom');
        persist();
        draw();
      }, !free);
      lampButton.title = free ? t('lampTitle', { n: bonus }) : t('lampUsed');
      actionButtons.append(lampButton);
    }
  }

  function draw(): void {
    const ctx = room();
    // GW play-through: in Turkish "▶ Büyüyor" left the seed count cut to "🌰…": while the film plays the pill is just ▶.
    state.textContent = ctx.playing ? '▶' : t('paused');
    state.setAttribute('aria-label', ctx.playing ? t('growing') : t('paused'));
    state.classList.toggle('on', ctx.playing);
    state.title = ctx.playing ? t('growing') : t('restingTitle');
    // (j) Every icon in the bar says what it is (the 🎨 had no name).
    decorButton.title = t('decor');
    decorButton.setAttribute('aria-label', t('decor'));
    // SIDE340: the narrow column beside the video shows the short form (garden.css swaps them).
    const albumText = `📖 ${t('album', { n: found(garden), all: ALBUM_IDS.length })}`;
    albumCount.title = albumText;
    albumCount.replaceChildren(el('span', { class: 'wg-album-long' }, albumText), el('span', { class: 'wg-album-short' }, `📖 ${found(garden)}/${ALBUM_IDS.length}`));
    weather();
    // GW play-through: one count per kind ("🌰2 🌰✦1 🌈1 🎁1") no longer fit beside the album in a 400 px window: the head
    // shows the total, its tooltip (and the seed buttons on an empty pot) the kinds.
    const seedCount = RARITIES.reduce((n, r) => n + garden.seeds[r], 0) + garden.colorSeeds.length + garden.giftSeeds.length;
    seedsLine.textContent = `🌰 ${seedCount}`;
    seedsLine.title = `${t('seeds')}: ${RARITIES.map((r) => `${rarityName(r)} ${garden.seeds[r]}`).join(' · ')}${garden.colorSeeds.length ? ` · 🌈 ${garden.colorSeeds.length}` : ''}${garden.giftSeeds.length ? ` · 🎁 ${garden.giftSeeds.length}` : ''}`;
    box.classList.toggle('wg-idle', !ctx.playing);
    decorButton.title = t('decor');
    decorButton.setAttribute('aria-label', t('decor'));
    for (const d of GARDEN_DECOR) {
      const node = decorLayer.querySelector<SVGGElement>(`[data-decor="${d.id}"]`);
      if (node) node.style.display = garden.decor.includes(d.id) ? '' : 'none';
    }
    rest.hidden = ctx.playing || blocked;
    restTitle.textContent = t('rest');
    restLine.textContent = t('restLine');
    pots.forEach((button, i) => {
      const p = garden.pots[i] ?? null;
      const lit = lampOn(garden, i, ctx.item?.id);
      const key = p ? `${p.plant}|${stageOf(p)}|${p.water < THIRSTY}|${blocked}|${lit}` : `-|${blocked}|${lit}`;
      button.classList.toggle('on', i === selected);
      if (button.dataset.key === key) return;
      button.dataset.key = key;
      button.replaceChildren(potArt(i));
      if (p && !inBloom(p) && p.water < THIRSTY) button.append(el('span', { class: 'wg-drop', 'aria-hidden': 'true' }, '💧'));
      if (p && inBloom(p)) button.append(el('span', { class: 'wg-spark', 'aria-hidden': 'true' }, '✿'));
      if (lit) button.append(art(stubLamp, 'wg-lamp'));
      button.classList.toggle('bloom', inBloom(p));
      button.setAttribute('aria-label', `${t('pot', { n: i + 1 })}: ${p ? (stageOf(p) >= 2 ? plantName(p.plant) : '…') : t('empty')}`);
      button.disabled = blocked;
    });
    drawAction();
    const albumKey = ALBUM_IDS.map((id) => garden.album[id] ?? 0).join(',') + lang();
    if (album.dataset.key === albumKey) return;
    album.dataset.key = albumKey;
    album.replaceChildren(
      ...PLANT_IDS.map((id) => {
        const ids = [id, ...(HYBRID_COLORS[id] ?? []).map((c) => albumId(id, c))];
        const count = ids.reduce((n, x) => n + (garden.album[x] ?? 0), 0);
        const dots = el('span', { class: 'wg-album-dots', 'aria-hidden': 'true' }, ...(HYBRID_COLORS[id] ?? []).map((c) => el('i', { class: `wg-dot wg-dot-${c}${garden.album[albumId(id, c)] ? ' on' : ''}` })));
        const cell = el(
          'button',
          { type: 'button', class: `wg-album-cell${count ? ' found' : ''}`, title: count ? plantName(id) : t('unknown'), 'aria-label': count ? plantName(id) : t('unknown') },
          art(PLANT_ART[id] ?? fern, 'wg-album-art'),
          dots,
        );
        cell.addEventListener('click', () => openAlbumPage(id));
        return cell;
      }),
    );
  }

  // ---- The album page (picks 7 + 10): the plant, its two colours, and what each first bloom remembers ----
  const page = el('div', { class: 'wg-page', role: 'dialog' });
  page.hidden = true;
  box.append(page);
  function openAlbumPage(id: string): void {
    const entries = [undefined, ...(HYBRID_COLORS[id] ?? [])].map((c) => {
      const key = albumId(id, c);
      const count = garden.album[key] ?? 0;
      const memory = garden.memories[key];
      const pic = art(PLANT_ART[id] ?? fern, `wg-page-art${c ? ` wg-color-${c}` : ''}`);
      const lines: (string | Node)[] = [el('b', {}, count ? `${coloredName(id, c)} ×${count}` : c ? `${colorName(c)} · ?` : t('albumNone'))];
      if (count && memory) {
        if (memory.title) lines.push(el('small', {}, `🎬 ${t('albumBloomed', { title: memory.title })}`));
        lines.push(el('small', {}, `👥 ${memory.with.length ? t('albumWith', { names: memory.with.join(', ') }) : t('albumAlone')}${memory.at ? ` · ${new Date(memory.at).toLocaleDateString(lang())}` : ''}`));
      } else if (!count) lines.push(el('small', {}, t('albumNone')));
      return el('li', { class: `wg-page-entry${count ? ' found' : ''}` }, pic, el('span', { class: 'wg-page-words' }, ...lines));
    });
    const close = el('button', { type: 'button', class: 'wg-page-close', 'aria-label': t('close'), title: t('close') }, '✕');
    close.addEventListener('click', () => (page.hidden = true));
    page.replaceChildren(close, el('h3', {}, plantName(id)), el('ul', { class: 'wg-page-list' }, ...entries), el('p', { class: 'wg-page-hint' }, t('albumHint')));
    page.hidden = false;
  }

  // ---- Decorations (bought with petals) and the night visitors they bring (pick 6) ----
  function openDecor(): void {
    const items = GARDEN_DECOR.map((d) => {
      const owned = garden.decor.includes(d.id);
      const hint = VISITORS.find((v) => v.decor === d.id) ? t(`decorHint.${d.id}` as TextKey) : '';
      const buyButton = el('button', { type: 'button', class: `wg-btn${owned ? '' : ' main'}` }, owned ? t('decorOwned') : `🌸 ${d.cost}`);
      buyButton.disabled = owned || garden.petals < d.cost || blocked;
      buyButton.addEventListener('click', () => {
        if (!buyGardenDecor(garden, d.id)) return;
        playSound('gardenPlant');
        persist();
        draw();
        openDecor();
      });
      return el('li', { class: 'wg-page-entry found wg-decor-item' }, el('span', { class: 'wg-page-words' }, el('b', {}, t(`decor.${d.id}` as TextKey)), hint ? el('small', {}, hint) : ''), buyButton);
    });
    const seen = VISITORS.filter((v) => garden.visitors.includes(v.id)).map((v) => t(`visitor.${v.id}` as TextKey));
    const close = el('button', { type: 'button', class: 'wg-page-close', 'aria-label': t('close'), title: t('close') }, '✕');
    close.addEventListener('click', () => (page.hidden = true));
    page.replaceChildren(
      close,
      el('h3', {}, `🎨 ${t('decor')}`),
      el('p', { class: 'wg-page-hint' }, t('decorLine', { n: garden.petals })),
      el('ul', { class: 'wg-page-list' }, ...items),
      el('p', { class: 'wg-page-hint' }, `🌙 ${t('visitors')}: ${seen.length ? seen.join(', ') : t('visitorNone')}`),
    );
    page.hidden = false;
  }

  let visitorTimer: ReturnType<typeof setTimeout> | undefined;
  /** Once a watched minute: maybe a visitor flutters by the window for 40 s. */
  function maybeVisitor(random: () => number = Math.random): VisitorId | null {
    const sky = (sceneBox.dataset.time ?? 'night') as 'night' | 'dawn' | 'day' | 'dusk';
    const who = visitorFor(garden, sky, random);
    if (!who) return null;
    const layer = decorLayer.querySelector<SVGGElement>('[data-visitor]');
    if (!layer) return null;
    const x = 90 + Math.random() * 160;
    const y = 50 + Math.random() * 60;
    layer.innerHTML = `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)})">${VISITOR_ART[who]}</g>`;
    layer.style.display = '';
    clearTimeout(visitorTimer);
    visitorTimer = setTimeout(() => (layer.style.display = 'none'), 40_000);
    if (seeVisitor(garden, who)) {
      playSound('gardenNew');
      flash(t('visitorNew', { name: t(`visitor.${who}` as TextKey).toLocaleLowerCase(lang()) }), 6000);
      persist();
    }
    return who;
  }

  // ---- The sky outside the window follows the time of day; some days it rains (pick 10, decoration only) ----
  /** The Test Lab can set the sky and the rain (looks only; null = the real time and day). */
  const labSky: { sky: 'night' | 'dawn' | 'day' | 'dusk' | null; rain: boolean | null } = { sky: null, rain: null };
  function weather(): void {
    const hour = new Date().getHours();
    const sky = labSky.sky ?? (hour >= 21 || hour < 5 ? 'night' : hour < 8 ? 'dawn' : hour < 17 ? 'day' : 'dusk');
    const day = new Date().toISOString().slice(0, 10);
    let hash = 0;
    for (const ch of day) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    const rain = labSky.rain ?? hash % 4 === 0;
    const key = `${sky}|${rain}`;
    if (sceneBox.dataset.sky === key) return;
    sceneBox.dataset.sky = key;
    sceneBox.dataset.time = sky;
    sceneBox.classList.toggle('wg-rain', rain);
    const stops = sceneArt.querySelectorAll<SVGStopElement>(`#${sceneArt.dataset.prefix}wss stop`);
    const colors: Record<string, [string, string]> = { night: ['#1a2150', '#2a2257'], dawn: ['#f2a07b', '#6a62a8'], day: ['#7fb8ff', '#cfe6ff'], dusk: ['#ff8f5a', '#5a3f8a'] };
    stops[0]?.setAttribute('stop-color', colors[sky]![0]);
    stops[1]?.setAttribute('stop-color', colors[sky]![1]);
    const moon = sceneArt.querySelector<SVGGElement>(`#${sceneArt.dataset.prefix}moon`);
    if (moon) moon.style.display = sky === 'night' || sky === 'dusk' ? '' : 'none';
    const lights = sceneArt.querySelector<SVGGElement>(`#${sceneArt.dataset.prefix}city-lights`);
    if (lights) lights.style.display = sky === 'day' ? 'none' : '';
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
    // The Test Lab's "time ×10" runs the same tick more often (each one is still capped like a real second).
    const times = labTicks();
    const result = tickGarden(garden, seconds, ctx);
    for (let i = 1; i < times; i++) {
      const more = tickGarden(garden, seconds, ctx);
      result.seeds.push(...more.seeds);
      result.bloomed.push(...more.bloomed);
      result.hybrids.push(...more.hybrids);
    }
    if (result.hybrids.length) persist();
    if (ctx.playing && Math.floor(garden.watched / 60) !== Math.floor((garden.watched - seconds * times) / 60)) maybeVisitor();
    // Films of 20 min or more that ended while I was in the room (the room page notes them even with the garden
    // closed, owner's pick 11 B), and the one ending now: one seed each, once per item.
    const item = ctx.item;
    const ends = takeFilmEnds();
    if (item && item.duration > 0 && item.position >= item.duration - 10) ends.push({ id: item.id, duration: item.duration });
    for (const end of ends) {
      const kind = filmEnded(garden, end.id, end.duration);
      if (kind) {
        playSound('gardenSeed');
        flash(t('filmSeed', { kind: rarityName(kind) }));
      }
    }
    // Cuttings friends gave me (they wait in this browser, `windowGarden:gifts`, even with the garden closed).
    for (const gift of takeGifts()) {
      const ok = PLANT_IDS.includes(gift.plant as PlantId) && receiveCutting(garden, gift.plant as PlantId, gift.from);
      const name = PLANT_IDS.includes(gift.plant as PlantId) ? plantName(gift.plant as PlantId).toLocaleLowerCase(lang()) : '';
      if (name) flash(ok ? t('giftFrom', { from: gift.from, name }) : t('giftFull', { from: gift.from }));
      if (ok) {
        playSound('gardenSeed');
        persist();
      }
    }
    for (const kind of result.seeds) {
      playSound('gardenSeed');
      flash(kind === 'rare' ? t('eveningSeed') : t('seedCame', { kind: rarityName(kind) }));
    }
    for (const seed of result.hybrids) {
      playSound('gardenNew');
      flash(t('hybridCame', { color: colorName(seed.color), name: plantName(seed.plant).toLocaleLowerCase(lang()) }));
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

  // ---- 🐞 Test Lab (card DL3): cheats on a sandbox copy; "Restore my real saves" puts the real save back ----
  const onRestore = () => {
    garden = loadGarden(load(GARDEN_KEY));
    draw();
  };
  addEventListener(RESTORE_EVENT, onRestore);
  const where = { en: 'Window Garden open', tr: 'Pencere Bahçesi açıkken' };
  const changed = (what: string) => {
    persist();
    draw();
    return what;
  };
  const sky = (value: typeof labSky.sky, rain: boolean | null) => {
    labSky.sky = value;
    labSky.rain = rain;
    delete sceneBox.dataset.sky;
    weather();
  };
  const offLab = registerSideLab(
    'windowGarden',
    'windowGarden',
    () => [
      {
        id: 'garden.grow',
        title: { en: 'Window Garden: grow every pot by half', tr: 'Pencere Bahçesi: her saksı yarı yarıya büyüsün' },
        help: { en: 'Each planted pot grows 50 % and is watered.', tr: 'Ekili her saksı %50 büyür ve sulanır.' },
        tab: 'games',
        where,
        available: () => garden.pots.some((p) => p && p.growth < 1) || { en: 'nothing is growing', tr: 'büyüyen bir şey yok' },
        run: () => {
          for (const p of garden.pots) if (p && p.growth < 1) (p.growth = Math.min(0.999, p.growth + 0.5)), (p.water = 1);
          return changed('grown');
        },
      },
      {
        id: 'garden.bloom',
        title: { en: 'Window Garden: bloom now', tr: 'Pencere Bahçesi: hemen çiçek açsın' },
        help: { en: 'Every planted pot blooms on the next tick (with its memory and sound).', tr: 'Ekili her saksı bir sonraki anda çiçek açar (anısı ve sesiyle).' },
        tab: 'games',
        where,
        available: () => garden.pots.some((p) => p && p.growth < 1) || { en: 'nothing is growing', tr: 'büyüyen bir şey yok' },
        run: () => {
          for (const p of garden.pots) if (p && p.growth < 1) (p.growth = 0.9999), (p.water = 1);
          return changed('blooming');
        },
      },
      {
        id: 'garden.seeds',
        title: { en: 'Window Garden: one seed of each kind', tr: 'Pencere Bahçesi: her türden bir tohum' },
        help: { en: 'Adds a common, uncommon, rare and legendary seed.', tr: 'Sıradan, az bulunur, nadir ve efsanevi birer tohum ekler.' },
        tab: 'games',
        where,
        run: () => {
          for (const r of RARITIES) garden.seeds[r] = Math.min(99, garden.seeds[r] + 1);
          return changed('seeds +1');
        },
      },
      {
        id: 'garden.hybrid',
        title: { en: 'Window Garden: a hybrid colour seed', tr: 'Pencere Bahçesi: bir melez renk tohumu' },
        help: { en: 'Adds a colour seed for a random plant (arg: a plant id).', tr: 'Rastgele bir bitki için renk tohumu ekler (bir bitki adı yazarsan o bitki).' },
        tab: 'games',
        where,
        available: () => garden.colorSeeds.length < 9 || { en: 'the colour seeds are full (9)', tr: 'renk tohumları dolu (9)' },
        run: (arg) => {
          const ids = Object.keys(HYBRID_COLORS) as PlantId[];
          const plantId = ids.includes(arg as PlantId) ? (arg as PlantId) : ids[Math.floor(Math.random() * ids.length)]!;
          const color = HYBRID_COLORS[plantId]![Math.floor(Math.random() * 2)]!;
          garden.colorSeeds.push({ plant: plantId, color });
          return changed(`${plantId}:${color}`);
        },
      },
      {
        id: 'garden.sky',
        title: { en: 'Window Garden: the sky (night, dawn, day, dusk)', tr: 'Pencere Bahçesi: gökyüzü (gece, şafak, gündüz, akşam)' },
        help: { en: 'Sets the window\'s sky (arg: night / dawn / day / dusk / auto); looks only.', tr: 'Penceredeki gökyüzünü değiştirir (night / dawn / day / dusk / auto yaz); sadece görünüş.' },
        tab: 'games',
        where,
        run: (arg) => {
          const next = (['night', 'dawn', 'day', 'dusk'] as const).find((k) => k === arg) ?? (arg === 'auto' ? null : labSky.sky === 'night' ? 'day' : 'night');
          sky(next, labSky.rain);
          return next ?? 'auto';
        },
        undo: () => sky(null, labSky.rain),
      },
      {
        id: 'garden.rain',
        title: { en: 'Window Garden: rain on / off', tr: 'Pencere Bahçesi: yağmur aç / kapat' },
        help: { en: 'Makes it rain outside the window or stop (looks only).', tr: 'Pencerenin dışında yağmur yağdırır ya da durdurur (sadece görünüş).' },
        tab: 'games',
        where,
        run: () => {
          sky(labSky.sky, !(labSky.rain ?? sceneBox.classList.contains('wg-rain')));
          return labSky.rain ? 'rain' : 'dry';
        },
        undo: () => sky(labSky.sky, null),
      },
      {
        id: 'garden.visitor',
        title: { en: 'Window Garden: a night visitor now', tr: 'Pencere Bahçesi: hemen bir gece misafiri' },
        help: { en: 'At night a visitor comes at once (it needs its decoration: the lantern or the fairy lights).', tr: 'Gece hemen bir misafir gelir (süsü gerekir: fener ya da peri ışıkları).' },
        tab: 'games',
        where,
        run: () => {
          if (labSky.sky !== 'night' && labSky.sky !== 'dusk') sky('night', labSky.rain);
          return maybeVisitor(() => 0) ?? { en: 'no visitor: buy the lantern or the fairy lights first', tr: 'misafir yok: önce feneri ya da peri ışıklarını al' };
        },
      },
    ],
    () => [[{ en: 'Window Garden', tr: 'Pencere Bahçesi' }, { en: `${garden.pots.filter(Boolean).length} growing · album ${found(garden)} · ${labSky.sky ?? 'real sky'}`, tr: `${garden.pots.filter(Boolean).length} büyüyor · albüm ${found(garden)} · ${labSky.sky ?? 'gerçek gökyüzü'}` }]],
  );

  return () => {
    how.destroy();
    if (stopped) return;
    stopped = true;
    offLab();
    removeEventListener(RESTORE_EVENT, onRestore);
    clearInterval(timer);
    hint.hide();
    clearTimeout(visitorTimer);
    removeEventListener('pagehide', onHide);
    removeEventListener('langchange', onLang);
    if (!blocked) {
      persist();
      save(LOCK_KEY, '');
    }
    root.replaceChildren();
  };
}
