# Reklamlı sitelerde ScreenWithMe

Soru: Reklam engelleyicisi olmayan bir arkadaş, reklamla dolu bir video sitesinde odaya katılınca ne olur,
eklenti bozulur mu, biz ne yapabiliriz?

> Bu rapor **kod okumasına ve belgelere** dayanır (Ekim 2026, eklenti 0.9.56). Gerçek bir reklamlı sayfada
> denenmedi; "olabilir" dediğim yerler deneme ister (aşağıda "Nasıl denenir").

> **Durum (0.9.60):** a1, a2, a4, a9, c1 (0.9.57–0.9.59) ve a3, a5, a6 (0.9.60) yapıldı. Yapılmayacaklar aşağıda.

## Kısaca

- **Odanın kendisi çoğu reklama karşı zaten korunaklı.** Oda görünümünde katmanımız (kabuk) sayfanın tamamını
  kaplar, sadece videonun deliği açıktır. Deliğin dışındaki tıklamalar bizim katmana gider, film sitesine hiç
  ulaşmaz. Ayrıca odak modu sayfanın gövdesini `visibility: hidden` yapar: gövdeye eklenen şeffaf "tıklama
  tuzağı" katmanları görünmez olur ve görünmeyen öğe tıklama alamaz.
- **Asıl riskler deliğin içinde ve motorda:**
  1. Deliğe (videoya) ilk tıklamada açılır pencere / yeni sekme açılabilir; film sekmesi başka siteye
     yönlendirilirse oda katmanı kalkar.
  2. Oynatıcı içi ön-reklam (VAST) **aynı `<video>`'yu** kullanıyorsa motor reklamı film sanabilir:
     reklamın kendi sarması/duraklatması odaya "kullanıcı yaptı" diye yayılabilir (en kötü durumda herkes
     başa sarılır).
  3. Film `<video>`'su henüz yokken köşedeki yapışkan video reklamı tek aday olur: delik reklamın üstüne oturur,
     kullanıcı asıl oynatıcının ▶'una basamaz.
  4. Her kişinin reklamı farklı anda gelir: "herkes hazır" her reklamda odayı 12 sn'ye kadar durdurur.
- **Önerim:** önce motoru ve video seçimini reklama dayanıklı yapan **küçük, güvenli değişiklikler**
  (bölüm 3, adım 1–4), sonra film sekmesinden açılan reklam sekmelerini kapatmak. Kendi reklam engelleme
  listemizi (`declarativeNetRequest`) **şimdilik yapmayalım**; onun yerine uBlock Origin Lite önerisini daha
  görünür yerlere koyalım.

---

## 1. Reklam türleri ve bize etkisi

| Reklam türü | Nerede durur | Bize etkisi | Ne kadar ciddi |
|---|---|---|---|
| Afiş / reklam iframe'i (sayfa kenarında) | Sayfada, oynatıcı dışında | Odak modunda gövde gizli → görünmez. Oynatıcı bulunmadan önce `likelyPlayer` en büyük çerçeveyi seçerse büyük bir afiş deliğe oturabilir. | Düşük |
| Şeffaf tıklama tuzağı (sayfanın üstünü kaplayan boş katman) | Genelde `<body>`'nin sonuna eklenir | Gövde gizli olduğu için tıklama almaz (kendisi `visibility: visible` demiyorsa). Oynatıcı kutusunun **içine** konduysa deliğin içinde çalışır. | Orta |
| Açılır pencere / yeni sekme ("ilk tıklamada reklam") | Belgeye bağlı tıklama dinleyicisi | Deliğe tıklayınca açılır (tıklama gerçek kullanıcı hareketi, Chrome'un pencere engelleyicisi buna izin verir). Film sekmesi arkada kalır. | Orta |
| Sekmenin başka siteye yönlendirilmesi | Tıklama sonrası `top.location` | Alan adı değişince `Shell.site` katmanı kaldırır: kişi odayı ve filmi kaybeder, elle geri dönmesi gerekir. | Orta–yüksek |
| Oynatıcı içi ön/ara reklam (VAST, IMA) | Oynatıcının içinde; ya **aynı** `<video>` ya da üstte **ikinci** bir `<video>` | Motor ve "herkes hazır" etkilenir (bölüm 2.2). | **Yüksek** |
| Yapışkan "outstream" video reklamı (köşede küçük video) | Sayfada, sabit konum | Film videosu henüz yoksa tek aday o olabilir (bölüm 2.1). | Orta |
| Arka planda dönen sesli/sessiz video reklamlar | Gizli iframe'ler | Gizli olsa da oynar: ses gelir, işlemci harcar. | Düşük–orta |
| Tam sayfa "geçiş reklamı" (geri sayımlı, "Kapat" düğmeli) | `<body>`'nin üstünde | Odak modu bunu da gizler → kullanıcı kapat düğmesini **göremez**; oynatıcı reklam kapanmadan başlamıyorsa takılır. | Orta |

---

## 2. Ayrıntılı etkiler (koda göre)

### 2.1 "En iyi video" seçimi reklamı seçebilir mi?

Puan (`packages/shared/src/video-element.ts` `scoreVideo`): görünmeyen ya da 200×112'den küçük video 0 puan;
gerisi alan × (10 dk'dan uzunsa ×3, 2 dk'dan uzunsa ×1,5, 60 sn'den kısaysa ×0,5) × (oynuyorsa ×1,2).
Arka plan (`apps/extension/src/background.ts` `chooseActive`) çerçeveler arasında en yüksek puanı seçer.

- **Film videosu sayfadayken genelde doğru seçilir.** Film büyüktür, süresi uzundur (×3). 30 sn'lik ve aynı
  boyuttaki bir reklam en fazla alan × 0,6 alır; film (süresi henüz bilinmese bile) alan × 1 alır.
- **Risk 1 — film videosu yokken:** çok sitede oynatıcı önce kapak resmi + ▶ gösterir, `<video>`'yu ▶'a basınca
  yaratır. O an sayfada köşede oynayan bir video reklamı varsa (ör. 400×225, 30 sn) **tek aday odur**:
  motor ona bağlanır ve `applyLayout` deliği reklamın oynatıcı kutusuna oturtur. Kullanıcı asıl oynatıcının ▶'una
  basamaz (delik reklamın üstünde). Reklam kaybolunca düzelir; ama bazıları kapanmaz.
- **Risk 2 — oynatıcı reklam sırasında filmi gizliyorsa:** bazı oynatıcılar reklam boyunca film `<video>`'sunu
  `display: none` yapar → film 0 puan, reklam tek aday → motor reklama geçer, reklam bitince filme döner.
  Geçişlerde motor yeniden bağlanır (iş görür ama gereksiz komutlar gider).
- **Risk 3 — reklam iframe'i:** reklam videosu ayrı bir çerçevedeyse (IMA'nın kendi çerçevesi, VPAID) ve filmin
  çerçevesi henüz 0 puandaysa arka plan reklam çerçevesini "etkin" seçer. Şu an çerçevenin **nereden geldiğine**
  hiç bakmıyoruz.
- İyi haber: `deactivate` başka çerçeve seçilince videoyu durdurmaz (yorumda da var), 60 sn'den kısa video
  bitince odaya "sıradaki" gitmez (`content.ts` `onEnded`). Bu iki savunma zaten var.

### 2.2 Ön-reklam bitip filme geçerken senkron

İki tür oynatıcı var, ikisi farklı bozulur:

**a) Reklam aynı `<video>`'da oynar** (kaynağı değiştirip sonra geri koyan eklentiler; ör. Video.js'in reklam
eklentisinin bazı modları):

1. Kaynak değişince `emptied` olur → `onSourceChange` motoru baştan bağlar (iyi: "herkes başa sarılmasın" diye
   yazılmıştı).
2. Ama motor yeni videoya hemen odanın konumunu uygular: oda 34. dakikadaysa 30 sn'lik reklamı 2040. saniyeye
   sarmaya çalışır. Çoğu oynatıcı reklam sırasında sarmayı **geri alır** (reklamı atlatmamak için). Pencere (1 sn)
   geçtikten sonra gelen bu geri sarma motora "beklenmeyen zaman sıçraması" gibi görünür →
   `localChange('seek', { position: 0..30 })` → **bütün oda reklamın içindeki bir ana sarılır.** Bu en kötü
   senaryo; denemeyle doğrulanmalı.
3. Reklam SDK'sı reklama tıklanınca reklamı duraklatır (reklamcının sayfasını açmak için) → motor bunu kullanıcı
   duraklatması sayar → herkes durur.
4. Reklam bitince film kaynağı geri gelir → yine `emptied` → yeniden bağlanır, odanın konumuna atlar. Bu kısım
   doğru çalışır.

**b) Reklam filmin üstünde ikinci bir `<video>`'da oynar** (IMA SDK'nın olağan hâli):

1. Motor film videosuna bağlı kalır (puanı daha yüksek). Oda oynuyor, film ilerlemiyor → 1,5 sn sonra
   `ready:false` → sunucu odayı **herkes için** `SYSTEM` adına durdurur, en fazla 12 sn bekler, sonra devam eder;
   aynı kişi 30 sn tekrar bekletemez (`waiting.ts`). 30 sn'lik reklamda: oda 12 sn durur, sonra devam eder,
   reklamı biten kişi filme dönünce kayma > 1 sn olduğu için ileri atlar. **Sonuç kabul edilebilir.**
2. Ama motor her 3 sn'de bir filmi oynatmaya çalışır (`PLAY_RETRY_MS`). Reklam SDK'sı filmi hemen tekrar duraklatırsa
   bu "beklenmeyen duraklatma"dır → odaya `pause` gider (kişi adına). Yani reklamlı kişi tekrar tekrar odayı
   durdurabilir, ya da reklam ve film sesi üst üste çalar. Oynatıcıya göre değişir; denenmeli.
3. Ara reklamlar (her 10–15 dk'da bir) herkeste farklı anda gelir: 4 kişilik odada her ara reklam herkesi
   12 sn'ye kadar bekletir. Bekleme yöneticinin isteğine bağlı (`settings.waitForAll`), yine de can sıkıcı.

### 2.3 Kabuk / delik reklam iframe'ini oynatıcı sanabilir mi?

- `likelyPlayer` (`apps/extension/src/focus.ts`) video yokken sırayla: en büyük video → en büyük çerçeve
  (`biggestFrame`, 200×120'den büyük) → 16:9'a yakın büyük kutu. **Evet, sanabilir:** oynatıcı çerçevesi
  geç yükleniyorsa ya da sayfada büyük bir afiş/geçiş reklamı çerçevesi varsa delik oraya oturur. Video
  bulununca `swm-focus-here` zinciri doğru çerçeveyi büyütür (yorumda da "büyük bir reklam çerçevesi yanlış
  seçilmesin" deniyor), yani **video bulunana kadar** süren geçici bir sorun.
- Geçiş reklamı deliğe oturursa aslında işe yarar (kullanıcı "Kapat"a basabilir). Sorun tersi: geçiş reklamı
  `<body>`'deyse ve delik oynatıcıdaysa reklam **gizlenir**, kapatılamaz, oynatıcı da beklemede kalır.

### 2.4 Deliğe tıklayınca açılır pencere / yönlendirme

- Deliğin içindeki tıklama film sayfasına gider (bilerek böyle: ▶ ve sitenin kendi kontrolleri çalışsın). Reklam
  betikleri genelde belgenin tamamına "ilk tıklama" dinleyicisi koyar → **ilk ▶'da yeni sekme açılır.**
  Chrome'un açılır pencere engelleyicisi bunu durdurmaz çünkü gerçek bir kullanıcı tıklaması var.
- Yeni sekme öne geçer, film sekmesi arkada kalır. Oda bozulmaz (video ve bağlantı arka planda da sürer), ama
  kullanıcı "oda nereye gitti?" diye şaşırır, bazen reklam sekmesini kapatınca da film sekmesi yerine başka sekme
  öne gelir.
- Film sekmesinin kendisi reklama yönlendirilirse alan adı değişir → katman kalkar. Kişi "🏠 Odaya dön" yerine
  geri tuşuna basmak zorunda kalır.
- Deliğin dışındaki tıklamalar (sohbet, emoji, kontroller) bizim katmana gider; oralardan reklam açılmaz.
  Klavye kısayolları da film sayfasına hiç gösterilmez. **Bu iyi bir savunma; korunmalı.**

### 2.5 Arka planda oynayan sesli reklamlar

- Odak modu sayfayı sadece **görsel olarak** gizler; gizli `<video>`'lar oynamaya, ses çıkarmaya, işlemci harcamaya
  devam eder. Chrome sesli otomatik oynatmayı genelde engeller, ama kullanıcı deliğe bir kez tıklayınca sayfa
  "kullanıcı etkileşimi" almış olur ve sesli reklam çalabilir. Kullanıcı sesi duyar ama kaynağı göremez.
- Bizim maliyetimiz küçük: her çerçeve saniyede bir video arar, DOM değişince en fazla 300 ms'de bir; derin
  (shadow DOM) tarama 5 sn'de bir ve sadece video yoksa. Reklamlı sayfalarda çok çerçeve = çok bağlantı ama
  her biri hafif. Asıl yük reklamların kendisi (video çözme, hatta bazen madenci betikleri); onu biz yaratmıyoruz.
- Sekmeyi tümden sessize almak (`chrome.tabs.update({ muted })`) filmi de susturur, işe yaramaz.

---

## 3. Çözümler

Zorluk: 🟢 kolay · 🟡 orta · 🔴 zor. Mağaza: ✅ sorun yok · ⚠️ dikkat · ❌ kaçın.

### (a) Mevcut kodda savunmalar

| # | Ne | Zorluk | Risk | Mağaza |
|---|---|---|---|---|
| a1 | **Kısa videodan odaya hareket gitmesin:** etkin videonun süresi biliniyor ve < 60 sn ise motor odaya `play/pause/seek/rate` yollamaz, sadece `ready:false` der; odanın konumuna sarmaya da çalışmaz (reklamı ileri sarmak oynatıcıyla inatlaşmak demek). Bugünkü `onEnded` kuralının (≥ 60 sn) devamı. `sync-engine.test.ts`'e "aynı videoda 30 sn'lik reklam" senaryosu. | 🟢 | Düşük. 60 sn'den kısa bir şeyi birlikte izleyen olursa senkron olmaz (bu araç için nadir; sitedeki YouTube/doğrudan video bundan etkilenmez, kural sadece eklentide). | ✅ |
| a2 | **Puanda reklam işaretleri:** `scoreVideo`'ya yeni bilgiler: süresi < 60 sn → 0,5 yerine ~0,1; `loop` + `muted` (arka plan/reklam) → düşük; ekranın köşesinde sabit duran küçük video → düşük; çerçevenin adresi bilinen reklam alan adlarındansa (ör. `doubleclick.net`, `googlesyndication.com`, `imasdk.googleapis.com` gibi birkaç büyük ağ; liste kodda, kısa) çerçeve puanı 0. | 🟢 | Düşük; puan testleri var, yenileri eklenir. Liste kısa ve sadece "bu çerçevede film yok" anlamına geliyor, hiçbir şeyi engellemiyor. | ✅ |
| a3 | **"Reklam oynuyor" durumu:** a1'in tetiklediği hâl ya da film dururken başka bir videonun oynaması → `{t:'ready', ready:false, ad:true}` (isteğe bağlı alan, `PROTOCOL_VERSION` artmaz). Sunucu reklamdaki kişi için odayı **bekletmez**; kişiler listesinde "📺 reklamda" yazar; reklam bitince kişi kendiliğinden yetişir (kayma > 1 sn → atla). | 🟡 | Orta: sezgi yanılırsa gerçekten takılan birini beklemeyiz (en kötü sonuç: o kişi biraz geriden gelir, sonra atlar). | ✅ |
| a4 | **"Sayfayı göster" düğmesi** (kabukta, oda görünümünde): katmanı birkaç saniyeliğine `open`'a alıp film sayfasını olduğu gibi gösterir; kullanıcı geçiş reklamını kapatır, "Odaya dön" ile geri gelir. Video bulunamazsa / 10 sn boyunca video çıkmazsa ipucu olarak önerilir. | 🟢 | Düşük; mevcut `open` yerleşimini kullanır. | ✅ |
| a5 | **Film sekmesinden açılan reklam sekmesini kapat:** arka planda `chrome.tabs.onCreated` → `openerTabId` kabuklu bir sekmeyse, oda görünümü açıksa ve yeni sekme 1–2 sn içinde film sitesinden başka bir siteye gidiyorsa sekmeyi kapat, film sekmesini öne getir, odada küçük bir not göster ("Açılan bir reklam sekmesi kapatıldı · Geri aç"). Ek izin gerekmiyor (`openerTabId` izinsiz gelir; adres için `<all_urls>` zaten var). Sayfadaki betikler bunu atlatamaz. | 🟡 | Orta: kullanıcının bilerek yeni sekmede açtığı bir bağlantıyı kapatabiliriz → "Geri aç" düğmesi ve ayarlardan kapatma şart; sadece oda görünümündeyken ve sadece **başka siteye** giden sekmeler. | ⚠️ Mağaza açıklamasında ve gizlilikte "odadaki sekmeden açılan pencereleri kapatabilir" diye yazılmalı. Amaçla bağlantılı (izleme partisini korumak), ayrı bir özellik gibi pazarlanmamalı. |
| a6 | **Yönlendirmeden kurtarma:** film sekmesi oda görünümündeyken (deliğe tıkladıktan hemen sonra) başka siteye giderse katmanı hemen kaldırmak yerine üstte "Bu sayfa seni başka siteye götürdü · Filme geri dön" kartı (site film adresini zaten biliyor: `page`). | 🟡 | Düşük. | ✅ |
| a7 | **`window.open` sarmalayıcı (MAIN world, `fullscreen-guard.ts` gibi):** oda varken sayfanın `window.open`'ını boş döndürür. | 🟡 | **Yüksek:** kolayca atlatılır (yeni bir `about:blank` iframe'den temiz bir `window.open` alınır; `<a target=_blank>` tıklaması, form gönderme), ayrıca oynatıcının kendi meşru pencerelerini (paylaş, altyazı yükle) bozar. a5 aynı işi daha sağlam yapar. | ⚠️ |
| a8 | **Deliğin içindeki şeffaf katmanları etkisizleştirme:** oynatıcı kutusunda videonun üstünü kaplayan, içi boş, saydam öğelere `pointer-events: none`. | 🔴 | **Yüksek:** oynatıcıların kendi kontrol katmanları da saydamdır ve tıklamayla oynat/durdur yapar; ayırt etmek güvenilir değil. Yanlışta oynatıcı hiç tıklanmaz. Yapmayalım. | ⚠️ |
| a9 | **Odak modunda başka videoları sustur:** etkin video ve onun oynatıcı kutusu dışındaki her `<video>`'yu `muted` yap (duraklatma değil: duraklatılan reklam oynatıcısı filmi hiç başlatmayabilir). | 🟢 | Düşük–orta: IMA gibi ikinci `<video>` oynatıcı kutusunun içindeyse dokunulmaz (iyi: reklam sesi duyulur ama film başlar). Kutunun dışındaki gizli reklamlar susar. | ✅ |

### (b) `declarativeNetRequest` ile kendi reklam engelleme listemiz

Nasıl olurdu: arka plan, oda açılınca `chrome.declarativeNetRequest.updateSessionRules` ile **sadece o sekmeye**
(`condition.tabIds` — bu sadece oturum kurallarında var) bilinen reklam alan adlarını engelleyen kurallar ekler,
oda kapanınca siler.

- **İzin uyarısı:** `declarativeNetRequest` kurulumda "Herhangi bir sayfadaki içeriği engelle" uyarısı ekler.
  `declarativeNetRequestWithHostAccess` uyarı göstermez ama host izni ister; bizde `<all_urls>` zaten var.
  Yani teknik olarak **yeni uyarı olmadan** yapılabilir.
- **Sınırlar:** oturum kuralı en fazla 5.000, dinamik 30.000, sabit listelerde en az 30.000 garanti, regex
  kuralı 1.000. Sadece sekmeye özel olmak için oturum kuralı gerekir → 5.000 alan adı. Gerçek listeler
  (EasyList ≈ on binlerce kural) bunun çok üstünde; seçim yapmak gerekir.
- **Açılır pencereler bununla pek çözülmez:** yeni reklam sekmesi **farklı bir sekme kimliği** alır, sekmeye
  özel kurallar onu kapsamaz. Çözüm yine a5.
- **Lisans:** EasyList/EasyPrivacy GPLv3 **ya da** CC BY-SA 3.0 (seçmeli), kaynak olarak "The EasyList authors
  (https://easylist.to/)" anılmalı. Bizim kodumuz MIT; listenin dönüştürülmüş hâli ayrı bir dosya olarak
  CC BY-SA 3.0 altında dağıtılabilir (kod MIT kalır), ama ShareAlike: listede yaptığımız değişiklikler de
  CC BY-SA olur, ve bunu README + gizlilik + eklenti sayfasında belirtmek gerekir. Diğer listelerin (uBlock
  filtreleri, AdGuard, Peter Lowe) lisansları ayrıca kontrol edilmeli. Kendi elle yazdığımız kısa bir alan adı
  listesi MIT olur ama değeri düşüktür.
- **Bakım:** bu sitelerdeki reklam ağları alan adlarını sık değiştirir. Sabit liste eklenti sürümüyle güncellenir
  (mağaza incelemesi her seferinde günler sürebilir); uzaktan liste çekmek (veri, kod değil) mümkün ama bakım
  ve sorumluluk bizde kalır. uBlock Origin Lite bunu tam zamanlı bir ekiple yapıyor; onunla yarışamayız.
- **Mağaza politikası:** Chrome Web Store "tek amaç" kuralı: eklentinin dar ve kolay anlaşılır tek bir amacı
  olmalı, ilgisiz işlevler ayrı eklenti olarak dağıtılmalı. İzleme partisi + reklam engelleyici, incelemeci
  tarafından **iki ayrı amaç** sayılabilir. Ayrıca "reklamları engelleyen izleme aracı" ifadesi, reklamla
  geçinen sitelerde (hangileri olduğu belli) kullanım çağrışımı yapar; resmî metinlerde tarafsızlık ilkemize
  ters düşer. Bizim en riskli adımımız zaten ilk mağaza onayı.
- **Değerlendirme:** 🔴 zor, ⚠️ mağaza riski, kazanç sınırlı (pencereleri çözmüyor). **Şimdilik yapmayalım.**
  1.0 ve mağaza onayından sonra kullanıcılar gerçekten isterse yeniden düşünülebilir.

### (c) Kullanıcıya "reklam engelleyici kur" önerisi

- Zaten var: sitenin alt bilgisinde `adblockTip` / `adblockNote` ("Reklamsız izlemek istersen önerimiz:
  uBlock Origin Lite … ayrı bir eklenti; ScreenWithMe'nin parçası değil, sadece öneri"). Bağlantı GitHub
  sayfasına gidiyor.
- uBlock Origin Lite: MV3, ücretsiz, açık kaynak (GPLv3), Chrome Web Store'da (kimlik
  `ddkjiahejlhfcafbddmgiahcphecmpfh`; bağlantıyı koymadan önce mağazada kontrol et). Brave'in ve Opera'nın
  kendi engelleyicisi var; Edge'de mağazasındaki sürüm kurulabilir.
- Öneriyi **daha görünür ama rahatsız etmeden** söyleyebileceğimiz yerler (🟢, ✅ mağaza: başka bir eklentiyi
  önermek serbest, yeter ki bizim parçamız gibi sunulmasın):
  1. **Eklenti sayfası (`eklenti.html`), kurulum adımlarının sonunda** kısa bir kutu: "İpucu: bazı siteler çok
     reklamlıdır. Reklam pencereleri izlemeyi bölerse ücretsiz bir reklam engelleyici kurabilirsin (ör. uBlock
     Origin Lite). ScreenWithMe'nin parçası değildir." Bağlantı mağaza sayfasına.
  2. **Film sayfasında, sorun olunca:** a5 bir reklam sekmesi kapattığında ya da kişi yönlendirildiğinde (a6),
     notun altında bir kez "Reklamlar çok mu? Reklam engelleyici önerisi →". Oturum başına en fazla bir kez,
     "bir daha gösterme" ile.
  3. **Popup'ta değil, oda içinde sürekli değil.** Bağış isteminde koyduğumuz kural gibi: video üstünde kalıcı
     öneri yok.
- Metinlerde site adı yok, "reklamlı siteler" de denmeden "bazı siteler" denir; "film sitesi" yerine
  "video sayfası".

---

## 4. Önerim: sıra

**Önce (küçük, güvenli, bir sürümde):**

1. **a1** — kısa videodan odaya hareket gitmesin. En kötü senaryoyu (herkesin reklamın içine sarılması) kapatır.
   Motor testine senaryo eklenir.
2. **a2** — puanda reklam işaretleri (kısa/döngülü/sessiz/köşede küçük video, bilinen reklam çerçevesi).
3. **a9** — oynatıcı kutusu dışındaki gizli videoları sustur.
4. **a4** — "Sayfayı göster" düğmesi (geçiş reklamı ya da yanlış delik için kaçış yolu).
5. **c1** — eklenti sayfasına reklam engelleyici ipucu, mağaza bağlantısıyla.

**Sonra (deneme gerektirir):**

6. **a5 + a6** — reklam sekmesini kapat / yönlendirmeden geri dön, "Geri aç" ve ayarla. Mağaza açıklamasına bir
   cümle.
7. **a3** — "reklamda" durumu ve reklamdaki kişi için odayı bekletmeme.

**Yapmayalım:**

- Kendi reklam engelleme listemiz (b): tek amaç kuralı, lisans, bakım; açılır pencereleri de çözmüyor.
- `window.open` sarmalayıcı (a7) ve deliğin içindeki saydam katmanları kapatmak (a8): kolay atlatılır, oynatıcıyı
  bozma riski yüksek.
- Reklam **atlatmak** (reklam videosunu ileri sarmak, hızlandırmak, reklam olaylarını taklit etmek): oynatıcıyla
  inatlaşır ve "reklam atlatıcı" olarak anlaşılır. Reklamı izlemek zorunda kalan kişiyi beklemek ya da sonra
  yetiştirmek yeter.
- Video üstünde ya da odada sürekli "reklam engelleyici kur" uyarısı.

---

## 5. Nasıl denenir (yasal demolar)

Reklamlı korsan sayfaları açmadan aynı davranışlar şu yasal örneklerle denenebilir:

- **Google IMA SDK örnekleri** (HTML5 "Simple" ve "Advanced" örnekleri, Google'ın örnek VAST etiketleri:
  ön-reklam, ara reklam, atlanabilir reklam). İkinci `<video>` senaryosu (2.2 b).
- **Video.js + videojs-contrib-ads / videojs-ima demoları**: reklamın aynı `<video>`'da oynadığı mod (2.2 a).
- **JW Player'ın VAST demoları** ve **Plyr'in reklam (IMA) demosu**.
- Açılır pencere ve tıklama tuzağı için kendi test sayfamız: `scripts/harness/embed/` altındaki film sayfasına
  `window.open` yapan bir belge tıklama dinleyicisi, `<body>`'nin sonunda tam ekran saydam bir katman ve köşede
  30 sn'lik `loop muted` bir video eklenir; `scripts/harness/embed/run.mjs` ile gerçek Chromium + eklenti.

Kontrol listesi: ilk ▶ hangi videoyu seçti (`candidate` puanları), reklam sırasında odaya giden mesajlar
(özellikle `seek`), "herkes hazır" kaç kez tetiklendi, delik nereye oturdu, açılan sekmeler, ses.

## Kaynaklar

- Chrome `declarativeNetRequest` belgesi (izinler, `tabIds` sadece oturum kurallarında, kural sınırları):
  https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest
- Chrome Web Store kalite kuralları ("tek amaç"):
  https://developer.chrome.com/docs/webstore/program-policies/quality-guidelines
- EasyList lisansı (GPLv3 ya da CC BY-SA 3.0, atıf): https://easylist.to/pages/licence.html
- uBlock Origin Lite: https://github.com/uBlockOrigin/uBOL-home
