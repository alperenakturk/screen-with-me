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
- [ ] **Herkes hazır bariyeri:** biri yükleniyorsa ya da reklam izliyorsa
  oda kısa süre bekler (rakiplerin en çok şikâyet edilen eksiği).
- [ ] **Chrome Web Store'da yayın:** gizlilik politikası sayfası, mağaza metni
  (resmî metinlerde belirli site adı geçmez), ekran görüntüleri.
- [ ] **Firefox desteği:** arka plan için ayrı manifest; Firefox Android'de de
  eklenti çalıştığı için telefonda da izlenebilir.
- [ ] **Elle video seçimi:** otomatik seçim yanılırsa "bu videoyu senkronla".
- [ ] **Son odalar:** ana sayfada son girilen odalar.
- [ ] **Yönetici modları:** "sadece yönetici kontrol etsin", sırayı kilitle.

### Orta vade (v0.7 – v1.0)
- [ ] **Sesli sohbet (bas-konuş):** WebRTC; küçük gruplarda eşler arası,
  büyüklerde Cloudflare Realtime (SFU). Kullanıcıların en çok istediği özellik.
- [ ] **Senkron ölçümü ve rozet:** p50/p95 fark, README'de grafik.
- [ ] **Otomatik testler:** GitHub Actions'ta birim + uçtan uca; Playwright ile
  eklenti yüklü gerçek Chrome testi.
- [ ] **PWA:** site telefona "uygulama" gibi eklenebilsin.
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
