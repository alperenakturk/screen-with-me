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
6. **Yayın açma** (ekran/kamera paylaşımı) araştırması ve önerisi: `docs/internal/yayin.md` (karar kullanıcının).

## Bulutta test etme (27 Ekim 2026'da baştan sona denendi, hepsi çalışıyor)
Sıra önemli: sunucu `apps/web/dist`'i istiyor, o yüzden önce derleme.
```bash
npm ci && npm run typecheck && npm test           # 133 birim testi
npm run build                                     # eklenti + site (apps/web/dist)
(cd apps/server && npx wrangler dev --port 8787 > /tmp/wrangler.log 2>&1 &)   # yerel sunucu
npm run e2e                                       # room.mjs dışında hepsi geçer (aşağıda)
npm run dev -w @swm/web &                         # sadece site (5173); `npm run dev` sunucuyu da açar, 8787 doluysa çakışır
npm run build:extension:dev                       # yerel sunucuya bağlanan eklenti
ffmpeg -loglevel error -f lavfi -i testsrc2=size=640x360:rate=10:duration=660 \
  -c:v libvpx-vp9 -deadline realtime -cpu-used 8 -b:v 200k /tmp/film.webm      # 11 dk video, ~25 sn
FILM_VIDEO=/tmp/film.webm node scripts/harness/embed/film-server.mjs &
CHROME=/opt/pw-browsers/chromium node scripts/harness/embed/run.mjs apps/extension/dist http://localhost:5173 ws://localhost:8787 /tmp/shell-test
CHROME=/opt/pw-browsers/chromium node scripts/harness/voice/run.mjs http://localhost:5173
```
- Chromium: `/opt/pw-browsers/chromium` (sürümlü klasöre bağlantı; root olunca `cdp.mjs` `--no-sandbox` ekler).
- Ağ: varsayılan ortamda `www.youtube.com` ve `upload.wikimedia.org` kapalı (proxy 403). Bu yüzden `room.mjs` "title"
  beklerken durur (kod hatası değil) ve film videosu ffmpeg'le üretilir. Açmak için: ortam ayarları → Network access →
  Allowed domains'e `www.youtube.com` (ve isteğe bağlı `upload.wikimedia.org`). npm kayıt defteri açık.
- Ses testi STUN'a ulaşamasa da geçer (iki Chrome aynı makinede, yerel adaylarla bağlanır).
- Ekran görüntüleri `/tmp/shell-test-*.png`'ye düşer; repoya koyma.
- GitHub: `gh` yok/yetkisiz, GitHub MCP araçlarıyla PR açılır/birleştirilir; `git push` çalışır.
- Yayın bulutta GitHub Actions'tan (`wrangler login` yok); anahtarlar repo Secrets'ta.

## Yerelde kalan (bulutta yok, sorun değil)
- Eski bir deneme dalı: `claude/tema-secenekleri-4b2761` (orta çağ tema seçenekleri; kullanıcı istemedi, Mehtaplı'nın
  seçilen hâli zaten main'de). Silinebilir.
- Bilgisayardaki eski oturum klasörleri (`.claude/worktrees/`): hepsinin işi main'de.
