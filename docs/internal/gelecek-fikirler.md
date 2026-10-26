# ScreenWithMe — 6 gelecek fikrinin değerlendirmesi

_26 Ekim 2026 · Alperen'in fikirleri, dört ayrı değerlendiricinin (ayrı ajanlar) gözüyle:
**(a) teknik olarak mümkün mü**, **(b) projeye uyuyor mu**, **(c) ne kadar zor, emsali var mı**,
**(d) bizi farklılaştırır mı (kullanıcı + CV)**. Sonra hepsini birleştirip bir sıra öneriyorum._

> **Not:** Kullanım şartları ve hukuk konusunda tavsiye vermiyorum; sadece riskleri yazıyorum.
> "(doğrulanmadı)" = güncel ve güvenilir bir kaynakla teyit edilemeyen bilgi. Fiyatlar sık değişir.

**Zorluk ölçeği** (sen + Claude, okul yanında): **S** ≈ 1 hafta · **M** ≈ 2–4 hafta · **L** ≈ 1–2 ay ·
**XL** ≈ 2 aydan fazla ya da hiç bitmeyen bakım.

## Tek bakışta

| # | Fikir | (a) Mümkün mü | (b) Uyum | (c) Zorluk | (d) Fark | (d) CV |
|---|---|---|---|---|---|---|
| 1 | Reels / Shorts birlikte kaydırma | Orta (masaüstü) · Düşük (telefon) | Orta–Düşük | M (Shorts) · XL (Instagram akışı) | **Yüksek** | Orta |
| 2 | Sitede YouTube araması | **Yüksek** | **Yüksek** | **S–M** | Düşük | Düşük–Orta |
| 3 | Sesli / görüntülü konuşma | Yüksek (site) · Orta (film sayfası) | Orta–Yüksek | M (ses) · L (görüntü) | Orta | **Yüksek** |
| 4 | Mini oyunlar | **Yüksek** | Düşük | S–M (oyun başına) | Düşük | Orta |
| 5 | Netflix vb. büyük servisler | Orta | **Yüksek** | L + sürekli bakım | **Yüksek** | **Yüksek** |
| 6 | Telefon sürümü | Orta (PWA) · Düşük (eklenti) | Orta | S–M (PWA) · XL (uygulama) | Orta (büyümeye etkisi yüksek) | Orta–Yüksek |

**Kısaca:** Hiçbiri 1.0'dan önce yapılmamalı; 1.0'ın asıl işi film sayfasındaki katmanın gerçek dünyada
denenmesi ve mağazaya gönderim. 1.0'dan sonra **küçük ve kesin kazançlar** (YouTube araması, dikey Shorts,
telefondan katılım) önce, **büyük ve farklılaştıran işler** (büyük servisler, sesli sohbet) sonra gelsin.
Mini oyunlar yerine daha küçük bir "Mola" düğmesi yeterli.

---

## 1. Reels / Shorts birlikte kaydırma

_Fikir: Herkes kendi hesabıyla YouTube / Instagram'a girer, ekran dikey olur, arkadaşlarla birlikte kaydırılır._

### (a) Teknik olarak mümkün mü? — Masaüstünde orta, telefonda düşük
- **Instagram sitemizin içine gömülemez.** `instagram.com` her sayfada `X-Frame-Options: DENY` gönderiyor (biz
  baktık), yani hiçbir site onu iframe'de açamaz. Resmî gömme kodu (oEmbed) sadece **tek bir herkese açık
  gönderiyi** gösterir; kullanıcının kendi akışı gelmez, oynat/durdur komutu verecek bir API da yok.
- **Eklentiyle masaüstünde olur:** Kişi kendi sekmesinde kendi hesabıyla Instagram'a girer; reel zaten normal
  bir HTML5 `<video>`. "Hangi reel" bilgisi adres çubuğunda (`/reels/<kod>/`). Yani **"lideri takip et"** modeli
  mümkün: lider kaydırır, onun reel adresi odaya gider, diğerlerinin sekmesi o reel'e geçer.
- **Herkesin akışı farklıdır** (algoritma kişiye göre). Bu yüzden "birlikte kaydırma" ancak tek bir liderin akışını
  diğerlerine yansıtmakla olur. Her geçişte takipçilerde sayfa yeniden yüklenebilir (1–3 sn gecikme).
- **Bizim motor buna hazır değil:** video seçici uzun videoları tercih ediyor, reel'ler döngüde oynuyor (başa dönmeyi
  motor "sarma" sanar), sayfada aynı anda birkaç `<video>` var. Ayrı bir "reels modu" gerekir.
- **YouTube Shorts çok daha kolay:** Shorts kimliği normal bir YouTube kimliği. Sitemiz Shorts linklerini **bugün
  zaten tanıyıp oynatıyor** (`media.ts`), sadece yatay oynatıcıda. Dikey çerçeve bizim CSS'imizle yapılabilir;
  eklenti gerekmez, telefonda da çalışır.
- **Telefonda Instagram için yol yok:** Instagram/YouTube uygulamalarının içine hiçbir şey eklenemez; mobil Chrome'da
  eklenti yok (bkz. fikir 6).
- **Kural riski:** Instagram şartları "otomatik yollarla erişimi" kısıtlıyor; biz veri toplamasak da takipçilerin
  sekmesini otomatik yönlendirmek bu kapsamda görülebilir (doğrulanmadı). Instagram'ın resmî bir "birlikte izle"
  API'si yok.

### (b) Projeye uyuyor mu? — Orta–Düşük
- ➕ Gerçek ve **sık** bir an: arkadaşlar her gün birbirine "şuna bak 😂" diye kısa video atıyor. Film gecesi haftada
  bir, kısa video her gün → "her gün açılan" bir kullanım olabilir.
- ➖ Kaydırma kişisel bir hareket: kim geçiyor, biri daha izlemek isterse ne olacak? Bu bizim "biri durdurursa herkes
  durur" modelimizden farklı, yeni kurallar ister.
- ➖ Liderin akışını başkalarına yansıtmak, eklentinin "gezinti bilgisi taşımaz" ilkesini ve mağaza incelemesini
  zorlar.
- ➖ Kısa videolar çoğunlukla telefonda izleniyor; bizim eklenti masaüstünde.

### (c) Zorluk ve emsaller — Shorts: M (2–3 hafta) · Instagram akışı: XL, önerilmez
- Para maliyeti: **0 $** (video YouTube/Instagram'dan gelir).
- **Emsaller:**
  - **Instagram Blend** (2025): arkadaşlarla ortak Reels akışı, ama **aynı anda değil**, herkes kendi zamanında
    bakıyor. Meta bile canlısını yapmadı.
  - **FaceTime SharePlay + TikTok**: birlikte izleme, ama sadece Apple cihazlarda ve uygulamanın kendi desteğiyle.
  - **TikTok'un resmî gömme oynatıcısı** mesajla oynat/durdur alıyor → TikTok linkleri teknik olarak daha kolay
    (ayrı oynatıcı sarmalayıcısı, +1–2 hafta).
  - Canlı, senkron "birlikte kaydırma" yapan yaygın bir araç **bulunamadı**.

### (d) Farklılaştırır mı? — Fark: Yüksek · CV: Orta
- **Kullanıcı için:** En benzersiz fikir; "aynı anda aynı Reels'e gülmek" yeni bir kategori ve güzel bir demo GIF'i
  olur. Ama asıl kullanım telefonda olduğu için **telefon desteği olmadan etkisi kâğıt üstünde kalır.**
- **CV için:** Tek sayfalı uygulamalarda adres değişimini yakalama, "ekrandaki video hangisi" tespiti. İyi ama mevcut
  eklenti hikâyesinin tekrarı; büyük platformların sayfası sık değiştiği için "demo bozuk çıktı" riski yüksek.
- Mağaza cümlesi olsaydı: _"Arkadaşlarınla Shorts'u aynı anda izle; biri geçince herkes geçer."_

**👉 Önerim:** Instagram akışı değil, **"kısa video modu"**: odaya Shorts linki gelince oynatıcı dikey (9:16) olur,
video bitince herkes birlikte sıradakine geçer, ⏭ herkese açık. Linkler arkadaşların birbirine attığı linklerden
(ya da fikir 2'deki aramadan) gelir. Instagram "lideri takip et" sadece kullanıcılar gerçekten isterse, sonra.

---

## 2. Sitede YouTube araması

_Fikir: Video adını yazınca sonuçlar çıksın, seçip odaya eklensin; link aramakla uğraşılmasın._

### (a) Teknik olarak mümkün mü? — Yüksek
- **Resmî yol: YouTube Data API v3 `search.list`.** Ücretsiz ama kotalı: günde **10.000 birim**, bir arama **100
  birim** → günde yaklaşık **100 arama**. Video ayrıntısı (`videos.list`) sadece 1 birim.
- **API anahtarı sunucuda (Worker'da) durmalı**, tarayıcıya gitmemeli; yoksa başkası kotamızı tüketebilir.
- **Önbellek şart:** aynı arama birkaç saat saklanır. YouTube kuralları API verisini **30 günden uzun** saklamayı
  yasaklıyor; kısa önbellek sorun değil. Gizlilik politikasına "YouTube API kullanıyoruz" yazılmalı.
- **Kotayı artırmak** ücretsiz ama bir uyumluluk denetimi formu ister; süresi belirsiz (haftalar sürebilir,
  doğrulanmadı).
- **Kestirme yollar riskli:** Invidious/Piped gibi gayriresmî kaynaklar 2024'ten beri sık bozuluyor ve YouTube
  şartlarına aykırı sayılıyor; eklentiyle YouTube arama sayfasını okumak da hem kırılgan hem kural riski.

### (b) Projeye uyuyor mu? — Yüksek
- ➕ Vizyondaki "en kolay yol"a ve "oda kurma → izlemeye başlama < 30 sn" hedefine doğrudan hizmet ediyor.
- ➕ Sıra ve oylamayla güzel birleşiyor: herkes arar, sıraya ekler, oylar.
- ➕ Hiçbir ilkeyi zorlamıyor: resmî yol, sadece YouTube'un kendi içeriği.
- ➖ "Her site" farkımızı öne çıkarmaz; ama çoğu kişi ilk kez YouTube ile denediği için iyi bir giriş kapısı.

### (c) Zorluk ve emsaller — S–M (1–2 hafta) · 0 $
- İş: Worker'da `/api/search?q=` ucu + sonuç kartları + mevcut "sıraya ekle" akışı.
- **Risk:** günde ~100 arama küçük ölçekte bile biter (günde 100 oda × 3 arama = 300). Önlem: Enter'a basınca ara
  (her harfte değil), önbellek, kişi başı sınır, **kota bitince "YouTube'da ara" düğmesine düş** (yeni sekme + link
  yapıştırma her zaman çalışsın).
- **Emsaller:** Watch2Gether'da site içi arama yıllardır ücretsiz; açık kaynak OpenTogetherTube da aynı API'yi
  kullanıyor ve kota sorununu yaşıyor.

### (d) Farklılaştırır mı? — Fark: Düşük · CV: Düşük–Orta
- **Kullanıcı için:** "Olmazsa eksik sayılır, olunca fark yaratmaz" türünden. Ama sürtünmeyi gerçekten azaltır.
- **CV için:** Küçük ama gerçek bir hikâye: dış API kotasını yönetme, önbellek, hız sınırı, zarif geri düşüş.
- Mağaza cümlesi olsaydı: _"YouTube'da odadan çıkmadan ara, tek tıkla sıraya ekle."_

**👉 Önerim:** Ayrı arama sayfası değil, **link kutusu akıllansın**: link yerine düz yazı yazılınca altında 5 sonuç
(küçük resim + başlık + süre). 1.0'dan sonraki ilk küçük iyileştirmelerden biri.

---

## 3. Görüntülü ve sesli konuşma

_Fikir: Odada kamera + mikrofonla konuşmak._

### (a) Teknik olarak mümkün mü? — Sitede yüksek · film sayfasında (katmanda) orta
- **Teknoloji hazır: WebRTC.** Tarayıcı kamerayı/mikrofonu alır, kişiler arasında doğrudan gönderir. Bağlantıyı
  kurmak için gereken mesajları (signaling) **mevcut oda sunucumuz** taşıyabilir. (Görüntülü bağlantı mesajları
  4 KB sınırımızı aşabilir; özel emojideki gibi bir istisna gerekir.)
- **Eşler arası (mesh)** küçük gruplarda yeter: görüntülü ~4–5 kişi, sadece ses ~8–10 kişi (genel bilgi). Daha
  büyük odalarda **SFU** (herkes tek akış yollar, sunucu dağıtır) gerekir.
- **TURN sunucusu gerekli:** bazı ağlarda (okul, şirket, bazı mobil operatörler) kişiler doğrudan bağlanamaz, trafik
  aracı sunucudan geçer.
- **En zor kısım film sayfasındaki katman:** site, film sayfasının içinde iki kat iframe'de çalışıyor. Mikrofon izni
  her katta açıkça verilmeli; **film sitesi izin vermiyorsa alamayız** (örneğin instagram.com mikrofonu sadece
  kendine açıyor). İzin penceresi de **film sitesinin adıyla** çıkıyor; kafa karıştırıcı. Temiz çözüm: mikrofonu
  eklentinin kendi gizli sayfasında (offscreen belge) almak, izni bir kez eklentinin ayar sayfasında istemek.
  Çalışır ama uçtan uca denenmeli.
- **Yankı:** film sesi hoparlörden mikrofona girer → "kulaklık önerilir" + bas-konuş.

### (b) Projeye uyuyor mu? — Orta–Yüksek (ses yüksek, görüntü orta)
- ➕ Zaten yol haritasında ("bas-konuş ses"). Teleparty'de ücretli; bizde ücretsiz olması "ücretsiz" kimliğimizi
  güçlendirir.
- ➕ Film sırasında "dur, bu kim?" demek yazarak zor; şu an gruplar Discord'u ya da telefon aramasını ayrıca açıyor.
- ➖ **Gizlilik:** kamera/mikrofon yeni bir veri türü; eşler arası bağlantıda kişiler birbirinin IP adresini görür.
  Gizlilik politikası güncellenmeli.
- ➖ Görüntülü kısım ekranda yer kaplar; oda zaten dolu, sadeleştirme konuşuluyor.

### (c) Zorluk ve emsaller — Ses: M (3–4 hafta) · +görüntü: L · büyük odalar (SFU): L+
- **Para:** Cloudflare Realtime'da SFU + TURN birlikte **ayda 1.000 GB ücretsiz**, sonra **0,05 $/GB**.
  Kaba hesap (günde 100 oda): **ses de görüntü de 0 $**. Günde 5.000 odada: ses ~100 $/ay, görüntü 1.000 $'ın
  üstüne çıkabilir. → **Ücretsiz modelde önce sadece ses**, görüntü sınırlı (az kamera, düşük çözünürlük).
- Hazır servisler (LiveKit, Daily, Cloudflare RealtimeKit) dakika başı ücretli; bizim ölçekte pahalı.
- **Riskler:** hesapsız görüntülü oda = kötüye kullanım riski (kamera varsayılan kapalı, atma zaten var, kayıt yok,
  herkese açık oda listesi yok); kötü ses kalitesi ilk denemede kullanıcıyı kaçırır; Cloudflare kendiliğinden
  harcama tavanı koymaz → günlük bütçe aşılınca yeni TURN kimliği vermeyi biz kesmeliyiz.
- **Emsaller:** Watch2Gether kamera/sesi eşler arası, en fazla 10 kişi (odada 50+ kişi varsa kapanıyor) → bizim plana
  çok benzer. Teleparty'de görüntülü sohbet ücretli; Kosmi ve Discord'da ücretsiz ama arkalarında şirket var.

### (d) Farklılaştırır mı? — Fark: Orta · CV: Yüksek
- **Kullanıcı için:** Kategori yaratmaz ama "Discord'u açmaya gerek yok, filmin üstünde, hesapsız" kolaylığı.
  Teleparty kullanıcısına güçlü cümle: "onların parayla verdiğini biz ücretsiz veriyoruz."
- **CV için:** Projeye **tamamen yeni bir alan** ekler: WebRTC, mesh mi SFU mu kararı, NAT/TURN, eklenti içinde
  mikrofon izni sorunu. Gerçek zamanlı medya rolleri için en net sinyal. Yarım bir görüntülü görüşme yerine sağlam
  bir "sadece ses" çok daha iyi görünür.
- Mağaza cümlesi olsaydı: _"Filmin üstünde ücretsiz sesli sohbet; Discord'a geçmeden, hesap açmadan."_

> Güncel (Ekim 2026): ayrıntılı araştırma ve deneme `ses-goruntu.md`'de; orada öneri **Cloudflare SFU** (eşler arası
> değil), açık mikrofon + sessize al, eklentide mikrofon offscreen belgede.

**👉 Önerim (ilk hâli):** **Sadece bas-konuş ses**, en fazla ~6 kişi, eşler arası + Cloudflare TURN, varsayılan kapalı, kamera
yok. Konuşanın avatarı kişiler listesinde parlar, konuşurken film sesi biraz kısılır. **Önce sitede**, sonra küçük bir
denemeyle film sayfasındaki katmanda.

---

## 4. Mini oyunlar

_Fikir: Biri kalkınca (ör. tuvalete gitti) beklerken site içinden küçük çok oyunculu ya da tek kişilik oyunlar._

### (a) Teknik olarak mümkün mü? — Yüksek
- Altyapı zaten var: oda sunucusu durumu tutuyor, doğruluyor, yayıyor. Oyun durumu da `PlaybackState` gibi
  sunucuda tek doğru kaynak olur; istemci sadece hamle yollar.
- Bilgi yarışmasında doğru cevap sunucuda kalmalı (hile); süreler sunucu saatiyle ve mevcut alarmla (bellekte
  `setTimeout`'a güvenmeme ilkesi).
- Çizim-tahmin en ağırı ama çizgiler 50–100 ms'de bir paketlenirse sorun yok. Tek kişilik oyunlar sunucuya hiç
  dokunmaz.

### (b) Projeye uyuyor mu? — Düşük
- ➖ "Sitede daha çok vakit geçirilsin" **bizim** hedefimiz, kullanıcının değil. Reklamsızız; oturumu uzatmaktan
  kazancımız yok. Kuzey yıldızımız "en az 2 kişinin 10 dk'dan uzun izlediği oda"; oyun bunu artırmaz.
- ➖ Bekleme anı kısa (1–3 dk); o sırada insanlar zaten sohbet eder ya da telefona bakar.
- ➖ Ürün kimliğini bulandırır ("her şey odası"na kayış); sadeleştirme konuşulurken yeni büyük bir alan.
- ➕ Temalar/maskot/avatarlarla aynı eğlenceli ruh; küçük bir sürpriz olarak sevilebilir.

### (c) Zorluk ve emsaller — XOX: S · bilgi yarışması: M · çizim-tahmin: M (3–4 hafta)
- Para: küçük ölçekte 0 $; orta ölçekte çizim oyunu ayda en fazla ~80 $ (mesajlar seyrekleşirse düşer).
- Asıl iş içerik: Türkçe soru/kelime listesi, uygunsuz içerik filtresi, başka oyunların listelerini kopyalamamak.
- **Emsaller:** Kosmi (izleme + retro oyunlar + kart oyunları), Discord Activities (izleme ve oyunlar aynı yerde),
  Gartic Phone / skribbl.io (hesapsız tarayıcı parti oyunları). Bu alanda **geriden başlarız**.

### (d) Farklılaştırır mı? — Fark: Düşük · CV: Orta
- **Kullanıcı için:** Kosmi ve Discord çok daha geniş. Sadece **videoya bağlı** küçük şeyler fark yaratır
  ("sonra ne olacak?" tahmini; puanı oturum özetine girer).
- **CV için:** Sunucu yetkili çok oyunculu durum güzel bir konu ama mevcut senkron hikâyesine çok yakın; sığ birkaç
  oyun projeyi "oyuncak" gösterebilir.

**👉 Önerim:** Oyun yerine **"Mola" düğmesi**: "5 dk mola" → video durur, herkese "Alperen mola verdi, 4:12"
geri sayımı çıkar (planlı başlangıçtaki geri sayım bandı tekrar kullanılır), dönünce "döndüm". Oyun yapılacaksa
ileride tek ve videoya bağlı bir tane ("sonra ne olacak?" tahmini).

---

## 5. Netflix vb. büyük (DRM'li) servisler

_Fikir: Abonelikli büyük servislerde de birlikte izleme._

### (a) Teknik olarak mümkün mü? — Orta (servis başına ayrı adaptörle, DRM'e dokunmadan)
- **Komut vermek DRM'i aşmak değil.** DRM videonun çözülmesini korur; biz videoyu çözmüyor, kopyalamıyor,
  yayınlamıyoruz. Herkes **kendi hesabıyla** kendi sekmesinde izler, eklenti sadece oynat/durdur/sar der. Teleparty
  yıllardır bu modelle mağazada.
- **Ama düz sarma bazı servislerde bozuyor:** Netflix'te videonun konumunu doğrudan değiştirmek oynatıcıyı hataya
  düşürüyor (geliştiriciler arasında "M7375" diye biliniyor; resmî kaynak yok). Çözüm: sayfanın kendi dünyasında
  (MV3 `world: 'MAIN'`) çalışan küçük betikle servisin **kendi iç oynatıcı arayüzünü** kullanmak. Belgesiz; servis
  değiştirirse bozulur.
- **Bizde altyapının başı var:** `fullscreen-guard.ts` zaten sayfanın dünyasında çalışıyor; adaptörler aynı yolla
  eklenebilir (`apps/extension/src/adapters/<servis>.ts`, ortak arayüz: oynat, durdur, sar, hız, süre).
- **Ekran paylaşımı yolu kapalı:** DRM'li video ekran paylaşımında siyah görünür. Sanal tarayıcı modeli de bu
  servislerde çalışmaz.
- **Servislerin kendi grup izlemeleri kapandı:** Disney+ GroupWatch (Eylül 2023), Prime Video Watch Party (Mart 2024),
  Twitch'teki Prime Video izleme partileri (Nisan 2024). Boşluk gerçek.
- **Kural riski:** bazı servislerin şartlarında "otomatik yollarla erişim" yasağı var (doğrulanmadı). Kullanıcının
  kendi oynatıcısına komut vermenin bu kapsamda olup olmadığı belirsiz; Teleparty'nin yıllardır çalışması pratikte
  riskin düşük olduğuna işaret ediyor ama garanti değil.

### (b) Projeye uyuyor mu? — Yüksek (doğru yöntemle)
- ➕ Vizyonun "hangi sitede olursa olsun" kısmının en görünür eksiği; kullanıcıların ilk sorusu büyük ihtimalle
  "Netflix'te çalışıyor mu?" olacak.
- ➕ Yöntem ilkelerle uyumlu (kendi aboneliği, sadece komut, içerik taşımıyoruz). Plan `docs/internal/VIZYON.md`'de zaten var.
- ➕ Yasal servisler mağazada korsan sitelerden çok daha güvenli bir vitrin.
- ➖ "Her site için tek genel çözüm" fikrinden ilk sapma; kapı açılınca "şu servisi de ekle" talepleri gelir.
- ➖ Tek geliştirici için **en büyük uzun vadeli bakım yükü**.

### (c) Zorluk ve emsaller — İlk servis: L (4–6 hafta) · her yeni servis 1–3 hafta · bakım: hiç bitmez
- **Para:** sunucu değişmez; test için abonelik (servis başına ayda kabaca 5–15 $, doğrulanmadı). Claude ücretli
  hesaba giremez → **testleri sen kendi hesabınla yaparsın.**
- **Riskler:** servis arayüzü değişince **sessizce bozulur**; CI'da DRM'li video oynamaz, yani otomatik test yok →
  her sürümde elle deneme listesi. Reklamlı paketlerde reklamlar herkeste farklı anda; aynı içerik her ülkede yok.
- **Emsaller:** Teleparty (30+ servis, tek tek entegrasyon; bakım yükünü ücretli katmanla karşılıyor, sürüm
  notlarında sık "X serviste senkron düzeltmesi"), Rave (mobil, kendi uygulama içi tarayıcısıyla), Apple SharePlay
  (sadece Apple cihazlar + FaceTime).

### (d) Farklılaştırır mı? — Fark: Yüksek · CV: Yüksek
- **Kullanıcı için:** Tek başına Teleparty ile eşitlik. Ama "**büyük servisler + her HTML5 site + ücretsiz +
  hesapsız + reklamsız**" birleşimi en güçlü "neden ScreenWithMe" cümlesi; kullanıcının ayrıca Teleparty kurma
  nedeni kalmaz. Mağazada "… ile çalışır" diyebilmek (sadece gerçekten çalışıyorsa) bulunabilirliği çok artırır.
- **CV için:** Adaptör deseni, sayfa dünyası ↔ içerik betiği güvenli mesajlaşması, "kırılgan üçüncü taraf
  entegrasyonlarını test stratejisiyle ayakta tuttum", "DRM'e asla dokunmadım" sınırı → olgunluk sinyali.
- Mağaza cümlesi olsaydı: _"Abonelik servislerinde de her sitede de aynı oda: herkes kendi hesabıyla, aynı saniyede."_

**👉 Önerim:** 1.x'in ana hedefi, ama **tek servisle**: önce senin kendi hesabınla "düz `<video>` komutları yetiyor
mu?" denemesi (VIZYON'daki araştırma maddesi). Yetiyorsa sıfır özel kod; yetmiyorsa sadece o servis için küçük
adaptör. Desteklenen servis listesi kısa ve dürüst; bozulursa listeden düşer.

---

## 6. Telefon sürümü

_Fikir: Özellikle reels için telefonda ScreenWithMe._

### (a) Teknik olarak mümkün mü? — Site/PWA orta · telefonda eklenti düşük
- **Chrome Android hâlâ eklenti çalıştırmıyor** (telefonda). Google'ın denemesi sadece büyük ekranlı cihazlar için.
- **Diğer yollar:** Kiwi tarayıcı Ocak 2025'te kapandı. Edge Android sadece Microsoft'un seçtiği ~20 eklentiye izin
  veriyor. **Firefox Android** eklentilere açık, en gerçekçi yol (ama önce Firefox masaüstü desteği lazım).
  **iPhone (Safari):** eklenti ancak App Store'daki bir uygulamanın içinde dağıtılır → ücretli Apple geliştirici
  hesabı (yılda 99 $) + inceleme.
- **Uygulamaların içine hiçbir şey eklenemez:** telefondaki Instagram/YouTube uygulamasına katman koymak mümkün değil.
  Kendi uygulamamızın içinde web sayfasını açıp kod eklemek (Rave'in yolu) teknik olarak olur ama gömülü tarayıcıda
  Google ile giriş engelleniyor ve mağaza kuralları riskli (Rave 2025'te App Store'dan kaldırıldı).
- **PWA (en kolay kazanç):** sitenin YouTube + doğrudan video kısmı telefonda zaten çalışıyor (v0.9.46). PWA ile ana
  ekrana ekleme + tam ekran gelir. Sınırlar: sesli oynatma için dokunma şart (bizde "İzlemeye başla" var), iPhone'da
  uygulama arka plana gidince bağlantı uyur (bizde yeniden bağlanma var).

### (b) Projeye uyuyor mu? — Orta (telefondan katılım yüksek, "telefonda reels uygulaması" düşük)
- ➕ **Davet linkleri çoğunlukla telefona geliyor** (WhatsApp, Discord). Linke dokunan kişi "olmuyor" görürse davet
  döngüsü ilk adımda kırılır. Mobil zayıflık sektörün ortak şikâyeti; fırsat gerçek.
- ➖ Telefonda "her site" farkımız yok; telefonda ürün YouTube + doğrudan videoya iner.
- ➖ Yerel uygulama = iki mağaza, ayrı kod, ayrı inceleme; tek geliştirici için çok büyük.

### (c) Zorluk ve emsaller — PWA: S–M · Firefox Android: M–L · iPhone eklentisi: L–XL · yerel uygulama: XL
- **Para:** PWA ve Firefox **0 $**; Google Play **25 $ tek sefer**; Apple **99 $/yıl** (para gerektiren adımlar senin
  kararın).
- **Emsaller:** Teleparty'nin iPhone uygulaması düşük puanlı ve kısıtlı (masaüstü devi bile telefonda zayıf);
  Rave ve Kast uygulama içi tarayıcı modeli (Rave App Store'dan atıldı); Watch2Gether ayrı uygulama yerine "ana ekrana
  ekle" (PWA yolu); Kosmi'nin mobil uygulaması var.

### (d) Farklılaştırır mı? — Fark: Orta (büyümeye etkisi yüksek) · CV: Orta–Yüksek
- **Kullanıcı için:** Tek başına eşitlik özelliği, ama davet döngüsünü tamamlar. Fikir 1 ile (telefonda birlikte
  Shorts) birleşince gerçek bir kategori olur.
- **CV için:** Mobil web/PWA kısıtları (Service Worker, otomatik oynatma, arka plan, ekranı açık tutma), "aynı
  protokolle masaüstü + mobil istemci" → çok platformlu düşünme sinyali.
- Mağaza cümlesi olsaydı: _"Davet linkine telefondan dokun, uygulama indirmeden aynı odaya katıl."_

**👉 Önerim:** Ayrı uygulama değil, **PWA + "telefondan katılım" cilası**. Oda bir film sayfasındaysa telefonda net
bir ekran: "Bu video bilgisayarda eklentiyle izleniyor; buradan sohbet ve tepkilerle odadasın" (**ikinci ekran**:
sohbet + emoji + kişiler, videosuz). Dikey Shorts (fikir 1) telefonda doğal olarak iyi görünür. Firefox Android ve
yerel uygulama en sona.

---

## Dört bakışın sıralamaları

| Bakış | 1. | 2. | 3. | 4. | 5. | 6. |
|---|---|---|---|---|---|---|
| (b) Uyum | Büyük servisler | YouTube arama | Sesli sohbet | Telefon | Reels/Shorts | Oyunlar |
| (c) Kolaylık (efor/maliyet) | YouTube arama | PWA / Shorts | Sesli sohbet | Bir oyun | Büyük servisler | Telefon uygulaması |
| (d) Farklılaşma | Büyük servisler | Reels/Shorts | Telefon | Sesli sohbet | Oyunlar | YouTube arama |
| (d) CV | Sesli sohbet | Büyük servisler | Telefon / PWA | Oyunlar | Reels/Shorts | YouTube arama |

## Önerilen öncelik sırası

**0. Önce 1.0.** Bu fikirlerin hiçbiri mağaza gönderiminden önce değil. Darboğaz yeni özellik değil; film sayfasındaki
katmanın gerçek denemesi, elle video seçimi ve gönderim (`docs/internal/VIZYON.md` "v1.0").

1.0'dan sonra:

1. **YouTube araması (link kutusu akıllanır) + dikey Shorts görünümü** — ikisi de küçük (S–M), 0 $, risksiz;
   "ne izleyelim?" anını kısaltır. Shorts kısmı fikir 1'in güvenli çekirdeği.
2. **Telefondan katılım (PWA + ikinci ekran)** — davet döngüsünü tamamlar; S–M, 0 $.
3. **Büyük servisler, tek servis** — en çok farklılaştıran ve en çok istenecek şey; ama L + sürekli bakım. Araştırma
   kısmı (senin hesabınla deneme) 1 ve 2 sürerken bile yapılabilir.
4. **Bas-konuş sesli sohbet** — CV için en değerli; ses ücretsiz kotada rahat. Önce sitede, sonra katmanda. Görüntü
   ancak sesten sonra ve sınırlı.
5. **Instagram "lideri takip et"** — sadece kullanıcılar gerçekten isterse; kırılgan ve kural riski var.
6. **Mini oyunlar → "Mola" düğmesi** — oyun değil, küçük bir mola akışı; oyun yapılacaksa videoya bağlı tek bir tane.

Firefox Android, iPhone eklentisi ve yerel uygulama listenin en sonunda (para, mağaza riski, iki kod tabanı).

## İlk yapılacak küçük adım

**Shorts linki açılınca oynatıcı dikey (9:16) görünsün.** Sitemiz Shorts linklerini zaten tanıyıp oynatıyor
(`packages/shared/src/media.ts`); yapılacak tek şey linkin Shorts olduğunu `Media`'da işaretlemek ve oynatıcı
çerçevesini dikey yapmak (masaüstünde ortada dar sütun, telefonda tam ekran). Bir akşamlık iş; sunucu, protokol ve
eklenti değişmez; hemen "birlikte Shorts izledik" denemesi yapılabilir ve fikir 1 için gerçek ilgiyi ölçer.

Hemen ardından (kod değil, senin adımın): **Google Cloud'da bir proje açıp YouTube Data API anahtarı almak.** Kota
artırma başvurusu uzun sürebildiği için, arama özelliği hazırlanırken anahtarın hazır olması iyi olur.

## Riskler (özet; hukuki tavsiye değildir)

- **Platform şartları:** Instagram ve bazı abonelik servislerinin şartları "otomatik yollarla erişimi" kısıtlıyor;
  bizim yaptığımızın (kullanıcının kendi sekmesinde komut vermek) bu kapsamda olup olmadığı belirsiz. YouTube API
  kuralları (önbellek süresi, marka, gizlilik politikası) açık ve uyulabilir.
- **Mağaza:** yeni izinler (mikrofon, kamera) ve yeni siteye özel kod Chrome Web Store incelemesini uzatabilir;
  inceleme sürerken `PROTOCOL_VERSION` artırılmamalı.
- **Gizlilik:** sesli sohbet ve "lideri takip et" yeni veri türleri demek; `gizlilik.html` her seferinde güncellenmeli.
- **Para:** sesli/görüntülü sohbette büyük ölçekte trafik ücreti; günlük bütçe sınırı kodda olmalı.
- **Bakım:** büyük servis adaptörleri ve Instagram modu, servisler sayfalarını değiştirdikçe bozulur.

## Kaynaklar (seçme)

- YouTube Data API: [kota maliyetleri](https://developers.google.com/youtube/v3/determine_quota_cost) ·
  [kota ve denetim](https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits) ·
  [geliştirici politikaları](https://developers.google.com/youtube/terms/developer-policies)
- Instagram: [oEmbed](https://developers.facebook.com/docs/instagram-platform/oembed) ·
  [kullanım şartları](https://help.instagram.com/581066165581870) ·
  [Blend (Android Central)](https://androidcentral.com/apps-software/meta/instagrams-latest-blend-direct-messages-feature-is-seeing-a-wider-rollout)
- TikTok: [gömme oynatıcı](https://developers.tiktok.com/doc/embed-player/)
- Cloudflare: [Realtime SFU/TURN fiyatı](https://developers.cloudflare.com/realtime/sfu/pricing) ·
  [Durable Objects fiyatı](https://developers.cloudflare.com/durable-objects/platform/pricing) ·
  [chrome.offscreen](https://developer.chrome.com/docs/extensions/reference/api/offscreen)
- İzinler: [Chromium: çapraz kökenli iframe izinleri](https://chromium.org/Home/chromium-security/deprecating-permissions-in-cross-origin-iframes) ·
  [MDN: Permissions-Policy](https://developer.mozilla.org/docs/Web/HTTP/Headers/Permissions-Policy)
- Watch2Gether: [sınırlar (resmî forum)](https://community.w2g.tv/t/faq-what-are-the-limitations-of-watch2gether/148839)
- Kapanan grup izlemeler: [Disney+ GroupWatch (TechRadar)](https://www.techradar.com/streaming/disney-plus-just-removed-one-of-its-best-friends-and-family-focused-features) ·
  [Prime Video Watch Party (Android Authority)](https://androidauthority.com/amazon-prime-viewing-party-axed-3458167) ·
  [Twitch (Engadget)](https://www.engadget.com/twitch-is-ending-its-pandemic-era-prime-video-watch-parties-110004438.html)
- MV3 sayfa dünyası: [chrome.scripting `world`](https://developer.chrome.com/docs/extensions/reference/api/scripting)
- Telefon: [Chrome Android'de eklenti (Chrome Unboxed)](https://chromeunboxed.com/chrome-for-android-may-get-extension-support-but-its-likely-not-what-you-think) ·
  [Kiwi kapandı (Android Authority)](https://androidauthority.com/kiwi-browser-shutting-down-3519510) ·
  [Edge Android eklentileri](https://www.androidauthority.com/microsoft-edge-extensions-android-3535402) ·
  [Firefox Android eklentileri](https://addons.mozilla.org/en-US/android/) ·
  [Safari eklentisi dağıtımı](https://developer.apple.com/safari/extensions/submission) ·
  [App Store kuralları](https://developer.apple.com/app-store/review/guidelines/)
- Rave ve Apple: [Bloomberg Law](https://news.bloomberglaw.com/antitrust/rave-sues-apple-for-kicking-its-co-viewing-product-off-app-store)
- Rakiplerin genel tablosu: [rakip-analizi.md](rakip-analizi.md)
