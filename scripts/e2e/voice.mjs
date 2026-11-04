// Sesli sohbet: sunucu tarafı kurallar. Varsayılan eşler arası (p2p): sunucu sadece bağlantı mesajlarını, iki taraf
// da seste ise aktarır; en fazla VOICE_MAX_P2P kişi. Cloudflare Realtime anahtarı varsa (sfu) oturum açılır.
const base = process.argv[2] ?? 'ws://localhost:8787';
const room = 'voice' + Math.random().toString(36).slice(2, 8);
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
const ok = (c, m) => {
  if (!c) throw new Error('FAIL: ' + m);
  console.log('ok  ' + m);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SDP = 'v=0\r\no=- 1 2 IN IP4 127.0.0.1\r\ns=-\r\n';

const a = client({ name: 'Alex', cid: 'voiceAlex0001' });
const wa = await a.wait((m) => m.t === 'welcome', 'welcome');
const b = client({ name: 'Sam', cid: 'voiceSam001' });
const wb = await b.wait((m) => m.t === 'welcome', 'welcome b');
const c = client({ name: 'Max', cid: 'voiceMax0001' });
const wc = await c.wait((m) => m.t === 'welcome', 'welcome c');

if (wa.voice !== true) {
  ok(wa.voice === false, 'Sesli sohbet kapalı (VOICE=off): welcome.voice = false');
} else if ((wa.voiceMode ?? 'p2p') === 'p2p') {
  ok(true, 'Sesli sohbet açık, eşler arası (p2p)');
  // Seste değilken bağlantı mesajı kimseye gitmez (IP adresi seste olmayana sızmaz).
  a.send({ t: 'signal', to: wb.you, data: { sdp: { type: 'offer', sdp: SDP } } });
  await sleep(500);
  ok(!b.inbox.some((m) => m.t === 'signal'), 'Seste değilken bağlantı mesajı iletilmiyor');
  a.send({ t: 'voice', on: true, mic: true });
  b.send({ t: 'voice', on: true, mic: true });
  await c.wait((m) => m.t === 'members' && m.members.filter((x) => x.voice).length === 2, 'two in voice');
  ok(true, 'Alex ve Sam seste görünüyor');
  a.send({ t: 'signal', to: wb.you, data: { sdp: { type: 'offer', sdp: SDP } } });
  const sig = await b.wait((m) => m.t === 'signal', 'signal');
  ok(sig.from === wa.you && sig.data.sdp.type === 'offer', 'İkisi de seste: teklif Sam\'ye ulaştı (gönderen belli)');
  // Seste olmayan Max'a mesaj gitmez.
  a.send({ t: 'signal', to: wc.you, data: { candidate: { candidate: 'candidate:x', sdpMid: '0', sdpMLineIndex: 0 } } });
  await sleep(500);
  ok(!c.inbox.some((m) => m.t === 'signal'), 'Seste olmayan Max\'a bağlantı mesajı gitmiyor');
  // Sınır: 6 kişi doluysa 7. reddedilir.
  const extra = [];
  for (let i = 0; i < 4; i++) {
    const e = client({ name: `K${i}`, cid: `voiceK${i}00000` });
    await e.wait((m) => m.t === 'welcome', 'welcome extra');
    e.send({ t: 'voice', on: true });
    extra.push(e);
  }
  await sleep(600);
  c.send({ t: 'voice', on: true });
  const full = await c.wait((m) => m.t === 'error', 'voice full');
  ok(full.code === 'voice_full', 'Seste 6 kişi varken 7. kişi reddedildi (voice_full)');
  // Kamera: aynı anda en fazla 4; beşinci reddedilir, kapatınca biri yer açar.
  for (const e of extra) e.send({ t: 'voice', on: true, mic: true, cam: true });
  await b.wait((m) => m.t === 'members' && m.members.filter((x) => x.voice?.cam).length === 4, 'four cams');
  ok(true, '4 kamera açık, üyelerde görünüyor');
  a.send({ t: 'voice', on: true, mic: true, cam: true });
  const camFull = await a.wait((m) => m.t === 'error', 'cam full');
  ok(camFull.code === 'cam_full', '5. kamera reddedildi (cam_full)');
  // Kutularda kameralar tek tek açılırken gelen eski mesajlar var (K0'ın kamerası henüz kapalıyken olanlar da): boşalt,
  // sonra K0'ın gerçekten kapattığı mesajı bekle (canlıda gecikme yüzünden Alex'in isteği önce gidiyordu).
  for (const x of [a, b]) x.inbox.length = 0;
  extra[0].send({ t: 'voice', on: true, mic: true, cam: false });
  await b.wait((m) => m.t === 'members' && m.members.filter((x) => x.voice?.cam).length === 3, 'cam off');
  a.send({ t: 'voice', on: true, mic: true, cam: true });
  const alexCam = await b.wait((m) => m.t === 'members' && m.members.some((x) => x.name === 'Alex' && x.voice?.cam), 'alex cam');
  ok(!!alexCam, 'Biri kamerasını kapatınca Alex açabildi');
  for (const e of extra) e.ws.close();
  a.send({ t: 'voice', on: false });
  await b.wait((m) => m.t === 'members' && m.members.some((x) => x.name === 'Alex' && !x.voice), 'left');
  ok(true, 'Alex sesten ayrılınca listeden düştü');
} else {
  // Cloudflare Realtime (canlıda anahtar varsa).
  a.send({ t: 'voice', on: true, mic: true });
  const m1 = await b.wait((m) => m.t === 'members' && m.members.some((x) => x.name === 'Alex' && x.voice?.mic === true), 'voice member');
  ok(!!m1 && !JSON.stringify(m1).includes('session'), 'Alex seste görünüyor (Cloudflare oturumu istemcilere gitmiyor)');
  a.send({ t: 'rtc', id: 1, op: 'session' });
  const s = await a.wait((m) => m.t === 'rtc' && m.id === 1, 'session', 15000);
  ok(s.ok === true, 'Cloudflare Realtime oturumu açıldı');
  b.send({ t: 'rtc', id: 3, op: 'session' });
  const nb = await b.wait((m) => m.t === 'rtc' && m.id === 3, 'not in voice');
  ok(nb.ok === false && nb.error === 'not_in_voice', 'Seste olmayan bağlantı işi yapamıyor (not_in_voice)');
}

for (const x of [a, b, c]) x.ws.close();
setTimeout(() => process.exit(0), 100);
