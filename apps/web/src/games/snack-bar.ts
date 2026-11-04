// 🍿 Snack Bar, the solo side game (CARDS.md "Snack Bar"; look: the owner's pick A "counter scene", art in
// `./art/snack-bar/` from `docs/internal/design/side-games/snack-bar/`). The rules are `@swm/shared/games/snack-bar`;
// this file draws them and ticks them once a second with the room's state (`room()`). A lazy chunk with its own
// stylesheet, loaded only when the game opens. It never takes the room's keys or the focus: its buttons don't keep
// the focus after a click (so 1–8, Enter, P, V still reach the room), and it has no key handlers of its own.

import './snack-bar.css';
import {
  BADGES, BADGE_BONUS, DECOR, MILESTONES, buyDecor, placeOf, placeCost, type DecorId, type PlaceId, SNACK_KEY, STANDS, STAR_BONUS, PRESTIGE_MIN, affordable, buy, checkBadges, collectReceipt, costOf, customerMood, receiptFor, serveCustomer, formatCoins, freshSnack, incomeRate,
  RECEIPT_MIN_S, loadSnack, milestoneFactor, newCinema, nextMilestone, saveSnack, serve, standRate, starsFor, starFactor, tick,
  togetherFactor, unlocked, type CustomerMood, type Receipt, type SnackSave, type StandId,
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
import { howToPlay, restartButton } from './how-to-play.ts';
import glowbeam from './art/snack-bar/glowbeam.svg?raw';
import { takeFilmEnds } from './film-end.ts';
import { RESTORE_EVENT, labTicks, registerSideLab } from './lab-tools.ts';
import type { SoloRoom } from '@swm/shared/games/catalog';

/** Snack Bar's own words (in its chunk, not the room page's): English first, Turkish second. */
const TEXT = {
  en: {
    how1Title: 'Earn while the room watches',
    how1: "Your snack bar makes coins only in a room while its video plays. Nothing changes while you're away.",
    how2Title: 'Tap to serve',
    how2: 'Tap the counter for an extra coin. When a customer walks up, tap them for more.',
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
    'jar': '🫙 {n} %',
    'jarBoost': '🫙 +10 %',
    'jarTitle': 'The room\'s tip jar: everyone\'s serves fill it. When it is full, everyone playing Snack Bar gets +10 % until the film ends.',
    'jarFull': '🫙 The tip jar is full: +10 % for everyone until the film ends!',
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
    cinemaShort: '{icon} #{n} · ★ {stars}',
    'place.lobby': 'The lobby',
    'place.drive-in': 'Drive-in',
    'place.rooftop': 'Rooftop cinema',
    'place.art-house': 'Art house',
    'twist.lobby': 'Where it all started.',
    'twist.drive-in': 'Under the stars: soda earns ×2.',
    'twist.rooftop': 'Up on the roof: +25 % income from 20:00 to 04:00.',
    'twist.art-house': 'Fancy sweets: candy earns ×3 and costs ×2.',
    'sign.lobby': 'SNACK BAR',
    'sign.drive-in': 'DRIVE-IN',
    'sign.rooftop': 'ROOFTOP',
    'sign.art-house': 'ART HOUSE',
    placeOpen: 'Cinema #{n}: {place}. {twist}',
    decorTitle: '🎨 Decorations',
    decorLine: 'Looks only. Yours for good, in every cinema.',
    'decor.marquee': 'Marquee lights',
    'decor.poster': 'Glowbeam poster',
    'decor.rope': 'Velvet rope',
    'decor.neon': 'Neon popcorn',
    decorOwned: '✓ Yours',
    'newCinema': '🎬 Open a new cinema',
    newCinemaButton: '🎬 New cinema',
    'newCinemaStars': '🎬 New cinema · +{stars} ★',
    'newCinemaWhen': 'Earn {min} in this cinema to open a new one',
    'newCinemaAsk': 'Your coins and stands start over; you get {stars} ★, each one +{bonus} % income for good.',
    'newCinemaYes': 'Open the new cinema',
    'newCinemaDone': 'Cinema #{n} is open · ★ {stars} in all',
    rest: '⏸ Closed until the film plays',
    restLine: "Nothing changes while you're away",
    'otherTab': 'Snack Bar is open in another tab.',
    'playHere': 'Play here',
    customer: 'Serve this customer',
    'line.any': ['Popcorn, please!', 'A big soda, no ice.', "What's good tonight?", 'Something sweet for the film?'],
    'line.long': ["Big tub, it's a long one!", 'Refills for the second half?', 'Snacks for three hours, please.'],
    'line.short': ['Quick, before it starts!', "Just a small bag, it's a short one."],
    'line.friends': ["Two straws, we're sharing.", 'My friends want nachos too!'],
    'line.voice': ["Shh, they're talking. One soda!", 'Candy, please. I can hear them laughing!'],
    receiptTitle: 'Receipt',
    receiptFilm: 'Film watched',
    receiptServed: 'Customers served',
    receiptEarned: 'Coins earned',
    receiptBest: 'Best stand',
    receiptBucket: '🪣 Golden bucket',
    receiptCollect: 'Collect {n}',
    receiptThanks: 'Thanks for watching with us!',
    minutes: '{n} min',
    badges: '🏅 {n}/{all}',
    badgesTitle: 'Badges',
    badgesLine: 'Each badge: +{n} % income for good (the ones marked ✦ are just for fun).',
    badgeNew: '🏅 New badge: {name}',
    badgeFun: 'just for fun',
    badgeEach: '+{n} % each',
    badgeTap: 'Tap a badge to see how to earn it.',
    close: 'Close',
    restart: 'Start over',
    restartAsk: 'Start Snack Bar over?',
    restartText: 'Your coins, stands, stars and cinemas all go back to zero. This cannot be undone.',
  },
  tr: {
    how1Title: 'Oda izlerken kazan',
    how1: 'Büfen yalnızca bir odadayken, odanın videosu oynarken kazanır. Sen yokken hiçbir şey değişmez.',
    how2Title: 'Dokun, servis yap',
    how2: 'Fazladan bir jeton için tezgâha dokun. Bir müşteri gelince ona dokun, daha çok kazan.',
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
    'jar': '🫙 %{n}',
    'jarBoost': '🫙 +%10',
    'jarTitle': 'Odanın bahşiş kavanozu: herkesin servisi onu doldurur. Dolunca Büfe oynayan herkes film bitene kadar +%10 kazanır.',
    'jarFull': '🫙 Bahşiş kavanozu doldu: film bitene kadar herkese +%10!',
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
    cinemaShort: '{icon} {n}. · ★ {stars}',
    'place.lobby': 'Lobi',
    'place.drive-in': 'Arabalı sinema',
    'place.rooftop': 'Çatı sineması',
    'place.art-house': 'Sanat sineması',
    'twist.lobby': 'Her şeyin başladığı yer.',
    'twist.drive-in': 'Yıldızların altında: gazoz ×2 kazandırır.',
    'twist.rooftop': 'Çatıda: 20.00 ile 04.00 arası gelir +%25.',
    'twist.art-house': 'Şık tatlılar: şeker ×3 kazandırır, fiyatı ×2.',
    'sign.lobby': 'BÜFE',
    'sign.drive-in': 'ARABALI',
    'sign.rooftop': 'ÇATI',
    'sign.art-house': 'SANAT',
    placeOpen: '{n}. sinema: {place}. {twist}',
    decorTitle: '🎨 Süsler',
    decorLine: 'Sadece görünüş. Her sinemada kalıcı olarak senin.',
    'decor.marquee': 'Tabela ışıkları',
    'decor.poster': 'Glowbeam afişi',
    'decor.rope': 'Kadife kordon',
    'decor.neon': 'Neon mısır',
    decorOwned: '✓ Senin',
    'newCinema': '🎬 Yeni sinema aç',
    newCinemaButton: '🎬 Yeni sinema',
    'newCinemaStars': '🎬 Yeni sinema · +{stars} ★',
    'newCinemaWhen': 'Yeni sinema için bu sinemada {min} kazan',
    'newCinemaAsk': 'Paran ve tezgâhların sıfırlanır; {stars} ★ alırsın, her biri gelirine kalıcı +%{bonus} katar.',
    'newCinemaYes': 'Yeni sinemayı aç',
    'newCinemaDone': '{n}. sinema açıldı · toplam ★ {stars}',
    rest: '⏸ Film oynayınca açılır',
    restLine: 'Sen yokken hiçbir şey değişmez',
    'otherTab': 'Büfe başka bir sekmede açık.',
    'playHere': 'Burada oyna',
    customer: 'Bu müşteriye servis yap',
    'line.any': ['Bir mısır lütfen!', 'Büyük gazoz, buzsuz.', 'Bu akşam ne güzel?', 'Film için tatlı bir şey var mı?'],
    'line.long': ['Büyük kova, film uzun!', 'İkinci yarı için dolum var mı?', 'Üç saatlik atıştırmalık lütfen.'],
    'line.short': ['Çabuk, başlamadan!', 'Küçük paket yeter, film kısa.'],
    'line.friends': ['İki pipet, paylaşıyoruz.', 'Arkadaşlarım da nachos istiyor!'],
    'line.voice': ['Şşş, konuşuyorlar. Bir gazoz!', 'Şeker lütfen. Gülüşlerini duyuyorum!'],
    receiptTitle: 'Fiş',
    receiptFilm: 'İzlenen film',
    receiptServed: 'Servis yapılan müşteri',
    receiptEarned: 'Kazanılan para',
    receiptBest: 'En iyi stant',
    receiptBucket: '🪣 Altın kova',
    receiptCollect: '{n} al',
    receiptThanks: 'Bizimle izlediğin için teşekkürler!',
    minutes: '{n} dk',
    badges: '🏅 {n}/{all}',
    badgesTitle: 'Rozetler',
    badgesLine: 'Her rozet: gelire kalıcı +%{n} (✦ olanlar sadece eğlence için).',
    badgeNew: '🏅 Yeni rozet: {name}',
    badgeFun: 'sadece eğlence',
    badgeEach: 'her biri +%{n}',
    badgeTap: 'Nasıl kazanılacağını görmek için bir rozete dokun.',
    close: 'Kapat',
    restart: 'Baştan başla',
    restartAsk: 'Büfe baştan başlasın mı?',
    restartText: 'Paran, stantların, yıldızların ve sinemaların sıfırlanır. Bu geri alınamaz.',
  },
} as const;
type En = (typeof TEXT)['en'];
type TextKey = { [K in keyof En]: En[K] extends string ? K : never }[keyof En];
/** A Snack Bar text in the page's language, with `{name}` filled in. */
function t(key: TextKey, values: Record<string, string | number> = {}): string {
  const table = (lang() === 'tr' ? TEXT.tr : TEXT.en) as Record<string, unknown>;
  const text = (typeof table[key] === 'string' ? table[key] : TEXT.en[key]) as string;
  return text.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ''));
}
/** A customer's line for this mood. */
function line(mood: CustomerMood): string {
  const table = (lang() === 'tr' ? TEXT.tr : TEXT.en) as Record<string, unknown>;
  const pool = (table[`line.${mood}`] ?? TEXT.en[`line.${mood}`]) as readonly string[];
  return pool[Math.floor(Math.random() * pool.length)] ?? '';
}

/** Each badge's name and how it is earned (English first, Turkish second). */
const BADGE_TEXT: Record<'en' | 'tr', Record<string, [string, string]>> = {
  en: {
    'first-sale': ['First sale', 'Serve your first customer'],
    regular: ['Regulars', 'Serve 10 walking customers'],
    'full-house': ['Full house', 'Serve 100 walking customers'],
    'rush-hour': ['Rush hour', 'Serve 500 times'],
    'popcorn-10': ['Popping', 'Popcorn machine level 10'],
    'popcorn-50': ['Popcorn pro', 'Popcorn machine level 50'],
    'popcorn-100': ['Popcorn legend', 'Popcorn machine level 100'],
    'soda-1': ['Fizz', 'Buy the soda fountain'],
    'soda-25': ['Bubbly', 'Soda fountain level 25'],
    'nachos-1': ['Crunch', 'Buy the nachos'],
    'nachos-25': ['Extra cheese', 'Nachos level 25'],
    'candy-1': ['Sweet tooth', 'Buy the candy jar'],
    'candy-25': ['Sugar rush', 'Candy jar level 25'],
    'second-1': ['Second counter', 'Open the second counter'],
    'second-25': ['Busy bar', 'Second counter level 25'],
    'coins-1k': ['Pocket money', 'Earn 1K coins in all'],
    'coins-1m': ['Millionaire', 'Earn 1M coins in all'],
    'coins-1b': ['Movie mogul', 'Earn 1B coins in all'],
    'film-1': ['First receipt', 'Collect a film receipt'],
    'film-10': ['Film fan', 'Collect 10 film receipts'],
    'film-50': ['Cinephile', 'Collect 50 film receipts'],
    'together-1h': ['Good company', 'Play an hour with friends in the room'],
    'together-10h': ['Best friends', 'Play 10 hours with friends in the room'],
    'voice-100': ['Chatty counter', 'Serve 100 times while talking in voice'],
    'star-1': ['First star', 'Open a new cinema'],
    'cinema-3': ['Cinema chain', 'Open three new cinemas'],
    'all-stands': ['Full menu', 'Every stand at level 10'],
    'just-looking': ['Just looking', 'Watch an hour without serving anyone'],
    'tap-happy': ['Tap happy', 'Serve 2,000 times'],
    'popcorn-purist': ['Popcorn purist', 'Earn 10K coins with no soda fountain'],
  },
  tr: {
    'first-sale': ['İlk satış', 'İlk müşterine servis yap'],
    regular: ['Müdavimler', 'Gelen 10 müşteriye servis yap'],
    'full-house': ['Ful dolu', 'Gelen 100 müşteriye servis yap'],
    'rush-hour': ['Yoğun saat', '500 kez servis yap'],
    'popcorn-10': ['Patlıyor', 'Mısır makinesi 10. seviye'],
    'popcorn-50': ['Mısır ustası', 'Mısır makinesi 50. seviye'],
    'popcorn-100': ['Mısır efsanesi', 'Mısır makinesi 100. seviye'],
    'soda-1': ['Fıs', 'Gazozu al'],
    'soda-25': ['Köpüklü', 'Gazoz 25. seviye'],
    'nachos-1': ['Çıtır', 'Nachos’u al'],
    'nachos-25': ['Bol peynir', 'Nachos 25. seviye'],
    'candy-1': ['Tatlı dişli', 'Şeker kavanozunu al'],
    'candy-25': ['Şeker şoku', 'Şeker kavanozu 25. seviye'],
    'second-1': ['İkinci tezgâh', 'İkinci tezgâhı aç'],
    'second-25': ['Kalabalık büfe', 'İkinci tezgâh 25. seviye'],
    'coins-1k': ['Harçlık', 'Toplam 1K kazan'],
    'coins-1m': ['Milyoner', 'Toplam 1M kazan'],
    'coins-1b': ['Sinema patronu', 'Toplam 1B kazan'],
    'film-1': ['İlk fiş', 'Bir film fişi al'],
    'film-10': ['Film sever', '10 film fişi al'],
    'film-50': ['Sinefil', '50 film fişi al'],
    'together-1h': ['İyi arkadaş', 'Odada arkadaşlarla bir saat oyna'],
    'together-10h': ['Can dostlar', 'Odada arkadaşlarla 10 saat oyna'],
    'voice-100': ['Geveze tezgâh', 'Seste konuşurken 100 kez servis yap'],
    'star-1': ['İlk yıldız', 'Yeni bir sinema aç'],
    'cinema-3': ['Sinema zinciri', 'Üç yeni sinema aç'],
    'all-stands': ['Tam menü', 'Her stant 10. seviyede'],
    'just-looking': ['Sadece bakıyorum', 'Hiç servis yapmadan bir saat izle'],
    'tap-happy': ['Dokunmatik', '2.000 kez servis yap'],
    'popcorn-purist': ['Saf mısırcı', 'Gazoz almadan 10K kazan'],
  },
};
const badgeText = (id: string): [string, string] => BADGE_TEXT[lang() === 'tr' ? 'tr' : 'en'][id] ?? BADGE_TEXT.en[id] ?? [id, ''];

const CUSTOMER_COLORS = ['#ff9fc4', '#9ec3ff', '#ffd9a0', '#b9a0ff', '#8fe0b8', '#ffb38a'];
const HATS = ['', 'cap', 'beanie', 'bow'] as const;
/** A small walking guest, drawn here (our own art): a round head, a body, maybe a hat. */
function customerSvg(n: number): string {
  const body = CUSTOMER_COLORS[n % CUSTOMER_COLORS.length]!;
  const hat = HATS[Math.floor(n / CUSTOMER_COLORS.length) % HATS.length];
  const hats: Record<string, string> = {
    '': '',
    cap: '<path d="M17 13a9 9 0 0 1 18 0z" fill="#1a1036"/><rect x="30" y="11" width="9" height="3" rx="1.5" fill="#1a1036"/>',
    beanie: '<path d="M17 14a9 9 0 0 1 18 0z" fill="#e05a5a"/><circle cx="26" cy="4.5" r="2.5" fill="#fff3d6"/>',
    bow: '<path d="M30 8l5-3v6zM30 8l-5-3v6z" fill="#e05a5a"/>',
  };
  return `<svg viewBox="0 0 52 64" xmlns="http://www.w3.org/2000/svg"><path d="M10 64c0-16 7-26 16-26s16 10 16 26z" fill="${body}"/><circle cx="26" cy="20" r="11" fill="#ffe2c4"/><circle cx="22" cy="20" r="1.6" fill="#1a1036"/><circle cx="30" cy="20" r="1.6" fill="#1a1036"/><path d="M22.5 25q3.5 2.5 7 0" stroke="#1a1036" stroke-width="1.4" fill="none" stroke-linecap="round"/>${hats[hat ?? ''] ?? ''}</svg>`;
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

const PLACE_ICON: Record<PlaceId, string> = { lobby: '🎬', 'drive-in': '🚗', rooftop: '🌃', 'art-house': '🎭' };
const DECOR_ICON: Record<DecorId, string> = { marquee: '💡', poster: '🖼️', rope: '🎗️', neon: '🌟' };
/** Each place's backdrop and the decorations, drawn into the counter scene (340 × 110; our own art). */
const BACKDROPS: Record<Exclude<PlaceId, 'lobby'>, string> = {
  'drive-in':
    '<rect width="340" height="82" fill="#0b1640"/><g fill="#fff3d6"><circle cx="20" cy="10" r="1"/><circle cx="60" cy="22" r="1.2"/><circle cx="104" cy="8" r="1"/><circle cx="150" cy="30" r="1"/><circle cx="182" cy="12" r="1.3"/><circle cx="330" cy="40" r="1"/><circle cx="95" cy="40" r="0.8"/></g><rect x="100" y="4" width="92" height="38" rx="2" fill="#dfe8ff" opacity=".13"/><path d="M100 42 L192 42 L170 80 L122 80 Z" fill="#dfe8ff" opacity=".05"/><path d="M228 76 q4 -10 16 -10 h22 q10 0 14 10 z" fill="#050a22"/><circle cx="240" cy="78" r="3" fill="#050a22"/><circle cx="268" cy="78" r="3" fill="#050a22"/>',
  rooftop:
    '<rect width="340" height="82" fill="#2b1a4d"/><rect y="40" width="340" height="42" fill="#3d2160" opacity=".6"/><g fill="#140c2a"><rect x="96" y="46" width="18" height="36"/><rect x="116" y="34" width="14" height="48"/><rect x="132" y="52" width="22" height="30"/><rect x="156" y="40" width="12" height="42"/><rect x="170" y="56" width="26" height="26"/><rect x="300" y="44" width="16" height="38"/><rect x="318" y="52" width="22" height="30"/></g><g fill="#ffc65a" opacity=".7"><rect x="100" y="52" width="2" height="2"/><rect x="120" y="40" width="2" height="2"/><rect x="124" y="48" width="2" height="2"/><rect x="138" y="58" width="2" height="2"/><rect x="160" y="46" width="2" height="2"/><rect x="176" y="62" width="2" height="2"/><rect x="304" y="50" width="2" height="2"/><rect x="324" y="60" width="2" height="2"/></g><circle cx="186" cy="16" r="7" fill="#fff3d6" opacity=".8"/>',
  'art-house':
    '<rect width="340" height="82" fill="#2a0f1f"/><g fill="#ffc65a" opacity=".08"><circle cx="110" cy="12" r="2"/><circle cx="130" cy="26" r="2"/><circle cx="150" cy="12" r="2"/><circle cx="170" cy="26" r="2"/><circle cx="190" cy="12" r="2"/><circle cx="110" cy="40" r="2"/><circle cx="150" cy="40" r="2"/><circle cx="190" cy="40" r="2"/></g><path d="M0 0 H22 Q18 30 24 82 H0 Z" fill="#8a1f3a"/><path d="M6 0 V82 M14 0 Q11 40 16 82" stroke="#5a1024" stroke-width="2" fill="none"/><path d="M340 0 H318 Q322 30 316 82 H340 Z" fill="#8a1f3a"/><path d="M334 0 V82 M326 0 Q329 40 324 82" stroke="#5a1024" stroke-width="2" fill="none"/>',
};
const DECOR_ART: Record<DecorId, string> = {
  marquee: '<g class="sb-bulbs" fill="#ffe7a8">' + Array.from({ length: 12 }, (_, i) => `<circle cx="${204 + i * 10}" cy="8" r="1.8"/><circle cx="${204 + i * 10}" cy="34" r="1.8"/>`).join('') + '</g>',
  poster: '<rect x="152" y="6" width="34" height="40" rx="2" fill="#1a1036" stroke="#ffc65a" stroke-width="1.5"/><path d="M160 30 L169 18 A7 7 0 1 1 177 28 Z" fill="#ffc65a"/><circle cx="171" cy="22" r="1" fill="#1a1036"/><circle cx="175" cy="22" r="1" fill="#1a1036"/><rect x="156" y="38" width="26" height="3" rx="1.5" fill="#ff8f3a"/>',
  rope: '<g><rect x="6" y="84" width="4" height="22" rx="2" fill="#ffc65a"/><circle cx="8" cy="84" r="3" fill="#ffc65a"/><rect x="62" y="84" width="4" height="22" rx="2" fill="#ffc65a"/><circle cx="64" cy="84" r="3" fill="#ffc65a"/><path d="M9 88 Q36 104 63 88" stroke="#c0283f" stroke-width="3" fill="none"/></g>',
  neon: '<g class="sb-neon" fill="none" stroke="#ff8fd0" stroke-width="1.8" stroke-linejoin="round"><path d="M112 18 h24 l-3 22 h-18 z"/><path d="M114 18 q2 -7 7 -4 q3 -6 7 -1 q5 -3 6 5"/></g>',
};

const fmtRate = (rate: number) => formatCoins(rate < 10 ? Math.round(rate * 10) / 10 : rate);

export function mountSnackBar(root: HTMLElement, roomNow: () => SoloRoom): () => void {
  /** The room as the rules see it: a full tip jar this film adds its +10 % (pick 5). */
  const room = (): SoloRoom & { boost: boolean } => {
    const r = roomNow();
    return { ...r, boost: !!r.tipJar?.boost };
  };
  const tabId = Math.random().toString(36).slice(2);
  let game: SnackSave = loadSnack(load(SNACK_KEY));
  let stopped = false;
  let blocked = false;

  // ---- Header: coins, income, the room's state, the together bonus ----
  const coins = el('b', { class: 'sb-coins' });
  const rate = el('span', { class: 'sb-rate' });
  const state = el('span', { class: 'sb-pill sb-state' });
  const together = el('span', { class: 'sb-pill sb-together' });
  // The room's shared tip jar (pick 5): every serve drops a coin; full = +10 % for everyone this film.
  const jar = el('span', { class: 'sb-pill sb-jar' });
  let boosted = false;
  const head = el('div', { class: 'sb-head' }, art(coin, 'sb-coin'), coins, rate, el('span', { class: 'sb-gap' }), state, together, jar);

  // ---- The scene: a tap serves a customer ----
  const decorated = scene
    .replace('<svg ', '<svg preserveAspectRatio="xMidYMid slice" ')
    .replace('<g id="side-light">', `${Object.entries(BACKDROPS).map(([id, svg]) => `<g id="place-${id}" style="display:none">${svg}</g>`).join('')}<g id="side-light">`)
    .replace('</svg>', `${DECOR.map((d) => `<g id="decor-${d.id}" style="display:none">${DECOR_ART[d.id]}</g>`).join('')}</svg>`);
  const sceneArt = art(decorated, 'sb-scene-art');
  const secondBadge = el('span', { class: 'sb-second', 'aria-hidden': 'true' }, '×2');
  const sceneButton = el('button', { type: 'button', class: 'sb-scene' }, sceneArt, secondBadge);
  const pops = el('div', { class: 'sb-pops', 'aria-hidden': 'true' });
  // While the room's film does not play the counter is closed, and says so on the scene (owner, 4 Nov 2026).
  const restTitle = el('b', {});
  const restLine = el('small', {});
  const rest = el('span', { class: 'sb-rest', 'aria-hidden': 'true' }, restTitle, restLine);
  // Customers walk up to the counter (owner's pick 1): one at a time, while the film plays.
  const customers = el('div', { class: 'sb-customers' });
  const sceneBox = el('div', { class: 'sb-scene-box' }, sceneButton, customers, rest, pops);
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
      badges();
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
  const badgeButton = el('button', { type: 'button', class: 'sb-badges-open' });
  const foot = el('div', { class: 'sb-foot' }, cinema, badgeButton, prestige);

  // ---- The badge wall and the film's receipt: cards over the game ----
  const panel = el('div', { class: 'sb-panel', role: 'dialog' });
  panel.hidden = true;

  const note = el('p', { class: 'sb-note', role: 'status' });
  note.hidden = true;
  const elsewhere = el('div', { class: 'sb-elsewhere' }, el('p', {}), el('button', { type: 'button', class: 'btn small-btn primary' }));
  elsewhere.hidden = true;
  const box = el('div', { class: 'sb' }, head, sceneBox, list, more, foot, note, panel, elsewhere);
  root.replaceChildren(box);
  const how = howToPlay(box, 'snackBar:howSeen', () => [
    { art: how1, title: t('how1Title'), line: t('how1') },
    { art: how2, title: t('how2Title'), line: t('how2') },
    { art: how3, title: t('how3Title'), line: t('how3') },
    { art: how4, title: t('how4Title'), line: t('how4') },
  ]);
  const restart = restartButton(
    () => ({ label: t('restart'), title: t('restartAsk'), text: t('restartText'), yes: t('restart') }),
    () => {
      if (blocked || stopped) return;
      game = freshSnack();
      game.seen = Date.now();
      persist();
      draw();
    },
  );
  head.append(how.button);
  foot.insertBefore(restart, prestige);

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
    popAt(got, event.clientX, event.clientY);
    ctx.tip?.();
    badges();
    draw();
  });

  function popAt(coins: number, x: number, y: number): void {
    const r = sceneBox.getBoundingClientRect();
    const scale = r.width / sceneBox.offsetWidth || 1;
    const pop = el('span', { class: 'sb-pop' }, `+${formatCoins(coins)}`);
    pop.style.left = `${x ? (x - r.left) / scale : sceneBox.offsetWidth / 2}px`;
    pop.style.top = `${y ? (y - r.top) / scale : sceneBox.offsetHeight / 2}px`;
    pops.append(pop);
    setTimeout(() => pop.remove(), 900);
  }

  // ---- Customers ----
  /** Seconds until the next customer may come; the one waiting now and how long it stays. */
  // `snackBar:testGuests` = '1' (harnesses only) brings the first guest after 2 s.
  let nextCustomer = load('snackBar:testGuests') === '1' ? 2 : 12 + Math.random() * 14;
  let guest: { node: HTMLElement; left: number } | null = null;
  let guestCount = Math.floor(Math.random() * 24);
  function guestLeaves(happy: boolean): void {
    if (!guest) return;
    const node = guest.node;
    guest = null;
    node.classList.add(happy ? 'sb-guest-happy' : 'sb-guest-bye');
    setTimeout(() => node.remove(), 700);
    nextCustomer = 25 + Math.random() * 20;
  }
  function guestComes(ctx: SoloRoom): void {
    const mood = customerMood({ ...ctx, duration: ctx.item?.duration ?? 0 });
    const words = el('span', { class: 'sb-guest-line' }, line(mood));
    const figure = el('span', { class: 'sb-guest-figure', 'aria-hidden': 'true' });
    figure.innerHTML = customerSvg(guestCount++);
    const node = el('button', { type: 'button', class: 'sb-guest', 'aria-label': t('customer'), title: t('customer') }, words, figure);
    node.addEventListener('click', (event) => {
      event.stopPropagation();
      if (blocked || !guest || guest.node !== node) return;
      const ctx = room();
      const got = serveCustomer(game, ctx);
      if (!got) return;
      ctx.tip?.();
      playSound('snackServe');
      popAt(got, event.clientX, event.clientY);
      guestLeaves(true);
      badges();
      persist();
      draw();
    });
    customers.replaceChildren(node);
    guest = { node, left: 25 };
  }
  function customerTick(seconds: number, ctx: SoloRoom): void {
    if (guest) {
      guest.left -= seconds;
      if (guest.left <= 0 || !ctx.playing) guestLeaves(false);
      return;
    }
    if (!ctx.playing) return;
    nextCustomer -= seconds;
    if (nextCustomer <= 0) guestComes(ctx);
  }

  // ---- Badges (owner's pick 4) ----
  function badges(): void {
    for (const badge of checkBadges(game)) {
      playSound('snackMilestone');
      flash(t('badgeNew', { name: badgeText(badge.id)[0] }));
    }
  }
  function openBadges(): void {
    const detail = el('p', { class: 'sb-panel-line sb-badge-detail', role: 'status' }, t('badgeTap'));
    const cells = BADGES.map((b) => {
      const got = game.badges.includes(b.id);
      const [name, how] = badgeText(b.id);
      const cell = el(
        'button',
        { type: 'button', class: `sb-badge${got ? ' got' : ''}`, title: `${name} · ${how}`, 'aria-label': `${name}: ${how}${got ? ' ✓' : ''}` },
        el('span', { class: 'sb-badge-glyph', 'aria-hidden': 'true' }, b.glyph),
        b.bonus ? '' : el('i', { class: 'sb-badge-fun', 'aria-hidden': 'true' }, '✦'),
      );
      cell.addEventListener('click', () => {
        detail.textContent = `${got ? `${b.glyph} ` : ''}${name}: ${how}${b.bonus ? '' : ` (${t('badgeFun')})`}`;
      });
      return el('li', {}, cell);
    });
    const decor = DECOR.map((d) => {
      const owned = game.decor.includes(d.id);
      const label = el('span', {}, `${DECOR_ICON[d.id]} ${t(`decor.${d.id}`)}`);
      const buyButton = el('button', { type: 'button', class: `sb-decor-buy${owned ? ' owned' : ''}` }, owned ? t('decorOwned') : formatCoins(d.cost));
      buyButton.disabled = owned || game.coins < d.cost || blocked;
      buyButton.addEventListener('click', () => {
        if (!buyDecor(game, d.id)) return;
        playSound('snackBuy');
        persist();
        draw();
        openBadges();
      });
      return el('li', { class: 'sb-decor-item' }, label, buyButton);
    });
    showPanel(
      el('h3', { title: t('badgesLine', { n: Math.round(BADGE_BONUS * 100) }) }, `🏅 ${t('badgesTitle')} · ${game.badges.length}/${BADGES.length} · ${t('badgeEach', { n: Math.round(BADGE_BONUS * 100) })}`),
      el('ul', { class: 'sb-badge-grid' }, ...cells),
      detail,
      el('h3', { class: 'sb-decor-title', title: t('decorLine') }, t('decorTitle')),
      el('ul', { class: 'sb-decor' }, ...decor),
    );
  }
  badgeButton.addEventListener('click', () => (panel.hidden ? openBadges() : hidePanel()));

  function showPanel(...content: Node[]): void {
    const close = el('button', { type: 'button', class: 'sb-panel-close', 'aria-label': t('close'), title: t('close') }, '✕');
    close.addEventListener('click', hidePanel);
    panel.classList.remove('sb-panel-receipt');
    panel.replaceChildren(close, ...content);
    panel.hidden = false;
  }
  function hidePanel(): void {
    panel.hidden = true;
    panel.replaceChildren();
    showReceipt();
  }

  // ---- The film's receipt (owner's pick 2 B): when a film ends, Glowbeam hands it over ----
  /** The Test Lab's "the film's receipt now": this item counts as ended once. */
  let labEnd: string | null = null;
  function pendingReceipt(): Receipt | null {
    const ctx = room();
    const ends = takeFilmEnds().map((e) => e.id);
    if (labEnd) ends.push(labEnd);
    labEnd = null;
    const item = ctx.item;
    if (item && item.duration > 0 && item.position >= item.duration - 10) ends.push(item.id);
    for (const id of ends) {
      const receipt = receiptFor(game, id);
      if (receipt) return receipt;
    }
    return null;
  }
  function showReceipt(): void {
    if (!panel.hidden || blocked) return;
    const receipt = pendingReceipt();
    if (!receipt) return;
    const rowOf = (label: string, value: string) => el('li', {}, el('span', {}, label), el('b', {}, value));
    const collect = el('button', { type: 'button', class: 'sb-collect' }, t('receiptCollect', { n: formatCoins(receipt.bucket) }));
    collect.addEventListener('click', () => {
      const got = collectReceipt(game, receipt.item);
      if (got) {
        playSound('snackCinema');
        badges();
        persist();
      }
      hidePanel();
      draw();
    });
    const mascot = el('span', { class: 'sb-receipt-mascot', 'aria-hidden': 'true' });
    mascot.innerHTML = glowbeam.replace(/id="([^"]+)"/g, 'id="sbr-$1"').replace(/url\(#([^)]+)\)/g, 'url(#sbr-$1)');
    showPanel(
      el(
        'div',
        { class: 'sb-receipt' },
        mascot,
        el('h3', {}, `🧾 ${t('receiptTitle')}`),
        el(
          'ul',
          { class: 'sb-receipt-rows' },
          rowOf(t('receiptFilm'), t('minutes', { n: Math.max(1, Math.round(receipt.watched / 60)) })),
          rowOf(t('receiptServed'), String(receipt.served)),
          rowOf(t('receiptEarned'), formatCoins(receipt.coins)),
          rowOf(t('receiptBest'), t(`stand.${receipt.best}`)),
          rowOf(t('receiptBucket'), `+${formatCoins(receipt.bucket)}`),
        ),
        el('p', { class: 'sb-panel-line' }, t('receiptThanks')),
        collect,
      ),
    );
    panel.classList.add('sb-panel-receipt');
  }

  prestige.addEventListener('click', async () => {
    const stars = starsFor(game);
    if (blocked || stars < 1) return;
    const yes = await confirmDialog({ icon: '🎬', title: t('newCinema'), text: t('newCinemaAsk', { stars, bonus: Math.round(STAR_BONUS * 100) }), yes: t('newCinemaYes') });
    if (!yes || stopped || !newCinema(game)) return;
    playSound('snackCinema');
    persist();
    draw();
    flash(t('placeOpen', { n: game.cinemas + 1, place: t(`place.${placeOf(game)}`), twist: t(`twist.${placeOf(game)}`) }), 7000);
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
    const tipJar = ctx.tipJar;
    jar.hidden = !tipJar;
    if (tipJar) {
      jar.textContent = tipJar.boost ? t('jarBoost') : t('jar', { n: Math.min(99, Math.round((tipJar.fill / tipJar.size) * 100)) });
      jar.title = t('jarTitle');
      jar.classList.toggle('on', tipJar.boost);
    }
    if (tipJar?.boost && !boosted) {
      flash(t('jarFull'));
      playSound('snackMilestone');
    }
    boosted = !!tipJar?.boost;
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
    // This cinema's place and the decorations bought.
    const place = placeOf(game);
    for (const id of Object.keys(BACKDROPS)) {
      const node = group(`place-${id}`);
      if (node) node.style.display = id === place ? '' : 'none';
    }
    const signText = group('sign')?.querySelector('text');
    if (signText && signText.textContent !== t(`sign.${place}`)) signText.textContent = t(`sign.${place}`);
    for (const d of DECOR) {
      const node = group(`decor-${d.id}`);
      if (node) node.style.display = game.decor.includes(d.id) ? '' : 'none';
    }
    const shown = shownRows(compact);
    rows.forEach((row, i) => {
      const stand = STANDS[i]!;
      const level = game.levels[stand.id];
      const open = unlocked(game, stand.id);
      const price = costOf(stand.id, level, 1, placeCost(game, stand.id));
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
    cinema.textContent = t('cinemaShort', { icon: PLACE_ICON[placeOf(game)], n: game.cinemas + 1, stars: game.stars });
    cinema.title = `${t('cinema', { n: game.cinemas + 1, stars: game.stars })} · ${t(`place.${placeOf(game)}`)}: ${t(`twist.${placeOf(game)}`)}`;
    badgeButton.textContent = t('badges', { n: game.badges.length, all: BADGES.length });
    badgeButton.title = t('badgesTitle');
    const stars = starsFor(game);
    prestige.textContent = stars > 0 ? t('newCinemaStars', { stars }) : t('newCinemaButton');
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
    const ctx = room();
    // The Test Lab's "time ×10" runs the same tick more often (each one is still capped like a real second).
    const times = labTicks();
    for (let i = 0; i < times; i++) tick(game, seconds, ctx);
    customerTick(seconds * times, ctx);
    if (ticks % 5 === 0) badges();
    showReceipt();
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
  // A film that ended while the game was closed or minimized: its receipt waits here.
  showReceipt();

  // ---- 🐞 Test Lab (card DL3): cheats on a sandbox copy; "Restore my real saves" puts the real save back ----
  const onRestore = () => {
    game = loadSnack(load(SNACK_KEY));
    draw();
  };
  addEventListener(RESTORE_EVENT, onRestore);
  const where = 'Snack Bar open';
  const offLab = registerSideLab(
    'snackBar',
    'snackBar',
    () => [
      {
        id: 'snackBar.coins',
        title: 'Snack Bar: +10K coins',
        help: 'Adds coins to the sandbox save (arg: how many).',
        tab: 'games',
        where,
        run: (arg) => {
          const n = Number(arg) > 0 ? Math.min(1e15, Number(arg)) : 10_000;
          game.coins += n;
          game.earned += n;
          game.lifetime += n;
          persist();
          draw();
          return formatCoins(game.coins);
        },
      },
      {
        id: 'snackBar.customer',
        title: 'Snack Bar: a customer now',
        help: 'A customer walks up at once (the film must play, or "pretend the film plays").',
        tab: 'games',
        where,
        available: () => (guest ? 'a customer is already waiting' : room().playing || 'the film does not play'),
        run: () => guestComes(room()),
      },
      {
        id: 'snackBar.receipt',
        title: "Snack Bar: the film's receipt now",
        help: "Counts this film as watched and ended, so Glowbeam hands over its receipt.",
        tab: 'games',
        where,
        run: () => {
          const item = room().item?.id ?? 'lab-film';
          const film = game.film?.item === item ? game.film : null;
          game.film = { item, watched: Math.max(RECEIPT_MIN_S, film?.watched ?? 0), served: film?.served ?? 0, coins: film?.coins ?? 0 };
          game.receipts = game.receipts.filter((r) => r !== item);
          labEnd = item;
          showReceipt();
          return item;
        },
      },
      {
        id: 'snackBar.badges',
        title: 'Snack Bar: every badge',
        help: 'Earns all badges on the wall (each still adds its +1 %).',
        tab: 'games',
        where,
        run: () => {
          game.badges = BADGES.map((b) => b.id);
          persist();
          draw();
          return `${game.badges.length} badges`;
        },
      },
      {
        id: 'snackBar.place',
        title: 'Snack Bar: the next cinema place',
        help: 'Moves to the next place (lobby, drive-in, rooftop, art house…) without the prestige cost.',
        tab: 'games',
        where,
        run: () => {
          game.cinemas += 1;
          persist();
          draw();
          return placeOf(game);
        },
      },
    ],
    () => [['Snack Bar', `${formatCoins(game.coins)} coins · ${placeOf(game)} · ${game.badges.length} badges`]],
  );

  return () => {
    how.destroy();
    if (stopped) return;
    stopped = true;
    offLab();
    removeEventListener(RESTORE_EVENT, onRestore);
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
