// Eklentinin kendi birkaç metni (popup, "İzlemeye başla" kartı, video seçme düğmeleri); asıl arayüz sitenin kendisi.
// Dil sitedekiyle aynı: site seçimi eklentinin deposuna (`site:lang`, bkz. store.ts) yazar. Varsayılan Türkçe.

import { readValue } from './store.ts';

const tr = {
  autoplayBlocked: 'Tarayıcı videoyu kendiliğinden başlatmadı.',
  startPlayback: '▶ İzlemeye başla',
  popupIntro: 'ScreenWithMe ile arkadaşlarınla her sitedeki videoyu aynı anda izle. Oda kur ya da bir odaya katıl, film sitesine gidince oda görünümü kendiliğinden gelir.',
  popupOpen: "ScreenWithMe'yi aç",
  popupInRoom: 'Bu sekme bir odada: film sitesinin üstünde oda görünümü açık.',
  popupBack: '🏠 Odaya dön',
  popupSite: 'Zaten sitedesin: oda kur ya da bir linkle katıl.',
  pickThis: '🎯 Bunu senkronla',
  pickCurrent: '✓ Şu an senkronlanan',
  pickLength: '{n} dk',
};

const en: typeof tr = {
  autoplayBlocked: "The browser didn't start the video by itself.",
  startPlayback: '▶ Start watching',
  popupIntro: 'Watch any video on any site together with friends. Create or join a room; on the film site, room view appears by itself.',
  popupOpen: 'Open ScreenWithMe',
  popupInRoom: 'This tab is in a room: room view is shown over the film site.',
  popupBack: '🏠 Back to the room',
  popupSite: "You're already on the site: create a room or join with a link.",
  pickThis: '🎯 Sync this one',
  pickCurrent: '✓ Currently synced',
  pickLength: '{n} min',
};

export type Key = keyof typeof tr;
let dict: typeof tr = tr;

export const langReady: Promise<void> = readValue('lang')
  .then((lang) => {
    dict = lang === 'en' ? en : tr;
  })
  .catch(() => {});

export function t(key: Key): string {
  return dict[key];
}
