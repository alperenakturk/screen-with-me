// Odayı kaydet: video değişince kaldığı yer ve pinler hatırlanır, aynı video tekrar açılınca
// oradan devam eder. Ayrıca "sıradakine otomatik geç" ayarı.
const base = process.argv[2] ?? 'ws://localhost:8787';
const room = 'save' + Math.random().toString(36).slice(2, 8);
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

const host = client({ name: 'Ali', cid: 'saveAli12345' });
await host.wait((m) => m.t === 'welcome', 'welcome');
const guest = client({ name: 'Ayse', cid: 'saveAyse1234' });
await guest.wait((m) => m.t === 'welcome', 'welcome guest');

guest.send({ t: 'settings', saved: true });
ok((await guest.wait((m) => m.t === 'error', 'guest saved')).code === 'not_host', 'Odayı sadece yönetici kaydedebiliyor');
host.send({ t: 'settings', saved: true, autoNext: false });
const s = await guest.wait((m) => m.t === 'settings', 'settings');
ok(s.settings.saved === true && s.settings.autoNext === false, 'Oda kaydedildi, otomatik devam kapatıldı');

// İlk video: 120. saniyede durdur, pinle
host.send({ t: 'load', media: { kind: 'youtube', id: 'dQw4w9WgXcQ' } });
await guest.wait((m) => m.t === 'state' && m.state.item?.media.id === 'dQw4w9WgXcQ', 'loaded 1');
host.send({ t: 'seek', position: 120, at: Date.now() });
host.send({ t: 'pause', position: 120, at: Date.now() });
await guest.wait((m) => m.t === 'state' && m.state.paused && Math.round(m.state.position) === 120, 'paused 120');
host.send({ t: 'pin', note: 'güzel an' });
await guest.wait((m) => m.t === 'pins' && m.pins.pins.length === 1, 'pinned');

// Başka video aç, sonra ilkine dön
host.send({ t: 'load', media: { kind: 'youtube', id: 'jNQXAC9IVRw' } });
await guest.wait((m) => m.t === 'state' && m.state.item?.media.id === 'jNQXAC9IVRw', 'loaded 2');
ok(true, 'Başka bir video açıldı');
host.send({ t: 'load', media: { kind: 'youtube', id: 'dQw4w9WgXcQ' } });
const back = await guest.wait((m) => m.t === 'state' && m.state.item?.media.id === 'dQw4w9WgXcQ' && m.action === 'load', 'loaded 1 again');
ok(back.resumed === 120 && Math.round(back.state.position) === 120, 'Aynı video kaldığı yerden (120 sn) açıldı');
const pins = await guest.wait((m) => m.t === 'pins' && m.pins.itemId === back.state.item.id, 'pins restored');
ok(pins.pins.pins.length === 1 && pins.pins.pins[0].note === 'güzel an', 'Pinleri de geri geldi');
ok(!JSON.stringify(pins).includes('saveAli12345'), 'Pin sahibinin kimliği istemcilere gitmiyor');

// Kayıt kapanınca hatırlananlar silinir
host.send({ t: 'settings', saved: false });
await guest.wait((m) => m.t === 'settings' && !m.settings.saved, 'unsaved');
host.send({ t: 'load', media: { kind: 'youtube', id: 'jNQXAC9IVRw' } });
const fresh = await guest.wait((m) => m.t === 'state' && m.state.item?.media.id === 'jNQXAC9IVRw' && m.action === 'load', 'loaded 2 again');
ok(fresh.resumed === undefined && fresh.state.position === 0, 'Kayıt kapalıyken video baştan açılıyor');

for (const c of [host, guest]) c.ws.close();
setTimeout(() => process.exit(0), 100);
