# Builds preview.html (the owner's pick page for R20) from the option SVGs + the current files in ../full/.
import base64, os
H = os.path.dirname(os.path.abspath(__file__))
def uri(p): return 'data:image/svg+xml;base64,' + base64.b64encode(open(p, 'rb').read()).decode()
old = {k: uri(os.path.join(H, '..', 'full', k + '.svg')) for k in ('sponge', 'squid')}
final_sponge = uri(os.path.join(H, 'sponge.svg'))
sq = {c: uri(os.path.join(H, f'squid-{c}.svg')) for c in 'DEF'}
SQ = {'D': ('Sıkılmış', 'İki göz kapağı yarıya kadar inik, ağız düz. Klasik, dümdüz bakış; yumuşak mavi ışık.'),
      'E': ('Hiç etkilenmemiş', 'Bir kapak daha aşağıda, gözler yana kaymış, hafif yan ağız. Kum rengi zemin.'),
      'F': ('Klarnetiyle', 'D gibi ağır kapaklı, elinde klarneti. Açık leylak zemin.')}
fig = lambda u, t, d, cls='old': f'<figure class="{cls}"><img src="{u}" alt="{t}" width="120" height="120"><figcaption><b>{t}</b><span>{d}</span></figcaption></figure>'
cards = ('<section class="q"><header><span class="n">✓</span><div><h2>Sünger: C, iki eli havada</h2>'
         '<p>Seçtiğin C, dediğin gibi iki eli havada sevinirken. Seçecek bir şey yok, sadece son hali.</p></div></header>'
         f'<div class="row two">{fig(old["sponge"], "Şimdiki", "Değişecek olan")}{fig(final_sponge, "Yeni", "Bunu kuracağız", "done")}</div></section>')
items = fig(old['squid'], 'Şimdiki', 'Ürkünç olan')
for c, (t, d) in SQ.items():
    star = '<em class="rec">Önerim</em>' if c == 'D' else ''
    items += (f'<label class="opt"><input type="radio" name="q2" value="{c}" id="q2{c}">'
              f'<img src="{sq[c]}" alt="Ahtapot {c}: {t}" width="120" height="120">'
              f'<span class="t"><b>{c} · {t}</b>{star}</span><span class="d">{d}</span></label>')
tiny = ''.join(f'<span><img src="{u}" alt="" width="32" height="32"><i>{l}</i></span>' for l, u in [('Şimdiki', old['squid'])] + [(c, sq[c]) for c in 'DEF'])
cards += ('<section class="q"><header><span class="n">2</span><div><h2>Ahtapot, ikinci tur</h2>'
          '<p>"Hiç gerçekçi değil" dedin. Bu sefer karakterin kendisine yakın: uzun sarkık kafa, büyük sarkık burun, '
          'ağır yarı kapalı göz kapakları, kahve tişört, soluk yeşil ten. Ama kırmızı göz yok, karanlık yok: sadece canı sıkılmış.</p></div></header>'
          f'<div class="row">{items}</div><div class="tiny" aria-label="Uygulamadaki gerçek boyut"><small>Uygulamadaki boyutu:</small>{tiny}</div></section>')

page = f'''<title>Sünger ve Ahtapot</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Nunito+Sans:wght@400;600;700&display=swap">
<style>
/* Layout: one column of two pick cards (old → options), a sticky summary bar at the foot. Sidelit night gold. */
:root{{--bg:#f6f3ff;--panel:#ffffff;--ink:#1d1430;--muted:#5d5480;--line:#ddd6f2;--gold:#b37a00;--gold-soft:#fff2cf;--pick:#6a4cf2;
--display:"Bricolage Grotesque",system-ui,sans-serif;--body:"Nunito Sans",system-ui,sans-serif}}
@media (prefers-color-scheme:dark){{:root:not([data-theme="light"]){{--bg:#0d0a22;--panel:#18123a;--ink:#f3eeff;--muted:#b9b0dc;--line:#2e2660;--gold:#ffc65a;--gold-soft:#3a2c10;--pick:#9a84ff;color-scheme:dark}}}}
:root[data-theme="dark"]{{--bg:#0d0a22;--panel:#18123a;--ink:#f3eeff;--muted:#b9b0dc;--line:#2e2660;--gold:#ffc65a;--gold-soft:#3a2c10;--pick:#9a84ff;color-scheme:dark}}
body{{background:var(--bg);color:var(--ink);font:16px/1.45 var(--body);padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));padding-block:28px 140px}}
main{{max-width:880px;margin:0 auto;display:grid;gap:22px}}
h1{{font:800 clamp(28px,5vw,40px)/1.05 var(--display);letter-spacing:-.02em;margin:0;text-wrap:balance}}
.lede{{color:var(--muted);margin:6px 0 0;max-width:62ch}}
.q{{background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:18px;display:grid;gap:14px}}
.q header{{display:flex;gap:12px;align-items:flex-start}}
.n{{flex:none;width:34px;height:34px;border-radius:50%;background:var(--gold-soft);color:var(--gold);font:800 18px/34px var(--display);text-align:center}}
h2{{font:800 22px/1.1 var(--display);margin:2px 0 4px}} .q p{{margin:0;color:var(--muted);max-width:62ch}}
.row{{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}} .row.two{{grid-template-columns:repeat(2,minmax(0,200px))}}
figure.done{{border:1.5px solid var(--gold)}}
@media (max-width:640px){{.row{{grid-template-columns:repeat(2,minmax(0,1fr))}}}}
figure,.opt{{margin:0;display:grid;justify-items:center;align-content:start;gap:6px;padding:12px 8px;border-radius:14px;text-align:center;min-width:0}}
figure.old{{opacity:.8;border:1.5px dashed var(--line)}}
figure figcaption{{display:grid;gap:2px;font-size:14px}} figure span{{color:var(--muted);font-size:13px}}
.opt{{border:1.5px solid var(--line);cursor:pointer;position:relative}}
.opt:hover{{border-color:var(--pick)}}
.opt input{{position:absolute;opacity:0;pointer-events:none}}
.opt:has(input:checked){{border-color:var(--pick);box-shadow:0 0 0 2px var(--pick)}}
.opt:has(input:focus-visible){{outline:3px solid var(--gold);outline-offset:2px}}
.opt:has(input:checked)::after{{content:"✓ Seçtin";position:absolute;top:8px;right:8px;background:var(--pick);color:#fff;font:700 12px/1 var(--body);padding:4px 7px;border-radius:99px}}
img{{width:min(120px,100%);height:auto;border-radius:50%}}
.t{{display:grid;gap:4px;justify-items:center;font-size:15px}} .d{{font-size:13px;color:var(--muted)}}
.rec{{font-style:normal;font-size:12px;font-weight:700;color:var(--gold);background:var(--gold-soft);padding:2px 8px;border-radius:99px;letter-spacing:.02em}}
.tiny{{display:flex;flex-wrap:wrap;gap:14px;align-items:center;padding-top:10px;border-top:1px solid var(--line)}}
.tiny small{{color:var(--muted);font-size:13px}} .tiny span{{display:flex;gap:6px;align-items:center;font-size:13px;color:var(--muted)}} .tiny img{{width:32px}} .tiny i{{font-style:normal}}
.note{{color:var(--muted);font-size:14px;margin:0}}
textarea{{width:100%;box-sizing:border-box;min-height:64px;border-radius:12px;border:1px solid var(--line);background:var(--panel);color:var(--ink);font:15px var(--body);padding:10px}}
.bar{{position:fixed;left:0;right:0;bottom:0;background:var(--panel);border-top:1px solid var(--line);padding:12px max(16px,env(safe-area-inset-right,0px)) calc(12px + env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-left,0px))}}
.bar div{{max-width:880px;margin:0 auto;display:flex;gap:12px;align-items:center;flex-wrap:wrap}}
#summary{{flex:1;min-width:0;font:700 15px var(--body);word-break:break-word}}
button{{font:700 15px var(--body);border:0;border-radius:12px;padding:11px 18px;background:var(--pick);color:#fff;cursor:pointer}}
button:focus-visible{{outline:3px solid var(--gold);outline-offset:2px}}
</style>
<main>
<div><h1>Sünger ve Ahtapot</h1><p class="lede">İkinci tur. Sünger senin seçtiğin C, iki eli havada. Ahtapotu baştan çizdim: üç yeni seçenekten birini seç. Denizyıldızı olduğu gibi kalıyor.</p></div>
{cards}
<label class="note" for="note">İstersen bir not ekle:</label>
<textarea id="note" placeholder="İsteğe bağlı, ör. D ama biraz daha somurtkan"></textarea>
</main>
<div class="bar"><div><span id="summary">Henüz seçim yok</span><button id="copy" type="button">Kopyala</button></div></div>
<script>
const sum=document.getElementById('summary'),note=document.getElementById('note'),btn=document.getElementById('copy');
function text(){{const p=[];for(const n of ['1','2']){{const c=document.querySelector('input[name=q'+n+']:checked');if(c)p.push(n+': '+c.value)}}
if(!p.length)return '';let t='Avatar (R20) ikinci tur: Sünger C (iki el havada) · Ahtapot '+p.join(' · ').replace('2: ','');if(note.value.trim())t+=' — Not: '+note.value.trim();return t}}
function draw(){{sum.textContent=text()||'Henüz seçim yok'}}
document.addEventListener('change',draw);note.addEventListener('input',draw);
btn.addEventListener('click',async()=>{{const t=text()||'Avatar (R20) ikinci tur: (ahtapot seçilmedi)';try{{await navigator.clipboard.writeText(t);btn.textContent='Kopyalandı ✓'}}catch(e){{const r=document.createRange();r.selectNodeContents(sum);const s=getSelection();s.removeAllRanges();s.addRange(r);btn.textContent='Seçili, kopyala'}}setTimeout(()=>btn.textContent='Kopyala',1800)}});
draw();
</script>
'''
open(os.path.join(H, 'preview.html'), 'w', encoding='utf-8').write(page)
print('preview.html', len(page))
