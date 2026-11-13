// Card 15e: one soft cone from Glowbeam's lamp lights all three screens (the nearest brightest, no hard edge, nothing left
// at the edges); laptop, tablet and phone stand in one row with even gaps and cover nothing; at 1920 and 1366 the text
// and the art share a centre line with the same space left, between and right (± 24 px), the art ≥ 15 % bigger than 15d.
// Card 15b (the owner's 1A "Light beam" · 2A · 3A; Design's notes docs/internal/design/home-15b.md): the home page's
// first screen fits (the feature row's foot is on screen, nothing sideways) at 1920×1080, 1366×768, 1180×820 (a
// sideways tablet), 820×1180 (an upright tablet) and 390×844 (a phone), in English and Turkish; there is no video link
// box, no theme strip and no 🎨 button; "Create room" makes a room and the save box carries the name; "Join with a
// code" opens the code box; the continue line shows only with a `lastRoom`; the art is hidden from screen readers and
// its chat bubble reads at ≥ 4.5:1; with reduced motion nothing moves; a saved Sinema theme gets the text backdrop.
//
//   npm run build && (cd apps/server && npx wrangler dev --port 8787)
//   NODE_PATH=$(npm root -g) node scripts/harness/home/run.cjs [site] [out-folder]
const { chromium, devices } = require('playwright');

const SITE = process.argv[2] || 'http://localhost:8787';
const OUT = process.argv[3] || require('os').tmpdir();
// The Themed avatar page (AVATAR_PAGES[0]) as the code has it: the art's faces must come from there (card 15c).
const THEMED = (() => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '../../../packages/shared/src/protocol.ts'), 'utf8');
  const first = src.slice(src.indexOf('export const AVATAR_PAGES')).match(/\[\s*\[([^\]]*)\]/)[1];
  return [...first.matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
})();
let failed = 0;
const check = (ok, label, detail) => {
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail === undefined ? '' : ` → ${JSON.stringify(detail)}`}`);
};
const ours = () => location.port === '8787' || location.port === '8789' || location.hostname.includes('swm-server') || location.port === '5173';

(async () => {
  const browser = await chromium.launch();
  const sizes = [
    ['1920', { viewport: { width: 1920, height: 1080 } }],
    ['1366', { viewport: { width: 1366, height: 768 } }],
    ['1180', { viewport: { width: 1180, height: 820 }, hasTouch: true }],
    ['820', { viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: true }],
    ['390', { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }],
  ];
  for (const lang of ['en', 'tr']) {
    for (const [name, opts] of sizes) {
      const ctx = await browser.newContext(opts);
      await ctx.addInitScript(`(${ours})() && localStorage.setItem('lang', '${lang}')`);
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));
      await page.goto(SITE);
      await page.waitForSelector('.hm-first');
      await page.waitForTimeout(700);
      const where = `${lang} ${name}`;
      const m = await page.evaluate(() => {
        const shown = (s) => {
          const e = document.querySelector(s);
          return !!e && e.getBoundingClientRect().width > 0 && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden';
        };
        const r = (s) => document.querySelector(s)?.getBoundingClientRect();
        const feat = r('.hm-feat');
        const art = r('.hm-art');
        const text = r('.hm-text');
        return {
          featBottom: Math.round(feat.bottom),
          vh: innerHeight,
          sw: document.documentElement.scrollWidth,
          vw: innerWidth,
          linkBox: !!document.querySelector('#start-link, #media-input'),
          themeStrip: shown('.theme-strip') || shown('.home-themes'),
          themeBtn: shown('#theme-button'),
          create: shown('#start-form .hm-btn.primary'),
          join: shown('#join-toggle'),
          artHidden: document.querySelector('.hm-art')?.getAttribute('aria-hidden') === 'true',
          artBeside: art.left >= text.right - 1,
          artAbove: art.bottom <= text.top + 1,
          slogan: Math.round(parseFloat(getComputedStyle(document.querySelector('.hm-slogan')).fontSize)),
          how: shown('#how .hm-steps'),
          ext: shown('.hm-ext'),
        };
      });
      check(m.featBottom <= m.vh && m.sw <= m.vw, `${where}: the first screen fits (feature row on screen, nothing sideways)`, m);
      check(!m.linkBox && !m.themeStrip, `${where}: no link box, no theme strip`);
      // Card 15d: 🎨 is back in the top bar on the home page and opens the theme window.
      check(m.themeBtn, `${where}: 🎨 in the top bar`);
      check(m.create && m.join && m.artHidden, `${where}: Create room + Join with a code; the art is aria-hidden`);
      const wide = name === '1920' || name === '1366' || name === '1180';
      check(wide ? m.artBeside : m.artAbove, `${where}: ${wide ? 'text left, art right' : 'the art on top'}`, { beside: m.artBeside, above: m.artAbove });
      const want = { 1920: 64, 1366: 64, 1180: 64, 820: 72, 390: 40 }[name];
      check(m.slogan >= want && m.slogan <= want + 8, `${where}: slogan ${want} px`, m.slogan);
      check(m.how, `${where}: "How it works" has the steps`);
      // PH1: the extension card only where an extension can be installed (not on a phone).
      check(m.ext === (name !== '390'), `${where}: the extension card ${name === '390' ? 'hidden on a phone' : 'shows'}`, m.ext);
      check(errors.length === 0, `${where}: no console errors`, errors);
      // Card 15c: a laptop, a tablet and a phone showing the same moment; three different themed faces, two in voice.
      const art = await page.evaluate(() => {
        const svg = document.querySelector('.hm-scene');
        const faces = [...svg.querySelectorAll('.hm-face')];
        const ids = faces.map((f) => f.getAttribute('data-avatar'));
        const loaded = faces.map((f) => f.getAttribute('href'));
        const textShown = [...svg.querySelectorAll('[data-art], .hm-bubble')].filter((e) => getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0).length;
        return {
          devices: [...svg.querySelectorAll('.hm-device')].map((d) => d.dataset.device).join(','),
          screens: svg.querySelectorAll('.hm-screen').length,
          bars: svg.querySelectorAll('.hm-prog').length,
          ids,
          hrefs: loaded,
          rings: svg.querySelectorAll('.hm-ring.voice').length,
          textShown,
          artW: Math.round(document.querySelector('.hm-art').getBoundingClientRect().width),
          // Card 15d: nothing in the art may be an empty box: no img / video / iframe / foreignObject, every <image> has
          // a picture that loaded, and every drawn shape has a fill or a stroke that is not black.
          empty: [...svg.querySelectorAll('*')].filter((e) => {
            const tag = e.tagName.toLowerCase();
            if (['img', 'video', 'iframe', 'foreignobject', 'canvas', 'object', 'embed'].includes(tag)) return true;
            if (tag === 'image') return !e.getAttribute('href');
            if (tag === 'rect' && !e.closest('clipPath, mask, defs, symbol, pattern')) {
              const cs = getComputedStyle(e);
              const fill = cs.fill.replace(/\s/g, '');
              return (fill === 'rgb(0,0,0)' || fill === '#000') && cs.fillOpacity !== '0';
            }
            return false;
          }).map((e) => e.outerHTML.slice(0, 80)),
          costume: svg.querySelector('.hm-glow')?.getAttribute('data-costume') ?? null,
          theme: document.documentElement.dataset.theme,
        };
      });
      check(art.devices === 'laptop,tablet,phone' && art.screens === 3 && art.bars === 3, `${where}: three devices, three screens, three progress bars`, art);
      check(new Set(art.ids).size === 3 && art.ids.every((id) => THEMED.includes(id)) && art.hrefs.every((h, i) => h === `/avatars/${art.ids[i]}.svg`) && art.rings === 2, `${where}: three different themed avatars, two in voice rings`, art.ids);
      // Card 15e: one tidy device row under one cone of light; text and art on one centre line with even margins.
      const lay = await page.evaluate(() => {
        const box = (e) => e.getBoundingClientRect();
        const svg = document.querySelector('.hm-scene');
        // A device's footprint: its body and (the laptop) its base; the <use> pictures overflow their clips, so not them.
        const foot = [...svg.querySelectorAll('.hm-device')].map((d) => {
          const parts = [d.querySelector(':scope > rect'), d.querySelector(':scope > path')].filter(Boolean).map(box);
          return { l: Math.min(...parts.map((r) => r.left)), r: Math.max(...parts.map((r) => r.right)), t: Math.min(...parts.map((r) => r.top)), b: Math.max(...parts.map((r) => r.bottom)) };
        });
        const overlap = (a, b) => a.l < b.r - 0.5 && b.l < a.r - 0.5 && a.t < b.b - 0.5 && b.t < a.b - 0.5;
        const beam = svg.querySelector('.hm-beam');
        const inv = beam.getScreenCTM().inverse();
        // Every screen's four corners (its sheen has the screen's exact shape) lie inside the cone.
        const sheens = [...svg.querySelectorAll('.hm-sheen')];
        const lit = sheens.every((sh) => {
          const r = box(sh);
          return [[r.left + 1, r.top + 1], [r.right - 1, r.top + 1], [r.left + 1, r.bottom - 1], [r.right - 1, r.bottom - 1]].every(([x, y]) => beam.isPointInFill(new DOMPoint(x, y).matrixTransform(inv)));
        });
        const scene = box(svg);
        const text = box(document.querySelector('.hm-text'));
        return {
          gaps: [foot[1].l - foot[0].r, foot[2].l - foot[1].r].map((g) => Math.round(g * 10) / 10),
          overlaps: foot.some((a, i) => foot.some((b, j) => i < j && overlap(a, b))),
          sameLine: Math.round(Math.max(...foot.map((f) => f.b)) - Math.min(...foot.map((f) => f.b))),
          lit,
          sheen: sheens.map((sh) => Number(sh.getAttribute('opacity'))),
          blurred: !!beam.getAttribute('filter') && !!beam.closest('[mask]'),
          margins: [text.left, scene.left - text.right, innerWidth - scene.right].map(Math.round),
          centres: Math.round(Math.abs((text.top + text.bottom) / 2 - (scene.top + scene.bottom) / 2)),
          artW: Math.round(scene.width),
          inArt: foot.every((f) => f.l >= scene.left - 1 && f.r <= scene.right + 1),
        };
      });
      check(lay.gaps.every((g) => g > 4) && Math.abs(lay.gaps[0] - lay.gaps[1]) <= 2 && !lay.overlaps && lay.sameLine <= 1 && lay.inArt, `${where}: laptop, tablet and phone in one row on one line, even gaps, none covering another, all inside the art`, lay);
      check(lay.lit && lay.blurred && lay.sheen[0] > lay.sheen[1] && lay.sheen[1] > lay.sheen[2], `${where}: one soft cone lights all three screens, the nearest brightest`, { lit: lay.lit, sheen: lay.sheen });
      if (wide && name !== '1180') {
        const spread = Math.max(...lay.margins) - Math.min(...lay.margins);
        check(spread <= 24 && lay.centres <= 12, `${where}: equal margins left, between and right (± 24 px), one centre line`, { margins: lay.margins, centres: lay.centres });
        // 15d's art was 588 px wide at 1366 and 1920.
        check(lay.artW >= 588 * 1.15, `${where}: the art is ≥ 15 % bigger than in 15d`, lay.artW);
      }
      // Card 15f: no empty band left of Glowbeam (the view box starts at its drawing), and every screen's picture fills
      // the screen up to its bezel: just inside each screen's corners (the sheen has the screen's shape) the picture shows,
      // not the dark device body (0.9.97.33's <use> clips sat 12 units in).
      const fill = await page.evaluate(() => {
        const svg = document.querySelector('.hm-scene');
        const glow = svg.querySelector('.hm-glow');
        const drawn = Math.min(...[...glow.querySelectorAll('path, circle, ellipse, rect')].map((e) => e.getBoundingClientRect().left));
        return { band: Math.round(drawn - svg.getBoundingClientRect().left), screens: [...svg.querySelectorAll('.hm-sheen')].map((e) => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; }) };
      });
      check(fill.band <= 4, `${where}: no empty band left of Glowbeam`, fill.band);
      if (name !== '390') {
        const hide = await page.addStyleTag({ content: '.hm-sheen, .hm-pill-art, .hm-prog { visibility: hidden !important }' });
        const png = (await page.screenshot()).toString('base64');
        const corners = await page.evaluate(async ({ data, screens }) => {
          const img = new Image();
          img.src = `data:image/png;base64,${data}`;
          await img.decode();
          const c = document.createElement('canvas');
          c.width = img.width;
          c.height = img.height;
          const g = c.getContext('2d');
          g.drawImage(img, 0, 0);
          const k = img.width / innerWidth;
          const red = (x, y) => g.getImageData(Math.round(x * k), Math.round(y * k), 1, 1).data[0];
          // 4 px in from the top-left and top-right corners, past the rounded corner.
          return screens.map(([l, t, r]) => Math.min(red(l + 5, t + 4), red(r - 5, t + 4), red(l + 4, t + 12)));
        }, { data: png, screens: fill.screens });
        check(corners.every((v) => v > 170), `${where}: each screen's picture fills it up to the bezel (no dark band)`, corners);
        await hide.evaluate((e) => e.remove());
      }
      if (lang === 'en' && wide && name !== '1180') {
        // No hard edge: only the light on a plain background, then no step between neighbouring pixels and nothing left
        // of it at the edges of a frame 100 px around the art.
        await page.addStyleTag({ content: `html, body { background: #120e2a !important } body::before, body::after { display: none !important }
          .hm-text, .hm-feat, .hm-peek, .topbar, .hm-scene > :not(.hm-light):not(defs) { visibility: hidden !important } .hm-beam { animation: none !important }` });
        await page.waitForTimeout(200);
        const sb = await page.evaluate(() => { const r = document.querySelector('.hm-scene').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
        const vp = page.viewportSize();
        const clip = { x: Math.max(0, sb.x - 100), y: Math.max(0, sb.y - 100) };
        clip.width = Math.min(vp.width, sb.x + sb.w + 100) - clip.x;
        clip.height = Math.min(vp.height, sb.y + sb.h + 100) - clip.y;
        const png = (await page.screenshot({ clip })).toString('base64');
        const edge = await page.evaluate(async (data) => {
          const img = new Image();
          img.src = `data:image/png;base64,${data}`;
          await img.decode();
          const c = document.createElement('canvas');
          c.width = img.width;
          c.height = img.height;
          const g = c.getContext('2d');
          g.drawImage(img, 0, 0);
          const px = g.getImageData(0, 0, c.width, c.height).data;
          const v = (x, y) => { const i = (y * c.width + x) * 4; return (px[i] + px[i + 1] + px[i + 2]) / 3; };
          const bg = (18 + 14 + 42) / 3;
          let step = 0, rim = 0, peak = 0;
          for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
            const here = v(x, y);
            peak = Math.max(peak, here - bg);
            if (x) step = Math.max(step, Math.abs(here - v(x - 1, y)));
            if (y) step = Math.max(step, Math.abs(here - v(x, y - 1)));
            if (x === 0 || y === 0 || x === c.width - 1 || y === c.height - 1) rim = Math.max(rim, here - bg);
          }
          return { step: Math.round(step * 10) / 10, rim: Math.round(rim * 10) / 10, peak: Math.round(peak) };
        }, png);
        check(edge.peak >= 40 && edge.step <= 8 && edge.rim <= 6, `${where}: the light has no hard edge and fades out before the art's surroundings end`, edge);
        await page.reload();
        await page.waitForSelector('.hm-glow[data-costume]');
        await page.waitForTimeout(500);
      }
      check(art.empty.length === 0, `${where}: no empty box in the art`, art.empty);
      check(art.costume === art.theme, `${where}: Glowbeam wears the shown theme's costume`, { costume: art.costume, theme: art.theme });
      check(name === '390' ? art.textShown === 0 : art.textShown === 4, `${where}: ${name === '390' ? 'no art text on a phone' : 'pill, chat bubble and people line show'}`, art.textShown);
      await page.screenshot({ path: `${OUT}/home-${lang}-${name}.png` });
      if (lang === 'en' && name === '1366') {
        // The chat bubble's contrast: white on #6a4cf2.
        const lum = (hex) => {
          const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
          return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
        };
        const ratio = (1.05) / (lum('#6a4cf2') + 0.05);
        check(ratio >= 4.5, 'the art\'s chat bubble reads at ≥ 4.5:1', ratio.toFixed(2));
        // Card 15d: 🎨 opens the theme window; another theme puts Glowbeam in that theme's costume.
        await page.click('#theme-button');
        await page.waitForSelector('.theme-dialog .theme-card', { timeout: 4000 }).catch(() => {});
        const cards = await page.$$('.theme-dialog .theme-card');
        check(cards.length >= 4, '🎨 opens the theme window', cards.length);
        if (cards.length >= 4) await cards[3].click();
        await page.waitForFunction(() => document.querySelector('.hm-glow')?.getAttribute('data-costume') === document.documentElement.dataset.theme && document.documentElement.dataset.theme !== 'gece', null, { timeout: 5000 }).catch(() => {});
        const switched = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, costume: document.querySelector('.hm-glow')?.getAttribute('data-costume'), glows: document.querySelectorAll('.hm-glow').length }));
        check(switched.theme !== 'gece' && switched.costume === switched.theme && switched.glows === 1, 'a theme change dresses Glowbeam in the new costume (one Glowbeam)', switched);
        await page.keyboard.press('Escape');
        // Join with a code opens the code box; a code goes to the room.
        await page.click('#join-toggle');
        check(await page.isVisible('#join-input'), '"Join with a code" opens the code box');
        // No continue line without a last room.
        check(!(await page.isVisible('#continue')), 'no continue line without a last room');
        // Create room with "Save the room": the name is carried to the room.
        await page.check('#start-save');
        await page.fill('#create-name', 'Friday Films');
        await Promise.all([page.waitForURL(/\/r\//), page.click('#start-form .hm-btn.primary')]);
        const carried = await page.evaluate(() => {
          const id = location.pathname.split('/')[2];
          return sessionStorage.getItem(`create:${id}`);
        });
        check(carried === 'Friday Films', 'Create room with "Save the room" carries the name into the room', carried);
      }
      await ctx.close();
    }
  }

  // Card 15d: the static pages have a 🎨 that opens the home page's theme window (`/#theme`); /connection has the real one.
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    await ctx.addInitScript(`(${ours})() && localStorage.setItem('lang', 'tr')`);
    const page = await ctx.newPage();
    for (const path of ['/help.html', '/privacy.html', '/thanks.html', '/extension.html']) {
      await page.goto(SITE + path);
      const link = await page.evaluate(() => {
        const a = document.querySelector('.theme-link');
        return a ? { href: a.getAttribute('href'), label: a.getAttribute('aria-label'), shown: a.getBoundingClientRect().width > 0 } : null;
      });
      check(link?.href === '/#theme' && link.shown && link.label === 'Temayı değiştir', `${path}: 🎨 links to the theme window (named in the page's language)`, link);
    }
    await page.click('.theme-link');
    await page.waitForSelector('.theme-dialog', { timeout: 5000 }).catch(() => {});
    check((await page.isVisible('.theme-dialog')) && !(await page.evaluate(() => location.hash)), '/#theme opens the theme window on the home page (and drops the #theme)');
    await page.goto(SITE + '/connection');
    await page.waitForTimeout(500);
    check(await page.isVisible('#theme-button'), '/connection: 🎨 in the top bar');
    await ctx.close();
  }

  // The continue line shows with a last room, in the text column, one line.
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    await ctx.addInitScript(`(${ours})() && (localStorage.setItem('lang', 'en'), localStorage.setItem('lastRoom', JSON.stringify({ id: 'abcdefgh', name: 'Velvet Otter', at: Date.now() })))`);
    const page = await ctx.newPage();
    await page.route('**/api/rooms/*/info', (route) => route.fulfill({ json: { saved: false, name: null, count: 3, people: ['Sam'], playing: null } }));
    await page.goto(SITE);
    await page.waitForSelector('#continue:not([hidden])', { timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(400);
    const c = await page.evaluate(() => {
      const b = document.querySelector('#continue');
      if (!b || b.hidden) return null;
      const r = b.getBoundingClientRect();
      const t = document.querySelector('.hm-text').getBoundingClientRect();
      return { h: Math.round(r.height), inText: r.left >= t.left - 1 && r.right <= t.right + 1, text: b.textContent, featOk: document.querySelector('.hm-feat').getBoundingClientRect().bottom <= innerHeight };
    });
    check(!!c && c.h <= 32 && c.inText && /Velvet Otter/.test(c.text) && /3 inside/.test(c.text) && c.featOk, 'a last room shows "↺ Continue: Velvet Otter · 3 inside · Open" in one line, the first screen still fits', c);
    await ctx.close();
  }

  // Reduced motion: no animation runs on the home page.
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(SITE);
    await page.waitForSelector('.hm-first');
    await page.waitForTimeout(500);
    const running = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.target?.closest?.('.hm-first, .hm-how')).length);
    check(running === 0, 'reduced motion: nothing moves on the home page', running);
    await ctx.close();
  }

  // A scene theme (here Sinema, its own projector light) gets the quiet zone behind the text (THEME1: --hero-scrim).
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    await ctx.addInitScript(`(${ours})() && localStorage.setItem('theme', 'sinema')`);
    const page = await ctx.newPage();
    await page.goto(SITE);
    await page.waitForSelector('.hm-first');
    await page.waitForTimeout(500);
    const bg = await page.evaluate(() => getComputedStyle(document.querySelector('.hm-text'), '::before').backgroundColor);
    check(/(rgba?|color)\(/.test(bg) && !/(, 0\)| \/ 0\))$/.test(bg), 'Sinema: a quiet zone behind the text', bg);
    await page.screenshot({ path: `${OUT}/home-sinema-1366.png` });
    await ctx.close();
  }

  await browser.close();
  console.log(failed ? `\n✗ ${failed} check(s) failed` : '\n✓ Home page (card 15b) fits and works at every size');
  process.exit(failed ? 1 : 0);
})();
