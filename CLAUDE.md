# CLAUDE.md — ScreenWithMe

Arkadaşlarla herhangi bir sitedeki videoyu aynı anda izlemek için ücretsiz, hesapsız,
açık kaynak bir araç: **site** (YouTube / doğrudan video) + **tarayıcı eklentisi**
(her sitedeki HTML5 video, iframe dahil) + **Cloudflare sunucusu**.

- Canlı: https://screen-with-me.swm-server.workers.dev
- Repo: github.com/alperenakturk/screen-with-me (private)
- **Önce `docs/internal/DURUM.md`:** kaldığımız yer, bekleyen kararlar, sıradaki işler (her işten sonra güncelle).
- Vizyon ve yol haritası: `docs/internal/VIZYON.md` · Rakip analizi: `docs/internal/rakip-analizi.md`
- **GitHub'da görünen her şey İngilizce:** `README.md` İngilizce, Türkçesi `README.tr.md` (üstteki 🇹🇷 bağlantısı); ikisi
  hep birlikte güncellenir (birinde olan diğerinde de olur). İç notlar (yol haritası, büyüme, rakip analizi, mağaza
  formu, reklam raporu, fikirler) Türkçe ve `docs/internal/`'da; README'den bağlantı verilmez.

## Kullanıcıyla çalışma
- **Türkçe konuş.** Kullanıcı (Alperen) okulda JS/HTML/CSS öğreniyor; açıklamaları sade tut.
- **Her işin sonunda kısa rapor ver** (kullanıcı istedi, Ekim 2026): ne yaptım, neyi denedim, şu an neyi bekliyorum
  (CI, yayın, kullanıcının cevabı) ve sırada ne var. Arka planda bir şey beklerken de bunu açıkça yaz.
- **Teknik kararları kendin ver**, kısaca nedenini söyle; beğenmediğini kendisi değiştirtir.
  Sadece hesap/para/yayınlama gibi kullanıcıya ait adımları sor.
- Aşamalı ve güvenli ilerle; her değişikliği test et, yayınla, commit at.
- Kod içi yorumlar **Türkçe**, kısa ve "neden"i anlatan.
- **Arayüz metinlerinde terimler (0.9.82 metin turu):** oda, kayıtlı / tek seferlik oda, (oda) yöneticisi, odadan çıkar /
  yasak, **film sayfası** ("video sayfası" değil), **oda görünümü** ("katman" arayüzde geçmez), Filme git / 🏠 Odaya dön,
  emoji (gönderilen) / tepki (gönderme, "Tepki" düğmesi) / özel emoji, sıra, pin, sese katıl, yayın, senkron / eşitle,
  davet linki, **ad** ("isim" değil), **düğme** ("buton" değil); teknik terim yok ("WebSocket" → "odanın canlı
  bağlantısı", "eşler arası" → "sunucudan geçmez, doğrudan gider"). Sloganlar kullanıcının seçimi (ana sayfa "Ayrı
  ekranlar, aynı an.", davet kartı "Sana bir koltuk ayırdım 🍿"); değiştirmeden önce sor.
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
npm run dev                  # sunucu (8787) + site (5173, /api → 8787 proxy; SWM_WEB_PORT / SWM_API_PORT ile değişir)
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
- **Shorts görünümü ("Oturma odası", site `ui/seats.ts` + `room.ts` "Shorts görünümü"):** `youtube.com/shorts/…` linki
  `{kind:'youtube', id, short: true}` olur (isteğe bağlı alan; aynı video normal linkle eklenirse yatay kalır). Oynayan Shorts
  ise `.room.shorts`: sağ panel, link kutusu, araç çubuğu gizli; dikey video ortada, kişiler iki yanda (en fazla 6, fazlası
  "+N"; telefonda video altında tek sıra), mesaj yazanın avatarından 6 sn baloncuk, emoji avatarından yükselir (koltuğu yoksa
  videonun üstünde). Altta mesaj kutusu + emoji çubuğu + 🔁 Döngü + "↩ Oda görünümü" (bu sekmede hatırlanır,
  `sessionStorage` `shortsOff:<oda>`; oda görünümünde "📱 Shorts görünümü" ile dönülür). Görünüm değişimi View Transitions
  ile (video `view-transition-name: swm-player`; sayfa çizilmiyorsa 0,6 sn'de geçişsiz). ↑/↓, PageUp/Down, ▲▼ ve fare
  tekerleği (videonun dışında, 0,9 sn'de bir): ↓ = `next` (sıra boşsa gönderilmez, not çıkar), ↑ = `{t:'prev', from}`:
  sunucu son oynayanları `played`'de tutar (30, depoda), bir öncekini açar, şu anki sıranın başına girer (`hostOnly`'de
  sadece yönetici). Shorts'tan Shorts'a yeni video aşağıdan (geri dönülen yukarıdan) kayar. Döngü `settings.loop` (yönetici):
  video bitince istemci `{t:'next', end: true}` yollar, döngü açıksa ve video Shorts'sa sunucu `restart` uygular (başa
  sarar; konum 2 sn'den azsa tekrar sarmaz, aynı anda gelen "bitti"ler bir kez). Elle "Sonraki" döngüde de geçer.
  Test: `scripts/e2e/shorts.mjs`.
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
  değil), en fazla 8 sn); delik ilk açılışta odaktan iki kare sonra açılır ve üst çerçeve `{type:'hole'}` der: site
  `shell-film` (saydamlık) ancak bundan sonra açar (önce açınca sayfa gizlenene kadar bir kare film sitesi görünüyordu);
  oda görünümünde oynatıcıya benzer bir şey yoksa sayfa yine gizli kalır (`blank`); tam ekranda video varsayılan olarak ekranı kaplar, kontroller bekleyince kaybolur (film
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
  `window.open` sarmalayıcı, reklam atlatma YOK (mağaza "tek amaç", kolay atlatılır). Eklenti sayfasında uBlock Origin
  Lite ipucu. 0.9.60: **a5** oda görünümünde film sayfasına tıklandıktan ≤3 sn sonra film sekmesinden açılıp ilk 5 sn'de
  başka siteye giden sekme kapatılır (arka plan `tabs.onCreated` `openerTabId`; Ctrl+T'nin `chrome://newtab`'ı, sitedeki
  bağlantılar `open-ok`, "Geri aç" `reopen` dokunulmaz; `opt:closeAds`), sitede "kapatıldı · Geri aç" notu; **a6** tıklamadan
  ≤4 sn sonra film sekmesi başka siteye giderse katman kalkmaz (`Shell.strayed`, `page.strayed`), site "Filme geri dön" der;
  **a3** etkin çerçevede kısa video oynarken film oynamıyorsa `{t:'ready', ready:false, ad:true}`: sunucu bekletmez, üye
  `ad: true` ("📺 reklamda"), film gelince kalkar (site kapanırken de temizler). Test: film-server `/popup` `/redirect`
  `/preroll` (`FILM_AD`).
- **Elle video seçimi (0.9.60, eklenti `picker.ts`):** kabukta "🎯 Video seç" → katman şerit olur (`peek = 'pick'`), her
  çerçeve videolarının üstüne "Bunu senkronla" düğmesi çizer (kapalı shadow DOM); seçilen video çerçevede `picked`
  (puanı `PICKED_SCORE`, kısa olsa da senkronlanır), eski video durur, başka çerçevenin seçimi `unpick`. Test: `/two`.
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
- **Bağlanamayan ağlar (0.9.79):** bazı mobil hatlarda (kullanıcının telefon hotspot'u) sayfa açılıyor ama odanın WebSocket'i
  ne açılıyor ne kapanıyor ("Bağlanıyor…"da kalıyordu). `RoomConnection` 10 sn'de açılmayan bağlantıyı kapatıp yeniden dener
  (`OPEN_TIMEOUT_MS`, `onFailures`); 2 başarısız denemede odada "📶 Odaya bağlanılamıyor" uyarısı (`.net-hint`, başka ağ / DNS
  1.1.1.1 önerisi). `/baglanti` (`diag.ts`): sayfanın protokolü (h3 = UDP), düz istek, WebSocket açılışı, welcome, ping;
  "Sonucu kopyala". Kalıcı çözüm adayları: kendi alan adı (workers.dev filtrelere takılabiliyor) ya da HTTP yedek yolu.
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
- **Sesli sohbet (`packages/shared/src/voice.ts`, `voice-p2p.ts`, site `ui/voice.ts`, plan `docs/internal/ses-goruntu.md`):**
  "Birlikte" kartında "🎙 Sese katıl"; katılınca 🎙/🔇 ve "Ayrıl", kartta odadakilerin avatarları (seste olan yeşil halkalı, konuşanın çevresi parlar,
  `getSynchronizationSources`), kişiler listesinde 🎙/🔇. Katılmayan kimseyi duymaz. Üyenin `voice: {mic, track?}` alanı
  (sürüm artırmadan); `{t:'voice', on, mic}`. Taşıma yolu `welcome.voiceMode`: **p2p** (varsayılan, kart/hesap yok): her
  kişi seste olan herkesle ayrı WebRTC bağlantısı (kimliği küçük olan teklif yapar), sunucu `{t:'signal'}` mesajlarını
  sadece iki taraf da seste ise aktarır (IP sadece seste olanlara görünür), en fazla `VOICE_MAX_P2P` (6), STUN Cloudflare +
  Google; **sfu**: Worker'da `REALTIME_APP_ID`/`REALTIME_APP_SECRET` varsa Cloudflare Realtime (`apps/server/src/realtime.ts`,
  `{t:'rtc'}` istekleri, oturum sunucuda, `VOICE_MAX` 10). Cloudflare kart istediği ve harcama tavanı olmadığı için şimdilik
  p2p (kullanıcı kararı, Ekim 2026). `VOICE=off` her şeyi kapatır. **Kabukta (0.9.60)** ses eklentinin offscreen belgesinde
  (`offscreen.ts`, izin `offscreen`): site `ExtVoice` (`ui/voice-ext.ts`) ile `{type:'voice', msg}` aracılık eder (sinyal/rtc/
  "seste" bildirimini kendi bağlantısından yollar), offscreen `P2pVoice`/`VoiceClient`'ı çalıştırır, sesleri çalar, seviyeleri
  (`LevelMeter`, `levels` + `me`) yollar. İzin yoksa arka plan `mic.html` sekmesini açar (offscreen soramaz); film sayfası
  yenilenince yeni site `hello` → `reset` (mikrofon kalır). `pagehide`'da ExtVoice ayrılmaz; sekme kapanınca/odaya dönünce
  arka plan `end`. Seste olduğum `voice:<oda>` ile hatırlanır: siteden filme (ya da tersi) geçince izin varsa sessizce yeniden
  katılır. Biri konuşurken film sesi kısılır (`opt:duck`, embed `duck`, ×0,35; kişi sesi değiştirdiyse dokunulmaz). Eski
  eklenti `caps` yollamaz → kabukta kart gizli. Testler: `scripts/e2e/voice.mjs`, gerçek ses `scripts/harness/voice/run.mjs`
  (iki Chrome, sahte mikrofon, gelen sesin enerjisi ölçülür) ve `voice/shell.mjs` (film sayfasında; `VOICE_A`/`VOICE_B` iki
  farklı wav: aynı sahte bip'i yankı engelleyici siler).
- **PlayWithMe (oda içi oyunlar; 0.9.75'ten beri ayrı oyun sayfası/odası YOK, kullanıcı kararı):** video altındaki
  araç çubuğunda 🎮 (`#game-btn`) → menü (XOX, Dört Taş, Çiz-Bil, Bilgi yarışması) → `{t:'game', kind}`. Oda aynı anda tek
  oyun tutar (`RoomGame {kind, id, by, at}`, depoda `game` + açanın kalıcı anahtarı; `welcome.game`, değişince
  `{t:'game', game, by?}`); açık oyunu sadece açan ya da yönetici değiştirir/bitirir (`{t:'game', end:true}`), başkası
  `game_busy`. Oyunun kimliği odanın verdiği yeni `newId()`; oyunun kendisi aşağıdaki nesnelerde yürür. Site
  `games/stage.ts`: oyun videonun yerinde "oyun sahnesi" (`#game-stage`, `.player-wrap`'in çocuğu: kabukta kendiliğinden
  adacık; ≤860 px'te gövdeye taşınıp tam ekran `.full`); açana hemen açılır, diğerlerine "Ali bir XOX açtı · Katıl / Sonra"
  kartı (`#game-invite`), "▶ Videoya dön" küçültür (bağlantı açık kalır, 🎮'da yanıp sönen nokta), sohbete gri satır.
  Oyun sayfaları gömülebilir parçalar: `mountMatch` / `mountDraw` / `mountQuiz` (dönen işlev bağlantıyı ve zamanlayıcıları
  kapatır; ad/avatar/cid odanınki). Shorts'ta oyun açıkken ok/tekerlek video değiştirmez. Herkes çıkıp 1 dk'dan uzun boş
  kalan odada oyun kapanır (`freezeIfLongEmpty`). Eski `/oyun…` adresleri ana sayfaya düşer. Test: `scripts/e2e/roomgame.mjs`.
  Oyun motorları: tür `xox` | `four` (`games/match.ts`). İki kişilik tahta oyunları ortak biçimde (`games/board.ts` `BoardState`, kurallar `GAME_RULES`:
  `xox.ts`, `four.ts`: 7×6, sütuna taş düşer, 4 dizen kazanır; `move.cell` Dört Taş'ta sütun). Odanın türünü ilk gelen
  belirler; başka türün koduna girilmez (`kind`). Sürüm 2: durum `{t:'state', kind, game}` (eski kayıt `xox` alanı okunur). Sunucuda ayrı Durable Object `Game`
  (`apps/server/src/game.ts`, bağ `GAMES`, göç `v2`), `/api/games/:id/ws`, kendi protokolü (`packages/shared/src/games/`:
  `protocol.ts` doğrulama + `GAME_PROTOCOL_VERSION`, `xox.ts` kurallar). İlk iki kişi X/O koltuğunda (koltuk kalıcı
  `cid`'e bağlı: yenileyen yerinde kalır), gelenler izler; sahibi bağlı değilse izleyici `sit` ile oturur; hamleleri sunucu
  doğrular, kazanınca skor, `rematch` ile başlayan değişir. Sohbet yok, sadece sabit emojiler (`GAME_EMOJIS`). Boş oyun 24
  sa sonra silinir. Yeni tahta oyunu: `GAME_KINDS` + `GAME_RULES` + kurallar dosyası + `match.ts`'te tahta çizimi + `ROOM_GAME_KINDS`
  (`protocol.ts`) + `stage.ts` (simge, hangi parça açılır) + i18n `games.<tür>.title/text`.
  Test: `scripts/e2e/xox.mjs` (XOX + Dört Taş).
  **Çiz-Bil (0.9.72):** ayrı nesne `Draw` (`apps/server/src/draw.ts`, bağ `DRAWS`, göç `v3`, `/api/draw/:id/ws`), protokol ve
  saf kurallar `packages/shared/src/games/draw.ts` (tahmin eşleştirme: küçük harf + Türkçe harfsiz de doğru, 1 harf farkı
  "yaklaştın"; ipucu harfleri turun %40/60/80'inde; puan 50–150, çizene bilen başına 25), kelimeler `draw-words.ts`
  (TR/EN, odanın dili ilk gelenin). 2–8 kişi (kalıcı `cid`), tur: lobi → seçim (15 sn, kelimeler sadece çizene) → çizim
  (80 sn) → açıklama (6 sn) → sıradaki. Süreler depo alarmıyla; çizim sadece bellekte (1000×750 ızgara, 50 ms'lik
  parçalar, geç gelene `strokes`). Bilenler/çizen kendi aralarında `secret` yazışır. Parça `games/draw.ts`.
  Test: `scripts/e2e/draw.mjs`.
  **Bilgi yarışması (0.9.74):** nesne `Quiz` (`apps/server/src/quiz.ts`, bağ `QUIZZES`, göç `v4`, `/api/quiz/:id/ws`),
  `packages/shared/src/games/quiz.ts` + `quiz-questions.ts` (genel kültür, TR/EN, film/dizi adı yok; şıklar her oyunda
  karışır). 2–8 kişi, 10 soru × 15 sn, doğru 100–200 puan (hızlı çok), herkes cevaplayınca ya da süre bitince açıklama
  (4 sn: doğru şık + kim neyi seçti), sonda kürsü; doğru şık açıklamaya kadar gitmez. Parça `games/quiz.ts`.
  Test: `scripts/e2e/quiz.mjs`.
- **Görüntülü sohbet (0.9.63, sadece eşler arası, sitede):** seste 📷 → `P2pVoice.setCam` (320×240, 15 kare, ≤280 kbit/s;
  video kanalı bağlantı kurulurken hep açılır, kamera açılıp kapanınca sadece `replaceTrack`, yeniden pazarlık yok; eski
  sürümün ses-tek teklifinde görüntü yok). Üye `voice.cam` (sürüm artmadan), `{t:'voice', on, mic, cam}`; Cloudflare
  yolunda görüntü yok. Site: kutular (`#voice-cams`, kendi önizlemem ayna); **0.9.81 serbest pencere** (`ui/cam-float.ts`,
  kullanıcı istedi): aynı kutu takımı kartta ("⧉ Serbest bırak"), sayfada yüzen pencerede (her yere sürüklenir, sağ alt
  köşeden boyutlanır, "−" küçültür, "⤓" karta koyar, çift tık varsayılan yer; `localStorage` `opt:camFloat`,
  `camFloat:spot` oran olarak) ya da tam ekranda kendiliğinden `.player-wrap`'in içinde (ayrı yer `camFloat:fsSpot`).
  Taşınınca videolar yeniden oynatılır. Kabukta yüzen pencere `data-island` (deliğin üstünde görünür), sürüklerken
  `swm-layout` olayı adacığı hemen günceller. Eski `#cam-dock` yok.
  **Film sayfasında (0.9.65):** kameralar offscreen'de (`voice` `cam`; izin yoksa `mic.html?cam=1`); gelenler + kendi
  önizlemem (`me`) katmandaki siteye **yerel WebRTC köprüsüyle** gelir (`{op:'loop'}`: offscreen teklif yapar, `cams`
  = mid → üye; her değişiklikte köprü baştan; `data` yoksa kamera yok). Eski eklenti `caps.cam` yollamaz → düğme gizli.
  Kendi ses seviyem: 🎙 altında çubuk (`LevelMeter` "me"; eklentide offscreen `me`).
  Aynı anda en fazla `CAM_MAX` (4) kamera (sunucu `cam_full`). **Sınırlar hep görünür** (kullanıcı isteği): kartta
  "Seste 3/6 · 📷 1/4", son yerde sarı, dolunca kırmızı; dolu düğme soluk (`.is-full`), basınca nedeni (eşler arası,
  yükleme hızı) `flashHint`. Test: `voice/run.mjs` (kamera görüntüsü akıyor mu, kareler sayılır), e2e `voice.mjs` (cam_full).
- **Yayın / ekran paylaşımı (0.9.64, `packages/shared/src/live-p2p.ts`, site `ui/live.ts`, plan+kararlar `docs/internal/yayin.md`):**
  "Birlikte" kartının alt bölümü (`#live-card`): "🖥️ Ekranını paylaş" (`getDisplayMedia`, 720p/30, sekme sesi) / "📹 Kamerayla yayın" (720p);
  odada tek yayın (`live_busy`), "▶ Yayını izle" ile en fazla `LIVE_MAX_VIEWERS` (4, `live_full`). Üye `live: kind`,
  `watching`; `{t:'live'}`, `{t:'live-watch'}`, `{t:'live-signal'}` (sunucu sadece yayıncı ↔ izleyicisi arasında iletir;
  büyük teklifler için `RTC_MESSAGE_MAX`). Tek yönlü: yayıncı her izleyiciye teklif yapar (sendonly, ≤2,5 Mbit/s ekran,
  `contentHint`), izleyici sadece alır (izin istemez). Yayıncı çıkınca/bitirince izleyiciler bırakılır. Görüntü videonun
  köşesinde `#live-window` (⤢ büyüt = videoyu kaplar; kabukta adacık). Kabukta yayın açma yok, izleme var. Film yayma
  YOK (kullanıcı kararı; eklentide `tabCapture` yapılmayacak). Testler: e2e `live.mjs`, gerçek `voice/live.mjs` (kamera
  ve ekran; başsız Chrome'da ekran `--auto-select-desktop-capture-source`). **2. aşama (0.9.66):** ekranda kalite
  `text` (yazı net: 15 kare, `detail`, `maintain-resolution`) / `motion` (akıcı: 30 kare, `maintain-framerate`), yayın
  sürerken de değişir (`localStorage` `opt:liveQuality`); yönetici `{t:'live-stop'}` ile yayını durdurur (yayıncıya
  `live_stopped`), `settings.liveHostOnly` açıksa başkası açamaz (`live_host`), açılınca süren yayın kapanır.
- **PWA (0.9.70):** `public/manifest.webmanifest` + `icons/` (`make-icons.mjs` üretir: 192, 512, maskable, apple-touch) +
  `public/sw.js`: dosyaları önbelleğe ALMAZ (eski kodla odaya girilmesin), sadece sayfa açılışı internetsiz kalırsa
  `offline.html`. Kayıt `app.ts` sonunda, sadece en üst pencerede (kabukta değil); app.ts "load"dan sonra yüklenebildiği için
  `readyState` bakılır. SW'yi değiştirirsen `CACHE` adını artır.
- **Odaya dönüş haberi:** kabukta filmdeyken "🏠 Odaya dön" → `{t:'home'}` → sunucu gönderen hariç herkese
  `{t:'home', by}` (kişi başı 30 sn'de bir, `homeLimit`); filmdekilere videonun üstünde "sen de dön?" kartı (`askHome`,
  20 sn; aynı kişiden dakikada bir).
- **Klavye:** 1–8 o sayfanın emojileri/özel emojileri, Enter mesaj, P pin, V bas-konuş (sesli sohbette "Bas-konuş"
  seçiliyse basılı tutunca mikrofon açık; `opt:ptt`; film sayfasından bırakma da gelir: embed `key` `up`) (sitede `reactions.ts` + `room.ts`, tam ekranda
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
- **Sekmeler:** 💬 Sohbet, 🎵 Sıra, 👥 Kişiler (eşit genişlikte) + sağında ⚙️ düğmesi; 👤 Profil sekme değil: sağ üstte
  en sağdaki düğme (kendi avatarım), altında açılan menü (`.profile-pop`; dışarı tıklayınca/Esc ile kapanır, kabukta
  açıkken delik kapanır). Herkes 💬 Sohbet'le başlar; aynı sekmede yenileyince kalınan sekme (`sessionStorage` `tab:<oda>`).
- **Oda arayüzü 0.9.80 (kullanıcı seçti: 1B 2C 3B 4A 5A, tasarım sayfası `oda-arayuzu`):**
  - **Sohbet balonları** (`ui/chat.ts`): benimkiler sağda vurgu renginde (avatarsız), diğerleri solda avatar + ad; aynı
    kişinin 3 dk içindeki art arda mesajları birleşir (`.cont`); oda hareketleri ortada ince çizgiler arasında; gönder oku
    (`#chat-send`) kutunun içinde.
  - **⚙️ Ayarlar penceresi** (`ui/settings-dialog.ts`, `#settings-dialog`): sekme değil, ekranın ortasında solda bölümleri
    olan pencere: Ekranım / Oda kuralları / Odayı kaydet / Planlı başlangıç (sadece yöneticiye). Satırlar başlık + kısa açıklama + açma/kapama anahtarı (`.set-row`, `input.switch`, `role=switch`).
    Yönetici olmayan anahtarları görmez, `#rules-summary` (✓/– özet, "kuralları X belirliyor") görür. Pencere hep
    sayfada (gizli): açık pencere seçicileri `.dialog-backdrop:not([hidden])` (kabukta deliği kapatır, kısayolları yutar).
    Telefonda bölümler üstte yatay.
  - **Video altı** (`ui/reactions.ts` `.tray-bar`): "😀 Tepki ▴" tepsisi (Hazır / Benimkiler, 8 yuva, ‹ 1/3 ›, 🖼️ Ekle;
    içinde basınca kapanmaz, dışarı/Esc kapatır) + yanında son kullanılan üç emoji (`localStorage` `recentReactions`);
    sağda adı yazan düğmeler 🎮 Oyun · 📌 Pinle · 🔄 Eşitle · ⏩ 1× (basınca `#speed-pop`: −, hız listesi, +) · ⇥ · ⛶;
    ≤1180 px'te sadece simge. Tam ekran ve Shorts çubukları eskisi gibi düz (8 yuva + ▲▼). Kabukta deliğin üstüne açılan
    pencereler (`[data-island]`: tepsi, hız, oyun menüsü) adacık olur; bunlarda açılış animasyonu yok (ölçü kayıyordu).
  - **Üst çubuk** (`html.in-room`): "Bağlı" yazısı, ⟳, 🎨 ve TR/EN odada gizli; bağlantı oda adının noktasında
    (`.room-title-dot` yeşil/sarı/kırmızı, bağlı değilken yanında kısa yazı, basınca yeniden bağlanır; telefonda sadece
    nokta). Dil, ⚙️ Ayarlar ve ⟳ profil menüsünün üstünde (`.profile-actions`).
  - **Birlikte kartı**: "🎙 Sese katıl" + "🖥️ Paylaş ▾" aynı satırda (`.together-actions`); Paylaş menüsünde ekran /
    kamera ve sınır notu; yayın sürerken satır tam genişlik (`.live-card.active`), kalite sadece kendi ekran yayınımda.
    Paylaşamayan (kabuk, ekran paylaşımı olmayan telefon) boştayken kartın bu kısmını hiç görmez.
  - Hatalar: boş pin şeridi yer kaplamıyor (`.pin-strip.empty` gizli), "Aynı yerdesiniz" rozeti tek satır.
- **Kim durdurdu notu (0.9.68):** başkası oynat/durdur/sar/hız yapınca videonun sol üstünde 2,6 sn avatar + "Ali durdurdu"
  (`#action-notice`, deliğin içinde adacık; kendi hareketim ve `SYSTEM` için yok); Ayarlar'dan kapatılır (`opt:actionNotice`).
- **Oda düzeni "Sinema Rayı" (0.9.76, kullanıcı seçti; tasarım tuvali A):** üst çubukta odanın adı (kayıtlı odada adı,
  değilse "Oda <kod>") + "· N kişi" (`.room-title`) ve "🔗 Davet et" (`#invite-btn`: link kopyalanır, telefonda paylaşım
  menüsü; pano kapalıysa `prompt`); sağ rayda (320 px) "Birlikte" kartı (`#together`: başlık + "Seste 2/6 · 📷 0/4",
  odadakilerin avatarları ve adları (en fazla 8, "+N"; aynı kişinin iki sekmesi tek), ses düğmeleri (`#voice-card` artık
  kartın içindeki satır), altında yayın bölümü `#live-card`) ve sekmeler. Eski davet kartı yok. Telefonda üst çubukta oda
  adı ve "Davet et" yazısı gizli (sadece 🔗), bağlıyken ⟳ gizli. Oda değişirse `store/src/room.html` taklidini de güncelle.
- **Ana sayfa "Vitrin" (0.9.77, `home.ts`):** solda başlık + tek adımlık form (isteğe bağlı video linki + "Oda oluştur";
  link `sessionStorage` `start:<oda>` ile odaya taşınır, oda boşsa link kutusunun yolundan açılır; "Odayı kaydet" seçilince ad
  `create:<oda>`), sağda temanın renkleriyle çizilmiş oda önizlemesi (maskot köşede); altında bütün temalarla "Temanı seç"
  (`renderThemeStrip(…, {all:true})`, sayfa anında değişir), kayıtlı odalar, üç adım, üç kapı (link / eklenti / oda içi
  oyunlar), "Odada neler var". Alt bilgide sitenin sürümü (`index.html` `.footer-version`, her yayında artır). Sade temalar
  (gece/okyanus/gunbatimi/neon) katmanlı `--art` + arkada yavaşça süzülen `--aura` (`body::before`, kabukta ve "hareketi
  azalt"ta yok).
- **Sağ paneli gizle (0.9.71):** video altındaki araç çubuğunda ⇥ (`#side-toggle`): `.room.side-hidden`, video bütün genişliği
  alır, sohbet mesajları tam ekrandaki gibi videonun köşesinde (`toasts`), düğmede okunmamış sayısı; `localStorage`
  `opt:sideHidden`; kabukta ve dar ekranda (≤860 px) yok.
- **Sohbette oda hareketleri:** hep yazılır ama varsayılan gizli; sohbetin sağ üstündeki "Hareketleri göster (N)"
  (`localStorage` `opt:chatEvents`). Ayarlardaki seçenek kaldırıldı.
- **Emojileri kapat (`settings.noReactions`):** yönetici açar; sunucu tepkileri düşürür (yönetici dahil),
  site `.no-reactions`, eklenti `.no-react` ile emoji çubuğu gizlenir.
- **Emoji çubuğu:** her sayfada 8 sabit yuva (eksikler boş durur, yanındaki düğmeler kaymaz); "+" yok,
  🖼️ = GIF/foto ekle; özel emoji sayfalarına ▲▼ ile gidilir (tam ekran ve Shorts; video altında tepsi, bkz. 0.9.80).
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
2. Sitenin sürümünü alt bilgide artır (`apps/web/index.html` `.footer-version`). Eklentinin sürümü de aynı numarada tutulur (kullanıcı
   iki sürümün farklı görünmesini "eski kalmış" sanıyordu): `apps/extension/package.json` (siteden indirilen zip ve
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
  `CHROME=/opt/pw-browsers/chromium` ile `scripts/harness/embed/run.mjs` (root iken
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
