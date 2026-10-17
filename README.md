# ScreenWithMe

Arkadaşlarınla aynı videoyu aynı anda izlemek için ücretsiz, hesapsız bir araç.
Birisi oynatır, durdurur, sarar ya da hızı değiştirirse odadaki herkeste aynısı olur.

> *A free, account-less watch-together tool: play, pause, seek and speed stay in sync for everyone in the room.*

**Canlı:** <https://screen-with-me.swm-server.workers.dev>

## Durum

**Aşama 1 — web sitesi** ✅ ilk sürüm
- Tek tıkla oda, davet linki, hesap yok (isim bir kez sorulur, tarayıcıda saklanır)
- YouTube ve doğrudan video linkleri (.mp4/.webm)
- Oynat / durdur / sar / hız senkronu, kayma düzeltmesi, saat farkı telafisi
- Sıra (playlist): ekle, çıkar, sırala, istediğini hemen oynat. Video bitince sıradakine geçilir.
- Emoji tepkileri: videonun üstünde uçuşur. Kendi tam ekran modumuzda da görünür.
- Basit sohbet (son 50 mesaj saklanır) ve açılıp kapanan "son hareketler" paneli
- Spam koruması (hız sınırı)
- Sekmeli sağ panel: sohbet (oda hareketleri de içinde), sıra, kişiler, ayarlar
- Oda yöneticisi (👑, ilk giren; sayfayı yenilese de yönetici kalır), kişileri odadan çıkarma (10 dk yasak)
- İsim/avatar değiştirme, 5 koyu tema (Gece, Okyanus, Gün batımı, Neon, Simsiyah), "Herkesi bana eşitle"
- Türkçe + İngilizce arayüz, telefonda da çalışır

**Aşama 2 — tarayıcı eklentisi** ✅ ilk sürüm (Chrome, Edge, Brave, Opera)
- Herhangi bir sayfadaki HTML5 videoyu bulur, iframe içindekiler dahil. Reklam ve önizleme gibi küçük ya da kısa videolar elenir.
- "Bu sayfada oda oluştur" ile oda kurulur. Davet linkine tıklayan eklentili arkadaş aynı sayfaya, aynı odaya gelir (`sayfa#swm=ODA`).
- Siteyle birlikte çalışır:
  - Sitedeki odaya bir sayfa linki yapıştırılınca eklentisi olanlar o sayfaya yönlenir.
  - YouTube'a geçilince geri siteye dönerler.
  - Sitede yazılan isim eklentiye aktarılır.
- Emojiler ve mesajlar videonun üstünde görünür. Popup'tan emoji ve hızlı mesaj gönderilebilir.
- Eklenti sadece odaya katılmış sekmede çalışır, diğer sekmelerde hiçbir şey yapmaz.
- Kurulum (şimdilik "paketlenmemiş" olarak): <https://screen-with-me.swm-server.workers.dev/eklenti.html>

## Çalıştırma

Gerekenler: Node.js 20+.

```bash
npm install
npm run dev
```

Sonra <http://localhost:5173> adresini aç. Bu komut iki şeyi birlikte başlatır:

| | Adres | Ne |
|---|---|---|
| `apps/server` | `localhost:8787` | Cloudflare Worker'ı yerelde çalıştırır (`wrangler dev`) |
| `apps/web` | `localhost:5173` | Site (Vite). `/api` isteklerini sunucuya yönlendirir |

Diğer komutlar:

```bash
npm test          # senkron motoru ve protokol testleri
npm run typecheck # tüm paketlerde tip kontrolü
npm run build     # eklenti + sitenin yayın sürümü (eklenti zip'i siteye konur)
npm run deploy    # test + derleme + Cloudflare'e yükleme
npm run build:extension:dev  # yerel sunucuya bağlanan eklenti (apps/extension/dist)
```

Eklentiyi geliştirirken: `npm run build:extension:dev`, sonra `chrome://extensions` → Geliştirici modu → **Paketlenmemiş öğe yükle** → `apps/extension/dist`. Kod değişince tekrar derleyip eklenti kartındaki ↻ butonuna basılır.

Yayında site ve sunucu tek bir Cloudflare Worker'dır: `/api/*` istekleri Worker koduna, geri kalan her şey `apps/web/dist` içindeki statik dosyalara gider. İlk yayından önce `npx wrangler login` ile bir kez giriş yapılır.

## Mimari

```
packages/shared   Ortak kod: mesaj protokolü, senkron motoru, saat eşitleme, bağlantı
apps/server       Cloudflare Workers + Durable Objects (her oda = bir Durable Object)
apps/web          Site: sade HTML/CSS/TypeScript, framework yok
apps/extension    Tarayıcı eklentisi (Manifest V3): arka plan, sayfa betiği, popup
```

**Eklenti nasıl çalışır?**
- **Arka plan (service worker):** her sekme için ayrı bir oda bağlantısı tutar.
- **Sayfa betiği:** sekmedeki her çerçevede çalışır ve kendi bulduğu en iyi videonun puanını bildirir. Puan boyuta, süreye ve oynayıp oynamadığına göre hesaplanır.
- **Etkin çerçeve:** arka plan en yüksek puanlı çerçeveyi seçer. Senkron motoru, sitedekiyle aynı kod olarak orada çalışır.
- **Saat:** saat farkı arka plandan iletilir.

**Sunucu tek doğru kaynaktır.** Odanın durumu şu birkaç alandan oluşur: hangi video, duraklatıldı mı, hangi saniyede, hangi hızda ve bu bilgi hangi anda geçerliydi (`updatedAt`). Video oynuyorsa şu anki konum `position + (şimdi − updatedAt) × hız` ile hesaplanır. Böylece sürekli "şu an 12.4. saniyedeyim" mesajı yollamaya gerek kalmaz, sadece biri bir şey yaptığında mesaj gider.

**Saat farkı.** Herkesin bilgisayar saati farklıdır. İstemci birkaç ping/pong ile sunucu saatini tahmin eder (NTP'nin basit hali) ve tüm hesapları sunucu saatine göre yapar.

**Kim yaptı: kullanıcı mı, biz mi?** Uzaktan gelen bir "durdur" komutunu uyguladığımızda oynatıcı da "durdum" olayı yollar. Bunu kullanıcı hareketi sanıp geri yollarsak sonsuz döngü olur. Motor bunu şöyle çözer:
- Oynatıcıya her komut verdiğinde hangi olayı beklediğini not eder.
- Kısa süre içinde gelen beklenen olayları yok sayar.
- Beklenmeyen her olayı kullanıcıdan gelmiş kabul eder. Böylece motor bir şey düzeltirken kullanıcının bastığı "durdur" kaybolmaz.

YouTube "sarıldı" olayı vermediği için sarmalar, zamanın beklenmedik sıçramasından anlaşılır.

**Kayma düzeltmesi.** Biri geride kalırsa (takılma, yavaş internet):
- 1 saniyeden büyük farkta doğru yere atlanır.
- Hassas hız ayarı destekleyen oynatıcılarda küçük farklar, fark edilmeyecek kadar hafif hızlanıp yavaşlayarak kapatılır.

**Neden Durable Objects?** Aynı oda ID'sine bağlanan herkes, dünyanın neresinde olursa olsun aynı nesneye düşer. Odalar birbirinden bağımsız ölçeklenir. WebSocket Hibernation sayesinde kimse bir şey yapmazken nesne uyur ve ücret işlemez.

Detaylı rakip incelemesi için: [docs/rakip-analizi.md](docs/rakip-analizi.md).

## Yol haritası

- [ ] **"Herkes hazır" bariyeri.** Biri yükleniyorsa ya da YouTube reklamı izliyorsa diğerleri bekler.
- [x] **Tarayıcı eklentisi (Manifest V3).** `all_frames` ile iframe içindeki videoları bulur. Birden fazla video varsa doğrusu seçilir.
- [ ] **Sayfa üstünde kontrol çubuğu.** Eklentide emoji ve mesaj, popup'ı açmadan da gönderilebilsin.
- [ ] **Chrome Web Store ve Firefox.** Firefox, arka plan betiği için farklı bir manifest istiyor.
- [ ] **Elle video seçimi.** Otomatik seçim yanılırsa kullanıcı doğru videoyu işaretleyebilsin.
- [ ] **Senkron ölçümü.** Birkaç istemci arasındaki farkın p50/p95 değerleri README'de grafikle gösterilir.
- [ ] **GitHub Actions ile CI.** Test, tip kontrolü ve derleme.
- [x] **Cloudflare'e yayın.** Site, aynı Worker'dan statik dosya olarak sunulur.

## Sınırlar

- DRM'li servisler (Netflix, Disney+ vb.) hedef değildir.
- Video herkesin kendi tarayıcısında oynar. Sunucu hiçbir video içeriğini barındırmaz ya da iletmez, sadece "oynat / durdur / 1:23'e git" gibi küçük mesajları taşır.
- Reklamlar için kullanıcılar kendi tarayıcılarına uBlock Origin gibi bir engelleyici kurabilir. Bu proje reklam engelleme yapmaz.
