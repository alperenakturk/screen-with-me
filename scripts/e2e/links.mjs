// Security L4: a video file or film page link must be a public address. Live: a link to a device on the viewer's own
// network or an http video file is refused (`bad_link`) and nothing reaches the queue; a public https file is fine.
// Locally (`wrangler dev`) the room allows local links (the harnesses play files from localhost), so only that is checked.
const base = process.argv[2] ?? 'ws://localhost:8787';
const live = !/localhost|127\.0\.0\.1/.test(base);
const room = 'links' + Math.random().toString(36).slice(2, 8);
const ok = (c, m) => {
  if (!c) throw new Error('FAIL: ' + m);
  console.log('ok  ' + m);
};
const ws = new WebSocket(`${base}/api/rooms/${room}/ws`);
const inbox = [];
ws.addEventListener('message', (e) => inbox.push(JSON.parse(e.data)));
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
ws.send(JSON.stringify({ t: 'hello', v: 3, name: 'Alex', cid: 'linksCid12345' }));
const wait = async (pred, label, ms = 8000) => {
  for (let t = 0; t < ms; t += 100) {
    const i = inbox.findIndex(pred);
    if (i >= 0) return inbox.splice(i, 1)[0];
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('timeout ' + label);
};
await wait((m) => m.t === 'welcome', 'welcome');
const send = (url, kind = 'html5') => ws.send(JSON.stringify({ t: 'enqueue', media: { kind, url } }));
// An enqueue in an empty room may start it at once (a `state`) or wait in the queue.
const queued = (url) => wait((m) => (m.t === 'queue' && m.queue.some((i) => i.media.url === url)) || (m.t === 'state' && m.state?.item?.media?.url === url), `queue ${url}`).then(() => true, () => false);
const refused = () => wait((m) => m.t === 'error' && m.code === 'bad_link', 'bad_link', 3000).then(() => true, () => false);

if (live) {
  send('https://192.168.1.1/film.mp4');
  ok(await refused(), 'A video file on a private address is refused (bad_link)');
  send('http://cdn.example.com/film.mp4');
  ok(await refused(), 'An http video file is refused');
  send('https://admin:pw@films.example.org/watch', 'page');
  ok(await refused(), 'A film page with a user name and password in the link is refused');
  send('https://cdn.example.com/film.mp4');
  ok(await queued('https://cdn.example.com/film.mp4'), 'A public https video file goes to the queue');
} else {
  send('http://localhost:5300/video.webm');
  ok(await queued('http://localhost:5300/video.webm'), 'A local test server still takes local links (harnesses)');
}
ws.close();
console.log('\n✓ Media links are checked');
setTimeout(() => process.exit(0), 100);
