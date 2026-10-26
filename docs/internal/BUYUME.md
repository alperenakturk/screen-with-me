# ScreenWithMe — Büyüme ve yayılma planı

_Ekim 2026 · Pazarlama, UX, teknik ve eklenti incelemelerinden derlendi._
_Kural: herkese açık hiçbir metinde belirli film/dizi/korsan site adı geçmez._

## Konumlandırma

- **TR:** "Link at, hangi sitede olursa olsun aynı videoyu aynı saniyede izleyin. Ücretsiz, hesapsız."
- **EN:** "Watch any web video together, in perfect sync. Free, no account."

| Rakip | Onların sorunu | Bizim cevabımız |
|---|---|---|
| Teleparty | Belirli servisler, çoğu özellik ücretli | Her HTML5 video (iframe dahil), tamamen ücretsiz |
| Watch2Gether | Reklamlı, belirli kaynaklar | Reklamsız; eklentiyle her siteye |
| Kosmi / Hyperbeam | Sanal tarayıcı: gecikme, düşük kalite | Video herkesin kendi tarayıcısında, tam kalite |
| Küçük eklentiler / Metastream | Bakımsız, arşivlenmiş | Ölçülmüş senkron (30–100 ms), testler, "herkes hazır" |
| Hiçbiri | — | Resimli temalar, kostümlü maskot, Türkçe arayüz |

## İlk 1.000 kullanıcı

**Hafta 0 (mağazaya göndermeden önce / inceleme sürerken)** — eklenti henüz gönderilmedi (Ekim 2026).
- [x] Davet linki önizlemesi (og:image, "Come watch with me 🍿").
- [ ] Kısa, akılda kalan bir alan adı (workers.dev güven vermiyor).
- [ ] Repoyu public yap: önerim mağaza onayından hemen sonra, lansmanla birlikte; adımlar
  `docs/internal/VIZYON.md` "Repoyu herkese açma" (site adları temizlenir, temiz geçmişli yeni repo).
- [ ] 30 sn'lik demo GIF (YouTube ya da açık lisanslı video ile).
- [ ] 15–20 arkadaşla gerçek izleme geceleri; mağaza açılınca gerçek yorum iste (sahte yorum yok).

**Hafta 1–2 (Türkiye)**
- Technopat ve DonanımHaber yazılım/eklenti bölümleri: "öğrenci projemi yaptım" başlığı + GIF.
- Ekşi Sözlük'te uzaktan birlikte izleme başlıklarına samimi bir entry.
- r/Turkey, r/CodingTR (kuralları önce oku).
- Üniversite ACM/IEEE kolları ve film kulüplerinin Discord'ları ("uzaktan gösterim" fikriyle).
- LinkedIn "build in public" serisi (3 gönderi): neden yaptım → senkronu 100 ms altına nasıl
  indirdim → mağaza onayı ve ilk rakamlar.

**Hafta 2–4 (dünya)**
- Show HN: "open-source watch-together for any HTML5 video" (repo public olunca). Teknik açı:
  Durable Objects, yankı engelleme, beklenen-olay takibi. Salı–Perşembe, TR 15:00–16:00.
- Reddit: r/SideProject, r/chrome_extensions, r/webdev (Showoff Saturday), r/LongDistance.
- dev.to yazısı: "Syncing video to 30 ms with Cloudflare Durable Objects".
- AlternativeTo'da listelenmek (kalıcı arama trafiği).
- Product Hunt: 4. hafta, ilk yorumlar ve galeri hazırken.
- Korsanlıkla ilişkili topluluklardan uzak dur (mağaza ve itibar riski).

## Ürüne gömülü büyüme döngüleri

1. **Eklentisi olmayana tek tık:** "Bu video başka bir sitede" kartı mağaza butonu göstersin,
   kurulum sonrası aynı odaya dönülsün (mağaza onayından sonra).
2. **Zengin davet önizlemesi** (yapıldı) + kısa alan adı.
3. ✅ **Paylaşılabilir özet (v0.9.49, "oturum özeti"):** süre, video, en konuşkan, en sevilen emoji…
   logolu görsel olarak indirilir; hikâyede paylaşılabilir. Sırada: tek tıkla paylaş düğmesi.
4. **Mağaza puanı isteği:** 2. başarılı oturumdan sonra bir kez, nazikçe.
5. **Mevsimlik temalar:** Cadılar Bayramı, Yılbaşı, Ramazan.

## Gizliliği bozmadan ölçüm

- Kuzey yıldızı: haftalık "en az 2 kişinin 10 dk'dan uzun izlediği oda" sayısı.
- Sunucuda sadece toplam sayaçlar (oda, 2+ kişili oda, ortalama süre, medya türü). URL, kimlik,
  cid tutulmaz. Eklenirse gizlilik politikası "üçüncü taraf analitik yok, sadece anonim toplam
  sayılar" diye güncellenir.
- Kaynak: paylaşılan linklere `?ref=hn` gibi etiket, sadece toplam sayılır.

## Pazar boşlukları → özellik fikirleri (değer × yayılma)

1. Tek tıkla katıl + kurulum sonrası odaya dönüş.
2. Bas-konuş sesli sohbet (Discord ihtiyacını azaltır).
3. Zamanlanmış izleme partisi: geri sayım ✅ (v0.9.45, planlı başlangıç); takvim linki eksik.
4. Firefox (+ Android) ve YouTube için PWA: telefon boşluğu.
5. ✅ Paylaşım kartı (oturum özeti).
6. Elle video seçimi ("bu videoyu senkronla").
7. Ortak altyazı (.srt yükle, herkese senkron) — rakiplerde yok.
8. Discord botu / Activity: `/watch` → oda linki.
9. Büyük servisler (Netflix, Prime Video, Disney+…) siteye özel destekle; plan `docs/internal/VIZYON.md`.

**Gelecek fikirleri değerlendirmesi (Ekim 2026):** Reels/Shorts birlikte izleme, YouTube araması, sesli/görüntülü
sohbet, mini oyunlar, büyük servisler ve telefon dört açıdan (mümkünlük, uyum, efor/emsal, farklılaşma/CV)
incelendi: [gelecek-fikirler.md](gelecek-fikirler.md). Özet sıra (hepsi 1.0'dan sonra): YouTube araması + dikey
Shorts → telefondan katılım (PWA + ikinci ekran) → tek büyük servis → bas-konuş ses → Instagram (istek gelirse) →
oyun yerine "Mola" düğmesi.

## Gelir: bağış

Ücretli katman yok. 1.0 ve ilk gerçek kullanıcılardan sonra bağış linki (GitHub Sponsors / Patreon vb.);
oda içinde asla istem yok. Ayrıntı ve platform notları: `docs/internal/VIZYON.md` "Bağış / destek".
