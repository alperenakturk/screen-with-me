# ScreenWithMe — Vizyon ve Yol Haritası

_Son güncelleme: Ekim 2026 · v0.4_

## Vizyon

> **Arkadaşlarınla, hangi sitede olursa olsun, aynı videoyu aynı anda izlemenin en kolay yolu.**
> Ücretsiz, hesapsız, reklamsız ve açık kaynak.

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
güvenilir, ücretsiz ve açık kaynak" bir araç yok. ScreenWithMe tam burada.

## Farkımız

1. **Senkron kalitesi.** Sunucu saatine göre hesap, beklenen-olay takibiyle
   yankı engelleme, küçük kaymada fark edilmeyen hızlanma/yavaşlama. Ölçülen fark
   gerçek oynatıcılarda (Plyr, hls.js, Video.js) 30–100 ms.
2. **Her site.** Eklenti iframe içindeki, sonradan yüklenen ve kaynağı değişen
   oynatıcıları da bulur; reklam/önizleme videolarını eler.
3. **Sıfır sürtünme.** Hesap yok; isim + avatar bir kez; tek link. Site ile
   eklenti el ele: odaya sayfa linki yapıştırılınca eklentisi olan herkes o
   sayfaya gider.
4. **Gizlilik.** Video herkesin kendi tarayıcısında oynar; sunucu sadece
   "durdur, 12:34'e git" gibi küçük mesajları taşır. Eklenti sadece odadaki
   sekmede çalışır, gezinti geçmişi toplamaz.
5. **Açık kaynak + ücretsiz altyapı.** Cloudflare Workers + Durable Objects; oda
   başına bir nesne, boştayken uyur, ücret işlemez.

## Yol haritası

### Kısa vade (v0.5 – v0.6)
- [x] **Herkes hazır bariyeri (v0.5):** videosu takılan biri olunca oda bekler;
  en fazla 12 sn, aynı kişi 30 sn içinde tekrar bekletemez, yönetici kapatabilir.
- [x] **MIT lisansı ve gizlilik politikası sayfası (v0.5).**
- [x] **v0.6–0.7:** kalıcı yasak + kaldırma, yönetici devri, emoji sayfaları, açılış
  animasyonu, 9 tema (resimli + kostümlü maskot), hız kilidi, yenileyince odada kalma,
  bağlantıyı yenile, davet önizlemesi; 4 ajanlı inceleme (teknik, eklenti, UX, pazarlama)
  sonrası güvenlik ve dayanıklılık düzeltmeleri.
- [x] **v0.8:** film sayfasında rehber kartı, filmden odaya dönüş (herkes dönmeden yeni video
  açılmaz), sürüklenebilir çubuk ve mesaj alanı (eklenti + site tam ekran), eklenti kurulunca
  uyarının kaybolması, açılış sesi, Film / Dizi / Anime parodi avatarları. v0.8.1: temalarda süsler kenarda (video izlerken görünür), odaya dönüş onayı, isim sormadan dönüş.
- [x] **v0.9:** klavye kısayolları (1–8 emoji, Enter mesaj), temalara orta süsler, GitHub Actions ile
  otomatik testler, Art Deco temalar. **v0.9.4:** önemli anları pinleme (tepki şeridinin yerine),
  özel emojiler (GIF/resim), tepkiler sol altta isim+avatar kartı ve bekleme süresi, büyük avatar
  penceresi ve canlı avatarlar, eklentide sabit rehber kartı (✕) ve boyutlandırılabilir çubuk.
  **v0.9.45:** senkron testi (sitenin çizdiği sayaç + "aynı yerdesiniz" rozeti), yönetici modları
  (sadece yönetici kontrol etsin, sırayı kilitle), sıradakiler için oylama, planlı başlangıç (geri
  sayım bandı, saat gelince oda oynar), benim odam + son odalar, izleme sonu kartı (indirilebilir görsel).
  v0.9.2: Art Deco / eski afiş tarzı temalar (Sinema Sarayı, Opera Gecesi, Açık Hava Sineması,
  Transatlantik, Gece Ekspresi) ve her birine uygun çizilmiş avatar.
- [ ] **v1.0 — Chrome Web Store'da yayın:** paket ve form metinleri hazır (`docs/web-store.md`,
  `npm run store`); gönderim bekliyor. Hazırlık listesi: `docs/web-store.md` sonundaki kontrol listesi.

### Sonraki adımlar (v1.x)
- [ ] **Tanıtım videosu:** sitede ve mağaza sayfasında 30–60 sn'lik "nasıl çalışır" videosu
  (oda kur → linki paylaş → arkadaş girer → aynı anda oynar → emoji / sohbet). Ana sayfada
  otomatik, sessiz, döngülü oynasın.
- [ ] **Elle video seçimi:** otomatik seçim yanılırsa "bu videoyu senkronla".
- [ ] **Sesli sohbet (bas-konuş):** WebRTC; küçük gruplarda eşler arası,
  büyüklerde Cloudflare Realtime (SFU). Kullanıcıların en çok istediği özellik.
- [ ] **Telefon desteği:** önce site için PWA (YouTube ve doğrudan videolar), sonra Firefox
  Android'de eklenti.
- [ ] **Firefox desteği:** arka plan için ayrı manifest.
- [ ] **Oda kaydetme:** belirli videolarda nerede kaldığımızı ve pinleri saklamak (hesapsız, oda linkine bağlı).
- [ ] **Sitenin içinde film:** eklenti, film sayfasını sitemizdeki bir çerçevede açsın (site izin veriyorsa; izin vermeyenlerde bugünkü gibi ayrı sekme).
- [ ] **Eklenti yüklü gerçek Chrome testi:** Playwright ile (birim + uçtan uca zaten CI'da).
- [ ] **Büyüme:** kısa alan adı, repo'yu açmak, lansman planı (`docs/BUYUME.md`).
- [ ] **Senkron ölçümü ve rozet:** p50/p95 fark, README'de grafik.
- [ ] **Daha fazla dil.**
### Uzun vade
- [ ] İsteğe bağlı hesap: kalıcı odalar, arkadaş listesi, oda davet geçmişi.
- [ ] Altyazı senkronu / ortak altyazı dosyası.
- [ ] Sanal tarayıcı modu (DRM'li servisler için) — maliyet nedeniyle ancak
  sponsorla.

## Başarı ölçütleri

- Senkron farkı p95 < 300 ms.
- Oda kurma → izlemeye başlama < 30 saniye.
- Eklenti kurulumu < 1 dakika (mağazaya çıkınca < 10 saniye).
- Haftalık aktif oda sayısı; tekrar gelen kullanıcı oranı.

## Riskler ve ilkeler

- **Mağaza politikası:** Chrome Web Store telifli içeriğe erişimi
  kolaylaştıran eklentileri reddeder. Araç tarafsızdır; resmî metinlerde,
  ekran görüntülerinde ve README'de belirli film/dizi sitelerinin adı geçmez.
- **İçerik barındırmıyoruz:** sunucu video taşımaz; sadece senkron mesajları.
- **DRM:** Netflix/Disney+ gibi şifreli servisler hedef değil.
- **YouTube politikası:** reklam engelleme yazılımın parçası değil;
  kullanıcı kendi tarayıcısında istediği engelleyiciyi kullanabilir.
- **Sürdürülebilirlik:** küçük kod tabanı, test, açık belgeler; bakım yükü düşük.
