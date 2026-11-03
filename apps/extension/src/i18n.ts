// Eklentinin kendi birkaç metni (popup, "İzlemeye başla" kartı, video seçme düğmeleri); asıl arayüz sitenin kendisi.
// Dil sitedekiyle aynı: site seçimi eklentinin deposuna (`site:lang`, bkz. store.ts) yazar. Varsayılan Türkçe.

import { readValue } from './store.ts';

const tr = {
  autoplayBlocked: 'Tarayıcın videoyu kendiliğinden başlatmadı.',
  startPlayback: '▶ İzlemeye başla',
  popupIntro: 'Arkadaşlarınla her sitedeki videoyu aynı anda izle. Sitemizde oda kur ya da bir odaya katıl; film sayfasına gidince oda kendiliğinden açılır.',
  popupOpen: "Sidelit'i aç",
  popupInRoom: 'Bu sekme bir odada: oda, film sayfasının üstünde açık.',
  popupBack: '🏠 Odayı ayrı sekmede aç',
  popupSite: 'Zaten sitedesin: oda kur ya da bir linkle katıl.',
  popupRoomOpen: 'Başka bir sekmede açık bir odan var.',
  popupToRoom: '🏠 Odama dön',
  pickThis: '🎯 Bunu senkronla',
  pickCurrent: '✓ Şu an senkronlanan',
  pickLength: '{n} dk',
};

const en: typeof tr = {
  autoplayBlocked: "Your browser didn't start the video on its own.",
  startPlayback: '▶ Start watching',
  popupIntro: 'Watch videos on any site together with friends. Create or join a room on our site; when you go to the film page, the room opens by itself.',
  popupOpen: 'Open Sidelit',
  popupInRoom: 'This tab is in a room: the room is open over the film page.',
  popupBack: '🏠 Open the room in a new tab',
  popupSite: "You're already on the site: create a room or join with a link.",
  popupRoomOpen: 'You have a room open in another tab.',
  popupToRoom: '🏠 Back to my room',
  pickThis: '🎯 Sync this one',
  pickCurrent: '✓ Currently synced',
  pickLength: '{n} min',
};

export type Key = keyof typeof tr;
let dict: typeof tr = en;

export const langReady: Promise<void> = readValue('lang')
  .then((lang) => {
    // English unless Turkish was chosen on the site (owner, 2 Nov 2026).
    dict = lang === 'tr' ? tr : en;
  })
  .catch(() => {});

export function t(key: Key): string {
  return dict[key];
}
