// Avatar: hello ile gönderilir, üye listesinde, sohbette ve tepkide görünür; eski istemci avatarsız katılabilir.
const base = process.argv[2] ?? 'ws://localhost:8787';
const room = 'av' + Math.random().toString(36).slice(2, 8);
function client(hello) {
  const ws = new WebSocket(`${base}/api/rooms/${room}/ws`);
  const inbox = [];
  ws.addEventListener('message', (e) => inbox.push(JSON.parse(e.data)));
  ws.addEventListener('open', () => ws.send(JSON.stringify({ t: 'hello', v: 3, ...hello })));
  const wait = async (pred) => {
    for (let i = 0; i < 40; i++) {
      const i2 = inbox.findIndex(pred);
      if (i2 >= 0) return inbox.splice(i2, 1)[0];
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error('timeout');
  };
  return { ws, wait, send: (m) => ws.send(JSON.stringify(m)) };
}
const ok = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('ok  ' + m); };

const a = client({ name: 'Ali', avatar: '🦊' });
await a.wait((m) => m.t === 'welcome');
const b = client({ name: 'Eski' }); // avatarsız (eski sürüm)
const wb = await b.wait((m) => m.t === 'welcome');
ok(wb.members.find((m) => m.name === 'Ali')?.avatar === '🦊', 'Üye listesinde avatar görünüyor');
ok(wb.members.find((m) => m.name === 'Eski') && !('avatar' in wb.members.find((m) => m.name === 'Eski')), 'Avatarsız eski istemci de katılabildi');
const c = client({ name: 'Hacker', avatar: '<img src=x onerror=alert(1)>' });
const wc = await c.wait((m) => m.t === 'welcome');
ok(!('avatar' in wc.members.find((m) => m.name === 'Hacker')), 'Geçersiz avatar sessizce yok sayıldı');
a.send({ t: 'chat', text: 'selam' });
const chat = await b.wait((m) => m.t === 'chat');
ok(chat.message.by.avatar === '🦊', 'Sohbet mesajında avatar var');
a.send({ t: 'react', emoji: '🔥' });
const r = await b.wait((m) => m.t === 'reaction');
ok(r.by.avatar === '🦊', 'Tepkide avatar var');
for (const k of [a, b, c]) k.ws.close();
setTimeout(() => process.exit(0), 100);
