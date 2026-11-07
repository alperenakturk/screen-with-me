// GP2: the tables' one result card and Glowbeam the referee's reactions (Classics; Sea Battle's card is in the sea
// harness). With the local lab server's ready-made positions: chess mate in one (Ra1–a8#) → "You won!", the score, Rematch
// inside the card, "See the board" moves it away, Rematch starts a new game; dama's capture chain → "Nice capture!".
// GP3: Quiz and Draw & Guess end on the same card (podium inside, "Play again" for the game's host only), two people,
// the phases ended by the lab server's skip.
//   npm run build && (cd apps/server && npx wrangler dev --port 8787 --var SWM_LOCAL_UNPACED:1 --var SWM_LAB_SERVER:1)
//   NODE_PATH=$(npm root -g) node scripts/harness/game-result/run.cjs [site]
const { chromium, devices } = require('playwright');
const SITE = process.argv[2] || 'http://localhost:8787';
let fails = 0;
const check = (ok, label, extra) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra !== undefined && !ok ? ' → ' + JSON.stringify(extra) : ''}`);
  if (!ok) fails++;
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 8000) {
  for (let i = 0; i < ms / 100; i++) {
    const v = await fn().catch(() => null);
    if (v) return v;
    await wait(100);
  }
  return null;
}
const sq = (name) => (8 - Number(name[1])) * 8 + (name.charCodeAt(0) - 97);

(async () => {
  const browser = await chromium.launch();
  for (const [label, opts] of [['computer', { viewport: { width: 1366, height: 768 } }], ['iPhone', devices['iPhone 13']]]) {
    const ctx = await browser.newContext(opts);
    await ctx.addInitScript(() => {
      for (const [k, v] of Object.entries({ lang: 'en', name: 'Robin', avatar: 'wizard', 'opt:autoInvite': '0', tipsSeen: '1' })) localStorage.setItem(k, v);
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${SITE}/r/gr${Math.random().toString(36).slice(2, 8)}?debug=1#back`);
    await page.waitForFunction(() => !!window.__swmLab, null, { timeout: 20000 });
    await wait(3200);
    const run = (id) => page.evaluate((id) => window.__swmLab.run(id).then((l) => l.text), id);
    await run('games.open.classics');
    await until(() => page.evaluate(() => !!document.querySelector('#game-stage .cl-picker:not([hidden])')));
    await page.evaluate(() => document.querySelector('#game-stage .cl-box[data-board="chess"]')?.click());
    await until(() => page.evaluate(() => !!document.querySelector('#game-stage .cl-bot-level')));
    await page.evaluate(() => document.querySelector('#game-stage .cl-bot-level')?.click());
    await until(() => page.evaluate(() => document.querySelector('#game-stage #seat-1')?.classList.contains('bot')));
    // Chess: the lab's mate in one, played by clicks.
    await run('classics.position.mate1');
    await until(() => page.evaluate(() => document.querySelectorAll('#game-stage .chess-cell.piece-X').length === 2));
    await page.evaluate(([a, b]) => {
      const cells = document.querySelectorAll('#game-stage .chess-board .dama-cell');
      cells[a].click();
      setTimeout(() => cells[b].click(), 150);
    }, [sq('a1'), sq('a8')]);
    const card = await until(() =>
      page.evaluate(() => {
        const l = document.querySelector('#game-stage .gr-layer');
        return l && !l.hidden ? { outcome: l.dataset.outcome, title: l.querySelector('.gr-title')?.textContent ?? '', line: l.querySelector('.gr-line')?.textContent ?? '', rematch: !!l.querySelector('.gr-actions #xox-rematch'), mascot: !!l.querySelector('.gr-mascot svg') } : null;
      }),
    );
    check(card && card.outcome === 'win' && /checkmate/i.test(card.title) && /1 – 0/.test(card.line) && card.rematch && card.mascot, `${label}: mate → the result card: Glowbeam, "Checkmate! You won", 1 – 0, Rematch inside`, card);
    await wait(500); // the card pops in (0.35 s): measure it at its own size
    const fits = await page.evaluate(() => {
      const c = document.querySelector('#game-stage .gr-card')?.getBoundingClientRect();
      const s = document.querySelector('#game-stage')?.getBoundingClientRect();
      const btns = [...document.querySelectorAll('#game-stage .gr-card button')].map((b) => Math.round(Math.min(b.getBoundingClientRect().width, b.getBoundingClientRect().height)));
      return c && s && { inside: c.left >= s.left - 1 && c.right <= s.right + 1 && c.top >= s.top - 1 && c.bottom <= s.bottom + 1, btns };
    });
    check(fits && fits.inside && fits.btns.every((n) => n >= (label === 'iPhone' ? 44 : 24)), `${label}: the card fits the game window, its buttons big enough`, fits);
    await page.evaluate(() => document.querySelector('#game-stage .gr-see')?.click());
    const seen = await page.evaluate(() => ({ hidden: document.querySelector('#game-stage .gr-layer')?.hidden, rematch: !!document.querySelector('#game-stage .xox-actions #xox-rematch:not([hidden])') }));
    check(seen.hidden && seen.rematch, `${label}: "See the board" moves the card away; Rematch stays under the board`, seen);
    await page.evaluate(() => document.querySelector('#game-stage #xox-rematch')?.click());
    const fresh = await until(() => page.evaluate(() => document.querySelectorAll('#game-stage .chess-cell.piece-X').length === 16 && document.querySelector('#game-stage .gr-layer')?.hidden));
    check(!!fresh, `${label}: Rematch starts a new game, no card`);
    // Dama: the lab's capture chain; the referee says so.
    await page.evaluate(() => document.querySelector('#game-stage #cl-shelf-open')?.click());
    await wait(300);
    await page.evaluate(() => document.querySelector('.dialog-backdrop:not([hidden]) .btn.primary')?.click());
    await wait(300);
    await page.evaluate(() => document.querySelector('#game-stage .cl-box[data-board="dama"]')?.click());
    await until(() => page.evaluate(() => document.querySelector('#game-stage .xox-page')?.dataset.board === 'dama'));
    await run('classics.position.chain');
    await until(() => page.evaluate(() => document.querySelectorAll('#game-stage .dama-cell.mark-X').length === 2));
    await page.evaluate(() => {
      const from = document.querySelector('#game-stage .dama-cell.movable');
      from?.click();
      setTimeout(() => document.querySelector('#game-stage .dama-cell.target')?.click(), 150);
    });
    const said = await until(() => page.evaluate(() => {
      const b = document.querySelector('#game-stage .cl-say');
      return b && !b.hidden ? { text: b.textContent, mood: b.dataset.mood, jump: document.querySelector('#game-stage .cl-ref-mascot')?.classList.contains('react-cheer') } : null;
    }));
    check(said && /nice capture/i.test(said.text) && said.mood === 'cheer', `${label}: a capture → Glowbeam says "Nice capture!" and cheers`, said);
    await wait(2200);
    check(await page.evaluate(() => document.querySelector('#game-stage .cl-say')?.hidden), `${label}: the bubble goes away by itself`);
    check(!errors.length, `${label}: no page errors`, errors.slice(0, 2));
    await ctx.close();
  }
  // GP3: Quiz and Draw & Guess, two people, phases skipped by the lab server until the game is over.
  for (const [label, opts] of [['computer', { viewport: { width: 1366, height: 768 } }], ['iPhone', devices['iPhone 13']]]) {
    for (const kind of ['quiz', 'draw']) {
      const room = `gp${Math.random().toString(36).slice(2, 8)}`;
      const people = [];
      for (const [name, avatar] of [['Alex', 'wizard'], ['Sam', 'pirate']]) {
        const ctx = await browser.newContext(opts);
        await ctx.addInitScript(([name, avatar]) => {
          for (const [k, v] of Object.entries({ lang: 'en', name, avatar, 'opt:autoInvite': '0', tipsSeen: '1' })) localStorage.setItem(k, v);
        }, [name, avatar]);
        const page = await ctx.newPage();
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        await page.goto(`${SITE}/r/${room}?debug=1#back`);
        await page.waitForFunction(() => !!window.__swmLab && !!document.querySelector('#game-btn'), null, { timeout: 20000 });
        await wait(1500);
        people.push({ ctx, page, errors });
      }
      const [alex, sam] = people;
      await alex.page.evaluate((k) => window.__swmLab.run(`games.open.${k}`), kind);
      await until(() => sam.page.evaluate(() => !!document.querySelector('#game-invite .btn.primary')));
      await sam.page.evaluate(() => document.querySelector('#game-invite .btn.primary')?.click());
      await until(() => alex.page.evaluate(() => document.querySelectorAll('#game-stage .draw-player').length >= 2));
      // Five questions for the quiz (the shortest game); both press Start, only the host's counts.
      if (kind === 'quiz') await alex.page.evaluate(() => [...document.querySelectorAll('#game-stage button')].find((b) => b.textContent.trim() === '5')?.click());
      await wait(400);
      for (const p of [alex.page, sam.page]) await p.evaluate(() => [...document.querySelectorAll('#game-stage .btn.primary')].find((b) => !b.disabled && b.offsetWidth)?.click());
      await until(() => alex.page.evaluate(() => !document.querySelector('#game-stage .draw-page')?.classList.contains('draw-lobby')));
      // Alex answers / guesses nothing; the lab ends each phase until the podium.
      const over = await until(async () => {
        const open = await alex.page.evaluate(() => { const l = document.querySelector('#game-stage .gr-layer'); return !!l && !l.hidden; });
        if (open) return true;
        await alex.page.evaluate((k) => window.__swmLab.run(`${k}.skip`), kind);
        await wait(250);
        return null;
      }, 30000);
      const card = (page) => page.evaluate(() => {
        const l = document.querySelector('#game-stage .gr-layer');
        if (!l || l.hidden) return null;
        const again = l.querySelector('.gr-again');
        const c = l.querySelector('.gr-card').getBoundingClientRect();
        const s = document.querySelector('#game-stage').getBoundingClientRect();
        return { outcome: l.dataset.outcome, title: l.querySelector('.gr-title')?.textContent ?? '', line: l.querySelector('.gr-line')?.textContent ?? '', podium: l.querySelectorAll('.game-podium li:not(.vacant)').length, mascot: !!l.querySelector('.gr-mascot svg'), again: again?.textContent ?? '', disabled: again?.disabled ?? null, inside: c.left >= s.left - 1 && c.right <= s.right + 1 && c.top >= s.top - 1 && c.bottom <= s.bottom + 1, btns: [...l.querySelectorAll('button')].map((b) => Math.round(Math.min(b.getBoundingClientRect().width, b.getBoundingClientRect().height))) };
      });
      await wait(500);
      const a = await card(alex.page);
      const b = await until(() => card(sam.page));
      check(!!over && a && a.podium === 2 && a.mascot && a.line.length > 0 && /tie|won/i.test(a.title), `${label} ${kind}: the game ends on the result card: Glowbeam, who won, his line, the podium inside`, a);
      // Nobody scored: a tie at the top. The game's host (whoever reached the table first) starts again; the other
      // waits for them by name.
      const [host, guest, hostName] = a && a.disabled === false ? [alex, sam, 'Alex'] : [sam, alex, 'Sam'];
      const [h, g] = host === alex ? [a, b] : [b, a];
      check(h && h.again.includes('Play again') && h.disabled === false && g && g.again.includes(hostName) && g.disabled === true, `${label} ${kind}: "Play again" for the host, "Waiting for <host>" for the other`, { a: a?.again, b: b?.again });
      check(a && a.inside && a.btns.every((n) => n >= (label === 'iPhone' ? 44 : 24)), `${label} ${kind}: the card fits the game window, its buttons big enough`, a);
      await guest.page.evaluate(() => document.querySelector('#game-stage .gr-see')?.click());
      const lobby = await guest.page.evaluate(() => ({ hidden: document.querySelector('#game-stage .gr-layer')?.hidden, settings: !!document.querySelector('#game-stage .game-podium') }));
      check(lobby.hidden && lobby.settings, `${label} ${kind}: "Settings & scores" puts the card away and shows the podium and settings`, lobby);
      await host.page.evaluate(() => document.querySelector('#game-stage .gr-again')?.click());
      const again = await until(() => host.page.evaluate(() => document.querySelector('#game-stage .gr-layer')?.hidden && !document.querySelector('#game-stage .draw-page')?.classList.contains('draw-lobby')));
      check(!!again, `${label} ${kind}: "Play again" starts a new game, the card goes`);
      check(!alex.errors.length && !sam.errors.length, `${label} ${kind}: no page errors`, [...alex.errors, ...sam.errors].slice(0, 2));
      for (const p of people) await p.ctx.close();
    }
  }
  await browser.close();
  console.log(fails ? `\n✗ ${fails} check(s) failed` : '\n✓ Game result harness passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
