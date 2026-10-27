# Durum: kaldığımız yer (her oturum önce bunu okusun)

> Son güncelleme: 27 Ekim 2026, sürüm **0.9.65** (eklenti sürümü; site/sunucu PR birleşince canlıda). Kullanıcı
> çoğunlukla **bulut oturumlarından** (claude.ai/code) çalışıyor; yerel bilgisayardaki hafıza notları buluta gitmez,
> gereken her şey burada ve `CLAUDE.md`'de. Bir işi bitirince bu dosyayı güncelle (kısa tut).

## Kullanıcıyla çalışma (özet; ayrıntı CLAUDE.md)
- Türkçe, sade dil; kullanıcı (Alperen) JS/HTML/CSS öğrenen bir öğrenci. Telefondan da takip ediyor.
- Teknik kararları kendin ver, kısaca nedenini söyle; para/hesap/yayınlama gibi adımları sor.
- Her iş: kod → test (birim, e2e, gerekiyorsa gerçek Chrome) → PR → CI yeşilse birleştir → Actions'ta yayının yeşil
  olduğunu kontrol et → kısa Türkçe özet. Eklenti değiştiyse `apps/extension/package.json` sürümünü artır.
- Büyük, ayrı işleri ayrı oturumlarda yürütmekten hoşlanıyor (araştırma, tasarım alternatifleri); sonuçları özetle.

## Yol haritası 0.9.60 → 0.9.80 (kullanıcı 27 Ekim 2026'da verdi; sırayı Claude seçer)
Kullanıcı: "kendi inisiyatifine göre sıra sıra 0.9.80'e kadar geliştir". Sürümler 0.9.60, 0.9.61… (0.9.6 değil: Chrome
sürümü parça parça karşılaştırır). Kullanım: kredi bitene kadar; sonra her yeni kullanım döneminde en fazla %80 (yüzdeyi
Claude göremez, kullanıcı "dur" der). Ek oturum açmak serbest.
1. ✅ **0.9.60:** elle video seçimi, reklamların ikinci adımı (a5/a6/a3), eklentide sesli sohbet (offscreen + mic.html +
   film sesini kısma).
2. ✅ **Site denetimi (0.9.61):** 11 hata, telefon görünümü, ilk yükleme ~55 → ~24 KB.
3. ✅ **Görüntülü sohbet (0.9.63 sitede, 0.9.65 film sayfasında):** 📷, kamera kutuları, tam ekranda köşede; kendi ses
   seviyesi çubuğu. Film sayfasında kameralar eklentinin görünmeyen sayfasında, katmana yerel WebRTC köprüsüyle gelir;
   kamera izni `mic.html?cam=1`. PR #25'in canlı e2e'si testteki bir yarış yüzünden kırmızıydı (düzeltildi, #26).
4. ✅ **Oyun köşesi "PlayWithMe" (0.9.62):** 🎮 → `/oyun`, XOX (`/oyun/xox/<kod>`), Dört Taş (0.9.69, `/oyun/four/<kod>`).
   Çiz-Bil (0.9.72, 2–8 kişi, `/oyun/draw/<kod>`), Bilgi yarışması (0.9.74, genel kültür). Kartta "yakında": kelime avı.
5. **Yayın açma:** araştırma ✅ (`docs/internal/yayin.md`); kullanıcı kararı: sitede ekran paylaşımı + kamera yayını,
   eşler arası, tek yayın, ≤4 izleyici, 720p, kabukta sadece izleme (film yayma yok). ✅ 0.9.64 (1. aşama), ✅ 0.9.66
   (2. aşama: kalite "yazı net / akıcı", yönetici durdurur, `settings.liveHostOnly`). İleride: 1080p / SFU (kart gerekir).
   Ayrıca: kişi sınırları hep görünür ("Seste 3/6 · 📷 1/4", dolunca soluk düğme + neden) ✅ 0.9.63.
6. ✅ **Tasarım alternatifleri (önizleme, uygulanmadı):** claude.ai tasarım tuvali "ScreenWithMe tasarım alternatifleri"
   (https://claude.ai/artifact/Beiq1ueBUUHjUkRbL5LTHL): oda için A "Sinema Rayı" (sağda sade ray: "Birlikte" kartında
   kişiler + ses/kamera/ekran düğmeleri, davet üst çubukta), B "Salon" (video ortada, altında koltuk sırası, sohbet dar
   çekmece), C "Ada" (video tam ekran, üstünde cam paneller); D ana sayfa "tek adım" (link yapıştır + oda oluştur, kayıtlı
   odalar üstte); A telefonda. Kullanıcı seçince uygulanacak (sıradaki büyük iş). Ayrıca: düğme moru #8b6cff beyaz yazıyla
   ~3,8:1 (WCAG 4,5 altı); önerim düğmelerde #6a4cf2.
7. ✅ **Mehtaplı Geceler maskotu (0.9.67):** padişah ScreenWithMe (beyaz kavuk + sorguç, burma bıyık, kürk yakalı kırmızı
   kaftan, lale); eski renkli şeritli sarık "Arap gibi" duruyordu. Kullanıcı beğenmezse yeniçeri (börk + kaşıklık) seçeneği.

## Son yapılanlar (0.9.61 → 0.9.68)
- Site denetimi (0.9.61), PlayWithMe + XOX (0.9.62), görüntülü sohbet + ses seviyesi (0.9.63), kişi sınırları hep
  görünür, ekran paylaşımı/kamera yayını (0.9.64), film sayfasında kameralar (0.9.65, eklenti), yayın 2. aşama (0.9.66),
  Mehtaplı padişah maskotu (0.9.67), bas-konuş (V) + "Ali durdurdu" notu videonun üstünde (0.9.68, eklenti 0.9.68),
  PlayWithMe'de Dört Taş (0.9.69), telefona/bilgisayara uygulama olarak ekleme (PWA, 0.9.70), sağ paneli gizle (0.9.71, video büyür, mesajlar
  videonun köşesinde), Çiz-Bil (0.9.72), odadan oyun aç (0.9.73, sohbette 🎮 → "Katıl" kartı), Bilgi yarışması (0.9.74).

## Önceki: 0.9.60
- **Elle video seçimi:** kabukta "🎯 Video seç", her videoda "Bunu senkronla".
- **Reklamlar:** film sayfasının açtığı reklam sekmesi kapatılır ("Geri aç"), reklam yönlendirmesinde "Filme geri dön",
  reklamdaki kişi odayı bekletmez ("📺 reklamda").
- **Eklentide sesli sohbet:** film sayfasında da "Sese katıl" (izin bir kez eklenti adına, yenilemede kopmaz, konuşulurken
  film sesi kısılır; sitede seste olan filme geçince ses kendiliğinden devam eder).
- Test düzeneği Linux/bulutta: embed 90/90, ses (site + film sayfası) geçiyor.

## Önceki (0.9.56 → 0.9.59)
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
Yukarıdaki yol haritasına bak. Ayrıca: bir arkadaşla gerçek deneme turu (iki bilgisayar, uzun film; sesli sohbet farklı
ağlarda, eklentide ses) ve Claude araçları önerileri (`docs/internal/claude-araclari.md`, kullanıcı kuracak).

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
# Film sayfasında ses (eklenti): iki farklı sahte mikrofon sesi gerekir
ffmpeg -loglevel error -f lavfi -i "sine=frequency=330:duration=20,tremolo=f=3:d=0.7" -ac 1 -ar 48000 /tmp/a.wav
ffmpeg -loglevel error -f lavfi -i "anoisesrc=color=pink:amplitude=0.4:duration=20,tremolo=f=2:d=0.8" -ac 1 -ar 48000 /tmp/b.wav
VOICE_A=/tmp/a.wav VOICE_B=/tmp/b.wav CHROME=/opt/pw-browsers/chromium node scripts/harness/voice/shell.mjs
# Ön-reklam testi için 12 sn'lik kısa video: FILM_AD=/tmp/ad.webm film-server'a, FILM_AD=1 run.mjs'e
```
- Chromium: `/opt/pw-browsers/chromium` (sürümlü klasöre bağlantı; root olunca `cdp.mjs` `--no-sandbox` ekler).
- Ağ: varsayılan ortamda `www.youtube.com` ve `upload.wikimedia.org` kapalı (proxy 403). Bu yüzden `room.mjs` "title"
  beklerken durur (kod hatası değil) ve film videosu ffmpeg'le üretilir. Açmak için: ortam ayarları → Network access →
  Allowed domains'e `www.youtube.com` (ve isteğe bağlı `upload.wikimedia.org`). npm kayıt defteri açık.
- Ses testi STUN'a ulaşamasa da geçer (iki Chrome aynı makinede, yerel adaylarla bağlanır).
- Ekran görüntüleri `/tmp/shell-test-*.png`'ye düşer; repoya koyma.
- Dikkat: `pkill -f vite` gibi komutlar kendi kabuğunu da öldürür (komut satırı da eşleşir); süreçleri `ps` + `awk` ile bul.
- Paket `exports`'una yeni dosya eklenince (`@swm/shared/...`) Vite yeniden başlatılmalı.
- GitHub: `gh` yok/yetkisiz, GitHub MCP araçlarıyla PR açılır/birleştirilir; `git push` çalışır.
- Yayın bulutta GitHub Actions'tan (`wrangler login` yok); anahtarlar repo Secrets'ta.

## Yerelde kalan (bulutta yok, sorun değil)
- Eski bir deneme dalı: `claude/tema-secenekleri-4b2761` (orta çağ tema seçenekleri; kullanıcı istemedi, Mehtaplı'nın
  seçilen hâli zaten main'de). Silinebilir.
- Bilgisayardaki eski oturum klasörleri (`.claude/worktrees/`): hepsinin işi main'de.
