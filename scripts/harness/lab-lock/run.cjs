// Card LABLOCK: on a site that is not a local server the 🐞 Test Lab opens only with the owner's code. The browser
// reaches the local server under a made-up name (`lab.test`, mapped to 127.0.0.1), so the page acts as it does live:
//   - `?debug=1` and a wrong code: no 🐞, the lab's chunk never loads;
//   - the right code: the 🐞 appears and a 30-day pass is kept (never the code itself);
//   - a new tab with `?debug=1` opens the lab with that pass; a reload of a lab tab keeps it;
//   - an old pass the server no longer takes is forgotten and opens nothing;
//   - on localhost `?debug=1` still opens it without any code (the harnesses rely on it).
//
//   npm run build && (cd apps/server && npx wrangler dev --port 8787 --var LAB_CODE:harness-lab-code)
//   NODE_PATH=$(npm root -g) node scripts/harness/lab-lock/run.cjs [code | site address (then LAB_CODE or the default)]
const { chromium } = require('playwright');

// run-all.sh passes the site's address first, like every other harness: that is not a code (BH13).
const ARG = process.argv[2] || '';
const CODE = ARG && !/^https?:\/\//.test(ARG) ? ARG : process.env.LAB_CODE || 'harness-lab-code';
const PORT = 8787;
const LIVE = `http://lab.test:${PORT}`;
const LOCAL = `http://localhost:${PORT}`;
let fails = 0;
const check = (ok, label, extra) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra === undefined ? '' : ` → ${JSON.stringify(extra)}`}`);
  if (!ok) fails++;
};

async function look(page, url) {
  const chunks = [];
  const onRequest = (r) => /test-lab/.test(r.url()) && chunks.push(r.url());
  page.on('request', onRequest);
  await page.goto(url);
  await page.waitForTimeout(1500);
  page.off('request', onRequest);
  return page.evaluate((loaded) => ({
    bug: !!document.querySelector('#debug-panel-root'),
    loaded,
    flag: sessionStorage.getItem('swm:debug'),
    pass: localStorage.getItem('swm:labPass'),
    address: location.search,
  }), chunks.length);
}

(async () => {
  // e2e lab-check may have used this address's allowance (60 a minute) just before: wait until the check answers.
  for (let i = 0; i < 80; i++) {
    const status = await fetch(`${LOCAL}/api/lab/check`, { method: 'POST', headers: { Origin: LOCAL, 'Content-Type': 'application/json' }, body: '{}' })
      .then((r) => r.status)
      .catch(() => 0);
    if (status === 200) break;
    await new Promise((r) => setTimeout(r, 1000));
  }
  const browser = await chromium.launch({ args: ['--host-resolver-rules=MAP lab.test 127.0.0.1'] });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  let s = await look(page, `${LIVE}/?debug=1`);
  check(!s.bug && s.loaded === 0 && s.flag === null, 'live: ?debug=1 without a pass opens nothing, loads nothing', s);
  s = await look(page, `${LIVE}/?debug=not-the-code`);
  check(!s.bug && s.loaded === 0 && s.pass === null && s.address === '', 'live: a wrong code opens nothing, keeps nothing, leaves the address clean', s);
  await page.evaluate(() => sessionStorage.setItem('swm:debug', '1'));
  s = await look(page, `${LIVE}/`);
  check(!s.bug && s.loaded === 0 && s.flag === null, 'live: a hand-set tab switch without a pass is dropped', s);

  s = await look(page, `${LIVE}/?debug=${encodeURIComponent(CODE)}`);
  check(s.bug && s.flag === '1' && /^\d{13}\.[0-9a-f]{64}$/.test(s.pass ?? '') && !String(s.pass).includes(CODE), 'live: the right code opens the lab and keeps a pass (not the code)', s);
  check(s.address === '', 'live: the code is removed from the address', s.address);
  s = await look(page, `${LIVE}/`);
  check(s.bug, 'live: a reload of the lab tab keeps the lab', s);

  const other = await ctx.newPage();
  s = await look(other, `${LIVE}/`);
  check(!s.bug && s.loaded === 0, 'live: another tab without ?debug stays normal', s);
  s = await look(other, `${LIVE}/?debug=1`);
  check(s.bug, 'live: ?debug=1 in another tab opens the lab with the pass', s);
  await other.close();

  // An old pass (a new code on the server, or forged) is forgotten.
  await page.evaluate(() => {
    localStorage.setItem('swm:labPass', `${Date.now() + 86_400_000}.${'0'.repeat(64)}`);
    sessionStorage.removeItem('swm:debug');
  });
  s = await look(page, `${LIVE}/?debug=1`);
  check(!s.bug && s.pass === null, 'live: a pass the server does not take is forgotten', s);

  const local = await (await browser.newContext()).newPage();
  s = await look(local, `${LOCAL}/?debug=1`);
  check(s.bug && s.pass === null, 'localhost: ?debug=1 opens the lab without a code', s);

  await browser.close();
  console.log(fails ? `\n✗ ${fails} check(s) failed` : '\n✓ Test Lab lock: every check passed');
  process.exit(fails ? 1 : 0);
})();
