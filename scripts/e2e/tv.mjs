// TV pairing: a TV waits with a 6-digit code, a phone in the room types it, the TV joins as the same person's second
// device (same name / avatar, host rights, `tv` flag), phone ⇄ TV messages reach only each other, unlink and kicks.
const base = process.argv[2] ?? 'ws://localhost:8787';
const room = 'tv' + Math.random().toString(36).slice(2, 8);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ok = (c, m) => {
  if (!c) throw new Error('FAIL: ' + m);
  console.log('ok  ' + m);
};

function socket(path, onOpen) {
  const ws = new WebSocket(`${base}${path}`);
  const inbox = [];
  let closed = null;
  ws.addEventListener('message', (e) => inbox.push(JSON.parse(e.data)));
  ws.addEventListener('close', (e) => (closed = e.code));
  if (onOpen) ws.addEventListener('open', () => onOpen(ws));
  const wait = async (pred, label, ms = 10000) => {
    for (let i = 0; i < ms / 100; i++) {
      const idx = inbox.findIndex(pred);
      if (idx >= 0) return inbox.splice(idx, 1)[0];
      await sleep(100);
    }
    throw new Error('timeout ' + label);
  };
  const waitClose = async (label, ms = 10000) => {
    for (let i = 0; i < ms / 100; i++) {
      if (closed !== null) return closed;
      await sleep(100);
    }
    throw new Error('timeout close ' + label);
  };
  return { ws, inbox, wait, waitClose, send: (m) => ws.send(JSON.stringify(m)) };
}
const client = (hello) => socket(`/api/rooms/${room}/ws`, (ws) => ws.send(JSON.stringify({ t: 'hello', v: 3, ...hello })));
const code = () => String(Math.floor(100000 + Math.random() * 900000));

const phone = client({ name: 'Alex', avatar: 'wizard', cid: 'tvAlex1234567' });
await phone.wait((m) => m.t === 'welcome', 'welcome phone');
const friend = client({ name: 'Lee', cid: 'tvLee1234567' });
await friend.wait((m) => m.t === 'welcome', 'welcome friend');

// A wrong code: nobody waits there.
phone.send({ t: 'tv-link', code: code() });
ok((await phone.wait((m) => m.t === 'error', 'wrong code')).code === 'tv_code', 'A code no TV shows is refused');

// Security R4-10: the TV's server side runs only with `TV=on` (a local `wrangler dev --var TV:on`); off, the pairing
// route answers 404 and a TV token never joins. Then only that is checked.
const http = base.replace(/^ws/, 'http');
if ((await fetch(`${http}/api/tv/${code()}/ws`)).status === 404) {
  const stray = client({ name: 'TV', cid: 'tvBox1234567', tv: 'a'.repeat(32) });
  ok((await stray.wait((m) => m.t === 'error', 'tv off')).code === 'tv_token', 'TV off: the pairing route is 404 and a TV token never joins');
  console.log('tv: off on this server (run with --var TV:on for the full test)');
  process.exit(0);
}

// The TV waits; a second TV with the same code is turned away.
const tvCode = code();
const waiting = socket(`/api/tv/${tvCode}/ws`);
await waiting.wait((m) => m.t === 'waiting', 'waiting');
const twin = socket(`/api/tv/${tvCode}/ws`);
await twin.wait((m) => m.t === 'taken', 'taken');
ok(true, 'A second TV with the same code picks another one');

phone.send({ t: 'tv-link', code: tvCode });
const paired = await waiting.wait((m) => m.t === 'paired', 'paired');
ok(paired.room === room && /^[a-f0-9]{32}$/.test(paired.token), 'The TV gets the room and a link token');
await phone.wait((m) => m.t === 'tv' && m.op === 'linked', 'linked');
ok(true, 'The phone is told the TV is linked');

// The TV joins as Alex's second device.
const tv = client({ name: 'TV', cid: 'tvBox1234567', tv: paired.token });
const welcome = await tv.wait((m) => m.t === 'welcome', 'welcome tv');
const meOnTv = welcome.members.find((m) => m.id === welcome.you);
ok(meOnTv.name === 'Alex' && meOnTv.avatar === 'wizard' && meOnTv.tv === true, 'The TV joins with my name and avatar, marked as a TV');
ok(welcome.members.find((m) => m.name === 'Alex' && !m.tv).id === welcome.hostId, 'My phone is still the host');
await phone.wait((m) => m.t === 'tv' && m.op === 'present' && m.value === true, 'present');
ok(true, 'My phone learns that my TV is here');

// Host rights travel with the person: the TV may pause in a host-only room.
phone.send({ t: 'settings', hostOnly: true });
await friend.wait((m) => m.t === 'settings', 'settings');
phone.send({ t: 'load', media: { kind: 'test' } });
await tv.wait((m) => m.t === 'state' && m.state.item, 'loaded on tv');
tv.send({ t: 'pause', position: 1, at: Date.now() });
ok((await friend.wait((m) => m.t === 'state' && m.state.paused, 'tv pause')).by.name === 'Alex', 'The TV has my host rights');
friend.send({ t: 'play', position: 1, at: Date.now() });
ok((await friend.wait((m) => m.t === 'error', 'friend play')).code === 'not_host', 'Others still are not the host');

// Phone ⇄ TV messages: only between them.
phone.send({ t: 'tv', op: 'volume', value: 40 });
const vol = await tv.wait((m) => m.t === 'tv' && m.op === 'volume', 'volume');
ok(vol.value === 40, 'The phone sets the TV volume');
tv.send({ t: 'tv', op: 'state', value: 40 });
await phone.wait((m) => m.t === 'tv' && m.op === 'state', 'state');
ok(true, 'The TV reports back to my phone');
friend.send({ t: 'tv', op: 'unlink' });
await sleep(800);
ok(!tv.inbox.some((m) => m.t === 'tv' && m.op === 'unlink'), "Someone else can't command my TV");

// Renaming on the phone renames the TV too; a TV can't rename itself.
phone.send({ t: 'rename', name: 'Alex B', avatar: 'wizard' });
const renamed = await friend.wait((m) => m.t === 'members' && m.members.filter((x) => x.name === 'Alex B').length === 2, 'rename');
ok(renamed.members.some((m) => m.tv && m.name === 'Alex B'), 'My TV follows my new name');

// Reconnect with the same token works; a made-up token does not.
const fake = client({ name: 'TV', cid: 'tvFake123456', tv: 'a'.repeat(32) });
ok((await fake.wait((m) => m.t === 'error', 'fake token')).code === 'tv_token', 'A made-up link token is refused');

// Unlink: the TV is told, and its token stops working.
phone.send({ t: 'tv', op: 'unlink' });
await tv.wait((m) => m.t === 'tv' && m.op === 'unlink', 'unlink');
ok(true, 'Unlink reaches the TV');
tv.ws.close();
await phone.wait((m) => m.t === 'tv' && m.op === 'present' && m.value === false, 'gone');
ok(true, 'My phone learns that my TV left');
const again = client({ name: 'TV', cid: 'tvBox1234567', tv: paired.token });
ok((await again.wait((m) => m.t === 'error', 'old token')).code === 'tv_token', 'After unlink the old token is refused');

// Kicking the person removes their TV too.
const code2 = code();
const waiting2 = socket(`/api/tv/${code2}/ws`);
await waiting2.wait((m) => m.t === 'waiting', 'waiting 2');
friend.send({ t: 'tv-link', code: code2 });
const paired2 = await waiting2.wait((m) => m.t === 'paired', 'paired 2');
const tv2 = client({ name: 'TV', cid: 'tvBox7654321', tv: paired2.token });
const w2 = await tv2.wait((m) => m.t === 'welcome', 'welcome tv2');
const friendId = w2.members.find((m) => m.name === 'Lee' && !m.tv).id;
phone.send({ t: 'kick', id: friendId });
ok((await tv2.waitClose('tv2 kicked')) === 4003, "Kicking a person also removes their TV");

for (const c of [phone, friend, fake, again, tv2]) c.ws.close();
process.exit(0);
