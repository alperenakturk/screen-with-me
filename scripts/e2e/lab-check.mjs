// Card LABLOCK: the 🐞 Test Lab opens only with the owner's code (`POST /api/lab/check`). Live this proves a wrong code
// and a made-up pass are refused, the check wants our Origin and a small POST body, and it is rate-limited per
// address. Locally (no `LAB_CODE`, no `SWM_LAB_OPEN`) the same refusals hold; the site itself opens the lab on
// localhost without asking (see the `test-lab` harness).
//   node scripts/e2e/lab-check.mjs [ws://localhost:8787]
const base = process.argv[2] ?? 'ws://localhost:8787';
const http = base.replace(/^ws/, 'http');
const ok = (c, m, extra = '') => {
  if (!c) throw new Error(`FAIL: ${m}${extra ? ` (${extra})` : ''}`);
  console.log('ok  ' + m);
};
const url = `${http}/api/lab/check`;
const own = { Origin: http, 'Content-Type': 'application/json' };
const ask = (body, headers = own) => fetch(url, { method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body) });

// An earlier run within the minute may have used up this address's allowance: wait it out once.
if ((await ask({ code: 'warm-up' })).status === 429) {
  console.log('  (the check was busy from an earlier run: waiting 61 s)');
  await new Promise((r) => setTimeout(r, 61_000));
}

const noOrigin = await ask({ code: 'guess' }, { 'Content-Type': 'application/json' });
ok(noOrigin.status === 403, 'Without our Origin the check is refused', noOrigin.status);
const foreign = await ask({ code: 'guess' }, { ...own, Origin: 'https://example.com' });
ok(foreign.status === 403, 'From another site the check is refused', foreign.status);
const get = await fetch(url, { headers: own });
ok(get.status === 405, 'Only POST is accepted', get.status);
const big = await ask({ code: 'x'.repeat(2000) });
ok(big.status === 413, 'A body above 1 KB is refused', big.status);

const wrong = await ask({ code: `wrong-${Math.random().toString(36).slice(2)}` });
const wrongAnswer = await wrong.json();
ok(wrong.status === 200 && wrongAnswer.ok === false && !('pass' in wrongAnswer), 'A wrong code opens nothing and gets no pass', JSON.stringify(wrongAnswer));
const forged = await ask({ pass: `${Date.now() + 86_400_000}.${'0'.repeat(64)}` });
ok((await forged.json()).ok === false, 'A made-up pass is refused');
const empty = await ask({});
ok((await empty.json()).ok === false, 'Nothing at all is refused');

// With a known code on a local test server (`wrangler dev --var LAB_CODE:<code>`, LAB_CODE=<code> here): the right code
// gets a pass, and the pass opens the lab again without the code.
if (process.env.LAB_CODE) {
  const right = await (await ask({ code: process.env.LAB_CODE })).json();
  ok(right.ok === true && /^\d{13}\.[0-9a-f]{64}$/.test(right.pass ?? ''), 'The right code opens the lab and gives a pass');
  ok((await (await ask({ pass: right.pass })).json()).ok === true, 'The pass opens it again without the code');
}

// The limit: the check shares the saved-room lookups' limit (60 per address and minute) under its own key.
// The limiter counts per minute window, so a burst can straddle a window's end: keep asking (at most 130) until it says 429.
const statuses = [];
for (let i = 0; i < 130 && !statuses.includes(429); i++) statuses.push((await ask({ code: `try-${i}` })).status);
ok(statuses.includes(429) && statuses.every((s) => s === 200 || s === 429), 'Guessing many codes in a row is slowed down (429)', `${statuses.filter((s) => s === 429).length} × 429`);

console.log('\n✓ The Test Lab stays locked without the code');
