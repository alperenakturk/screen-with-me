// YouTube search endpoint (link box): input checks, foreign pages refused, the answer's shape. Locally there is no API
// key (`off`); live it must find videos (or say the day's quota is used up, which is not a bug).
const base = process.argv[2] ?? 'ws://localhost:8787';
const http = base.replace(/^ws/, 'http');
const live = !/localhost|127\.0\.0\.1/.test(base);
const ok = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('ok  ' + m); };
// Security M6: the words go in the POST body, never in the address.
const search = (q, init = {}) => fetch(`${http}/api/youtube/search?hl=en`, { method: 'POST', body: new URLSearchParams({ q }), ...init });

ok((await search('   ')).status === 400, 'An empty query is refused');
ok((await search('lofi', { headers: { Origin: 'https://other-site.example' } })).status === 403, 'Another site may not use our search');
ok((await fetch(`${http}/api/youtube/search?hl=en&q=lofi`)).status === 405, 'Only POST: words in the address are refused (they would be logged)');
ok((await fetch(`${http}/api/youtube/search?hl=en&q=lofi`, { method: 'POST' })).status === 400, 'Words only in the address, not in the body, count as no words');
ok((await fetch(`${http}/api/youtube/search?short=1&page=bad%20token`, { method: 'POST', body: new URLSearchParams({ q: 'x' }) })).status === 400, 'Shorts feed: a broken page token is refused');
ok((await search('x'.repeat(4000))).status === 400, 'A body above the limit gives no words (400)');

const answer = await (await search('big buck bunny')).json();
if (live) {
  ok(answer.error === 'quota' || (Array.isArray(answer.items) && answer.items.length > 0), `Live search finds videos (${answer.error ?? answer.items.length + ' results'})`);
  if (answer.items) ok(answer.items.every((i) => /^[A-Za-z0-9_-]{11}$/.test(i.id) && typeof i.title === 'string'), 'Every result has a video id and a title');
  if (answer.items) {
    // Security R4-9: the same words again should come from the Worker's cache. On *.workers.dev the Cache API may do
    // nothing; that is a finding to report (the own domain fixes it), not a broken release, so it only warns.
    const again = await search('big buck bunny');
    if (again.headers.get('X-SWM-Cache') === 'hit') console.log('ok  The same search again is answered from the cache');
    else console.log('::warning::R4-9: a repeated search was not answered from the cache (Cache API inactive on this host?)');
  }
} else {
  ok(answer.error === 'off' || Array.isArray(answer.items), `Local answer has a known shape (${answer.error ?? 'items'})`);
}

// Card 10: Discover by region and the ♾ feed from one channel. Only input checks live (no YouTube call is made for
// a refused request); locally without a key the valid ones answer `off`.
ok((await fetch(`${http}/api/youtube/pool?kind=music&hl=en&region=ZZ`)).status === 400, 'Discover: an unknown region is refused');
ok((await fetch(`${http}/api/youtube/pool?kind=music&hl=en&region=de`)).status === 400, 'Discover: a lower-case region is refused');
ok((await fetch(`${http}/api/youtube/channel?c=cats&hl=en`)).status === 400, 'Channel feed: words are not a channel');
ok((await fetch(`${http}/api/youtube/channel?c=${encodeURIComponent('@<script>')}&hl=en`)).status === 400, 'Channel feed: a broken handle is refused');
// Card Y3: the usage counters are the owner's only (a header with his key), never public.
ok((await fetch(`${http}/api/youtube/usage`)).status === 403, 'Usage counters: refused without the owner\'s key');
ok((await fetch(`${http}/api/youtube/usage`, { headers: { 'X-Usage-Token': 'not-the-key' } })).status === 403, 'Usage counters: refused with a wrong key');
if (process.env.USAGE_TOKEN) {
  // With the key (the live run gets it): {YYYY-MM-DD: {search: {requests, calls, units}, …}}.
  const usage = await fetch(`${http}/api/youtube/usage`, { headers: { 'X-Usage-Token': process.env.USAGE_TOKEN.trim() } });
  const book = usage.status === 200 ? await usage.json() : null;
  // The status (never the key) goes into the message, so a failure says whether the key or the answer was wrong.
  ok(!!book && typeof book === 'object' && Object.values(book).every((day) => Object.values(day).every((k) => typeof k.units === 'number')), `Usage counters: the owner's key reads them (${usage.status}${book ? '' : ', no book'}${process.env.USAGE_TOKEN.trim().length < 32 ? '; the USAGE_TOKEN secret is shorter than 32 characters, which the server refuses since R4-7' : ''})`);
}
ok((await fetch(`${http}/api/youtube/channel?c=@abc&hl=en`, { headers: { Origin: 'https://other-site.example' } })).status === 403, 'Channel feed: another site may not use it');
if (!live) {
  ok((await (await fetch(`${http}/api/youtube/pool?kind=music&hl=en&region=world`)).json()).error === 'off', 'Discover: "world" is accepted (off without a key)');
  ok((await (await fetch(`${http}/api/youtube/channel?c=@somechannel&hl=en`)).json()).error === 'off', 'Channel feed: an @handle is accepted (off without a key)');
}
