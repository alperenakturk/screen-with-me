# Yayın açma (ekran / sekme / kamera paylaşımı): araştırma + öneri

Soru: Odada biri "yayın açabilsin" mi? Yani kendi ekranını, bir sekmeyi ya da kamerasını odadakilere canlı yollasın.
Nasıl yapılır, kaç kişiye yeter, ne kadara mal olur, mağaza ve telif açısından riskli mi?

> Ekim 2026. Sadece araştırma; ürün koduna dokunulmadı. Ses/görüntü altyapısı için önce `ses-goruntu.md` (eşler arası
> sesli sohbet 0.9.59'da var; Cloudflare Realtime kart istediği için kullanılmıyor). Bulut ortamından
> developer.chrome.com'a erişilemedi; eklenti API ayrıntıları Chrome belgelerinden bildiklerime ve arama sonuçlarına
> dayanıyor, uygulamadan önce gerçek Chrome'da denenmeli (aşağıda "Denenmesi gerekenler").

## Kararlar (kullanıcı, 27 Ekim 2026)

- Öneri kabul: **film yayma yok**, korsan hiçbir şey yok; senkron modeli aynen kalır. Eklentide film sekmesi yayını
  (`tabCapture`) **yapılmayacak**.
- **Sitede düz ekran paylaşımı** (ekran/pencere/sekme, `getDisplayMedia`) + kamera, eşler arası, kart/hesap yok: bölüm 6
  aşama 1 + 2 (odada tek yayın, en fazla 4 izleyici, 720p; kabukta yayın açma yok, izleme var).
- 1080p / ücretli SFU "ileride".
- **Kişi sınırları hep açıkça gösterilsin** (ör. "Seste 4/6", "Yayını izleyen 3/4"); sınıra yaklaşınca/dolunca uyarı ve
  neden (eşler arası, yükleme hızı); dolunca düğme soluk + açıklama balonu. Sesli sohbete de (0.9.63'te yapıldı).

> **Durum:** 1. aşama 0.9.64'te (sitede ekran/kamera, mesh, ≤4 izleyici). 2. aşama 0.9.66'da: kalite seçimi ("yazı net"
> 15 kare + keskinlik / "akıcı" 30 kare), yöneticinin yayını durdurması, `settings.liveHostOnly`.

## Kısaca

- **Gelebilir, ama "film yayını" olarak değil.** ScreenWithMe'nin gücü şu: herkes videoyu **kendi** tarayıcısında, kendi
  kaynağından oynatıyor, biz sadece zamanı eşitliyoruz (Teleparty de böyle). Biri filmi ekran paylaşımıyla yayınlarsa
  (1) içeriği başkalarına **yeniden dağıtmış** oluruz → telif ve Chrome Web Store riski, (2) DRM'li içerik zaten
  **siyah** görünür (DRM asla aşılmaz), (3) görüntü yayıncının yükleme hızına bağlı, bulanık ve gecikmeli olur.
- **Önerim:** "📺 Ekranını paylaş" adında, **sitede** çalışan, **eşler arası (mesh)** küçük bir özellik: bir kişi yayın
  yapar, odada **en fazla 4 izleyici**, **720p / 15–30 kare**. Amaç film değil: oyun oynarken göstermek, fotoğraf/sunum,
  "bak şu siteye", kamerayla el sallamak. Kart/hesap/para **gerekmez** (sesli sohbetteki STUN + sinyalleşme aynen).
- **Eklentide film sekmesini yayınlamak (`chrome.tabCapture`) önermiyorum** (en azından mağaza onayından önce): teknik
  olarak mümkün ama ürünü "film dağıtma aracına" çevirir, mağaza "tek amaç" ve telif açısından en riskli parça bu.
- **Daha kalabalık yayın** (5+ izleyici, 1080p) ancak sunucu aracı (SFU) ile olur: Cloudflare Realtime **kart** ister
  (ücretsiz kota ayda 1.000 GB, sonra 0,05 $/GB, harcama tavanı yok), LiveKit Cloud ücretsizde ~50 GB, kendi sunucumuz
  bakım ister. Kullanıcı kart girmeden bu adım yok.
- **İş:** 1. aşama (sitede ekran/kamera paylaşımı, mesh, ≤4 izleyici) **~1–1,5 hafta**; mevcut `voice-p2p.ts` altyapısı
  büyük ölçüde yeniden kullanılır.

---

## 1. Kavramlar (kısa)

- **`getDisplayMedia()`**: tarayıcının "ekranını paylaş" penceresi. Kullanıcı **bir sekme, bir pencere ya da tüm ekranı**
  seçer. Chrome'da sekme seçilince "sekme sesini de paylaş" kutusu çıkar (pencere/ekranda ses Windows'ta tüm sistem sesi,
  Mac'te yok). Her seferinde kullanıcı seçer; site kendiliğinden hiçbir şey yakalayamaz (güvenli).
- **`getUserMedia()`**: kamera/mikrofon (sesli sohbette zaten kullanıyoruz).
- **Mesh (eşler arası)**: yayıncı her izleyiciye **ayrı bir kopya** yollar. İzleyiciler bir şey yollamaz.
- **SFU**: yayıncı akışı **bir kez** sunucuya yollar, sunucu izleyicilere dağıtır.

## 2. Ekran / sekme paylaşımı

### 2a. Sitede `getDisplayMedia` + mesh

Bant genişliği hesabı (yayıncının **yükleme** hızı belirleyici; izleyiciler sadece indirir):

| Kalite | Bit hızı (yaklaşık) | 2 izleyici | 4 izleyici | 6 izleyici |
|---|---|---|---|---|
| 480p, 15 kare (yazı/slayt) | ~0,8 Mbit/s | 1,6 | 3,2 | 4,8 Mbit/s |
| **720p, 30 kare** | ~1,5–2,5 Mbit/s | 3–5 | **6–10** | 9–15 Mbit/s |
| 1080p, 30 kare | ~3–4 Mbit/s | 6–8 | 12–16 | 18–24 Mbit/s |
| + sekme sesi (Opus stereo) | ~0,1 Mbit/s | | | |

- Türkiye'de ev bağlantılarında yükleme çoğunlukla **birkaç Mbit/s ile ~20 Mbit/s** arası (VDSL düşük, fiber yüksek).
  Üstelik yayıncı aynı anda sesli sohbette ve kendi videosunu da izliyor olabilir.
- İşlemci: mesh'te her izleyici için ayrı kodlama yapılır (tarayıcı bunu tek kodlayıcıyla paylaşamıyor; donanım
  kodlayıcı yoksa dizüstü ısınır). Pratik sınır kaynaklarda da **~4 kişi**.
- **Sonuç: 720p'de en fazla 4 izleyici.** Yükleme yetmezse WebRTC kendisi kaliteyi düşürür (çözünürlük/kare iner);
  bunu ayrıca `RTCRtpSender.setParameters({ encodings: [{ maxBitrate, scaleResolutionDownBy }] })` ile sınırlarız ve
  `contentHint = 'detail'` (yazı/slayt net kalsın) ya da `'motion'` (oyun/video akıcı kalsın) seçeriz.
- **Gecikme:** doğrudan bağlantıda ~0,1–0,3 sn. Yani paylaşılan şey diğerlerinde **eşitlenmiş film değil, canlı
  görüntü**: yayıncının sesiyle görüntüsü birlikte gelir, zaman eşitlemesine gerek yok.
- **TURN yok** (Cloudflare TURN de kart istiyor): okul/şirket ağı ya da bazı mobil operatörlerde doğrudan bağlantı
  kurulamazsa yayın açılmaz. Sesli sohbette de aynı sınır var; "bağlanamadı" mesajı net olmalı.
- **Gizlilik:** sesli sohbetteki gibi IP sadece yayına katılanlar arasında görünür (sinyalleşmeyi sunucu sadece
  yayıncı ↔ izlemeyi seçen kişi arasında aktarır).

### 2b. Kabukta (film sayfasındaki katman)

`ses-goruntu.md`'deki deneme burada da geçerli: katmandaki sitemiz `getDisplayMedia` isterse iframe'lere
`allow="display-capture"` gerekir ve izin **film sitesinin adına** sayılır, film sitesi `Permissions-Policy` ile
engelleyebilir. Film sitesine kapı açmamak için **kabukta yayın açma olmasın**; yayın sadece ana sitedeki odadan
başlar. Kabuktaki kişi **izleyici** olabilir (gelen görüntüyü almak izin istemez).

### 2c. Eklentide film sekmesini yayınlamak (`chrome.tabCapture` + offscreen)

Nasıl olurdu: popup'taki düğmeye basılınca (kullanıcı hareketi şart) arka plan `chrome.tabCapture.getMediaStreamId
({ targetTabId })` alır, kimliği **offscreen belgeye** verir (Chrome 116'dan beri arka plandan alınan kimlik offscreen'de
kullanılabiliyor), offscreen `getUserMedia({ video: { mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId } } })`
ile sekmenin görüntüsünü + sesini alır ve WebRTC ile yollar. Dikkat: yakalanan sekmenin sesi kullanıcıya **kesilir**,
offscreen'de bir `AudioContext`'e bağlayıp tekrar çalmak gerekir.

Neden önermiyorum:
- **Ürünü değiştirir.** Bugün film sayfasında herkes kendi kaynağını açar; tabCapture ile "bir kişi açar, herkes onu
  izler" olur. Bu, film sitesinin içeriğini **yeniden yayınlamak** demek (telif sahibinin hakkı). Senkron aracı
  tarafsızdır, yayın aracı değildir; mağazada ve olası şikâyetlerde savunmamız bu.
- **DRM'li içerik siyah görünür** (aşağıda) → en çok istenecek kullanım (büyük servisler) zaten çalışmaz; çalıştığı yer
  çoğunlukla korunmasız (ve sıklıkla korsan) siteler olur. Bu tam olarak resmî metinlerde uzak durduğumuz alan.
- **İzin:** `tabCapture` (ve `offscreen`) eklemek gerekir. `<all_urls>` zaten var, uyarı metni büyük ölçüde değişmez,
  ama inceleyici her iznin gerekçesini sorar; "film sekmesini başkalarına yayınlamak" gerekçesi reddedilme riski taşır.
- **Mağazaya gönderim henüz yapılmadı:** ilk incelemeyi en sade izinlerle geçmek daha güvenli.

Eğer ileride yapılırsa sınırları: sadece kendi sekmesi, sadece kullanıcı başlatır, DRM'li video varsa (`video.mediaKeys
!== null`) yayın hiç başlamaz, ekranda sürekli "🔴 Yayındasın" rozeti.

### DRM'li içerik

- Widevine/PlayReady ile korunan videolar (büyük abonelik servisleri) ekran/sekme yakalamada **siyah kare** olarak
  görünür ya da görünmesi platforma göre değişir (donanım çözmede siyah; bazı yazılım çözme durumlarında görünebilir).
  Kullanıcı forumlarında "paylaşınca siyah ekran" şikâyeti çok yaygın; çözüm olarak "donanım hızlandırmayı kapat" gibi
  numaralar dolaşıyor.
- **Bizim kuralımız değişmez: DRM asla aşılmaz.** Siyah görünüyorsa siyah kalır; "donanım hızlandırmayı kapat" gibi
  ipuçları **hiçbir yerde** verilmez. Büyük servisler için yol `VIZYON.md` "Büyük servisler"daki gibi: herkes kendi
  aboneliğiyle izler, biz oynatıcıya komut veririz.
- Arayüzde: yayınlanan sekmede korumalı video varsa sitemiz bunu bilemez (başka sekme); o yüzden yayın penceresinde tek
  satır not: "Korumalı (abonelikli) videolar paylaşımda siyah görünür; onları birlikte izlemek için linki odaya ekleyin."

## 3. Kamera / "canlı yayın" (bir yayıncı, çok izleyici)

| | Mesh (bugünkü altyapı) | Cloudflare Realtime SFU | LiveKit Cloud | LiveKit / mediasoup kendi sunucumuz |
|---|---|---|---|---|
| Para | 0 $ | ayda 1.000 GB ücretsiz, sonra 0,05 $/GB | ücretsiz ~5.000 katılımcı-dk / 50 GB, sonra 50 $/ay | VPS ~5–10 €/ay |
| Kart | yok | **gerekli**, tavan yok | ücretsizde yok | VPS için ödeme |
| İzleyici (720p) | ~4 | yüzlerce (biz sınırlarız) | yüksek | yüksek |
| İş | az (ses kodu var) | orta (`realtime.ts` sesi için hazır iskelet) | orta (SDK, dış bağımlılık) | yüksek (sunucu işletme) |
| IP gizliliği | ➖ katılanlar arası | ➕ | ➕ | ➕ |

Hesap (SFU, 720p ≈ 2 Mbit/s ≈ **0,9 GB / izleyici-saat**): 1.000 GB ücretsiz kota ≈ **~1.100 izleyici-saat** /ay. Örn.
günde 5 yayın × 1 saat × 4 izleyici = 600 GB/ay → 0 $. Ama tavan olmadığı için `ses-goruntu.md` aşama 4'teki **bütçe
freni** şart; video sesin ~50 katı tükettiği için fren önce yayını kesmeli.

Ücretsiz kalma yolları:
1. **Mesh + küçük oda** (önerilen başlangıç).
2. **Zincir/ağaç dağıtım** (izleyici aldığı akışı bir sonrakine aktarır): sunucusuz büyür ama her halkada gecikme ve
   kopma artar, ev bağlantılarında kırılgan. Önermiyorum.
3. **Kart girilirse** Cloudflare SFU: kod yolu sesle aynı (`welcome.voiceMode === 'sfu'`), video için ayrı sınır.

Kamera için ayrıca: varsayılan kapalı, 360p–480p yeterli (baloncuk), aynı anda en fazla 1 yayın + mesh'te 4 izleyici.

## 4. Rakipler nasıl yapıyor

| Ürün | Yayın biçimi | Ücret / sınır |
|---|---|---|
| **Teleparty** | Ekran paylaşımı yok; herkes kendi aboneliğiyle izler, sadece zaman eşitlenir (bizim modelimiz) | Görüntülü sohbet Premium |
| **Watch2Gether** | Kamera + "ekran paylaşımı" WebRTC ile (eşler arası) | Kamera/ses aynı anda en fazla 10 kişi; oda 50'yi geçerse kapanır; ekran paylaşımı sınırı belgelenmemiş |
| **Kast** | Asıl ürünü ekran/kamera paylaşımı (masaüstü uygulaması + sunucular) | Ekran paylaşımı **ücretli üyelikte**; ~20 paylaşan / ~100 izleyici |
| **Hyperbeam** | Bulutta sanal tarayıcı, herkes aynı görüntüyü izler | Sunucu maliyeti yüksek, geliştirici API'si ücretli; durumu belirsiz |
| **Discord Go Live** | Uygulamanın kendi medya sunucuları | Ücretsiz 720p/30; Nitro 1080p/60+; izleyici sınırı kaynaklara göre ~50 |

Çıkarım: ekran paylaşımını iyi yapanlar (**Kast, Discord, Hyperbeam**) ya **sunucu parası** ödüyor ya da **ücretli
katmana** koyuyor. Ücretsiz ve sunucusuz olan Watch2Gether küçük gruplarla sınırlı. DRM'li servislerde çalışan tek yol
Teleparty'nin yolu (eşitleme), bizimki de bu.

## 5. Chrome Web Store ve telif

- **Tek amaç:** "arkadaşlarla videoyu senkron izlemek". Sitede ekran/kamera paylaşımı eklentiyi **etkilemez** (eklenti
  değişmez, mağaza incelemesi yok). Eklentiye `tabCapture`/`desktopCapture` eklemek ise ikinci bir amaç gibi okunabilir
  ve gerekçe ister; `desktopCapture` "ekranınızın içeriğini yakalama" uyarısı gösterir. **Eklentiye bu izinleri şimdi
  eklemeyelim.**
- **İçerik politikası:** mağaza, telifli içeriğe izinsiz erişimi kolaylaştıran eklentileri reddeder. Film sekmesini
  odaya yayınlamak buna en çok benzeyen özellik.
- **Resmî metinler** (README, site, mağaza): "ekranını / kameranı arkadaşlarına göster" diye anlatılır; film/dizi/site adı
  ve "filmi yayınla" ifadesi **geçmez**. Örnekler: oyun, sunum, fotoğraf, birlikte site gezme.
- **Kullanıcı sorumluluğu:** yayın penceresinde tek satır: "Sadece paylaşma hakkın olan içeriği paylaş." Kayıt yok,
  sunucudan görüntü geçmez (mesh) → saklanan bir şey yok; gizlilik politikasına bu not eklenir.

## 6. Öneri: biçim, aşamalar, sınırlar

**Biçim:** "📺 Yayın aç" → pencere: "Ekranını paylaş" (`getDisplayMedia`, sekme sesi kutusu açık) ya da "Kameranı aç".
Odada aynı anda **tek yayın**. Diğerleri "▶ Yayını izle" ile katılır (sesli sohbetteki gibi bilinçli katılım; katılmayan
trafik harcamaz). Yayın açılınca odanın videosu durmaz; yayın görüntüsü video alanının üstünde büyük pencere / yan
yana (oda içeriği kenarda) olarak açılır, kapatılabilir.

**Aşamalar:**

1. **Sitede yayın, mesh (≈1–1,5 hafta).**
   - Protokol (sürüm artırmadan, isteğe bağlı alanlar): üyeye `live?: { kind: 'screen' | 'camera' }`, `{t:'live', on, kind}`,
     izleyici `{t:'live-watch', on}`; sinyalleşme mevcut `{t:'signal'}` ile (sunucu sadece yayıncı ↔ izleyici arasında
     aktarır). Sunucu: odada tek yayın, en fazla `LIVE_MAX_VIEWERS` (4), hız sınırı.
   - İstemci: `voice-p2p.ts`'in tek yönlü bir sürümü (`live-p2p.ts`: yayıncı teklif yapar, izleyici sadece alır;
     `sendonly`/`recvonly`), `maxBitrate` 2,5 Mbit/s, 720p, `contentHint`. Site `ui/live.ts`.
   - Kabukta: yayın açma yok, izleme var (yayın penceresi adacık olur).
   - Test: birim (sunucu sınırları, tek yayın kuralı), e2e (sahte kullanıcılarla sinyal akışı), gerçek medya:
     `scripts/harness/voice/run.mjs` benzeri iki Chrome + `--use-fake-device-for-media-stream` +
     `--auto-select-desktop-capture-source`; gelen karenin değiştiği ölçülür.
2. **İnce ayar (≈0,5 hafta).** Kalite seçimi (Yazı net / Akıcı), yönetici ayarı `settings.live` (kapalı / sadece
   yönetici / herkes), yayıncıyı yöneticinin durdurması, "🔴 Yayında" rozeti, gizlilik politikası + README (ikisi birlikte).
3. **(İsteğe bağlı, kart girilirse) SFU ile büyük yayın.** Cloudflare Realtime'da video akışı, bütçe freni önce yayını keser.
4. **(Mağaza onayından sonra, ayrıca karar) eklentide sekme yayını.** Yukarıdaki risklerle; muhtemelen hiç.

**Sınırlar (ilk sürüm):** tek yayın, en fazla 4 izleyici, 720p/30 (yük olursa kendisi düşer), TURN yok (bazı ağlarda
açılmaz), DRM'li içerik siyah, telefonda yayın açma yok (mobil tarayıcıda `getDisplayMedia` yok; izlemek olur).

**Kullanıcıdan gereken:** 1. ve 2. aşama için **hiçbir şey** (para/hesap/kart yok). 3. aşama için Cloudflare'e kart
(zaten bekleyen karar). Bir de karar: özelliğin adı ve yeri ("Yayın aç" mı "Ekranını paylaş" mı), ve **filmi yayınlama
kullanımının bilerek desteklenmeyeceğini** kabul etmesi.

## Denenmesi gerekenler

- `tabCapture` + offscreen akışının Chrome 156'da hâlâ belgede anlatıldığı gibi çalıştığı (bulut ortamından Chrome
  belgelerine erişilemedi) — sadece 4. aşamaya geçilirse.
- DRM'li bir videonun (yasal bir Widevine demo sayfası, ör. Shaka Player demoları) `getDisplayMedia` sekme yakalamasında
  Windows/Mac/Linux'ta nasıl göründüğü.
- Mesh'te 720p × 4 izleyicinin sıradan bir dizüstünde işlemci kullanımı.

## Kaynaklar

- Watch2Gether sınırları: https://community.w2g.tv/t/faq-what-are-the-limitations-of-watch2gether/148839 ·
  ekran paylaşımı sorunu: https://community.w2g.tv/t/the-screensharing-option-doesnt-work/147964
- Discord Go Live kalite sınırları (üçüncü taraf): https://maketecheasier.com/discord-go-live-feature/ ·
  https://onestream.live/blog/how-to-stream-on-discord-most-easy-steps/
- Kast ekran paylaşımı ve ücret: https://www.popsci.com/watch-online-videos-with-friends/ ·
  https://www.technipages.com/rabbit-kast-share-videos/
- Teleparty / Hyperbeam / ekran paylaşımı karşılaştırması: https://blog.send.win/hyperbeam-alternatives-watch-party-tools-compared/ ·
  https://watchnext.hyperbeam.com/blog/What-is-Hyperbeam
- `chrome.tabCapture` (akış kimliği, offscreen, Chrome 116): https://developer.chrome.com/docs/extensions/reference/api/tabCapture
- Chrome ekran yakalama rehberi: https://developer.chrome.com/docs/extensions/how-to/web-platform/screen-capture
- Eklenti izin uyarıları: https://developer.chrome.com/docs/extensions/develop/concepts/permission-warnings
- Mesh / SFU karşılaştırması: https://www.videosdk.live/blog/sfu-vs-mcu-vs-mesh-webrtc ·
  https://dev.to/abirk/webrtc-p2p-vs-mcu-vs-sfu-1b89
- DRM'li içerikte siyah ekran: https://docs.vdo.ninja/common-errors-and-known-issues/screen-share-is-just-a-black-video ·
  https://forum.vivaldi.net/topic/85140/black-screenshot-of-widevine-drm-protected-video
- `getDisplayMedia` (Chrome 72+): https://blog.addpipe.com/standards-compliant-screen-capture-in-chrome-72/
- Cloudflare Realtime fiyatı: https://developers.cloudflare.com/realtime/sfu/pricing · LiveKit: https://livekit.com/pricing
