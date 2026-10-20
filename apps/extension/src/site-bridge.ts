// Sadece ScreenWithMe sitesinin kendi sayfasında (üst çerçeve) çalışır.
// 1) Siteye "eklenti kurulu, kabuğu biliyor" der (data-swm-extension / data-swm-shell).
// 2) Sitenin ayarlarını eklentinin deposuyla eşitler (isim, avatar, tema, dil, kalıcı kimlik,
//    kayıtlı odalar…): film sitesinin üstündeki katmanda da aynı ayarlar geçerli olsun.
// 3) Site "bu sekme odadaki film sayfasına gitsin" derse arka plana iletir; arka plan sekmeyi
//    götürür ve film sayfasında odanın katmanını (kabuk) açar.

import { EXT_SOURCE, SHELL_VERSION, SITE_SOURCE, type ExtToSite, type StoreEntries } from '@swm/shared/shell';
import type { SiteGoMessage } from './messages.ts';
import { mergeStore, readStore } from './store.ts';

document.documentElement.dataset.swmExtension = chrome.runtime.getManifest().version;
document.documentElement.dataset.swmShell = SHELL_VERSION;

function toSite(message: ExtToSite | { type: 'going'; ok: boolean }): void {
  window.postMessage({ source: EXT_SOURCE, ...message }, location.origin);
}

addEventListener('message', (event: MessageEvent) => {
  // Sadece sitenin kendi sayfasından gelen mesajlar.
  if (event.source !== window || event.origin !== location.origin) return;
  const data = event.data as { source?: string; type?: string; entries?: StoreEntries; roomId?: unknown; url?: unknown } | null;
  if (data?.source !== SITE_SOURCE) return;
  switch (data.type) {
    case 'store-hello':
      void readStore().then((entries) => toSite({ type: 'store', entries }));
      break;
    case 'store-push':
      if (data.entries) void mergeStore(data.entries);
      break;
    case 'go': {
      if (typeof data.roomId !== 'string' || typeof data.url !== 'string') return;
      const message: SiteGoMessage = { type: 'site-go', roomId: data.roomId, url: data.url };
      void chrome.runtime
        .sendMessage(message)
        .then((reply: { ok?: boolean } | undefined) => toSite({ type: 'going', ok: reply?.ok === true }))
        .catch(() => toSite({ type: 'going', ok: false }));
      break;
    }
  }
});
