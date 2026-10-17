// Sadece ScreenWithMe sitesinde çalışır.
// 1) Siteye "eklenti kurulu" der: site, odada bir sayfa açılınca seni eklentiyle
//    o sayfaya yönlendirebilir.
// 2) Sitede yazdığın ismi eklentiye aktarır; eklentide tekrar sorulmaz.

document.documentElement.dataset.swmExtension = chrome.runtime.getManifest().version;

function syncName(): void {
  let name: string | null = null;
  try {
    name = localStorage.getItem('name');
  } catch {
    return;
  }
  if (name) void chrome.storage.local.set({ name });
}

syncName();
addEventListener('pagehide', syncName);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') syncName();
});
