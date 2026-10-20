// Sayfanın kendi dünyasında (MAIN world) çalışır: film sitesinin tam ekran düğmesi sadece videoyu
// tam ekran yapardı (odanın sohbeti, emojileri, kontrolleri görünmezdi). Oda katmanı açıkken
// (eklenti <html>'e `data-swm-room` koyar) sitenin tam ekran isteği yapılmaz; bunun yerine eklentiye
// haber verilir, o da odanın kendi tam ekranını açar (film sayfasının tamamı + odanın kontrolleri).
// Oda yokken hiçbir şeye karışmaz. Sadece bir DOM olayı yayar; hiçbir veri okumaz, göndermez.

const active = () => document.documentElement.hasAttribute('data-swm-room');

function redirect(): Promise<void> {
  document.dispatchEvent(new CustomEvent('swm-fullscreen-request'));
  return Promise.resolve();
}

type Proto = Record<string, unknown>;
const element = Element.prototype as unknown as Proto;
for (const name of ['requestFullscreen', 'webkitRequestFullscreen', 'webkitRequestFullScreen']) {
  const original = element[name];
  if (typeof original !== 'function') continue;
  element[name] = function (this: Element, ...args: unknown[]) {
    return active() ? redirect() : (original as (...a: unknown[]) => unknown).apply(this, args);
  };
}
// iPhone tarzı video tam ekranı (bazı oynatıcılar Chrome'da da dener).
const video = HTMLVideoElement.prototype as unknown as Proto;
const enter = video.webkitEnterFullscreen;
if (typeof enter === 'function') {
  video.webkitEnterFullscreen = function (this: HTMLVideoElement) {
    if (active()) void redirect();
    else (enter as () => void).call(this);
  };
}
