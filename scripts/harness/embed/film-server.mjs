// "Film sitenin içinde" testi için sahte bir video sitesi. İki portta çalışır:
//   5299: film sayfaları (çerçeveye izin veren / vermeyen)
//   5300: oynatıcı çerçevesi (gerçek sitelerdeki gibi başka kökenden gelen iframe)
//
//   /film         izin verir, video sayfanın içinde
//   /film-nested  izin verir, video başka kökenden bir oynatıcı iframe'inde
//   /deny         X-Frame-Options: DENY
//   /csp          Content-Security-Policy: frame-ancestors 'none'
//   /deny-nested  X-Frame-Options: DENY + video başka kökenden oynatıcı iframe'inde (oda görünümü testi)
//   /sneaky       sadece iframe isteğinde DENY (önceden kontrol göremez; el sıkışma yakalar)
//   /late         video "oynat"a basınca oluşur, başka kökenden oynatıcı iframe'inde (çoğu sitedeki gibi;
//                 "Filmi başlat" kartının testi)
//   /two          iki video: üstte büyük bir "fragman", altta daha küçük asıl film (otomatik seçim büyüğü tutar;
//                 elle video seçimi testi)
//   /popup        ilk tıklamada başka siteye (127.0.0.2) yeni sekme açar (reklam sekmesini kapatma testi)
//   /redirect     ilk tıklamada sekmeyi başka siteye götürür ("Filme geri dön" testi)
//   /preroll      önce kısa bir "reklam" videosu, bitince aynı <video>'da film ("reklamda" testi; FILM_AD gerekir)
//   /ad           reklam sayfası (127.0.0.2'den açılır)
//
// İnternetsiz ortamda: FILM_VIDEO=/yol/video.webm verilirse video oradan (/video.webm) sunulur.
// Video: Big Buck Bunny (CC BY 3.0, Blender Foundation), Wikimedia Commons.
//   node scripts/harness/embed/film-server.mjs
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';

const LOCAL_VIDEO = process.env.FILM_VIDEO;
/** Kısa (ör. 12 sn) bir "reklam" videosu: /preroll sayfası için. */
const AD_VIDEO = process.env.FILM_AD;
const VIDEO = LOCAL_VIDEO
  ? 'http://localhost:5300/video.webm'
  : 'https://upload.wikimedia.org/wikipedia/commons/transcoded/c/c0/Big_Buck_Bunny_4K.webm/Big_Buck_Bunny_4K.webm.480p.vp9.webm';

/** Yerel videoyu parça parça (Range) sunar; tarayıcı sarabilsin diye. */
function sendVideo(req, res, file = LOCAL_VIDEO) {
  const size = statSync(file).size;
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? '');
  const start = m && m[1] ? Number(m[1]) : 0;
  const end = m && m[2] ? Number(m[2]) : size - 1;
  res.writeHead(m ? 206 : 200, {
    'content-type': 'video/webm',
    'accept-ranges': 'bytes',
    'content-length': end - start + 1,
    'access-control-allow-origin': '*',
    ...(m ? { 'content-range': `bytes ${start}-${end}/${size}` } : {}),
  });
  createReadStream(file, { start, end }).pipe(res);
}
const PLAYER_ORIGIN = 'http://localhost:5300';

const page = (title, body) => `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
  body { margin: 0; font: 15px system-ui, sans-serif; background: #f3f1ea; color: #222; }
  header { background: #234; color: #fff; padding: 12px 20px; display: flex; gap: 18px; align-items: center; }
  header b { font-size: 18px; } header a { color: #cde; }
  main { max-width: 960px; margin: 16px auto; padding: 0 16px; }
  .player { position: relative; background: #000; aspect-ratio: 16/9; }
  .player video, .player iframe { width: 100%; height: 100%; border: 0; display: block; }
  .fs { position: absolute; right: 8px; top: 8px; z-index: 2; } .pp { position: absolute; left: 8px; top: 8px; z-index: 2; }
  p.note { color: #555; }
</style></head>
<body><header><b>Örnek Video Sitesi</b><a href="#">Ana sayfa</a><a href="#">Filmler</a><a href="#">Hakkında</a></header>
<main><h1>${title}</h1>${body}<p class="note">Test sayfası · Video: Big Buck Bunny (CC BY 3.0, Blender Foundation)</p></main></body></html>`;

const videoTag = `<div class="player" id="box"><button class="fs" id="fs">⛶ Tam ekran</button><button class="pp" id="pp">⏯ Oynat/Durdur</button>
<video id="v" controls playsinline preload="auto" src="${VIDEO}"></video></div>
<script>
document.getElementById('fs').onclick = () => document.getElementById('box').requestFullscreen();
const v = document.getElementById('v');
document.getElementById('pp').onclick = () => (v.paused ? v.play() : v.pause());
</script>`;

const film = (title) => page(title, videoTag);
// Film sayfası + belgenin her yerine "ilk tıklamada reklam" dinleyicisi (reklam betiklerinin yaptığı gibi).
const AD_PAGE = 'http://127.0.0.2:5299/ad';
const popup = page(
  'Açılır pencereli sayfa',
  `${videoTag}<script>let opened = false; document.addEventListener('click', () => { if (opened) return; opened = true; window.open('${AD_PAGE}', '_blank'); }, true);</script>`,
);
const redirect = page(
  'Yönlendiren sayfa',
  `${videoTag}<script>let gone = false; document.addEventListener('click', () => { if (gone) return; gone = true; location.href = '${AD_PAGE}'; }, true);</script>`,
);
const preroll = page(
  'Ön-reklamlı sayfa',
  `<div class="player" id="box"><video id="v" controls playsinline autoplay muted src="${PLAYER_ORIGIN}/ad.webm"></video></div>
<script>
const v = document.getElementById('v');
v.addEventListener('ended', () => { if (v.src.includes('/ad.webm')) { v.src = '${VIDEO}'; v.muted = false; } }, { once: true });
</script>`,
);
const adPage = page('Reklam', '<p style="font-size:40px">REKLAM</p>');
const two = page(
  'İki videolu sayfa',
  `<h2>Fragman</h2><div class="player" id="bigbox"><video id="big" controls playsinline preload="auto" src="${VIDEO}"></video></div>
<h2>Film</h2><div class="player" id="smallbox" style="width:60%"><video id="small" controls playsinline preload="auto" src="${VIDEO}"></video></div>`,
);
const nestedPage = (title) => page(title, `<div class="player"><iframe src="${PLAYER_ORIGIN}/player" allow="autoplay; fullscreen" allowfullscreen></iframe></div>`);
const nested = nestedPage('İç içe oynatıcı');
// Video yok; "oynat"a basınca oynatıcı iframe'i yüklenir (gerçek sitelerdeki gibi).
const late = page('Oynatınca yüklenen oynatıcı', `<div class="player" id="slot" style="display:grid;place-items:center;cursor:pointer">
<button id="go" style="font-size:22px;padding:14px 28px">▶ Filmi oynat</button></div>
<script>
document.getElementById('go').onclick = () => {
  document.getElementById('slot').innerHTML = '<iframe src="${PLAYER_ORIGIN}/player?autoplay=1" allow="autoplay; fullscreen" allowfullscreen></iframe>';
};
</script>`);
const player = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;height:100%;background:#000}
.player{position:relative;height:100%}.player video{width:100%;height:100%;display:block}.fs{position:absolute;right:8px;top:8px;z-index:2}.pp{position:absolute;left:8px;top:8px;z-index:2}</style></head>
<body>${videoTag}</body></html>`;

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', ...headers });
  res.end(body);
}

createServer((req, res) => {
  const path = new URL(req.url, 'http://x').pathname;
  console.log(req.method, path, req.headers['sec-fetch-dest'] ?? '');
  if (path === '/film' || path === '/') return send(res, 200, film('Film sayfası (izin veriyor)'));
  if (path === '/film-nested') return send(res, 200, nested);
  if (path === '/late') return send(res, 200, late);
  if (path === '/two') return send(res, 200, two);
  if (path === '/popup') return send(res, 200, popup);
  if (path === '/redirect') return send(res, 200, redirect);
  if (path === '/preroll') return send(res, 200, preroll);
  if (path === '/ad') return send(res, 200, adPage);
  if (path === '/deny') return send(res, 200, film('Yasaklı sayfa (X-Frame-Options)'), { 'x-frame-options': 'DENY' });
  if (path === '/deny-nested') return send(res, 200, nestedPage('Yasaklı sayfa, iç içe oynatıcı'), { 'x-frame-options': 'DENY' });
  if (path === '/csp') return send(res, 200, film('Yasaklı sayfa (CSP)'), { 'content-security-policy': "frame-ancestors 'none'" });
  if (path === '/sneaky') {
    const framed = req.headers['sec-fetch-dest'] === 'iframe';
    return send(res, 200, film('Sinsi sayfa'), framed ? { 'x-frame-options': 'DENY' } : {});
  }
  send(res, 404, 'yok');
}).listen(5299, () => console.log('film sayfaları: http://localhost:5299'));

createServer((req, res) => {
  const path = new URL(req.url, 'http://x').pathname;
  if (path === '/player') return send(res, 200, player);
  if (path === '/video.webm' && LOCAL_VIDEO) return sendVideo(req, res);
  if (path === '/ad.webm' && AD_VIDEO) return sendVideo(req, res, AD_VIDEO);
  send(res, 404, 'yok');
}).listen(5300, () => console.log('oynatıcı: http://localhost:5300'));
