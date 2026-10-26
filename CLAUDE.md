# CLAUDE.md — ScreenWithMe

Arkadaşlarla herhangi bir sitedeki videoyu aynı anda izlemek için ücretsiz, hesapsız,
açık kaynak bir araç: **site** (YouTube / doğrudan video) + **tarayıcı eklentisi**
(her sitedeki HTML5 video, iframe dahil) + **Cloudflare sunucusu**.

- Canlı: https://screen-with-me.swm-server.workers.dev
- Repo: github.com/alperenakturk/screen-with-me (private)
- Vizyon ve yol haritası: `docs/internal/VIZYON.md` · Rakip analizi: `docs/internal/rakip-analizi.md`
- **GitHub'da görünen her şey İngilizce:** `README.md` İngilizce, Türkçesi `README.tr.md` (üstteki 🇹🇷 bağlantısı); ikisi
  hep birlikte güncellenir (birinde olan diğerinde de olur). İç notlar (yol haritası, büyüme, rakip analizi, mağaza
  formu, reklam raporu, fikirler) Türkçe ve `docs/internal/`'da; README'den bağlantı verilmez.

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
apps/extension    Manifest V3 eklenti (esbuild, build.mjs). Kendi arayüzü ve oda bağlantısı YOK: film sayfasının
                  üstüne sitenin kendisini katman (kabuk) olarak açar. background.ts (kabuklu sekmeler + mesaj
                  aracılığı), content.ts (her çerçevede: video bul, motor, katman ve deliğe yerleştirme), shell.ts/
                  shell.html (katman sayfası: içinde sitemiz?shell=1), focus.ts (videoyu deliğe oturtma), store.ts
                  (sitenin ayarları), site-bridge.ts (sadece bizim sitede), popup.ts (bilgi + tek düğme)
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
Mağaza formunda ne yazılacağı: `docs/internal/web-store.md`. Ekran görüntüleri `store/src/shots.html`'den
çekilir (betik yerel sunucudan açar); oda kısmı `store/src/room.html`, sitenin gerçek `styles.css`'i +
`room.ts` işaretlemesiyle sabit içerik. Oda sayfası ya da popup değişirse oradaki taklidi de güncelle.
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
- **Medya türleri:** `youtube`, `html5` ve `test` sitede oynar; `page` (diğer her web adresi) film sitesinin kendisinde,
  herkes kendi sekmesinde, eklentinin açtığı oda katmanıyla (aşağıda "Kabuk").
- **Eklenti kuralları:** Odada değilken hiçbir şey yapmaz (çerçeveler `storage.session` `sessions`'a bakar, kabuklu
  sekme yoksa uyur). En iyi videoyu arka plan seçer (çerçevelerin puanına göre). Eklentinin kendi arayüzü yok; sayfaya
  eklediği tek şey katman iframe'i ve otomatik oynatma engellenince "İzlemeye başla" kartı (kapalı shadow DOM).
- **Güvenlik:** Kullanıcı verisi asla `innerHTML` ile yazılmaz. Hız sınırları sunucuda.
  Yönetici/atma kalıcı tarayıcı kimliğiyle (`cid`, hesap değil); atılan, yönetici yasağı
  kaldırana kadar giremez (`bans` listesi sadece yöneticiye gider, `unban` ile kalkar; cid
  istemcilere hiç gönderilmez). Yönetici kontrolü kişiye göre (`isHost`): aynı kişinin site +
  eklenti sekmesi ikisi de yöneticidir.
- **Kabuk (oda katmanı, `packages/shared/src/shell.ts`):** odada `page` açılınca site `{source:'screenwithme-site',
  type:'go', roomId, url}` yollar → site-bridge → arka plan `site-go` (sekmeyi `shells`'e yazar, `storage.session`) →
  sekme film sayfasına gider. Kendi açtığı sayfaya kişi beklemeden gider; başkasınınkine "Filme git" kartı (kimseyi
  habersiz yönlendirmeyiz). Film sayfasında üst çerçeve `chrome-extension://…/shell.html` iframe'ini tam ekran açar
  (oda kimliği adreste/öznitelikte YOK: film sitesi katman öğesini okuyabilir; shell.html kimliği `swm-shell` portundan
  `{type:'room'}` ile alır, arka plan sekme `shells`'te değilse vermez → başka bir sayfaya gömülen shell.html hiçbir şey
  açmaz), o da sitemizi `/r/ODA?shell=1` açar (sitemiz film sayfasının CSP'sine takılmaz, film sitesi içine erişemez).
  Oda bağlantısını katmandaki **site** tutar (aynı kişi tek görünür); eklenti sadece aracı:
  site ⇄ shell.html (postMessage, köken kontrollü) ⇄ arka plan (`swm-shell` portu) ⇄ film çerçeveleri (`swm` portu).
  Site → film: `embed` istekleri (`state`, `clock`, `control`, `detach`); film → site: `reply` (`send` sadece
  `isRelayable`, `status`, `key`), `page` (sekmenin adresi), `video` (bulundu mu), `fullscreen`. Site `layout`
  bildirir: `full` (film varken hep, video başlamadan da: oda görünümü;
  `hole` = `.player-wrap`, `islands` = deliğin içindeki kartlar/kontroller) ya da `open` (sitenin oynattığı şey,
  delik yok). Üst çerçeve katmana `clip-path: path(evenodd …)` uygular (deliğe tıklayınca film oynatıcısı tıklanır),
  `focus.ts` videoyu deliğe oturtur (video henüz yoksa `likelyPlayer`: en büyük video/çerçeve ya da 16:9'a yakın kutu;
  katman açılırken `open` başlar, `bar` artık kullanılmıyor); kabukta sitenin zeminleri deliği boyamaz (`shell-film`,
  `--hole-cut`), deliğin içindeki mesajlar yarı saydam (katman iframe'i ve shell.html `color-scheme: dark`: sitemiz koyu
  şema ilan ediyor, şemalar farklı olursa Chrome çerçevenin arkasını opak griye boyar); film sayfası açılırken katman
  binene kadar `[data-swm-cover]` örtüsü (document_start, `sessions`'ta bu site varsa ya da sekmenin `sessionStorage`
  `swm-cover`'ı; tıklamayı yutar, sitenin bildirdiği ilk yerleşimde kalkar (`fromSite`; arka planın yer tutucusunda
  değil), en fazla 8 sn); tam ekranda video varsayılan olarak ekranı kaplar, kontroller bekleyince kaybolur (film
  sayfasındaki fare hareketi `activity` ile siteye gelir → `fullscreen.poke()`; kaybolunca adacıkları da kalkar);
  Ayarlar → "Tam ekranda video: kontrollerin üstünde dursun" (`opt:fsFit` = `above`, sadece kabukta görünür) seçilirse
  delik `#fs-controls`'ün üstünde biter ve kontroller hep görünür (altyazı hiç örtülmez); adacıklar hep deliğe kırpılır;
  "👁 Sayfayı göster" (kabukta üstte): katman `bar` (48 px şerit) olur, film sayfası olduğu gibi görünür (reklam/pencere
  kapatmak için), "↩ Oda görünümü" ile döner; film açılıp 10 sn video bulunamazsa düğme önerilir (`flashHint`); odak kutusu taşanı kesmez ve boyut değişince `resize` yayılır
  (altyazılar). Video iç çerçevedeyse `swm-focus-here` zinciriyle doğru çerçeve büyür. Kabukta
  site isim adımını atlar, eklenti linki/ana logo/alt bilgi gizli, üstte "🏠 Odaya dön" (`navigate` → sitedeki oda,
  katman kalkar). Odada başka bir `page` açılınca "Filme git", sitenin oynattığı bir şey açılınca katman açılır ve film
  motoru durur (`detach`, odaya "durdur" gitmez). Tam ekran: bizim ⛶ film sayfasının tamamını tam ekran yapar, oda
  `.theater.fake-fs` görünümüne geçer (`:is(:fullscreen, .fake-fs)`); film sitesinin kendi ⛶'u sadece videoyu gösterir.
  Kullanıcı film sitesinden başka bir siteye giderse (alan adının son iki parçası değişir) katman kalkar
  (`Shell.site`). Site hazır olunca `shell-ready` der (önceden gelen `page`/`video` tekrar gelir). Sayfadan çıkarken site bağlantıyı
  kapatır (`pagehide`; yoksa önbellekteki sayfa yüzünden kişi iki kez görünüyordu). Kabukta sıra sekmesi ve link
  kutusu yok (sıradakini seçmek için odaya dönülür); logo ve "🏠 Odaya dön" önce sorar (`ui/confirm.ts`). Sitenin bir
  penceresi açıkken (avatar, tema, özet, onay) delik tamamen kapanır (pencere videonun önünde). Film sitesinin tam ekranı
  odanınkine yönlenir: `fullscreen-guard.ts` sayfanın dünyasında (MAIN world) çalışır, `<html data-swm-room>` varken
  `requestFullscreen`'i yapmaz, `swm-fullscreen-request` olayı yayar; videonun yerleşik ⛶'u ile girilirse içerik betiği
  çıkıp odanınkini ister. Ana sitede "Şimdi aç" + film linki önce kısa açıklamayla sorar. Test: `scripts/harness/embed/run.mjs`.
- **Reklamlara dayanıklılık (`docs/internal/reklamlar.md`):** süresi belli ve 60 sn'den kısa video (reklam/önizleme)
  motora bağlanmaz: odaya hareket gitmez, odanın yerine sarılmaz; aynı `<video>`'da kaynak değişince süre gelene kadar
  (en fazla 3 sn) bağlanılmaz, süre uzayınca (film) bağlanır ve kişi odanın yerine atlar. Puanda kısa (×0,1), döngüde
  sessiz (×0,2), köşeye sabitlenmiş küçük (×0,3) videolar düşer; bilinen reklam ağlarının çerçevelerinde (`AD_HOSTS`,
  kısa liste, hiçbir şey engellenmez) aday yok. Oda görünümünde filmin oynatıcısı dışında sesli oynayan videolar
  susturulur (oda bitince geri açılır; sonradan film seçilirse sesi geri verilir). Kendi reklam engelleme listemiz,
  `window.open` sarmalayıcı, reklam atlatma YOK (mağaza "tek amaç", kolay atlatılır). Sırada: reklam sekmesini kapatma
  (a5), yönlendirmeden dönüş (a6), "reklamda" durumu (a3). Eklenti sayfasında uBlock Origin Lite ipucu.
- **Eklentide hız kilidi:** film çerçevesindeki motor `lockRate: true`; hız sadece bizim hız menüsünden değişir, başka
  hız eklentilerinin değişikliği odaya yayılmaz, geri alınır (inatlaşma sınırı var). Sitede kapalı.
- **Eklenti bizim sitede çalışmaz:** içerik betiği sitenin sayfalarına hiç eklenmez (`exclude_matches`), sitemizin içindeki
  çerçevelerde (`ancestorOrigins`: YouTube oynatıcısı, kabuktaki site) hiçbir şey yapmaz.
- **Atma ve aynı tarayıcı:** aynı `cid` + farklı isim → sadece o isim yasaklanır (`cid|n:isim`);
  aynı cid + aynı isim → yöneticinin kendi sekmesi, yasaksız "kicked" ile kapatılır.
- **Ortak ayarlar (`storage.ts` + eklenti `store.ts`):** sitenin her `save()`'i yazılma zamanıyla (`__at`) eklentiye de
  gider (eklentide her ayar kendi anahtarında: `site:<anahtar>`; eski tek nesne `siteStore` sadece okunur. Tek nesnede
  "oku-değiştir-yaz" art arda iki kaydı birbirine ezdiriyordu: isim kayboluyor, film sayfasında eski isimle
  görünülüyordu; yazmalar da sırayla); açılışta `syncStore()` eşitler (yeni olan kazanır), sonra `app.ts` yüklenir (dil/tema ilk karede
  doğru). Ana sitede köprü site-bridge, kabukta shell.html (kabuktaki sitenin kendi deposu ayrı/kapalı olabilir; o zaman
  bellekte). Kabuk modu sadece üst çerçeve gerçekten `chrome-extension://` ise (başka site `?shell` ile ayar okuyamasın).
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
- **Avatarlar (`protocol.ts` `AVATAR_PAGES`):** 5 sayfa: temalı çizilmiş karakterler, parodi film / dizi / anime /
  oyun (oyun: `speedster`). Hayvan emojileri 0.9.57'de kalktı (seçmiş olan rastgele temalı karaktere düşer). Seçici hep
  "Temalı" sekmesiyle açılır. Seçicideki sekmeler `AVATAR_TABS` (Parodi'nin alt
  sekmeleri var; site `ui/avatar.ts`). Çizilmiş avatarın değeri bir
  kimliktir (`wizard`); resim `/avatars/<kimlik>.svg`, metin
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
- **Filmden odaya dönüş:** katmandaki "🏠 Odaya dön" ya da popup → sekme `/r/ODA#back`'e gider (site isim sormadan girer),
  katman kalkar.
- **Pinler:** `{t:'pin', note?}` → sunucu anı kendi `PlaybackState`'inden hesaplar, pinleyenin
  kalıcı anahtarını (`owner`) saklar ama istemcilere göndermez; tam liste `{t:'pins'}` ile yayılır,
  yeni gelene `welcome.pins`. Kendi pinini (yönetici hepsini) `unpin` ile kaldırır; en fazla 50; video
  değişince sıfırlanır. Site: video altında + tam ekranda ilerleme üstünde şerit (fare videodayken
  belirgin; tam ekranda yok), 📌 düğmesi / P → not kutusu.
  Film sayfasında da aynısı (arayüz sitenin kendisi). Tam ekranda pin şeridi gösterilmez (sadece video altında).
  (Eski "tepki şeridi"/heat tamamen kaldırıldı.)
- **Özel emojiler (sticker):** `{t:'sticker-add', data}` (`data:image/png|gif|webp|jpeg;base64`, en fazla
  `STICKER_MAX_CHARS`; SVG yok). Genel mesaj sınırı 4 KB (`MAX_MESSAGE_BYTES`); sadece `sticker-add`
  `STICKER_MESSAGE_MAX`'a kadar büyük olabilir (eskiden gerçek resimler bu yüzden reddediliyordu; e2e
  artık ≈200 KB'lık emoji dener). Kimlik = SHA-256 ilk 12 hane (`stickerId`, iki taraf da hesaplar).
  Odada en fazla 24, dolunca en eskisi gider; depoda `sticker:<id>` + `stickers` sırası (SQLite tabanlı
  DO; büyük emoji canlıdaki e2e'de de denenir).
  Girişte welcome'dan sonra tek tek `{t:'sticker'}` (1 MB mesaj sınırı). Tepki `{t:'react', sticker}`. Arayüz: emoji çubuğunun sonunda hep görünen 🖼️ (sitede panel, eklentide şerit özel emojilere döner) — sayfaların arasına gömme.
  Dosya hazırlama `sticker-file.ts` (resim 160 px webp, GIF olduğu gibi). Kendi listem site
  `localStorage` `myStickers` (eklentiyle ortak); her odaya girişte yeniden yüklenir.
- **Tepki gösterimi:** videonun altından rastgele bir yerden yükselip kaybolur (3 sn; altında küçük avatar + isim);
  art arda basılan her tepki ayrı uçar ("×2" yok), varsayılan bekleme yok. Yönetici `settings.reactionGap` (0/1/3/5/10
  sn, `REACTION_GAPS`) ile kişi başı aralık koyar (sunucu `lastReaction` ile uygular, istemci düğmeleri soluklaştırır);
  sunucunun sınırı `RateLimiter(12, 5)`, kişi (`keyOf`, tarayıcı) başına; `react` ve `home` genel `commandLimit`'i
  harcamaz (emoji yağmuru oynat/durdur komutlarını kilitlemesin). İstemci: basılı tuş tekrarı yok, iki emoji arası
  en az 150 ms. Kabukta adacıklar `mergeRects` ile çakışmasız birleştirilir (kesme yolu çift-tek kuralıyla çizilir: üst üste binen
  iki adacık birbirini silip emojileri yarım/silik gösteriyordu). Kullanıcı görmek istemezse Ayarlar → "Emojiler videonun üstünde
  uçuşsun" (`opt:reactions`). Kabukta her uçuşan emojinin yolu bir adacık.
- **Tek kişiyken senkron yok:** sitede "Herkesi bana eşitle" ve senkron testi soluk, basınca "tek başınasın" balonu
  (`isAlone`, `ui/hint.ts` `flashHint`); sunucuda farklı cid sayısı 2'den azsa "herkes hazır" beklemesi olmaz.
- **Odaya dönüş haberi:** kabukta filmdeyken "🏠 Odaya dön" → `{t:'home'}` → sunucu gönderen hariç herkese
  `{t:'home', by}` (kişi başı 30 sn'de bir, `homeLimit`); filmdekilere videonun üstünde "sen de dön?" kartı (`askHome`,
  20 sn; aynı kişiden dakikada bir).
- **Klavye:** 1–8 o sayfanın emojileri/özel emojileri, Enter mesaj, P pin (sitede `reactions.ts` + `room.ts`, tam ekranda
  `fullscreen.ts`). Film sayfasında (kabuk) tuş yakalama aşamasında alınıp siteye iletilir, film sitesine hiç
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
- **Bugünün özeti (`packages/shared/src/recap.ts`, site `ui/recap.ts`, Profil sekmesinde):** sunucu `StatsTracker` ile
  oynama süresi (oda durumu değişmeden önce `statsTick`; oda boşken saymaz), hız, video, kişi başı mesaj/tepki/pin/
  durdurma/sarma, en kalabalık anı sayar (depoda `stats`; kişiler cid ile, özete sadece ad/avatar). Oturum: son hareketten
  `SESSION_GAP_MS` (4 sa) sonra gelen ilk hareket yeni oturum başlatır, kaydedilmemiş sayaçlar silinir (gece yarısını
  geçen izleme aynı oturumda). `{t:'recap'}` oturum başından şimdiye özeti sadece isteyene yollar, sayaç sıfırlanmaz;
  boşsa `recap_empty`. Son kartta "Kaydet" → `{t:'recap-save'}` (aynı oturumun önceki kaydı yenisiyle değişir; kayıtlı
  odada 20, değilse 5; 90 gün), liste `{t:'recaps'}` ile herkese. İstemci `chooseFacts` ile her seferinde rastgele (veri
  arttıkça daha çok, en fazla 8) kart seçer; ilk süre, son özet + PNG. Video sonunda istatistik kartı yok.
- **Sekmeler:** 💬 Sohbet, 🎵 Sıra, 👥, ⚙️ Ayarlar (görünüm + yönetici); 👤 Profil (ad, avatar, tema, bugünün özeti)
  sekme değil: sağ üstte en sağdaki düğme, altında açılan menü (`.profile-pop`; dışarı tıklayınca/Esc ile kapanır,
  kabukta açıkken delik kapanır). İlk açılışta
  yönetici ⚙️ Ayarlar'da (oda ayarlarını yapar), diğerleri 💬 Sohbet'te başlar (kabukta hep sohbet); aynı sekmede
  yenileyince kalınan sekme (`sessionStorage` `tab:<oda>`).
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
- **Sahnelerde üst boşluk ve yanlar:** sahne (1600×900) alttan hizalı ve ekranı kaplar; geniş ekranda
  üst kısım kırpılır ve üst şerit de kapatır: süsleri y≈200'ün üstüne koyma. Oda içeriği ortada en
  fazla 1280 px; kullanıcı çoğunlukla video izlerken bakar, o yüzden ana süsler (ay, kale, ejderha,
  kervan) sahnenin kenarlarında (x < 260 ya da x > 1340) dursun. Tema değişirken resimler
  önce yüklenir (applyTheme → preload), renk ve resim birlikte değişir.
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
## Yayın kontrol listesi
1. `npm run typecheck && npm test` (sunucu değiştiyse `wrangler dev` + `npm run e2e` de).
2. Eklenti değiştiyse `apps/extension/package.json` sürümünü artır (siteden indirilen zip ve
   eklenti sayfasındaki sürüm buradan gelir).
3. `README.md` + `README.tr.md` (ikisi birlikte) / `docs/internal/VIZYON.md` güncelle, commit (mesaj Türkçe, sonda `Co-Authored-By`), push.
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
- Gizlilik politikası: `apps/web/public/privacy.html` (TR + EN; `?lang=en|tr` ile bağlantının dilinde açılır, `lang.js`;
  eski `gizlilik.html` buraya yönlendirir). Yeni bir veri toplarsan/saklarsan güncelle.

## Bilinen sınırlar
- DRM'li servisler (Netflix, Prime Video, Disney+…) şimdilik desteklenmiyor; **hedef** (1.0'a doğru
  araştır, 1.x'te siteye özel adaptörle): herkes kendi aboneliğiyle, sitenin oynatıcısına komut veririz,
  DRM asla aşılmaz. Plan: `docs/internal/VIZYON.md` "Büyük servisler". Bir servisin adı resmî metinlerde sadece
  gerçekten çalışıyorsa "… ile çalışır" anlamında geçer. `<video>`'nun kendisi tam ekransa eklenti katmanı
  görünmez (oynatıcı kapsayıcısı tam ekransa görünür).
- 1.0 öncesi durum değerlendirmesi, gerçek deneme listesi ve çıkışta beklenen sorunlar: `docs/internal/VIZYON.md` "v1.0".
  Teleparty'den alınacak/alınmayacak fikirler de orada.
- Eklenti henüz mağazada değil (paketlenmemiş kurulum, `apps/web/public/eklenti.html`).
  Geliştirici hesabı açıldı (yayıncı e-postası screenwithme.app@gmail.com, tacir değil);
  başvuru paketi ve form metinleri hazır (`docs/internal/web-store.md`, `npm run store`). **Henüz
  gönderilmedi** (Ekim 2026: kullanıcı eklentiyi hazır görmüyor). Gönderildikten sonra, inceleme
  sürerken `PROTOCOL_VERSION` artırma.
- Repo private; herkese açık metinlerde "open source" deme. Açma planı (önerim: 1.0 mağaza onayından hemen
  sonra, site adları temizlenmiş, temiz geçmişli yeni repo): `docs/internal/VIZYON.md` "Repoyu herkese açma".
- Gelir sadece bağış, 1.0 ve ilk gerçek kullanıcılardan sonra (GitHub Sponsors / Patreon vb.; Türkiye'de
  PayPal/Stripe yok). Oda içinde / video üstünde asla bağış istemi yok. Plan: `docs/internal/VIZYON.md` "Bağış / destek".
- Yasaklar hesapsız tasarımın sınırında: başka tarayıcı/gizli sekme ile aşılabilir.
- Büyüme planı ve özellik fikirleri: `docs/internal/BUYUME.md`.
- Firefox desteklenmiyor (arka plan için ayrı manifest gerekiyor).
- Brave/Edge'de kullanıcı testi bekleniyor.
