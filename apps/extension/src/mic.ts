// Mikrofon izni sayfası (bir kerelik): film sayfasındaki sesli sohbet eklentinin görünmeyen sayfasında (offscreen)
// çalışır, o sayfa izin isteyemez. İlk "Sese katıl"da arka plan bu sekmeyi açar; kişi düğmeye basar, Chrome izni
// "ScreenWithMe" adına sorar (film sitesinin adına değil) ve hatırlar. Sonuç arka plana gider, sekme kapanır.

import { langReady } from './i18n.ts';
import { MIC_RESULT } from './messages.ts';
import { readValue } from './store.ts';

const text = {
  tr: {
    title: 'Sesli sohbet için mikrofon izni',
    text: 'Film sayfasında arkadaşlarınla konuşabilmen için ScreenWithMe mikrofonunu kullanmak istiyor. İzin bir kez verilir, sadece "Sese katıl"a bastığında açılır.',
    allow: '🎙 Mikrofon iznini ver',
    denied: 'İzin verilmedi. Adres çubuğundaki kilit/ayarlar simgesinden mikrofona izin verip tekrar dene.',
  },
  en: {
    title: 'Microphone permission for voice chat',
    text: 'ScreenWithMe wants to use your microphone so you can talk with friends on the video page. You allow it once; it is only on after you press "Join voice".',
    allow: '🎙 Allow microphone',
    denied: 'Permission was not given. Allow the microphone from the lock/settings icon in the address bar and try again.',
  },
};

async function main(): Promise<void> {
  await langReady;
  const dict = (await readValue('lang').catch(() => null)) === 'en' ? text.en : text.tr;
  document.documentElement.lang = dict === text.en ? 'en' : 'tr';
  document.getElementById('title')!.textContent = dict.title;
  document.getElementById('text')!.textContent = dict.text;
  const button = document.getElementById('allow') as HTMLButtonElement;
  const status = document.getElementById('status')!;
  button.textContent = dict.allow;
  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      for (const track of stream.getTracks()) track.stop();
      await chrome.runtime.sendMessage({ type: MIC_RESULT, granted: true });
    } catch {
      status.textContent = dict.denied;
      status.hidden = false;
      button.disabled = false;
    }
  });
}
void main();
