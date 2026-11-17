// Builds picks-page.html: one page where the owner picks FD1, RC1 and source-picker options (Design, 17 Nov 2026).
// The owner asked for this page himself (via the Planner), so it is the exception to "no option pages".
// Run: node docs/internal/design/picks-page.mjs  (inlines the SVG sketches as data URIs; UI text is Turkish, for him)
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.dirname(new URL(import.meta.url).pathname);
const img = (f) => `data:image/svg+xml;base64,${fs.readFileSync(path.join(DIR, f)).toString('base64')}`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

// Each question: id, ticket label, title, options [key, name, text, sketches[], recommended?].
const SECTIONS = [
  {
    title: '1 · Akış başlatma penceresi',
    sub: '♾ Shorts / ▶ Video akışını başlatırken açılan pencere ve Shorts görünümü (kart FD1).',
    questions: [
      {
        id: 'feed', label: 'Akış', title: 'Akış penceresi nasıl olsun?',
        options: [
          ['A', 'Sağ panel, tek ekranda 3 adım', 'Sağda bir panel açılır, video solda oynamaya devam eder. 1 Ne izlenecek · 2 Nereden · 3 Ülke seçilir, altta "Oynayacak: ♾ Shorts · 🎵 Müzik" yazar ve ▶ Akışı başlat düğmesine basılır. Telefonda yarım ekran. Shorts görünümü de toparlanır: düğmeler gruplu ve yazılı, "12 kaldı", bildirimler videonun altında.', ['feed-start/a-computer.svg', 'feed-start/a-phone.svg', 'feed-start/a-shorts-computer.svg', 'feed-start/a-shorts-phone.svg'], true],
          ['B', 'Adım adım', 'Aynı sağ panel ama her ekranda tek soru, ‹ Geri / İleri › ile. En sakin ve büyük; ama her seferinde 3–4 tıklama.', ['feed-start/b-steps.svg']],
          ['C', 'Hazır akış kartları', 'Büyük kartlar ("🎵 Müzik — yeni şarkılar ve hitler, art arda"), üstte küçük Shorts | Video anahtarı. Okuması en hızlı; ama Shorts/Video seçimi gözden kaçabilir.', ['feed-start/c-cards.svg']],
        ],
      },
    ],
  },
  {
    title: '2 · Oturum özeti',
    sub: 'Bir izleme oturumunun sonunda herkese gösterilen özet (kart RC1).',
    questions: [
      {
        id: 'look', label: 'Özet görünüm', title: 'Özet nasıl görünsün?',
        options: [
          ['A', 'Gece sahnesi', 'Videonun yerinde 16:9, her seferinde bir bilgi; her bilginin kendi şirin arka planı (yıldızlı gece, emoji yağmuru, baloncuklar, film makarası, ön sıra, patlamış mısır), logomuz ve ışığı her sahnede. Altta küçük bir film şeridi nerede olduğumuzu gösterir.', ['session-recap/look-a-stage.svg', 'session-recap/look-a-scenes.svg', 'session-recap/phone.svg'], true],
          ['B', 'Film şeridi', 'Bütün oturum, sağdan sola kendi kendine akan bir film şeridi; aynı anda 2–3 kare. En "sinema" olanı; sayılar daha küçük.', ['session-recap/look-b-filmstrip.svg']],
          ['C', 'Kartpostallar', 'Her bilgi Sidelit pullu bir kartpostal, masaya tek tek bırakılır; sonunda hepsi bir kolaj olur, resim olarak kaydedilir. Daha kalabalık, telefonda okuması zor.', ['session-recap/look-c-postcards.svg']],
        ],
      },
      {
        id: 'who', label: 'Özeti kim başlatır', title: 'Özeti kim başlatır?',
        options: [
          ['A', 'Yönetici gösterir, misafir ister', 'Yönetici ✨ düğmesine basar, özet herkese aynı anda oynar; video duraklar ve sonra kaldığı yerden devam eder, sıra değişmez. Misafirler "🙋 Yöneticiden iste" der, yönetici tek bir bildirim görür: "Herkese göster / Şimdi değil".', ['session-recap/entry-flow.svg'], true],
          ['B', 'Herkes, 10 sn iptal', 'Herkes başlatabilir: "Alex özeti göstermek istiyor · 10 sn sonra başlar · ✕ İptal". Oda kurallarında "Yalnızca yönetici gösterebilir" seçeneği.', []],
          ['C', 'Herkes kendi başına', 'Sadece basan kişi kendi ekranında izler (bugünkü gibi, yeni görünümle). Birlikte bakma anı olmaz.', []],
        ],
      },
      {
        id: 'where', label: 'Özet nerede', title: 'Özet düğmesi nerede olsun?',
        options: [
          ['A', '✨ kumandada, hazır olunca', 'Videonun yanındaki düğme sütununda bir ✨ Özet düğmesi; sadece 30 dk izlendikten sonra çıkar, açılana kadar küçük altın bir nokta taşır.', ['session-recap/entry-flow.svg'], true],
          ['B', 'Üst çubukta çip', 'Davet düğmesinin yanında "✨ Özet hazır". Daha görünür ama üst çubuk zaten dolu, telefonda sığmaz.', []],
          ['C', 'Profil menüsü', 'Bugünkü yer, artı sıra bitince çıkan kartta bir düğme. En az değişiklik ama akşam boyunca bulmak zor.', []],
        ],
      },
      {
        id: 'music', label: 'Özet müziği', title: 'Özette müzik olsun mu?',
        options: [
          ['A', 'Kendi müziğimiz', 'Tarayıcıda üretilen, odanın sıcak seslerinden kısa bir melodi. Lisans gerekmez, dosya yok. Kısık sesle; sesleri kapatmış olanlarda çalmaz, 🔇 düğmesi var.', [], true],
          ['B', 'Ücretsiz (CC0) bir parça', 'Tek tek kontrol edilmiş, herkese açık bir parça; kendi sunucumuzdan, üçüncü taraf listesine yazılır.', []],
          ['C', 'Müzik yok', 'Sessiz gösteri.', []],
        ],
      },
    ],
  },
  {
    title: '3 · Kaynak seçici',
    sub: 'Arama kutusunun yanındaki ⠿ ile açılan "Ne izliyoruz?" seçicisi.',
    questions: [
      {
        id: 'source', label: 'Kaynak seçici', title: 'Kaynak seçici nasıl olsun?',
        options: [
          ['A', 'Büyük ızgara', 'Videonun yerinde büyük, eşit karolar ve üstte Hepsi / Videolar / Shorts / Müzik / Linkten çipleri. YouTube oynarken yan panelin yerinde açılır, video kapanmaz.', ['source-picker/a-computer.svg', 'source-picker/a-phone.svg'], true],
          ['B', 'Raflar', 'Çip yok: Videolar, Shorts, Müzik, Linkten diye dört etiketli satır. Hepsi bir bakışta; ama kısa satırlar boşluk bırakır, telefonda kayar.', ['source-picker/b-computer.svg']],
          ['C', 'Büyük ⠿ menü', 'Bugünkü küçük menü, genişletilmiş: üstte filtre, iki sütun liste. En az değişiklik, hiçbir videoyu kapatmaz; ama hâlâ bir menü gibi.', ['source-picker/c-computer.svg']],
        ],
      },
    ],
  },
];

const fig = (f, name) => `<button type="button" class="shot" data-zoom="${img(f)}" aria-label="${esc(name)}: büyüt"><img src="${img(f)}" alt="${esc(name)} taslağı" loading="lazy"></button>`;
const option = (q, [key, name, text, shots, rec]) => `
      <article class="opt${rec ? ' rec' : ''}">
        <header><span class="key">${key}</span><h4>${esc(name)}</h4>${rec ? '<span class="badge">Önerilen</span>' : ''}</header>
        ${shots.length ? `<div class="shots${shots.length > 1 ? ' many' : ''}">${shots.map((f) => fig(f, name)).join('')}</div>` : ''}
        <p>${esc(text)}</p>
        <button type="button" class="pick" data-q="${q.id}" data-v="${key}" aria-pressed="false">Bunu seç</button>
      </article>`;
const question = (q) => `
    <section class="q" id="q-${q.id}">
      <h3>${esc(q.title)}</h3>
      <div class="opts">${q.options.map((o) => option(q, o)).join('')}</div>
      <label class="note">Notun (isteğe bağlı)<textarea data-note="${q.id}" rows="2" placeholder="Değiştirmek istediğin bir şey var mı?"></textarea></label>
    </section>`;
const QUESTIONS = SECTIONS.flatMap((s) => s.questions.map((q) => ({ id: q.id, label: q.label, names: Object.fromEntries(q.options.map(([k, n]) => [k, n])) })));

const html = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sidelit Seçimler</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&display=swap" rel="stylesheet">
<style>
:root {
  --bg: #fbf6ec; --surface: #ffffff; --surface-2: #f4ecdc; --border: #e4d6bb; --text: #2a1d0e; --muted: #6b5a43;
  --gold: #a8640a; --gold-soft: #ffe7b0; --on-gold: #ffffff; --shadow: 0 1px 3px rgb(60 40 10 / .12);
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #120d1f; --surface: #1c1530; --surface-2: #261d40; --border: #3a2e5c; --text: #f6efe2; --muted: #c9bda6;
    --gold: #ffc65a; --gold-soft: #3a2c10; --on-gold: #1a1036; --shadow: none;
  }
}
:root[data-theme="dark"] {
  --bg: #120d1f; --surface: #1c1530; --surface-2: #261d40; --border: #3a2e5c; --text: #f6efe2; --muted: #c9bda6;
  --gold: #ffc65a; --gold-soft: #3a2c10; --on-gold: #1a1036; --shadow: none;
}
* { box-sizing: border-box; }
html, body { margin: 0; overflow-x: hidden; }
body { background: var(--bg); color: var(--text); font: 16px/1.5 'Atkinson Hyperlegible', system-ui, sans-serif; padding-bottom: 210px; }
h1, h2, h3, h4 { font-family: 'Bricolage Grotesque', system-ui, sans-serif; line-height: 1.2; margin: 0; }
main { max-width: 1180px; margin: 0 auto; padding: 20px 16px; }
.top h1 { font-size: 28px; font-weight: 800; }
.top p { margin: 6px 0 0; color: var(--muted); }
.defaults { margin-top: 14px; padding: 12px 14px; border-radius: 14px; background: var(--gold-soft); border: 1px solid var(--gold); font-size: 15px; }
.defaults b { color: var(--text); }
.sec { margin-top: 34px; }
.sec > h2 { font-size: 24px; font-weight: 800; }
.sec > p { margin: 4px 0 0; color: var(--muted); }
.q { margin-top: 18px; padding: 16px; background: var(--surface); border: 1px solid var(--border); border-radius: 18px; box-shadow: var(--shadow); }
.q h3 { font-size: 19px; font-weight: 700; }
.opts { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr)); gap: 14px; margin-top: 12px; }
.opt { display: flex; flex-direction: column; gap: 10px; padding: 12px; border-radius: 14px; background: var(--surface-2); border: 2px solid transparent; min-width: 0; }
.opt.picked { border-color: var(--gold); }
.opt header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.key { display: inline-grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: var(--text); color: var(--bg); font-weight: 700; flex: none; }
.opt h4 { font-size: 17px; font-weight: 700; }
.badge { font-size: 13px; font-weight: 700; padding: 2px 10px; border-radius: 99px; background: var(--gold); color: var(--on-gold); }
.opt p { margin: 0; font-size: 15px; color: var(--text); }
.shots { display: grid; gap: 8px; }
.shots.many { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.shot { padding: 0; border: 1px solid var(--border); border-radius: 10px; overflow: hidden; background: #0b0d1f; cursor: zoom-in; display: block; width: 100%; }
.shot img { display: block; width: 100%; height: auto; max-height: 260px; object-fit: contain; }
.pick { margin-top: auto; min-height: 44px; border-radius: 12px; border: 2px solid var(--gold); background: transparent; color: var(--text); font: inherit; font-weight: 700; cursor: pointer; }
.pick[aria-pressed="true"] { background: var(--gold); color: var(--on-gold); }
.pick[aria-pressed="true"]::before { content: '✓ '; }
button:focus-visible, textarea:focus-visible { outline: 3px solid var(--gold); outline-offset: 2px; }
.note { display: block; margin-top: 12px; font-size: 14px; color: var(--muted); }
textarea { display: block; width: 100%; margin-top: 4px; padding: 8px 10px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg); color: var(--text); font: inherit; resize: vertical; }
.ticket { position: fixed; left: 0; right: 0; bottom: 0; background: var(--surface); border-top: 2px solid var(--gold); padding: 10px 16px 12px; box-shadow: 0 -4px 16px rgb(0 0 0 / .15); }
.ticket-in { max-width: 1180px; margin: 0 auto; display: flex; gap: 10px; align-items: stretch; }
.ticket textarea { margin: 0; height: 130px; font-size: 14px; }
.ticket-side { display: flex; flex-direction: column; gap: 6px; justify-content: center; }
.copy { min-height: 44px; padding: 0 16px; border-radius: 12px; border: 0; background: var(--gold); color: var(--on-gold); font: inherit; font-weight: 700; cursor: pointer; white-space: nowrap; }
.count { font-size: 13px; color: var(--muted); text-align: center; }
@media (max-width: 600px) {
  .ticket-in { flex-direction: column; }
  .ticket textarea { height: 90px; }
  body { padding-bottom: 230px; }
  .top h1 { font-size: 24px; }
}
dialog { padding: 0; border: 0; background: #0b0d1f; max-width: 96vw; max-height: 94vh; border-radius: 12px; }
dialog::backdrop { background: rgb(0 0 0 / .8); }
dialog img { display: block; max-width: 96vw; max-height: 86vh; width: auto; height: auto; }
dialog button { position: sticky; bottom: 0; width: 100%; min-height: 44px; border: 0; background: var(--gold); color: var(--on-gold); font: inherit; font-weight: 700; cursor: pointer; }
</style>
</head>
<body>
<main>
  <div class="top">
    <h1>Sidelit · Seçimler</h1>
    <p>Her soruda bir seçeneğe dokun (büyütmek için resme dokun). Alttaki metin kendiliğinden oluşur; 📋 Kopyala ile Planner'a yapıştır.</p>
    <div class="defaults"><b>Sormadan böyle yapılacak (itirazın yoksa):</b> Özet hatırlatmaları en fazla oturumda bir kez: sıra bitince çıkan kartta ✨ düğmesi, uzun ve geç bir akşamda tek sessiz satır, bir sonraki oturumun başında "Geçen seferin özeti" çipi; "Hatırlatma" kapatılabilir.<br><b>Oturum kuralı:</b> 4 saat hiçbir şey olmazsa yeni oturum başlar (gece yarısı fark etmez); en az 2 kişiyle 30 dk izlenince özet açılır ve oturumda bir kez herkese gösterilir.</div>
  </div>
${SECTIONS.map((s) => `  <section class="sec">
    <h2>${esc(s.title)}</h2>
    <p>${esc(s.sub)}</p>${s.questions.map(question).join('')}
  </section>`).join('\n')}
</main>
<div class="ticket" role="region" aria-label="Seçimlerim">
  <div class="ticket-in">
    <textarea id="ticket" readonly aria-label="Seçimlerim metni"></textarea>
    <div class="ticket-side"><button type="button" class="copy" id="copy">📋 Kopyala</button><span class="count" id="count"></span></div>
  </div>
</div>
<dialog id="zoom" aria-label="Büyük taslak"><img alt="Büyük taslak"><button type="button" id="zoom-close">✕ Kapat</button></dialog>
<script>
const QUESTIONS = ${JSON.stringify(QUESTIONS)};
const KEY = 'sidelit-picks-v1';
let state = { picks: {}, notes: {} };
try { const saved = JSON.parse(localStorage.getItem(KEY) || 'null'); if (saved && saved.picks) state = saved; } catch (e) {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} };
function render() {
  document.querySelectorAll('.pick').forEach((b) => {
    const on = state.picks[b.dataset.q] === b.dataset.v;
    b.setAttribute('aria-pressed', String(on));
    b.textContent = on ? 'Seçildi' : 'Bunu seç';
    b.closest('.opt').classList.toggle('picked', on);
  });
  document.querySelectorAll('[data-note]').forEach((t) => { if (document.activeElement !== t) t.value = state.notes[t.dataset.note] || ''; });
  const lines = QUESTIONS.map((q) => {
    const v = state.picks[q.id];
    const note = (state.notes[q.id] || '').trim();
    return '- ' + q.label + ': ' + (v ? v + ' (' + q.names[v] + ')' : '—') + (note ? ' · Not: ' + note : '');
  });
  document.getElementById('ticket').value = 'Seçimlerim:\\n' + lines.join('\\n');
  const n = QUESTIONS.filter((q) => state.picks[q.id]).length;
  document.getElementById('count').textContent = n + ' / ' + QUESTIONS.length + ' seçildi';
}
document.addEventListener('click', (e) => {
  const pick = e.target.closest('.pick');
  if (pick) { state.picks[pick.dataset.q] = pick.dataset.v; save(); render(); return; }
  const shot = e.target.closest('.shot');
  if (shot) { const d = document.getElementById('zoom'); d.querySelector('img').src = shot.dataset.zoom; d.showModal(); }
});
document.getElementById('zoom-close').addEventListener('click', () => document.getElementById('zoom').close());
document.getElementById('zoom').addEventListener('click', (e) => { if (e.target.id === 'zoom') e.target.close(); });
document.addEventListener('input', (e) => { const t = e.target.closest('[data-note]'); if (t) { state.notes[t.dataset.note] = t.value; save(); render(); } });
document.getElementById('copy').addEventListener('click', async () => {
  const ta = document.getElementById('ticket');
  const btn = document.getElementById('copy');
  try { await navigator.clipboard.writeText(ta.value); } catch (e) { ta.select(); try { document.execCommand('copy'); } catch (e2) {} }
  btn.textContent = '✓ Kopyalandı';
  setTimeout(() => (btn.textContent = '📋 Kopyala'), 1600);
});
render();
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(DIR, 'picks-page.html'), html);
console.log(`picks-page.html: ${(html.length / 1024).toFixed(0)} KB`);
