// Card R27 (owner, 4 Nov 2026): the avatar picker has no tabs any more: one grid shows every avatar (themed and genre
// mixed) in a fixed order, the same on every open and in every browser; a pick is applied with "OK" or a double
// click; the grid may scroll. Checked on the join card at 1366 × 768 and on a phone (390 × 844).
//
//   npm run build && (cd apps/server && npx wrangler dev --port 8787)
//   NODE_PATH=$(npm root -g) node scripts/harness/avatar-picker/run.cjs [site] [out-folder]
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');

const SITE = process.argv[2] || 'http://localhost:8787';
const OUT = process.argv[3] || require('os').tmpdir();
// Every avatar the code has (both pages of AVATAR_PAGES).
const ALL = (() => {
  const src = fs.readFileSync(path.join(__dirname, '../../../packages/shared/src/protocol.ts'), 'utf8');
  const block = src.slice(src.indexOf('export const AVATAR_PAGES'), src.indexOf('] as const;', src.indexOf('export const AVATAR_PAGES')));
  return [...block.replace(/\/\/.*$/gm, '').matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
})();
let failed = 0;
const check = (ok, label, detail) => {
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail === undefined ? '' : ` → ${JSON.stringify(detail)}`}`);
};

(async () => {
  const browser = await chromium.launch();
  const orders = [];
  for (const [name, opts] of [['1366', { viewport: { width: 1366, height: 768 } }], ['390', { ...devices['iPhone 13'] }]]) {
    const ctx = await browser.newContext(opts);
    await ctx.addInitScript(() => localStorage.setItem('lang', 'en'));
    const page = await ctx.newPage();
    await page.goto(`${SITE}/r/pick${Math.random().toString(36).slice(2, 7)}`);
    await page.waitForSelector('#join-avatar img');
    const open = async () => {
      await page.click('#join-avatar');
      await page.waitForSelector('.avatar-dialog .avatar-option');
      return page.evaluate(() => {
        const dialog = document.querySelector('.avatar-dialog');
        const grid = dialog.querySelector('.avatar-grid');
        const r = dialog.getBoundingClientRect();
        return {
          tabs: dialog.querySelectorAll('.avatar-tabs, [role="tab"]').length,
          ids: [...dialog.querySelectorAll('.avatar-option img')].map((img) => img.getAttribute('src').replace(/^\/avatars\/|\.svg$/g, '')),
          inView: r.top >= 0 && r.bottom <= innerHeight + 1 && r.left >= 0 && r.right <= innerWidth + 1,
          scrolls: grid.scrollHeight > grid.clientHeight + 1,
          gridOk: grid.scrollWidth <= grid.clientWidth + 1,
        };
      });
    };
    const first = await open();
    check(first.tabs === 0, `${name}: no tab row in the picker`, first.tabs);
    check(first.ids.length === ALL.length && [...first.ids].sort().join() === [...ALL].sort().join(), `${name}: one grid with every avatar once (${ALL.length})`, first.ids.length);
    const themed = new Set(ALL.slice(0, 13));
    const firstRow = first.ids.slice(0, 8);
    check(firstRow.some((id) => themed.has(id)) && firstRow.some((id) => !themed.has(id)), `${name}: themed and genre avatars mixed from the first row`, firstRow);
    check(first.inView && first.gridOk, `${name}: the window fits the screen, nothing sideways (the grid ${first.scrolls ? 'scrolls' : 'fits'})`, first);
    await page.screenshot({ path: `${OUT}/avatar-picker-${name}.png` });
    // Pick one and press OK: the join card shows it.
    const target = first.ids[first.ids.length - 1];
    await page.click(`.avatar-dialog .avatar-option img[src="/avatars/${target}.svg"]`);
    await page.click('.avatar-dialog .dialog-foot .btn.primary');
    await page.waitForTimeout(200);
    const shown = await page.evaluate(() => document.querySelector('#join-avatar img')?.getAttribute('src'));
    check(shown === `/avatars/${target}.svg`, `${name}: a pick + OK sets the avatar`, shown);
    const again = await open();
    check(again.ids.join() === first.ids.join(), `${name}: the same order when opened again`);
    // A double click picks too.
    const other = again.ids[0];
    await page.dblclick(`.avatar-dialog .avatar-option img[src="/avatars/${other}.svg"]`);
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => ({ src: document.querySelector('#join-avatar img')?.getAttribute('src'), open: !!document.querySelector('.avatar-dialog') }));
    check(after.src === `/avatars/${other}.svg` && !after.open, `${name}: a double click picks and closes`, after);
    orders.push(first.ids.join());
    await ctx.close();
  }
  check(orders[0] === orders[1], 'the order is the same in another browser');
  await browser.close();
  console.log(failed ? `\n✗ ${failed} check(s) failed` : '\n✓ The avatar picker is one fixed grid');
  process.exit(failed ? 1 : 0);
})();
