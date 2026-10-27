<div align="center">

# ▶ ScreenWithMe

**Herhangi bir videoyu birlikte, tam senkron izle.**<br/>
Ücretsiz · hesap yok · reklam yok · YouTube'da ve (neredeyse) her sitede çalışır.

[**Canlı site**](https://screen-with-me.swm-server.workers.dev) ·
[**Eklentiyi kur**](https://screen-with-me.swm-server.workers.dev/eklenti.html) ·
[🇬🇧 English](README.md)

![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers%20%2B%20Durable%20Objects-f38020?logo=cloudflare&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-4285f4?logo=googlechrome&logoColor=white)
![Testler](https://img.shields.io/badge/test-133%20birim%20%2B%2013%20u%C3%A7tan%20uca%20%2B%20ger%C3%A7ek%20Chrome-3ccf8e)
![Sürüm](https://img.shields.io/badge/s%C3%BCr%C3%BCm-0.9.58-7c5cff)
![Lisans](https://img.shields.io/badge/lisans-MIT-blue)

</div>

---

Link at, herkes aynı saniyeyi izlesin. Biri durdurur, sarar ya da hızı değiştirirse herkeste olur. Sohbet,
emojiler, pinler ve ortak sıra videonun etrafında.

- **YouTube ya da video dosyası** → doğrudan sitede oynar, kurulum yok.
- **Başka herhangi bir site** (sayfada HTML5 `<video>` varsa, iframe içinde bile) → sekme o siteye gider ve
  tarayıcı eklentisiyle **odanın kendisi** (sitenin oda sayfasının aynısı) üstüne açılır, video odanın
  oynatıcı alanına oturur. Gömülmeyi yasaklayan sitelerde de çalışır.

## ✨ Özellikler

### Birlikte izleme
| | |
|---|---|
| ⏯️ **Sıkı senkron** | Oynat / durdur / sar / hız herkeste. Sunucu saatine dayanır, gerçek oynatıcılarda **30–100 ms** fark ölçüldü. Küçük kaymalar sessizce ±%5 hızlı/yavaş oynatarak kapanır. |
| ⏳ **Herkes hazır** | Birinin videosu takılırsa oda onu bekler (en fazla 12 sn; aynı kişi 30 sn tekrar bekletemez). Odada tek başınayken kapalı. |
| 🧩 **Her site** | Eklenti doğru videoyu bulur, iframe içinde ve geç yüklenen ya da kaynağı değişen oynatıcılarda da. Kısa videolar, döngüde sessiz videolar ve köşeye sabitlenmiş küçük videolar (tipik reklamlar) atlanır; filmin kendi oynatıcısında oynayan reklam odaya asla yansımaz. Yanlış video mu? **🎯 Video seç** sayfadaki her videonun üstüne "Bunu senkronla" düğmesi koyar. |
| 🛡️ **Reklama dayanıklı oda** | Video sayfasına tıklayınca başka siteye açılan sekme (tipik reklam penceresi) kapatılır, film önde kalır (bilerek açtıysan "Geri aç"; kapatılabilir). Sayfa seni başka bir siteye götürürse oda kalır ve **↩ Filme geri dön** der. Biri reklam izlerken oda onu beklemez; "reklamda" görünür, reklam bitince yetişir. |
| 🖼️ **Film sayfasının üstünde oda** | Sitenin oda sayfası film sayfasının üstüne katman olarak açılır, videonun yerinde bir delik bırakır. Hemen gelir (video başlamadan) ve yüklenirken sayfadan hiçbir şey görünmez. Video üstündeki mesajlar ve emojiler sitedeki gibi saydam. **👁 Sayfayı göster** odayı bir anlığına kenara çeker: videonun önünü kapatan pencere ya da reklam kapatılır. |
| 🖥️ **Tam ekran** | Dikkat dağıtmayan: kontroller, emojiler ve hızlı mesaj kutusu fare oynayınca belirir, sonra kaybolur. Film sayfalarında videonun ekranı mı kaplayacağı yoksa kontrollerin üstünde mi duracağı (altyazı hiç örtülmez) seçilebilir. |
| ⏩ **Ortak hız** | 0,25×–4× (YouTube en fazla 2×), ±0,05 ince ayar. Başka hız eklentileri odanın senkronunu bozamaz. |
| 🧪 **Senkron testi** | Sitenin çizdiği 12 saniyelik sayaç; rozet aranızdaki farkı gösterir. |

### Oda
| | |
|---|---|
| 🔗 **Tek link, hesap yok** | Bir kere isim + avatar (çizilmiş temalı karakterler ve film / dizi / anime / oyun parodileri), tarayıcı hatırlar. Sağ üstteki 👤 menüsünde ad, avatar, tema ve oturum özeti. |
| 📱 **Shorts görünümü** | YouTube Shorts linki açılınca oda dikey olur: video ortada, arkadaşlar iki yanında oturur. Mesajlar yazanın avatarından baloncuk olarak çıkar, emojiler oradan yükselir. ↑ / ↓ (ya da ▲▼, fare tekerleği) herkes için önceki / sonraki Shorts; 🔁 döngü biten Shorts'u yeniden oynatır. Sıra, sohbet geçmişi ve ayarlar bir tık ötede, oda görünümünde. |
| 🎵 **Sıra ve oylama** | Ekle, sırala, hemen aç; 👍 oylar sırayı değiştirir. Otomatik devam kapatılabilir (yerine "Sıradakini başlat" kartı). |
| 🎙 **Sesli ve görüntülü sohbet** | Odada "Sese katıl": izlerken konuş, tek tıkla sessize al ya da bas-konuş (V'ye basılı tut), konuşanın avatarı parlar; 🎙 altındaki küçük çubuk mikrofonunun seni duyduğunu gösterir. 📷 küçük bir kamera açar: arkadaşlarının kameraları ses kartında, tam ekranda videonun köşesinde görünür (film sayfalarında da; kamera izni bir kez ScreenWithMe için sorulur). Eşler arası ve her zaman şifreli (sunucu sesi hiç duymaz), en fazla 6 kişi; sese katılmayan kimse seni duymaz. Film sayfalarında da çalışır: mikrofon izni bir kez ScreenWithMe için sorulur (film sitesi için değil), film sayfası yenilense de ses kopmaz, biri konuşurken film sesi kısılır. |
| 📺 **Ekran paylaşımı** | Ekranını, bir pencereyi, sekmeyi ya da kameranı odaya aç (oyun, fotoğraf, "şuna bak"; film için değil). Odada tek yayın, izlemeyi seçen en fazla 4 kişi, 720p, eşler arası. Videonun köşesinde açılır, büyütülebilir. "Yazı net" (sunum, site) ya da "akıcı" (oyun) seçilir. Sınırlar hep görünür ("İzleyen 3/4"). Yönetici yayını durdurabilir ya da yayını sadece kendisi açabilsin diyebilir. |
| 💬 **Sohbet ve emojiler** | Sohbet, sıra, kişiler ve ayarlar sekmeleri. Üç emoji sayfası; emojiler videonun altından gönderenin avatarı ve adıyla yükselir, istediğin kadar hızlı. Görmek istemeyen kendisi için kapatabilir. Sohbetteki oda hareketleri varsayılan gizli. |
| 🖼️ **Özel emojiler** | Kendi resmini ya da GIF'ini ekle; bütün oda onunla tepki verebilir (odada en fazla 24). |
| 📌 **Pinler** | Bir anı isteğe bağlı notla pinle; video altındaki şeritten oraya dönülür. |
| ⌨️ **Kısayollar** | 1–8 emoji, Enter mesaj, P pin (film sayfalarında bu tuşlar sayfanın oynatıcısına hiç gitmez). |
| 💾 **Kaydedilen odalar** | Tek seferlik ya da adlı kayıtlı oda (30 gün saklanır). Kayıtlı odalar her videonun kaldığı yeri ve pinlerini hatırlar; ana sayfadaki listende içeride kaç kişi olduğu görünür. |
| 📊 **Oturum özeti** | Spotify özeti tarzında (izleme süresi, videolar, en konuşkan, en sevilen emoji…), indirilebilir görselli; önceki özetler saklanır. |
| ⏰ **Planlı başlangıç** | Bir saat seç; geri sayım bandı çıkar, oda vakti gelince kendisi başlar. |
| 📱 **Ana ekrana ekle** | Site telefona ve bilgisayara uygulama gibi eklenebilir ("Ana ekrana ekle" / adres çubuğundaki yükle simgesi). Her açılışta en yeni sürüm gelir; internet yoksa bunu söyler. |
| 🎮 **PlayWithMe** | Oyunlar odanın içinde, ayrı oyun odası yok: videonun altındaki 🎮'a bas, XOX, Dört Taş (iki kişi), Çiz-Bil ya da bilgi yarışması (2–8 kişi) seç. Oyun videonun yerinde açılır; diğerlerine "Katıl" kartı gider, "Videoya dön" ile film geri gelir, oyun sürer. |
| 🏠 **Odaya dönüş** | Biri film sayfasından odaya dönünce diğerlerine küçük bir "sen de dön?" kartı çıkar. |

### Yönetici ve güvenlik
| | |
|---|---|
| 👑 **Oda yöneticisi** | İlk giren yöneticidir (yenilemede kalır) ve ayarlar sekmesiyle başlar. 20 sn'den uzun yoksa yöneticilik kalıcı olarak odada en uzun süredir bulunan kişiye geçer. |
| 🔒 **Yönetici modları** | Oynatmayı sadece yönetici yönetsin · sırayı kilitle · emojileri kapat ya da kişi başı ne sıklıkla atılacağını sınırla · herkes hazır beklemesi aç/kapa. |
| 🚪 **Çıkarma ve yasak** | Yönetici kişileri çıkarır; yönetici yasağı kaldırana kadar giremezler. |
| 🔐 **Gizlilik baştan** | Video herkesin kendi tarayıcısında oynar; sunucu sadece "12:34'te durdur" gibi küçük mesajları ve odanın sohbetini taşır. Eklenti oda dışında uykudadır, film sayfası hangi odada olduğunu okuyamaz. Kullanıcı yazısı asla HTML olarak yazılmaz. Hız sınırları sunucuda. |

### Görünüm
| | |
|---|---|
| 🎨 **11 tema** | Gece, Okyanus, Gün batımı, Neon; resimli Mehtaplı Geceler, Binbir Gece ve Art Deco afiş temaları (Sinema Sarayı, Opera Gecesi, Açık Hava Sineması, Transatlantik, Gece Ekspresi), her birinde kostümlü maskot. Ana sayfada tıklayınca bütün sayfa hemen o temaya geçer; resimsiz temaların arkasında yavaşça süzülen ışıklar var. |
| 🎬 **Açılış** | Kısa logo animasyonu ve üretilmiş ses (Web Audio, dosya yok). |
| 🌍 **Diller** | Türkçe (varsayılan) ve İngilizce, sitede ve eklentide. |

## 🧠 Nasıl çalışır?

```mermaid
flowchart LR
  subgraph A[Ali'nin tarayıcısı]
    SA[Site / eklenti] --> EA[Senkron motoru]
    EA <--> PA[(Oynatıcı)]
  end
  subgraph B[Ayşe'nin tarayıcısı]
    SB[Site / eklenti] --> EB[Senkron motoru]
    EB <--> PB[(Oynatıcı)]
  end
  EA <-- WebSocket --> R{{Durable Object<br/>oda başına bir}}
  EB <-- WebSocket --> R
```

- **Sunucu tek doğru kaynak.** Odanın durumu sadece `{ item, paused, position, rate, updatedAt }`;
  şu anki konum `position + (sunucuSaati − updatedAt) × rate`. Mesaj sadece biri bir şey *yapınca* gider.
- **Saat eşitleme.** İstemciler birkaç ping/pong ile sunucu saatini tahmin eder (mini NTP), bütün hesap sunucu saatinde.
- **"Bunu kullanıcı mı yaptı, ben mi?"** Motor oynatıcıya komut verince hangi olayı beklediğini not eder
  (ör. bir `pause`). Beklenen olaylar kısa süre yok sayılır; beklenmeyen her şey kullanıcı hareketidir.
  Böylece yankı döngüsü olmaz, gerçek bir durdurma da kaybolmaz.
- **Sarma**, zamandaki beklenmedik sıçramadan anlaşılır (YouTube sarma olayı vermez).
- **Kayma** 1 sn'den büyükse yerine atlar; küçüğü ±%5 hızlı/yavaş oynatarak kapanır.
- **Oda başına bir Durable Object**: odalar birbirinden bağımsız büyür; WebSocket Hibernation ile boştaki oda
  maliyetsizdir. Uykudan sağ çıkması gereken zamanlayıcılar (bekleme süresi, planlı başlangıç, oda silme) tek bir depo alarmında.

### Tek paragrafta eklenti
Kendi arayüzü ve oda bağlantısı olmayan bir Manifest V3 eklentisi. Odada bir sayfa açılınca site sekmeyi oraya
gönderir; film sayfasında eklenti `shell.html`'i tam ekran katman olarak açar, o da odayı arka plandan öğrenip
sitenin oda sayfasını (`/r/ODA?shell=1`) yükler. Oda bağlantısını site tutar; eklenti sadece aracıdır: her
çerçevedeki içerik betiği en iyi videosunu bildirir, arka plan kazananı seçer ve sitedeki senkron motorunun
aynısı orada çalışır, oynatma mesajları siteye gider, odanın durumu geri gelir. Site oynatıcı alanının yerini
bildirir; üst çerçeve orada bir delik keser (`clip-path`) ve filmin oynatıcısını içine oturtur.

## 🧪 Kalite

| Kontrol | Sonuç |
|---|---|
| Birim testleri (sahte saat ve oynatıcıyla senkron motoru, protokol doğrulama, oda kuralları, herkes hazır, özet, video puanlama) | 140 geçiyor |
| Uçtan uca (gerçek sunucu koduna karşı sahte kullanıcılar: sıra, sohbet, yönetici ve atma, devir, herkes hazır, pinler, özel emojiler, yönetici modları, emoji sıklığı, kayıtlı odalar, özet, Shorts) | `npm run e2e`, CI'da çalışır |
| Eklentiyle gerçek Chrome (`scripts/harness/embed`) | 90 kontrol: oda katmanı, deliğe yerleşme, sayfanın hiç görünmemesi (ekran kaydı), saydam mesajlar (piksel ölçümü), tam ekranda altyazı ve kontroller, pinler, site ile eklenti arasında ayar eşitleme, video seçimi, reklam sekmeleri, yönlendirmeler, ön-reklamlar |
| Gerçek ses (`scripts/harness/voice`) | Sahte mikrofonlu iki Chrome: gelen sesin enerjisi ölçülür; sitede ve film sayfalarında (eklenti), izin sekmesi ve yenileme dahil |
| Gerçek oynatıcılar (herkese açık demo sayfalarında eklenti kodu) | **Plyr, hls.js, Video.js**: bulma ✓, uzaktan + yerel hareketler ✓, 26–100 ms fark |

## 🛠️ Teknoloji

Her yerde TypeScript (strict), ön yüz çatısı yok · Vite · Cloudflare Workers + Durable Objects
(SQLite tabanlı, WebSocket Hibernation) · Chrome Manifest V3 + esbuild · Vitest · GitHub Actions.

```
packages/shared   protokol + doğrulama, oda kuralları, senkron motoru, saat, bağlantı, link tanıma,
                  herkes hazır, özet, video puanlama, logo
apps/server       Worker + Durable Object (oda başına bir)
apps/web          site (sade TS/HTML/CSS)
apps/extension    tarayıcı eklentisi (arka plan, içerik betiği, oda katmanı "shell", site köprüsü, popup)
scripts/          uçtan uca testler, gerçek Chrome eklenti testi, simge / tema çizimi / avatar üreticileri
store/            Chrome Web Store paketi ve ekran görüntüleri
```

## 🚀 Geliştirme

Node.js 20+ gerekir (CI 24 kullanır).

```bash
npm install
npm run dev          # sunucu :8787 + site :5173 (/api yönlendirilir)
npm test             # birim testleri
npm run typecheck
npm run e2e          # yerel sunucuya karşı uçtan uca
```

Eklenti: `npm run build:extension:dev`, sonra `chrome://extensions` → Geliştirici modu → **Paketlenmemiş öğe yükle** →
`apps/extension/dist`.

Yayın: `main`'e gelen her değişiklik GitHub Actions'ta test edilip yüklenir (`CLOUDFLARE_API_TOKEN` ve
`CLOUDFLARE_ACCOUNT_ID` depo sırları gerekir), ardından canlı sunucuya karşı uçtan uca testler koşar.
Yerelden: bir kere `npx wrangler login`, sonra `npm run deploy`.

## 🗺️ Sırada ne var?

Chrome Web Store yayını, yeni oyunlar, kısa alan adı, bas-konuş sesli sohbet, Firefox.

## 📄 Lisans ve gizlilik

[MIT](LICENSE) © 2026 Alperen Aktürk. Kullanıcıya giden bütün kod (site, sunucu, eklenti) bizim; derleme araçları
MIT / Apache-2.0. Gizlilik politikası: [privacy.html](https://screen-with-me.swm-server.workers.dev/privacy.html?lang=tr)
(hesap yok, takip yok; tek seferlik oda boşaldıktan 24 saat sonra, kayıtlı oda 30 gün sonra silinir).

## ⚠️ Sınırlar

- DRM korumalı servisler (Netflix, Disney+…) henüz desteklenmiyor.
- Eklenti henüz Chrome Web Store'da değil (elle kurulum, yaklaşık bir dakika).
- Firefox henüz desteklenmiyor. Başka sitelerdeki sayfalar için eklentili bir masaüstü tarayıcı gerekir.
- ScreenWithMe hiçbir video içeriğini barındırmaz ya da aktarmaz; sadece herkesin kendi açtığı oynatıcıları eşitler.
