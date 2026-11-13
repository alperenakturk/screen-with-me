// 🍿 Snack Bar, the solo side game (docs/internal/archive/cards-done.md "Snack Bar"; look: the owner's pick A "counter scene", art in
// `./art/snack-bar/` from `docs/internal/design/side-games/snack-bar/`). The rules are `@swm/shared/games/snack-bar`;
// this file draws them and ticks them once a second with the room's state (`room()`). A lazy chunk with its own
// stylesheet, loaded only when the game opens. It never takes the room's keys or the focus: its buttons don't keep
// the focus after a click (so 1–8, Enter, P, V still reach the room), and it has no key handlers of its own.

import './snack-bar.css';
import { gameHint } from './hint.ts';
import {
  BADGES, BADGE_BONUS, DECOR, MENU_BONUS, MENU_LEVEL, MILESTONES, RECIPE_IDS, STAFF, USHER_DELAY_S, buyDecor, buyRecipe, dayNumber, globalFactor, hire, menuFactor,
  placeOf, placeCost, recipeInfo, recipesOpen, specialOf, standIncome, type DecorId, type PlaceId, type RecipeId, type StaffId, SNACK_KEY, STANDS, STAR_BONUS,
  PRESTIGE_MIN, affordable, buy, checkBadges, collectReceipt, costOf, customerMood, receiptFor, serveCustomer, formatCoins as formatCoinsIn, freshSnack, incomeRate,
  RECEIPT_MIN_S, loadSnack, milestoneFactor, newCinema, nextMilestone, saveSnack, serve, starsFor, tick,
  togetherFactor, unlocked, type CustomerMood, type Receipt, type SnackSave, type StandId,
  SEASON_BADGE_LEVEL, SEASON_BONUS, SEASON_GLYPH, SEASON_LEVELS, buySeason, managerReport, rollSeason, seasonCost, seasonDaysLeft, seasonLevel,
  seasonOf, seasonWeek,
} from '@swm/shared/games/snack-bar';
import { el } from '../dom.ts';
import { lang } from '../i18n.ts';
import { playSound } from '../sound.ts';
import type { SoundId } from '@swm/shared/sound-policy';
import { load, save } from '../storage.ts';
import { confirmDialog } from '../ui/confirm.ts';
import scene from './art/snack-bar/counter-scene.svg?raw';
import coin from './art/snack-bar/coin.svg?raw';
import popcorn from './art/snack-bar/popcorn-machine.svg?raw';
import soda from './art/snack-bar/soda.svg?raw';
import nachos from './art/snack-bar/nachos.svg?raw';
import candy from './art/snack-bar/candy.svg?raw';
import second from './art/snack-bar/second-counter.svg?raw';
import hotdog from './art/snack-bar/hotdog.svg?raw';
import iceCream from './art/snack-bar/ice-cream.svg?raw';
import arcade from './art/snack-bar/arcade.svg?raw';
import how1 from './art/tutorial/snack-1-earn.svg?raw';
import how2 from './art/tutorial/snack-2-tap.svg?raw';
import how3 from './art/tutorial/snack-3-stands.svg?raw';
import how4 from './art/tutorial/snack-4-friends.svg?raw';
import { howToPlay, restartButton } from './how-to-play.ts';
import { stubArt } from './stub.ts';
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
    how3: 'Levels 10, 25, 50, 100, 200, 300 and 400 double a stand; recipes double it too. Lower stands stay worth levelling.',
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
    'stand.hotdog': 'Hot dog grill',
    'stand.ice-cream': 'Ice cream cart',
    'stand.arcade': 'Arcade corner',
    buyMode: 'How many to buy',
    buyOne: '×1',
    buyTen: '×10',
    buyMax: 'Max',
    buyCount: 'Buy {n} for {price}',
    special: '⭐ ×2 today',
    specialTitle: "Today's special: this stand earns ×2 until midnight (UTC).",
    menuMark: '📋',
    menuTitle: 'Level {n} or more: this stand counts for the menu bonus.',
    upgrades: '📜 Upgrades',
    upgradesTitle: 'Recipes and staff',
    recipesTitle: '📜 Recipes',
    recipesLine: 'Each recipe doubles one stand. New ones open at stand levels 5, 25 and 75.',
    recipesNone: 'No recipe to buy yet: level a stand to 5.',
    recipeDoubles: '×2 {stand}',
    staffTitle: '🧑‍🍳 Staff',
    staffLine: 'Hired once, they stay with you in every cinema.',
    staffHired: '✓ Hired',
    menuBonus: '📋 Menu bonus: +{n} % ({count} stands at level {level}+)',
    menuBonusNone: '📋 Menu bonus: +{bonus} % for each stand at level {level} or more',
    'staff.tip-box': 'Tip box',
    'staffWhat.tip-box': 'A tap on the counter pays 2 seconds of income.',
    'staff.usher': 'Usher',
    'staffWhat.usher': 'Serves a waiting customer for you after a few seconds.',
    'staff.long-line': 'Longer line',
    'staffWhat.long-line': 'Customers come twice as often.',
    'staff.manager': 'Manager',
    'staffWhat.manager': 'Every customer pays twice as much.',
    ushered: '🧑‍💼 The usher served a customer',
    'recipe.popcorn:1': 'Real butter',
    'recipe.popcorn:2': 'Caramel glaze',
    'recipe.popcorn:3': 'Truffle salt',
    'recipe.soda:1': 'Bigger cups',
    'recipe.soda:2': 'Free refills',
    'recipe.soda:3': 'Craft syrups',
    'recipe.nachos:1': 'Extra cheese',
    'recipe.nachos:2': 'Jalapeños',
    'recipe.nachos:3': 'Loaded tray',
    'recipe.candy:1': 'Pick and mix',
    'recipe.candy:2': 'Chocolate box',
    'recipe.candy:3': 'Gold wrappers',
    'recipe.second-counter:1': 'Express lane',
    'recipe.second-counter:2': 'Card reader',
    'recipe.second-counter:3': 'Night shift',
    'recipe.hotdog:1': 'Mustard bar',
    'recipe.hotdog:2': 'Toasted buns',
    'recipe.hotdog:3': 'Chili dogs',
    'recipe.ice-cream:1': 'Waffle cones',
    'recipe.ice-cream:2': 'Sprinkles',
    'recipe.ice-cream:3': 'Sundae bar',
    'recipe.arcade:1': 'Claw machine',
    'recipe.arcade:2': 'High-score board',
    'recipe.arcade:3': 'Prize wall',
    'level': 'Lv {n} · +{rate}/s',
    'new': 'New · +{rate}/s',
    'locked': '🔒 Opens with the {name}',
    'buy': 'Buy for {price}',
    'milestone': 'Lv {n}: income ×2',
    'more': '+{n} more when the window is bigger',
    'cinema': 'Cinema #{n} · ★ {stars}',
    cinemaShort: '{icon} Cinema {n} · ★ {stars}',
    'place.lobby': 'The lobby',
    'place.drive-in': 'Drive-in',
    'place.rooftop': 'Rooftop cinema',
    'place.art-house': 'Art house',
    'place.seaside': 'Seaside cinema',
    'place.planetarium': 'Planetarium',
    'twist.lobby': 'Where it all started.',
    'twist.drive-in': 'Under the stars: soda earns ×2.',
    'twist.rooftop': 'Up on the roof: +25 % income from 20:00 to 04:00.',
    'twist.art-house': 'Fancy sweets: candy earns ×3 and costs ×2.',
    'twist.seaside': 'By the sea: every customer pays ×2.',
    'twist.planetarium': 'A quiet dome: +25 % income while you watch alone.',
    'sign.lobby': 'SNACK BAR',
    'sign.drive-in': 'DRIVE-IN',
    'sign.rooftop': 'ROOFTOP',
    'sign.art-house': 'ART HOUSE',
    'sign.seaside': 'SEASIDE',
    'sign.planetarium': 'PLANETARIUM',
    placeOpen: 'Cinema #{n}: {place}. {twist}',
    decorTitle: '🎨 Decorations',
    decorLine: 'Looks only. Yours for good, in every cinema.',
    'decor.marquee': 'Marquee lights',
    'decor.poster': 'Stub poster',
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
    // NG2: the seasonal stand and the manager's report.
    'season.cocoa': 'Hot cocoa',
    'season.lemonade': 'Lemonade',
    'season.cotton-candy': 'Cotton candy',
    'season.caramel-apple': 'Caramel apples',
    seasonTitle: "This week's stand",
    seasonLine: 'Each level adds {bonus} % to all your income until the week ends. Level {badge} earns its badge.',
    seasonLevel: 'Lv {n}/{max}: +{bonus} % income',
    seasonNew: 'New this week',
    seasonDays: '{n} days left',
    seasonLastDay: 'last day',
    seasonTop: 'Top level',
    seasonArrived: '{glyph} New this week: {name}! Find it under Upgrades.',
    reportTitle: "📋 Manager's report",
    reportSold: 'Sold most',
    reportNext: 'Buy next',
    reportStand: '{stand}, level {n}',
    reportSeason: '{stand}, level {n} (this week)',
    reportNone: 'Save up for now',
  },
  tr: {
    how1Title: 'Oda izlerken kazan',
    how1: 'Büfen yalnızca bir odadayken, odanın videosu oynarken kazanır. Sen yokken hiçbir şey değişmez.',
    how2Title: 'Dokun, servis yap',
    how2: 'Fazladan bir jeton için tezgâha dokun. Bir müşteri gelince ona dokun, daha çok kazan.',
    how3Title: 'Stant al, seviye atlat',
    how3: '10, 25, 50, 100, 200, 300 ve 400. seviyeler standı iki katına çıkarır; tarifler de öyle. Alttaki stantlar da geliştirmeye değer.',
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
    'stand.hotdog': 'Sosisli ızgarası',
    'stand.ice-cream': 'Dondurma arabası',
    'stand.arcade': 'Oyun köşesi',
    buyMode: 'Kaç tane alınsın',
    buyOne: '×1',
    buyTen: '×10',
    buyMax: 'Hepsi',
    buyCount: '{price} karşılığında {n} tane al',
    special: '⭐ bugün ×2',
    specialTitle: 'Günün fırsatı: bu stant gece yarısına (UTC) kadar ×2 kazandırır.',
    menuMark: '📋',
    menuTitle: '{n}. seviye ve üstü: bu stant menü bonusuna sayılır.',
    upgrades: '📜 Gelişmeler',
    upgradesTitle: 'Tarifler ve çalışanlar',
    recipesTitle: '📜 Tarifler',
    recipesLine: 'Her tarif bir standı iki katına çıkarır. Yenileri stant 5, 25 ve 75. seviyede açılır.',
    recipesNone: 'Alınacak tarif yok: bir standı 5. seviyeye çıkar.',
    recipeDoubles: '{stand} ×2',
    staffTitle: '🧑‍🍳 Çalışanlar',
    staffLine: 'Bir kez işe alınır, her sinemada seninle kalır.',
    staffHired: '✓ İşe alındı',
    menuBonus: '📋 Menü bonusu: +%{n} ({level}+ seviyede {count} stant)',
    menuBonusNone: '📋 Menü bonusu: {level}. seviye ve üstündeki her stant için +%{bonus}',
    'staff.tip-box': 'Bahşiş kutusu',
    'staffWhat.tip-box': 'Tezgâha her dokunuş 2 saniyelik gelir kazandırır.',
    'staff.usher': 'Yer gösterici',
    'staffWhat.usher': 'Bekleyen müşteriye birkaç saniye sonra senin yerine servis yapar.',
    'staff.long-line': 'Uzun kuyruk',
    'staffWhat.long-line': 'Müşteriler iki kat sık gelir.',
    'staff.manager': 'Müdür',
    'staffWhat.manager': 'Her müşteri iki kat öder.',
    ushered: '🧑‍💼 Yer gösterici bir müşteriye servis yaptı',
    'recipe.popcorn:1': 'Gerçek tereyağı',
    'recipe.popcorn:2': 'Karamel kaplama',
    'recipe.popcorn:3': 'Trüflü tuz',
    'recipe.soda:1': 'Büyük bardaklar',
    'recipe.soda:2': 'Bedava dolum',
    'recipe.soda:3': 'Özel şuruplar',
    'recipe.nachos:1': 'Bol peynir',
    'recipe.nachos:2': 'Jalapeño',
    'recipe.nachos:3': 'Dolu tabak',
    'recipe.candy:1': 'Karışık şeker',
    'recipe.candy:2': 'Çikolata kutusu',
    'recipe.candy:3': 'Altın ambalaj',
    'recipe.second-counter:1': 'Hızlı kasa',
    'recipe.second-counter:2': 'Kart okuyucu',
    'recipe.second-counter:3': 'Gece vardiyası',
    'recipe.hotdog:1': 'Hardal barı',
    'recipe.hotdog:2': 'Kızarmış ekmek',
    'recipe.hotdog:3': 'Acılı sosisli',
    'recipe.ice-cream:1': 'Waffle külah',
    'recipe.ice-cream:2': 'Renkli şekerleme',
    'recipe.ice-cream:3': 'Sundae barı',
    'recipe.arcade:1': 'Pençe makinesi',
    'recipe.arcade:2': 'Rekor tablosu',
    'recipe.arcade:3': 'Ödül duvarı',
    'level': 'Sev. {n} · +{rate}/sn',
    'new': 'Yeni · +{rate}/sn',
    'locked': '🔒 {name} ile açılır',
    'buy': '{price} karşılığında al',
    'milestone': 'Sev. {n}: gelir ×2',
    'more': 'Pencere büyüyünce +{n} tane daha',
    'cinema': '{n}. sinema · ★ {stars}',
    cinemaShort: '{icon} {n}. sinema · ★ {stars}',
    'place.lobby': 'Lobi',
    'place.drive-in': 'Arabalı sinema',
    'place.rooftop': 'Çatı sineması',
    'place.art-house': 'Sanat sineması',
    'place.seaside': 'Sahil sineması',
    'place.planetarium': 'Planetaryum',
    'twist.lobby': 'Her şeyin başladığı yer.',
    'twist.drive-in': 'Yıldızların altında: gazoz ×2 kazandırır.',
    'twist.rooftop': 'Çatıda: 20.00 ile 04.00 arası gelir +%25.',
    'twist.art-house': 'Şık tatlılar: şeker ×3 kazandırır, fiyatı ×2.',
    'twist.seaside': 'Deniz kenarında: her müşteri ×2 öder.',
    'twist.planetarium': 'Sessiz kubbe: tek başına izlerken gelir +%25.',
    'sign.lobby': 'BÜFE',
    'sign.drive-in': 'ARABALI',
    'sign.rooftop': 'ÇATI',
    'sign.art-house': 'SANAT',
    'sign.seaside': 'SAHİL',
    'sign.planetarium': 'PLANETARYUM',
    placeOpen: '{n}. sinema: {place}. {twist}',
    decorTitle: '🎨 Süsler',
    decorLine: 'Sadece görünüş. Her sinemada kalıcı olarak senin.',
    'decor.marquee': 'Tabela ışıkları',
    'decor.poster': 'Stub afişi',
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
    'season.cocoa': 'Sıcak kakao',
    'season.lemonade': 'Limonata',
    'season.cotton-candy': 'Pamuk şeker',
    'season.caramel-apple': 'Karamelli elma',
    seasonTitle: 'Bu haftanın standı',
    seasonLine: 'Her seviye hafta bitene kadar bütün gelirine %{bonus} ekler. {badge}. seviye rozetini kazandırır.',
    seasonLevel: 'Sev. {n}/{max}: gelir +%{bonus}',
    seasonNew: 'Bu hafta yeni',
    seasonDays: '{n} gün kaldı',
    seasonLastDay: 'son gün',
    seasonTop: 'En üst seviye',
    seasonArrived: '{glyph} Bu hafta yeni: {name}! Gelişmeler’de.',
    reportTitle: '📋 Müdürün raporu',
    reportSold: 'En çok satan',
    reportNext: 'Sıradaki alım',
    reportStand: '{stand}, {n}. seviye',
    reportSeason: '{stand}, {n}. seviye (bu hafta)',
    reportNone: 'Şimdilik biriktir',
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
    'hotdog-1': ['Sizzle', 'Buy the hot dog grill'],
    'ice-cream-1': ['Brain freeze', 'Buy the ice cream cart'],
    'arcade-1': ['Player one', 'Open the arcade corner'],
    'first-recipe': ['Secret recipe', 'Buy your first recipe'],
    'head-chef': ['Head chef', 'Have 12 recipes in one cinema'],
    'full-staff': ['Full crew', 'Hire every member of staff'],
    'big-menu': ['Big menu', 'Five stands at level 25'],
    'season-cocoa': ['Cocoa season', 'Hot cocoa stand level 5 in its week'],
    'season-lemonade': ['Lemonade season', 'Lemonade stand level 5 in its week'],
    'season-cotton-candy': ['Cotton candy season', 'Cotton candy stand level 5 in its week'],
    'season-caramel-apple': ['Caramel apple season', 'Caramel apple stand level 5 in its week'],
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
    'hotdog-1': ['Cızırtı', 'Sosisli ızgarasını al'],
    'ice-cream-1': ['Beyin dondu', 'Dondurma arabasını al'],
    'arcade-1': ['Birinci oyuncu', 'Oyun köşesini aç'],
    'first-recipe': ['Gizli tarif', 'İlk tarifini al'],
    'head-chef': ['Baş aşçı', 'Bir sinemada 12 tarifin olsun'],
    'full-staff': ['Tam ekip', 'Bütün çalışanları işe al'],
    'big-menu': ['Zengin menü', 'Beş stant 25. seviyede'],
    'season-cocoa': ['Kakao mevsimi', 'Sıcak kakao standı kendi haftasında 5. seviye'],
    'season-lemonade': ['Limonata mevsimi', 'Limonata standı kendi haftasında 5. seviye'],
    'season-cotton-candy': ['Pamuk şeker mevsimi', 'Pamuk şeker standı kendi haftasında 5. seviye'],
    'season-caramel-apple': ['Karamelli elma mevsimi', 'Karamelli elma standı kendi haftasında 5. seviye'],
  },
};
const badgeText = (id: string): [string, string] => BADGE_TEXT[lang() === 'tr' ? 'tr' : 'en'][id] ?? BADGE_TEXT.en[id] ?? [id, ''];

const CUSTOMER_COLORS = ['#ff9fc4', '#9ec3ff', '#ffd9a0', '#b9a0ff', '#8fe0b8', '#ffb38a', '#7fd6e0'];
/** Skin tones for the guests (SB3: more variety). */
const SKINS = ['#ffe2c4', '#f1c7a0', '#d9a06e', '#a8714a', '#7a4a2c'];
const HATS = ['', 'cap', 'beanie', 'bow', 'glasses', 'headphones', 'party'] as const;
/** A small walking guest, drawn here (our own art): a round head, a body, maybe a hat. */
function customerSvg(n: number): string {
  const body = CUSTOMER_COLORS[n % CUSTOMER_COLORS.length]!;
  const hat = HATS[Math.floor(n / CUSTOMER_COLORS.length) % HATS.length];
  const hats: Record<string, string> = {
    '': '',
    cap: '<path d="M17 13a9 9 0 0 1 18 0z" fill="#1a1036"/><rect x="30" y="11" width="9" height="3" rx="1.5" fill="#1a1036"/>',
    beanie: '<path d="M17 14a9 9 0 0 1 18 0z" fill="#e05a5a"/><circle cx="26" cy="4.5" r="2.5" fill="#fff3d6"/>',
    bow: '<path d="M30 8l5-3v6zM30 8l-5-3v6z" fill="#e05a5a"/>',
    glasses: '<g fill="none" stroke="#1a1036" stroke-width="1.3"><circle cx="22" cy="20" r="3.2"/><circle cx="30" cy="20" r="3.2"/><path d="M25.2 20h1.6"/></g>',
    headphones: '<path d="M15 21a11 11 0 0 1 22 0" fill="none" stroke="#1a1036" stroke-width="2.4"/><rect x="12.5" y="18" width="4" height="7" rx="2" fill="#e05a5a"/><rect x="35.5" y="18" width="4" height="7" rx="2" fill="#e05a5a"/>',
    party: '<path d="M21 10 L26 -1 L31 10 Z" fill="#ffc65a"/><circle cx="26" cy="-1" r="1.8" fill="#ff8fd0"/><path d="M23 6 h6" stroke="#ff8fd0" stroke-width="1.2"/>',
  };
  const skin = SKINS[(n * 7) % SKINS.length];
  return `<svg viewBox="0 0 52 64" xmlns="http://www.w3.org/2000/svg" overflow="visible"><path d="M10 64c0-16 7-26 16-26s16 10 16 26z" fill="${body}"/><circle cx="26" cy="20" r="11" fill="${skin}"/><circle cx="22" cy="20" r="1.6" fill="#1a1036"/><circle cx="30" cy="20" r="1.6" fill="#1a1036"/><path d="M22.5 25q3.5 2.5 7 0" stroke="#1a1036" stroke-width="1.4" fill="none" stroke-linecap="round"/>${hats[hat ?? ''] ?? ''}</svg>`;
}

const ART: Record<StandId, string> = { popcorn, soda, nachos, candy, 'second-counter': second, hotdog, 'ice-cream': iceCream, arcade };
/** Scene groups shown once their stand has a level (the second counter has no group: a badge instead). */
const SCENE_GROUP: Partial<Record<StandId, string>> = {
  popcorn: 'popcorn-machine', soda: 'soda', nachos: 'nachos', candy: 'candy', hotdog: 'hotdog', 'ice-cream': 'ice-cream', arcade: 'arcade',
};
const STAFF_ICON: Record<StaffId, string> = { 'tip-box': '🫙', usher: '🧑‍💼', 'long-line': '🚶', manager: '👔' };
/** Buy one level, ten, or as many as the coins allow. */
type BuyMode = 1 | 10 | 'max';
const BUY_MODE_KEY = 'snackBar:buyMode';
/** Below this height (in the game's own pixels) only three upgrade rows show. */
const COMPACT_H = 470;
const ROWS_COMPACT = 3;
/** Room kept for the "+N more" line when fitting the rows. */
const MORE_RESERVE = 20;
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

const PLACE_ICON: Record<PlaceId, string> = { lobby: '🎬', 'drive-in': '🚗', rooftop: '🌃', 'art-house': '🎭', seaside: '🏖️', planetarium: '🔭' };
const DECOR_ICON: Record<DecorId, string> = { marquee: '💡', poster: '🖼️', rope: '🎗️', neon: '🌟' };
/** Each place's backdrop and the decorations, drawn into the counter scene (340 × 110; our own art). */
const BACKDROPS: Record<Exclude<PlaceId, 'lobby'>, string> = {
  'drive-in':
    '<rect width="340" height="82" fill="#0b1640"/><g fill="#fff3d6"><circle cx="20" cy="10" r="1"/><circle cx="60" cy="22" r="1.2"/><circle cx="104" cy="8" r="1"/><circle cx="150" cy="30" r="1"/><circle cx="182" cy="12" r="1.3"/><circle cx="330" cy="40" r="1"/><circle cx="95" cy="40" r="0.8"/></g><rect x="100" y="4" width="92" height="38" rx="2" fill="#dfe8ff" opacity=".13"/><path d="M100 42 L192 42 L170 80 L122 80 Z" fill="#dfe8ff" opacity=".05"/><path d="M228 76 q4 -10 16 -10 h22 q10 0 14 10 z" fill="#050a22"/><circle cx="240" cy="78" r="3" fill="#050a22"/><circle cx="268" cy="78" r="3" fill="#050a22"/>',
  rooftop:
    '<rect width="340" height="82" fill="#2b1a4d"/><rect y="40" width="340" height="42" fill="#3d2160" opacity=".6"/><g fill="#140c2a"><rect x="96" y="46" width="18" height="36"/><rect x="116" y="34" width="14" height="48"/><rect x="132" y="52" width="22" height="30"/><rect x="156" y="40" width="12" height="42"/><rect x="170" y="56" width="26" height="26"/><rect x="300" y="44" width="16" height="38"/><rect x="318" y="52" width="22" height="30"/></g><g fill="#ffc65a" opacity=".7"><rect x="100" y="52" width="2" height="2"/><rect x="120" y="40" width="2" height="2"/><rect x="124" y="48" width="2" height="2"/><rect x="138" y="58" width="2" height="2"/><rect x="160" y="46" width="2" height="2"/><rect x="176" y="62" width="2" height="2"/><rect x="304" y="50" width="2" height="2"/><rect x="324" y="60" width="2" height="2"/></g><circle cx="186" cy="16" r="7" fill="#fff3d6" opacity=".8"/>',
  seaside:
    '<rect width="340" height="82" fill="#ff9f6b"/><rect width="340" height="40" fill="#ffb98a"/><circle cx="150" cy="44" r="16" fill="#ffe08a"/><rect y="46" width="340" height="36" fill="#2b6f9e"/><g stroke="#9fd3f0" stroke-width="1.4" stroke-linecap="round" opacity=".7"><path d="M20 56 h18 M70 62 h24 M120 54 h16 M168 64 h22 M220 57 h18 M262 66 h20 M300 58 h16"/></g><path d="M0 76 Q60 70 120 76 T240 76 T340 76 V82 H0 Z" fill="#f2d39a"/><path d="M300 76 V30" stroke="#5a3a24" stroke-width="3"/><path d="M300 30 q-16 -2 -24 8 M300 30 q-12 -10 -22 -8 M300 30 q14 -10 24 -4 M300 30 q16 0 22 10" stroke="#3d8f5a" stroke-width="3.5" fill="none" stroke-linecap="round"/>',
  planetarium:
    '<rect width="340" height="82" fill="#0a0e2a"/><path d="M40 82 Q170 -30 300 82 Z" fill="#141a44"/><g fill="#fff3d6"><circle cx="90" cy="40" r="1.2"/><circle cx="112" cy="26" r="1"/><circle cx="140" cy="18" r="1.4"/><circle cx="168" cy="30" r="1"/><circle cx="196" cy="14" r="1.2"/><circle cx="220" cy="34" r="1.3"/><circle cx="246" cy="46" r="1"/><circle cx="128" cy="56" r=".9"/><circle cx="206" cy="58" r=".9"/></g><path d="M112 26 L140 18 L168 30 L196 14 L220 34" stroke="#9ec3ff" stroke-opacity=".45" stroke-width=".8" fill="none"/><circle cx="270" cy="22" r="7" fill="#ffb38a"/><ellipse cx="270" cy="22" rx="12" ry="3" fill="none" stroke="#ffe08a" stroke-width="1.2" transform="rotate(-18 270 22)"/>',
  'art-house':
    '<rect width="340" height="82" fill="#2a0f1f"/><g fill="#ffc65a" opacity=".08"><circle cx="110" cy="12" r="2"/><circle cx="130" cy="26" r="2"/><circle cx="150" cy="12" r="2"/><circle cx="170" cy="26" r="2"/><circle cx="190" cy="12" r="2"/><circle cx="110" cy="40" r="2"/><circle cx="150" cy="40" r="2"/><circle cx="190" cy="40" r="2"/></g><path d="M0 0 H22 Q18 30 24 82 H0 Z" fill="#8a1f3a"/><path d="M6 0 V82 M14 0 Q11 40 16 82" stroke="#5a1024" stroke-width="2" fill="none"/><path d="M340 0 H318 Q322 30 316 82 H340 Z" fill="#8a1f3a"/><path d="M334 0 V82 M326 0 Q329 40 324 82" stroke="#5a1024" stroke-width="2" fill="none"/>',
};
const DECOR_ART: Record<DecorId, string> = {
  marquee: '<g class="sb-bulbs" fill="#ffe7a8">' + Array.from({ length: 12 }, (_, i) => `<circle cx="${204 + i * 10}" cy="8" r="1.8"/><circle cx="${204 + i * 10}" cy="34" r="1.8"/>`).join('') + '</g>',
  poster: '<rect x="152" y="6" width="34" height="40" rx="2" fill="#1a1036" stroke="#ffc65a" stroke-width="1.5"/><path d="M160 30 L169 18 A7 7 0 1 1 177 28 Z" fill="#ffc65a"/><circle cx="171" cy="22" r="1" fill="#1a1036"/><circle cx="175" cy="22" r="1" fill="#1a1036"/><rect x="156" y="38" width="26" height="3" rx="1.5" fill="#ff8f3a"/>',
  rope: '<g><rect x="6" y="84" width="4" height="22" rx="2" fill="#ffc65a"/><circle cx="8" cy="84" r="3" fill="#ffc65a"/><rect x="62" y="84" width="4" height="22" rx="2" fill="#ffc65a"/><circle cx="64" cy="84" r="3" fill="#ffc65a"/><path d="M9 88 Q36 104 63 88" stroke="#c0283f" stroke-width="3" fill="none"/></g>',
  neon: '<g class="sb-neon" fill="none" stroke="#ff8fd0" stroke-width="1.8" stroke-linejoin="round"><path d="M112 18 h24 l-3 22 h-18 z"/><path d="M114 18 q2 -7 7 -4 q3 -6 7 -1 q5 -3 6 5"/></g>',
};

/** NG2: each stand's own short sound when it reaches a milestone. */
const STAND_SOUND: Record<StandId, SoundId> = {
  popcorn: 'snackPop', soda: 'snackFizz', nachos: 'snackCrunch', candy: 'snackCandy',
  'second-counter': 'snackBell', hotdog: 'snackSizzle', 'ice-cream': 'snackScoop', arcade: 'snackArcade',
};

/** QA2 (13): coin amounts in the page's language (Turkish: 0,5 · 6 B · 1,2 Mn). */
const formatCoins = (value: number) => formatCoinsIn(value, lang());
const fmtRate = (rate: number) => formatCoins(rate < 10 ? Math.round(rate * 10) / 10 : rate);

export function mountSnackBar(root: HTMLElement, roomNow: () => SoloRoom): () => void {
  /** The room as the rules see it: a full tip jar this film adds its +10 % (pick 5). */
  /** NG2: the Test Lab can move the week on (`snackBar.season`). */
  let labWeeks = 0;
  const week = () => seasonWeek(dayNumber()) + labWeeks;
  const room = (): SoloRoom & { boost: boolean; special: StandId; week: number } => {
    const r = roomNow();
    return { ...r, boost: !!r.tipJar?.boost, special: specialOf(dayNumber()), week: week() };
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
    .replace('</svg>', `${DECOR.map((d) => `<g id="decor-${d.id}" style="display:none">${DECOR_ART[d.id]}</g>`).join('')}</svg>`)
    // NG2: the shop front (wall, counter, its stripes) takes the place's colours (`.sb[data-place]` in snack-bar.css).
    .replace('stop-color="#2b1a4a"', 'style="stop-color:var(--sb-wall-a,#2b1a4a)"')
    .replace('stop-color="#171030"', 'style="stop-color:var(--sb-wall-b,#171030)"')
    .replace('fill="#120b26"', 'style="fill:var(--sb-shelf,#120b26)"')
    .replace('stop-color="#7a4a2c" stop-opacity="1"', 'style="stop-color:var(--sb-counter-a,#7a4a2c)"')
    .replace('stop-color="#3e2418" stop-opacity="1"', 'style="stop-color:var(--sb-counter-b,#3e2418)"')
    .replace('fill="#c0283f"', 'style="fill:var(--sb-stripe,#c0283f)"');
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

  // ---- Buy ×1 / ×10 / Max and the Upgrades panel (SB3) ----
  const savedMode = load(BUY_MODE_KEY);
  let mode: BuyMode = savedMode === '10' ? 10 : savedMode === 'max' ? 'max' : 1;
  const modeButtons = ([1, 10, 'max'] as BuyMode[]).map((m) => {
    const b = el('button', { type: 'button', class: 'sb-mode', 'data-mode': String(m), 'aria-pressed': 'false' });
    b.addEventListener('click', () => {
      mode = m;
      save(BUY_MODE_KEY, String(m));
      draw();
    });
    return b;
  });
  const modes = el('div', { class: 'sb-modes', role: 'group' }, ...modeButtons);
  const upgradesButton = el('button', { type: 'button', class: 'sb-upgrades-open' });
  const buyBar = el('div', { class: 'sb-buybar' }, modes, el('span', { class: 'sb-gap' }), upgradesButton);
  /** How many levels a press buys now (0: not even one is affordable). */
  function countFor(id: StandId): number {
    if (mode === 'max') return affordable(game, id);
    return affordable(game, id, mode) >= mode ? mode : 0;
  }

  // ---- Upgrade rows ----
  interface Row { id: StandId; node: HTMLElement; level: HTMLElement; bar: HTMLElement; price: HTMLButtonElement; name: HTMLElement; tag: HTMLElement }
  const rows: Row[] = STANDS.map((stand) => {
    const name = el('b', { class: 'sb-name' });
    const tag = el('span', { class: 'sb-tag' });
    const level = el('small', { class: 'sb-level' });
    const bar = el('span', { class: 'sb-bar-fill' });
    const price = el('button', { type: 'button', class: 'sb-price' });
    const node = el(
      'li',
      { class: 'sb-row', 'data-stand': stand.id },
      art(ART[stand.id], 'sb-icon'),
      el('span', { class: 'sb-row-text' }, el('span', { class: 'sb-name-line' }, name, tag), level, el('span', { class: 'sb-bar' }, bar)),
      price,
    );
    price.addEventListener('click', () => {
      const before = game.levels[stand.id];
      const count = countFor(stand.id);
      if (blocked || count < 1 || !buy(game, stand.id, count)) return;
      const level = game.levels[stand.id];
      playSound(milestoneFactor(level) > milestoneFactor(before) ? STAND_SOUND[stand.id] : 'snackBuy');
      node.classList.remove('sb-bought');
      void node.offsetWidth;
      node.classList.add('sb-bought');
      badges();
      persist();
      draw();
    });
    return { id: stand.id, node, level, bar, price, name, tag };
  });
  const list = el('ul', { class: 'sb-rows' }, ...rows.map((r) => r.node));

  function openUpgrades(): void {
    const menuCount = STANDS.filter((st) => game.levels[st.id] >= MENU_LEVEL).length;
    const menuLine = el(
      'p',
      { class: 'sb-panel-line sb-menu-line' },
      menuCount > 0
        ? t('menuBonus', { n: Math.round((menuFactor(game) - 1) * 100), count: menuCount, level: MENU_LEVEL })
        : t('menuBonusNone', { bonus: Math.round(MENU_BONUS * 100), level: MENU_LEVEL }),
    );
    const open = recipesOpen(game);
    const recipeRows = open.map((id) => {
      const info = recipeInfo(game, id);
      const buyButton = el('button', { type: 'button', class: 'sb-up-buy' }, art(coin, 'sb-coin small'), formatCoins(info.price));
      buyButton.disabled = blocked || game.coins < info.price;
      buyButton.title = t('buy', { price: formatCoins(info.price) });
      buyButton.addEventListener('click', () => {
        if (blocked || !buyRecipe(game, id)) return;
        playSound('snackMilestone');
        badges();
        persist();
        draw();
        openUpgrades();
      });
      return el(
        'li',
        { class: 'sb-up', 'data-recipe': id },
        art(ART[info.stand], 'sb-icon small'),
        el('span', { class: 'sb-up-text' }, el('b', {}, t(`recipe.${id}` as TextKey)), el('small', {}, t('recipeDoubles', { stand: t(`stand.${info.stand}` as TextKey) }))),
        buyButton,
      );
    });
    const staffRows = STAFF.map((member) => {
      const hired = game.staff.includes(member.id);
      const hireButton = el('button', { type: 'button', class: `sb-up-buy${hired ? ' owned' : ''}` }, ...(hired ? [t('staffHired')] : [art(coin, 'sb-coin small'), formatCoins(member.cost)]));
      hireButton.disabled = hired || blocked || game.coins < member.cost;
      hireButton.addEventListener('click', () => {
        if (blocked || !hire(game, member.id)) return;
        playSound('snackMilestone');
        badges();
        persist();
        draw();
        openUpgrades();
      });
      return el(
        'li',
        { class: 'sb-up', 'data-staff': member.id },
        el('span', { class: 'sb-up-icon', 'aria-hidden': 'true' }, STAFF_ICON[member.id]),
        el('span', { class: 'sb-up-text' }, el('b', {}, t(`staff.${member.id}` as TextKey)), el('small', {}, t(`staffWhat.${member.id}` as TextKey))),
        hireButton,
      );
    });
    // NG2: this week's seasonal stand on top.
    const w = week();
    const sid = seasonOf(w);
    const sLevel = seasonLevel(game, w);
    const sPrice = seasonCost(game, w);
    const sDays = seasonDaysLeft(dayNumber() + labWeeks * 7);
    const seasonButton = el(
      'button',
      { type: 'button', class: `sb-up-buy${sPrice === null ? ' owned' : ''}` },
      ...(sPrice === null ? [t('seasonTop')] : [art(coin, 'sb-coin small'), formatCoins(sPrice)]),
    );
    seasonButton.disabled = sPrice === null || blocked || game.coins < sPrice;
    if (sPrice !== null) seasonButton.title = t('buy', { price: formatCoins(sPrice) });
    seasonButton.addEventListener('click', () => {
      if (blocked || !buySeason(game, week())) return;
      playSound(seasonLevel(game, week()) === SEASON_BADGE_LEVEL ? 'snackMilestone' : 'snackBuy');
      badges();
      persist();
      draw();
      openUpgrades();
    });
    const seasonRow = el(
      'li',
      { class: 'sb-up sb-season', 'data-season': sid, title: t('seasonLine', { bonus: Math.round(SEASON_BONUS * 100), badge: SEASON_BADGE_LEVEL }) },
      el('span', { class: 'sb-up-icon', 'aria-hidden': 'true' }, SEASON_GLYPH[sid]),
      el(
        'span',
        { class: 'sb-up-text' },
        el('b', {}, `${t(`season.${sid}` as TextKey)} · ${sDays > 1 ? t('seasonDays', { n: sDays }) : t('seasonLastDay')}`),
        el('small', {}, sLevel > 0 ? t('seasonLevel', { n: sLevel, max: SEASON_LEVELS, bonus: Math.round(sLevel * SEASON_BONUS * 100) }) : t('seasonNew')),
      ),
      seasonButton,
    );
    showPanel(
      el('h3', {}, t('upgradesTitle')),
      el('h4', { class: 'sb-up-title', title: t('seasonLine', { bonus: Math.round(SEASON_BONUS * 100), badge: SEASON_BADGE_LEVEL }) }, t('seasonTitle')),
      el('ul', { class: 'sb-up-list' }, seasonRow),
      menuLine,
      el('h4', { class: 'sb-up-title', title: t('recipesLine') }, t('recipesTitle')),
      open.length ? el('ul', { class: 'sb-up-list' }, ...recipeRows) : el('p', { class: 'sb-panel-line' }, t('recipesNone')),
      el('h4', { class: 'sb-up-title', title: t('staffLine') }, t('staffTitle')),
      el('ul', { class: 'sb-up-list' }, ...staffRows),
    );
    panel.classList.add('sb-panel-upgrades');
  }
  upgradesButton.addEventListener('click', () => (panel.hidden ? openUpgrades() : hidePanel()));
  /** Something in the Upgrades panel can be bought now (a dot on its button). */
  const upgradeReady = () => {
    if (blocked) return false;
    const seasonPrice = seasonCost(game, week());
    return (
      recipesOpen(game).some((id) => recipeInfo(game, id).price <= game.coins) ||
      STAFF.some((m) => !game.staff.includes(m.id) && m.cost <= game.coins) ||
      (seasonPrice !== null && seasonPrice <= game.coins)
    );
  };
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
  const box = el('div', { class: 'sb' }, head, sceneBox, buyBar, list, more, foot, note, panel, elsewhere);
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

  const hint = gameHint(note);
  const flash = (text: string, ms = 5000) => hint.show(text, ms);

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
    // The longer line (staff, SB3) brings them twice as often.
    nextCustomer = (25 + Math.random() * 20) / (game.staff.includes('long-line') ? 2 : 1);
  }
  /** Serves the waiting customer (a tap, or the usher). */
  function serveGuest(x = 0, y = 0, byUsher = false): void {
    if (blocked || !guest) return;
    const ctx = room();
    const got = serveCustomer(game, ctx);
    if (!got) return;
    ctx.tip?.();
    playSound('snackServe');
    popAt(got, x, y);
    guestLeaves(true);
    if (byUsher) flash(t('ushered'), 2200);
    badges();
    persist();
    draw();
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
      serveGuest(event.clientX, event.clientY);
    });
    customers.replaceChildren(node);
    guest = { node, left: 25 };
  }
  function customerTick(seconds: number, ctx: SoloRoom): void {
    if (guest) {
      guest.left -= seconds;
      if (!ctx.playing) guestLeaves(false);
      // The usher (staff, SB3) serves a customer who waited a few seconds.
      else if (game.staff.includes('usher') && 25 - guest.left >= USHER_DELAY_S) serveGuest(0, 0, true);
      else if (guest.left <= 0) guestLeaves(false);
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
    panel.classList.remove('sb-panel-receipt', 'sb-panel-upgrades');
    panel.replaceChildren(close, ...content);
    panel.hidden = false;
  }
  function hidePanel(): void {
    panel.hidden = true;
    panel.replaceChildren();
    showReceipt();
  }

  // ---- The film's receipt (owner's pick 2 B): when a film ends, Stub hands it over ----
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
    /** NG2: the manager's report: what sold most and the best buy now (the fastest payback). */
    function reportOf(): HTMLElement {
      const report = managerReport(game, week());
      const sold = report.top.map((x) => `${t(`stand.${x.id}`)} ${Math.round(x.share * 100)} %`).join(' · ');
      const next = report.next;
      const nextText = !next
        ? t('reportNone')
        : next.kind === 'stand'
          ? t('reportStand', { stand: t(`stand.${next.id}`), n: next.level })
          : next.kind === 'recipe'
            ? t(`recipe.${next.id}` as TextKey)
            : t('reportSeason', { stand: t(`season.${next.id}` as TextKey), n: next.level });
      return el(
        'section',
        { class: 'sb-report' },
        el('h4', {}, t('reportTitle')),
        el(
          'ul',
          { class: 'sb-receipt-rows' },
          rowOf(t('reportSold'), sold || '–'),
          el('li', { 'data-next': next?.kind ?? 'none' }, el('span', {}, t('reportNext')), el('b', {}, next ? `${nextText} · ${formatCoins(next.price)}` : nextText)),
        ),
      );
    }
    // MASCOT3: Stub hands the receipt over, cheering.
    const mascot = stubArt('win', 'sb-receipt-mascot');
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
          rowOf(t('receiptBucket'), `+${formatCoins(receipt.bucket)}`),
        ),
        reportOf(),
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

  /**
   * Which rows show: the open stands and the next locked one (SB3: eight stands; a stand two steps away stays out of
   * sight), at most `room` of them, the newest first to stay. `room` is worked out from the window's height (`fitRows`).
   */
  function shownRows(room: number): Set<StandId> {
    const firstLocked = STANDS.findIndex((s) => !unlocked(game, s.id));
    const openEnd = firstLocked < 0 ? STANDS.length : firstLocked;
    // QA2 (5): when rows are short, the locked "next" stand gives way first, then the oldest open ones (a sideways
    // phone hid the only stand I could buy and kept the locked one).
    const openShown = Math.min(openEnd, Math.max(1, room));
    const ids = STANDS.slice(openEnd - openShown, openEnd).map((s) => s.id);
    if (firstLocked >= 0 && room > openShown) ids.push(STANDS[firstLocked]!.id);
    return new Set(ids);
  }

  let compact = false;
  /** How many rows fit (SB3): the window's height minus everything but the list, over one row's height. */
  let rowRoom = STANDS.length;
  function draw(): void {
    const ctx = room();
    const income = incomeRate(game, ctx);
    const bonus = Math.round((togetherFactor(ctx) - 1) * 100);
    coins.textContent = formatCoins(game.coins);
    coins.title = t('coinsTitle');
    rate.textContent = t('rate', { n: fmtRate(income) });
    // GW play-through: with the others' bonus and the tip jar beside it, "▶ Film on" was cut to "▶ Film a…" in Turkish:
    // while the film plays the pill is just ▶ (its name is its label and tooltip).
    state.textContent = ctx.playing ? '▶' : t('paused');
    state.setAttribute('aria-label', ctx.playing ? t('playing') : t('paused'));
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
    box.dataset.place = place;
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
    const shown = shownRows(rowRoom);
    const special = ctx.special;
    const factor = globalFactor(game);
    for (const b of modeButtons) {
      const m = b.dataset.mode;
      b.textContent = m === '10' ? t('buyTen') : m === 'max' ? t('buyMax') : t('buyOne');
      b.setAttribute('aria-pressed', String(m === String(mode)));
    }
    modes.setAttribute('aria-label', t('buyMode'));
    upgradesButton.textContent = t('upgrades');
    upgradesButton.title = t('upgradesTitle');
    upgradesButton.classList.toggle('ready', upgradeReady());
    rows.forEach((row, i) => {
      const stand = STANDS[i]!;
      const level = game.levels[stand.id];
      const open = unlocked(game, stand.id);
      const factorPrice = placeCost(game, stand.id);
      const count = open ? countFor(stand.id) : 0;
      // The price shown: what this press buys (×1, ×10, or the most I can afford; one level when that is none yet).
      const shownCount = count || (mode === 10 ? 10 : 1);
      const price = costOf(stand.id, level, shownCount, factorPrice);
      const next = nextMilestone(level);
      const last = [0, ...MILESTONES].filter((m) => m <= level).pop() ?? 0;
      row.node.hidden = !shown.has(stand.id);
      row.node.classList.toggle('locked', !open);
      row.node.classList.toggle('special', open && special === stand.id);
      row.name.textContent = t(`stand.${stand.id}`);
      const tags = [special === stand.id ? t('special') : '', level >= MENU_LEVEL ? t('menuMark') : ''].filter(Boolean).join(' ');
      row.tag.textContent = tags;
      row.tag.hidden = !tags;
      row.tag.title = [special === stand.id ? t('specialTitle') : '', level >= MENU_LEVEL ? t('menuTitle', { n: MENU_LEVEL }) : ''].filter(Boolean).join(' ');
      const income = (lv: number) => standIncome({ ...game, levels: { ...game.levels, [stand.id]: lv } }, stand.id, special) * factor;
      row.level.textContent = open
        ? level > 0
          ? t('level', { n: level, rate: fmtRate(income(level)) })
          : t('new', { rate: fmtRate(income(1)) })
        : t('locked', { name: t(`stand.${STANDS[i - 1]?.id ?? stand.id}`) });
      row.bar.style.width = `${next ? Math.round(((level - last) / (next - last)) * 100) : 100}%`;
      row.bar.parentElement!.title = next ? t('milestone', { n: next }) : '';
      row.price.replaceChildren(art(coin, 'sb-coin small'), mode === 'max' && count > 1 ? `×${count} ` : mode === 10 ? '×10 ' : '', formatCoins(price));
      row.price.disabled = !open || count < 1 || blocked;
      row.price.title = open ? t('buyCount', { n: shownCount, price: formatCoins(price) }) : t('locked', { name: t(`stand.${STANDS[i - 1]?.id ?? stand.id}`) });
    });
    const openCount = STANDS.filter((st) => unlocked(game, st.id)).length + (STANDS.some((st) => !unlocked(game, st.id)) ? 1 : 0);
    const hidden = Math.max(0, openCount - shown.size);
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
  // NG2: a new week brings a new seasonal stand (the old one leaves; its badge stays).
  let shownWeek = week();
  function newWeek(now: number): void {
    if (now === shownWeek) return;
    shownWeek = now;
    rollSeason(game, now);
    const id = seasonOf(now);
    flash(t('seasonArrived', { glyph: SEASON_GLYPH[id], name: t(`season.${id}` as TextKey) }), 6000);
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
    newWeek(ctx.week);
    // The Test Lab's "time ×10" runs the same tick more often (each one is still capped like a real second).
    const times = labTicks();
    for (let i = 0; i < times; i++) tick(game, seconds, ctx);
    customerTick(seconds * times, ctx);
    if (ticks % 5 === 0) badges();
    showReceipt();
    if (++ticks % SAVE_EVERY === 0) persist();
    draw();
  }, 1000);

  /** Rows that fit the window (SB3): never a scrollbar; the rest is the "+N more" line. */
  function fitRows(): void {
    // The window scales the game down when it overflows (stage.ts `refit`, `--fit`), which makes the game's own box
    // taller: count in the window's real pixels, or more rows would bring more scaling, round and round.
    const stage = root.closest<HTMLElement>('#game-stage');
    const scale = Math.min(1, parseFloat(stage ? getComputedStyle(stage).getPropertyValue('--fit') : '') || 1);
    const height = root.clientHeight * scale;
    const first = rows.find((r) => !r.node.hidden)?.node;
    if (!height || !first) return;
    const gap = parseFloat(getComputedStyle(list).rowGap) || 0;
    const rowH = first.offsetHeight + gap;
    // Everything but the list and the "+N more" line, which gets a fixed reserve (so showing it never changes the sum).
    const others = box.scrollHeight - list.offsetHeight - (more.hidden ? 0 : more.offsetHeight) + MORE_RESERVE;
    const next = Math.max(ROWS_COMPACT, Math.min(STANDS.length, Math.floor((height - others + gap) / rowH)));
    if (next !== rowRoom) {
      rowRoom = next;
      draw();
    }
  }
  const fit = new ResizeObserver(() => {
    const next = root.clientHeight > 0 && root.clientHeight < COMPACT_H;
    if (next !== compact) {
      compact = next;
      draw();
    }
    fitRows();
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
  const where = { en: 'Snack Bar open', tr: 'Büfe açıkken' };
  const offLab = registerSideLab(
    'snackBar',
    'snackBar',
    () => [
      {
        id: 'snackBar.coins',
        title: { en: 'Snack Bar: +10K coins', tr: 'Büfe: +10B jeton' },
        help: { en: 'Adds coins to the sandbox save (arg: how many).', tr: 'Deneme kaydına jeton ekler; jeton sayısı hemen artar (bir sayı yazarsan o kadar).' },
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
        title: { en: 'Snack Bar: a customer now', tr: 'Büfe: hemen bir müşteri gelsin' },
        help: { en: 'A customer walks up at once (the film must play, or "pretend the film plays").', tr: 'Bir müşteri hemen tezgâha gelir (film oynamalı ya da "film oynuyormuş gibi yap" açık olmalı).' },
        tab: 'games',
        where,
        available: () => (guest ? { en: 'a customer is already waiting', tr: 'zaten bir müşteri bekliyor' } : room().playing || { en: 'the film does not play', tr: 'film oynamıyor' }),
        run: () => guestComes(room()),
      },
      {
        id: 'snackBar.receipt',
        title: { en: "Snack Bar: the film's receipt now", tr: 'Büfe: filmin fişi şimdi gelsin' },
        help: { en: "Counts this film as watched and ended, so Stub hands over its receipt.", tr: 'Bu filmi izlenmiş ve bitmiş sayar; Stub fişini hemen getirir.' },
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
        id: 'snackBar.report',
        title: { en: "Snack Bar: the manager's report now", tr: 'Büfe: müdürün raporu şimdi gelsin' },
        help: { en: "The film's receipt with the manager's report (what sold most, what to buy next).", tr: 'Müdürün raporuyla filmin fişi (en çok satan, sıradaki alım).' },
        tab: 'games',
        where,
        run: () => {
          const item = room().item?.id ?? 'lab-film';
          game.film = { item, watched: Math.max(RECEIPT_MIN_S, game.film?.item === item ? game.film.watched : 0), served: game.film?.served ?? 0, coins: game.film?.coins ?? 0 };
          game.receipts = game.receipts.filter((r) => r !== item);
          labEnd = item;
          hidePanel();
          showReceipt();
          const next = managerReport(game, week()).next;
          return next ? `${next.kind} ${next.id}` : 'none';
        },
      },
      {
        id: 'snackBar.season',
        title: { en: 'Snack Bar: next week’s seasonal stand', tr: 'Büfe: sonraki haftanın mevsim standı' },
        help: { en: 'Moves the game a week on: this week’s stand leaves and the next one comes (sandbox save), then opens Upgrades.', tr: 'Oyunu bir hafta ileri alır: bu haftanın standı gider, sıradaki gelir (deneme kaydı), sonra Gelişmeler’i açar.' },
        tab: 'games',
        where,
        run: () => {
          labWeeks += 1;
          newWeek(week());
          draw();
          hidePanel();
          openUpgrades();
          return seasonOf(week());
        },
      },
      {
        id: 'snackBar.badges',
        title: { en: 'Snack Bar: every badge', tr: 'Büfe: bütün rozetler' },
        help: { en: 'Earns all badges on the wall (each still adds its +1 %).', tr: 'Duvardaki bütün rozetleri kazandırır (her biri yine +%1 ekler).' },
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
        id: 'snackBar.upgrades',
        title: { en: 'Snack Bar: every open recipe and all staff', tr: 'Büfe: açık bütün tarifler ve bütün çalışanlar' },
        help: { en: 'Buys the recipes open now and hires all staff for free (sandbox save), then opens the Upgrades panel.', tr: 'Şu an açık tarifleri alır ve bütün çalışanları bedavaya işe alır (deneme kaydı), sonra Gelişmeler panelini açar.' },
        tab: 'games',
        where,
        run: () => {
          game.coins += 1e30;
          for (let i = 0; i < RECIPE_IDS.length; i++) for (const id of recipesOpen(game)) buyRecipe(game, id);
          for (const m of STAFF) hire(game, m.id);
          game.coins = Math.max(0, game.coins - 1e30);
          persist();
          draw();
          openUpgrades();
          return `${game.recipes.length} recipes · ${game.staff.length} staff`;
        },
      },
      {
        id: 'snackBar.levels',
        title: { en: 'Snack Bar: every stand to level 30', tr: 'Büfe: bütün stantlar 30. seviyeye' },
        help: { en: 'Opens all eight stands at level 30 (the menu bonus and the first two recipes open).', tr: 'Sekiz standın hepsini 30. seviyede açar (menü bonusu ve ilk iki tarif açılır).' },
        tab: 'games',
        where,
        run: () => {
          for (const st of STANDS) game.levels[st.id] = Math.max(game.levels[st.id], 30);
          persist();
          draw();
          fitRows();
          return STANDS.map((st) => game.levels[st.id]).join('/');
        },
      },
      {
        // LAB2 (hand test G15): one press away from a stand's own milestone sound.
        id: 'snackBar.milestone',
        title: { en: 'Snack Bar: one level before the next milestone', tr: 'Büfe: sonraki eşiğe bir seviye kala' },
        help: {
          en: 'The popcorn machine goes to one level below its next milestone (10, 25, 50 …) with the coins for one more level: buy it (×1) and hear its own sound.',
          tr: 'Mısır makinesi sonraki eşiğinin (10, 25, 50 …) bir seviye altına gelir, bir seviyelik de jeton verilir: ×1 ile al ve kendi sesini duy.',
        },
        tab: 'games',
        where,
        run: () => {
          const next = nextMilestone(game.levels.popcorn) ?? MILESTONES[MILESTONES.length - 1]!;
          game.levels.popcorn = Math.max(1, next - 1);
          game.coins += costOf('popcorn', game.levels.popcorn, 1, placeCost(game, 'popcorn'));
          persist();
          draw();
          return { en: `popcorn ${game.levels.popcorn} → ${next}`, tr: `mısır ${game.levels.popcorn} → ${next}` };
        },
      },
      {
        id: 'snackBar.place',
        title: { en: 'Snack Bar: the next cinema place', tr: 'Büfe: sıradaki sinema yeri' },
        help: { en: 'Moves to the next place (lobby, drive-in, rooftop, art house, seaside, planetarium) without the prestige cost.', tr: 'Bedel ödemeden sıradaki yere geçer (lobi, arabalı sinema, çatı, sanat sineması, sahil, planetaryum).' },
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
    () => [[{ en: 'Snack Bar', tr: 'Büfe' }, { en: `${formatCoins(game.coins)} coins · ${placeOf(game)} · ${game.badges.length} badges`, tr: `${formatCoins(game.coins)} jeton · ${placeOf(game)} · ${game.badges.length} rozet` }]],
  );

  return () => {
    how.destroy();
    if (stopped) return;
    stopped = true;
    offLab();
    removeEventListener(RESTORE_EVENT, onRestore);
    clearInterval(timer);
    hint.hide();
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
