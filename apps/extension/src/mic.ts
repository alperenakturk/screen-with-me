// Mikrofon / kamera izni sayfası (bir kerelik): film sayfasındaki sesli sohbet eklentinin görünmeyen sayfasında (offscreen)
// çalışır, o sayfa izin isteyemez. İlk "Sese katıl"da arka plan bu sayfayı küçük bir pencerede açar (0.9.91.5; önce sekmeydi), Chrome izni hemen
// "Sidelit" adına sorar (film sitesinin adına değil) ve hatırlar. Sonuç arka plana gider, pencere kapanır.

import { langReady } from './i18n.ts';
import { MIC_RESULT } from './messages.ts';
import { readValue } from './store.ts';

const text = {
  tr: {
    ask: 'Chrome\'un sorusu burada açılır: "İzin ver"e bas. Kapandıysa adres çubuğundaki simgeye bas.',
    title: 'Sesli ve görüntülü sohbet izni',
    text: 'Film sayfasında arkadaşlarınla konuşabilmen için Sidelit mikrofonunu (ve kameranı) kullanmak istiyor. İzni bir kez verirsin, bir daha sorulmaz; mikrofon sadece "Sese katıl"a, kamera sadece 📷 düğmesine bastığında açılır.',
    allow: '🎙 Mikrofon iznini ver',
    denied: 'İzin verilmedi. Adres çubuğundaki kilit/ayarlar simgesinden mikrofona izin verip tekrar dene.',
    camTitle: 'Görüntülü sohbet için kamera izni',
    camText: 'Film sayfasında arkadaşların seni görebilsin diye Sidelit kameranı kullanmak istiyor. İzni bir kez verirsin; kamera sadece 📷 düğmesine bastığında açılır.',
    camAllow: '📷 Kamera iznini ver',
    camDenied: 'İzin verilmedi. Adres çubuğundaki kilit/ayarlar simgesinden kameraya izin verip tekrar dene.',
  },
  en: {
    ask: 'Chrome\'s question opens here: press "Allow". If it closed, press the icon in the address bar.',
    title: 'Voice and video chat permission',
    text: 'Sidelit wants to use your microphone (and camera) so you can talk with friends on the video page. You allow it once and it is not asked again; the microphone is only on after you press "Join voice", the camera only after you press 📷.',
    allow: '🎙 Allow microphone',
    denied: 'Permission wasn’t given. Allow the microphone from the lock/settings icon in the address bar and try again.',
    camTitle: 'Camera permission for video chat',
    camText: 'Sidelit wants to use your camera so friends can see you on the video page. You only allow it once, and the camera is only on after you press 📷.',
    camAllow: '📷 Allow camera',
    camDenied: 'Permission wasn’t given. Allow the camera from the lock/settings icon in the address bar and try again.',
  },
};

async function main(): Promise<void> {
  await langReady;
  const dict = (await readValue('lang').catch(() => null)) === 'tr' ? text.tr : text.en;
  document.documentElement.lang = dict === text.en ? 'en' : 'tr';
  // Kamera izni de aynı sayfadan (?cam=1): görüntülü sohbet eklentinin görünmeyen sayfasında, o da izin isteyemez.
  const cam = new URLSearchParams(location.search).get('cam') === '1';
  document.getElementById('ask-text')!.textContent = dict.ask;
  document.getElementById('title')!.textContent = cam ? dict.camTitle : dict.title;
  document.getElementById('text')!.textContent = cam ? dict.camText : dict.text;
  const button = document.getElementById('allow') as HTMLButtonElement;
  const status = document.getElementById('status')!;
  button.textContent = cam ? dict.camAllow : dict.allow;
  const ask = async () => {
    button.disabled = true;
    try {
      // One question for both (0.9.91.14, owner: "Chrome asks for a lot of permissions"): the camera is asked together
      // with the microphone, so turning the camera on later asks nothing. No camera: the microphone alone.
      const stream = cam
        ? await navigator.mediaDevices.getUserMedia({ video: true })
        : await navigator.mediaDevices.getUserMedia({ audio: true, video: true }).catch(() => navigator.mediaDevices.getUserMedia({ audio: true }));
      for (const track of stream.getTracks()) track.stop();
      await chrome.runtime.sendMessage({ type: MIC_RESULT, granted: true });
    } catch {
      status.textContent = cam ? dict.camDenied : dict.denied;
      status.hidden = false;
      button.disabled = false;
    }
  };
  button.addEventListener('click', () => void ask());
  // Chrome's question comes at once (0.9.91.5): one click less; the button stays for a second try.
  void ask();
}
void main();
