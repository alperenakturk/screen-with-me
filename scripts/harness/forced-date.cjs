// Card CI3: no test result may depend on the day the tests run. Loaded with `node --require` (NODE_OPTIONS) by the
// nightly date sweep; it does nothing until a script loads Playwright, then every browser context it opens gets the
// page clock moved to another day (time still runs): SWM_TEST_DATE (YYYY-MM-DD), SWM_TEST_DAYS days from today, or
// SWM_TEST_DAYS=sweep (1–60 days ahead from GITHUB_RUN_NUMBER: the nightly date sweep).
// A harness that sets its own day (snack-special, snack-bar-3) still wins: its script runs after this one.
const Module = require('node:module');

/** The shift in ms: a fixed date, or a number of days ahead; 0 when neither is set. */
function shiftMs(env = process.env, now = Date.now()) {
  if (env.SWM_TEST_DATE) {
    const at = Date.parse(`${env.SWM_TEST_DATE}T12:00:00Z`);
    if (Number.isFinite(at)) return at - now;
  }
  // `sweep`: 1–60 days ahead, a different day for every run (the date-sweep issue in test.yml uses the same sum).
  if (env.SWM_TEST_DAYS === 'sweep') return (1 + ((Number(env.GITHUB_RUN_NUMBER) || 0) * 7) % 60) * 86_400_000;
  const days = Number(env.SWM_TEST_DAYS);
  return Number.isFinite(days) && days ? days * 86_400_000 : 0;
}

/** Runs in the page: Date (new Date(), Date.now()) moved by `shift` ms, everything else untouched. */
function pageClock(shift) {
  const Real = Date;
  class Shifted extends Real {
    constructor(...a) {
      super(...(a.length ? a : [Real.now() + shift]));
    }
    static now() {
      return Real.now() + shift;
    }
  }
  globalThis.Date = Shifted;
}

const SHIFT = shiftMs();
const patched = new WeakSet();

function patchContext(ctx) {
  if (patched.has(ctx)) return ctx;
  patched.add(ctx);
  ctx.addInitScript(pageClock, SHIFT).catch(() => {});
  return ctx;
}

function patchBrowser(browser) {
  if (patched.has(browser)) return browser;
  patched.add(browser);
  const newContext = browser.newContext.bind(browser);
  browser.newContext = async (...a) => {
    const ctx = await newContext(...a);
    await ctx.addInitScript(pageClock, SHIFT);
    patched.add(ctx);
    return ctx;
  };
  // browser.newPage() opens its context through browser.newContext(), so it is covered too.
  return browser;
}

function patchPlaywright(pw) {
  patched.add(pw);
  for (const type of [pw.chromium, pw.firefox, pw.webkit].filter(Boolean)) {
    if (patched.has(type)) continue;
    patched.add(type);
    const launch = type.launch.bind(type);
    type.launch = async (...a) => {
      console.log(`forced-date: browser pages think it is ${new Date(Date.now() + SHIFT).toISOString().slice(0, 10)}`);
      return patchBrowser(await launch(...a));
    };
    const persistent = type.launchPersistentContext.bind(type);
    type.launchPersistentContext = async (...a) => patchContext(await persistent(...a));
  }
  return pw;
}

if (SHIFT) {
  // An ES module's `import 'playwright'` gets the same exports object as require(), but not through Module._load:
  // patch that object now when Playwright is installed next to the scripts.
  try {
    patchPlaywright(require('playwright'));
  } catch {
    // not installed here (npm, vite, wrangler): nothing to patch
  }
  const load = Module._load;
  Module._load = function (request, ...rest) {
    const out = load.call(this, request, ...rest);
    return request === 'playwright' || request === 'playwright-core' ? patchPlaywright(out) : out;
  };
}

module.exports = { shiftMs, pageClock };
