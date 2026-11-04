// "Herkes hazır": takılan biri olunca oda bekler, hazır olunca ya da süre dolunca devam eder.
const base = process.argv[2] ?? 'ws://localhost:8787';
const room = 'wait' + Math.random().toString(36).slice(2, 8);
const V = Number(process.env.SWM_V ?? 3);
const clients = [];
function client(hello) {
  const ws = new WebSocket(`${base}/api/rooms/${room}/ws`);
  const inbox = [];
  let closed = null;
  ws.addEventListener('message', (e) => inbox.push(JSON.parse(e.data)));
  ws.addEventListener('open', () => ws.send(JSON.stringify({ t: 'hello', v: V, ...hello })));
  ws.addEventListener('close', (e) => (closed = `${e.code}${e.reason ? ' ' + e.reason : ''}`));
  const wait = async (pred, label, ms = 10000) => {
    for (let i = 0; i < ms / 100; i++) {
      const idx = inbox.findIndex(pred);
      if (idx >= 0) return inbox.splice(idx, 1)[0];
      await new Promise((r) => setTimeout(r, 100));
    }
    // Say whether the connections were still open: a server restart (a deploy reaching the room) closes them all.
    const sockets = clients.map((c) => `${c.name}: ${c.closed() ?? 'open'}`).join(', ');
    throw new Error(`${hello.name}: timeout ${label} · connections ${sockets}`);
  };
  clients.push({ name: hello.name, closed: () => closed });
  return { ws, wait, inbox, send: (m) => ws.send(JSON.stringify(m)) };
}
const ok = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('ok  ' + m); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const a = client({ name: 'Alex', cid: 'waitAlex000001' });
const wa = await a.wait((m) => m.t === 'welcome', 'welcome a');
ok(wa.settings?.waitForAll === true && Array.isArray(wa.waiting), 'Bekleme varsayılan olarak açık');

// Tek kişiyken bekleme yok: kişi kendi yüklemesi yüzünden odayı kendine durdurmaz.
a.send({ t: 'enqueue', media: { kind: 'youtube', id: 'aqz-KE-bpKQ' } });
await a.wait((m) => m.t === 'state' && m.action === 'load', 'load alone');
a.send({ t: 'ready', ready: false });
await sleep(800);
ok(!a.inbox.some((m) => m.t === 'state' && m.by.id === 'system'), 'Tek kişiyken takılınca oda durmuyor');
a.send({ t: 'ready', ready: true });

const b = client({ name: 'Sam', cid: 'waitSam00001' });
const wb = await b.wait((m) => m.t === 'welcome', 'welcome b');

// Filmden odaya dönüş haberi: gönderen hariç herkese gider.
a.inbox.length = 0;
b.send({ t: 'home' });
const home = await a.wait((m) => m.t === 'home', 'home');
await sleep(300);
ok(home.by.name === 'Sam' && !b.inbox.some((m) => m.t === 'home'), 'Sam odaya dönünce Alex haber aldı, Sam almadı');

b.send({ t: 'ready', ready: false });
const p = await a.wait((m) => m.t === 'state' && m.by.id === 'system', 'auto pause');
const w1 = await a.wait((m) => m.t === 'waiting' && m.ids.length === 1, 'waiting list');
ok(p.state.paused && w1.ids[0] === wb.you, 'Sam takılınca oda durdu ve onu bekliyor');

b.send({ t: 'ready', ready: true });
const r = await a.wait((m) => m.t === 'state' && m.by.id === 'system', 'auto resume');
await a.wait((m) => m.t === 'waiting' && m.ids.length === 0, 'waiting cleared');
ok(!r.state.paused && Math.abs(r.state.position - p.state.position) < 0.5, 'Sam hazır olunca kaldığı yerden devam etti');

// Max katılır ve takılır; süre dolunca oda onsuz devam eder.
const c = client({ name: 'Max', cid: 'waitMax000001' });
const wc = await c.wait((m) => m.t === 'welcome', 'welcome c');
c.send({ t: 'ready', ready: false });
await a.wait((m) => m.t === 'waiting' && m.ids.includes(wc.you), 'waiting for can');
const t0 = Date.now();
const timeout = await a.wait((m) => m.t === 'state' && m.by.id === 'system' && !m.state.paused, 'timeout resume', 16000);
ok(timeout && Date.now() - t0 > 10000, `Max hazır olmayınca ${Math.round((Date.now() - t0) / 1000)} sn sonra oda onsuz devam etti`);

await sleep(300);
a.inbox.length = 0;
c.send({ t: 'ready', ready: true });
c.send({ t: 'ready', ready: false });
await sleep(800);
ok(!a.inbox.some((m) => m.t === 'state' && m.by.id === 'system'), 'Max hemen tekrar bekletemiyor (bekleme arası)');
// Security L3: the cooldown belongs to the person; reconnecting (a new member id, same browser) does not reset it.
{
  c.ws.close();
  await sleep(300);
  const c2 = client({ name: 'Max', cid: 'waitMax000001' });
  await c2.wait((m) => m.t === 'welcome', 'welcome c2');
  a.inbox.length = 0;
  c2.send({ t: 'ready', ready: false });
  await sleep(800);
  ok(!a.inbox.some((m) => m.t === 'state' && m.by.id === 'system'), 'Max reconnecting does not reset the cooldown (security L3)');
  c2.send({ t: 'ready', ready: true });
  c2.ws.close();
}

// Elle hareket beklemeyi iptal eder. (Sam ve Max bekleme arasında; yeni biri gelir.)
const d = client({ name: 'Robin', cid: 'waitRobin0001' });
await d.wait((m) => m.t === 'welcome', 'welcome d');
d.send({ t: 'ready', ready: false });
await a.wait((m) => m.t === 'waiting' && m.ids.length === 1, 'waiting d');
a.send({ t: 'play', position: 30, at: Date.now() });
await a.wait((m) => m.t === 'waiting' && m.ids.length === 0, 'cancel by manual play');
ok(true, 'Alex elle oynatınca bekleme iptal oldu');

// Reklam: "reklamda" diyen kişi odayı bekletmez, kişiler listesinde işaretlenir; film geri gelince işaret kalkar.
{
  const e = client({ name: 'Lee', cid: 'waitLee000001' });
  await e.wait((m) => m.t === 'welcome', 'welcome e');
  a.send({ t: 'play', position: 40, at: Date.now() });
  await sleep(300);
  a.inbox.length = 0;
  e.send({ t: 'ready', ready: false, ad: true });
  const adOn = await a.wait((m) => m.t === 'members' && m.members.some((x) => x.name === 'Lee' && x.ad === true), 'ad on');
  ok(!!adOn, 'Reklamdaki kişi listede "reklamda" görünüyor');
  // Reklam boyunca motorun "takıldım"ı da bekletmez (film ilerlemiyor).
  e.send({ t: 'ready', ready: false });
  await sleep(800);
  ok(!a.inbox.some((m) => m.t === 'state' && m.by.id === 'system'), 'Reklamdaki kişi için oda durmuyor');
  e.send({ t: 'ready', ready: true });
  await a.wait((m) => m.t === 'members' && m.members.some((x) => x.name === 'Lee' && !x.ad), 'ad off');
  ok(true, 'Film geri gelince "reklamda" işareti kalktı');
  e.ws.close();
}

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
