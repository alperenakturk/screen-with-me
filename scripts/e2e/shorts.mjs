// Shorts: link işareti (short) korunur, ↑ ile bir öncekine dönülür, döngüde biten video başa sarar.
const base = process.argv[2] ?? 'ws://localhost:8787';
const room = 'shorts' + Math.random().toString(36).slice(2, 8);
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
const short = (id) => ({ kind: 'youtube', id, short: true });

const host = client({ name: 'Alex', cid: 'shortsAlex1234' });
await host.wait((m) => m.t === 'welcome', 'welcome');
const guest = client({ name: 'Sam', cid: 'shortsSam123' });
await guest.wait((m) => m.t === 'welcome', 'welcome guest');

host.send({ t: 'load', media: short('dQw4w9WgXcQ') });
const first = await guest.wait((m) => m.t === 'state' && m.state.item?.media.id === 'dQw4w9WgXcQ', 'loaded');
ok(first.state.item.media.short === true, 'Shorts işareti sunucudan geçiyor');
host.send({ t: 'enqueue', media: short('jNQXAC9IVRw') });
await guest.wait((m) => m.t === 'queue' && m.queue.length === 1, 'queued');

// Sonraki (↓), sonra bir önceki (↑): şu an oynayan sıranın başına geri girer.
guest.send({ t: 'next', from: first.state.item.id });
const second = await guest.wait((m) => m.t === 'state' && m.state.item?.media.id === 'jNQXAC9IVRw', 'next');
guest.send({ t: 'prev', from: second.state.item.id });
const back = await guest.wait((m) => m.t === 'state' && m.state.item?.media.id === 'dQw4w9WgXcQ', 'prev');
ok(back.state.item.id === first.state.item.id && back.state.position === 0, 'Bir önceki Shorts baştan açıldı');
const queue = await guest.wait((m) => m.t === 'queue' && m.queue[0]?.id === second.state.item.id, 'queue after prev');
ok(queue.queue.length === 1, 'Geçilen video sıranın başına döndü');
guest.send({ t: 'prev', from: back.state.item.id });
await new Promise((r) => setTimeout(r, 600));
ok(!guest.inbox.some((m) => m.t === 'state'), 'Dönülecek önceki yokken hiçbir şey olmuyor');

// Döngü: sadece yönetici açar; açıkken biten Shorts sıradakine geçmez, başa sarar.
guest.send({ t: 'settings', loop: true });
ok((await guest.wait((m) => m.t === 'error', 'guest loop')).code === 'not_host', 'Döngüyü sadece yönetici açabiliyor');
host.send({ t: 'settings', loop: true });
await guest.wait((m) => m.t === 'settings' && m.settings.loop === true, 'loop on');
host.send({ t: 'seek', position: 30, at: Date.now() });
await guest.wait((m) => m.t === 'state' && m.action === 'seek' && Math.round(m.state.position) === 30, 'seek 30');
guest.send({ t: 'next', from: back.state.item.id, end: true });
const looped = await guest.wait((m) => m.t === 'state' && m.action === 'seek', 'looped');
ok(looped.state.item.id === back.state.item.id && looped.state.position === 0 && !looped.state.paused, 'Döngüde biten Shorts başa sardı');
// Döngü açıkken de "Sonraki" (end olmadan) geçer.
guest.send({ t: 'next', from: back.state.item.id });
const skipped = await guest.wait((m) => m.t === 'state' && m.action === 'next', 'skip in loop');
ok(skipped.state.item.media.id === 'jNQXAC9IVRw', 'Döngüdeyken de sonrakine geçilebiliyor');

// TikTok (0.9.91.18+): a TikTok item passes the server's checks, plays at 1× and loops like a Short.
host.send({ t: 'rate', rate: 2, position: 0, at: Date.now() });
await guest.wait((m) => m.t === 'state' && m.state.rate === 2, 'rate 2');
host.send({ t: 'load', media: { kind: 'tiktok', id: '7000000000000000001', user: 'someone' } });
const tiktok = await guest.wait((m) => m.t === 'state' && m.state.item?.media.kind === 'tiktok', 'tiktok loaded');
ok(tiktok.state.item.media.id === '7000000000000000001' && tiktok.state.item.media.user === 'someone', 'TikTok öğesi sunucudan geçiyor');
ok(tiktok.state.rate === 1, 'TikTok açılınca hız 1×');
host.send({ t: 'load', media: { kind: 'tiktok', id: '12' } });
host.send({ t: 'seek', position: 20, at: Date.now() });
const after = await guest.wait((m) => m.t === 'state' && m.action === 'seek' && Math.round(m.state.position) === 20, 'seek 20');
ok(after.state.item.media.kind === 'tiktok' && after.state.item.media.id === '7000000000000000001', 'Bozuk TikTok kimliği reddedildi');
guest.send({ t: 'next', from: after.state.item.id, end: true });
const ttLoop = await guest.wait((m) => m.t === 'state' && m.action === 'seek' && m.state.position === 0, 'tiktok looped');
ok(ttLoop.state.item.media.kind === 'tiktok', 'Döngüde biten TikTok başa sardı');

// Card SH2: the room's feed lives on the room (everyone sees it, anyone may steer it) and the room remembers what it
// played, so a new or steered feed skips it. The YouTube calls themselves are the runner tab's (no key here).
host.send({ t: 'settings', loop: false });
await guest.wait((m) => m.t === 'settings' && m.settings.loop === false, 'loop off');
const feedIn = { kind: 'shorts', label: 'cats', source: { kind: 'topic', q: 'cats' }, paused: false };
host.send({ t: 'feed', feed: feedIn });
const started = await guest.wait((m) => m.t === 'feed' && m.feed?.label === 'cats', 'feed started');
ok(started.feed.by !== undefined && started.feed.steers === 0 && started.feed.kind === 'shorts', 'Feed: everyone sees the started feed and who runs it');
const runner = started.feed.by;
// A feed's videos are marked, so a new or steered feed can take them out of the queue again.
host.send({ t: 'enqueue', media: short('M7lc1UVf-VE'), feed: true });
const marked = await guest.wait((m) => m.t === 'queue' && m.queue.some((i) => i.media.id === 'M7lc1UVf-VE'), 'feed item queued');
ok(marked.queue.find((i) => i.media.id === 'M7lc1UVf-VE').feed === true, 'Feed: its videos are marked in the queue');
// Pause from the other side: the same feed, the runner stays.
guest.send({ t: 'feed', feed: { ...feedIn, paused: true } });
const paused = await host.wait((m) => m.t === 'feed' && m.feed?.paused === true, 'feed paused');
ok(paused.feed.by === runner && paused.feed.steers === 0, 'Feed: anyone can pause it; the runner stays');
// Steer from the other side: other words, same kind; counted, and the one who steered runs it now.
guest.send({ t: 'feed', feed: { kind: 'shorts', label: 'cats · 🇯🇵', source: { kind: 'topic', q: 'cats', region: 'JP' }, paused: false } });
const steered = await host.wait((m) => m.t === 'feed' && m.feed?.label === 'cats · 🇯🇵', 'feed steered');
ok(steered.feed.steers === 1 && steered.feed.by !== runner && steered.feed.source.region === 'JP', 'Feed: a steer is counted and keeps the feed going');
// A broken feed is refused (the server checks every field).
guest.send({ t: 'feed', feed: { kind: 'films', label: 'x', source: { kind: 'topic', q: 'x' }, paused: false } });
ok((await guest.wait((m) => m.t === 'error', 'bad feed')).code === 'bad_message', 'Feed: a broken feed is refused');
// The room remembers what it played: these ids come back to the runner, oldest first, once each.
guest.send({ t: 'feed-played' });
const played = await guest.wait((m) => m.t === 'feed-played', 'played ids');
ok(['dQw4w9WgXcQ', 'jNQXAC9IVRw'].every((id) => played.ids.includes(id)) && new Set(played.ids).size === played.ids.length, 'Feed: the room remembers the videos it played (no repeats)');
ok(!played.ids.includes('M7lc1UVf-VE'), 'Feed: a queued video that never played is not remembered');
// A newcomer gets the running feed with the welcome.
const late = client({ name: 'Robin', cid: 'shortsRobin123' });
const welcome = await late.wait((m) => m.t === 'welcome', 'welcome late');
ok(welcome.feed?.label === 'cats · 🇯🇵', 'Feed: a newcomer sees the running feed');
// Card FD1: "Only the host can start a feed": a guest may still pause / resume, but not start, steer or stop.
host.send({ t: 'settings', feedHostOnly: true });
await guest.wait((m) => m.t === 'settings' && m.settings.feedHostOnly === true, 'feed host only');
const current = { ...steered.feed };
delete current.by;
delete current.steers;
guest.send({ t: 'feed', feed: { ...current, paused: true } });
ok((await host.wait((m) => m.t === 'feed' && m.feed?.paused === true, 'guest pause with rule')).feed.label === current.label, 'Feed host rule: a guest can still pause the feed');
guest.send({ t: 'feed', feed: { kind: 'shorts', label: 'dogs', source: { kind: 'topic', q: 'dogs' }, paused: false } });
ok((await guest.wait((m) => m.t === 'error', 'guest start with rule')).code === 'feed_host', 'Feed host rule: a guest cannot start or steer a feed');
guest.send({ t: 'feed', feed: null });
ok((await guest.wait((m) => m.t === 'error', 'guest stop with rule')).code === 'feed_host', 'Feed host rule: a guest cannot stop the feed');
host.send({ t: 'feed', feed: { kind: 'shorts', label: 'dogs', source: { kind: 'topic', q: 'dogs' }, paused: false } });
ok((await guest.wait((m) => m.t === 'feed' && m.feed?.label === 'dogs', 'host start with rule')).feed.by !== undefined, 'Feed host rule: the host starts and steers');
host.send({ t: 'settings', feedHostOnly: false });
await guest.wait((m) => m.t === 'settings' && m.settings.feedHostOnly === false, 'feed host only off');
guest.send({ t: 'feed', feed: { kind: 'shorts', label: 'birds', source: { kind: 'topic', q: 'birds' }, paused: false } });
ok((await host.wait((m) => m.t === 'feed' && m.feed?.label === 'birds', 'guest start without rule')).feed.label === 'birds', 'Feed host rule off: anyone starts a feed again');
// A locked queue locks the feed for everyone but the host.
late.inbox.length = 0;
host.send({ t: 'settings', lockQueue: true });
await guest.wait((m) => m.t === 'settings' && m.settings.lockQueue === true, 'lock queue');
guest.send({ t: 'feed', feed: null });
ok((await guest.wait((m) => m.t === 'error', 'locked feed')).code === 'not_host', 'Feed: a locked queue locks the feed');
host.send({ t: 'feed', feed: null });
const stopMsg = await late.wait((m) => m.t === 'feed', 'feed stopped');
ok(stopMsg.feed === null && typeof stopMsg.stopper === 'string', 'Feed: stopped for everyone, with who stopped it (a member id)');
late.ws.close();

host.ws.close();
guest.ws.close();
process.exit(0);
