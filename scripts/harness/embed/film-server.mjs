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
//
// Video: Big Buck Bunny (CC BY 3.0, Blender Foundation), Wikimedia Commons.
//   node scripts/harness/embed/film-server.mjs
import { createServer } from 'node:http';

const VIDEO = 'https://upload.wikimedia.org/wikipedia/commons/transcoded/c/c0/Big_Buck_Bunny_4K.webm/Big_Buck_Bunny_4K.webm.480p.vp9.webm';
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
const nestedPage = (title) => page(title, `<div class="player"><iframe src="${PLAYER_ORIGIN}/player" allow="autoplay; fullscreen" allowfullscreen></iframe></div>`);
const nested = nestedPage('İç içe oynatıcı');
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
  if (new URL(req.url, 'http://x').pathname === '/player') return send(res, 200, player);
  send(res, 404, 'yok');
}).listen(5300, () => console.log('oynatıcı: http://localhost:5300'));
