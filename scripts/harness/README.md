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
