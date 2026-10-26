# Rakip Analizi: "Birlikte İzleme" (Watch Together) Çözümleri

_Hazırlanma tarihi: 17 Ekim 2026. Kaynaklar sonda listelidir. Doğrulayamadığım bilgiler **(doğrulanmadı)** diye işaretlidir. Fiyatlar sık değişir; karar vermeden önce resmî sayfadan kontrol edin._

---

## 1. Kısa Özet

1. **Pazar var ama parçalı.** Büyük oyuncular ya belirli sitelere kilitli (Teleparty: Netflix/Disney+/Max… + sınırlı ücretsiz katman), ya her katılımcıdan aynı dosyayı ister (Syncplay), ya da pahalı bir "sanal tarayıcı" mimarisi kullanır (Kosmi, Hyperbeam, neko). Hepsini aynı anda çözen ve ücretsiz olan bir ürün yok.
2. **"Herhangi bir sitedeki HTML5 videoyu senkronla" boşluğu tamamen boş değil.** Chrome Web Store/Firefox'ta bu iddiayla çıkan çok sayıda küçük eklenti var (WatchSync, WatchTwin, WatchMates, byob, SyncClick, Joy2g, syncstream…). Ama hepsi çok küçük (10–2.000 kullanıcı), çoğu 2026'da yeni çıkmış, kalite/dayanıklılık kanıtlanmamış. **Boşluk "yok" değil, "kaliteli, güvenilir, kolay ve açık kaynak bir çözüm yok"** şeklinde.
3. **Büyük rakiplerin en sık şikayeti:** ücretlendirme/iptal sorunları (Teleparty), kararsız senkron ve site güncellemeleriyle bozulan entegrasyonlar, herkesin eklenti kurma zorunluluğu, mobil desteğin zayıflığı, reklamlar (W2G ücretsiz katman).
4. **Bizim için anlamlı mı? Evet — ama "yeni bir kategori" olarak değil, "arkadaş grubu için en az sürtünmeli + iyi senkron + şeffaf açık kaynak" olarak.** Aşama 1 (site + YouTube/doğrudan link) zaten W2G / OpenTogetherTube / byob ile çakışıyor; asıl farklılaşma Aşama 2 (eklenti, iframe içi dahil herhangi bir HTML5 video) ve senkron kalitesinde.
5. **Somut farklılaşma önerileri (öncelik sırasıyla):** (a) iframe içindeki oynatıcıları da yakalayan, güvenilir kayma düzeltmeli senkron; (b) sıfır hesap, tek link, isim bir kez; (c) "herkes eklenti kurmak zorunda" sürtünmesini azaltan karma mod (site oynatıcısı + eklenti); (d) reklam/buffer farklarını yöneten "herkes hazır" bariyeri; (e) tamamen açık kaynak + self-host edilebilir + ücretsiz; (f) Türkçe arayüz/topluluk.
6. **En büyük riskler:** Chrome Web Store'un telifli içeriğe erişimi kolaylaştırma kuralı (listing'de korsan site adı anmamak şart), MV3'te geniş host izni nedeniyle uzayan inceleme, YouTube reklamlarının senkronu bozması, DRM'li içeriğin teknik olarak çalışmaması (bu bir hedef değil, sınır olarak belirtilmeli).
7. **Hukuki çerçeve (genel bilgi, hukuki tavsiye değil):** Araç tarafsız olursa ve içerik barındırılmazsa ABD'de Sony/Betamax mantığı lehine; ama Grokster "teşvik/niyet" ölçütü pazarlama dilinde dikkat gerektirir. Türkiye'deki durum **doğrulanmadı** — gerekirse uzmana danışılmalı.
8. **CV/portföy:** Gerçek zamanlı senkron algoritması (saat farkı tahmini, drift düzeltme), Durable Objects mimarisi, MV3 eklenti, ölçülebilir sonuçlar (sync hata ms'si, kullanıcı sayısı) ve iyi bir README/demo ile güçlü bir proje olur.

---

## 2. Karşılaştırma Tablosu

Kısaltmalar: ✔ var, ✘ yok, ? doğrulanmadı.

| Çözüm | Tür | Desteklediği içerik | Fiyat | Hesap / kurulum | Açık kaynak | Durum (2026) |
|---|---|---|---|---|---|---|
| **Teleparty** | Chrome/Edge eklentisi (+ mobil uygulama) | Belirli servisler: ücretsiz 9 (Netflix, YouTube, Disney+, Max…), Premium +23; "herhangi bir site" değil | Ücretsiz katman + Premium (~$3,99–6,95/ay, kaynaklar tutarsız) | Herkes eklenti kurmalı | ✘ | Aktif (v5.8.5, 8 Eki 2026), ~10M kullanıcı, 4,0★ |
| **Watch2Gether (w2g.tv)** | Site (+ tarayıcı eklentisi) | YouTube, Vimeo, Dailymotion, SoundCloud, doğrudan linkler; Netflix vb. için eklenti iddiası | Ücretsiz (reklamlı) + PLUS/PRO (~$2,9–7,9/ay, kaynaklar tutarsız) | Hesapsız oda; oda linki | ✘ | Aktif topluluk forumu |
| **Syncplay** | Masaüstü uygulama | Yerel dosya (mpv, VLC, MPC-HC/BE, IINA, memento); herkeste aynı dosya olmalı | Ücretsiz | Hesapsız; sunucu + oda adı | ✔ (Apache-2.0) | Aktif (v1.7.6); gayriresmî mobil istemci var |
| **Kosmi** | Site/uygulama (sanal tarayıcı + ekran paylaşımı) | Netflix, YouTube, vb. + oyun/sesli sohbet | Ücretsiz + opsiyonel Premium (fiyat doğrulanmadı) | "No sign-up"; link ile davet | ✘ | Aktif görünüyor; mobil uygulama var |
| **Hyperbeam** | Geliştirici API'si (bulut sanal tarayıcı) | Herhangi bir web sitesi (sunucuda çalışan tarayıcı akıtılır) | 10.000 katılımcı-dk/ay ücretsiz, sonra ~$0,007/dk | Geliştirici entegre eder | ✘ (SDK açık) | Aktif; ürün olarak izleme partisi değil, altyapı |
| **Scener** | Eklenti/site | "Büyük akış servisleri" (liste doğrulanmadı) | Ücretsiz + Premium (fiyat doğrulanmadı) | Hesap (muhtemelen) | ✘ | Site açık (© 2026), ama son haber/yorumlar 2023 (kesinti, fatura şikâyeti) → belirsiz |
| **Rave** | Mobil/masaüstü uygulaması | Çok kaynaklı (Netflix, YouTube, Drive…) | ? | Hesap | ✘ | Apple App Store'dan Ağu 2025'te kaldırıldı, Apple'a dava açtı; Android sürüm listede; zararlı yazılım etiketi iddiaları (zayıf kaynak) |
| **Discord Watch Together / ekran paylaşımı** | Uygulama aktivitesi | Watch Together: yalnızca YouTube (gömülü oynatıcı, Premium girişi yok → reklam görünür); ekran paylaşımı: DRM'li sitelerde siyah ekran | Ücretsiz | Discord hesabı + ses kanalı | ✘ | Aktif |
| **Metastream** | Eklenti + site | "Çeşitli web siteleri", sıra, sohbet, WebRTC | Ücretsiz | Herkes eklenti kurar | ✔ (arşivlendi; son sürüm v0.10.4) | **Arşivlendi (Ağu 2024'ten beri açık kaynak yayını yok)**; CWS 3,7★/573 oy; "siteler çalışmıyor, yüksek CPU" şikâyeti |
| **Jelly Party** | Chrome/Firefox eklentisi | Netflix, Disney+, YouTube, Vimeo, Prime, 4anime.to… | Ücretsiz | Eklenti | ✔ (GPLv3) | **Bırakılmış** (AlternativeTo: discontinued; mağaza güncellemeleri 2021) |
| **OpenTogetherTube** | Site (self-host edilebilir) | YouTube, Vimeo, doğrudan mp4/HLS/DASH | Ücretsiz | Hesapsız; oda linki | ✔ (AGPL-3.0, ~575★) | Aktif görünüyor (3.595 commit) |
| **CyTube** | Site (self-host) | YouTube, Twitch, vb. kanal/çalma listesi | Ücretsiz | Kanal + sohbet | ✔ (MIT, ~1.6k★) | Yaşıyor ama eski nesil UX |
| **neko (m1k1o)** | Self-host sanal tarayıcı (Docker/WebRTC) | Herhangi bir site (sunucudaki tarayıcı) | Ücretsiz (sunucu maliyeti sende) | Docker kurulumu | ✔ (Apache-2.0, ~22.5k★) | Aktif |
| **byob (Bring Your Own Binge)** | Site + MV3 eklenti | YouTube, Vimeo, doğrudan dosya, eklentiyle Crunchyroll/anime siteleri (video elementine bağlanır) | Ücretsiz | Oda linki; eklenti | ✔ (MIT; ~3★) | v6.8.79, 16 Eyl 2026; 17 kullanıcı |
| **WatchSync** | Chrome eklentisi | HTML5 video olan çoğu sayfa; birden çok videoda elle seçim | Ücretsiz | Oda kodu/link | ? | v0.1.0, Nis 2026; 71 kullanıcı |
| **WatchTwin** | Chrome eklentisi | Standart HTML5 oynatıcılar; DRM'li yok; YouTube reklamında parti bekler; P2P yerel dosya | Ücretsiz | Hesapsız | ? | v1.0, May 2026; 10 kullanıcı |
| **WatchMates** | Chrome eklentisi (MV3) | YouTube, Prime, Disney+, Hulu vb.; "herhangi bir video" iddiası | Ücretsiz + Premium (görüntülü/sesli sohbet) | Parti kodu | ? | ~2K kullanıcı, 4,8★/17 |
| **SyncClick** (Firefox) | Firefox eklentisi | Seçilen `<video>` elementi; "I'm Ready" mantığı | Ücretsiz | Invite ID | ? (MPL-2.0 lisans, repo yok) | 1 kullanıcı |
| **syncstream, Joy2g, Watchbear, sync_ext, Twopair** | Küçük eklentiler/projeler | Çoğu "HTML5 video"/YouTube/Netflix | Ücretsiz | Değişken | Çoğu ✔ | Çok küçük, bazıları P2P ile sadece 2 kişi |

> Not: Plex/Jellyfin SyncPlay, Disney+ GroupWatch, Prime Watch Party gibi servislerin kendi yerleşik özellikleri de var; bunlar kendi içeriklerine kilitli olduğundan doğrudan rakip sayılmadı. Bu araştırmada ayrıntılı incelenmedi **(doğrulanmadı)**.

---

## 3. Detaylı İnceleme

### 3.1 Teleparty (eski Netflix Party)
- **Tür/destek:** Chrome (Edge, Opera) eklentisi + mobil uygulama (iOS uygulaması Premium'a bağlı). Ücretsiz katman 9 servis (Netflix, YouTube, Disney+, Max…), Premium +23 servis, video sohbet, özel tepkiler. _Tek tek sitelerle entegrasyon_ — rastgele HTML5 video desteklemez.
- **Fiyat:** Teleparty destek sayfası aylık $6,59 / yıllık $3,99/ay ($47,88) gösteriyor; App Store listesi $6,95/ay veya $49,95/yıl diyor → tutarsız. Yıllık planda 7 gün deneme. (Aracı kaynaklar; resmî sayfa 403 verdi.)
- **Kurulum:** Herkes eklenti kurmalı; oda linki ile katılım.
- **Aktiflik:** CWS listesinde v5.8.5 (8 Ekim 2026), ~10M kullanıcı, 4,0★ / 17,5K oy.
- **Şikâyetler:** Trustpilot'ta fatura/iptal sorunları (aylık seçilip yıllık tahsilat, iptal edememe, yanıtsız destek); Firefox yorumlarında güvenilmez senkron; Prime Video'da sık bozulma; geçmişte (PCWorld) Netflix Party'nin tüm gezinti geçmişini topladığı için Google tarafından kaldırıldığı haberi; Firefox sürümü 2024-03-18'de mağazadan kaldırıldı. Changelog'da düzenli "bağlantı kopması, misafir katılamıyor, reklamlı planlarda oynatma sorunu" düzeltmeleri.
- **Bizim için ders:** Tek tek site entegrasyonu → sürekli bakım yükü; gizlilik güveni çok önemli.

### 3.2 Watch2Gether (w2g.tv)
- Site; "Create your room" ile hesapsız oda; YouTube, Vimeo, Dailymotion, SoundCloud + doğrudan linkler; sohbet, oynatma listesi, webcam. Netflix/Amazon/Disney desteği iddiası eklentiyle (mekanizma doğrulanmadı). Chrome/Firefox/Opera/Edge eklentisi var; ayrı mobil uygulama yok (ana ekrana ekleme).
- **Limitler (resmî forum):** oda boyutu sınırsız (yüzlerce kişide performans düşer); webcam/ses en çok 10 kişi, odada >50 kişi varsa webcam/ses kapanır; liste başına 1000 öğe; harici liste içe aktarma 100 öğe.
- **Fiyat:** Ücretsiz katmanda banner reklam; PLUS (~$2,90/ay yıllık) kendi ziyaret ettiğin odalarda reklamı kaldırır; PRO (~$7,90/ay yıllık) kendi odalarında herkes için reklamsız (ikincil kaynak, doğrulanmadı).
- **Bizim için ders:** En yakın "kolay oda" referansı; ama sadece belirli kaynaklar. Reklam modeli ve sınırlı site desteği bizim açığımız.

### 3.3 Syncplay
- Masaüstü, Apache-2.0, v1.7.6. Oynatıcılar: mpv, mpv.net, MPC-BE, MPC-HC, VLC 3, IINA, memento. Windows/Linux/BSD/macOS. Beş resmî genel sunucu (syncplay.pl:8995–8999). Herkes kendi dosyasına sahip olmalı; oynatma hızı gibi ayarlar senkronlanmaz (ikincil kaynak). Kayma yönetiminde "hızlandır/yavaşlat" ve geri sarma seçenekleri bulunduğu belirtiliyor; tam eşik değerleri **doğrulanmadı**.
- Gayriresmî mobil istemci var (Android 6+/iOS 14+).
- **Bizim için ders:** En olgun senkron mantığı (ready durumu, kayma düzeltme). Bunu açık kaynak koduyla inceleyip fikir almak mantıklı.

### 3.4 Kosmi
- Netflix/YouTube vb. senkron + paylaşılan tarama + ekran paylaşımı + sesli/görüntülü; "No sign-up, no downloads"; link ile davet; mobil uygulama var. Premium fiyat/limit **doğrulanmadı**.

### 3.5 Hyperbeam ve sanal tarayıcı tabanlılar (neko vb.)
- Hyperbeam: bulut tarayıcıyı iframe sorunları olmadan gömer; 1–10.000 katılımcı; 10.000 katılımcı-dk/ay ücretsiz, sonrası ~$0,007/dk. Sitedeki fiyat hesaplayıcısı tutarsız. Başlangıç noktası bir izleme partisi sitesi (Tutturu.tv, ~150K MAU).
- neko: Docker + WebRTC, ~22.5k★, Apache-2.0; izleme partisi kullanım örneği olarak anılıyor.
- **Avantaj:** DRM/iframe/site sorunlarını "bypass" eder (herkes aynı ekranı görür). **Dezavantaj:** sunucuda sürekli video akıtmak = bant genişliği/CPU maliyeti, gecikme, görüntü kalitesi; bizim 15–20 kişilik ücretsiz hedefimize uygun değil. Ayrıca sunucu tarafında içeriğe erişim yasal açıdan farklı bir tabloya yol açar **(doğrulanmadı)**.

### 3.6 Scener
- Site hâlâ açık (© 2026), "tüm büyük akış platformları" ve ücretsiz olduğu söyleniyor; Premium sayfası var ama fiyat bilinmiyor. Son görünür haber/yorumlar 2023 (kesinti, hesap ve fatura şikâyeti). Aktiflik durumu **belirsiz**.

### 3.7 Rave
- Mobil ağırlıklı. Apple Rave'i Ağustos 2025'te App Store'dan kaldırdı ("sahtekârlık iddiaları" ve içerik moderasyonu gerekçesiyle, Rave'e göre rekabet nedenli); Rave dava açtı. Android sürüm listede. Zararlı yazılım etiketi iddiaları düşük kaliteli kaynaktan. Fiyat **doğrulanmadı**. Platform politikası riski için örnek vaka.

### 3.8 Discord Watch Together ve ekran paylaşımı
- Watch Together: YouTube gömülü oynatıcısı; senkronu Discord yapar; Premium girişi desteklenmez → reklamlar görünür; yalnızca İngilizce arayüz; Ekim 2022'de çıktı.
- Ekran paylaşımı: Netflix/Disney+/Hulu/Max'te Widevine DRM nedeniyle siyah ekran; zaten bu durumda Discord ayarı çözmez. Ayrıca herkesin Discord kullanması gerekir.
- **Ders:** Arkadaş grupları Discord'da zaten var; bizim ürünümüz "Discord'a link atıp başla" kadar kolay olmalı.

### 3.9 Metastream
- Açık kaynak, 2,6k★, WebRTC/WebSocket; Chromium ve Firefox; masaüstü Electron uygulaması Widevine lisansı alınamadığı için durdurulmuş. **Arşivlendi**, açık kaynak yayını Ağustos 2024'te bitti. CWS: ~3,7★/573 oy, "siteler çalışmıyor, yüksek CPU" şikâyetleri; ~185 açık issue (ikincil kaynak). Geniş site erişim izni gerektiriyor.
- **Ders:** Güzel fikir ama bakımsız kaldı; sürdürülebilirlik farklılaşma noktası olabilir.

### 3.10 Genel HTML5 senkron eklentileri
- **WatchSync** (CWS, v0.1.0, Nis 2026, 71 kullanıcı): oda kodu/linki, play/pause/seek/resync/hız senkronu; birden fazla videoda elle seçim. İframe desteği belirtilmemiş.
- **WatchTwin** (CWS, v1.0, 24 May 2026, 10 kullanıcı): hesapsız, P2P yerel dosya paylaşımı; DRM'li servisler çalışmaz; YouTube reklamında parti bekler.
- **WatchMates** (~2K kullanıcı, 4,8★): geniş host izni; Premium'da görüntülü/sesli sohbet.
- **byob** (açık kaynak, MIT): Elixir/Phoenix LiveView, oda başına GenServer, NTP tarzı saat senkronu, MV3 eklentisi; sitelerdeki `<video>` elementine bağlanır. Çok küçük (17 kullanıcı).
- **SyncClick** (Firefox): `<video>` seçimi, "I'm Ready" mantığı; 1 kullanıcı.
- **Joy2g, syncstream, Watchbear, sync_ext (P2P), Watch Together (WebRTC, yalnızca 2 kişi), Twopair**: küçük/niş.

> **Çıkarım:** Bu eklentilerin "iframe içindeki oynatıcıları da yakalama", "kayma düzeltme" ve "bakım" konusunda ne kadar iyi olduğu **doğrulanmadı** — çoğunun mağaza sayfasında bu bilgi yok. Kullanıcı kitlesi sıfıra yakın olduğu için gerçek dünya testi eksik.

### 3.11 Açık kaynak siteler
- **OpenTogetherTube** (AGPL-3.0): hesapsız oda, YouTube/Vimeo/mp4/HLS/DASH, SponsorBlock, oylama, DJ modu; self-host. **Eklenti yok**, rastgele site yok.
- **CyTube** (MIT): 2013'ten beri; kanal, sohbet, ortak liste; eski UX.

---

## 4. Değerlendirme

### 4.1 Boşluk gerçekten var mı?
Aranan kombinasyon: ücretsiz + hesapsız + herhangi bir site/iframe'deki HTML5 video + kolay oda linki + iyi senkron.

| Kriter | En iyi mevcut çözümler | Eksik |
|---|---|---|
| Ücretsiz & hesapsız | W2G, OpenTogetherTube, byob, Kosmi | W2G reklamlı |
| Herhangi bir site | WatchSync, WatchTwin, byob, Metastream (arşiv), Jelly Party (bırakılmış) | Küçük/yeni/bakımsız; iframe belirsiz |
| Güvenilir senkron | Syncplay (yerel dosya) | Tarayıcıda eşdeğeri belirsiz |
| Mobil | Kosmi, Rave (sorunlu), Syncplay mobil (gayriresmî) | Eklentiler mobil Chrome'da çalışmaz |
| Açık kaynak + bakım | byob, OTT, Syncplay | Çok az kullanıcı/dokümantasyon |

**Sonuç:** "Hiç yok" demek yanlış olur. Gerçek boşluk: **kullanıcıların güvenebileceği, iyi dokümante edilmiş, açık kaynak, iframe-farkında, mükemmel kayma düzeltmeli ve sürekli bakımı yapılan bir eklenti + oda sitesi**. Kısa vadede 15–20 kişilik arkadaş grubu için yeterli; büyürse güvenilirlik kritik.

### 4.2 Farklılaşma noktaları (öncelik sırasıyla)
1. **Senkron kalitesi:** sunucu otoriteli zaman damgası, istemci saat farkı tahmini (NTP benzeri), küçük kaymada `playbackRate` ile yumuşak düzeltme, büyük kaymada seek; tıkanma/buffer durumunda "herkesi bekle"; uzaktan komutun yerel olay olarak geri yansımasını (echo loop) engelleme. _(Mühendislik önerisi; Syncplay ve TogetherJS örnekleri referans.)_
2. **İframe içi video yakalama (Aşama 2):** içerik betiğini `all_frames: true` + geniş `matches` ile enjekte etmek; Chrome belgeleri `all_frames`'in eşleşen tüm çerçevelere enjekte ettiğini söylüyor. Rakipler bu konuda belirsiz.
3. **Sıfır sürtünme:** hesap yok, isim bir kez, tek link; eklentiyi kurmayanlar için "web oynatıcı modu" (YouTube/doğrudan link) ile aynı odada kalabilmek (karma mod).
4. **Hazır bariyeri:** SyncClick'teki "I'm Ready" fikri ve WatchTwin'deki "reklamda parti bekler" davranışı; herkesin reklam/buffer'ı bitirmesini beklemek.
5. **Şeffaflık/güven:** Teleparty geçmişte gezinti geçmişi topladığı için mağazadan kaldırılmıştı. Bizim için: minimum veri, açık kaynak, net gizlilik politikası, sadece aktif odada `<video>`'ya erişim.
6. **Ücretsiz, reklamsız, self-host:** Cloudflare Workers + Durable Objects ücretsiz katmanı (günde 100K istek, 13K GB-sn süre; WebSocket gelen mesajlar 20:1 oranında faturalanır; Hibernation API ile boşta süre ücreti yok) küçük gruplar için yeterli olabilir — ama yük tahmini yapılmalı.
7. **Türkçe arayüz ve yerel topluluk ihtiyaçları.**

### 4.3 Rakiplerden alınacak iyi fikirler
- **Syncplay:** ready durumu, kayma düzeltme, OSD mesajları, herkesin durumunu gösterme.
- **W2G:** hesapsız "oda oluştur" tek tık, oynatma listesi, webcam/ses isteğe bağlı.
- **OpenTogetherTube:** oda izinleri, oylama/DJ modu, SponsorBlock (YouTube için).
- **byob:** saat senkronu, hem site hem eklenti; oda başına izole durum (bizde Durable Object).
- **SyncClick:** "I'm Ready" mantığı; elle `<video>` seçme (çoklu video sayfaları için).
- **Teleparty:** tepkiler/emoji, uygulama içi sohbet (isteğe bağlı), net site listesi.
- **Metastream:** yönetici izinleri, kullanıcı atma.
- **Discord:** "link at, katıl" hissi.

---

## 5. Riskler

### 5.1 Teknik
- **Cross-origin iframe:** `all_frames: true` ve geniş `matches` ile içerik betiği her çerçeveye girebilir; ancak her çerçevenin URL'si kendi başına eşleşmelidir, `match_origin_as_fallback` yalnızca `about:/data:/blob:/filesystem:` çerçeveleri için işe yarar (Chrome belgeleri). Üst çerçeve ile iframe arasındaki video durumu mesajlaşması tasarlanmalı.
- **Birden çok video:** reklam, önizleme, arka plan videoları — doğru `<video>` seçimi (en büyük/oynayan/kullanıcı seçimi) gerekir (WatchSync de manuel seçimle çözüyor).
- **Özel oynatıcılar:** bazı siteler `<video>` yerine MSE/Canvas/Shadow DOM veya kendi API'sini kullanır; seek/rate çağrıları kısıtlanabilir (site JS'si eventleri geri sarabilir).
- **DRM (Widevine/EME):** `<video>` elementine kontrol (play/pause/seek) çoğu zaman mümkündür ama içerik erişimi yok; DRM'li siteler zaten hedef değil. Ekran paylaşımı yaklaşımlarında siyah ekran olur (Discord örneği). Netflix/Disney+ gibi sitelerde site kendi senkron çözümünü dayatabilir **(doğrulanmadı)**.
- **Autoplay politikası:** tarayıcılar kullanıcı etkileşimi olmadan sesli oynatmayı engeller; YouTube API `onAutoplayBlocked` olayını veriyor. "Katıl → bir kez tıkla" akışı gerekir.
- **YouTube reklamları:** IFrame API resmî belgesi reklamlardan hiç bahsetmiyor; reklamın `getPlayerState` üzerinde nasıl göründüğü **doğrulanmadı**, ama pratikte herkes aynı anda reklam görmediği için senkron bozulur. Çözüm: "herkes hazır" bariyeri (WatchTwin'deki gibi) ve reklam sırasında komutları ertelemek. Ayrıca YouTube geliştirici politikası reklamları engellemeyi/değiştirmeyi yasaklıyor; reklam engelleyici kullanımı kullanıcı tarafında, bizim yazılımımızda değil.
- **YouTube API tuhaflıkları:** TogetherJS koduna göre seek sırasında pause→pause→play gibi sahte durum değişimleri oluşur; bayrakla bastırılmalı. Hız değişimi garanti değildir (`setPlaybackRate` önerilen hızı ayarlar, `onPlaybackRateChange` ile doğrulanmalı); `loadVideoById` hızı 1'e sıfırlar.
- **Manifest V3:** Uzaktan kod yasağı — sunucudan gelen mesajlar yalnızca veri olmalı, `eval`/`new Function`/uzaktan `<script>` yok. Servis çalışanı (service worker) uzun ömürlü WebSocket tutamaz; bağlantı içerik betiğinde veya offscreen belgede tutulmalı **(mühendislik notu, test edilmeli)**.
- **Mobil:** Chrome Android eklentileri desteklemez (Kiwi/Firefox Android hariç) — bu yüzden Aşama 1 site önemli.
- **Durable Objects limitleri:** Ücretsiz plan günde 100K istek, 13K GB-sn süre, 100K SQL satır yazma; aşılırsa işlemler hata verir. Boşta kalan hibernate edilebilir DO'lar süre ücreti almaz; `accept()` yerine Hibernation API kullanmak gerekir. Yoğun `timeupdate` yayını istek sayacını şişirir → mesaj sıklığını düşük tut.

### 5.2 Chrome Web Store
- **Telifli içerik kuralı (resmî):** "Do not encourage, facilitate, or enable the unauthorized access, download, or streaming of copyrighted content or media." ve "Do not facilitate unauthorized access to content on websites, such as circumventing paywalls or login restrictions." (Malicious and Prohibited Products politikası.) DRM atlatmayı ayrıca anmıyor.
- **Emsal vakalar:** Torrent arama eklentileri (The Pirate Bay, KickassTorrents, Torlock vb.) bu gerekçeyle mağazadan kaldırıldı (TorrentFreak, yıllar önce, yaklaşık 2013–2014 **doğrulanmadı**). HLS indirici eklentisi Globo bildirimi sonrası kaldırılmış (tarihsiz). Netflix Party'nin kaldırılma nedeni korsanlık değil, gezinti geçmişi toplamasıydı. **Watch-party eklentisinin korsan sitelerle ilişkilendirildiği için reddedildiğine dair yayımlanmış bir vaka bulamadım (doğrulanmadı).**
- **Pratik öneriler:** Listing metninde, ekran görüntülerinde ve açıklamada HDFilmCehennemi vb. site adlarını **anma**; "herhangi bir HTML5 video, lisanslı/kendi içeriğin" çerçevesi; gizlilik politikası; en az gerekli izin. Geniş host izni (`<all_urls>`) incelemeyi uzatır ve "gereksiz izin" reddi riski taşır; gerekçelendirmek gerekir. Yedek yol: Firefox Add-ons, Edge, GitHub'dan elle yükleme.
- **MV3 gereksinimi:** İşlev kodunun tamamı pakette görülebilir olmalı (uzaktan mantık yok).

### 5.3 Hukuki çerçeve (genel bilgi, hukuki tavsiye değildir)
- **ABD emsalleri:** Sony v. Universal (Betamax): "ticari olarak önemli telif ihlali içermeyen kullanım"a elverişli bir ürün için katkı sorumluluğu doğmaz. MGM v. Grokster: aktif teşvik/niyet varsa sorumluluk doğabilir. Bir izleme partisi aracı tarafsız olup içerik barındırmıyor ve korsan kullanımı reklam etmiyorsa Sony tarafı lehine; pazarlama dili Grokster tarafında risk yaratır.
- **Türkiye:** FSEK 71 ve 5651 (yer sağlayıcı/erişim engeli) kapsamında linkleme ve aracı sorumluluğu **doğrulanmadı**. Arama sonuçları genel yer sağlayıcı sorumluluğuna işaret ediyor (bildirimden sonra sorumluluk) ama linke özgü hüküm netleşmedi. Proje büyürse/ticarileşirse yerel hukuk görüşü alın.
- **Pratik:** İçerik barındırma yok; kullanıcı linkleri sunucuda saklanmasın ya da oda ömrüyle silinsin; DMCA/telif bildirimi için iletişim e-postası; kullanım şartlarında "yalnızca erişim hakkınız olan içerik" ibaresi; HDFilmCehennemi gibi sitelerin adı hiçbir resmî metinde geçmesin.

### 5.4 Diğer
- **Gizlilik:** Eklenti her sayfada çalıştığı için gezinti geçmişi toplama iddiası (Netflix Party örneği) güven kaybettirir. Yalnızca aktif odada ve yalnızca video durumu iletilmeli.
- **Platform riski:** Rave–Apple örneği; mağazalar bir gün kaldırabilir → Aşama 1 web sitesi her zaman yedek.
- **Kötüye kullanım:** Herkese açık odalar spam/taciz; link tahmin edilemez olmalı (yeterince uzun oda kimliği), kısa oda ömrü.

---

## 6. CV / Portföy Açısından

- **Teknik hikâye:** "Gerçek zamanlı senkron algoritması" (saat farkı tahmini, drift düzeltme, echo-loop engelleme), Cloudflare Durable Objects + WebSocket Hibernation, MV3 eklenti (iframe/frames), monorepo + paylaşılan tipli protokol (zod veya benzeri) — mülakatlarda anlatılabilir.
- **Ölçülebilir sonuçlar:** Gerçek bir ölçüm harnesi yazın (ör. 5 istemcide oynatma konumu farkı p50/p95 ms), ölçümü README'ye grafikle koyun. "N kullanıcıda ortalama sapma X ms" cümlesi çok değerli.
- **Test ve kalite:** Protokol ve senkron mantığı için birim testler; sahte saat ile deterministik testler; eklenti için Playwright e2e (iki sekme, yerel `<video>` sayfası ve iframe'li sayfa); CI (GitHub Actions); sürümleme.
- **Dokümantasyon:** Mimari diyagram, protokol şeması, "neden Durable Objects", "rakiplerden farkı" (bu rapor), kısa demo GIF'i/videosu, canlı demo bağlantısı.
- **Güven/profesyonellik:** Gizlilik politikası, ihlal bildirimi sayfası, ücretsiz katman maliyet analizi, lisans seçimi (MIT/Apache-2.0).
- **Pozisyonlama:** "Korsan film sitesi aracı" yerine "tarafsız, açık kaynak, gizlilik odaklı gerçek zamanlı video senkron aracı" olarak çerçevelendirin (hem mağaza hem CV için daha güvenli).
- **Büyüme:** Chrome Web Store + Firefox Add-ons yayını, küçük bir tanıtım sayfası (Türkçe/İngilizce) ve gerçek kullanıcı yorumları.

---

## 7. Açık / Doğrulanmayan Noktalar
- Teleparty güncel resmî fiyat/ücretsiz servis listesi (resmî sayfalar 403 verdi).
- W2G PLUS/PRO fiyatları ve eklentisinin teknik yaklaşımı.
- Kosmi ve Scener Premium fiyatları/limitleri; Scener'in aktif olup olmadığı.
- Rave'in güncel fiyatı ve mevcut durumu; "zararlı yazılım" iddiaları.
- Syncplay kayma düzeltme eşik değerleri.
- Küçük genel eklentilerin iframe desteği ve gerçek senkron kalitesi.
- YouTube IFrame API'nin reklam sırasında durum raporlaması.
- Chrome Web Store'da watch-party eklentisi reddi/kaldırma vakası var mı (bulunamadı).
- Türkiye'de FSEK/5651 kapsamında linkleme ve araç sağlayıcı sorumluluğu.
- Ayrıntıya girilmeyen: Plex/Jellyfin SyncPlay, Prime/Disney+ yerleşik grup izleme.

---

## 8. Kaynaklar

**Teleparty**
- [Chrome Web Store: Teleparty](https://chromewebstore.google.com/detail/netflix-party-is-now-telep/oocalimimngaihdkbihfgmpkcpnmlaoa)
- [Teleparty destek (ikincil kopya)](https://ww1.teleparty.com/support)
- [Trustpilot yorumları](https://uk.trustpilot.com/review/teleparty.com)
- [Firefox istatistik sayfası (Firefox'tan kaldırılma)](https://firefox-stats.com/d/netflix-party-is-now-teleparty)
- [PCWorld: Netflix Party kaldırılması](https://www.pcworld.com/article/919764/google-removes-malicious-chrome-extensions-with-millions-of-users.html)

**Watch2Gether**
- [w2g.tv](https://w2g.tv/)
- [Resmî forum: sınırlamalar](https://community.w2g.tv/t/faq-what-are-the-limitations-of-watch2gether/148839)
- [ElectronicsHub: W2G rehberi (fiyatlar)](https://www.electronicshub.org/watch2gether/)
- [Common Sense Media](https://www.commonsensemedia.org/website-reviews/watch2gether)

**Syncplay**
- [syncplay.pl](https://syncplay.pl/)
- [Linux Uprising: Syncplay](https://www.linuxuprising.com/2020/04/watch-synchronized-videos-with-your.html)
- [Syncplay Mobile (gayriresmî)](https://github.com/yuroyami/syncplay-mobile)

**Kosmi, Hyperbeam, Scener, Rave, Discord**
- [Kosmi](https://kosmi.io/)
- [Hyperbeam](https://www.hyperbeam.com/) · [YC profili](https://www.ycombinator.com/companies/hyperbeam)
- [Scener](https://www.scener.com/) · [Scener CWS (2023 yorumları)](https://chrome.google.com/webstore/detail/scener/lkhjgdkpibcepflmlgahofcmeagjmecc?hl=en-US)
- [Rave / Apple davası (mjtsai)](https://mjtsai.com/blog/?p=51838)
- [Discord Watch Together yardım](https://support-apps.discord.com/hc/en-us/articles/26502500234519-Watch-Together)
- [Discord Netflix siyah ekran (ikincil)](https://ponderworthy.com/why-you-cant-stream-netflix-on-discord-and-how-to-actually-fix-the-black-screen-1iw6)

**Açık kaynak / eklentiler**
- [Metastream](https://github.com/samuelmaddock/metastream)
- [neko](https://github.com/m1k1o/neko)
- [OpenTogetherTube](https://github.com/dyc3/opentogethertube)
- [CyTube](https://github.com/calzoneman/sync)
- [byob.video repo](https://github.com/joegoldin/byob.video) · [Firefox listesi](https://addons.mozilla.org/en-US/firefox/addon/byob-bring-your-own-binge/)
- [WatchSync (CWS)](https://chromewebstore.google.com/detail/dgdoakihfgindcpfeaojbelkemcadehj)
- [WatchTwin (Chromeboard)](https://chromeboard.com/extension/watchtwin-cabbpnijoghileacfdhabdkchkdbmnpc)
- [WatchMates (ExtScope)](https://extscope.org/extension/mbjbkmcilnadbcippienipekcnilkild)
- [SyncClick (Firefox)](https://addons.mozilla.org/firefox/addon/syncclick/)
- [Joy2g (CWS)](https://chromewebstore.google.com/detail/watch-together-on-joy2g/hieioehhoilpiifpfmkdbhmhbapecabl)
- [Jelly Party (Firefox)](https://addons.mozilla.org/addon/jelly-party/)
- [AlternativeTo: Teleparty alternatifleri](https://alternativeto.net/software/netflix-party)

**Chrome Web Store politikaları ve MV3**
- [Politika dizini](https://developer.chrome.com/docs/webstore/program-policies/)
- [Malicious and Prohibited Products](https://developer.chrome.com/docs/webstore/program-policies/malicious-and-prohibited)
- [Impersonation & Intellectual Property](https://developer.chrome.com/docs/webstore/program-policies/impersonation-and-intellectual-property)
- [MV3 gereksinimleri](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements)
- [İnceleme süreci](https://developer.chrome.com/docs/webstore/review-process)
- [İçerik betikleri (all_frames vb.)](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
- [TorrentFreak: torrent arama eklentileri yasağı](https://torrentfreak.com/?p=80752)

**YouTube API, Cloudflare**
- [YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference)
- [TogetherJS YouTube senkron kodu](https://togetherjs.com/source/youtubeVideos.js.html)
- [Durable Objects fiyatlandırma](https://developers.cloudflare.com/durable-objects/platform/pricing/)

**Hukuk**
- [MGM v. Grokster (Cornell)](https://www.law.cornell.edu/supct/html/04-480.ZC.html)
- [Sony v. Universal (okuma metni)](https://course.khoury.northeastern.edu/is2000f10/readings/sony.pdf)
- [Yer sağlayıcıların telif sorumluluğu (TR, ikincil)](https://beta.gun.av.tr/media/p55gh4ls/yer-saglayicilarin-telif-hakki-ihlalinden-kaynaklanan-hukuki-ve-cezai-sorumlulugu.pdf)
