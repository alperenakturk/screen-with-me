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
- Türkçe + İngilizce arayüz, telefonda da çalışır

**Aşama 2 — tarayıcı eklentisi** (sırada): herhangi bir sitedeki (iframe içindekiler dahil) HTML5 videoyu aynı sunucu ve aynı senkron motoruyla eşitlemek.

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
npm run build     # sitenin yayın sürümü (apps/web/dist)
npm run deploy    # test + derleme + Cloudflare'e yükleme
```

Yayında site ve sunucu tek bir Cloudflare Worker'dır: `/api/*` istekleri Worker koduna, geri kalan her şey `apps/web/dist` içindeki statik dosyalara gider. İlk yayından önce `npx wrangler login` ile bir kez giriş yapılır.

## Mimari

```
packages/shared   Ortak kod: mesaj protokolü, senkron motoru, saat eşitleme, bağlantı
apps/server       Cloudflare Workers + Durable Objects (her oda = bir Durable Object)
apps/web          Site: sade HTML/CSS/TypeScript, framework yok
apps/extension    (Aşama 2)
```

**Sunucu tek doğru kaynaktır.** Odanın durumu şu birkaç alandan oluşur: hangi video, duraklatıldı mı, hangi saniyede, hangi hızda ve bu bilgi hangi anda geçerliydi (`updatedAt`). Video oynuyorsa şu anki konum `position + (şimdi − updatedAt) × hız` ile hesaplanır. Böylece sürekli "şu an 12.4. saniyedeyim" mesajı yollamaya gerek kalmaz, sadece biri bir şey yaptığında mesaj gider.

**Saat farkı.** Herkesin bilgisayar saati farklıdır. İstemci birkaç ping/pong ile sunucu saatini tahmin eder (NTP'nin basit hali) ve tüm hesapları sunucu saatine göre yapar.

**Kim yaptı: kullanıcı mı, biz mi?** Uzaktan gelen bir "durdur" komutunu uyguladığımızda oynatıcı da "durdum" olayı yollar. Bunu kullanıcı hareketi sanıp geri yollarsak sonsuz döngü olur. Motor, kendi verdiği komutlardan sonraki kısa süreyi yok sayar. Bunun dışında odanın durumuyla çelişen her olayı kullanıcıdan gelmiş kabul eder. YouTube "sarıldı" olayı vermediği için sarmalar, zamanın beklenmedik sıçramasından anlaşılır.

**Kayma düzeltmesi.** Biri geride kalırsa (takılma, yavaş internet):
- 1 saniyeden büyük farkta doğru yere atlanır.
- Hassas hız ayarı destekleyen oynatıcılarda küçük farklar, fark edilmeyecek kadar hafif hızlanıp yavaşlayarak kapatılır.

**Neden Durable Objects?** Aynı oda ID'sine bağlanan herkes, dünyanın neresinde olursa olsun aynı nesneye düşer. Odalar birbirinden bağımsız ölçeklenir. WebSocket Hibernation sayesinde kimse bir şey yapmazken nesne uyur ve ücret işlemez.

Detaylı rakip incelemesi için: [docs/rakip-analizi.md](docs/rakip-analizi.md).

## Yol haritası

- [ ] **"Herkes hazır" bariyeri.** Biri yükleniyorsa ya da YouTube reklamı izliyorsa diğerleri bekler.
- [ ] **Tarayıcı eklentisi (Manifest V3).** `all_frames` ile iframe içindeki videoları bulur. Birden fazla video varsa doğrusu seçilir.
- [ ] **Karma oda.** Eklentisi olmayan arkadaş, aynı odada site oynatıcısıyla izlemeye devam eder.
- [ ] **Senkron ölçümü.** Birkaç istemci arasındaki farkın p50/p95 değerleri README'de grafikle gösterilir.
- [ ] **GitHub Actions ile CI.** Test, tip kontrolü ve derleme.
- [x] **Cloudflare'e yayın.** Site, aynı Worker'dan statik dosya olarak sunulur.

## Sınırlar

- DRM'li servisler (Netflix, Disney+ vb.) hedef değildir.
- Video herkesin kendi tarayıcısında oynar. Sunucu hiçbir video içeriğini barındırmaz ya da iletmez, sadece "oynat / durdur / 1:23'e git" gibi küçük mesajları taşır.
- Reklamlar için kullanıcılar kendi tarayıcılarına uBlock Origin gibi bir engelleyici kurabilir. Bu proje reklam engelleme yapmaz.
