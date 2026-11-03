// "Send feedback" endpoint (card 9, security review 3 R3-7). Live it only sends requests that must be refused (no
// issue is ever created by a test); locally, where the server has no token, it also checks the `off` answer and the
// per-address hourly limit.
//   node scripts/e2e/feedback.mjs [ws://localhost:8787]
const base = process.argv[2] ?? 'ws://localhost:8787';
const http = base.replace(/^ws/, 'http');
const live = !/localhost|127\.0\.0\.1/.test(base);
const ok = (c, m, extra = '') => {
  if (!c) throw new Error(`FAIL: ${m}${extra ? ` (${extra})` : ''}`);
  console.log('ok  ' + m);
};
const url = `${http}/api/feedback`;
const own = { Origin: http, 'Content-Type': 'application/json' };
const good = { kind: 'bug', text: 'The e2e test checks the feedback endpoint.' };

const noOrigin = await fetch(url, { method: 'POST', body: JSON.stringify(good) });
ok(noOrigin.status === 403, 'Without an Origin feedback is refused', noOrigin.status);
const foreign = await fetch(url, { method: 'POST', headers: { ...own, Origin: 'https://example.com' }, body: JSON.stringify(good) });
ok(foreign.status === 403, 'From another site feedback is refused', foreign.status);
const get = await fetch(url, { headers: own });
ok(get.status === 405, 'Only POST is accepted', get.status);
const big = await fetch(url, { method: 'POST', headers: own, body: JSON.stringify({ ...good, text: 'x'.repeat(9000) }) });
ok(big.status === 413, 'A body above 8 KB is refused', big.status);
const bad = await fetch(url, { method: 'POST', headers: own, body: JSON.stringify({ kind: 'bug', text: 'hi' }) });
ok(bad.status === 400 && (await bad.json()).error === 'bad', 'A message that is too short is refused');
const noKind = await fetch(url, { method: 'POST', headers: own, body: JSON.stringify({ text: 'A message without a type' }) });
ok(noKind.status === 400, 'A message without a type is refused', noKind.status);

if (!live) {
  // No token on a local server: valid messages are counted, then answered `off`; the fourth within the hour is `busy`.
  const answers = [];
  for (let i = 0; i < 4; i++) {
    const res = await fetch(url, { method: 'POST', headers: own, body: JSON.stringify({ ...good, text: `${good.text} #${i}` }) });
    answers.push(`${res.status}:${(await res.json()).error ?? 'ok'}`);
  }
  // Earlier local runs within the hour may already have used the allowance, so only the order matters: every `off`
  // comes before every `busy`, and the fourth is `busy`.
  const firstBusy = answers.findIndex((a) => a === '429:busy');
  ok(answers.every((a) => a === '200:off' || a === '429:busy') && answers[3] === '429:busy' && answers.slice(firstBusy).every((a) => a === '429:busy'), 'Without a token: "off", and the per-address limit says "busy"', answers.join(' '));
}
console.log('feedback: all passed');
setTimeout(() => process.exit(0), 50);
