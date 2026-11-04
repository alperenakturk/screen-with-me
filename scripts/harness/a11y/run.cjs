// Accessibility pass (card A11y; Design's findings in docs/internal/design/a11y-1.md): axe-core (WCAG 2.0 / 2.1 A + AA)
// on the home page, the join card, the empty room, the ⚙️ settings dialog, the invite window and the Help page, in
// English at 1366×768 and on a phone, plus a keyboard tour: Tab order starts at the top bar (after the skip link), the
// rail's buttons are reachable after the video, dialogs keep the focus inside and give it back to their button, the
// ⋯ More menu moves with the arrow keys. axe-core is not a dependency of the site: CI installs it for this run only.
//
//   npm run build && (cd apps/server && npx wrangler dev --port 8787)
//   npm i --no-save axe-core@4.10.2   (once)
//   NODE_PATH=$(npm root -g) node scripts/harness/a11y/run.cjs [site]
const { chromium, devices } = require('playwright');
const path = require('path');

const SITE = process.argv[2] || 'http://localhost:8787';
const AXE = require.resolve('axe-core/axe.min.js', { paths: [process.cwd(), path.join(__dirname, '../../..')] });
let failed = 0;
const check = (ok, label, detail) => {
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail === undefined ? '' : ` → ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`}`);
};
const ours = `(location.port === '8787' || location.port === '5173' || location.hostname.includes('swm-server'))`;

async function axe(page, where, exclude = []) {
  await page.addScriptTag({ path: AXE });
  const result = await page.evaluate(
    async (exclude) =>
      // eslint-disable-next-line no-undef
      axe.run({ exclude: exclude.map((s) => [s]) }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, resultTypes: ['violations'] }),
    exclude,
  );
  const list = result.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => `${n.target.join(' ')}${v.id === 'color-contrast' ? ` [${n.any[0]?.message ?? ''}]` : ''}`).join(' | ')}`);
  check(list.length === 0, `${where}: axe finds nothing`, list.join('\n       '));
}

const room = () => `a11y${Math.random().toString(36).slice(2, 7)}`;
async function join(page) {
  await page.waitForSelector('#name');
  await page.fill('#name', 'Alex');
  await page.click('#name-form button.primary');
  await page.waitForSelector('.room');
  await page.waitForTimeout(1200);
}

(async () => {
  const browser = await chromium.launch();
  for (const [label, opts] of [
    ['computer', { viewport: { width: 1366, height: 768 } }],
    ['phone', { ...devices['Pixel 7'] }],
  ]) {
    const ctx = await browser.newContext({ ...opts, bypassCSP: true });
    await ctx.addInitScript(`${ours} && (localStorage.setItem('lang', 'en'), localStorage.setItem('tipsSeen', '1'), localStorage.setItem('opt:autoInvite', '0'))`);
    const page = await ctx.newPage();
    await page.goto(SITE);
    await page.waitForSelector('.hm-first');
    await page.waitForTimeout(500);
    await axe(page, `${label} home`);

    await page.goto(`${SITE}/help.html`);
    await page.waitForTimeout(500);
    await axe(page, `${label} help`);

    const id = room();
    await page.goto(`${SITE}/r/${id}`);
    await page.waitForSelector('#name');
    await page.waitForTimeout(400);
    await axe(page, `${label} join card`);
    await join(page);
    // The intro plays over the room for ~3 s.
    await page.waitForTimeout(2500);
    await axe(page, `${label} empty room`);

    if (label === 'computer') {
      await page.click('#settings-open');
      await page.waitForTimeout(400);
      await axe(page, `${label} settings dialog`);
      await page.keyboard.press('Escape');
      await page.click('#invite-btn');
      await page.waitForSelector('.invite-dialog, #invite-dialog, .dialog-backdrop:not([hidden])');
      await page.waitForTimeout(400);
      await axe(page, `${label} invite window`);
      await page.keyboard.press('Escape');
      // The games hall and a tic-tac-toe table.
      // By keyboard (the rail lets a mouse-less click's window close when the mouse is elsewhere).
      for (let i = 0; i < 40; i++) {
        await page.keyboard.press('Tab');
        if (await page.evaluate(() => document.activeElement?.id === 'dock-game')) break;
      }
      // If the Tab walk started somewhere else (the focus a closed dialog hands back), put it on 🎮 itself: the check
      // is about opening the hall from the keyboard (Enter), not about where the walk began (it timed out in CI).
      await page.evaluate(() => {
        const button = document.getElementById('dock-game');
        if (document.activeElement !== button) button?.focus();
      });
      await page.keyboard.press('Enter');
      await page.waitForSelector('#game-menu:not([hidden])');
      await page.waitForTimeout(500);
      await axe(page, `${label} games hall`);
      // XOX lives on the Classics shelf: the shelf first, then the board.
      await page.evaluate(() => document.querySelector('#game-menu [data-kind="classics"]')?.click());
      await page.waitForSelector('#game-stage:not([hidden]) .cl-shelf .cl-box', { timeout: 6000 }).catch(() => {});
      await page.waitForTimeout(400);
      await axe(page, `${label} classics shelf`);
      await page.evaluate(() => document.querySelector('#game-stage .cl-box[data-board="xox"]')?.click());
      await page.waitForSelector('#game-stage:not([hidden]) .xox-board', { timeout: 6000 }).catch(() => {});
      await page.waitForTimeout(600);
      await axe(page, `${label} tic-tac-toe`);
    }
    await ctx.close();
  }

  // The first-time tips (a fresh browser, no tipsSeen).
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, bypassCSP: true });
    await ctx.addInitScript(`${ours} && (localStorage.setItem('lang', 'en'), localStorage.setItem('opt:autoInvite', '0'))`);
    const page = await ctx.newPage();
    await page.goto(`${SITE}/r/${room()}`);
    await join(page);
    await page.waitForSelector('.first-tip, [class*="tip"][role="dialog"]', { timeout: 6000 }).catch(() => {});
    await page.waitForTimeout(3000);
    await axe(page, 'first-time tips');
    await ctx.close();
  }

  // ---- Keyboard tour (computer) ----
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    await ctx.addInitScript(`${ours} && (localStorage.setItem('lang', 'en'), localStorage.setItem('tipsSeen', '1'), localStorage.setItem('opt:autoInvite', '0'))`);
    const page = await ctx.newPage();
    await page.goto(`${SITE}/r/${room()}`);
    await join(page);
    await page.waitForTimeout(2500);
    // A fresh load (the same tab skips the name step): the walk starts at the top of the page, as a person's would.
    await page.reload();
    await page.waitForSelector('.room');
    await page.waitForTimeout(2500);
    const stops = [];
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      stops.push(
        await page.evaluate(() => {
          const e = document.activeElement;
          if (!e || e === document.body) return 'body';
          return e.id ? `#${e.id}` : `${e.tagName.toLowerCase()}.${String(e.className).split(' ')[0]}`;
        }),
      );
    }
    const first = stops.indexOf('#skip-link');
    const invite = stops.indexOf('#invite-btn');
    const media = stops.indexOf('#media-input');
    check(first === 0, 'keyboard: the first Tab stop is "Skip to the video"', stops.slice(0, 3));
    check(invite > 0 && media > 0 && invite < media, 'keyboard: the top bar comes before the link box', { invite, media });
    const rail = stops.findIndex((s) => s === '#dock-react' || s === '#dock-voice-mic' || s.startsWith('#dock-'));
    check(rail > media, 'keyboard: the rail beside the video is reachable by Tab', { rail, stops: stops.slice(media, media + 8) });
    // Tab again to the first rail button and look at it while it holds the keyboard focus.
    await page.reload();
    await page.waitForSelector('.room');
    await page.waitForTimeout(2500);
    let ring = null;
    for (let i = 0; i < 40 && !ring; i++) {
      await page.keyboard.press('Tab');
      if (!(await page.evaluate(() => !!document.activeElement?.closest?.('#fs-dock')))) continue;
      // The rail fades in over 0.22 s (a slower CI machine measured it mid-fade).
      await page.waitForTimeout(500);
      ring = await page.evaluate(() => {
        const b = document.activeElement;
        if (!b?.closest?.('#fs-dock')) return null;
        const dock = document.querySelector('#fs-dock');
        return { id: b.id, visible: Number(getComputedStyle(dock).opacity) > 0.5 && getComputedStyle(dock).visibility === 'visible', outline: getComputedStyle(b).outlineStyle, ring: b.matches(':focus-visible') };
      });
    }
    ring ??= { visible: false, outline: 'none' };
    check(ring.visible && ring.outline !== 'none', 'keyboard: a focused rail button shows the rail and a focus ring', ring);

    // ⚙️ Settings: focus stays inside while tabbing, Esc gives it back to ⚙️.
    await page.focus('#settings-open');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => !!document.activeElement?.closest('#settings-dialog'), null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(200);
    let outside = 0;
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      if (!(await page.evaluate(() => !!document.activeElement?.closest('#settings-dialog')))) outside++;
    }
    check(outside === 0, 'keyboard: Tab stays inside the settings dialog', outside);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    check(await page.evaluate(() => document.activeElement?.id === 'settings-open'), 'keyboard: Esc gives the focus back to ⚙️');

    // 🔗 Invite: same.
    await page.focus('#invite-btn');
    await page.keyboard.press('Enter');
    // The invite window is a lazy chunk: on a slow machine it opens well after 500 ms. Wait until it holds the focus.
    await page.waitForFunction(() => !!document.activeElement?.closest('.dialog-backdrop:not([hidden])'), null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(200);
    outside = 0;
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Tab');
      if (!(await page.evaluate(() => !!document.activeElement?.closest('.dialog-backdrop')))) outside++;
    }
    check(outside === 0, 'keyboard: Tab stays inside the invite window', outside);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    check(await page.evaluate(() => document.activeElement?.id === 'invite-btn'), 'keyboard: Esc gives the focus back to 🔗 Invite');

    // ⋯ More: Enter opens it on the first item, ↓ moves, Esc closes and returns to ⋯.
    await page.focus('#room-more');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.activeElement?.getAttribute('role') === 'menuitem', null, { timeout: 8000 }).catch(() => {});
    const firstItem = await page.evaluate(() => document.activeElement?.getAttribute('role'));
    await page.keyboard.press('ArrowDown');
    const moved = await page.evaluate(() => {
      const items = [...document.querySelectorAll('[role="menuitem"]')].filter((e) => e.getBoundingClientRect().width > 0);
      return items.indexOf(document.activeElement);
    });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    const back = await page.evaluate(() => document.activeElement?.id);
    check(firstItem === 'menuitem' && moved === 1 && back === 'room-more', '⋯ More: focus on the first item, ↓ moves, Esc returns to ⋯', { firstItem, moved, back });
    await ctx.close();
  }

  await browser.close();
  console.log(failed ? `\n✗ ${failed} check(s) failed` : '\n✓ Accessibility: axe finds nothing, the keyboard tour works');
  process.exit(failed ? 1 : 0);
})();
