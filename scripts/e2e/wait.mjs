// "Herkes hazır": takılan biri olunca oda bekler, hazır olunca ya da süre dolunca devam eder.
const base = process.argv[2] ?? 'ws://localhost:8787';
const room = 'wait' + Math.random().toString(36).slice(2, 8);
const V = Number(process.env.SWM_V ?? 3);
function client(hello) {
  const ws = new WebSocket(`${base}/api/rooms/${room}/ws`);
  const inbox = [];
  ws.addEventListener('message', (e) => inbox.push(JSON.parse(e.data)));
  ws.addEventListener('open', () => ws.send(JSON.stringify({ t: 'hello', v: V, ...hello })));
  const wait = async (pred, label, ms = 10000) => {
    for (let i = 0; i < ms / 100; i++) {
      const idx = inbox.findIndex(pred);
      if (idx >= 0) return inbox.splice(idx, 1)[0];
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error('timeout ' + label);
  };
  return { ws, wait, inbox, send: (m) => ws.send(JSON.stringify(m)) };
}
const ok = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('ok  ' + m); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const a = client({ name: 'Ali', cid: 'waitAli000001' });
const wa = await a.wait((m) => m.t === 'welcome', 'welcome a');
ok(wa.settings?.waitForAll === true && Array.isArray(wa.waiting), 'Bekleme varsayılan olarak açık');
const b = client({ name: 'Ayse', cid: 'waitAyse00001' });
const wb = await b.wait((m) => m.t === 'welcome', 'welcome b');

a.send({ t: 'enqueue', media: { kind: 'youtube', id: 'aqz-KE-bpKQ' } });
await b.wait((m) => m.t === 'state' && m.action === 'load', 'load');

b.send({ t: 'ready', ready: false });
const p = await a.wait((m) => m.t === 'state' && m.by.id === 'system', 'auto pause');
const w1 = await a.wait((m) => m.t === 'waiting' && m.ids.length === 1, 'waiting list');
ok(p.state.paused && w1.ids[0] === wb.you, 'Ayşe takılınca oda durdu ve onu bekliyor');

b.send({ t: 'ready', ready: true });
const r = await a.wait((m) => m.t === 'state' && m.by.id === 'system', 'auto resume');
await a.wait((m) => m.t === 'waiting' && m.ids.length === 0, 'waiting cleared');
ok(!r.state.paused && Math.abs(r.state.position - p.state.position) < 0.5, 'Ayşe hazır olunca kaldığı yerden devam etti');

// Can katılır ve takılır; süre dolunca oda onsuz devam eder.
const c = client({ name: 'Can', cid: 'waitCan000001' });
const wc = await c.wait((m) => m.t === 'welcome', 'welcome c');
c.send({ t: 'ready', ready: false });
await a.wait((m) => m.t === 'waiting' && m.ids.includes(wc.you), 'waiting for can');
const t0 = Date.now();
const timeout = await a.wait((m) => m.t === 'state' && m.by.id === 'system' && !m.state.paused, 'timeout resume', 16000);
ok(timeout && Date.now() - t0 > 10000, `Can hazır olmayınca ${Math.round((Date.now() - t0) / 1000)} sn sonra oda onsuz devam etti`);

await sleep(300);
a.inbox.length = 0;
c.send({ t: 'ready', ready: true });
c.send({ t: 'ready', ready: false });
await sleep(800);
ok(!a.inbox.some((m) => m.t === 'state' && m.by.id === 'system'), 'Can hemen tekrar bekletemiyor (bekleme arası)');

// Elle hareket beklemeyi iptal eder. (Ayşe ve Can bekleme arasında; yeni biri gelir.)
const d = client({ name: 'Deniz', cid: 'waitDeniz0001' });
await d.wait((m) => m.t === 'welcome', 'welcome d');
d.send({ t: 'ready', ready: false });
await a.wait((m) => m.t === 'waiting' && m.ids.length === 1, 'waiting d');
a.send({ t: 'play', position: 30, at: Date.now() });
await a.wait((m) => m.t === 'waiting' && m.ids.length === 0, 'cancel by manual play');
ok(true, 'Ali elle oynatınca bekleme iptal oldu');

// Yönetici olmayan ayarı değiştiremez; yönetici kapatınca bekleme olmaz.
b.send({ t: 'settings', waitForAll: false });
const nh = await b.wait((m) => m.t === 'error', 'not host');
ok(nh.code === 'not_host', 'Yönetici olmayan ayarı değiştiremez');
a.send({ t: 'settings', waitForAll: false });
await b.wait((m) => m.t === 'settings' && m.settings.waitForAll === false, 'settings off');
a.inbox.length = 0;
d.send({ t: 'ready', ready: true });
d.send({ t: 'ready', ready: false });
await sleep(800);
ok(!a.inbox.some((m) => m.t === 'state' && m.by.id === 'system'), 'Bekleme kapalıyken oda durmuyor');

for (const k of [a, b, c, d]) k.ws.close();
setTimeout(() => process.exit(0), 100);
