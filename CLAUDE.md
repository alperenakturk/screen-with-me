# CLAUDE.md — ScreenWithMe

Arkadaşlarla herhangi bir sitedeki videoyu aynı anda izlemek için ücretsiz, hesapsız,
açık kaynak bir araç: **site** (YouTube / doğrudan video) + **tarayıcı eklentisi**
(her sitedeki HTML5 video, iframe dahil) + **Cloudflare sunucusu**.

- Canlı: https://screen-with-me.swm-server.workers.dev
- Repo: github.com/alperenakturk/screen-with-me (private)
- Vizyon ve yol haritası: `docs/VIZYON.md` · Rakip analizi: `docs/rakip-analizi.md`

## Kullanıcıyla çalışma
- **Türkçe konuş.** Kullanıcı (Alperen) okulda JS/HTML/CSS öğreniyor; açıklamaları sade tut.
- **Teknik kararları kendin ver**, kısaca nedenini söyle; beğenmediğini kendisi değiştirtir.
  Sadece hesap/para/yayınlama gibi kullanıcıya ait adımları sor.
- Aşamalı ve güvenli ilerle; her değişikliği test et, yayınla, commit at.
- Kod içi yorumlar **Türkçe**, kısa ve "neden"i anlatan.
- **Resmî/genel metinlerde** (README, mağaza sayfası, site metinleri) belirli film/dizi/
  korsan site adları **geçmez**; araç "her HTML5 video için tarafsız senkron aracı" olarak
  anlatılır (Chrome Web Store politikası). Test için korsan siteleri sen açma; aynı oynatıcı
  altyapılarının (JW Player, Plyr, Video.js, hls.js) yasal demolarını kullan.

## Yapı (npm workspaces, TypeScript strict, framework yok)
```
packages/shared   Ortak: protocol.ts (mesajlar + doğrulama), room-logic.ts (sıra/oynatma kuralları),
                  sync-engine.ts (senkron motoru), clock.ts, connection.ts (WebSocket istemcisi),
                  media.ts (link tanıma), video-element.ts (<video> sarmalayıcı + puanlama), room-id.ts,
                  logo.ts (logonun tek kaynağı: şekiller + SVG üretimi)
apps/server       Cloudflare Worker + Durable Object (src/room.ts: oda başına bir nesne,
                  WebSocket Hibernation, yönetici/atma, sohbet geçmişi, hız sınırı)
apps/web          Site (Vite, sade TS/HTML/CSS). src/room.ts oda sayfası; src/ui/* paneller
                  (chat, queue, people, settings, tabs, fullscreen, reactions, toasts); themes.ts; i18n.ts (TR/EN)
apps/extension    Manifest V3 eklenti (esbuild, build.mjs). background.ts (sekme başına oda bağlantısı),
                  content.ts (her çerçevede; video bul + motoru çalıştır), overlay.ts (oda görünümü, tam ekran
                  kontrolleri, "Filmi başlat" kartı; kapalı shadow DOM), popup.ts, site-bridge.ts (sadece bizim sitede)
scripts/e2e       Uçtan uca testler (sahte kullanıcılarla gerçek sunucu) · scripts/harness: eklenti test sayfası
```

## Komutlar
```bash
npm run dev                  # sunucu (8787) + site (5173, /api → 8787 proxy)
npm test                     # birim testleri (vitest, packages/shared)
npm run typecheck            # tüm paketler
npm run e2e [-- wss://...]   # uçtan uca (varsayılan yerel; canlı için URL ver)
npm run build                # eklenti (zip'i siteye koyar) + site
npm run deploy               # test + build + Cloudflare'e yükle (yerelden; normalde main'e push'ta Actions yapar)
npm run build:extension:dev  # yerel sunucuya bağlanan eklenti (apps/extension/dist)
npm run store                # Web Store paketi: store/ (zip + ekran görüntüleri + tanıtım görseli)
node scripts/make-icons.mjs  # logo.ts'den eklenti simgeleri (icon*.png) + apps/web/public/logo.svg
node scripts/theme-art.mjs   # resimli temaların sahne + maskot SVG'leri (apps/web/public/themes/)
node scripts/avatars.mjs     # çizilmiş avatarlar (apps/web/public/avatars + apps/extension/static/avatars)
```
Mağaza formunda ne yazılacağı: `docs/web-store.md`. Ekran görüntüleri `store/src/shots.html`'den
çekilir; eklentinin görünümü değişirse oradaki taklidi de güncelle.
Windows/PowerShell notları: commit mesajını dosyaya yazıp `git commit -F` kullan (tırnaklar
bozuluyor). Dosyaları PowerShell ile yazarken UTF-8 (BOM'suz) kullan. `gh` PATH'te değilse:
`C:\Program Files\GitHub CLI\gh.exe`.

## Mimari ilkeler (bozma!)
- **Sunucu tek doğru kaynak.** `PlaybackState { item, paused, position, rate, updatedAt }`;
  konum = `position + (sunucuSaati − updatedAt) × rate`. İstemciler `ServerClock` ile sunucu
  saatini tahmin eder (eklentide arka plan `offset` yollar → `OffsetClock`).
- **Senkron motoru (`sync-engine.ts`):**
  - Oynatıcıya her komutta `command()` çağrılır; beklenen olaylar sayılır. Pencere (1 sn)
    içinde sadece **beklenen** olaylar yutulur; beklenmeyen her olay kullanıcıdandır.
  - `enforce()` sadece gerçekten farklı olanlara komut verir (değişmeyen mesaj pencere açmaz).
  - Duraklatma: normal `<video>`'da **hemen** gönderilir; sadece `seekNoise` (YouTube) için
    300 ms beklenir ve bekleme sırasında gelen mesaj oynatmayı yeniden başlatmaz.
  - Sarma, zamanın beklenmedik sıçramasından anlaşılır (YouTube sarma olayı vermez).
  - Kayma: >1 sn ise atla (3 sn bekleme), küçükse `fineRate` oynatıcılarda ±%5 hızla kapat.
  - Oynat tekrarı en fazla 3 sn'de bir (yükleme/reklam sırasında kullanıcıyı ezmemek için).
  - Değişiklik yaparsan `sync-engine.test.ts`'e senaryo ekle (sahte saat + sahte oynatıcı).
- **Herkes hazır (`waiting.ts` + motor):** Oda oynarken videosu 1,5 sn ilerlemeyen istemci
  `{t:'ready', ready:false}` yollar; sunucu (`WaitTracker`) odayı `SYSTEM` adına durdurur ve
  `waiting` listesini yayar. Herkes hazır olunca ya da en fazla 12 sn sonra devam eder; aynı kişi
  30 sn tekrar bekletemez; elle oynat/durdur/sar beklemeyi iptal eder; yönetici kapatabilir
  (`settings.waitForAll`). Sistem hareketleri `by.id === SYSTEM_MEMBER_ID` ile gelir.
- **Protokol (`protocol.ts`):** Sunucu istemciden gelen her şeyi doğrular ve yeni nesneye
  kopyalar. Geriye uyumsuz değişiklikte `PROTOCOL_VERSION` artır (eski istemci "sayfayı yenile"
  hatası alır; eklenti kullanıcıları güncellemek zorunda kalır, dikkat). İsteğe bağlı yeni
  alanlar (avatar, cid, hostId gibi) sürüm artırmadan eklenebilir.
- **Medya türleri:** `youtube` ve `html5` sitede oynar; `page` (diğer her web adresi) eklentiyle,
  herkes kendi sekmesinde. Site ↔ eklenti devri: site `postMessage` → `site-bridge` → arka plan
  sekmeyi odaya bağlayıp sayfaya götürür; YouTube'a geçilince sekme siteye döner.
- **Eklenti kuralları:** Odada değilken hiçbir şey yapmaz (çerçeveler `storage.session`'a bakar,
  oda yoksa "idle" ile uyur). En iyi videoyu seçen arka plandır (çerçevelerin puanına göre).
  Sayfaya eklenen her UI kapalı shadow DOM'da; kullanıcı metni hep `textContent`.
- **Güvenlik:** Kullanıcı verisi asla `innerHTML` ile yazılmaz. Hız sınırları sunucuda.
  Yönetici/atma kalıcı tarayıcı kimliğiyle (`cid`, hesap değil); atılan, yönetici yasağı
  kaldırana kadar giremez (`bans` listesi sadece yöneticiye gider, `unban` ile kalkar; cid
  istemcilere hiç gönderilmez). Yönetici kontrolü kişiye göre (`isHost`): aynı kişinin site +
  eklenti sekmesi ikisi de yöneticidir.
- **Site ↔ eklenti el değiştirme:** site `{type:'join', roomId, url}` yollar; eklenti sekmeyi
  hemen o adrese götürür ve `{source:'screenwithme-extension', type:'joining'}` ile cevap verir,
  site kendi bağlantısını kapatır (aynı kişi odada iki kez görünmesin). Kimseyi habersiz
  yönlendirme: sayfa linkinde sitede açıklama + "Sayfaya git" butonu çıkar.
- **Eklentide hız kilidi:** motor `lockRate: true`; hız sadece bizim hız menüsünden (video altı / tam ekran) değişir, başka
  hız eklentilerinin değişikliği odaya yayılmaz, geri alınır (inatlaşma sınırı var). Sitede kapalı.
- **Eklenti bizim sitede çalışmaz:** içerik betiği sitenin sayfalarına hiç eklenmez (`exclude_matches`),
  sitenin kendi YouTube iframe'inde (sitenin doğrudan çocuğu + youtube alan adı) bağlanmaz; popup
  sitedeyken sadece "zaten sitedesin" notu gösterir. Tek istisna sitenin içinde açılan film çerçeveleri
  (gömülü mod, aşağıda "Film sitenin içinde").
- **Atma ve aynı tarayıcı:** aynı `cid` + farklı isim → sadece o isim yasaklanır (`cid|n:isim`);
  aynı cid + aynı isim → yöneticinin kendi sekmesi, yasaksız "kicked" ile kapatılır.
- **İsim/avatar:** site `identityAt` yazar, eklenti de; site-bridge hangisi yeniyse onu iki
  tarafa yazar. Eklenti arka planı isim değişince açık odalara `rename` yollar.
- **Yönetici devri:** yöneticinin son bağlantısı gidince `hostGoneAt` yazılır; 20 sn
  (`HOST_GRACE_MS`) içinde dönerse yönetici kalır (sayfa yenileme), dönmezse bir sonraki katılımda
  yöneticilik kalıcı olarak odadaki en eski kişiye geçer (`settleHost`), eski yönetici geri alamaz.
- **Uyku dayanıklılığı (DO):** "herkes hazır" durumu (`WaitTracker.snapshot`) ve `emptySince`
  depoya yazılır; tek alarm hem 12 sn'lik bekleme süresine hem 24 saatlik oda silmeye bakar
  (`scheduleAlarm`). Bellekte `setTimeout`'a güvenme.
- **Site:** sayfa yenilenince (aynı sekme, `sessionStorage` `in:<oda>`) isim adımı atlanır ve
  açılış animasyonu tekrar gösterilmez. Sağ üstteki ⟳ `connection.reconnect()`. Bir ping'e
  15 sn hiç cevap gelmezse `RoomConnection` yeniden bağlanır (sadece "uzun süredir sessiz"e
  bakma: Chrome arka plan sekmesinde zamanlayıcıyı dakikada bire yavaşlatır).
- **Hayalet bağlantılar:** sunucu her bağlantının son mesajını (`seen`) tutar; 150 sn sessiz
  olanı kapatıp listeden düşürür (`pruneStale`, katılımda ve en fazla 20 sn'de bir).
- **Eklenti güvenliği:** `#swm=ODA` işaretiyle sormadan katılma sadece `document.referrer` bizim
  siteyse; değilse videonun üstünde "katılmak ister misin?" sorulur. Odada bir sayfa açıkken sekme başka
  sayfaya giderse (`onRoomPage` yanlış) senkron o sayfada durur. `startSession` sekme başına
  kilitli (çift tıklama iki bağlantı açmaz); ilk video (`load`) bağlantıdan önce verilir.
  Atılma/sürüm/oda dolu → videonun üstünde 6 sn açıklama (`ended`) + popup'ta neden.
- **Avatarlar (`protocol.ts` `AVATAR_PAGES`):** 5 sayfa: temalı çizilmiş karakterler, hayvan
  emojileri, parodi film / dizi / anime. Seçicideki sekmeler `AVATAR_TABS` (Parodi'nin alt
  sekmeleri var; site `ui/avatar.ts` ve popup aynı yapıyı kullanır). Çizilmiş avatarın değeri bir
  kimliktir (`wizard`); resim `/avatars/<kimlik>.svg` (eklentide `chrome.runtime.getURL`), metin
  geçen yerlerde `avatarText()` emoji karşılığını verir. Yeni avatar: `DRAWN_AVATARS` +
  `AVATAR_PAGES` + `scripts/avatars.mjs` + site i18n `avatar.<kimlik>` (test her çizilmişin tam
  bir sayfada olduğuna bakar). Parodiler sadece tarzı andırır: dizi/karakter adı, logo, birebir
  kostüm, gerçek oyuncu benzerliği yok (mağaza ve telif).
- **Açılış sesi (`intro-sound.ts`):** dosya yok, Web Audio ile üretilir; `createIntro` çalar.
  A–F sürümleri var (çan, marimba, müzik kutusu, piyano, hışırtı+çan, sıcak pad); çalan
  `INTRO_VARIANT` (kullanıcı F'yi seçti). Hepsi animasyon anlarına (0 / 0,72 / 1,1–1,4 sn) oturur
  (site + eklenti). Tarayıcı sesi engellerse 250 ms içinde vazgeçer (geç gelen ses tuhaf olur).
  Dinlemek için `scheduleIntroSound` çevrimdışı bağlamla WAV'a basılabilir.
- **Mesaj yeri:** tam ekranda "💬 Mesajlar burada" tutamağıyla sürüklenir (oran olarak saklanır: site
  `localStorage` `toastPos`, eklenti `storage.local` `toastPos`; çift tık sıfırlar). Mesajlar tutamağın
  yanına hizalanır, alt taraftaysa yukarı büyür. Eklentinin oda görünümünde mesajlar sağdaki sohbet panelinde.
- **Filmden odaya dönüş:** eklentide oda görünümünün üst şeridindeki 🏠 (onay kartı) / popup (iki kez bas) → arka plan
  `goToRoom` (oturumu kapatıp sekmeyi `/r/ODA#back`'e götürür; site `#back` görünce isim/avatar
  sormadan girer, isim henüz eklentiden gelmediyse 800 ms bekler). Sunucu: eklentiyle (`client: 'ext'`) filmde biri varken siteden
  yeni video açılamaz / sıradakine geçilemez (`others_watching`); sıraya eklemek serbest.
- **Pinler:** `{t:'pin', note?}` → sunucu anı kendi `PlaybackState`'inden hesaplar, pinleyenin
  kalıcı anahtarını (`owner`) saklar ama istemcilere göndermez; tam liste `{t:'pins'}` ile yayılır,
  yeni gelene `welcome.pins`. Kendi pinini (yönetici hepsini) `unpin` ile kaldırır; en fazla 50; video
  değişince sıfırlanır. Site: video altında + tam ekranda ilerleme üstünde şerit (fare videodayken
  belirgin), 📌 düğmesi / P → not kutusu. Eklenti: oda görünümünde video altında şerit + araç çubuğunda 📌,
  tam ekranda ilerleme çubuğunun üstünde; 📌 / P videonun sol altında not kutusu açar. (Eski "tepki şeridi"/heat tamamen kaldırıldı.)
- **Özel emojiler (sticker):** `{t:'sticker-add', data}` (`data:image/png|gif|webp|jpeg;base64`, en fazla
  `STICKER_MAX_CHARS`; SVG yok). Genel mesaj sınırı 4 KB (`MAX_MESSAGE_BYTES`); sadece `sticker-add`
  `STICKER_MESSAGE_MAX`'a kadar büyük olabilir (eskiden gerçek resimler bu yüzden reddediliyordu; e2e
  artık ≈200 KB'lık emoji dener). Kimlik = SHA-256 ilk 12 hane (`stickerId`, iki taraf da hesaplar).
  Odada en fazla 24, dolunca en eskisi gider; depoda `sticker:<id>` + `stickers` sırası (SQLite tabanlı
  DO; büyük emoji canlıdaki e2e'de de denenir).
  Girişte welcome'dan sonra tek tek `{t:'sticker'}` (1 MB mesaj sınırı). Tepki `{t:'react', sticker}`. Arayüz: emoji çubuğunun sonunda hep görünen 🖼️ (sitede panel, eklentide şerit özel emojilere döner) — sayfaların arasına gömme.
  Dosya hazırlama `sticker-file.ts` (resim 160 px webp, GIF olduğu gibi). Kendi listem site
  `localStorage` / eklenti `storage.local` `myStickers`; her odaya girişte yeniden yüklenir.
- **Tepki gösterimi:** ekranın ortasında uçuşmaz; sol altta avatar + isim + emoji kartı (3,2 sn),
  aynı kişinin aynı tepkisi "×2" olur; her tepkiden sonra 1,1 sn bekleme. Eklentide avatar resmi
  `web_accessible_resources` ile; sayfa engellerse emoji karşılığı.
- **Klavye:** 1–8 o sayfanın emojileri/özel emojileri, Enter mesaj, P pin (sitede `reactions.ts` + `room.ts`, tam ekranda
  `fullscreen.ts`; eklentide `overlay.ts`). Eklentide tuş yakalama aşamasında alınıp siteye hiç
  gösterilmez: oynatıcılar rakamlarla sarar (3 = %30), yoksa emoji atınca herkes sarılırdı.
- **Yönetici modları (`settings.hostOnly` / `lockQueue`):** sunucu yönetici olmayanın play/pause/seek/
  rate/load/jump (hostOnly) ya da enqueue/dequeue/move (lockQueue) isteğine `not_host` döner; `next`
  herkese açık (video bitince otomatik geçiş). İstemci `not_host` alınca oynatıcıyı odanın durumuna
  döndürür (site `engine.receive(roomState)`, eklentide arka plan durumu yeniden yollar + not).
  `settings` mesajı kısmi: sadece gelen alanlar değişir.
- **Oylama:** `{t:'vote', id, up}`; oy verenlerin kalıcı anahtarları sunucuda (`voters`, istemciye
  sadece `QueueItem.votes` sayısı); sıra oya göre dizilir (eşitlerde eklenme sırası). Kendi oylarım
  site `localStorage` `myVotes`.
- **Planlı başlangıç (`settings.startsAt`, sunucu saati):** tek alarm buna da bakar; saat gelince plan
  kalkar, durmuş video `SYSTEM` adına oynar. Sitede geri sayım bandı.
- **Senkron testi (`media.kind === 'test'`):** dosya yok; `players/test.ts` canvas'a 12 sn'lik sayaç
  çizer ve `<video>` gibi davranır. Oynarken "aynı yerdesiniz (fark ~N ms)" rozeti.
- **Kaydedilen odalar (`saved-rooms.ts`):** ana sayfada "Oda oluştur" → tek seferlik / kaydedilen (ad zorunlu;
  ad `sessionStorage` `create:<oda>` ile odaya taşınır, ilk giren yönetici `settings {saved, name}` yollar).
  Liste tarayıcıda (en fazla 20); kayıtlı odaya giren herkesin listesine kendiliğinden girer (kendisi
  çıkardıysa `savedDismissed`, tekrar eklenmez). Satırda içeride kaç kişi var: `GET /api/rooms/:id/info`.
  Yöneticinin ✕'i odanın kaydını da kaldırır: `POST /api/rooms/:id/unsave {cid}` (sadece yönetici cid'i).
  "Benim odam" ve son odalar kaldırıldı.
- **Oturum özeti (`packages/shared/src/recap.ts`, site `ui/recap.ts`):** sunucu `StatsTracker` ile
  oynama süresi (oda durumu değişmeden önce `statsTick`; oda boşken saymaz), hız, video, kişi başı
  mesaj/tepki/pin/durdurma/sarma, en kalabalık anı sayar (depoda `stats`; kişiler cid ile, özete sadece
  ad/avatar). Ayarlarda "Özeti göster" → `{t:'recap'}`: özet herkese gider (açan hemen görür, diğerlerine
  "Gör" kartı), sayaç sıfırlanır; boşsa `recap_empty`. Önceki özetler `{t:'recaps'}` (kayıtlı odada 10,
  değilse 3; 90 gün). İstemci `chooseFacts` ile her seferinde rastgele 4 ilginç kart seçer (ilk süre, son
  özet + PNG). Video sonundaki istatistik kartı kaldırıldı; otomatik devam kapalıysa sadece "Sıradakini başlat".
- **Sohbette oda hareketleri:** hep yazılır ama varsayılan gizli; sohbetin sağ üstündeki "Eylemleri gör (N)"
  (`localStorage` `opt:chatEvents`). Ayarlardaki seçenek kaldırıldı.
- **Emojileri kapat (`settings.noReactions`):** yönetici açar; sunucu tepkileri düşürür (yönetici dahil),
  site `.no-reactions`, eklenti `.no-react` ile emoji çubuğu gizlenir.
- **Emoji çubuğu:** her sayfada 8 sabit yuva (eksikler boş durur, yanındaki düğmeler kaymaz); "+" yok,
  🖼️ = GIF/foto ekle; özel emoji sayfalarına ▲▼ ile gidilir. Video altı tek satır (dar ekranda alta geçer).
- **Hız:** `MAX_RATE` 4 (HTML5), YouTube en fazla 2 (`YOUTUBE_MAX_RATE`; site isteği kırpar, sunucu YouTube
  açılınca hızı 2'ye indirir).
- **Varsayılan dil Türkçe** (site + eklenti); EN seçilirse hatırlanır.
- **Avatar seçimi:** sitede odadaki ayarlarda "Avatarı değiştir" → ekran ortasında büyük pencere
  (`openAvatarDialog`); eklentide pencerenin tamamını kaplayan panel. Üstüne gelince sallanır, seçili
  olan süzülür (CSS; `prefers-reduced-motion`'da kapalı).
- **Avatar listeleri sayfasız:** sekmede çok avatar olunca ızgara kayar (‹ › yok; kullanıcı istemedi).
- **CI (`.github/workflows/test.yml`):** her push/PR'da tip kontrolü, birim, derleme, `wrangler dev`
  ile yerel sunucu + `npm run e2e`. `main`'e push'ta (ya da Actions → "Run workflow") testler geçerse
  `deploy` işi: derleme → `wrangler deploy` → canlıya karşı e2e. Anahtarlar repo Secrets'ta
  (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`); yoksa iş uyarıyla atlanır. Repo private: ayda 2000 dk ücretsiz.
- **"Filmi başlat" kartı (eklenti):** odanın sayfasındayız ama video henüz bulunmadıysa (çoğu oynatıcı
  videoyu oynat'a basınca oluşturur) arka plan üst çerçeveye `roomview.hint` yollar; üst çerçeve ortada kart +
  oynatıcının olası yerini (`focus.ts` `likelyPlayer`: video → iframe → 16:9'a yakın büyük kutu) parlayan çerçeve
  ve 👇/👆 okla gösterir. Kart oynat düğmesini kapatmaz (yer yoksa oynatıcının üst kısmında, oksuz). Video
  bulununca oda görünümü açılır, kart kalkar. Eski sağ üst rehber kartı ve küçük çubuk (⠿, boyutlandırma,
  ⤡/⤢, `barPos`/`barSize`/`roomView`/`guideOff`) tamamen kaldırıldı.
- **Sahnelerde üst boşluk ve yanlar:** sahne (1600×900) alttan hizalı ve ekranı kaplar; geniş ekranda
  üst kısım kırpılır ve üst şerit de kapatır: süsleri y≈200'ün üstüne koyma. Oda içeriği ortada en
  fazla 1280 px; kullanıcı çoğunlukla video izlerken bakar, o yüzden ana süsler (ay, kale, ejderha,
  kervan) sahnenin kenarlarında (x < 260 ya da x > 1340) dursun. Tema değişirken resimler
  önce yüklenir (applyTheme → preload), renk ve resim birlikte değişir.
- **Film sitenin içinde (`packages/shared/src/embed.ts`):** seçenek yok, hep açık ve hep "sadece video"
  (`focus.ts` her zaman); eklenti `data-swm-embed` ile desteğini bildirir (yoksa/eskiyse ayrı sekme kartı). `page` öğesi
  `.player-wrap` içinde iframe'de açılır (`apps/web/src/players/embed.ts`). Oda bağlantısını **site**
  tutar (aynı kişi iki kez görünmesin); site-bridge `swm-embed` portuyla arka plana bağlanır, arka plan
  (`Embed`, `embeds`) sitenin içindeki çerçevelerden (`embedDepth`) en iyi videoyu seçip motoru orada
  çalıştırır; çerçeveden sadece oynatma mesajları (`isRelayable`) siteye gider, site kendi bağlantısından
  yollar. Site → çerçeve: `state`, `clock`, `control` (tam ekran çubuğu/pin şeridi/hız uzaktan oynatıcı
  gibi); çerçeve → site: `status` (0,5 sn), kısayol tuşları, `fullscreen`. Önce arka plan sayfayı
  çerezsiz ister ve başlıklara bakar (`frameVerdict`: XFO, CSP frame-ancestors, https içinde http);
  yasaksa hemen ayrı sekme kartı + açıklama. Başlık **kaldırılmaz** (mağaza riski). Başlıklardan
  anlaşılmayan yasak: film sayfasındaki içerik betiği el sıkışmazsa (yüklendikten 3 sn sonra / en fazla
  20 sn) yine kart. Çerçeveye **tam ekran izni verilmez**: film sitesinin ⛶'u hata alır, içerik betiği
  `fullscreenerror` görüp siteye söyler, site `#theater`'ı tam ekran yapar (izin verilseydi çerçevenin
  tam ekranı kullanıcı tıklamasını harcar, site kendi tam ekranına geçemezdi). Çerçevede çubuk yok
  (overlay `setEmbedded`, sadece "İzlemeye başla"). Sitenin YouTube iframe'i (sitenin doğrudan çocuğu,
  youtube alan adı) hâlâ yok sayılır. "Ayrı sekmede aç" bugünkü el değiştirmeye döner. Gerçek Chrome
  testi: `scripts/harness/embed/` (README'de).
- **Oda görünümü (eklenti, film kendi sekmesindeyken):** hep açık, seçenek yok. Sitedeki odanın aynısı, renkler
  "Gece" teması (overlay CSS değişkenleri): üst şerit (logo, oda adı, senkron noktası + ms, 🏠 Odaya dön), sağda davet
  kartı + Sohbet / 👥 Kişiler sekmeleri (sohbet geçmişi: arka plan `chatLog` → etkinleşince `chat-history`), videonun
  altında pin şeridi + araç çubuğu (8 yuvalı emoji ▲▼ | 🖼️ 📌 🔄 eşitle, − hız +, ⛶). Ölçüler tek yerde: `focus.ts`
  `roomLayout` (üst 72, sol 16, sağ panel 280/320 + 32, alt 96); `applyFocus` videoyu bu boşluğa koyar, zemin
  sitenin degradesi, köşeler 12 px. Çerçeve yok, sitenin hiçbir başlığına dokunulmaz; gömmeyi yasaklayan sitelerde de
  çalışır. İç içe oynatıcıda videolu çerçeve üstüne `postMessage({type:'swm-focus-here'})` der, ara çerçeveler
  mesajın geldiği iframe'i bulup yukarı iletir: üst sayfa en büyük çerçeveyi değil videonun olduğu çerçeveyi büyütür.
  **Tam ekran:** bizim ⛶ çerçevenin `documentElement`'ini tam ekran yapar → video üstte, altta `FS_BOTTOM` (112 px)
  şeritte sitedeki gibi kontroller (ilerleme + pinler, ▶, emojiler, hızlı mesaj, 📌, hız, ✕), mesajlar sürüklenen
  tutamağın yanında. Film sitesinin kendi ⛶'unda odak kapanır, aynı kontroller videonun üstünde (fare durunca solar).
  Test: `scripts/harness/embed/film-server.mjs` `/late` (oynat'a basınca oluşan oynatıcı) ve `/deny-nested`.
- **Eklentide video olayları:** aynı `<video>`'da kaynak değişince (`emptied`) motor baştan bağlanır
  (herkes başa sarılmasın); 60 sn'den kısa video bitince "sıradaki" istenmez (reklam/önizleme).

- **Odayı kaydet (`settings.saved`):** yönetici açar; boş oda 30 gün saklanır (`emptyTtl`). Video
  değişince eskisinin yeri + pinleri `history`'e (`titleKey` → kayıt, en fazla 30) yazılır, son kişi
  çıkınca da; aynı video tekrar açılınca (>15 sn ise) oradan başlar, pinler geri gelir, `state`
  mesajında `resumed` olur. "Sıradaki" ile geçilen video baştan sayılır. Kayıt kapanınca `history`
  silinir. Her odada: oynarken 1 dk'dan uzun boş kalan oda dönüşte son kişinin çıktığı yerde durmuş
  açılır (`freezeIfLongEmpty`). Ana sayfada "Kaydedilen odaların" listesinde görünür.
- **Sıra:** `settings.autoNext` (varsayılan açık); kapalıysa video bitince sıradaki başlamaz, izleme sonu
  kartında "▶ Sıradakini başlat" çıkar (eklentide `RoomInfo.autoNext`). Sıra panelinde oylama notu.
- **Takip sorusu (eklenti):** başkası yeni sayfa/video açınca ya da odaya dönünce `ask-follow`; yeni öğe
  gelince bu sayfadaki senkron hemen durur (`pushState` → deactivate), soru yine de gider (`toActive`
  istisnası) ve sadece kart (`bare`) gösterilir; "burada kal" katmanı kaldırır.

## Yayın kontrol listesi
1. `npm run typecheck && npm test` (sunucu değiştiyse `wrangler dev` + `npm run e2e` de).
2. Eklenti değiştiyse `apps/extension/package.json` sürümünü artır (siteden indirilen zip ve
   eklenti sayfasındaki sürüm buradan gelir).
3. README / `docs/VIZYON.md` güncelle, commit (mesaj Türkçe, sonda `Co-Authored-By`), push.
4. Yayın: değişiklik `main`'e girince (PR birleşince) GitHub Actions kendisi yükler ve canlıda e2e koşar;
   Actions sekmesinde yeşil olduğuna bak. Anahtarlar yoksa ya da yerelden: `npm run deploy` →
   `npm run e2e -- wss://screen-with-me.swm-server.workers.dev`.

## Bulut oturumu (Claude Code web)
- Kullanıcı artık çoğunlukla evdeki bilgisayar yerine claude.ai/code bulut oturumundan çalışıyor:
  repo her oturumda temiz klonlanır, konteyner geçicidir → her işi commit + push et. Geliştirme
  `claude/...` dalında; `main`'e PR ile girer (CI orada koşar, birleşince otomatik yayın).
  **PR'ı açmak ve CI yeşil olunca birleştirmek Claude'un işi** (kullanıcı istedi, Ekim 2026): her iş bitince
  PR aç, testleri bekle, yeşilse birleştir, Actions'taki yayının (deploy) yeşil olduğunu kontrol edip söyle.
  Kullanıcıya düşen sadece kendi Chrome'undaki eklentiyi güncellemek.
- Bulutta `wrangler login` yok: yayın GitHub Actions'tan. Kurulum, tip kontrolü, birim testleri, derleme
  ve `wrangler dev` + e2e bulutta çalışır.
- Ortamın ağ izni kısıtlıysa `www.youtube.com` kapalı olabilir: `room.mjs`'deki başlık testi takılır
  (kod hatası değil). Kullanıcı ortam ayarlarından (Network access → Allowed domains) açabilir.
- Eklentiyi kullanıcı kendi Chrome'unda dener (siteden zip). Bulutta da gerçek Chromium + eklenti testi yapılabilir:
  `CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome` ile `scripts/harness/embed/run.mjs` (root iken
  `cdp.mjs` kendisi `--no-sandbox` ekler); internet yoksa `FILM_VIDEO=video.webm node scripts/harness/embed/film-server.mjs`
  (ffmpeg ile `testsrc2` üretilebilir; puan için 10 dk'dan uzun olsun).

## Lisans ve gizlilik
- MIT (`LICENSE`, © 2026 Alperen Aktürk). Kullanıcıya giden kodda (site/sunucu/eklenti) dış paket
  kodu yok; yeni bir çalışma zamanı bağımlılığı eklersen lisansını kontrol et (MIT/Apache/BSD iyi).
- Gizlilik politikası: `apps/web/public/gizlilik.html`. Yeni bir veri toplarsan/saklarsan güncelle.

## Bilinen sınırlar
- DRM'li servisler (Netflix vb.) hedef değil. `<video>`'nun kendisi tam ekransa eklenti katmanı
  görünmez (oynatıcı kapsayıcısı tam ekransa görünür).
- Eklenti henüz mağazada değil (paketlenmemiş kurulum, `apps/web/public/eklenti.html`).
  Geliştirici hesabı açıldı (yayıncı e-postası screenwithme.app@gmail.com, tacir değil);
  başvuru paketi ve form metinleri hazır (`docs/web-store.md`, `npm run store`). **Henüz
  gönderilmedi** (Ekim 2026: kullanıcı eklentiyi hazır görmüyor). Gönderildikten sonra, inceleme
  sürerken `PROTOCOL_VERSION` artırma.
- Repo private; herkese açık metinlerde "open source" deme (repo açılırsa önce
  `docs/rakip-analizi.md`'deki site adlarını temizle).
- Yasaklar hesapsız tasarımın sınırında: başka tarayıcı/gizli sekme ile aşılabilir.
- Büyüme planı ve özellik fikirleri: `docs/BUYUME.md`.
- Firefox desteklenmiyor (arka plan için ayrı manifest gerekiyor).
- Brave/Edge'de kullanıcı testi bekleniyor; sorun olursa popup'taki "Tanı" satırını iste.
