// Card QA1 part 3: "first look" screenshots for a PR. Takes every screen the change touched at a laptop (1366 × 768),
// a big monitor (1920 × 1080), an upright tablet (820 × 1180) and a phone (iPhone 13), and writes them with an index
// and a reviewer brief (REVIEW.md: CLAUDE.md's product rules + what to look for). A fresh reviewer (a subagent that gets
// only that folder, not the developer's reasoning) lists what looks wrong; the developer fixes or answers each line.
//
//   built site on a local server with the lab flag (CI's `wrangler dev ... --var SWM_LAB_SERVER:1`), then:
//   NODE_PATH=$(npm root -g) node scripts/shots.cjs [site] [--screens room,settings,games] [--base origin/main]
//     [--sizes laptop,desktop,tablet,phone] [--langs en,tr] [--video http://localhost:5300/video.webm] [--out dir]
//
// Without --screens it reads `git diff --name-only <base>...HEAD` and picks the screens those files show (SCREEN_FOR).
// `--screens list` prints every screen. A game screen per game: `game:<kind>` (kinds from the Test Lab's
// `games.open.<kind>` commands), `games` = all of them. Output: --out (default `.shots/<branch>`, git-ignored).
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : fallback;
};
const SITE = argv.find((a) => /^https?:\/\//.test(a) && argv[argv.indexOf(a) - 1] !== '--video') || 'http://localhost:8787';
const VIDEO = flag('video', process.env.FILM_URL || 'http://localhost:5300/video.webm');
const LANGS = flag('langs', 'en').split(',');
const SIZES = {
  laptop: { viewport: { width: 1366, height: 768 } },
  desktop: { viewport: { width: 1920, height: 1080 } },
  tablet: { viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  phone: devices['iPhone 13'],
  'tablet-land': { viewport: { width: 1180, height: 820 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  'phone-land': devices['iPhone 13 landscape'],
};
// Themes by id (themes.ts): gece = Night (the default), matinee = Matinee, sinema / lokum … = scene themes.
const THEMES = flag('themes', 'gece').split(',');
const sizeNames = flag('sizes', 'laptop,desktop,tablet,phone').split(',');
const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
const branch = (() => {
  try {
    return git('rev-parse', '--abbrev-ref', 'HEAD').replace(/[^\w.-]+/g, '-');
  } catch {
    return 'shots';
  }
})();
const OUT = path.resolve(flag('out', path.join(ROOT, '.shots', branch)));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
/** A phone keeps the link box in its 🔍 Search tab. */
const searchTab = async (p) => {
  if (!(await p.isVisible('#media-input'))) await p.click('#ph-tab-search');
};
/** Card SH2: start a ▶ "Popular now · Music" feed from the Queue (the chart answer is SEARCH_ITEMS' long videos). */
const startFeed = async (p) => {
  await p.route('**/api/youtube/**', (route) => route.fulfill({ json: { items: SEARCH_ITEMS.filter((i) => !i.short) } }));
  if (await p.isVisible('#ph-tab-search')) await p.click('#ph-tab-search');
  else await p.click('.tab[data-tab="queue"]');
  await p.click('#feed-open-videos');
  await p.click('#feed-pools .feed-pool[data-pool="music"]');
  await p.waitForSelector('#feed-row-steer');
  await wait(1500);
};
const SEARCH_ITEMS = [
  { id: 'aqz-KE-bpKQ', title: 'A night walk through the old harbour, filmed in one take', channel: 'Harbour Films', duration: 1832, live: false },
  { id: 'dQw4w9WgXcQ', title: 'Night walk sounds', channel: 'Calm Channel', duration: 3605, live: false },
  { id: '9bZkp7q5F8I', title: 'Walking at night, a short', channel: 'Alex', duration: 41, live: false, short: true },
];

/** The screens, each a way to get there from a fresh page. `room` = a fresh room as its first person (the host). */
const SCREENS = {
  // TH3: the home art freezes at its middle (the Test Lab's `home.art` class), so every shot is the same frame.
  home: { what: 'Home page', go: (p) => p.goto(`${SITE}/`), after: (p) => p.evaluate(() => document.documentElement.classList.add('hm-frozen')) },
  help: { what: 'Help page', go: (p) => p.goto(`${SITE}/help.html`) },
  privacy: { what: 'Privacy policy', go: (p) => p.goto(`${SITE}/privacy.html`) },
  terms: { what: 'Terms of use', go: (p) => p.goto(`${SITE}/terms.html`) },
  extension: { what: 'Extension page', go: (p) => p.goto(`${SITE}/extension.html`) },
  join: { what: 'Join card (an invited person, before entering)', go: (p) => p.goto(`${SITE}/r/${room()}`).then(() => p.waitForSelector('#name')) },
  room: { what: 'Empty room after joining', room: true },
  invite: { what: 'Invite window (🔗 Invite)', room: true, after: (p) => p.evaluate(() => document.querySelector('#invite-btn')?.click()) },
  'games-hall': {
    what: 'Games hall (🎮: the games gallery)',
    room: true,
    video: true,
    after: async (p) => {
      await p.evaluate(() => {
        const b = [...document.querySelectorAll('#game-btn, #dock-game, #shorts-game, .room-more-game, [data-more="game"]')].find((x) => x.getBoundingClientRect().width > 0) ?? document.querySelector('#game-btn');
        b?.click();
      });
      await wait(1500);
    },
  },
  'lab-drawer': { what: 'Test Lab drawer (🐞 open)', room: true, keepLab: true, after: async (p) => { await p.waitForSelector('.debug-fab', { state: 'attached' }); await p.evaluate(() => document.querySelector('.debug-fab').click()); await wait(800); } },
  'room-video': { what: 'Room playing a video file', room: true, video: true },
  // Cinema mode (card 14) is the room's only way to hide the side panel. Computers only: a phone's room is one column
  // and a touch-only tablet doesn't offer it (it needs a mouse for its edges).
  'room-cinema': { what: 'Room playing a video in cinema mode (#side-toggle: the side panel hides, the video fills the page)', room: true, video: true, sizes: ['laptop', 'desktop'], after: (p) => p.evaluate(() => document.querySelector('#side-toggle')?.click()) },
  // Card UI2: the rail's ⋯ with its one "⏩ Speed" row opened into the speed picker (computers: the rail opens at the
  // video's right edge).
  'rail-speed': {
    what: 'The rail\'s ⋯ menu beside a playing video, its "⏩ Speed · 1×" row opened into the speed picker (ready speeds, − value +)',
    room: true,
    video: true,
    sizes: ['laptop', 'desktop', 'tablet-land'],
    after: async (p) => {
      const w = await p.evaluate(() => { const r = document.querySelector('.player-wrap').getBoundingClientRect(); return { r: r.right, t: r.top, h: r.height }; });
      await p.mouse.move(w.r - 220, w.t + w.h / 2);
      await p.mouse.move(w.r - 20, w.t + w.h / 2, { steps: 5 });
      await p.click('#dock-more');
      await p.click('#dock-speed-row');
    },
  },
  // Card SR2: the link box's results and the ⠿ Sources picker. YouTube's answer is a fixed list (no quota, no network).
  sources: { what: 'The ⠿ Sources picker open beside the link box (YouTube, Vimeo, Search the web, ♪ TikTok)', room: true, after: async (p) => { await searchTab(p); await p.click('#media-sources'); await p.waitForSelector('#sources-pop:not([hidden]) .sources-tile'); } },
  'search-results': {
    what: 'YouTube results under the link box while a video file plays: a tap on a row plays it, "＋ Queue" beside each row queues it (the second row was just queued)',
    room: true,
    video: true,
    after: async (p) => {
      await p.route('**/api/youtube/search**', (route) => route.fulfill({ json: { items: SEARCH_ITEMS } }));
      await searchTab(p);
      await p.fill('#media-input', 'night walk');
      await p.press('#media-input', 'Enter');
      await p.waitForSelector('#search-results .search-row');
      await p.click('#search-results .search-row:nth-child(2) .search-queue');
    },
  },
  // Card SH2: the room's feed in the Queue and its window (YouTube's answers are the fixed list above).
  'feed-queue': {
    what: 'The Queue ("Up next") with a ▶ video feed running: its row with ⏸, 🧭 Steer and ✕ above the queued videos',
    room: true,
    after: async (p) => {
      await startFeed(p);
      await p.keyboard.press('Escape');
    },
  },
  'feed-window': {
    what: 'The ▶ / ♾ feed window over the room while a feed runs: Pause / Stop, four ways to steer (each with its line), then the starters',
    room: true,
    after: async (p) => {
      await startFeed(p);
      await p.click('#feed-row-steer');
      await p.waitForSelector('#feed-steer-country');
    },
  },
  'tiktok-back': {
    what: 'Back in the room after the ♪ TikTok tile opened TikTok: the "📋 Paste and play" button',
    room: true,
    after: async (p) => {
      await p.evaluate(() => (window.open = () => null));
      await searchTab(p);
      await p.click('#media-sources');
      await p.click('.sources-tile[data-source="tiktok"]');
      await p.evaluate(() => dispatchEvent(new Event('focus')));
      await p.waitForSelector('#sources-paste:not([hidden])');
    },
  },
  ...Object.fromEntries(
    ['me', 'view', 'room', 'rules', 'schedule', 'sound', 'about'].map((sec) => [
      `settings-${sec}`,
      { what: `Settings → ${sec}`, room: true, lab: `settings.${sec}` },
    ]),
  ),
};
/** Which screens a changed file shows (first match wins; a file nobody maps shows the main room screens). */
const SCREEN_FOR = [
  [/^docs\/|\.md$|^\.github\/|^scripts\/(?!shots)/, []],
  [/^apps\/web\/public\/help/, ['help']],
  [/^apps\/web\/public\/privacy/, ['privacy']],
  [/^apps\/web\/public\/terms/, ['terms']],
  [/^apps\/web\/public\/extension|^apps\/extension\//, ['extension']],
  [/^apps\/web\/src\/(home|app)\.|^apps\/web\/index\.html|^apps\/web\/src\/styles\.css|^apps\/web\/src\/themes/, ['home', 'join', 'room']],
  [/^apps\/web\/src\/ui\/(search|sources|result-row|vimeo-results|podcasts)/, ['sources', 'search-results', 'tiktok-back']],
  [/^apps\/web\/src\/ui\/settings|^apps\/web\/src\/ui\/room-more/, ['settings-me', 'settings-view', 'settings-room', 'settings-rules', 'settings-sound', 'settings-about']],
  [/^apps\/web\/src\/games\/|^packages\/shared\/src\/games\//, ['games']],
  [/^apps\/web\/src\/(room\.|ui\/|phone|tablet|i18n)/, ['join', 'room', 'room-video', 'room-cinema']],
  [/^apps\/web\//, ['room']],
];
let roomSeq = 0;
const room = () => `shots${Date.now().toString(36)}${roomSeq++}`;

function pickScreens(gameKinds) {
  const asked = flag('screens');
  if (asked === 'list') {
    console.log([...Object.keys(SCREENS), 'games', ...gameKinds.map((k) => `game:${k}`)].join('\n'));
    process.exit(0);
  }
  let names;
  if (asked) names = asked.split(',');
  else {
    const base = flag('base', 'origin/main');
    const files = git('diff', '--name-only', `${base}...HEAD`).split('\n').filter(Boolean);
    names = [];
    for (const f of files) {
      const hit = SCREEN_FOR.find(([re]) => re.test(f));
      for (const s of hit ? hit[1] : ['room']) if (!names.includes(s)) names.push(s);
    }
    console.log(`${files.length} changed files since ${base} → ${names.join(', ') || 'no screens'}`);
  }
  // `games` = every game, `game:<kind>` = one.
  return names.flatMap((n) => (n === 'games' ? gameKinds.map((k) => `game:${k}`) : [n]));
}

/** A fresh room as its first person, with the Test Lab (?debug=1) so a lab command can open a screen. */
async function enterRoom(page, s) {
  await page.goto(`${SITE}/r/${room()}?debug=1`);
  await page.waitForSelector('#name');
  await page.fill('#name', 'Alex');
  await page.click('#name-form button.primary');
  await page.waitForSelector('.room-title-dot[data-status="open"]', { state: 'attached', timeout: 20000 });
  await wait(1200);
  // The room's intro fades out on its own; a shot must not catch it mid-fade.
  await page.waitForFunction(() => !document.querySelector('.swm-intro'), null, { timeout: 8000 }).catch(() => {});
  if (s.video) {
    // The link box is in the "＋ Add" sheet on a phone (hidden until opened): fill and press it from the page.
    await page.evaluate((url) => {
      const input = document.querySelector('#media-input');
      input.value = url;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector('#media-form button[value="load"]').click();
    }, VIDEO);
    await page.waitForFunction(() => document.querySelector('.room')?.classList.contains('has-item'), null, { timeout: 15000 }).catch(() => {});
    await wait(2500);
  }
}

async function lab(page, id) {
  await page.waitForFunction(() => !!window.__swmLab, null, { timeout: 20000 });
  const r = await page.evaluate((id) => window.__swmLab.run(id).then((l) => ({ dir: l.dir, text: l.text }), (e) => ({ dir: 'error', text: String(e) })), id);
  if (r.dir !== 'lab') throw new Error(`${id}: ${r.text}`);
  // The lab's own drawer would cover the screen: close it.
  await page.evaluate(() => document.querySelector('.debug-fab[aria-expanded="true"]')?.click());
  await wait(900);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  // The game kinds the lab can open (no list to keep in step by hand).
  const probe = await browser.newPage();
  await enterRoom(probe, {});
  await probe.waitForFunction(() => !!window.__swmLab, null, { timeout: 20000 }).catch(() => {});
  const gameKinds = await probe.evaluate(() => (window.__swmLab?.list() ?? []).map((c) => c.id).filter((id) => id.startsWith('games.open.')).map((id) => id.slice('games.open.'.length)));
  await probe.close();
  const screens = pickScreens(gameKinds);
  const index = [];
  const problems = [];
  for (const name of screens) for (const theme of THEMES) {
    const s = name.startsWith('game:') ? { what: `Game: ${name.slice(5)} (opened over a playing video file, where it opens by default)`, room: true, video: true, lab: `games.open.${name.slice(5)}` } : SCREENS[name];
    if (!s) {
      problems.push(`unknown screen "${name}" (--screens list)`);
      continue;
    }
    for (const size of sizeNames.filter((n) => !s.sizes || s.sizes.includes(n))) {
      for (const lang of LANGS) {
        const ctx = await browser.newContext({ ...SIZES[size] });
        await ctx.addInitScript(({ lang, theme }) => {
          for (const [k, v] of Object.entries({ lang, theme, name: 'Alex', avatar: 'wizard', 'opt:autoInvite': '0', tipsSeen: '1', extUpdateSeen: '9', 'snackBar:howSeen': '1', 'windowGarden:howSeen': '1', 'fiveFrames:howSeen': '1' })) localStorage.setItem(k, v);
        }, { lang, theme });
        const page = await ctx.newPage();
        page.on('pageerror', (e) => problems.push(`${name} ${size} ${lang}: page error ${e.message}`));
        const file = `${name.replace(/[^\w-]+/g, '_')}-${size}-${lang}${theme === 'gece' ? '' : `-${theme}`}.png`;
        try {
          if (s.room) await enterRoom(page, s);
          else await s.go(page);
          if (s.lab) await lab(page, s.lab);
          if (s.after) await s.after(page);
          await wait(700);
          // The Test Lab opened the screen; its 🐞 is not part of what a person sees.
          if (!s.keepLab) await page.addStyleTag({ content: '#debug-panel-root { display: none !important; }' });
          await page.screenshot({ path: path.join(OUT, file) });
          index.push({ name, what: s.what + (theme === 'gece' ? '' : ` · theme ${theme}`), size, lang, file });
          console.log(`ok   ${file}`);
        } catch (e) {
          problems.push(`${name} ${size} ${lang}: ${String(e.message ?? e).split('\n')[0]}`);
          console.log(`FAIL ${file}: ${String(e.message ?? e).split('\n')[0]}`);
        }
        await ctx.close();
      }
    }
  }
  await browser.close();

  // The index (what each picture is) and the reviewer's brief.
  const rules = fs.readFileSync(path.join(ROOT, 'CLAUDE.md'), 'utf8');
  const product = rules.slice(rules.indexOf('## 6. Product rules'), rules.indexOf('## 7.'));
  const sizesLine = sizeNames.map((n) => `${n} ${SIZES[n].viewport.width}×${SIZES[n].viewport.height}`).join(', ');
  fs.writeFileSync(
    path.join(OUT, 'index.md'),
    `# Screens (${branch})\n\nSite: ${SITE} · sizes: ${sizesLine} · languages: ${LANGS.join(', ')}\n\n` +
      index.map((i) => `- \`${i.file}\`: ${i.what} (${i.size}, ${i.lang})`).join('\n') +
      (problems.length ? `\n\n## Not taken\n\n${problems.map((p) => `- ${p}`).join('\n')}\n` : '\n'),
  );
  fs.writeFileSync(
    path.join(OUT, 'REVIEW.md'),
    `# First look: reviewer brief\n\nYou are seeing this product for the first time. You get only the screenshots in this folder (\`index.md\` says ` +
      `what each one is) and the product rules below, not the developer's reasoning. Look at every picture at its size and ` +
      `list what looks wrong to a person using it, one line each: \`<file>: <what is wrong> (<rule or reason>)\`.\n\n` +
      `Look for: anything cut off or overlapping; a scrollbar inside a view that should fit; text too small or too faint to ` +
      `read; anything over a YouTube player; a free window over the video; a button whose purpose is unclear or that ` +
      `looks pressable but isn't; leftover or doubled controls; technical words in the UI; a layout that differs between ` +
      `sizes for no reason; empty space that looks broken; untranslated text (in a Turkish picture, English words; in an ` +
      `English one, Turkish). Say "nothing wrong" for a picture only after looking at all of it.\n\n` +
      `Taken with no mouse over the page: on a computer the control column beside the video (the rail) and the player's ` +
      `bar show only while the mouse is over the video, so their absence in a computer picture is not a fault by itself. ` +
      `The screens open as the room's first person (the host), with nobody else in the room.\n\n` +
      `---\n\n${product}`,
  );
  console.log(`\n${index.length} screenshots → ${OUT} (index.md, REVIEW.md)${problems.length ? `\n${problems.length} not taken:\n  ${problems.join('\n  ')}` : ''}`);
  process.exit(problems.length ? 1 : 0);
})();
