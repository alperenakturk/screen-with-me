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

const alex = client({ name: 'Alex', cid: 'stikAlex12345' });
await alex.wait((m) => m.t === 'welcome', 'welcome alex');
const sam = client({ name: 'Sam', cid: 'stikSam1234' });
await sam.wait((m) => m.t === 'welcome', 'welcome sam');

alex.send({ t: 'sticker-add', data: PNG });
const got = await sam.wait((m) => m.t === 'sticker', 'sticker');
ok(got.sticker.data === PNG && /^[0-9a-f]{12}$/.test(got.sticker.id), 'Eklenen özel emoji odadakilere gidiyor');
ok(got.mine === undefined, 'Others do not get the "mine" flag');
const own = await alex.wait((m) => m.t === 'sticker', 'own sticker');
ok(own.mine === true, 'The person who added it gets "mine"');

sam.send({ t: 'react', sticker: got.sticker.id });
const r = await alex.wait((m) => m.t === 'reaction', 'sticker reaction');
ok(r.sticker === got.sticker.id && r.by.name === 'Sam' && r.emoji === undefined, 'Özel emojiyle tepki verilebiliyor');

const max = client({ name: 'Max', cid: 'stikMax12345' });
await max.wait((m) => m.t === 'welcome', 'welcome can');
const late = await max.wait((m) => m.t === 'sticker', 'late sticker');
ok(late.sticker.id === got.sticker.id, 'Sonradan gelen, odanın özel emojilerini girişte alıyor');
ok(late.mine === undefined, 'A latecomer does not get "mine" for someone else\'s emoji');

// Alex reloads (same browser id): the room tells him which emoji is his, so he can still remove it.
const alex2 = client({ name: 'Alex', cid: 'stikAlex12345' });
await alex2.wait((m) => m.t === 'welcome', 'welcome alex2');
const again = await alex2.wait((m) => m.t === 'sticker', 'sticker after reload');
ok(again.mine === true, 'After a reload the adder still gets "mine"');
alex2.ws.close();

// Gerçek boyutlu (≈200 KB'lık GIF kadar) özel emoji de geçmeli: genel 4 KB mesaj sınırına takılmasın.
const BIG = 'data:image/gif;base64,' + 'R0lGODlh'.repeat(25_000);
alex.send({ t: 'sticker-add', data: BIG });
const big = await sam.wait((m) => m.t === 'sticker', 'big sticker');
ok(big.sticker.data === BIG, `Büyük özel emoji (${Math.round(BIG.length / 1000)} KB) odaya ekleniyor`);

alex.send({ t: 'sticker-add', data: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=' });
const err = await alex.wait((m) => m.t === 'error', 'svg refused');
ok(err.code === 'bad_message', 'SVG (betik taşıyabilir) reddediliyor');

sam.inbox.length = 0;
alex.send({ t: 'react', sticker: 'ffffffffffff' });
await new Promise((res) => setTimeout(res, 600));
ok(!sam.inbox.some((m) => m.t === 'reaction'), 'Odada olmayan özel emojiyle tepki yayılmıyor');

// Removing all custom emojis: host only.
sam.inbox.length = 0;
sam.send({ t: 'sticker-clear' });
const notHost = await sam.wait((m) => m.t === 'error', 'clear refused');
ok(notHost.code === 'not_host', 'Only the host can remove all custom emojis');
alex.send({ t: 'sticker-clear' });
const removed = [await max.wait((m) => m.t === 'sticker-removed', 'cleared 1'), await max.wait((m) => m.t === 'sticker-removed', 'cleared 2')];
ok(removed.length === 2, 'The host removes every custom emoji for everyone');
const dan = client({ name: 'Dan', cid: 'stikDan12345' });
await dan.wait((m) => m.t === 'welcome', 'welcome dan');
await new Promise((res) => setTimeout(res, 400));
ok(!dan.inbox.some((m) => m.t === 'sticker'), 'After clearing, newcomers get no custom emojis');
dan.ws.close();

for (const c of [alex, sam, max]) c.ws.close();
setTimeout(() => process.exit(0), 100);
