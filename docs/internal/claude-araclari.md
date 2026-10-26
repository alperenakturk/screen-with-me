# Claude Code araçları: ScreenWithMe için ne kurmalı?

Ekim 2026 araştırması. Hiçbir şey kurulmadı; liste Alperen'in kendisi kurması için. Yıldız ve "son güncelleme"
GitHub'dan 26 Ekim 2026'da bakıldı. Sıralama: **Hemen kur** → **İşe yarar** → **Şimdilik gerek yok**.

## Önce bilinmesi gereken 3 şey

1. **Bazıları zaten var, tekrar kurma.** Masaüstü uygulamasında hazır: `/code-review`, `/security-review`,
   `/simplify`, uygulama içi tarayıcı (dev sunucusunu açıp ekran görüntüsü alır), Claude in Chrome (senin gerçek
   Chrome'un), Artifact sayfaları, PR araçları. Bunların aynısını yapan eklentiler gereksiz.
2. **Bulut oturumunda (claude.ai/code) eklentiler (plugin) yüklenmez.** Bulutta sadece repoya commit edilmiş
   şeyler çalışır: `CLAUDE.md`, `.claude/agents/`, `.claude/skills/`, `.claude/commands/`, `.mcp.json` ve
   claude.ai'da açtığın beceriler (Ayarlar → Capabilities → Skills). Yani:
   - Masaüstünde kullanacağın şeyi **eklenti** olarak kur.
   - Bulutta da lazım olanı **repoya** koy (MCP için `claude mcp add --scope project …` → `.mcp.json`, ajanlar için
     `.claude/agents/*.md`).
   (Kaynak: code.claude.com/docs/en/cloud-environments → "What carries over from your setup".)
3. **Python yok.** Bu bilgisayarda `python` komutu çalışmıyor. Anthropic'in iki güvenlik eklentisi
   (`claude-security`, `security-guidance`) Python 3.9+ istiyor. Onları kuracaksan önce:
   `winget install Python.Python.3.13` (ya da python.org).

Eklenti kurmak: terminalde `claude` aç ve `/plugin install AD@claude-plugins-official` yaz (resmî pazaryeri zaten
ekli: `anthropics/claude-plugins-official`, ★44,7k, bugün güncellendi). Başka pazaryeri için önce
`/plugin marketplace add sahip/repo`. Kaldırmak: `/plugin uninstall AD`.

---

## 🟢 Hemen kur

### 1. Chrome DevTools MCP (Google) — eklentiyi Claude'un kendisi yükleyip deneyebilsin
- **Ne yapar:** Claude'a gerçek bir Chrome verir: sayfa açar, tıklar, konsol mesajlarını ve ağ isteklerini okur,
  performans kaydı alır. `--categoryExtensions` ile **paketlenmemiş eklentiyi yükler, yeniden yükler, popup'ı
  tetikler** (`install_extension`, `reload_extension`, `trigger_extension_action`).
- **Bu projede:** `apps/extension/dist`'i yükleyip film sayfasında katman/delik sorunlarına bakmak; arka plan ve
  içerik betiğinin konsol hatalarını görmek. Bugün bunun için elle yazılmış `scripts/harness/embed/cdp.mjs` var;
  o otomatik test olarak kalsın, DevTools MCP "bir bakalım ne oluyor" hata ayıklaması için.
- **Kurulum (masaüstü, Windows):**
  ```
  claude mcp add chrome-devtools --scope user -- cmd /c npx -y chrome-devtools-mcp@latest --categoryExtensions --no-usage-statistics --no-performance-crux
  ```
  (Windows'ta `npx` ile çalışan MCP'ler `cmd /c` ister. Son iki bayrak kullanım istatistiğini ve Google'a giden
  CrUX sorgusunu kapatır.) Ya da eklenti olarak: `/plugin marketplace add ChromeDevTools/chrome-devtools-mcp` →
  `/plugin install chrome-devtools-mcp@chrome-devtools-plugins`.
- **Güven:** github.com/ChromeDevTools/chrome-devtools-mcp, Google'ın Chrome DevTools ekibi, ★54k, bugün güncellendi,
  Apache-2.0.
- **Risk:** Açtığı tarayıcıdaki her şeyi Claude görür; kendi hesaplarına giriş yaptığın profili verme (varsayılan
  ayrı profil açar, öyle kalsın). Eklenti özelliği deneysel.
- Belge: developer.chrome.com/docs/devtools/agents/extensions

### 2. Cloudflare becerileri (Cloudflare) — Durable Object ve Worker konusunda güncel bilgi
- **Ne yapar:** 19 beceri; bizim için önemli olanlar `durable-objects` (WebSocket, SQLite, alarmlar, RPC),
  `wrangler`, `workers-best-practices`, `workers-profiling` (canlıdaki DO'nun CPU/bellek darboğazı), `web-perf`.
- **Bu projede:** `apps/server/src/room.ts` (oda DO'su, WebSocket Hibernation, tek alarm) ve ses/görüntü planındaki
  Cloudflare Realtime SFU işinde Claude eski bilgiyle değil güncel kurallarla yazar.
- **Kurulum:** `/plugin install cloudflare@claude-plugins-official` (ya da `/plugin marketplace add cloudflare/skills` →
  `/plugin install cloudflare@cloudflare`).
- **Güven:** github.com/cloudflare/skills, Cloudflare'in kendisi, ★3,2k, 19 Ekim 2026, Apache-2.0.
- **Risk:** Eklenti `mcp.cloudflare.com` MCP sunucusunu da ekler; giriş isterse **şimdilik yapma** (hesabındaki
  Worker'ları değiştirip silebilir; yayın zaten GitHub Actions'ta). Beceriler girişsiz çalışır.
- **Bulut için:** Belgeler sunucusunu repoya ekle (giriş istemez):
  `claude mcp add --transport http cloudflare-docs --scope project https://docs.mcp.cloudflare.com/mcp`
  → `.mcp.json` commit. (Bulut ortamının ağ izninde `docs.mcp.cloudflare.com` açık olmalı.)

### 3. CLAUDE.md yönetimi (Anthropic) — 32 KB'lık CLAUDE.md'yi toparlamak
- **Ne yapar:** `claude-md-improver` becerisi CLAUDE.md'yi koda göre denetler (eskimiş/yanlış satırları bulur);
  `/revise-claude-md` oturumda öğrenileni ekler.
- **Bu projede:** CLAUDE.md 32 KB (~10 bin token) ve **her oturumda** baştan okunuyor. Denetimden sonra mantıklı
  adım: ayrıntıları `.claude/rules/` altına **yola bağlı kurallar** olarak taşımak (ör. eklenti kuralları sadece
  `apps/extension/**` düzenlenirken yüklenir). Daha az token, daha az karışıklık.
- **Kurulum:** `/plugin install claude-md-management@claude-plugins-official`
- **Güven:** Anthropic (resmî pazaryeri). Risk yok; sadece okur ve öneri yazar.

### 4. Context7 (Upstash) — kütüphane belgeleri güncel olsun
- **Ne yapar:** Claude bir API'yi kullanmadan önce güncel belgesini çeker (Vite, Vitest, Chrome Extensions API,
  Wrangler, YouTube IFrame API, WebRTC…). "Uydurma API" hatalarını azaltır.
- **Kurulum:** `/plugin install context7@claude-plugins-official`. Bulut için:
  `claude mcp add --transport http context7 --scope project https://mcp.context7.com/mcp`
- **Güven:** github.com/upstash/context7, ★63,7k, bugün güncellendi, MIT.
- **Risk:** Düşük; sorular Upstash'e gider (kod değil, "Vite 7 proxy ayarı" gibi). Anahtarsız çalışır, sınırı düşük.

---

## 🟡 İşe yarar (zamanı gelince)

### 5. Claude Security (Anthropic) — 1.0 ve mağaza başvurusundan önce derin güvenlik taraması
- **Ne yapar:** Ajan ekibi kodun haritasını çıkarır, tehdit modeli kurar, açık arar, **her bulguyu başka bir ajana
  sorgulatır** (yanlış alarmı eler), istersen yama dosyası hazırlar (sen uygularsın).
- **Bu projede:** `protocol.ts` doğrulaması, `postMessage` köken kontrolleri (site ⇄ shell.html ⇄ arka plan), oda
  kimliğinin film sitesine sızmaması, hız sınırları, `cid` hiç gönderilmemesi. Yerleşik `/security-review` sadece
  değişikliğe bakar; bu bütün repoya bakar.
- **Kurulum:** önce Python, sonra `/plugin install claude-security@claude-plugins-official` → `/claude-security`
  (ör. "scan the whole repo at medium"). Taramadan önce süre/token maliyetini sorar.
- **Risk:** Uzun sürer, çok token harcar (Opus önerilir). Ayda bir ya da büyük sürümden önce yeter.

### 6. Security Guidance (Anthropic) — yazarken güvenlik uyarısı
- **Ne yapar:** Her düzenlemede `innerHTML`, gömülü anahtar gibi ~25 tehlikeli kalıba anında uyarır; tur sonunda
  değişikliği hızlı bir modelle inceler; `git commit`'te ajan ile çok dosyalı akışı takip eder.
- **Bu projede:** "Kullanıcı verisi asla innerHTML ile yazılmaz" kuralını otomatik bekçiye çevirir.
- **Kurulum:** Python + `/plugin install security-guidance@claude-plugins-official`
- **Risk:** Her tur sonunda ek model çağrısı = kullanım limitinden yer. Kullanımın dolarsa kapat
  (`/plugin disable security-guidance`).

### 7. Modern Web Guidance (Google Chrome) — web platformu + erişilebilirlik bilgisi
- **Ne yapar:** 232 web özelliği için tarayıcı desteği ve 186 kullanım rehberi (erişilebilirlik, formlar, performans,
  güvenlik, arayüz bileşenleri). Claude yeni CSS/JS özelliği kullanmadan önce desteğe bakar.
- **Bu projede:** oda arayüzü, tam ekran, `:fullscreen`, `clip-path`, `popover`, `prefers-reduced-motion`,
  klavye erişimi.
- **Kurulum:** `/plugin install modern-web-guidance@claude-plugins-official` (ya da `npx modern-web-guidance@latest install`)
- **Güven:** github.com/GoogleChrome/modern-web-guidance, ★2,6k, bugün güncellendi, Apache-2.0.

### 8. Frontend Design (Anthropic) — tema ve arayüz işlerinde "yapay zekâ kokmayan" tasarım
- **Ne yapar:** Arayüz yazarken belirgin bir görsel yön seçer (yazı tipi, renk, hareket); sıradan şablon görünümünden
  kaçınır.
- **Bu projede:** yeni temalar, ana sayfa, eklenti sayfası, mağaza görselleri (`store/src/shots.html`).
- **Kurulum:** `/plugin install frontend-design@claude-plugins-official`. Bulut için: claude.ai → Ayarlar →
  Capabilities → Skills'te aç (Anthropic'in hazır becerisi).
- **Risk:** Yok. Not: kendi zevkini dayatabilir; "mevcut tema sistemine (`themes.ts`) uy" demek yeterli.

### 9. TypeScript LSP (Anthropic) — Claude kodu "editör gibi" görsün
- **Ne yapar:** Tanıma git, kullanımları bul, düzenlemeden hemen sonra tip hatası.
- **Dikkat:** Projede **TypeScript 7** var (Go ile yazılmış yeni sürüm, `tsserver` yok). Eklentinin kullandığı
  `typescript-language-server` eski `tsserver`'a dayanıyor. Denemek için:
  `npm i -g typescript-language-server typescript@5` → `/plugin install typescript-lsp@claude-plugins-official`.
  Çalışmazsa kaldır; `npm run typecheck` zaten aynı hataları yakalıyor. TS 7'nin kendi LSP'si (`tsgo --lsp`) için
  resmî eklenti çıkınca ona geç.

### 10. Lighthouse (Google, kurulum gerektirmez) — erişilebilirlik ve hız puanı
- **Ne yapar:** Sayfaya erişilebilirlik (kontrast, etiketler, klavye), performans, en iyi uygulama puanı verir.
- **Kullanım:** dev sunucusu açıkken Claude'a "şunu çalıştır" de:
  `npx lighthouse http://localhost:5173 --only-categories=accessibility,performance --output=html --output-path=lighthouse.html`
  (rapor dosyasını commit etme.) Temaların renk kontrastını her tema için tek tek ölçmek için bir de kendi küçük
  betiğimiz mantıklı (`scripts/contrast.mjs`: `themes.ts` renklerinden WCAG oranı) — Claude'a yazdırılabilir.

### 11. SVGO (kurulum gerektirmez) — üretilen SVG'leri küçültmek
- **Ne yapar:** SVG dosyalarındaki gereksiz ondalıkları, boş grupları atar; çoğu zaman %30–60 küçülür.
- **Bu projede:** `scripts/theme-art.mjs` ve `scripts/avatars.mjs` çıktıları (`apps/web/public/themes`,
  `/avatars`). Önce bir kopyada dene: `npx svgo -r -f apps/web/public/avatars -o C:/temp/avatars-min`, sonra
  tarayıcıda yan yana karşılaştır. `<use>`/kimlik (id) kullanan çizimleri bozabilir; bozuyorsa betiğin içinde
  sayıları yuvarlamak daha güvenli.
- **Güven:** github.com/svg/svgo, ★22,7k, MIT.
- **İpucu (kurulumsuz):** Claude SVG'yi "göremez", sadece kodunu okur. Çizimi kontrol ettirmek için
  "SVG'yi uygulama içi tarayıcıda aç, ekran görüntüsüne bak" de; maskot/avatar işlerinde çok fark eder.

### 12. Claude Code Setup (Anthropic) — bir kerelik "neyi otomatikleştireyim?"
- **Ne yapar:** Repoyu tarayıp kanca (hook), beceri, MCP, alt ajan önerir. Sadece okur.
- **Kurulum:** `/plugin install claude-code-setup@claude-plugins-official` → "recommend automations for this project".
  Bu belgeyle büyük ölçüde örtüşür; ikinci görüş için.

---

## ⚪ Şimdilik gerek yok

| Araç | Neden gerek yok |
|---|---|
| **GitHub MCP** (github/github-mcp-server, ★34k) | `gh` zaten çalışıyor, masaüstü uygulamasının PR araçları var. MCP için geniş yetkili kişisel anahtar (PAT) gerekir: gereksiz risk. |
| **Playwright MCP** (microsoft/playwright-mcp, ★38,7k) | Uygulama içi tarayıcı + Chrome DevTools MCP + kendi CDP test düzenimiz aynı işi görüyor. Paketlenmemiş eklenti yüklemeyi belgelemiyor. |
| **Anthropic `webapp-testing`** (anthropics/skills) | Python ile Playwright betiği yazar; bizde Node + kendi harness'imiz var. |
| **Cloudflare API MCP girişi** (mcp.cloudflare.com) | Hesaba tam erişim; log bakmak için bile Worker silme yetkisi verir. Canlıda gerçek bir sorun çıkarsa salt-okunur token ile düşün. |
| **Figma MCP** | Figma kullanmıyoruz; görseller kodla üretiliyor. Yerel sunucu ücretli koltuk ister, uzaktan yazma beta. |
| **Canva, Superdesign, Miro** | Hesap ister; temalarımız/avatarlarımız betikle üretiliyor, kopyalayıp yapıştırma akışı uymaz. |
| **Sentry, Datadog, PostHog…** | Hesap ve kullanıcı verisi toplama demek; gizlilik politikasını değiştirmek gerekir. 1.0 sonrası hata takibi gerekirse tekrar bak. |
| **Semgrep, SonarQube, CodeRabbit, Aikido, Qodo** | Dış hesap/hizmet; Anthropic'in güvenlik eklentileri + `/code-review` yeterli. |
| **Superpowers** (obra, ★305k), **mattpocock/skills** (★304k) | Çok popüler ama çalışma biçimini baştan değiştirir (her işte beyin fırtınası, TDD soruları). CLAUDE.md'deki "teknik kararı kendin ver" düzenimizle çatışır. Büyük bir özellikten önce mattpocock'un "grill me" becerisi tek seferlik denenebilir. |
| **Hazır ajan koleksiyonları** (wshobson/agents ★41,8k, VoltAgent ★26k) | Yüzlerce genel ajan; projeyi bilmezler, bağlamı şişirirler. Aşağıdaki 5 özel ajan daha iyi. |
| **pr-review-toolkit, code-review eklentisi** | Yerleşik `/code-review` aynı işi yapıyor. |
| **remember, ralph-loop** | Yerleşik hafıza var; sonsuz döngü tekniği bu proje için riskli. |

---

## 🤖 Önerilen özel alt ajanlar (`.claude/agents/*.md`)

Repoya commit edilince **hem masaüstünde hem bulutta** çalışır. Sadece taslak; yazılmadı. Her dosya üstte
YAML başlığı + altta talimat:

```markdown
---
name: eklenti-testcisi
description: Eklenti, kabuk ya da focus.ts değişince gerçek Chrome testini koşar.
tools: Bash, Read, Grep, Glob
model: sonnet
---
(talimat metni)
```

### `eklenti-testcisi` — gerçek Chrome + eklenti testi
- **Ne zaman:** `apps/extension/**`, `packages/shared/src/shell.ts`, site kabuk kodu değişince.
- **Ne yapar:** `npm run build:extension:dev` → `npm run dev` ve `node scripts/harness/embed/film-server.mjs`
  arka planda → `node scripts/harness/embed/run.mjs` → sadece `FAIL` satırlarını ve ekran görüntülerini raporlar,
  sunucuları kapatır. Bulutta `CHROME=/opt/pw-browsers/…` ve internet yoksa `FILM_VIDEO` yolunu kullanır
  (CLAUDE.md "Bulut oturumu").
- **Araçlar:** Bash, Read (ekran görüntüsü PNG'lerine bakar), Grep, Glob. Kod düzenlemez.
- **Model:** sonnet (uzun ama mekanik iş).

### `guvenlik-denetcisi` — projenin kendi güvenlik kuralları
- **Ne zaman:** sunucu, protokol, kabuk/postMessage, site-bridge değişince; PR'dan önce.
- **Ne yapar:** `git diff main...` üzerinde CLAUDE.md "Güvenlik" ve "Kabuk" kurallarını tek tek kontrol eder:
  kullanıcı verisi `innerHTML`'e gitmiyor mu, `protocol.ts` her yeni alanı doğrulayıp kopyalıyor mu, yeni mesaj
  sunucu hız sınırından geçiyor mu, `cid`/`owner`/`voters` istemciye sızıyor mu, `postMessage` köken kontrolü var mı,
  oda kimliği film sayfasına (adres/öznitelik) yazılıyor mu, `PROTOCOL_VERSION` gerekiyor mu.
- **Araçlar:** Read, Grep, Glob, Bash (sadece `git diff`/`git log`). Düzenleme yok.
- **Model:** opus (ince mantık hataları).

### `magaza-denetcisi` — Chrome Web Store politikası ve resmî metinler
- **Ne zaman:** README, `store/`, `apps/web/public/*.html`, i18n metinleri ya da `manifest.json` izinleri değişince.
- **Ne yapar:** resmî metinlerde film/dizi/korsan site adı, "open source" iddiası (repo private), Netflix vb. adının
  "çalışır" olmadan geçmesi, yeni izin/`host_permissions` ve `docs/internal/web-store.md`'deki gerekçelerle uyumu,
  "tek amaç" kuralı, gizlilik politikasının yeni veriyi kapsayıp kapsamadığı.
- **Araçlar:** Read, Grep, Glob. **Model:** sonnet.

### `metin-esitleyici` — Türkçe/İngilizce tutarlılığı
- **Ne zaman:** metin eklenen her iş.
- **Ne yapar:** `apps/web/src/i18n.ts` ve `apps/extension/src/i18n.ts`'te TR ve EN anahtarları eşit mi, eksik/boş
  çeviri var mı; `README.md` ↔ `README.tr.md` aynı bölümleri içeriyor mu; `privacy.html` iki dili; `avatar.<kimlik>`
  anahtarları `DRAWN_AVATARS` ile eşleşiyor mu. Eksikleri listeler, istenirse çeviriyi kendisi ekler.
- **Araçlar:** Read, Grep, Glob, Edit. **Model:** sonnet.

### `surum-yayinci` — yayın kontrol listesi
- **Ne zaman:** "yayınla" / iş bitti dendiğinde.
- **Ne yapar:** CLAUDE.md "Yayın kontrol listesi"ni sırayla uygular: `npm run typecheck && npm test`, sunucu
  değiştiyse `wrangler dev` + `npm run e2e`, eklenti değiştiyse `apps/extension/package.json` sürümünü artırır,
  README ikilisini ve `VIZYON.md`'yi kontrol eder, Türkçe commit (`git commit -F`), push, PR, CI'yı bekler, yeşilse
  birleştirir, Actions'taki deploy'un ve canlı e2e'nin yeşil olduğunu söyler.
- **Araçlar:** Bash, Read, Edit, Grep. **Model:** sonnet. Ana oturum bunu iş sonunda çağırır.

(İsteğe bağlı 6.: `senkron-uzmani` — `sync-engine.ts` değişince `sync-engine.test.ts`'e sahte saatli senaryo ekler.)

**Kanca (hook) önerisi:** `.claude/settings.json`'a "dosya düzenlenince ilgili paketin `typecheck`'ini çalıştır"
kancası eklenebilir; ama TS 7 hızlı olsa da her düzenlemede tüm paketler yavaşlatabilir. Önce ajanlarla başla.

---

## Kurulum sırası (özet)

1. `claude mcp add chrome-devtools …` (yukarıdaki komut)
2. `/plugin install cloudflare@claude-plugins-official`
3. `/plugin install claude-md-management@claude-plugins-official` → "audit my CLAUDE.md"
4. `/plugin install context7@claude-plugins-official`
5. Bulut için: `cloudflare-docs` ve `context7`'yi `--scope project` ile ekleyip `.mcp.json`'ı commit et; claude.ai'da
   frontend-design becerisini aç.
6. Ajan dosyalarını Claude'a yazdır ("claude-araclari.md'deki 5 ajanı yaz") ve commit et.
7. Zamanı gelince: Python → `claude-security` (1.0 öncesi tarama).
