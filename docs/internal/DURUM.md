# Durum: kaldığımız yer (her oturum önce bunu okusun)

> Son güncelleme: 27 Ekim 2026, sürüm **0.9.59** canlıda. Kullanıcı artık çoğunlukla **bulut oturumlarından**
> (claude.ai/code) çalışacak; yerel bilgisayardaki hafıza notları buluta gitmez, gereken her şey burada ve
> `CLAUDE.md`'de. Bir işi bitirince bu dosyayı güncelle (kısa tut).

## Kullanıcıyla çalışma (özet; ayrıntı CLAUDE.md)
- Türkçe, sade dil; kullanıcı (Alperen) JS/HTML/CSS öğrenen bir öğrenci. Telefondan da takip ediyor.
- Teknik kararları kendin ver, kısaca nedenini söyle; para/hesap/yayınlama gibi adımları sor.
- Her iş: kod → test (birim, e2e, gerekiyorsa gerçek Chrome) → PR → CI yeşilse birleştir → Actions'ta yayının yeşil
  olduğunu kontrol et → kısa Türkçe özet. Eklenti değiştiyse `apps/extension/package.json` sürümünü artır.
- Büyük, ayrı işleri ayrı oturumlarda yürütmekten hoşlanıyor (araştırma, tasarım alternatifleri); sonuçları özetle.

## Son yapılanlar (0.9.56 → 0.9.59)
- Film sayfasında oda görünümü video başlamadan gelir, film sitesi hiç görünmez (örtü + "delik açıldı" el sıkışması),
  mesajlar/emojiler video üstünde saydam, tam ekranda kontroller bekleyince kaybolur, "Tam ekranda video" seçeneği,
  "👁 Sayfayı göster" kaçış düğmesi, reklamlara dayanıklılık (kısa reklam videosu odaya yansımaz vb.).
- Kimlik karışması düzeltildi (eklenti deposunda ayar başına anahtar).
- Emojiler art arda uçar, yönetici emoji sıklığını sınırlar; 👤 Profil sağ üstte açılan menü; hayvan avatarları kalktı.
- Shorts görünümü ("Oturma odası": dikey video, iki yanda arkadaşlar) — PR #17.
- **Sesli sohbet 1. aşama (0.9.59):** sitede "🎙 Sese katıl", **eşler arası** (kartsız), en fazla 6 kişi.
- GitHub sayfası İngilizce (`README.md`) + Türkçe (`README.tr.md`); iç notlar `docs/internal/`.

## Bekleyen kararlar (kullanıcının)
- **Cloudflare Realtime için kart:** Cloudflare ücretsiz kotada bile kart istiyor ve harcama tavanı yok. Kullanıcı şimdilik
  kart girmedi → ses eşler arası. Kart eklenirse Worker'a `REALTIME_APP_ID` + `REALTIME_APP_SECRET` gizli değişkenleri
  eklenir, kod kendiliğinden SFU'ya geçer (bkz. `docs/internal/ses-goruntu.md`). O zaman bütçe freni şart.
- **Oyun fikirleri:** ayrı bir sohbette fikirler sunuldu, kullanıcının seçmesi bekleniyor (`docs/internal/gelecek-fikirler.md`
  mini oyun bölümü; seçilirse `docs/internal/oyun-fikirleri.md`).
- **Kısa alan adı:** `screenwithme.app` boş (~14 $/yıl); karar ve satın alma kullanıcının.
- **Chrome Web Store'a gönderim:** henüz değil (kullanıcı eklentiyi hazır görmüyor).

## Sıradaki işler (öneri sırası)
1. **Sesli sohbet 2. aşama: eklentide ses.** Film sayfasındaki katmanda mikrofon izni film sitesinin adına sorulduğu için
   eklentinin **offscreen** belgesi + bir kerelik `mic.html` izin sayfası; konuşulurken film sesini hafif kısma (ducking).
   Plan: `docs/internal/ses-goruntu.md` bölüm 3 ve 5.
2. **Reklamların ikinci adımı:** film sekmesinden açılan reklam sekmesini kapatma + "Geri aç" (a5), yönlendirmeden "Filme
   geri dön" kartı (a6), reklamdaki kişi için odayı bekletmeme (a3). Plan: `docs/internal/reklamlar.md`.
3. **Elle video seçimi:** otomatik seçim yanılırsa "bu videoyu senkronla".
4. Bir arkadaşla gerçek deneme turu (iki bilgisayar, uzun film; sesli sohbet farklı ağlarda).
5. Claude araçları önerileri: `docs/internal/claude-araclari.md` (kullanıcı kendisi kuracak).

## Bulutta test etme
- Kurulum: `npm ci`; `npm run typecheck`, `npm test`; yerel sunucu `npx wrangler dev` (apps/server) + `npm run e2e`.
- Gerçek Chrome eklenti testi: `CHROME=/opt/pw-browsers/chromium-*/chrome-linux/chrome node scripts/harness/embed/run.mjs`
  (film sunucusu: `node scripts/harness/embed/film-server.mjs`; internet yoksa `FILM_VIDEO=video.webm`, ffmpeg testsrc2).
- Gerçek ses testi: `node scripts/harness/voice/run.mjs <site>` (iki Chrome, sahte mikrofon).
- Yayın bulutta GitHub Actions'tan (`wrangler login` yok); anahtarlar repo Secrets'ta.

## Yerelde kalan (bulutta yok, sorun değil)
- Eski bir deneme dalı: `claude/tema-secenekleri-4b2761` (orta çağ tema seçenekleri; kullanıcı istemedi, Mehtaplı'nın
  seçilen hâli zaten main'de). Silinebilir.
- Bilgisayardaki eski oturum klasörleri (`.claude/worktrees/`): hepsinin işi main'de.
