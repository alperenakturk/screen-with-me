// Odada "başka bir kullanıcı" gibi tek bir komut çalıştırır ve odanın son durumunu yazar.
//   node ctl.mjs ODA load | play 3 | pause 4 | seek 2 | rate 1.5 | react | chat metin | status
const [room, action, value] = process.argv.slice(2);
const ws = new WebSocket(`${process.env.SWM_BASE ?? 'ws://localhost:8787'}/api/rooms/${room}/ws`);
let state = null;
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.t === 'welcome' || m.t === 'state') state = m.state;
  if (m.t === 'welcome') {
    const at = Date.now();
    const pos = Number(value ?? 0);
    const msg = {
      load: { t: 'load', media: { kind: 'page', url: 'http://localhost:5199/' }, title: 'Test sayfası' },
      play: { t: 'play', position: pos, at },
      pause: { t: 'pause', position: pos, at },
      seek: { t: 'seek', position: pos, at },
      rate: { t: 'rate', rate: Number(value), position: 0, at },
      react: { t: 'react', emoji: '🔥' },
      chat: { t: 'chat', text: value ?? 'merhaba' },
    }[action];
    if (msg) ws.send(JSON.stringify(msg));
    setTimeout(() => {
      const s = state;
      const now = Date.now();
      const expected = s?.paused ? s.position : s ? s.position + ((now - s.updatedAt) / 1000) * s.rate : null;
      console.log(JSON.stringify({ paused: s?.paused, rate: s?.rate, expectedNow: expected && Number(expected.toFixed(2)), serverNow: now }));
      ws.close();
      process.exit(0);
    }, 400);
  }
});
ws.addEventListener('open', () => ws.send(JSON.stringify({ t: 'hello', v: 3, name: 'Kontrol' })));
