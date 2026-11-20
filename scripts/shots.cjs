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
// Themes by id (themes.ts): gece = Night (the shots' usual one; a new visitor gets acikhava = Drive-In, card UI4), matinee = Matinee, sinema / lokum … = scene themes.
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
  await p.click('#feed-start');
  await p.waitForSelector('#feed-row-steer');
  await wait(1500);
};
const SEARCH_ITEMS = [
  { id: 'aqz-KE-bpKQ', title: 'A night walk through the old harbour, filmed in one take', channel: 'Harbour Films', duration: 1832, live: false },
  { id: 'dQw4w9WgXcQ', title: 'Night walk sounds', channel: 'Calm Channel', duration: 3605, live: false },
  { id: '9bZkp7q5F8I', title: 'Walking at night, a short', channel: 'Alex', duration: 41, live: false, short: true },
];

/** Card CAM2: join voice (no pre-join window), then the Test Lab's `camera.open` with `how`. */
const camera = async (p, how) => {
  await p.evaluate(() => {
    localStorage.setItem('opt:voiceCheck', 'skip');
    localStorage.setItem('opt:ipNotice:voice', '1');
  });
  await p.waitForFunction(() => !!window.__swmLab, null, { timeout: 20000 });
  await p.evaluate(() => document.getElementById('voice-join').click());
  await p.waitForFunction(() => !document.getElementById('voice-on').hidden, null, { timeout: 15000 });
  await p.evaluate((how) => window.__swmLab.run('camera.open', how), how);
  await wait(800);
};

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
  // Card EC1: the "Video ended" dialog (autoNext off, a video just ended), opened through the Test Lab over a video file.
  'end-card': { what: 'The "Video ended / ▶ Play next / Close" dialog after a video ended (the next one does not start by itself)', room: true, video: true, lab: 'endcard.show', after: () => wait(600), keepLab: false },
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
  sources: { what: '"What are we watching?" (card SRC2): ⠿ opens 12 big tiles with category chips, in the video\'s place (a sheet on a phone); YouTube is the source in use (✓)', room: true, after: async (p) => { await searchTab(p); await p.click('#media-sources'); await p.waitForSelector('#sources-pop:not([hidden]) .sources-tile'); } },
  'sources-youtube': {
    what: '"What are we watching?" while a YouTube video plays: it takes the side panel\'s place, 3 a row; nothing may cover the YouTube player (the player may stay blank here: YouTube is blocked in this test)',
    room: true,
    sizes: ['laptop', 'desktop'],
    after: async (p) => {
      await p.fill('#media-input', 'https://www.youtube.com/watch?v=M7lc1UVf-VE');
      await p.click('#media-form button[value="load"]');
      await wait(2500);
      await p.click('#media-sources');
      await p.waitForSelector('#sources-pop:not([hidden]) .sources-tile');
    },
  },
  'sources-music': { what: '"What are we watching?" filtered by the Music chip (Podcasts, YouTube Music only)', room: true, after: async (p) => { await searchTab(p); await p.click('#media-sources'); await p.waitForSelector('#sources-pop:not([hidden]) .sources-tile'); await p.click('.srcp-chip[data-chip="music"]'); } },
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
  'feed-drawer': {
    what: 'Card FD1: the feed drawer on the right (a half sheet on a phone) before starting: 1 What to watch, 2 Where they come from (🎵 Music picked, ✓), 3 Country, the "Will play" line and ▶ Start feed; no backdrop, the room stays visible',
    room: true,
    after: async (p) => {
      if (await p.isVisible('#ph-tab-search')) await p.click('#ph-tab-search');
      else await p.click('.tab[data-tab="queue"]');
      await p.click('#feed-open-shorts');
      await p.click('#feed-pools .feed-pool[data-pool="music"]');
      await wait(400);
    },
  },
  'feed-window': {
    what: 'Card FD1: the feed drawer while a feed runs: who started it, ⏸ / ✕ for everyone, four ways to steer (described in tooltips), then the picker ("▶ Start this feed instead"; folded on a phone); the feed pill above the video',
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
  // Card RC1: the session recap for everyone in the video's place (Test Lab `recap.show`; the lab server skips the
  // 30 min together). The first scene (time), then the summary poster.
  ...Object.fromEntries(
    [
      ['recap-show', 'the first scene (night sky, the time watched, our logo and its light cone, Glowbeam), the filmstrip and the controls under it; the host sees "▶ Back to the video"', 0],
      ['recap-summary', 'the last scene (the poster: every number, "⬇ Save image")', 1],
    ].map(([id, what, steps]) => [
      id,
      {
        what: `Card RC1: the session recap shown to everyone in the video's place: ${what}; the player is hidden behind it, never covered (it may stay blank: YouTube is blocked in this test)`,
        room: true,
        after: async (p) => {
          await searchTab(p);
          await p.fill('#media-input', 'https://www.youtube.com/watch?v=M7lc1UVf-VE');
          await p.click('#media-form button[value="load"]');
          await wait(1500);
          if (await p.isVisible('#ph-tab-room')) await p.click('#ph-tab-room');
          await p.evaluate(() => window.__swmLab.run('recap.show'));
          await p.waitForSelector('.rc-stage');
          await wait(3800);
          for (let i = 0; i < steps; i++) await p.click('.rc-next');
          await wait(700);
        },
      },
    ]),
  ),
  // Card FD1b: the Shorts view with a ♾ Shorts feed running: the rail in three labelled groups, "N left" under ▲, the
  // feed pill above the Short (never on the player), the phone's bar with ♾ Feed.
  'shorts-feed': {
    what: 'Card FD1b: the Shorts view while a ♾ Shorts feed runs: the rail in three labelled groups (Talk · Watch · Room; labels beside the icons when there is room), ♾ Feed marked on, "N left" under ▲, no feed pill (UI4); on a phone the bar 💬 Chat · 😀 React · ♾ Feed · ▲ N left ▼ · ⋯ More (the player may stay blank: YouTube is blocked in this test)',
    room: true,
    sizes: ['laptop', 'desktop', 'tablet', 'phone'],
    after: async (p) => {
      const shorts = ['9bZkp7q5F8I', 'aqz-KE-bpKQ', 'dQw4w9WgXcQ', 'M7lc1UVf-VE', 'jNQXAC9IVRw', 'kJQP7kiw5Fk'].map((id, i) => ({ id, title: `Short ${i + 1}`, channel: 'Alex', duration: 30 + i, live: false, short: true }));
      await p.route('**/api/youtube/**', (route) => route.fulfill({ json: { items: shorts } }));
      if (await p.isVisible('#ph-tab-search')) await p.click('#ph-tab-search');
      else await p.click('.tab[data-tab="queue"]');
      await p.click('#feed-open-shorts');
      await p.click('#feed-pools .feed-pool[data-pool="music"]');
      await p.click('#feed-start');
      await p.waitForFunction(() => document.documentElement.classList.contains('shorts-view'));
      await p.keyboard.press('Escape');
      await wait(1500);
    },
  },
  'shorts-more': {
    what: 'Card UI4: the Shorts view with the rail\'s ⋯ More pressed: the room\'s More menu beside the rail (Invite first, Settings last), whole inside the window; on a phone the bar\'s ⋯ sheet',
    room: true,
    sizes: ['laptop', 'desktop', 'tablet', 'phone'],
    after: async (p) => {
      await searchTab(p);
      await p.fill('#media-input', 'https://www.youtube.com/shorts/aqz-KE-bpKQ');
      await p.click('#media-form button[value=load]');
      await p.waitForFunction(() => document.documentElement.classList.contains('shorts-view'));
      await p.waitForTimeout(800);
      await p.evaluate(async () => window.__swmLab.run('shorts.more'));
      await p.waitForTimeout(300);
    },
  },
  'shorts-chat': {
    what: 'The Shorts view on a computer with 💬 open: the room\'s chat as a panel right of the rail and the seats (never over the video)',
    room: true,
    sizes: ['laptop', 'desktop', 'tablet-land'],
    after: async (p) => {
      await searchTab(p);
      await p.fill('#media-input', 'https://www.youtube.com/shorts/aqz-KE-bpKQ');
      await p.click('#media-form button[value=load]');
      await p.waitForFunction(() => document.documentElement.classList.contains('shorts-view'));
      await p.click('#shorts-chat-btn');
      for (const text of ['This one is great', 'Next one please!']) {
        await p.fill('#chat-input', text);
        await p.press('#chat-input', 'Enter');
      }
      await p.locator('#chat-input').blur();
      await wait(800);
    },
  },
  'chat-delete': {
    what: 'Card MSG1: the chat with a deleted message\'s muted line ("Alex deleted a message") and the ⋯ message menu open on my newest message ("🗑 Delete for everyone")',
    room: true,
    after: async (p) => {
      const say = async (text) => {
        await p.fill('#chat-input', text);
        await p.press('#chat-input', 'Enter');
        await p.waitForFunction((t) => [...document.querySelectorAll('#chat-list .chat-text')].some((e) => e.textContent === t), text);
      };
      await say('Oops, wrong link');
      await p.evaluate(() => window.__swmLab.run('chat.delete'));
      await p.waitForSelector('#chat-list .chat-deleted');
      await say('Hello everyone!');
      await say('Movie night at 9?');
      await p.locator('#chat-input').blur();
      const more = p.locator('#chat-list .chat-line.me .chat-more').last();
      await more.scrollIntoViewIfNeeded();
      await more.click({ force: true });
      await p.waitForSelector('.chat-menu:not([hidden])');
      await wait(300);
    },
  },
  // Card TG1: a side game's window over the side panel (Five Frames, the tallest), in voice: the compact Together card.
  'together-compact': {
    what: 'Card TG1: in voice with Five Frames open beside the chat: the Together card is compact (title, small faces and counts in one row; mic, deafen, camera, Leave and Share in one row), clear above the game window',
    room: true,
    sizes: ['laptop', 'desktop'],
    after: async (p) => {
      await p.evaluate(() => {
        localStorage.setItem('opt:voiceCheck', 'skip');
        localStorage.setItem('opt:ipNotice:voice', '1');
      });
      await p.evaluate(() => document.getElementById('voice-join').click());
      await p.waitForFunction(() => !document.getElementById('voice-on').hidden, null, { timeout: 15000 });
      await p.evaluate(async () => {
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
        document.getElementById('game-btn').click();
        await sleep(200);
        document.querySelector('#game-menu [data-tab="side"]')?.click();
        await sleep(100);
        document.querySelector('#game-menu [data-solo="word"]')?.click();
        for (let i = 0; i < 60 && !document.querySelector('#game-stage .ff .ff-key'); i++) await sleep(100);
      });
      await wait(900);
    },
  },
  // Card CAM2: my camera on (the Test Lab's drawn picture, the window folded before), and a refused camera's message.
  'camera-on': { what: 'Card CAM2: in voice with my camera on (a drawn test picture): my camera window shows it, even though it had been folded with "−" before', room: true, after: (p) => camera(p, 'fold') },
  'camera-refused': { what: 'Card CAM2: 📷 pressed and the browser refused the camera: a message next to the 📷 says why and how to allow it', room: true, after: (p) => camera(p, 'blocked') },
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
  [/^apps\/web\/src\/ui\/chat\.ts$/, ['chat-delete', 'room']],
  [/^apps\/web\/src\/ui\/(voice|cam-)/, ['camera-on', 'camera-refused', 'room']],
  [/^apps\/web\/src\/ui\/together-compact/, ['together-compact', 'room']],
  [/^apps\/web\/public\/help/, ['help']],
  [/^apps\/web\/public\/privacy/, ['privacy']],
  [/^apps\/web\/public\/terms/, ['terms']],
  [/^apps\/web\/public\/extension|^apps\/extension\//, ['extension']],
  [/^apps\/web\/src\/(home|app)\.|^apps\/web\/index\.html|^apps\/web\/src\/styles\.css|^apps\/web\/src\/themes/, ['home', 'join', 'room']],
  [/^apps\/web\/src\/ui\/end-card/, ['end-card']],
  [/^apps\/web\/src\/ui\/(feed-window|feed-row|shorts-feed)/, ['feed-drawer', 'feed-window', 'feed-queue', 'shorts-feed']],
  [/^apps\/web\/src\/shorts\.css$/, ['shorts-feed', 'shorts-chat', 'shorts-more']],
  [/^apps\/web\/src\/ui\/recap/, ['recap-show', 'recap-summary']],
  [/^apps\/web\/src\/ui\/(search|sources|result-row|vimeo-results|podcasts)/, ['sources', 'sources-youtube', 'sources-music', 'search-results', 'tiktok-back']],
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
  // A fake microphone and camera, so the voice screens can join (CAM2).
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
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
          // Also runs in a YouTube frame (the Shorts screens), where storage is off limits.
          try {
            for (const [k, v] of Object.entries({ lang, theme, name: 'Alex', avatar: 'wizard', 'opt:autoInvite': '0', tipsSeen: '1', extUpdateSeen: '9', 'snackBar:howSeen': '1', 'windowGarden:howSeen': '1', 'fiveFrames:howSeen': '1' })) localStorage.setItem(k, v);
          } catch {}
        }, { lang, theme });
        const page = await ctx.newPage();
        page.on('pageerror', (e) => problems.push(`${name} ${size} ${lang}: page error ${e.message}`));
        const file = `${name.replace(/[^\w-]+/g, '_')}-${size}-${lang}${theme === 'gece' ? '' : `-${theme}`}.png`;
        // PH4: a sideways phone covers everything but the video with the turn-upright note, so a sideways phone gets
        // there upright and is turned for the picture.
        const turnAfter = size.endsWith('-land') && SIZES[size].isMobile && SIZES[size].viewport.width < 1000;
        if (turnAfter) await page.setViewportSize({ width: SIZES[size].viewport.height, height: SIZES[size].viewport.width });
        try {
          if (s.room) await enterRoom(page, s);
          else await s.go(page);
          if (s.lab) await lab(page, s.lab);
          if (s.after) await s.after(page);
          if (turnAfter) await page.setViewportSize(SIZES[size].viewport);
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
