// Builds preview.html: the owner's pick page for the genre avatars (Turkish UI, all 18, real sizes, multi-select).
import { readFileSync, writeFileSync } from 'node:fs';
import { GENRES, NAMES } from './draw.mjs';
const uri = (id) => 'data:image/svg+xml;base64,' + Buffer.from(readFileSync(new URL(`./svg/${id}.svg`, import.meta.url))).toString('base64');
const ids = Object.keys(GENRES);
const cards = ids.map((id) => `<label class="card"><input type="checkbox" id="g-${id}" value="${id}" data-tr="${NAMES[id][1]}">
<img src="${uri(id)}" alt="${NAMES[id][1]}" width="96" height="96"><span class="nm"><b>${NAMES[id][1]}</b><i>${NAMES[id][0]}</i></span>
<span class="sm"><img src="${uri(id)}" alt="" width="36" height="36"><img src="${uri(id)}" alt="" width="28" height="28"></span></label>`).join('\n');
const strip = ids.map((id) => `<img src="${uri(id)}" alt="" width="52" height="52">`).join('');
const page = `<title>Tür Avatarları</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=Nunito+Sans:wght@400;600;700&display=swap">
<style>
/* Layout: a header, the picker strip at real size, then a grid of toggle cards; a sticky summary bar. Sidelit night gold. */
:root{--bg:#f6f3ff;--panel:#fff;--ink:#1d1430;--muted:#5d5480;--line:#ddd6f2;--gold:#a06c00;--gold-soft:#fff2cf;--pick:#6a4cf2;
--display:"Bricolage Grotesque",system-ui,sans-serif;--body:"Nunito Sans",system-ui,sans-serif}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#0d0a22;--panel:#18123a;--ink:#f3eeff;--muted:#b9b0dc;--line:#2e2660;--gold:#ffc65a;--gold-soft:#3a2c10;--pick:#9a84ff;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#0d0a22;--panel:#18123a;--ink:#f3eeff;--muted:#b9b0dc;--line:#2e2660;--gold:#ffc65a;--gold-soft:#3a2c10;--pick:#9a84ff;color-scheme:dark}
body{background:var(--bg);color:var(--ink);font:16px/1.45 var(--body);padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));padding-block:28px 140px}
main{max-width:960px;margin:0 auto;display:grid;gap:20px}
h1{font:800 clamp(28px,5vw,40px)/1.05 var(--display);letter-spacing:-.02em;margin:0;text-wrap:balance}
h2{font:800 18px/1.2 var(--display);margin:0}
.lede{color:var(--muted);margin:6px 0 0;max-width:64ch}
.rec{display:inline-block;font-size:13px;font-weight:700;color:var(--gold);background:var(--gold-soft);padding:3px 10px;border-radius:99px}
.panel{background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:16px;display:grid;gap:10px}
.strip{display:flex;flex-wrap:wrap;gap:8px}
.strip img{width:52px;height:52px;border-radius:50%}
.tools{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}
.card{position:relative;display:grid;justify-items:center;gap:6px;padding:14px 8px 12px;border:1.5px solid var(--line);border-radius:16px;background:var(--panel);cursor:pointer;min-width:0}
.card:hover{border-color:var(--pick)}
.card input{position:absolute;opacity:0;pointer-events:none}
.card:has(input:checked){border-color:var(--pick);box-shadow:0 0 0 2px var(--pick)}
.card:has(input:focus-visible){outline:3px solid var(--gold);outline-offset:2px}
.card:has(input:checked)::after{content:"✓";position:absolute;top:8px;right:8px;width:24px;height:24px;border-radius:50%;background:var(--pick);color:#fff;font:700 14px/24px var(--body);text-align:center}
.card>img{width:96px;height:96px;border-radius:50%}
.nm{display:grid;justify-items:center;line-height:1.2}.nm i{font-style:normal;color:var(--muted);font-size:13px}
.sm{display:flex;gap:8px;align-items:center}.sm img{border-radius:50%}
button{font:700 15px var(--body);border:0;border-radius:12px;padding:10px 16px;background:var(--pick);color:#fff;cursor:pointer}
button.ghost{background:transparent;color:var(--ink);border:1.5px solid var(--line)}
button:focus-visible{outline:3px solid var(--gold);outline-offset:2px}
label.note{color:var(--muted);font-size:14px}
textarea{width:100%;box-sizing:border-box;min-height:64px;border-radius:12px;border:1px solid var(--line);background:var(--panel);color:var(--ink);font:15px var(--body);padding:10px}
.bar{position:fixed;left:0;right:0;bottom:0;background:var(--panel);border-top:1px solid var(--line);padding:12px max(16px,env(safe-area-inset-right,0px)) calc(12px + env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-left,0px))}
.bar div{max-width:960px;margin:0 auto;display:flex;gap:12px;align-items:center;flex-wrap:wrap}
#summary{flex:1;min-width:0;font:700 15px var(--body);word-break:break-word}
</style>
<main>
<div><h1>Tür Avatarları</h1>
<p class="lede">Parodi sekmesi gidiyor, yerine "Türler" geliyor. Hiçbiri belli bir karakter değil, hepsi bir tür: kendi renklerimiz, kendi kıyafetlerimiz. Ten rengi, yaş ve cinsiyet karışık. İstediklerini işaretle; hepsini de seçebilirsin.</p>
<p><span class="rec">Önerim: hepsi (18)</span></p></div>
<section class="panel" aria-label="Seçicide gerçek boyut"><h2>Seçicide böyle görünür</h2><div class="strip">${strip}</div></section>
<div class="tools"><button type="button" id="all" class="ghost">Hepsini seç</button><button type="button" id="none" class="ghost">Temizle</button></div>
<div class="grid">${cards}</div>
<label class="note" for="note">İstersen bir not ekle:</label>
<textarea id="note" placeholder="İsteğe bağlı, ör. kovboyun şapkası daha küçük olsun"></textarea>
</main>
<div class="bar"><div><span id="summary">Henüz seçim yok</span><button id="copy" type="button">Kopyala</button></div></div>
<script>
const boxes=[...document.querySelectorAll('.card input')],sum=document.getElementById('summary'),note=document.getElementById('note'),btn=document.getElementById('copy');
function text(){const on=boxes.filter(b=>b.checked);if(!on.length)return '';let t='Tür avatarları seçimim: '+(on.length===boxes.length?'hepsi (18)':on.map(b=>b.dataset.tr).join(', ')+' ('+on.length+')');if(note.value.trim())t+=' — Not: '+note.value.trim();return t}
function draw(){sum.textContent=text()||'Henüz seçim yok'}
document.addEventListener('change',draw);note.addEventListener('input',draw);
document.getElementById('all').onclick=()=>{boxes.forEach(b=>b.checked=true);draw()};
document.getElementById('none').onclick=()=>{boxes.forEach(b=>b.checked=false);draw()};
btn.addEventListener('click',async()=>{const t=text()||'Tür avatarları seçimim: (seçim yok)';try{await navigator.clipboard.writeText(t);btn.textContent='Kopyalandı ✓'}catch(e){const r=document.createRange();r.selectNodeContents(sum);const s=getSelection();s.removeAllRanges();s.addRange(r);btn.textContent='Seçili, kopyala'}setTimeout(()=>btn.textContent='Kopyala',1800)});
draw();
</script>
`;
writeFileSync(new URL('./preview.html', import.meta.url), page);
console.log('preview.html', page.length);
