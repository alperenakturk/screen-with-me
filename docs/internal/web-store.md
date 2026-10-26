# Chrome Web Store — doldurma rehberi (başvuru günü için)

Geliştirici paneli: chrome.google.com/webstore/devconsole → **Yeni öğe** → zip'i yükle,
sonra sekmeleri aşağıdaki gibi doldur. Kutulara girecek metinler İngilizce (mağazanın ana
dili); açıklamanın sonunda kısa Türkçe paragraf var.

**Yüklenecek dosya:** `store/screenwithme-<sürüm>.zip` (`npm run store` üretir).

**Başlık ve özet zip'ten gelir** (manifest, `apps/extension/build.mjs`):
- Başlık: `ScreenWithMe – Watch Videos Together in Sync`
- Özet: `Sync any HTML5 video with friends: play, pause, seek and speed together. Emoji reactions and quick chat. No account, free.`

> Repo şu an private. Metinlerde "open source" yazmıyoruz; repo açılınca eklenebilir
> (açmadan önce `docs/internal/rakip-analizi.md` içindeki site adları temizlenmeli).

---

## 1. Mağaza girişi (Store listing)

**Açıklama (Description):**

```
Watch videos together with friends, perfectly in sync.

Create a room on the ScreenWithMe website and send the link. Paste the link of the page with the video into the room: everyone goes to that page, and as soon as the video starts, the extension opens your room around it (chat, reactions, controls). When anyone plays, pauses, seeks or changes the speed, it happens for everyone. Whoever falls behind catches up silently.

HOW IT WORKS
1. Create a room on the website (no account) and share the invite link.
2. Paste the page with the video; friends get a "Go to the film" button.
3. Press play on that page: the room view opens by itself, with the video in the middle.
The extension has no settings to learn: its icon only shows whether the tab is in a room, with one button back to the room.

WHY SCREENWITHME
• Works with standard HTML5 video players, even inside iframes and players that load late
• Tight sync, measured 30–100 ms apart on popular open-source players
• "Everyone ready": if someone is still buffering, the room waits (max 12 s)
• Emoji reactions (with fun extra pages) and quick chat over the video, also in fullscreen
• Pin important moments with an optional note and jump back to talk about them later
• Add your own custom emojis (images or GIFs) for the whole room
• Keyboard shortcuts: 1–8 send reactions, Enter opens chat, P pins the moment
• Room view: the video's page turns into your room, with the video in the middle, chat, queue and people on the side and reactions under the video; fullscreen keeps them
• Twelve themes, drawn avatars and your own custom emojis
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

Türkçe: Arkadaşlarınla videoyu aynı saniyede izle. Sitede oda kur, linki gönder, videonun olduğu sayfanın linkini odaya yapıştır: herkes o sayfaya gider, video başlayınca oda (sohbet, emojiler, kontroller) videonun etrafında açılır. Biri durdurunca, sarınca ya da hızı değiştirince herkeste olur. Hesap yok, reklam yok, takip yok; eklenti sadece odaya katıldığın sekmede çalışır.
```

**Kategori:** Entertainment. Listede yoksa: Social & Communication.
**Dil:** English.

**Görseller** (`store/` klasöründe, `npm run store` üretir):
| Alan | Dosya | Boyut |
|---|---|---|
| Mağaza simgesi | `store/icon128.png` | 128×128 |
| Ekran görüntüleri | `store/screenshot-1.png` … `-5.png` | 1280×800 |
| Küçük tanıtım kutusu | `store/promo-small.png` | 440×280 |

Ekran görüntüsü sırası: 1) film sayfasında oda görünümü (senkron + emojiler + sohbet),
2) akış: odaya sayfa linki → "Filme git" → film sayfasında oynat'a bas (üstte ince şerit),
3) herkes hazır + ortak hız (kişiler sekmesi), 4) özelleştirme (tema penceresi, avatarlar),
5) gizlilik + popup (sadece bilgi ve "Odaya dön" düğmesi).
Kaynak: `store/src/shots.html` (pencere, popup, başlıklar) + `store/src/room.html` (oda taklidi;
sitenin gerçek `styles.css`'ini kullanır, site arayüzü değişince işaretlemeyi `room.ts` ile eşitle).

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
Stores the website's settings (nickname, avatar, theme, language, saved rooms and a random browser ID) locally in chrome.storage.local, so the room layer on the film page uses the same settings as the website, and which tab shows a room layer (chrome.storage.session), so it survives the service worker restarting.
```

Host izni (`<all_urls>`):
```
Users watch videos on sites we cannot list in advance, and players are usually inside cross-origin iframes, so the content script must be able to run in every frame. activeTab is not enough: invited friends open the page through a link without clicking the extension icon, and players that load later in iframes must be detected automatically. Outside a tab that has joined a room the script stays dormant. Within that tab it only reads the <video> element's playback state (time, paused, rate) and shows our own website's room page as a layer over the page (a web-accessible extension page, shell.html, in an iframe), with a hole where the video sits. It never reads page text, forms or cookies. The page URL and title leave the device only when the user explicitly creates a room or shares that page with their room.
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
1. Open https://screen-with-me.swm-server.workers.dev, press "Create room" → "One-time", enter a nickname and pick an avatar.
2. Paste https://plyr.io/ (an open-source video player demo) or https://videojs.com/ into the link box and press "Play now". The tab goes to that page.
3. Once the video is found, the website's room appears around it (chat, queue, reactions, pin, speed, fullscreen); the video sits in the room's player area.
4. Open the invite link in a second window (the same profile works) and press "Go to the film and watch together".
5. Play, pause or seek in one window: the other follows within about 1 second.
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
  kimliği, pinler, özel emojiler).
- ✅ Açıklamada film/dizi/site adı yok; "her HTML5 video için tarafsız senkron aracı".
- ✅ Otomatik testler (GitHub Actions: tip kontrolü, birim, derleme, uçtan uca).
- ✅ Ekran görüntüleri güncel (`npm run store`).
- ⬜ Brave/Edge'de bir arkadaşla gerçek deneme.
- ⬜ Sürüm `1.0.0` → `npm run store` → zip'i panele yükle → formu bu rehbere göre doldur → gönder
  (senin hesabınla; ben gönderemem).
- ⬜ Onaylanınca: `eklenti.html` ve sitedeki kurulum linklerini mağaza linkine çevir.
