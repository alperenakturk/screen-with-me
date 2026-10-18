# Chrome Web Store — doldurma rehberi

Geliştirici panelinde (chrome.google.com/webstore/devconsole) **Yeni öğe** → zip'i yükle,
sonra sekmeleri aşağıdaki gibi doldur. Kutulara girecek metinler İngilizce (mağazanın ana
dili İngilizce; Türkçe açıklama da açıklamanın sonunda var).

**Yüklenecek dosya:** `store/screenwithme-<sürüm>.zip` (`npm run build` üretir; siteden
indirilen zip ile aynı).

---

## 1. Mağaza girişi (Store listing)

**Açıklama (Description):**

```
Watch videos together with your friends, perfectly in sync.

ScreenWithMe finds the HTML5 video on the page you're on and keeps it in sync for everyone in your room: when someone plays, pauses, seeks or changes the speed, it happens for everybody. Whoever falls behind catches up automatically.

HOW IT WORKS
1. Open the page with the video you want to watch.
2. Click the ScreenWithMe icon → "Create a room on this page".
3. Send the invite link to your friends. They land on the same page, in the same room.

FEATURES
• Works with standard HTML5 video players, including players inside iframes
• Tight sync: play, pause, seek and playback speed are shared
• "Everyone ready": if someone's video is still loading, the room waits for them (max 12 s)
• Emoji reactions and quick chat messages over the video, also in fullscreen
• Room host can remove people; pick a name and avatar, no account needed
• YouTube links can be watched right on the website, no extension needed

PRIVACY
• No account, no ads, no analytics, no tracking
• The extension only runs in the tab you joined a room with; it does nothing in other tabs
• Videos play in each person's own browser; our server only relays small sync messages ("pause at 12:34")
• Full policy: https://screen-with-me.swm-server.workers.dev/gizlilik.html

NOTES
• DRM-protected streaming services are not supported.
• Only use content you have the right to watch. ScreenWithMe does not host or provide any video.
• Free and open source (MIT).

—

Türkçe: Arkadaşlarınla videoları aynı anda izle. ScreenWithMe bulunduğun sayfadaki HTML5 videoyu bulur ve odadaki herkes için senkron tutar: biri oynatınca, durdurunca, sarınca ya da hızı değiştirince herkeste olur. Hesap yok, reklam yok, takip yok; eklenti sadece odaya katıldığın sekmede çalışır.
```

**Kategori:** Entertainment (Eğlence). Listede yoksa: Social & Communication.
**Dil:** English.

**Görseller** (`store/` klasöründe):
| Alan | Dosya | Boyut |
|---|---|---|
| Mağaza simgesi | `store/icon128.png` | 128×128 |
| Ekran görüntüleri | `store/screenshot-1.png` … `-3.png` | 1280×800 |
| Küçük tanıtım kutusu | `store/promo-small.png` | 440×280 |

**Ek alanlar:**
- Resmî URL: boş bırak (alan adı doğrulaması ister).
- Ana sayfa URL'si: `https://screen-with-me.swm-server.workers.dev/eklenti.html`
- Destek URL'si: `https://screen-with-me.swm-server.workers.dev/eklenti.html`

---

## 2. Gizlilik (Privacy)

**Tek amaç (Single purpose description):**

```
ScreenWithMe has a single purpose: letting a group of friends watch the same HTML5 video together in sync. It keeps play, pause, seek position and playback speed of the video in the user's current tab synchronized with the other members of the user's room, and shows small reactions and chat messages over the video.
```

**İzin gerekçeleri:**

`storage`:
```
Stores the user's chosen nickname, avatar, language preference and a random browser ID locally (chrome.storage.local), and which tab is connected to which room (chrome.storage.session), so the room survives the service worker restarting and the user isn't asked for their name again.
```

Host izni (`<all_urls>`):
```
The extension syncs the HTML5 video on whatever page the user chooses to watch with friends, so it cannot know the sites in advance. Video players are often inside iframes from other domains, so the content script must be able to run in all frames. The content script does nothing unless the user has joined a room in that tab: it checks chrome.storage.session and goes idle immediately otherwise. It never reads page content other than the video element's playback state.
```

**Uzak kod kullanıyor musunuz? (Remote code):** **No, I am not using remote code.**
(Tüm kod paketin içinde; dışarıdan betik yüklenmiyor. Sunucuyla sadece WebSocket üzerinden JSON mesajları gidip geliyor.)

**Veri kullanımı** — şu kutuları işaretle:
- ☑ **Personally identifiable information** — kullanıcının seçtiği takma ad (odadakilere gösteriliyor).
- ☑ **Website content** — kullanıcı bir sayfayı odada açınca o sayfanın adresi ve başlığı odadakilere gidiyor.
- Diğerlerinin hepsi boş (sağlık, finans, kimlik doğrulama, kişisel iletişim, konum, web geçmişi, kullanıcı etkinliği).

Altındaki üç beyanın üçünü de işaretle:
- ☑ I do not sell or transfer user data to third parties, outside of the approved use cases
- ☑ I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- ☑ I do not use or transfer user data to determine creditworthiness or for lending purposes

**Gizlilik politikası URL'si:** `https://screen-with-me.swm-server.workers.dev/gizlilik.html`

---

## 3. Dağıtım (Distribution)

- Ödeme: **Free** (ücretsiz).
- Görünürlük: **Public** (herkese açık).
- Bölgeler: **All regions** (tüm bölgeler).

---

## 4. Test talimatları (Test instructions) — incelemeciye not

```
No login is needed.
1. Open https://www.w3schools.com/html/html5_video.asp (or any page with an HTML5 <video>).
2. Click the ScreenWithMe icon, enter a nickname, then "Create a room on this page". Copy the invite link.
3. Open the invite link in a second Chrome window (or a second profile with the extension installed). It opens the same page and joins the same room.
4. Play, pause or seek the video in one window: the other window follows. The bar at the top right of the page offers reactions, quick chat and playback speed.
The extension does nothing in tabs that haven't joined a room.
```

---

## Sonra

- İnceleme genelde birkaç gün, "tüm siteler" izni yüzünden 1–3 hafta sürebilir.
- Reddedilirse e-postadaki gerekçeyi bana yapıştır.
- Onaylanınca: mağaza linkini ver, `eklenti.html`'deki elle kurulum adımlarını "Chrome'a ekle"
  butonuyla değiştireyim.
- Yeni sürüm yüklerken: `apps/extension/package.json` sürümünü artır → `npm run build` →
  panelde **Paket** → yeni zip'i yükle → incelemeye gönder.
