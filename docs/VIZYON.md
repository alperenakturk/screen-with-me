# ScreenWithMe — Vizyon ve Yol Haritası

_Son güncelleme: 20 Ekim 2026 · şu anki sürüm 0.9.50_

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
   oynatıcıları da bulur; reklam/önizleme videolarını eler. Film, site izin veriyorsa
   odanın içinde açılır; vermiyorsa kendi sekmesinde "oda görünümü"yle (hiçbir engel aşılmadan).
3. **Sıfır sürtünme.** Hesap yok; isim + avatar bir kez; tek link. Site ile
   eklenti el ele: odaya sayfa linki yapıştırılınca eklentisi olan herkes o
   sayfaya (ya da odanın içindeki çerçeveye) gelir.
4. **Birlikte izlemenin eğlencesi.** Pinler, özel emojiler, oturum özeti, temalar ve
   kostümlü maskot, çizilmiş avatarlar. Rakiplerde çoğu yok.
5. **Gizlilik.** Video herkesin kendi tarayıcısında oynar; sunucu sadece
   "durdur, 12:34'e git" gibi küçük mesajları taşır. Eklenti sadece odadaki
   sekmede çalışır, gezinti geçmişi toplamaz.
6. **Ücretsiz altyapı.** Cloudflare Workers + Durable Objects; oda başına bir nesne,
   boştayken uyur, ücret işlemez.

## Şu an neler var? (0.9.50)

**İzleme**
- Oynat / durdur / sar / hız herkeste aynı; kayma sessizce kapanır (>1 sn atlama, küçükse ±%5 hız).
- Herkes hazır: videosu takılan olursa oda en fazla 12 sn bekler (aynı kişi 30 sn tekrar bekletemez; yönetici kapatabilir).
- YouTube ve doğrudan video dosyası sitede; diğer her sayfa eklentiyle.
- **Film odanın içinde:** sayfa linki odanın oynatıcı alanında iframe'de, sadece video olarak açılır
  (seçenek yok, hep açık). İzin vermeyen site → ayrı sekme kartı.
- **Oda görünümü (eklenti):** film kendi sekmesindeyken sayfa odaya dönüşür (üst şerit + sağda sohbet,
  emoji, hız paneli). Gömmeyi yasaklayan sitelerde de çalışır.
- Hız 0,25x–4x (YouTube en fazla 2x), ±0,05 ince ayar; eklentide hız kilidi.
- Senkron testi (sitenin çizdiği sayaç + "aynı yerdesiniz" rozeti), "Herkesi bana eşitle".
- Dikkat dağıtmayan tam ekran (kontroller, emojiler, pin şeridi, hızlı mesaj).

**Oda**
- Sıra, oylama (en çok oy alan önce), otomatik devam (kapatılırsa "Sıradakini başlat").
- Sohbet (oda hareketleri varsayılan gizli), 3 emoji sayfası, sol altta avatarlı tepki kartları.
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
- 14 tema (4 sade, 5 resimli, 5 Art Deco), her birinde kostümlü maskot.
- Çizilmiş avatarlar (temalı + parodi film / dizi / anime) ve hayvan emojileri; büyük seçim penceresi.
- Açılış animasyonu ve üretilmiş açılış sesi; Türkçe (varsayılan) / İngilizce.
- Eklentide sürüklenen ve boyutlanan çubuk, ilk girişte rehber kartı, 🏠 ile odaya dönüş, "sen de gel?" sorusu.

**Geliştirme**
- 126 birim testi, 12 uçtan uca test dosyası; GitHub Actions'ta her push ve PR'da çalışır.
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
- **Sunucu düzeltmesi (Ekim 2026):** 4 KB'tan büyük özel emojiler (gerçek resim ve GIF'ler) sunucuda
  reddediliyordu; düzeltildi, uçtan uca testte artık gerçek boyutlu emoji deneniyor.

## Yol haritası

### v1.0 — Chrome Web Store'da yayın (henüz gönderilmedi)
Paket ve form metinleri hazır (`docs/web-store.md`, `npm run store`), ama eklenti henüz yeterince hazır
görülmediği için gönderilmiyor. Göndermeden önce:
- [ ] Gerçek sitelerde ve Brave/Edge'de arkadaşlarla deneme (popup'taki "Tanı" satırı).
- [ ] Mağaza ekran görüntülerini ve test talimatlarını son görünüme göre yenile (`store/src/shots.html`).
- [ ] Sürüm `1.0.0` → `npm run store` → gönderim (kullanıcının hesabıyla).
- [ ] Onaylanınca `eklenti.html` ve sitedeki kurulum linklerini mağaza linkine çevir.

### Sonraki adımlar (v1.x)
- [ ] **Elle video seçimi:** otomatik seçim yanılırsa "bu videoyu senkronla".
- [ ] **Kısa alan adı:** workers.dev güven vermiyor.
- [ ] **Tanıtım videosu / GIF:** sitede ve mağaza sayfasında 30–60 sn'lik "nasıl çalışır".
- [ ] **Eklentiyi kurunca aynı odaya dönüş:** "eklenti gerekli" kartından mağazaya, kurulumdan sonra odaya.
- [ ] **Sesli sohbet (bas-konuş):** WebRTC; küçük gruplarda eşler arası, büyüklerde Cloudflare Realtime (SFU).
- [ ] **Telefon:** site için PWA (YouTube ve doğrudan videolar), sonra Firefox Android'de eklenti.
- [ ] **Firefox desteği:** arka plan için ayrı manifest.
- [ ] **Eklenti yüklü gerçek Chrome testi CI'da:** Playwright ile (`scripts/harness/embed/` temel olur).
- [ ] **Senkron ölçümü ve rozet:** p50/p95 fark, README'de grafik.
- [ ] **Büyüme:** repoyu açmak, lansman planı (`docs/BUYUME.md`).
- [ ] **Daha fazla dil.**
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
- **DRM:** Netflix/Disney+ gibi şifreli servisler hedef değil.
- **YouTube politikası:** reklam engelleme yazılımın parçası değil;
  kullanıcı kendi tarayıcısında istediği engelleyiciyi kullanabilir.
- **Sürdürülebilirlik:** küçük kod tabanı, test, açık belgeler; bakım yükü düşük.
