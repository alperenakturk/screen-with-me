// Sadece ScreenWithMe sitesinde çalışır.
// 1) Siteye "eklenti kurulu" der.
// 2) Site "bu sekme şu odaya katılsın" derse eklentiye iletir; eklenti sekmeyi
//    odaya bağlayıp odanın açık olduğu sayfaya kendisi götürür.
// 3) Sitede yazdığın ismi eklentiye aktarır; eklentide tekrar sorulmaz.

import { CLIENT_ID, isAvatar } from '@swm/shared/protocol';
import { SITE_MESSAGE_SOURCE, type SiteJoinMessage } from './messages.ts';

document.documentElement.dataset.swmExtension = chrome.runtime.getManifest().version;

addEventListener('message', (event: MessageEvent) => {
  // Sadece sitenin kendi sayfasından gelen mesajlar.
  if (event.source !== window || event.origin !== location.origin) return;
  const data = event.data as { source?: string; type?: string; roomId?: unknown } | null;
  if (data?.source !== SITE_MESSAGE_SOURCE || data.type !== 'join' || typeof data.roomId !== 'string') return;
  syncName();
  void chrome.runtime.sendMessage({ type: 'site-join', roomId: data.roomId } satisfies SiteJoinMessage);
});

/** Sitede seçilen isim ve avatarı eklentiye aktarır. */
function syncName(): void {
  let name: string | null = null;
  let avatar: string | null = null;
  let cid: string | null = null;
  try {
    name = localStorage.getItem('name');
    avatar = localStorage.getItem('avatar');
    cid = localStorage.getItem('cid');
  } catch {
    return;
  }
  const update: Record<string, string> = {};
  if (name) update.name = name;
  if (avatar && isAvatar(avatar)) update.avatar = avatar;
  // Sitedeki kalıcı kimlik: siteden film sayfasına geçen oda yöneticisi yönetici kalsın.
  if (cid && CLIENT_ID.test(cid)) update.cid = cid;
  if (Object.keys(update).length) void chrome.storage.local.set(update);
}

syncName();
addEventListener('pagehide', syncName);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') syncName();
});
