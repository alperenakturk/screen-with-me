// Yönetici modları (sadece yönetici kontrol etsin / sırayı kilitle), sıradakiler için oylama ve
// planlı başlangıç.
const base = process.argv[2] ?? 'ws://localhost:8787';
const room = 'mode' + Math.random().toString(36).slice(2, 8);
function client(hello) {
  const ws = new WebSocket(`${base}/api/rooms/${room}/ws`);
  const inbox = [];
  ws.addEventListener('message', (e) => inbox.push(JSON.parse(e.data)));
  ws.addEventListener('open', () => ws.send(JSON.stringify({ t: 'hello', v: 3, ...hello })));
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
const host = client({ name: 'Alex', cid: 'modeAlex12345' });
await host.wait((m) => m.t === 'welcome', 'welcome host');
const guest = client({ name: 'Sam', cid: 'modeSam1234' });
await guest.wait((m) => m.t === 'welcome', 'welcome guest');
host.send({ t: 'load', media: { kind: 'youtube', id: 'dQw4w9WgXcQ' } });
await guest.wait((m) => m.t === 'state' && m.state.item, 'loaded');

// Sadece yönetici kontrol etsin
guest.send({ t: 'settings', hostOnly: true });
ok((await guest.wait((m) => m.t === 'error', 'guest settings')).code === 'not_host', 'Ayarları sadece yönetici değiştirebiliyor');
host.send({ t: 'settings', hostOnly: true });
const s1 = await guest.wait((m) => m.t === 'settings', 'settings hostOnly');
ok(s1.settings.hostOnly === true && s1.settings.waitForAll === true, 'Yönetici "sadece ben kontrol edeyim"i açtı (diğer ayarlar korunuyor)');
guest.send({ t: 'pause', position: 10, at: Date.now() });
ok((await guest.wait((m) => m.t === 'error', 'guest pause')).code === 'not_host', 'Açıkken başkası durduramıyor');
host.send({ t: 'pause', position: 10, at: Date.now() });
ok((await guest.wait((m) => m.t === 'state' && m.state.paused, 'host pause')).by.name === 'Alex', 'Yönetici durdurabiliyor');

// Sırayı kilitle
host.send({ t: 'settings', lockQueue: true });
await guest.wait((m) => m.t === 'settings' && m.settings.lockQueue, 'lockQueue');
guest.send({ t: 'enqueue', media: { kind: 'youtube', id: 'jNQXAC9IVRw' } });
ok((await guest.wait((m) => m.t === 'error', 'guest enqueue')).code === 'not_host', 'Sıra kilitliyken başkası ekleyemiyor');
host.send({ t: 'settings', lockQueue: false, hostOnly: false });
await guest.wait((m) => m.t === 'settings' && !m.settings.lockQueue && !m.settings.hostOnly, 'unlocked');

// Oylama: üç video ekle, sondakine iki oy → başa geçer
for (const id of ['jNQXAC9IVRw', 'M7lc1UVf-VE', 'aqz-KE-bpKQ']) {
  guest.send({ t: 'enqueue', media: { kind: 'youtube', id } });
  await guest.wait((m) => m.t === 'queue' && m.queue.some((q) => q.media.id === id), 'enqueue ' + id);
}
const last = (await host.wait((m) => m.t === 'queue' && m.queue.length === 3, 'queue 3')).queue[2];
host.send({ t: 'vote', id: last.id, up: true });
guest.send({ t: 'vote', id: last.id, up: true });
const voted = await host.wait((m) => m.t === 'queue' && m.queue[0].id === last.id && m.queue[0].votes === 2, 'voted');
ok(!!voted, 'En çok oy alan video sıranın başına geçiyor (2 oy)');
guest.send({ t: 'vote', id: last.id, up: false });
const unvoted = await host.wait((m) => m.t === 'queue' && m.queue[0].votes === 1, 'unvoted');
ok(unvoted.queue[0].id === last.id, 'Oy geri alınabiliyor (1 oy kaldı, hâlâ önde)');
ok(!JSON.stringify(unvoted).includes('modeSam1234'), 'Oy verenlerin kimliği istemcilere gitmiyor');

// Planlı başlangıç: 3 sn sonra oda kendiliğinden oynasın
host.send({ t: 'settings', startsAt: Date.now() + 3000 });
await guest.wait((m) => m.t === 'settings' && m.settings.startsAt, 'scheduled');
const started = await guest.wait((m) => m.t === 'state' && !m.state.paused, 'auto start', 15000);
ok(started.by.id === 'system', 'Planlanan saat gelince oda kendiliğinden oynadı');
const cleared = await guest.wait((m) => m.t === 'settings' && m.settings.startsAt === undefined, 'plan cleared', 5000);
ok(!!cleared, 'Plan başlayınca kaldırılıyor');

// Emojiler: varsayılan serbest (art arda), yönetici kişi başı aralık koyabilir.
const reacts = () => host.inbox.filter((m) => m.t === 'reaction').length;
host.inbox.length = 0;
for (let i = 0; i < 5; i++) guest.send({ t: 'react', emoji: '🔥' });
await sleep(500);
ok(reacts() === 5, `Art arda 5 emoji serbest (${reacts()} geldi)`);
guest.send({ t: 'settings', reactionGap: 3 });
const gapDenied = await guest.wait((m) => m.t === 'error', 'gap not host');
ok(gapDenied.code === 'not_host', 'Emoji sıklığını sadece yönetici ayarlar');
host.send({ t: 'settings', reactionGap: 3 });
await guest.wait((m) => m.t === 'settings' && m.settings.reactionGap === 3, 'gap set');
// Aralık son geçen emojiden sayılır: önceki emojilerin üstünden 3 sn geçsin.
await sleep(3000);
host.inbox.length = 0;
for (let i = 0; i < 4; i++) guest.send({ t: 'react', emoji: '🔥' });
await sleep(500);
ok(reacts() === 1, `Aralık 3 sn iken art arda 4 emojiden 1'i geçti (${reacts()})`);
host.send({ t: 'settings', reactionGap: 7 });
host.send({ t: 'settings', reactionGap: 0 });
const back = await guest.wait((m) => m.t === 'settings' && m.settings.reactionGap === 0, 'gap off');
ok(!!back, 'Geçersiz aralık (7) yok sayıldı, 0 ile serbest');

for (const c of [host, guest]) c.ws.close();
setTimeout(() => process.exit(0), 100);
