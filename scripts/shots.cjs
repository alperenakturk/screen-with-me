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
};
const sizeNames = flag('sizes', Object.keys(SIZES).join(',')).split(',');
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

/** The screens, each a way to get there from a fresh page. `room` = a fresh room as its first person (the host). */
const SCREENS = {
  home: { what: 'Home page', go: (p) => p.goto(`${SITE}/`) },
  help: { what: 'Help page', go: (p) => p.goto(`${SITE}/help.html`) },
  privacy: { what: 'Privacy policy', go: (p) => p.goto(`${SITE}/privacy.html`) },
  terms: { what: 'Terms of use', go: (p) => p.goto(`${SITE}/terms.html`) },
  extension: { what: 'Extension page', go: (p) => p.goto(`${SITE}/extension.html`) },
  join: { what: 'Join card (an invited person, before entering)', go: (p) => p.goto(`${SITE}/r/${room()}`).then(() => p.waitForSelector('#name')) },
  room: { what: 'Empty room after joining', room: true },
  'room-video': { what: 'Room playing a video file', room: true, video: true },
  // Cinema mode (card 14) is the room's only way to hide the side panel. Computers only: a phone's room is one column
  // and a touch-only tablet doesn't offer it (it needs a mouse for its edges).
  'room-cinema': { what: 'Room playing a video in cinema mode (#side-toggle: the side panel hides, the video fills the page)', room: true, video: true, sizes: ['laptop', 'desktop'], after: (p) => p.evaluate(() => document.querySelector('#side-toggle')?.click()) },
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
  // LAB3: the room's intro (`.swm-intro`, about 2.7 s) must be gone, or the shot catches it half faded over the room.
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
  for (const name of screens) {
    const s = name.startsWith('game:') ? { what: `Game: ${name.slice(5)} (in the room's games stage)`, room: true, lab: `games.open.${name.slice(5)}` } : SCREENS[name];
    if (!s) {
      problems.push(`unknown screen "${name}" (--screens list)`);
      continue;
    }
    for (const size of sizeNames.filter((n) => !s.sizes || s.sizes.includes(n))) {
      for (const lang of LANGS) {
        const ctx = await browser.newContext({ ...SIZES[size] });
        await ctx.addInitScript((lang) => {
          for (const [k, v] of Object.entries({ lang, name: 'Alex', avatar: 'wizard', 'opt:autoInvite': '0', tipsSeen: '1', extUpdateSeen: '9', 'snackBar:howSeen': '1', 'windowGarden:howSeen': '1', 'fiveFrames:howSeen': '1' })) localStorage.setItem(k, v);
        }, lang);
        const page = await ctx.newPage();
        page.on('pageerror', (e) => problems.push(`${name} ${size} ${lang}: page error ${e.message}`));
        const file = `${name.replace(/[^\w-]+/g, '_')}-${size}-${lang}.png`;
        try {
          if (s.room) await enterRoom(page, s);
          else await s.go(page);
          if (s.lab) await lab(page, s.lab);
          if (s.after) await s.after(page);
          await wait(700);
          // The Test Lab opened the screen; its 🐞 is not part of what a person sees.
          await page.addStyleTag({ content: '#debug-panel-root { display: none !important; }' });
          await page.screenshot({ path: path.join(OUT, file) });
          index.push({ name, what: s.what, size, lang, file });
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
