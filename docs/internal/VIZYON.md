# ScreenWithMe — Vizyon ve Yol Haritası

_Son güncelleme: 21 Ekim 2026 · şu anki sürüm 0.9.54_

## Vizyon

> **Arkadaşlarınla, hangi sitede olursa olsun, aynı videoyu aynı anda izlemenin en kolay yolu.**
> Ücretsiz, hesapsız, reklamsız. (Repo herkese açılınca: açık kaynak.)

Bir link at, herkes aynı saniyede izlesin. Biri durdurursa herkes dursun. Kurulum
yok (YouTube için) ya da bir kerelik 1 dakika (eklenti için).

## Kime göre?

- Uzakta olan arkadaş grupları ve çiftler: film/dizi/anime gecesi, YouTube maratonu.
- Discord'da takılan topluluklar: "link at, gel" kadar kolay olmalı.
- Ödeme yapmak ya da hesap açmak istemeyen herkes.

## Piyasa ve boşluk (özet)

Ayrıntı: [rakip-analizi.md](rakip-analizi.md).

| Rakip | Güçlü | Zayıf |
|---|---|---|
| Teleparty | Çok kullanıcı, büyük servisler | Belirli sitelerle sınırlı, çoğu özellik ücretli, fatura şikâyetleri |
| Watch2Gether | Kolay oda, hesapsız | Belirli kaynaklar, ücretsizde reklam |
| Open Watch Party | Açık kaynak | Sadece YouTube + Netflix, çok yeni |
| Metastream | Her site, açık kaynak | Arşivlendi, bakımsız |
| Küçük "HTML5 sync" eklentileri | Her site iddiası | Çok az kullanıcı, iframe/kayma belirsiz |
| Kosmi / Hyperbeam (sanal tarayıcı) | DRM dahil her şey | Pahalı altyapı, gecikme, kalite |

**Boşluk:** "Her sitedeki videoyla (iframe dahil) çalışan, iyi senkron yapan,
güvenilir ve ücretsiz" bir araç yok. ScreenWithMe tam burada.

## Farkımız

1. **Senkron kalitesi.** Sunucu saatine göre hesap, beklenen-olay takibiyle
   yankı engelleme, küçük kaymada fark edilmeyen hızlanma/yavaşlama, "herkes hazır"
   beklemesi. Ölçülen fark gerçek oynatıcılarda (Plyr, hls.js, Video.js) 30–100 ms.
2. **Her site.** Eklenti iframe içindeki, sonradan yüklenen ve kaynağı değişen
   oynatıcıları da bulur; reklam/önizleme videolarını eler. Film kendi sitesinde oynar,
   eklenti sitenin oda sayfasının kendisini üstüne açar (hiçbir engel aşılmadan, her sitede).
3. **Sıfır sürtünme.** Hesap yok; isim + avatar bir kez; tek link. Site ile
   eklenti el ele: odaya sayfa linki yapıştırılınca açan kişi o sayfaya gider, diğerleri
   "Filme git"e basar; orada da oda sitedekinin aynısı.
4. **Birlikte izlemenin eğlencesi.** Pinler, özel emojiler, oturum özeti, temalar ve
   kostümlü maskot, çizilmiş avatarlar. Rakiplerde çoğu yok.
5. **Gizlilik.** Video herkesin kendi tarayıcısında oynar; sunucu sadece
   "durdur, 12:34'e git" gibi küçük mesajları taşır. Eklenti sadece odadaki
   sekmede çalışır, gezinti geçmişi toplamaz.
6. **Ücretsiz altyapı.** Cloudflare Workers + Durable Objects; oda başına bir nesne,
   boştayken uyur, ücret işlemez.

## Şu an neler var? (0.9.58)

**İzleme**
- Oynat / durdur / sar / hız herkeste aynı; kayma sessizce kapanır (>1 sn atlama, küçükse ±%5 hız).
- Herkes hazır: videosu takılan olursa oda en fazla 12 sn bekler (aynı kişi 30 sn tekrar bekletemez; yönetici kapatabilir).
- YouTube ve doğrudan video dosyası sitede; diğer her sayfa eklentiyle.
- **Film sayfasında oda (kabuk):** sekme film sitesine gider; eklenti sitenin oda sayfasını tam ekran katman
  olarak üstüne açar, videonun yerine delik açar, film oynatıcısı tam oraya oturur. Arayüz sitenin birebir
  aynısı (sohbet, sıra, kişiler, ayarlar, avatar/tema, özet). Oda görünümü video başlamadan gelir (oynatıcının
  olası yeri deliğe oturur); deliğin içindeki mesajlar videonun üstünde yarı saydam. Gömmeyi yasaklayan
  sitelerde de çalışır. Biri odaya dönünce filmdekilere "sen de dön?" sorulur. Ayarlar site ile katman arasında eklenti üzerinden ortak.
- Hız 0,25x–4x (YouTube en fazla 2x), ±0,05 ince ayar; eklentide hız kilidi.
- Senkron testi (sitenin çizdiği sayaç + "aynı yerdesiniz" rozeti), "Herkesi bana eşitle" (tek kişiyken kapalı;
  "herkes hazır" beklemesi de tek kişiyken olmaz).
- Dikkat dağıtmayan tam ekran (kontroller, emojiler, pin şeridi, hızlı mesaj).

**Oda**
- Sıra, oylama (en çok oy alan önce), otomatik devam (kapatılırsa "Sıradakini başlat").
- Sohbet (oda hareketleri varsayılan gizli), 3 emoji sayfası, videonun altından yükselen emojiler (avatar + isim;
  art arda basılabilir, yönetici sıklık sınırı koyabilir, isteyen görmeyi kapatır).
- Özel emojiler (kendi GIF / resmin; odada en fazla 24).
- Pinler (notlu; video altında ve tam ekranda şerit).
- Klavye: 1–8 emoji, Enter mesaj, P pin.
- Kaydedilen odalar (ana sayfada liste, içeride kaç kişi; 30 gün; kaldığınız yer ve pinler hatırlanır).
- Oturum özeti (rastgele ilginç kartlar, logolu görsel, önceki özetler).
- Planlı başlangıç (geri sayım bandı, saat gelince oda kendisi oynar).
- Uzun boş kalan oda, dönüşte son kişinin çıktığı yerde durmuş açılır.

**Yönetici ve güvenlik**
- Yönetici (👑): ilk giren; yenilemede kalır; 20 sn'den uzun yoksa en eski kişiye kalıcı geçer.
- Odadan çıkarma ve kalıcı yasak (yönetici kaldırana kadar), yasaklılar listesi.
- Modlar: sadece yönetici kontrol etsin, sırayı kilitle, emojileri kapat.
- Sunucuda hız sınırları, her mesajın doğrulanması, hayalet bağlantı ayıklama.

**Görünüm**
- 11 tema (4 sade, 2 resimli, 5 Art Deco), her birinde kostümlü maskot. (Uzay ve Cyberpunk
  temaları, astronot / uzaylı / siber avatarlarıyla birlikte 0.9.51'de, Fantastik orta çağ 0.9.55'te kaldırıldı.)
- Çizilmiş avatarlar (temalı + parodi film / dizi / anime / oyun); büyük seçim penceresi (hayvan emojileri 0.9.57'de kalktı).
- Açılış animasyonu ve üretilmiş açılış sesi; Türkçe (varsayılan) / İngilizce.
- Eklentide film sayfası sitedeki oda gibi (Gece teması), video bulunmadan "Filmi başlat" kartı, tam ekranda
  sürüklenen mesaj tutamağı, 🏠 ile odaya dönüş, "sen de gel?" sorusu.

**Geliştirme**
- 127 birim testi, 12 uçtan uca test dosyası; GitHub Actions'ta her push ve PR'da çalışır.
- `main`'e gelen her değişiklik testlerden sonra GitHub Actions ile Cloudflare'e yüklenir
  ve canlı sunucuya karşı uçtan uca testler koşar (bkz. CLAUDE.md "Yayın").

## Sürüm geçmişi (kısa)

- **v0.5:** Herkes hazır bariyeri, MIT lisansı, gizlilik politikası.
- **v0.6–0.7:** Kalıcı yasak + kaldırma, yönetici devri, emoji sayfaları, açılış animasyonu, 9 tema,
  hız kilidi, yenileyince odada kalma, davet önizlemesi; 4 ajanlı inceleme sonrası güvenlik düzeltmeleri.
- **v0.8:** Film sayfasında rehber kartı, filmden odaya dönüş, sürüklenebilir çubuk ve mesaj alanı,
  açılış sesi, parodi avatarlar.
- **v0.9:** Klavye kısayolları, GitHub Actions testleri. **v0.9.2:** Art Deco temalar ve avatarları.
- **v0.9.4:** Pinler, özel emojiler, yandan tepki kartları, büyük avatar penceresi, boyutlanan çubuk.
- **v0.9.45:** Senkron testi, yönetici modları, oylama, planlı başlangıç.
- **v0.9.46:** Telefon uyumu, görünür özel emoji düğmesi.
- **v0.9.48:** Film odanın içinde (sadece video), "sen de gel?" sorusu, otomatik devam seçeneği,
  odayı kaydet (kaldığınız yer + pinler).
- **v0.9.49:** Kaydedilen odalar (adlı, ana sayfada liste), oturum özeti, sohbette eylemler gizli,
  emojileri kapatma, 4x hız, varsayılan Türkçe.
- **v0.9.50:** Oda görünümü (film kendi sekmesinde, sayfa odaya dönüşür).
- **v0.9.52:** Film sayfası sitedeki odanın aynısı (Gece teması: üst şerit, sağda davet + sohbet + kişiler, video
  altında emojiler, pin, eşitle, hız, tam ekran); küçük çubuk ve rehber kartı kaldırıldı; video bulunmadan "Filmi
  başlat" kartı (oynatıcıyı okla gösterir); tam ekranda sitedeki gibi kontroller ve sürüklenen mesaj tutamağı; iç
  içe oynatıcıda doğru çerçeve büyütülür. Yeni dizi parodisi avatar: fesli zaman yolcusu.
- **Mehtaplı Geceler yenilendi (Ekim 2026):** yağlı boya havasında teras: çini pano, mermer sütun, kandil, ay ışığında
  Boğaz, karşı kıyıda saray ve camiler, fenerli kayıklar; yeni maskot (renkli sarık, kırmızı entari, fener).
- **Site düzeltmesi (Ekim 2026, 0.9.58 üstüne):** film sayfasında art arda atılan emojiler yarım/silik görünmüyor (üst üste
  binen adacıklar birleştiriliyor); tam ekran mesajları biraz küçüldü; gizlilik sayfası `privacy.html` (bağlantının
  dilinde açılır, eski `gizlilik.html` yönlendirir).
- **v0.9.58:** Kimlik karışması düzeltildi (eklentinin deposunda isim ve avatar art arda kaydedilince isim kayboluyor,
  film sayfasında eski isimle görünülüyordu); tam ekranda kontroller film sayfasında da bekleyince kayboluyor; "tam ekranda
  video" seçeneği (ekranı kaplasın / kontrollerin üstünde dursun); film sayfasında mesajlar daha büyük; 👤 Profil sağ
  üstte açılan menü; reklamlara dayanıklılık (kısa reklam videosu odaya yansımaz, reklam videoları seçilmez, gizli
  reklamlar susar, "👁 Sayfayı göster" kaçış düğmesi, eklenti sayfasında reklam engelleyici ipucu); GitHub sayfası
  İngilizce + Türkçe README, iç belgeler `docs/internal/`'a taşındı.
- **v0.9.57:** Film sayfasında mesajlar ve emojiler gerçekten saydam (renk şeması uyuşmazlığı giderildi), oda katmanı
  binene kadar film sitesi hiç görünmüyor (örtü), tam ekranda altyazı kontrol çubuğunun altında kalmıyor, tam ekranda
  pin şeridi yok; emojiler art arda (×2 yok), yönetici emoji sıklığı ayarlar; hayvan avatarları kalktı, avatar seçici
  hep Temalı ile açılır; 👤 Profil sağ üstte; yönetici Ayarlar, diğerleri Sohbet sekmesiyle başlar; tek başınayken
  senkron düğmelerine basınca uyarı.
- **v0.9.56:** Film sayfasında oda görünümü video başlamadan gelir (ince şerit kalktı), oynatıcının yeri otomatik
  bulunur; altyazılar kesilmiyor; mesajlar video üstünde yarı saydam; emojiler yine alttan uçuşuyor (yan kartlar
  kalktı); tek kişiyken senkron düğmeleri ve bekleme kapalı; biri odaya dönünce filmdekilere "sen de dön?" kartı.
- **v0.9.55:** Parodi avatarlarına Oyun kategorisi (ilk: hızlı mavi kirpi), Fantastik orta çağ teması kaldırıldı;
  film sayfası düzeltmeleri (sayfa adresi değişince video durmuyor, katman başka sitelere taşınmıyor, katman
  oynatıcı sanılmıyor), eski eklentinin "herkes dönmeden yeni video yok" kuralı kaldırıldı.
- **v0.9.54:** Film sayfasında pencereler videonun önünde, film sitesinin ⛶ odanın tam ekranını açar, sıra ve link
  kutusu yok, odaya dönüş onaylı; 👤 Profil sekmesi; "bugünün özeti" (oturum başından şimdiye, istenince kaydet);
  "Şimdi aç" film linkinde önce sorar.
- **v0.9.53:** Film sayfasının üstüne sitenin kendisi açılıyor (kabuk); "odanın içinde film" (iframe) ve
  eklentinin kendi çubuğu/popup ayarları kalktı; site ile eklenti ayarları ortak.
- **v0.9.51:** Uzay ve Cyberpunk temaları ile onlara ait 4 avatar (astronot, uzaylı, siber gözlüklü,
  siber hacker kız) kaldırıldı; o temayı seçmiş olan Gece'ye, o avatarı seçmiş olan rastgele avatara düşer.
- **Sunucu düzeltmesi (Ekim 2026):** 4 KB'tan büyük özel emojiler (gerçek resim ve GIF'ler) sunucuda
  reddediliyordu; düzeltildi, uçtan uca testte artık gerçek boyutlu emoji deneniyor.

## Yol haritası

### v1.0 — Chrome Web Store'da yayın (henüz gönderilmedi)
Paket ve form metinleri hazır (`docs/internal/web-store.md`, `npm run store`), ama eklenti henüz yeterince hazır
görülmediği için gönderilmiyor.

**Durum (Ekim 2026, Claude'un değerlendirmesi):** teknik olarak çıkışa yakınız, resmî bir engel yok (içerik
barındırmıyoruz, kilit/DRM aşmıyoruz, izinler az, uzaktan kod yok). Ama film sayfasındaki oda katmanı (kabuk)
0.9.53–0.9.54'te baştan yazıldı ve gerçek dünyada az denendi. Öneri: 1–2 hafta gerçek kullanım, çıkan hataları
düzelt, sonra gönder.

Göndermeden önce:
- [ ] **Gerçek deneme turu** (iki bilgisayar, bir arkadaşla; sorun olursa popup'taki "Tanı" satırı):
  - [ ] En az 5 farklı oynatıcı: JW Player, Plyr, Video.js, hls.js demoları + iframe içinde oynatıcısı olan,
    reklamlı/açılır pencereli siteler.
  - [ ] Bir saatten uzun bir video baştan sona (kayma, "herkes hazır", sekme arka plandayken).
  - [ ] İnternet kopup gelince, sayfa yenilenince, bilgisayar uykudan uyanınca odaya dönüş.
  - [ ] Brave ve Edge.
  - [ ] Yeni kullanıcı gözüyle: siteyi hiç görmemiş biri linkle gelip eklentiyi kurup izleyebiliyor mu?
- [ ] **Kısa alan adı 1.0'dan önce (önerim; para gerektirdiği için karar kullanıcının, yılda ~10 $):** sonradan
  değişirse eski davet linkleri, mağaza sayfası ve eklentideki site adresi değişir; `workers.dev` güven vermiyor.
- [x] Mağaza ekran görüntülerini ve test talimatlarını son görünüme göre yenile (`store/src/shots.html`, 0.9.53: 5 görsel).
- [ ] Sürüm `1.0.0` → `npm run store` → gönderim (kullanıcının hesabıyla).
- [ ] Onaylanınca `eklenti.html` ve sitedeki kurulum linklerini mağaza linkine çevir.

**Çıkışta beklenen sorunlar (hazırlıklı ol):**
- İnceleme 1–3 hafta sürebilir ("tüm siteler" izni yüzünden). Ret gelirse çoğu zaman gerekçeyi netleştirip
  yeniden göndermek yeter; "incelemeci çalıştıramadı" reddine karşı test talimatları yasal demo oynatıcılarla.
- Kurulumda Chrome "tüm sitelerdeki verilerini okuyabilir" der; bazı kullanıcılar vazgeçer. Mağaza sayfasında
  ve sitede "sadece odaya katıldığın sekmede çalışır" cümlesi öne çıksın.
- Yanlış video seçimi (reklam/önizleme), reklamlı sitelerde iç içe çerçeveler: ilk hata raporları muhtemelen
  buradan gelir → "elle video seçimi" önceliği yükselir.
- Korsan sitelerle anılma: mağaza yorumlarında kullanıcılar site adı yazabilir; bizim hiçbir metnimizde
  geçmemeli. Şikâyet gelirse tarafsızlık ve gizlilik politikası savunmamız.
- Cloudflare ücretsiz plan sınırı (Durable Objects günde 100 bin istek); kullanıcı artarsa aylık ~5 $'lık plan.
- İnceleme sürerken `PROTOCOL_VERSION` artırma (mağazadaki sürüm sunucuya bağlanamaz).

### Büyük servisler: Netflix, Prime Video, Disney+ … (1.0'a doğru araştır, 1.x'te yayınla)
Şu an desteklenmiyor ama imkânsız değil. Biz videonun görüntüsünü almıyoruz, sadece oynat/durdur/sar/hız komutu
veriyoruz; herkes kendi aboneliğiyle izler (yasal, Teleparty de böyle çalışıyor). DRM asla aşılmaz.
- [ ] **Araştırma (kullanıcının kendi hesabıyla gerçek deneme; Claude ücretli hesaba giremez):** her serviste
  `<video>` bulunuyor mu, düz `play/pause/currentTime/playbackRate` çalışıyor mu, oda katmanı (kabuk) videoyu
  deliğe oturtunca oynatıcı bozuluyor mu, reklamlı planlarda reklam nasıl görünüyor.
- [ ] **Netflix:** videonun konumunu doğrudan değiştirmek oynatıcıyı hataya düşürebiliyor (geliştiriciler arasında
  bilinen "M7375" hatası) → sarma için sitenin kendi oynatıcı arayüzü gerekir (sayfa dünyasında çalışan küçük
  betik, MV3 `world: 'MAIN'`). Siteye özel kod = sürekli bakım (Teleparty'nin changelog'u bunun kanıtı).
- [ ] **Prime Video, Disney+, Max …:** önce düz `<video>` komutlarıyla dene; gerekirse aynı "siteye özel adaptör"
  yapısı (`apps/extension/src/adapters/<site>.ts` gibi, ortak arayüz: oynat, durdur, sar, hız, süre).
- [ ] **Ülke farkı:** aynı film her ülkede yok; odada "bu video sende açılmadı" durumu anlaşılır olsun.
- [ ] **Metinler:** bir servisin adı sadece gerçekten çalışıyorsa ve "… ile çalışır" anlamında geçer (marka
  kullanımı); logolarını kullanmayız. Film/dizi/korsan site adı kuralı aynen sürer.
- [ ] Sanal tarayıcı modu yine sadece sponsorla (aşağıda "Uzun vade").

### Teleparty'den ilham: ekle / alma / sadeleştir
Teleparty (~10 milyon kullanıcı) belirli servislerle sınırlı, çoğu özellik ücretli (video sohbet, özel tepkiler,
fazladan servisler), mobil uygulaması kısıtlı. Bizden güçlü yanları: büyük servisler, sesli/görüntülü sohbet,
tanınmışlık. ([rakip-analizi.md](rakip-analizi.md) §3.1)
- **Bizde zaten var:** sohbet + tepkiler, "sadece yönetici kontrol eder" (`hostOnly`), linkle katılınca doğrudan
  film sayfası, özel emojiler (Teleparty'de ücretli), temalar/avatarlar.
- **Ekle:**
  - [ ] Sesli / görüntülü sohbet (Teleparty'de ücretli → bizde ücretsiz olursa büyük fark). Önce bas-konuş ses.
  - [ ] Oda görünümünde sağ paneli gizle/küçült: video büyüsün, sohbet istenince açılsın.
  - [ ] "Alex durdurdu / 12:30'a sardı" gibi kısa bildirim videonun üstünde (neden durduğunu herkes anlasın);
    şu an bu hareketler sohbette gizli. Varsa gözden geçir, yoksa ekle.
  - [ ] "Denenmiş oynatıcılar" sayfası: hangi oynatıcı türlerinde çalıştığımız (site adı değil, oynatıcı adı).
  - [ ] Telefon: önce PWA (YouTube ve doğrudan video), sonra Firefox Android.
  - [ ] Büyük servisler (yukarıdaki bölüm).
- **Almayacaklarımız:** ücretli katman / özellik kilidi (ücretsiz kalıyoruz, gelir bağışla), hesap zorunluluğu,
  gezinti geçmişi toplama (Netflix Party bu yüzden kaldırılmıştı), karmaşık abonelik/fatura.
- **Sadeleştirme adayları (karar kullanıcının):** özellik çok; ilk kez gelen biri için oda sade görünmeli.
  Planlı başlangıç, oylama, oda kaydı, oturum özeti gibi seyrek kullanılanlar "Daha fazla" altına alınabilir.

### Bağış / destek (1.0'dan ve ilk gerçek kullanıcılardan sonra)
Ücretsiz ve reklamsız kalmak için gelir yolu bağış. Önerim:
- **Ne zaman:** mağaza onayı + düzenli kullanan bir grup olunca. Erken koymak güven kaybettirir.
- **Nereye:** sitenin alt bilgisi, eklenti sayfası, README, mağaza açıklamasında tek satır, oturum özetinin
  sonunda nazik bir satır. **Oda içinde / video üstünde asla** bağış istemi yok; eklenti kimseyi dürtmez.
- **Platformlar (kurulumdan önce güncel durumu doğrula):**
  - GitHub Sponsors: komisyonsuz; Türkiye 2022'den beri desteklenen ülkeler listesinde. Repo public olunca anlamlı.
  - Patreon: Türkiye dışı içerik üreticilerine Payoneer ile banka ödemesi var; komisyon yaklaşık %10.
  - Ko-fi / Buy Me a Coffee: PayPal ya da Stripe istiyor; ikisi de Türkiye'de hesap açtırmıyor → büyük ihtimalle
    olmaz.
  - Yerli seçenekler (ör. Kreosus) araştırılabilir.
- **Vergi:** Türkiye'de bu tür bağışlar gelir sayılabiliyor (Patreon için ticari kazanç diyen bir özelge var;
  sosyal içerik üreticisi istisnası olabilir). Hesap açmadan önce bir mali müşavire sor.
- Ödemeyi platform alır; biz kimseden veri almayız (gizlilik politikası değişmez, sadece link eklenir).
- Platform seçimi ve hesap açmak kullanıcının işi (para).

### Repoyu herkese açma (public)
**Önerim: 1.0 mağazada onaylandıktan hemen sonra, lansmanla (Show HN vb.) birlikte.** İnceleme sırasında
değişiklik yapmamış oluruz; açık kaynak olmak "tüm siteler" izni isteyen bir eklentiye güven verir, CV için
değerli, GitHub Actions dakikası sınırsız olur, GitHub Sponsors açılır. Riski: kopyalanma (MIT zaten izin
veriyor; bizi farklı kılan bakım ve topluluk) ve gelecek issue'ları yanıtlama yükü.

Açmadan önce:
- [ ] `docs/internal/rakip-analizi.md` ve diğer belgelerdeki site adlarını temizle; CLAUDE.md'deki iç notları tarafsızlaştır.
- [ ] **Geçmiş:** eski commit'lerde de bu adlar var → en temizi yeni bir public repo, tek "ilk sürüm" commit'iyle
  (ya da `git filter-repo`). Private repo arşiv olarak kalır.
- [ ] Gizli anahtar taraması (ör. gitleaks); Cloudflare anahtarları zaten repo Secrets'ta, kodda yok.
- [ ] README'ye "open source", katkı rehberi (CONTRIBUTING), issue şablonları; mağaza açıklamasına bir sonraki
  sürümde "open source".
- [ ] Yeni repoda Secrets'ı tekrar ekle, Actions'ı ve otomatik yayını dene.

### Sonraki adımlar (v1.x)
- [ ] **Elle video seçimi:** otomatik seçim yanılırsa "bu videoyu senkronla".
- [ ] **Kısa alan adı:** workers.dev güven vermiyor (önerim 1.0'dan önce, yukarıda).
- [ ] **Tanıtım videosu / GIF:** sitede ve mağaza sayfasında 30–60 sn'lik "nasıl çalışır".
- [ ] **Eklentiyi kurunca aynı odaya dönüş:** "eklenti gerekli" kartından mağazaya, kurulumdan sonra odaya.
- [ ] **Sesli sohbet (bas-konuş):** WebRTC; küçük gruplarda eşler arası, büyüklerde Cloudflare Realtime (SFU).
- [ ] **Telefon:** site için PWA (YouTube ve doğrudan videolar), sonra Firefox Android'de eklenti.
- [ ] **Firefox desteği:** arka plan için ayrı manifest.
- [ ] **Eklenti yüklü gerçek Chrome testi CI'da:** Playwright ile (`scripts/harness/embed/` temel olur).
- [ ] **Senkron ölçümü ve rozet:** p50/p95 fark, README'de grafik.
- [ ] **Büyüme:** repoyu açmak (yukarıda "Repoyu herkese açma"), lansman planı (`docs/internal/BUYUME.md`), bağış (yukarıda).
- [ ] **Daha fazla dil.**
- [ ] **Gelecek fikirleri (Ekim 2026, kullanıcıdan; ayrıntılı değerlendirme `docs/internal/gelecek-fikirler.md`):**
  - [ ] Reels / Shorts birlikte (kısa dikey videolar, sırayla kaydırma).
  - [ ] Sitenin içinde YouTube araması (link yapıştırmadan video seç).
  - [ ] Görüntülü + sesli sohbet (yukarıdaki sesli sohbetin devamı).
  - [ ] Beklerken mini oyunlar (biri gelene / video yüklenene kadar).
  - [ ] Netflix tarzı servisler (yukarıda "Büyük servisler").
  - [ ] Telefon sürümü (yukarıda PWA / Firefox Android).
- [x] ~~Oda kaydetme~~ (v0.9.48–0.9.49), ~~sitenin içinde film~~ (v0.9.48, artık hep açık),
  ~~izleme sonu paylaşım kartı~~ (v0.9.49'da oturum özeti olarak).

### Uzun vade
- [ ] İsteğe bağlı hesap: kalıcı odalar, arkadaş listesi, oda davet geçmişi.
- [ ] Altyazı senkronu / ortak altyazı dosyası.
- [ ] Discord botu / Activity: `/watch` → oda linki.
- [ ] Sanal tarayıcı modu (DRM'li servisler için) — maliyet nedeniyle ancak sponsorla.

### Teknik borç / küçük notlar
- Sitenin `i18n.ts`'inde artık kullanılmıyor gibi görünen anahtarlar var (eski "Benim odam", "son odalar",
  izleme sonu kartı, deneysel gömme seçeneği metinleri). Temizlerken dinamik kullanılanlara dikkat.
- Gerçek YouTube başlığını isteyen uçtan uca test (`room.mjs`) YouTube'a erişimi olmayan ortamlarda
  (ör. kısıtlı bulut oturumu) takılır; CI'da ve canlıda çalışır.

## Başarı ölçütleri

- Senkron farkı p95 < 300 ms.
- Oda kurma → izlemeye başlama < 30 saniye.
- Eklenti kurulumu < 1 dakika (mağazaya çıkınca < 10 saniye).
- Haftalık "en az 2 kişinin 10 dk'dan uzun izlediği oda" sayısı; tekrar gelen kullanıcı oranı.

## Riskler ve ilkeler

- **Mağaza politikası:** Chrome Web Store telifli içeriğe erişimi
  kolaylaştıran eklentileri reddeder. Araç tarafsızdır; resmî metinlerde,
  ekran görüntülerinde ve README'de belirli film/dizi sitelerinin adı geçmez.
- **İçerik barındırmıyoruz:** sunucu video taşımaz; sadece senkron mesajları.
- **Engel aşmıyoruz:** gömmeyi yasaklayan sitelerin başlıkları kaldırılmaz; o sitelerde oda görünümü kullanılır.
- **DRM:** asla aşılmaz. Netflix/Disney+ gibi servisler şimdilik desteklenmiyor; ileride herkesin kendi
  aboneliğiyle, sitenin kendi oynatıcısına komut vererek desteklenebilir (yukarıda "Büyük servisler").
- **YouTube politikası:** reklam engelleme yazılımın parçası değil;
  kullanıcı kendi tarayıcısında istediği engelleyiciyi kullanabilir.
- **Sürdürülebilirlik:** küçük kod tabanı, test, açık belgeler; bakım yükü düşük.
