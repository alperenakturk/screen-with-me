// YouTube search endpoint (link box): input checks, foreign pages refused, the answer's shape. Locally there is no API
// key (`off`); live it must find videos (or say the day's quota is used up, which is not a bug).
const base = process.argv[2] ?? 'ws://localhost:8787';
const http = base.replace(/^ws/, 'http');
const live = !/localhost|127\.0\.0\.1/.test(base);
const ok = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('ok  ' + m); };
const search = (q, init) => fetch(`${http}/api/youtube/search?hl=en&q=${encodeURIComponent(q)}`, init);

ok((await search('   ')).status === 400, 'An empty query is refused');
ok((await search('lofi', { headers: { Origin: 'https://other-site.example' } })).status === 403, 'Another site may not use our search');
ok((await fetch(`${http}/api/youtube/search?q=x`, { method: 'POST' })).status === 405, 'Only GET');
ok((await fetch(`${http}/api/youtube/search?q=x&short=1&page=bad%20token`)).status === 400, 'Shorts feed: a broken page token is refused');

const answer = await (await search('big buck bunny')).json();
if (live) {
  ok(answer.error === 'quota' || (Array.isArray(answer.items) && answer.items.length > 0), `Live search finds videos (${answer.error ?? answer.items.length + ' results'})`);
  if (answer.items) ok(answer.items.every((i) => /^[A-Za-z0-9_-]{11}$/.test(i.id) && typeof i.title === 'string'), 'Every result has a video id and a title');
} else {
  ok(answer.error === 'off' || Array.isArray(answer.items), `Local answer has a known shape (${answer.error ?? 'items'})`);
}

// Card 10: Discover by region and the ♾ feed from one channel. Only input checks live (no YouTube call is made for
// a refused request); locally without a key the valid ones answer `off`.
ok((await fetch(`${http}/api/youtube/pool?kind=music&hl=en&region=ZZ`)).status === 400, 'Discover: an unknown region is refused');
ok((await fetch(`${http}/api/youtube/pool?kind=music&hl=en&region=de`)).status === 400, 'Discover: a lower-case region is refused');
ok((await fetch(`${http}/api/youtube/channel?c=cats&hl=en`)).status === 400, 'Channel feed: words are not a channel');
ok((await fetch(`${http}/api/youtube/channel?c=${encodeURIComponent('@<script>')}&hl=en`)).status === 400, 'Channel feed: a broken handle is refused');
ok((await fetch(`${http}/api/youtube/channel?c=@abc&hl=en`, { headers: { Origin: 'https://other-site.example' } })).status === 403, 'Channel feed: another site may not use it');
if (!live) {
  ok((await (await fetch(`${http}/api/youtube/pool?kind=music&hl=en&region=world`)).json()).error === 'off', 'Discover: "world" is accepted (off without a key)');
  ok((await (await fetch(`${http}/api/youtube/channel?c=@somechannel&hl=en`)).json()).error === 'off', 'Channel feed: an @handle is accepted (off without a key)');
}
