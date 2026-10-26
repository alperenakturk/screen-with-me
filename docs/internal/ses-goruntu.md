# Sesli ve görüntülü sohbet: araştırma + uygulama planı

Soru: ScreenWithMe'ye mikrofon (sesli) ve kamera (görüntülü) sohbet nasıl eklenir; ne kadara mal olur; film
sayfasındaki katmanda (eklenti) çalışır mı?

> Ekim 2026. Fiyatlar Cloudflare ve LiveKit'in kendi sayfalarından o gün okundu. Eklenti bölümü **gerçek Chrome 156
> ile yerelde denendi** (aşağıda "Deneme"). Cloudflare'e gerçek bir WebRTC bağlantısı kurulmadı (hesapta Realtime
> uygulaması yok); o kısım belgelere dayanır. Önceki kısa değerlendirme: `gelecek-fikirler.md` bölüm 3.

## Kısaca

- **Önerdiğim yol: Cloudflare Realtime SFU + mevcut Durable Object'imiz.** Herkes kendi sesini/görüntüsünü bir kez
  Cloudflare'e yollar, Cloudflare odadakilere dağıtır. Kim neyi yayınlıyor bilgisini oda sunucumuz (DO) taşır.
  TURN (zor ağlar için aracı) SFU ile birlikte **ücretsiz**. Konuşanların IP adresleri birbirine görünmez.
- **Maliyet:** Cloudflare'de SFU + TURN birlikte **ayda ilk 1.000 GB ücretsiz**, sonrası **0,05 $/GB** (sadece
  Cloudflare'den kullanıcıya giden trafik sayılır). Sadece ses için bu, ayda kabaca **15.000 "4 kişilik oda-saati"**
  eder: bugünkü ve yakın gelecekteki ölçeğimizde **0 $**. Kamera ~13 kat pahalı: aynı kota ~1.200 kameralı
  oda-saatine yeter, sonrası oda-saati başına ~4 sent.
- **Eklentide çalışır mı? Evet, ama mikrofonu katmandaki sitede değil, eklentinin kendi gizli sayfasında
  (offscreen belge) almak gerekiyor.** Denemede gördüklerim:
  - Katmandaki sitemizde mikrofon açmak için iki iframe'e de `allow="microphone; camera"` lazım; o zaman bile
    **izin film sitesinin adına** soruluyor ve **film sitesinin kendisine de** veriliyor (film sitesi sonra kendi
    betikleriyle mikrofonu açabilir!). Film sitesi `Permissions-Policy: microphone=()` başlığı yollarsa hiç olmuyor.
  - Eklentinin offscreen belgesinde ise izin **eklentinin adına**, bir kez sorulur; film sitesi ne derse desin çalışır
    ve sekme film sayfaları arasında gezerken ses kopmaz.
- **Aşamalar:** (1) sitede sadece ses → (2) eklentide ses (offscreen) + film sesini kısma → (3) küçük kamera
  baloncukları (sınırlı) → (4) bas-konuş, yönetici ayarları, bütçe freni. Kamera ancak ses oturduktan sonra.

---

## 1. Rakipler nasıl yapıyor

| Ürün | Ses/görüntü | Teknoloji (bilinen kadarıyla) | Ücret | Kaç kişi |
|---|---|---|---|---|
| **Watch2Gether** | Kamera + mikrofon, küçük kutular | Ekibin forum cevaplarına göre **eşler arası (P2P)**; sınırın nedeni "ağ yapısı" | Ücretsiz (sitede reklam var) | Aynı anda **en fazla 10** kamera/mikrofon; odada 50'den fazla kişi varsa kamera/ses tamamen kapanır |
| **Teleparty** | Sesli + görüntülü sohbet | Açıklanmamış | **Ücretli (Premium)**: kamerayı/mikrofonu sadece Premium açabilir, herkes izleyip dinleyebilir. Fiyat kaynaklara göre ~4–8 $/ay | Belirtilmemiş |
| **Rave** (mobil) | Mikrofon düğmesiyle sesli sohbet | Açıklanmamış | Ücretsiz (uygulama içi satış) | — Kullanıcı yorumu: "mikrofon açıkken film çok kısılıyor" (aşırı ducking) |
| **Kosmi** | Sesli + görüntülü + ekran paylaşımı | Sanal tarayıcı + WebRTC (şirket altyapısı) | Ücretsiz + isteğe bağlı Premium | Belirtilmemiş |
| **Hyperbeam** | Sesli + görüntülü (yankı engelleme) | Bulutta sanal tarayıcı, görüntü akışı | Geliştirici ürünü katılımcı-dakika başı ücretli | — |
| **Discord Watch Together** | Ses kanalının kendisi (+ kamera) | Discord'un kendi medya sunucuları (SFU benzeri) | Ses ücretsiz; etkinliğin kendisinde izleme süresi sınırı (grupla 180 dk, sonra 10 dk bekleme) | Ses kanalı sınırları |
| **SyncUp** | Sesli | — | Ücretsizde oda 5 kişi, **ses günde 1 saat**; sınırsız ses ücretli (3,99 $/ay) | 5 (ücretsiz) |

Çıkarımlar:
- Ücretsiz rakiplerin en yakını (Watch2Gether) **P2P ve 10 kişi sınırı** ile yapıyor; ücret alanlar sesi/görüntüyü
  ücretli katmana koyuyor (Teleparty, SyncUp). Bu, "bizde ücretsiz" cümlesini gerçekten değerli yapıyor.
- Hiçbiri sesi süresiz ve sınırsız bedava vermiyor; arkasında şirket olmayan biri için **sınır koymak normal**
  (kişi sayısı, kamera sayısı, çözünürlük).
- Rave şikâyeti önemli: film sesini kısma (ducking) **hafif ve kapatılabilir** olmalı.

## 2. Bizim için seçenekler

Önce birkaç kavram:
- **WebRTC:** tarayıcının ses/görüntüyü gerçek zamanlı gönderme yolu. Bağlantıyı kurmak için iki taraf birkaç mesaj
  (SDP "teklif/cevap", ICE adayları) değişir; buna **sinyalleşme** denir, onu biz taşırız.
- **STUN:** "dışarıdan nasıl görünüyorum?" sorusunu cevaplar, ücretsiz (`stun.cloudflare.com`).
- **TURN:** iki taraf doğrudan bağlanamazsa (okul/şirket ağı, bazı mobil operatörlerin ortak IP'si) trafiği üstünden
  geçiren aracı sunucu. Genel kabul: bağlantıların ~%10–20'si buna muhtaç. TURN'süz bir uygulama bazı
  kullanıcılarda "bağlanıyor…"da kalır.
- **Mesh (P2P):** herkes herkese ayrı akış yollar. 4 kişide herkes 3 akış yollar, 3 akış alır.
- **SFU:** herkes kendi akışını bir kez sunucuya yollar, sunucu dağıtır. Yükleme (upload) bir kez, indirme N−1.

### Hesap için birimler (kaba ama bilerek cömert)

| Akış | Bit hızı | Saatte |
|---|---|---|
| Ses (Opus, konuşurken) | ~40 kbit/s | ~18 MB |
| Ses, **DTX açık** (sessizken neredeyse hiç paket yok; izlerken kişi zamanın ~%15'inde konuşur) | ortalama ~8–10 kbit/s | ~4–5 MB |
| Küçük kamera baloncuğu (240p, 15 kare/sn) | ~150 kbit/s | ~68 MB |

4 kişilik oda, SFU'da Cloudflare'den çıkan trafik = 4 kişi × 3 akış = **12 akış**:
- Ses: 12 × ~5 MB ≈ **60 MB / oda-saati** (en kötü durumda, herkes sürekli konuşursa ~220 MB)
- Kamera: 12 × 68 MB ≈ **0,8 GB / oda-saati**

### (a) Saf WebRTC mesh, sinyalleşme DO WebSocket'imizden

- **Maliyet:** medya sunucusu yok. Sadece TURN'e düşen bağlantılar ücretli: Cloudflare Realtime TURN tek başına
  kullanılırsa **0,05 $/GB**, ama SFU ile **aynı 1.000 GB ücretsiz kotadan** düşer. Trafiğin ~%15'i TURN'den geçerse
  SFU'nun ~1/6'sı kadar tutar. **En ucuz yol bu.**
- **Kaç kişi:** ses ~6–8, görüntü ~4–5 (her kişi her akışı ayrı kodlar, yükleme hızı ve işlemci biter; Türkiye'deki
  ev bağlantılarında yükleme genelde düşük). Watch2Gether'in 10 sınırı bunu doğruluyor.
- **Gecikme:** en düşük (doğrudan bağlantı), ~50–150 ms.
- **Zorluk:** orta. Her çift için ayrı `RTCPeerConnection`, yeniden bağlanma, kim teklif yapar kuralları; SDP mesajları
  4 KB sınırımızı aşabilir (istisna gerekir). TURN kimliği için sunucuda kısa ömürlü anahtar üretmek gerekir
  (`…/turn/keys/<KEY_ID>/credentials/generate-ice-servers`, Bearer anahtar, `ttl`).
- **Gizlilik:** ➖ odadaki herkes birbirinin **IP adresini** görür (oda linki kimdeyse). Sadece TURN üzerinden
  zorlarsak (`iceTransportPolicy: 'relay'`) IP gizlenir ama o zaman bütün trafik ücretli TURN'den geçer.
- **Eklentiyle uyum:** ➖ bir eş bağlantısı hem gönderip hem alır; eklentide gönderen taraf (mikrofon) offscreen
  belgede, görüntüyü gösteren taraf katmandaki sitede olacak (bölüm 3). Mesh'te bu, kişi başı iki kat bağlantı
  ve karmaşık bir köprü demek.

### (b) Cloudflare Realtime SFU (eski adı Calls)

- **Fiyat (Ekim 2026, developers.cloudflare.com):** SFU ve TURN **ortak** ayda ilk **1.000 GB ücretsiz**, sonrası
  **0,05 $/GB**. Sadece Cloudflare'den kullanıcıya giden trafik sayılır; yayınlamak (ingress) ücretsiz. **TURN, SFU
  ile kullanılınca ayrıca ücretsiz** (çift sayılmaz). Oturum/dakika ücreti yok.
- **Kaç kişi:** pratikte sınır bizim koyduğumuz; herkes bir kez yükler. Ses için 10–20 kişi rahat, kamera için biz
  4–6 ile sınırlarız (ekran ve maliyet).
- **Gecikme:** Cloudflare her şehre yakın (İstanbul dahil, anycast); mesh'e göre +10–40 ms, fark edilmez.
- **Zorluk:** orta, mesh'ten daha düzenli. Cloudflare'in SFU'su "fikirsiz": oda kavramı yok, sadece oturum
  (`sessions/new`) ve akış (`tracks/new` ile yayınla ya da başkasının `sessionId + trackName`'ini çek,
  `renegotiate`, `tracks/close`). **Odayı zaten DO tutuyor**: kim hangi akışı yayınlıyor bilgisini üyelere yayar.
  SDP, istemci ↔ Worker ↔ Cloudflare HTTP isteğiyle gider, WebSocket'imizden geçmez (4 KB sınırı sorun olmaz).
  Uygulama anahtarı (`app secret`) Worker'da gizli kalır, istemciye gitmez.
- **Gizlilik:** ➕ katılımcılar birbirinin IP'sini görmez, sadece Cloudflare görür. Kayıt yok (biz kaydetmiyoruz).
- **Risk:** Cloudflare **harcama tavanı koymuyor** → kendi frenimiz şart (bölüm 5, aşama 4).
- **Not:** Cloudflare'in hazır arayüzlü ürünü **RealtimeKit** (eski Dyte) katılımcı-dakika başı ücretli
  (ses 0,0005 $/dk, görüntü 0,002 $/dk) ve ücretsiz kotası belgede yok → bize uygun değil; çıplak SFU yeter.

### (c) Açık kaynak SFU: LiveKit / Jitsi

- **LiveKit Cloud (hazır servis):** ücretsiz plan ayda **5.000 katılımcı-dakika, 50 GB**: 4 kişilik odada ~20 saat;
  bir sonraki plan **50 $/ay**. Bize pahalı.
- **LiveKit'i kendimiz barındırmak:** tek küçük sunucu (ör. Avrupa'da 2 çekirdek/4 GB VPS, aylık birkaç euro, bol
  trafik dahil) yüzlerce sesli kişiyi taşır. Para açısından yoğun kullanımda en ucuzu. Ama: sunucu bakımı, güvenlik
  güncellemesi, TLS, tek bölge, çökünce kimse yok; "her şey Cloudflare'de" sadeliğimiz bozulur. TURN'ü de kendimiz
  kurarız (coturn).
- **Jitsi:** hazır toplantı uygulaması; `meet.jit.si` 2023'ten beri oda açan kişiden giriş istiyor (hesapsız
  ilkemize aykırı); kendimiz barındırmak LiveKit'ten ağır (Java köprüsü, daha çok RAM). Arayüzü de bizim odaya
  uymaz. Önermiyorum.
- **Ne zaman düşünülür:** Cloudflare faturası ayda ~30–50 $'ı geçerse (bağışlar karşılamıyorsa) kaçış yolu olarak.
  Bunun için istemci kodunda "medya arka ucu" ince bir katman olsun (yayınla / çek / kapat), Cloudflare'e özel
  çağrılar tek dosyada.

### Karşılaştırma

| | Mesh + TURN | **Cloudflare SFU** | LiveKit (kendi sunucumuz) |
|---|---|---|---|
| Aylık para (bugünkü ölçek) | 0 $ | **0 $** | ~5–10 € sabit |
| Büyüyünce | en ucuz | 0,05 $/GB (1 TB'dan sonra) | sabit + sunucu büyütme |
| Kişi (ses / kamera) | ~6–8 / ~4 | 10–20 / biz sınırlarız | yüksek |
| Gecikme | en düşük | düşük | düşük (tek bölge) |
| Zorluk | orta, dağınık | **orta, düzenli** | yüksek (işletme) |
| IP gizliliği | ➖ herkes görür | **➕** | ➕ |
| Eklenti (offscreen + katman) | zor | **doğal** (yayın ve izleme ayrı oturum) | doğal |

**Önerim (b) Cloudflare SFU.** Mesh parada biraz daha ucuz ama sesin trafiği zaten küçük (DTX ile kota çok uzağız);
buna karşılık SFU IP'leri gizliyor, TURN'ü bedava içeriyor, kötü yükleme hızlı evlerde de çalışıyor ve eklentideki
"mikrofon bir yerde, görüntü başka yerde" bölünmesine birebir uyuyor. (`gelecek-fikirler.md`'deki "eşler arası +
TURN" önerisini bu yüzden değiştiriyorum.)

## 3. Eklentide (film sayfasındaki katmanda) çalışır mı?

Katman zinciri: **film sayfası** (üst çerçeve, ör. `film.com`) → `chrome-extension://…/shell.html` iframe'i →
**sitemiz** `/r/ODA?shell=1` iframe'i. Bugün iki iframe'de de `allow="autoplay; clipboard-write"` var
(`apps/extension/src/content.ts` `openShell`, `apps/extension/src/shell.ts` `openSite`).

### Deneme (Chrome 156, yerelde)

Küçük bir deneme eklentisi yazdım (repoda değil): `127.0.0.1:5401`'deki "film" sayfasına `shell.html`'i gömüyor, o da
`localhost:5402`'deki "siteyi" açıyor; sitede `getUserMedia` çağrılıyor. Chrome sahte kamera/mikrofonla
(`--use-fake-device-for-media-stream`) açıldı. İzni ya otomatik kabul ettirdim (`--use-fake-ui-for-media-stream`)
ya da CDP'nin `Browser.grantPermissions` komutuyla **tek bir kökene** verip hangisinin işe yaradığına baktım.

| # | Durum | Sonuç |
|---|---|---|
| 1 | Bugünkü gibi (`allow` sadece autoplay) | ✘ `NotAllowedError` (izin politikası engelliyor) |
| 2 | Sadece dış iframe'de `allow="microphone; camera"` | ✘ (her halkada ayrı ayrı gerekiyor) |
| 3 | **İki iframe'de de** `allow="microphone; camera"`, istem kabul | ✔ ses + görüntü |
| 4 | 3 + film sayfası `Permissions-Policy: microphone=(), camera=()` | ✘ — film sitesi yasaklarsa **hiçbir yolu yok** |
| 5 | 3 + film sayfası `microphone=(self)` | ✘ (sadece kendine izin, iframe'lere değil) |
| 6 | 3 + film sayfası `microphone=*` | ✔ |
| A | 3, izin hiç verilmemiş | istem çıkar (durum `prompt`) |
| B | İzin sadece **sitemizin** kökenine | ✘ |
| C | İzin sadece **eklentinin** kökenine | ✘ |
| D | İzin sadece **film sitesinin** kökenine | ✔ → izin film sitesinin adına sayılıyor |
| F/G | `shell.html`'in kendisinde: eklenti izni ✘, film izni ✔ | aynı kural |
| I | Eklenti sayfası ayrı sekmede + eklenti izni | ✔ |
| H | **Offscreen belge** (`chrome.offscreen`, sebep `USER_MEDIA`), izin yok | ✘ (offscreen istem gösteremez) |
| J | **Offscreen belge + eklenti izni** (bir kez verilmiş) | ✔ ses + görüntü |

Ne demek:
- Chrome'da iframe'den gelen istekte **karar hep üst sayfanın kökeni için** verilir (Chromium'un "permission
  delegation" kuralı, M64/M71'den beri). Yani katmandaki sitemiz mikrofon isterse kullanıcı
  **"film.com mikrofonunuzu kullanmak istiyor"** görür. Bu hem kafa karıştırıcı hem tehlikeli: "her ziyarette izin
  ver" denirse **film sitesinin kendi betikleri** de sonradan mikrofonu açabilir. Ayrıca her film sitesinde ayrı sorar,
  bazı siteler (başlıkla) hiç izin vermez.
- **Offscreen belge** bu sorunların hepsini çözüyor: izin bir kez, **eklentinin adına** ("ScreenWithMe") verilir;
  film sitesinin başlıkları etkilemez; film sitesi mikrofona hiç dokunamaz. Üstelik offscreen belge sekme değiştiğinde
  ya da film sayfası yeniden yüklendiğinde **yaşamaya devam eder** → oda ↔ film arasında gidip gelirken ses kopmaz.
- İzni almak için offscreen istem gösteremediğinden, ilk sefer küçük bir eklenti sayfası açılır
  (`chrome-extension://…/mic.html`, "Mikrofon iznini ver" düğmesi). Chrome izni hatırlar; sonra her şey offscreen'de.
- **Gelen sesi/görüntüyü almak izin istemez.** Katmandaki site başkalarının kamerasını göstermek için sadece SFU'dan
  akış çeker; `getUserMedia` gerekmez. Kendi kameramın küçük önizlemesi için offscreen'den düşük hızlı kare yollamak
  ya da önizlemeyi katmanda hiç göstermemek (sadece "kameran açık" rozeti) gerekir; ikincisi daha sade.
- `allow="microphone; camera"`'yı iframe'lere **eklemeyelim**: film sitesine gereksiz bir kapı açar ve gereği yok.

### Eklentide önerilen yapı

```
Ana sitede (eklenti yoksa):   site → getUserMedia → SFU'ya yayın + SFU'dan çek/çal
Eklenti varsa (sitede ve kabukta):
  offscreen belge  → getUserMedia (eklenti izni) → SFU'ya yayın; başkalarının SESİNİ çeker ve çalar
  site (katmanda)  → başkalarının KAMERASINI SFU'dan çeker, baloncuklarda gösterir; düğmeler, konuşan göstergesi
  arka plan        → aracı: site ⇄ shell.html ⇄ arka plan ⇄ offscreen (yeni mesajlar: voice-join/leave/mute, seviye)
```

Sesi offscreen'de çalmak üç şey kazandırır: oda ↔ film geçişlerinde kopmaz; yeni yüklenen sayfanın otomatik oynatma
engeline takılmaz; film sesini kısma (ducking) tek yerden yönetilir. Konuşan göstergesi için offscreen saniyede ~5
kez "kim ne kadar yüksek" bilgisini siteye yollar (`RTCRtpReceiver.getSynchronizationSources()` `audioLevel`, ücretsiz).

Mağaza: `offscreen` izni gerekiyor (kullanıcıya uyarı göstermez); "tek amaç" kuralına uyuyor (birlikte izlerken
konuşmak). Eklenti henüz gönderilmediği için izni **göndermeden önce** eklemek yeniden incelemeden kurtarır;
ama özellik hazır değilse eklemeyelim (kullanılmayan izin reddedilme sebebi).

## 4. Arayüz önerisi

- **Açık mikrofon varsayılan, sessize alma tek tık;** bas-konuş isteğe bağlı ayar. Film izlerken konuşmalar kısa ve
  ara ara: açık mikrofon doğal, bas-konuş her seferinde tuş aratır. Gürültü/yankı için tarayıcının
  `echoCancellation`, `noiseSuppression`, `autoGainControl` açık; Opus **DTX** açık (sessizken trafik ~0).
- **Katılma bilinçli:** odaya girince ses kapalı. "🎙 Sese katıl" düğmesi (sohbet panelinin üstünde ve tam ekran
  kontrollerinde). Katılınca: 🎙/🔇 (mikrofon), 📷 (kamera, ayrı ve varsayılan kapalı), "Ayrıl". Sese katılmayan
  kişi başkalarını duymaz (dinlemek de katılmak: sürpriz ses yok).
- **Kim konuşuyor:** kişiler listesinde, sohbetteki avatarlarda ve kamera baloncuğunda avatar çevresinde yeşil halka
  (seviyeye göre parlar). Kişi listesinde 🎙/🔇 küçük simge.
- **Kamera baloncukları:**
  - Oda görünümünde: sağ paneldeki sekmelerin üstünde yatay bir şerit (yuvarlak, ~64 px), video alanına taşmaz.
  - Kabukta: aynı şerit **adacık** olarak (`islands`; deliğin dışında olduğu için video kesilmez).
  - Tam ekranda: mesajlardaki "💬 Mesajlar burada" tutamağı gibi sürüklenebilir dikey yığın (yeri oran olarak
    saklanır, çift tık sıfırlar), varsayılan sağ alt; kontroller gizlenince yarı saydam olur ama kalır.
  - Ayarlar → "Kamera baloncuklarını göster" kapalıysa görüntü **SFU'dan hiç çekilmez** (para + işlemci tasarrufu).
- **Film sesini kısma (ducking):** biri konuşurken film sesi yumuşakça ~%60'a iner (iniş ~150 ms, çıkış ~800 ms),
  kendi konuşmamda kısılmaz. Ayarlar → "Konuşulurken film sesini kıs" (açık/kapalı + az/orta). Rave'deki gibi
  "film duyulmuyor" şikâyeti olmasın: hafif başlasın. Sitede oynatıcının ses düzeyi, eklentide film çerçevesine yeni
  bir `embed` isteği (`duck`) — **odaya yayılmaz**, herkesin kendi sesi.
- **Kulaklık ipucu:** sese ilk katılışta tek satır "Kulaklık takarsan film sesi karşıya gitmez". Chrome'un yankı
  engellemesi hoparlörden gelen film sesini kısmen temizler ama garantisi yok.
- **Sınırlar arayüzde açık:** "Seste 10/10 kişi" ve "Kamera 6/6" doluysa düğme soluk + balon (`flashHint`).

## 5. Önerilen aşamalar

**Hazırlık (kullanıcının adımı):** Cloudflare panelinde Realtime → SFU uygulaması oluştur; `APP_ID` ve
`APP_SECRET`'ı Worker'a gizli değişken olarak ekle (`wrangler secret put`), GitHub Secrets'a da. Faturalandırma
bildirimi kur (ör. aylık 5 $'ı geçerse e-posta).

1. **Sitede sadece ses (2–3 hafta).** YouTube/HTML5/test odalarında, en fazla 10 kişi.
   - Sunucu: Worker'da `/api/rooms/:id/rtc/...` uçları Cloudflare API'sine aracı olur; sadece odada bağlı olan
     (DO'nun bildiği) kişi kullanabilir, hız sınırlı. DO: üyeye isteğe bağlı `voice: { mic, cam, tracks }` alanı
     (sürüm artırmadan eklenebilir), `{t:'voice', …}` ile değişince `members` yayılır. Çekilecek akışın sahibi gerçekten
     bu odada mı, DO bakar.
   - İstemci: `packages/shared/src/voice.ts` (SFU ile konuşan ince katman) + site `ui/voice.ts`.
   - Test: birim (DO'nun ses alanını doğrulaması, sınırlar), e2e'de sahte kullanıcı ses bayrağı; gerçek medya için
     embed test düzeneğine sahte cihazlı ikinci Chrome.
2. **Eklentide ses + film sesini kısma (2 hafta).** `offscreen` izni, `mic.html` izin sayfası, arka planda aracılık,
   offscreen'de yayın + çalma; site eklenti varsa sesi ona devreder. Ducking (`embed` `duck`).
3. **Kamera (2–3 hafta).** Varsayılan kapalı; 240p/15 kare; odada aynı anda en fazla 6 kamera; görünmeyen baloncuk
   çekilmez; sekme arka plandayken görüntü çekilmez. Kendi önizlemem sadece sitede.
4. **İnce ayar + fren.** Bas-konuş (tuş: kabukta zaten yakalıyoruz), yönetici ayarları (`settings.voice`: kapalı /
   sadece ses / ses + kamera), yöneticinin birini sesten çıkarması (atma zaten var).
   **Bütçe freni:** DO her sesli/kameralı dakikayı sayar (kaba GB tahmini), günlük bir genel sayaç (tek bir "bütçe"
   DO'su) eşiği aşınca yeni kamera açmayı, sonra yeni ses oturumu açmayı reddeder; ayrıca Worker'da tek bir ortam
   değişkeniyle (`VOICE=off`) her şey kapanır. Cloudflare kendisi tavan koymadığı için bu şart.

Tahmini aylık maliyet (4 kişilik odalar, DTX'li ses, 240p kamera):

| Kullanım (günde) | Ses | Kamera | Ay toplam | Fatura |
|---|---|---|---|---|
| 20 oda-saat ses, 5 kameralı | ~36 GB | ~120 GB | ~160 GB | **0 $** |
| 200 oda-saat ses, 30 kameralı | ~360 GB | ~720 GB | ~1.080 GB | **~4 $** |
| 1.000 oda-saat ses, 150 kameralı | ~1.800 GB | ~3.600 GB | ~5.400 GB | **~220 $** |

Ses tek başına günde ~550 oda-saate kadar ücretsiz kotada kalır. Para kamerada; o yüzden kamera sınırlı ve fren
önce kamerayı keser.

### Gizlilik politikasına eklenecekler (`apps/web/public/gizlilik.html`)

- Mikrofon/kamera **sadece sen "Sese katıl"/"Kamera" deyince** açılır; izin tarayıcıdan (eklentide eklentinin
  adına) istenir, istediğin an tarayıcı ayarlarından geri alabilirsin.
- Ses ve görüntü **canlı** olarak Cloudflare Realtime (SFU/TURN) üzerinden odadakilere iletilir; **kaydedilmez,
  saklanmaz**, ne bizim sunucumuzda ne Cloudflare'de kalıcı tutulur. Cloudflare'in kendi gizlilik politikası geçerli.
- Diğer katılımcılar IP adresini görmez.
- Sunucu sadece "kim seste, mikrofonu/kamerası açık mı" bilgisini ve bağlantı kimliklerini oda boyunca tutar;
  kaba kullanım sayacı (dakika) kişiye bağlı değil.
- Eklenti: mikrofonu/kamerayı eklentinin gizli bir sayfası açar; film sitesi bunlara erişemez. Sesten ayrılınca kapanır.
- Odadakiler seni kaydedebilir (ekran kaydı); bunu engelleyemeyiz — tanımadığın kişilerle kamera açma uyarısı.

## Açık kalanlar / denenmesi gerekenler

- Cloudflare SFU'ya gerçek bağlantı (hesapta uygulama yokken denenmedi); offscreen belgeden SFU'ya yayın.
- İstem metni: Chrome'un eklenti kökeni için istemde eklenti adını gösterdiği varsayıldı; başsız (headless) Chrome
  istem göstermediği için ekranda görülmedi. İlk gerçek denemede bakılmalı.
- Chrome'un yankı engellemesinin aynı Chrome'daki film sesini ne kadar temizlediği (hoparlörle deneme).
- Brave/Edge'de offscreen + mikrofon.

## Kaynaklar

- Cloudflare Realtime fiyatı: https://developers.cloudflare.com/realtime/sfu/pricing
- Cloudflare TURN (SFU ile ücretsiz, portlar, sınırlar): https://developers.cloudflare.com/realtime/turn/ ·
  kimlik üretimi: https://developers.cloudflare.com/realtime/turn/generate-credentials/
- Cloudflare RealtimeKit fiyatı: https://developers.cloudflare.com/realtime/realtimekit/pricing/
- LiveKit fiyatı: https://livekit.com/pricing
- Watch2Gether sınırları: https://community.w2g.tv/t/faq-what-are-the-limitations-of-watch2gether/148839 ·
  https://community.w2g.tv/t/is-there-a-limit-on-the-number-of-people-in-a-room/347
- Teleparty Premium (sesli/görüntülü sohbet): https://www.teleparty.com/support
- Discord Watch Together SSS: https://support-apps.discord.com/hc/en-us/articles/26502500234519-Watch-Together-FAQ
- SyncUp/Hyperbeam karşılaştırması: https://blog.send.win/hyperbeam-alternatives-watch-party-tools-compared/
- Rave yorumları: https://www.commonsensemedia.org/app-reviews/rave-watch-together
- Chromium iframe izinleri: https://chromium.org/Home/chromium-security/deprecating-permissions-in-cross-origin-iframes ·
  https://blog.addpipe.com/camera-and-microphone-access-in-cross-oirigin-iframes-with-feature-policy/
