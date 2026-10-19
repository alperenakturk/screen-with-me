# Eklenti test düzeneği

Eklentinin sayfa betiğini (`content.js`) gerçek Chrome'a yüklemeden denemek için.
Sayfada iframe içinde, **sonradan yüklenen** bir video var; `shim.js` sahte bir
`chrome.*` API'si, `index.html` de basit bir arka plan taklidi sağlar.

```bash
npm run build:extension:dev
cp apps/extension/dist/content.js scripts/harness/
node scripts/harness/serve.mjs scripts/harness 5199
# Odayı hazırla (yerel sunucu açık olmalı):
node scripts/e2e/ctl.mjs harness1 load
node scripts/e2e/ctl.mjs harness1 pause 30
```

Sonra `http://localhost:5199/?room=harness1` aç. Sayfadaki kayıtta çerçeve
bağlantıları, video puanları ve sunucuya giden mesajlar görünür.
`ctl.mjs` ile başka bir kullanıcı gibi komut gönderebilirsin (`play 40`,
`seek 120`, `rate 1.5`, `react`, `chat merhaba`). `SWM_BASE` ortam değişkeni
yayındaki sunucuya yönlendirir.

## Film sitenin içinde (gerçek Chrome + eklenti)

`embed/` klasörü, filmin odanın içinde (iframe) açılmasını gerçek Chrome'da eklentiyle uçtan uca
dener. Markalı Chrome `--load-extension` kabul etmediği için `embed/cdp.mjs` Chrome'u
`--remote-debugging-pipe --enable-unsafe-extension-debugging` ile açıp eklentiyi CDP
`Extensions.loadUnpacked` ile yükler. `embed/film-server.mjs` sahte bir video sitesidir: izin veren
sayfa, iç içe (başka kökenli) oynatıcı, `X-Frame-Options: DENY`, CSP `frame-ancestors 'none'` ve sadece
iframe isteğinde yasaklayan "sinsi" sayfa. Video: Big Buck Bunny (CC BY, Blender Foundation).

```bash
npm run build:extension:dev
npm run dev
node scripts/harness/embed/film-server.mjs
node scripts/harness/embed/run.mjs apps/extension/dist http://localhost:5173 ws://localhost:8787 embed-test
```

Kontroller: sayfa sitede açılır, sekme gitmez, kişi odada bir kez görünür; oda komutları çerçevedeki
videoya uygulanır, çerçevedeki tıklama odaya yayılır; 1–8 / Enter / P çerçevedeyken de çalışır; sitenin
⛶'u ve film sitesinin kendi ⛶'u sitenin tam ekranını açar; yasaklı sayfalar ayrı sekme kartına düşer;
doğrudan videoya geçiş ve "Ayrı sekmede aç". Ekran görüntüleri `embed-test-*.png`.
