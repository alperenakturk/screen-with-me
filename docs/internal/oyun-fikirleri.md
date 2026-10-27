# PlayWithMe: oyun fikirleri ve plan

> 27 Ekim 2026, ayrı bir fikir konuşmasında yazıldı (site 0.9.76). Kullanıcı (Alperen) listeyi gördü ve şunu istedi:
> "Kendi önerilerine göre birkaç şey ekle/çıkar, tasarım iyi ve profesyonel dursun, oyun sistemleri smooth ve iyi
> çalışsın, gerekli modları da ekle." Bu yüzden seçim ve sıra Claude'un. Yapım işi ana geliştirme konuşmasında yapılacak.
> Var olan yapı için `CLAUDE.md` "PlayWithMe" bölümüne bak: oyunlar odanın içinde, 🎮 menüsü, videonun yerinde sahne.

## Kısaca karar

| Sıra | Oyun | Tür | Kişi | Zorluk | Not |
|---|---|---|---|---|---|
| 1 | **Ortak oyun arayüzü + skor tablosu** | altyapı | – | Orta | Sonraki her oyun bunun üstüne kurulur |
| 2 | **Sonra ne olacak? 🔮** | izleme oyunu | 2–8 | Kolay–orta | Videoya bağlı, bizi rakiplerden ayırır |
| 3 | **Kaç puan? ⭐** | izleme oyunu | 2–8 | Kolay | Film gecesinin doğal kapanışı |
| 4 | **En çok kim? 👉** | parti (sahne) | 3–8 | Kolay | Parti motorunun ilk oyunu |
| 5 | **Yalancı kim? 🕵️** | parti (sahne) | 3–8 | Orta | Sesli sohbetle çok iyi gider |
| 6 | **Film Bingosu 🎯** | izleme oyunu | 2–8 | Orta | Bütün film boyunca sürer |
| 7 | **Emoji bilmece 🧩** | parti (sahne) | 2–8 | Kolay–orta | Çiz-Bil'in telefona uygun hali |
| Sonra | Kelime avı 🔤, Amiral battı 🚢 | sahne | – | Orta–zor | Sözlük / gizli bilgi işi var |

**Çıkarılanlar ve nedeni:**
- **Tepki yarışı** (rastgele emojiye ilk basan): izlerken dikkati videodan koparır. Videoyu bölen oyun istemiyoruz.
- **Hızlı tur** (30 sn'lik mini görevler): her görev ayrı iş, kazancı az. Oyun sayısını şişirir ama derinlik katmaz.
- **Amiral battı:** XOX/Dört Taş varken üçüncü bir iki kişilik tahta oyunu öncelikli değil. Turnuva modu (aşağıda) iki
  kişilik oyunların "diğerleri sadece izliyor" sorununu daha iyi çözer.
- **Kelime avı:** iyi bir fikir ama lisansı uygun, küçük bir Türkçe sözlük bulunmadan iyi çalışmaz. Sıra sonra.

## İki çeşit oyun: izleme oyunları ve sahne oyunları

Şu anki oyunların hepsi **sahne oyunu**: videonun yerine geçer, oynarken video izlenmez. Yeni listede bir de
**izleme oyunu** var: video oynamaya devam eder, oyun küçük bir kart olarak videonun köşesinde ya da sağ rayda durur.

- **Sahne oyunu:** XOX, Dört Taş, Çiz-Bil, Bilgi yarışması, En çok kim?, Yalancı kim?, Emoji bilmece. Bugünkü kural
  aynen kalır: odada aynı anda tek sahne oyunu olur.
- **İzleme oyunu:** Sonra ne olacak?, Kaç puan?, Film Bingosu. Odada aynı anda **bir izleme oyunu** olabilir ve bu, sahne
  oyunundan bağımsızdır. Örneğin Bingo bütün film boyunca sürerken arada bir XOX açılabilir.
- 🎮 menüsü iki başlık gösterir: "İzlerken" ve "Mola verince". Böylece kullanıcı videonun durup durmayacağını baştan bilir.
- İzleme oyunları **videoyu asla durdurmaz** ve "herkes hazır" beklemesine karışmaz.
- Kabukta (film sayfasında) izleme oyununun kartı bir adacık olur (bugünkü "Ali durdurdu" notu gibi). Sahne oyunları
  kabukta bugünkü gibi çalışır.

**Sunucu tarafı (öneri):**
- İzleme oyunları **oda nesnesinin içinde** (`Room` DO) yürür, ayrı Durable Object gerekmez. Hafif oyunlar: birkaç oy, birkaç
  puan. Depoda `watchGame` alanı tutulur, `welcome`'da gelir, değişince yayılır. Protokolde isteğe bağlı yeni alanlar ve
  mesajlar olduğu için `PROTOCOL_VERSION` artmaz.
- Üç parti oyunu (En çok kim?, Yalancı kim?, Emoji bilmece) **tek bir `Party` Durable Object'inde** yürür (`kind` ile
  ayrılır). Hepsinin iskeleti aynı: lobi → tur → açıklama → puan → sonraki tur → kürsü. Tur motoru bir kez yazılır, her
  oyun sadece kendi kurallarını (saf fonksiyonlar, `packages/shared/src/games/`) verir. Çiz-Bil ve Bilgi yarışmasındaki
  ortak kısımlar zamanla bu motora taşınabilir (acele yok).

## Tasarım: profesyonel ve tutarlı görünüm

Bugün her oyun kendi ekranını kendisi çiziyor. Yeni oyunlardan önce **ortak bir oyun arayüzü takımı** yapılır
(`apps/web/src/games/ui.ts` + ortak CSS). Her oyun aynı parçaları kullanır, böylece hepsi tek bir ürünün parçası gibi görünür.

**Ortak parçalar:**
- **Lobi kartı:** oyunun simgesi + adı + tek cümlelik kural, oturan oyuncuların avatarları, mod seçimi (sadece açan /
  yönetici), büyük "Başla" düğmesi. "Kurallar" bağlantısı 3 maddelik kısa bir pencere açar.
- **Oyuncu şeridi:** sahnenin üstünde avatar + ad + puan. Sırası gelenin çevresi parlar, puan artınca sayı yukarı sayar.
- **Sayaç halkası:** kalan süre avatarın ya da sorunun çevresinde dairesel çubuk. Son 5 sn'de renk değişir, hafif nabız atar.
- **Açıklama ekranı:** turun sonucu (doğru cevap, kim neyi seçti) avatarlarla. Kısa bir "+150" uçuşu.
- **Kürsü:** oyun sonunda 1–2–3 kürsüsü, konfeti (kısa), "Rövanş" ve "Videoya dön" düğmeleri.
- **Boş/bekleme durumları:** "2 kişi daha bekleniyor…" gibi, ne beklendiğini açıkça söyleyen satır. Asla boş ekran yok.

**Kurallar:**
- Renkler tema değişkenlerinden gelir (her temada güzel görünür, ayrı renk yazılmaz). Düğme moru için önceki öneri:
  beyaz yazıda #6a4cf2 (WCAG 4,5:1 üstü).
- Animasyonlar kısa (150–300 ms) ve sadece `transform`/`opacity` ile (telefonda takılmaz). `prefers-reduced-motion`'da
  hareket kalkar, sadece renk değişir.
- **Sesler:** dosya yok, `intro-sound.ts` gibi Web Audio ile üretilir (tık, doğru, yanlış, süre bitiyor, kazanma). Hepsi
  kısa ve yumuşak. Ayarlar'dan kapatılır (`opt:gameSound`). Biri seste konuşurken oyun sesleri de kısılır.
- **Telefon:** dokunma alanları en az 44 px, önemli düğmeler ekranın alt yarısında (tek elle), yazı kutusu klavye açılınca
  görünür kalır. Dikey ve yatay ekran ikisi de denenir. ≤860 px'te sahne bugünkü gibi tam ekran.
- **Erişilebilirlik:** renk tek başına anlam taşımaz (doğru/yanlış için ✓/✗ simgesi de var), klavyeyle oynanabilir
  (şıklar 1–4 tuşları; sahne açıkken bu tuşlar emoji yerine şık seçer).
- Metinler TR/EN (`i18n.ts`). Kullanıcı verisi asla `innerHTML` ile yazılmaz.

## Akıcılık: "smooth" çalışması için kurallar

Bunlar her oyun için kontrol listesidir. Yeni oyun bunlar olmadan bitmiş sayılmaz.

1. **Sunucu tek doğru kaynak.** İstemci sadece hamle yollar. Puanı, doğru cevabı, gizli rolleri sunucu tutar; gizli bilgi
   (Yalancı'nın kim olduğu, doğru şık) zamanı gelmeden hiçbir istemciye gitmez.
2. **Süreler sunucu saatiyle.** Sunucu her tur için `endsAt` (sunucu saati) yollar. İstemci `ServerClock` ile kendi sayar;
   böylece sayaç saniye saniye atlamaz, herkeste aynı anda biter. Sunucu tarafında süreler depo alarmıyla (bellekte
   `setTimeout`'a güvenilmez; DO uyuyabilir).
3. **İyimser arayüz.** Bir şıkka basınca seçim hemen işaretlenir ("gönderiliyor"), sunucu onaylayınca kesinleşir,
   reddederse geri alınır ve kısa bir not çıkar. Kullanıcı hiçbir zaman "bastım mı?" diye düşünmez.
4. **Yeniden bağlanma.** Bağlantı koparsa yeniden bağlanınca sunucu durumun tamamını yollar (sadece farkları değil).
   Sayfa yenilense de oyuncu yerinde kalır (koltuk kalıcı `cid`'e bağlı, bugünkü gibi).
5. **Geç gelen ve ayrılan.** Oyun sırasında gelen biri o turu izler, sonraki turda katılır. Sırası gelen oyuncu 10 sn
   bağlı değilse sırası atlanır ("Ali'nin bağlantısı koptu, sıra geçti"). Oyuncu sayısı alt sınırın altına düşerse oyun
   durur ve "bekleniyor" der; biri gelince devam eder.
6. **Kimse beklemez.** Herkes cevap verince tur süreyi beklemeden biter (Bilgi yarışmasında olduğu gibi).
7. **Hız sınırları sunucuda.** Oyun mesajları odanın genel komut sınırını harcamaz (emoji tepkileri gibi ayrı sayılır).
8. **Test:** her oyunun kuralları saf fonksiyon ve birim testli (`*.test.ts`); her oyuna sahte kullanıcılarla e2e testi
   (`scripts/e2e/<oyun>.mjs`): başla, tur oynat, kopup bağlan, geç katıl, bitir.

## Modlar

### Bütün oyunlarda ortak modlar

- **Süre:** Hızlı / Normal / Uzun. Tur süresini ve tur sayısını birlikte değiştirir (ör. Bilgi yarışması 5 / 10 / 15 soru).
- **Aile modu:** sorular, kelimeler ve "En çok kim?" soruları arasından biraz bile kaba olanlar çıkar. Varsayılan **açık**
  (rastgele bir oda için güvenli seçim); yönetici kapatabilir. Listelerdeki her öğenin bir `family` işareti olur.
- **Takım modu (4+ kişi):** iki takım (🔵/🟠), puanlar takımda toplanır. Takımlar rastgele dağıtılır, açan kişi
  değiştirebilir. Bilgi yarışması, Emoji bilmece ve Çiz-Bil'de anlamlı; diğerlerinde gösterilmez.
- **Kim başlatır:** bugünkü kural aynen (açan ya da yönetici). Yönetici "oyunları sadece ben açayım" diyebilir
  (`settings.gamesHostOnly`). İstenirse oyunlar tamamen kapatılır (`settings.noGames`, emojileri kapatmak gibi).
- **Rövanş:** aynı ayarlar ve aynı oyuncularla tek düğmeyle yeni oyun.

### Oyuna özel modlar

- **Sonra ne olacak?:** "Gizli oy" (sonuç olay olunca açılır; varsayılan) / "Açık oy" (oylar canlı görünür, iddia havası).
- **Kaç puan?:** "Tek puan" (1–10) / "Ayrıntılı" (hikâye, oyunculuk, müzik, son; her biri 1–5).
- **Film Bingosu:** "Klasik" (bir sıra yeter) / "Tam kart" (bütün kart) / "Hızlı" (3×3 kart).
- **En çok kim?:** "Anonim" (sadece sonuç) / "Açık" (kim kimi seçti görünür; arkadaş grupları için daha komik).
- **Yalancı kim?:** "Bir yalancı" / "İki yalancı" (6+ kişi). "Sesli" (ipuçları seste söylenir, ekranda sadece sıra
  gösterilir) / "Yazılı" (ipucu yazılır; seste olmayanlar ve telefon için).
- **Emoji bilmece:** "Kelime" / "Atasözü-deyim". Bunlar genel; film/dizi adı yok.
- **XOX / Dört Taş:** "Tek maç" / "3'te 2" / **Turnuva** (aşağıda).
- **Bilgi yarışması:** kategori seçimi (genel, bilim, coğrafya, spor, müzik, karışık).

## Yeni oyunlar: kurallar

### 1. Sonra ne olacak? 🔮 (izleme oyunu)
- **Kişi:** 2–8. **Süre:** bir soru 20 sn oy + olayın olmasını bekleme.
- **Tur:** Biri "🔮 Tahmin sor" der, soru ve 2–4 şık yazar ("Kapıyı kim açacak?"). Herkes 20 sn içinde oy verir, video
  durmadan devam eder. Soruyu açan olay olunca "Oldu: B" der; bilenler 100 puan alır, en az kişinin bildiği doğru şık
  ek puan verir (cesur tahmin ödülü). Soru 15 dk içinde kapanmazsa düşer.
- **Kurallar:** aynı anda en fazla 1 açık soru. Soruyu soran oy vermez (cevabı bilebilir). Video geri sarılırsa soru kalır.
- **Neden:** film izlerken zaten yapılan "bence şu olacak" konuşmasını oyuna çevirir. Hangi video olursa olsun çalışır.
- **Arayüz:** videonun köşesinde küçük kart (oy verince küçülür), sonuç ekranın ortasında 3 sn.
- **Puanlar** oda skor tablosuna ve "Bugünün özeti"ne ("En iyi tahminci") girer.

### 2. Kaç puan? ⭐ (izleme oyunu)
- **Kişi:** 2–8. **Süre:** 30 sn.
- **Tur:** Video bitince izleme sonu kartında "⭐ Puanla" çıkar (ya da biri istediği an başlatır). Herkes gizli puan verir,
  puanlar aynı anda açılır: ortalama, dağılım, "en sert eleştirmen" ve "en büyük hayran".
- **Kayıtlı odada** puanlar `history`'deki video kaydına yazılır ve odada "Puanladıklarımız" listesi birikir.
- **Neden:** film gecesinin doğal kapanışı, kısa, tartışma başlatır.

### 3. Film Bingosu 🎯 (izleme oyunu)
- **Kişi:** 2–8. **Süre:** bütün video.
- **Tur:** Herkese farklı karıştırılmış 4×4 kart gelir. Kutularda genel film klişeleri yazar ("biri 'gitmem lazım' der",
  "telefon çeker", "yavaş çekim", "kahraman koşar"). Olay olunca kutuya basılır; odaya "Ali işaretledi: yavaş çekim" gider.
  Diğerleri 5 sn içinde 👎 ile itiraz edebilir (yarıdan çoğu itiraz ederse kutu geri açılır). İlk sırayı tamamlayan
  "BİNGO!" der, kart herkese gösterilir.
- **İçerik:** ~80 genel klişe (TR/EN), tür seçimi yok (film adı ya da tür ipucu olmadan genel). Telif yok.
- **Arayüz:** sağ rayda ya da sahne kapalıyken videonun yanında katlanabilir kart; telefonda alttan açılan çekmece.

### 4. En çok kim? 👉 (parti, sahne)
- **Kişi:** 3–8. **Süre:** 8 soru × 15 sn.
- **Tur:** Ekrana bir soru gelir ("Zombi kıyametinde ilk kim gider?"). Herkes odadan birini avatarına basarak gizlice
  seçer (kendini de seçebilir). Sonuç açılır: en çok oy alanın avatarı büyür, taç takılır 😄. Puan, çoğunluğu doğru
  tahmin edenlere gider (çoğunluğun seçtiği kişiyi seçenler +100).
- **İçerik:** ~150 soru (TR/EN), aile modu işaretli. Kimseyi aşağılayan soru yok.
- **Neden:** kuralı 5 saniyede anlaşılır, arkadaş grubunda kahkaha garantili. Parti motorunun en basit oyunu olduğu
  için ilk bu yapılır.

### 5. Yalancı kim? 🕵️ (parti, sahne)
- **Kişi:** 3–8. **Süre:** tur başına ~2 dk.
- **Tur:** Herkese aynı gizli kelime gider ("plaj"), yalancıya sadece "Sen yalancısın" yazar (kategori ipucu olarak
  görünür: "Yerler"). Sırayla herkes tek kelimelik bir ipucu verir (30 sn). İki tur ipucundan sonra oylama yapılır.
  Yalancı yakalanırsa kelimeyi tahmin etme hakkı vardır: bilirse yine de kazanır.
- **Puan:** yalancıyı bulanlar +100; yalancı yakalanmazsa +200; yakalanıp kelimeyi bilirse +150.
- **İçerik:** Çiz-Bil'in kelime listesi kategorilere ayrılarak kullanılır.
- **Neden:** çok güçlü bir parti oyunu ve sesli sohbetle harika gider ("Sesli" modu).

### 6. Emoji bilmece 🧩 (parti, sahne)
- **Kişi:** 2–8. **Süre:** tur başına 60 sn.
- **Tur:** Sırası gelene bir kelime ya da deyim gelir, onu sadece emojilerle anlatır (en fazla 8 emoji, sabit bir
  emoji seçiciden; harf/rakam emojileri yok). Diğerleri yazarak tahmin eder. Tahmin eşleştirme Çiz-Bil'deki gibi
  (Türkçe harfsiz de doğru, 1 harf farkı "yaklaştın"). İpucu harfleri sürenin %50 ve %75'inde açılır.
- **Neden:** Çiz-Bil'in çizim istemeyen hali; telefonda çok daha rahat oynanır.

### Sonra: Kelime avı 🔤 ve Amiral battı 🚢
- **Kelime avı:** 4×4 harf tablosu, 90 sn, komşu harflerden kelime kurulur, sadece senin bulduğun kelimeler çok puan
  alır. Önce lisansı uygun (MIT/CC) ve küçük (≤1 MB sıkıştırılmış) bir Türkçe kelime listesi bulunmalı. Doğrulama
  sunucuda yapılır.
- **Amiral battı:** 2 kişilik, gizli bilgi sunucuda. Tahta oyunu altyapısına (`BoardState`) oturur ama gizli tahta için
  ek iş gerekir.

## Var olan oyunlar için iyileştirmeler

1. **Oda skor tablosu 🏆:** her oyunun sonucu odanın tablosuna yazılır (kişi başı galibiyet ve toplam puan). Kayıtlı
   odada kalıcı (depoda, kişiler `cid` ile, istemciye sadece ad/avatar), diğer odalarda oturum boyunca. 🎮 menüsünün
   üstünde "Bu akşam: Ali 3 🏆 · Ayşe 2 🏆". "Bugünün özeti"ne "Günün oyuncusu" kartı.
2. **Turnuva (XOX / Dört Taş):** 3–8 kişi için eleme tablosu. Sıradaki maçın oyuncularına "Sıra sende" kartı, diğerleri
   izler. Tek sayıda oyuncuda biri bir tur bay geçer. Bugünkü "2 kişi oynar, gerisi izler" sorununu çözer.
3. **Oda rozetleri 🎖️:** "3 galibiyet serisi", "Çiz-Bil'de ilk bilen", "Bilgi yarışmasında hepsi doğru", "En iyi tahminci".
   Hesap olmadığı için `cid`'e bağlı ve sadece o odada geçerli. Kişiler listesinde avatarın yanında küçük simge.
   Az ve anlamlı tutulur (en fazla ~12 rozet).
4. **Bilgi yarışması:** kategori seçimi, odada sorulmuş soruların tekrar gelmemesi (kayıtlı odada son 200 soru
   hatırlanır), soru sayısının artırılması (kategori başına en az 60).
5. **Çiz-Bil:** renk paleti (8 renk), 3 kalınlık, silgi, "geri al", "temizle". Oyun sonunda turların çizimlerinden
   galeri, en beğenilene oy, PNG indirme.
6. **XOX / Dört Taş:** son hamlenin vurgulanması, kazanan dizinin çizgiyle gösterilmesi, düşen taş animasyonu (Dört Taş),
   "3'te 2" modu.
7. **Ortak arayüze geçiş:** var olan dört oyun da yeni lobi, oyuncu şeridi, sayaç ve kürsü parçalarına taşınır. Bunu
   yapmak, hepsinin aynı ürün gibi görünmesini sağlar.

## Önerilen yapım sırası (sürüm numaraları tahmini)

1. **Ortak oyun arayüzü + skor tablosu + oyun sesleri**; var olan oyunlar yeni parçalara taşınır, XOX/Dört Taş
   iyileştirmeleri (madde 6). Ortak modlardan "Süre", "Rövanş", `gamesHostOnly`/`noGames`.
2. **İzleme oyunları altyapısı + Sonra ne olacak? + Kaç puan?** (🎮 menüsünde "İzlerken" bölümü).
3. **Parti motoru (`Party` DO) + En çok kim?** + aile modu.
4. **Yalancı kim?** + takım modu.
5. **Turnuva + rozetler**, Bilgi yarışması ve Çiz-Bil iyileştirmeleri.
6. **Film Bingosu**, **Emoji bilmece**.
7. Sonra: Kelime avı (sözlük bulunursa), Amiral battı.

Her adımda: birim + e2e testi, telefonda deneme (dikey/yatay), kabukta (film sayfasında) deneme, `CLAUDE.md`
"PlayWithMe" bölümünün güncellenmesi.

## Kısıtlar (unutma)
- Resmî metinlerde (README, mağaza, site metinleri) belirli film/dizi adı yok; soru, kelime ve klişe listelerinde de yok.
- Gerçek film sahnesi, gerçek oyun adı ya da başka oyunların kelime/soru listeleri kopyalanmaz. Listeler bizim yazdığımız.
- Hesap yok, ücretsiz; kimlik `cid`. Rozet ve skorlar sadece odada.
- Telefonda tam çalışmalı.
- Oyun içinde ya da videonun üstünde asla bağış istemi yok.
