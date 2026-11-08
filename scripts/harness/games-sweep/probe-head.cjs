const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
  await ctx.addInitScript(() => { for (const [k, v] of Object.entries({ lang: 'tr', name: 'Robin', avatar: 'wizard', 'opt:autoInvite': '0', tipsSeen: '1' })) localStorage.setItem(k, v); });
  const p = await ctx.newPage();
  await p.goto('http://localhost:5173/r/ph' + Math.random().toString(36).slice(2, 7) + '?debug=1#back');
  await p.waitForFunction(() => !!window.__swmLab, null, { timeout: 20000 });
  await new Promise((r) => setTimeout(r, 3000));
  await p.evaluate(() => window.__swmLab.run('games.open.classics'));
  await new Promise((r) => setTimeout(r, 2500));
  await p.evaluate(() => document.querySelector('#game-stage .cl-box[data-board="xox"]')?.click());
  await new Promise((r) => setTimeout(r, 1500));
  for (const w of [540, 479]) {
    console.log(w, await p.evaluate(async (w) => {
      const s = document.querySelector('#game-stage'); s.style.width = w + 'px'; s.style.height = Math.round(w * 620 / 540) + 'px';
      await new Promise((r) => setTimeout(r, 300));
      return [...s.querySelector('.game-stage-head').children].map((c) => `${c.className || c.tagName}:${Math.round(c.getBoundingClientRect().width)}${c.hidden ? '(h)' : ''}`).join(' ');
    }, w));
  }
  await p.locator('#game-stage .game-stage-head').screenshot({ path: '/tmp/claude-0/-home-user-screen-with-me/c7628fdf-128e-5225-b713-d9cf830240ec/scratchpad/head.png' });
  await b.close();
})();
