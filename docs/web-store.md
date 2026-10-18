# Chrome Web Store — doldurma rehberi (başvuru günü için)

Geliştirici paneli: chrome.google.com/webstore/devconsole → **Yeni öğe** → zip'i yükle,
sonra sekmeleri aşağıdaki gibi doldur. Kutulara girecek metinler İngilizce (mağazanın ana
dili); açıklamanın sonunda kısa Türkçe paragraf var.

**Yüklenecek dosya:** `store/screenwithme-<sürüm>.zip` (`npm run store` üretir).

**Başlık ve özet zip'ten gelir** (manifest, `apps/extension/build.mjs`):
- Başlık: `ScreenWithMe – Watch Videos Together in Sync`
- Özet: `Sync any HTML5 video with friends: play, pause, seek and speed together. Emoji reactions and quick chat. No account, free.`

> Repo şu an private. Metinlerde "open source" yazmıyoruz; repo açılınca eklenebilir
> (açmadan önce `docs/rakip-analizi.md` içindeki site adları temizlenmeli).

---

## 1. Mağaza girişi (Store listing)

**Açıklama (Description):**

```
Watch videos together with friends, perfectly in sync.

Open a page with a video, click ScreenWithMe, create a room and send the link. When anyone plays, pauses, seeks or changes the speed, it happens for everyone. Whoever falls behind catches up silently.

WHY SCREENWITHME
• Works with standard HTML5 video players, even inside iframes and players that load late
• Tight sync, measured 30–100 ms apart on popular open-source players
• "Everyone ready": if someone is still buffering, the room waits (max 12 s)
• Emoji reactions (with fun extra pages) and quick chat over the video, also in fullscreen
• Reaction timeline: see the moments everyone reacted to most, click to jump there
• Keyboard shortcuts: 1–8 send reactions, Enter opens chat
• Move the control bar and messages anywhere over the video
• Speed stays shared: other speed extensions can't knock the room out of sync
• Room host can remove people and lift bans; pick a name and avatar, no account
• YouTube and direct video links play right on the website, no extension needed
• English and Turkish

PRIVATE BY DESIGN
• No account, no ads, no third-party analytics or tracking
• Runs only in the tab you joined a room with; dormant everywhere else
• Videos play in each person's own browser; our server only relays small sync messages and the room's chat
• Privacy policy: https://screen-with-me.swm-server.workers.dev/gizlilik.html

NOTES
• DRM-protected streaming services are not supported.
• ScreenWithMe does not host or provide any video. Only watch content you have the right to access.
• Free.

—

Türkçe: Arkadaşlarınla videoyu aynı saniyede izle. Videonun olduğu sayfada odayı kur, linki gönder; biri durdurunca, sarınca ya da hızı değiştirince herkeste olur. Hesap yok, reklam yok, takip yok; eklenti sadece odaya katıldığın sekmede çalışır.
```

**Kategori:** Entertainment. Listede yoksa: Social & Communication.
**Dil:** English.

**Görseller** (`store/` klasöründe, `npm run store` üretir):
| Alan | Dosya | Boyut |
|---|---|---|
| Mağaza simgesi | `store/icon128.png` | 128×128 |
| Ekran görüntüleri | `store/screenshot-1.png` … `-4.png` | 1280×800 |
| Küçük tanıtım kutusu | `store/promo-small.png` | 440×280 |

Ekran görüntüsü sırası: 1) senkron + emojiler + mesajlar, 2) tek tıkla oda (popup),
3) herkes hazır + ortak hız, 4) sitedeki tema ve maskot.

**Ek alanlar:**
- Resmî URL: boş bırak (alan adı doğrulaması ister).
- Ana sayfa URL'si: `https://screen-with-me.swm-server.workers.dev/`
- Destek URL'si: `https://screen-with-me.swm-server.workers.dev/`

---

## 2. Gizlilik (Privacy)

**Tek amaç (Single purpose description):**

```
ScreenWithMe has a single purpose: watch parties. It keeps one HTML5 video, in the tab where the user joined a room, playing in sync (play, pause, seek position, playback speed) for everyone in that room. Reactions and short chat messages over the video are part of that shared-watching experience.
```

**İzin gerekçeleri:**

`storage`:
```
Stores the user's chosen nickname, avatar, language preference and a random browser ID locally (chrome.storage.local), and which tab is connected to which room (chrome.storage.session), so the room survives the service worker restarting and the user isn't asked for their name again.
```

Host izni (`<all_urls>`):
```
Users watch videos on sites we cannot list in advance, and players are usually inside cross-origin iframes, so the content script must be able to run in every frame. activeTab is not enough: invited friends open the page through a link without clicking the extension icon, and players that load later in iframes must be detected automatically. Outside a tab that has joined a room the script stays dormant. Within that tab it only reads the <video> element's playback state (time, paused, rate) and draws its own overlay. It never reads page text, forms or cookies. The page URL and title leave the device only when the user explicitly creates a room or shares that page with their room.
```

**Uzak kod kullanıyor musunuz? (Remote code):** **No, I am not using remote code.**
(Tüm kod paketin içinde; sunucuyla sadece WebSocket üzerinden JSON mesajları gidip geliyor.)

**Veri kullanımı** — şu kutuları işaretle (fazla beyan reddettirmez, eksik beyan reddettirir):
- ☑ **Personally identifiable information** — kullanıcının seçtiği takma ad (odadakilere gösterilir).
- ☑ **Personal communications** — hızlı sohbet mesajları odaya gider; oda son 50 mesajı saklar.
- ☑ **Website content** — oda kurulunca ya da sayfa odada açılınca sayfanın başlığı.
- ☑ **Web history** — aynı durumda sayfanın adresi odadakilere gider.
- Diğerleri boş (sağlık, finans, kimlik doğrulama, konum, kullanıcı etkinliği).

Altındaki üç beyanın üçünü de işaretle:
- ☑ I do not sell or transfer user data to third parties, outside of the approved use cases
- ☑ I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- ☑ I do not use or transfer user data to determine creditworthiness or for lending purposes

**Gizlilik politikası URL'si:** `https://screen-with-me.swm-server.workers.dev/gizlilik.html`

---

## 3. Dağıtım (Distribution)

- Ödeme: **Free**. Görünürlük: **Public**. Bölgeler: **All regions**.

---

## 4. Test talimatları (Test instructions) — incelemeciye not

```
No login needed. Allow autoplay or click "Start watching" if the page asks.
1. Open https://plyr.io/ (an open-source video player demo) or https://videojs.com/.
2. Click the ScreenWithMe toolbar icon, enter a nickname, pick an avatar, then "Create a room on this page", then "Copy".
3. Paste the invite link into a second window (the same profile works). It opens the room page on our website; press "Go to the page and watch together" and the tab moves to the same video and joins the room.
4. Play, pause or seek in one window: the other follows within about 1 second.
5. Move the mouse over the video: a "ScreenWithMe" button appears at the video's top-right corner. It opens reactions (▲▼ for more), quick chat and a speed menu (speed is shared with the room).
Tabs that have not joined a room are not affected.
```

---

## Sonra

- İnceleme genelde birkaç gün, "tüm siteler" izni yüzünden 1–3 hafta sürebilir.
- **İnceleme sürerken `PROTOCOL_VERSION` artırma** (mağazadaki sürüm sunucuya bağlanamaz olur).
- Reddedilirse e-postadaki gerekçeyi bana yapıştır.
- Onaylanınca: mağaza linkini ver; `eklenti.html`'deki elle kurulum adımlarını "Chrome'a ekle"
  butonuyla değiştireyim, sitedeki "eklentiyi kur" linkleri de mağazaya gitsin.
- Yeni sürüm: `apps/extension/package.json` sürümünü artır → `npm run store` → panelde
  **Paket** → yeni zip'i yükle → incelemeye gönder.

## 1.0 hazırlık kontrol listesi

Gönderimden önce (ben kontrol ederim, ✅ olanlar 0.9.0'da yapıldı):
- ✅ İzinler en az: sadece `storage` + `<all_urls>` (videoyu her sitede bulmak için; açıklaması
  "Gizlilik" bölümünde).
- ✅ Gizlilik politikası saklanan her veriyi anlatıyor (isim/avatar, oda durumu, sohbet, tarayıcı
  kimliği, tepki şeridi).
- ✅ Açıklamada film/dizi/site adı yok; "her HTML5 video için tarafsız senkron aracı".
- ✅ Otomatik testler (GitHub Actions: tip kontrolü, birim, derleme, uçtan uca).
- ✅ Ekran görüntüleri güncel (`npm run store`).
- ⬜ Brave/Edge'de bir arkadaşla gerçek deneme (popup'taki "Tanı" satırı).
- ⬜ Sürüm `1.0.0` → `npm run store` → zip'i panele yükle → formu bu rehbere göre doldur → gönder
  (senin hesabınla; ben gönderemem).
- ⬜ Onaylanınca: `eklenti.html` ve sitedeki kurulum linklerini mağaza linkine çevir.
