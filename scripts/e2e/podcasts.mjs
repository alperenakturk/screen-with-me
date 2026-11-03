// Podcasts (card P2): the Worker's two answers keep their shape and refuse what they must. Locally and in CI Apple is
// out of reach ({error:'failed'}); live they carry real shows. The page never passes an address (no `url` parameter).
const base = (process.argv[2] ?? 'ws://localhost:8787').replace(/^ws/, 'http');
const ok = (c, m) => {
  if (!c) throw new Error('FAIL: ' + m);
  console.log('ok  ' + m);
};
const get = (path, headers = {}) => fetch(base + path, { headers });

ok((await get('/api/podcasts/search')).status === 400, 'A search without words is refused (400)');
ok((await get('/api/podcasts/episodes?id=abc')).status === 400, 'An episodes call with a bad id is refused (400)');
ok((await get('/api/podcasts/episodes?url=http://169.254.169.254/')).status === 400, 'No address can be passed in (400)');
ok((await get('/api/podcasts/search?q=news', { Origin: 'https://evil.example' })).status === 403, 'Another site can’t use it (403)');
const search = await (await get('/api/podcasts/search?q=science&hl=en')).json();
ok(Array.isArray(search.items) || ['failed', 'busy'].includes(search.error), `Search answers in shape (${search.items ? `${search.items.length} shows` : search.error})`);
if (search.items?.length) {
  const episodes = await (await get(`/api/podcasts/episodes?id=${search.items[0].id}`)).json();
  ok(Array.isArray(episodes.items) || ['failed', 'busy', 'none'].includes(episodes.error), `Episodes answer in shape (${episodes.items ? `${episodes.items.length} episodes` : episodes.error})`);
}
console.log('\n✓ Podcasts answer as they should');
process.exit(0);
