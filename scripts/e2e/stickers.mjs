// Özel emojiler: eklenen resim odaya kaydedilir, herkese gider, sonradan gelen girişte alır,
// onunla tepki verilebilir; SVG gibi raster olmayan veri reddedilir.
const base = process.argv[2] ?? 'ws://localhost:8787';
const room = 'stik' + Math.random().toString(36).slice(2, 8);
function client(hello) {
  const ws = new WebSocket(`${base}/api/rooms/${room}/ws`);
  const inbox = [];
  ws.addEventListener('message', (e) => inbox.push(JSON.parse(e.data)));
  ws.addEventListener('open', () => ws.send(JSON.stringify({ t: 'hello', v: 3, ...hello })));
  const wait = async (pred, label) => {
    for (let i = 0; i < 100; i++) {
      const idx = inbox.findIndex(pred);
      if (idx >= 0) return inbox.splice(idx, 1)[0];
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error('timeout ' + label);
  };
  return { ws, wait, inbox, send: (m) => ws.send(JSON.stringify(m)) };
}
const ok = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('ok  ' + m); };

// 1×1 png
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const ali = client({ name: 'Ali', cid: 'stikAli12345' });
await ali.wait((m) => m.t === 'welcome', 'welcome ali');
const ayse = client({ name: 'Ayse', cid: 'stikAyse1234' });
await ayse.wait((m) => m.t === 'welcome', 'welcome ayse');

ali.send({ t: 'sticker-add', data: PNG });
const got = await ayse.wait((m) => m.t === 'sticker', 'sticker');
ok(got.sticker.data === PNG && /^[0-9a-f]{12}$/.test(got.sticker.id), 'Eklenen özel emoji odadakilere gidiyor');

ayse.send({ t: 'react', sticker: got.sticker.id });
const r = await ali.wait((m) => m.t === 'reaction', 'sticker reaction');
ok(r.sticker === got.sticker.id && r.by.name === 'Ayse' && r.emoji === undefined, 'Özel emojiyle tepki verilebiliyor');

const can = client({ name: 'Can', cid: 'stikCan12345' });
await can.wait((m) => m.t === 'welcome', 'welcome can');
const late = await can.wait((m) => m.t === 'sticker', 'late sticker');
ok(late.sticker.id === got.sticker.id, 'Sonradan gelen, odanın özel emojilerini girişte alıyor');

// Gerçek boyutlu (≈200 KB'lık GIF kadar) özel emoji de geçmeli: genel 4 KB mesaj sınırına takılmasın.
const BIG = 'data:image/gif;base64,' + 'R0lGODlh'.repeat(25_000);
ali.send({ t: 'sticker-add', data: BIG });
const big = await ayse.wait((m) => m.t === 'sticker', 'big sticker');
ok(big.sticker.data === BIG, `Büyük özel emoji (${Math.round(BIG.length / 1000)} KB) odaya ekleniyor`);

ali.send({ t: 'sticker-add', data: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=' });
const err = await ali.wait((m) => m.t === 'error', 'svg refused');
ok(err.code === 'bad_message', 'SVG (betik taşıyabilir) reddediliyor');

ayse.inbox.length = 0;
ali.send({ t: 'react', sticker: 'ffffffffffff' });
await new Promise((res) => setTimeout(res, 600));
ok(!ayse.inbox.some((m) => m.t === 'reaction'), 'Odada olmayan özel emojiyle tepki yayılmıyor');

for (const c of [ali, ayse, can]) c.ws.close();
setTimeout(() => process.exit(0), 100);
