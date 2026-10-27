// Oda içindeki oyunlar: odada aynı anda tek oyun; açanı ya da yönetici değiştirir/bitirir, başkası açamaz
// (game_busy); yeni gelen açık oyunu welcome'da görür; oyunun kimliği oyun nesnesinde gerçekten açılır.
const base = process.argv[2] ?? 'ws://localhost:8787';
const room = 'rgame' + Math.random().toString(36).slice(2, 8);
const V = Number(process.env.SWM_V ?? 3);
function client(hello) {
  const ws = new WebSocket(`${base}/api/rooms/${room}/ws`);
  const inbox = [];
  ws.addEventListener('message', (e) => inbox.push(JSON.parse(e.data)));
  ws.addEventListener('open', () => ws.send(JSON.stringify({ t: 'hello', v: V, ...hello })));
  const wait = async (pred, label, ms = 8000) => {
    for (let i = 0; i < ms / 50; i++) {
      const idx = inbox.findIndex(pred);
      if (idx >= 0) return inbox.splice(idx, 1)[0];
      await new Promise((r) => setTimeout(r, 50));
    }
    throw new Error('timeout ' + label);
  };
  return { ws, wait, inbox, send: (m) => ws.send(JSON.stringify(m)) };
}
const ok = (c, m) => {
  if (!c) throw new Error('FAIL: ' + m);
  console.log('ok  ' + m);
};

const a = client({ name: 'Ali', cid: 'rgameAli00001' });
const wa = await a.wait((m) => m.t === 'welcome', 'welcome a');
ok(wa.game === undefined, 'Yeni odada açık oyun yok');
const b = client({ name: 'Ayse', cid: 'rgameAyse0001' });
await b.wait((m) => m.t === 'welcome', 'welcome b');

a.send({ t: 'game', kind: 'xox' });
const ga = await a.wait((m) => m.t === 'game', 'game a');
const gb = await b.wait((m) => m.t === 'game', 'game b');
ok(ga.game.kind === 'xox' && ga.game.by.name === 'Ali' && /^[A-Za-z0-9_-]{3,40}$/.test(ga.game.id), 'Ali XOX açtı (herkese gitti)');
ok(gb.game.id === ga.game.id, 'Herkes aynı oyunu görüyor');
ok(!JSON.stringify(ga).includes('rgameAli'), 'Açanın kalıcı kimliği gönderilmiyor');

b.send({ t: 'game', kind: 'draw' });
ok((await b.wait((m) => m.t === 'error', 'busy')).code === 'game_busy', 'Başkasının oyunu sürerken oyun açılamıyor (game_busy)');
b.send({ t: 'game', end: true });
ok((await b.wait((m) => m.t === 'error', 'end')).code === 'not_host', 'Açmayan, yönetici olmayan bitiremiyor');

a.send({ t: 'game', kind: 'draw' });
const draw = await b.wait((m) => m.t === 'game', 'switch');
ok(draw.game.kind === 'draw' && draw.game.id !== ga.game.id, 'Açan başka oyuna geçti (yeni kimlik)');

// Oyun nesnesi bu kimlikle açılıyor.
const dws = new WebSocket(`${base}/api/draw/${draw.game.id}/ws`);
const drawWelcome = await new Promise((resolve, reject) => {
  dws.addEventListener('open', () => dws.send(JSON.stringify({ t: 'hello', v: 1, name: 'Ayse', cid: 'rgameAyse0001', lang: 'tr' })));
  dws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.t === 'welcome' || m.t === 'error') resolve(m);
  });
  setTimeout(() => reject(new Error('timeout draw')), 8000);
});
dws.close();
ok(drawWelcome.t === 'welcome', 'Çiz-Bil nesnesi odanın verdiği kimlikle açıldı');

const c = client({ name: 'Can', cid: 'rgameCan00001' });
const wc = await c.wait((m) => m.t === 'welcome', 'welcome c');
ok(wc.game?.id === draw.game.id, 'Sonradan gelen açık oyunu görüyor');

a.send({ t: 'game', end: true });
const ended = await c.wait((m) => m.t === 'game', 'end');
ok(ended.game === null && ended.by?.name === 'Ali', 'Açan oyunu bitirdi');

// Yönetici başkasının oyununu bitirebilir.
b.send({ t: 'game', kind: 'quiz' });
await a.wait((m) => m.t === 'game' && m.game?.kind === 'quiz', 'quiz');
a.send({ t: 'game', end: true });
const hostEnd = await b.wait((m) => m.t === 'game' && m.game === null, 'host end');
ok(hostEnd.by?.name === 'Ali', 'Yönetici başkasının oyununu bitirdi');

b.send({ t: 'game', kind: 'chess' });
ok((await b.wait((m) => m.t === 'error', 'bad')).code === 'bad_message', 'Bilinmeyen oyun reddedildi');

for (const x of [a, b, c]) x.ws.close();
console.log('roomgame: hepsi geçti');
