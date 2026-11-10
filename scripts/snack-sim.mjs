// 🍿 Snack Bar economy simulation (card SB3): plays the real rules (`packages/shared/src/games/snack-bar.ts`) for
// 2, 10 and 50 hours of film time with a few buying strategies and two kinds of player, and prints what each one has
// earned, when the first new cinema opened and which purchases the best play made. The numbers go into
// `docs/internal/design/games/snack-bar-3.md`; run it again after any change to the economy:
//
//   node --experimental-strip-types scripts/snack-sim.mjs            (the full table, ~1 min)
//   node --experimental-strip-types scripts/snack-sim.mjs --check    (exits 1 when a balance rule breaks; CI's unit job)
//
// The model of the room: the film plays the whole time, alone (no together bonus, no tip jar, no special). Customers
// come like the page sends them (`CUSTOMER_EVERY_S` apart, half that with the long line) and a player serves some of
// them; taps on the counter are a steady rate; a film's receipt comes every two hours.
import {
  STANDS, STAND_IDS, STAFF, buy, placeCost, buyRecipe, checkBadges, collectReceipt, costOf, freshSnack, hire, incomeRate, newCinema,
  recipeInfo, recipesOpen, serve, serveCustomer, starsFor, tick, unlocked, PRESTIGE_MIN,
  CUSTOMER_SECONDS, CUSTOMER_SECONDS_MANAGER, SERVE_SECONDS, TAP_SECONDS_TIPBOX,
} from '../packages/shared/src/games/snack-bar.ts';

/** The page's wait between customers (25–45 s after one leaves, ~35 s on average, plus ~5 s to walk up and be served). */
const CUSTOMER_EVERY_S = 40;
const FILM_S = 2 * 3600;
const HORIZONS = [2, 10, 50];

/** Players: how they serve the walking customers and tap the counter. */
const PLAYERS = {
  idle: { serves: 0, taps: 0 }, // watches; only the usher serves customers
  active: { serves: 0.8, taps: 0.3 }, // catches most customers and taps now and then
};

const ctx = { playing: true, others: 0, voiceOthers: 0, item: { id: 'film-0' } };

/** Coins a second from customers and taps, as the player and the staff make them. */
function extras(save, player) {
  const base = incomeRate(save, ctx);
  const every = save.staff.includes('long-line') ? CUSTOMER_EVERY_S / 2 : CUSTOMER_EVERY_S;
  const served = save.staff.includes('usher') ? 1 : player.serves;
  const perCustomer = Math.max(3, base * (save.staff.includes('manager') ? CUSTOMER_SECONDS_MANAGER : CUSTOMER_SECONDS));
  const tap = Math.max(1, base * (save.staff.includes('tip-box') ? TAP_SECONDS_TIPBOX : SERVE_SECONDS));
  return (served * perCustomer) / every + player.taps * tap;
}
const income = (save, player) => incomeRate(save, ctx) + extras(save, player);

/** Every purchase the player could make now: { kind, id, cost, apply() }. */
function options(save, strategy) {
  const list = [];
  for (const stand of STANDS) {
    if (!unlocked(save, stand.id)) continue;
    list.push({ kind: 'stand', id: stand.id, cost: costOf(stand.id, save.levels[stand.id], 1, placeCost(save, stand.id)), apply: (s) => buy(s, stand.id, 1) });
  }
  if (strategy.extras) {
    for (const id of recipesOpen(save)) list.push({ kind: 'recipe', id, cost: recipeInfo(save, id).price, apply: (s) => buyRecipe(s, id) });
    for (const st of STAFF) if (!save.staff.includes(st.id)) list.push({ kind: 'staff', id: st.id, cost: st.cost, apply: (s) => hire(s, st.id) });
  }
  return list;
}
/** How much more a second an option earns (tried on a copy of the save). */
function gainOf(save, option, player) {
  const copy = structuredClone(save);
  copy.coins = option.cost * 2;
  if (!option.apply(copy)) return 0;
  return income(copy, player) - income(save, player);
}

const STRATEGIES = {
  // The best play we know: whatever pays back soonest, counting the wait to afford it (cost / income + cost / gain).
  best: { extras: true, pick: (save, opts, player) => pickByPayback(save, opts, player) },
  // The same without recipes and staff (shows what those paths are worth).
  'stands only': { extras: false, pick: (save, opts, player) => pickByPayback(save, opts, player) },
  // Always the newest stand (v1's only sensible play).
  'newest stand': { extras: false, pick: (_save, opts) => opts[opts.length - 1] },
  // Levels every open stand evenly, opening the next one when all are at 10.
  'even levels': {
    extras: false,
    pick: (save, opts) => {
      const open = opts.filter((o) => o.kind === 'stand');
      const owned = open.filter((o) => save.levels[o.id] > 0);
      const next = open.find((o) => save.levels[o.id] === 0);
      if (next && owned.every((o) => save.levels[o.id] >= 10)) return next;
      return owned.reduce((a, b) => (save.levels[b.id] < save.levels[a.id] ? b : a));
    },
  },
  // Always the cheapest thing on the list.
  cheapest: { extras: true, pick: (_save, opts) => opts.reduce((a, b) => (b.cost < a.cost ? b : a)) },
};

function pickByPayback(save, opts, player) {
  const now = income(save, player);
  let best = null;
  let bestScore = Infinity;
  for (const o of opts) {
    const gain = gainOf(save, o, player);
    if (gain <= 0) continue;
    const score = Math.max(0, o.cost - save.coins) / now + o.cost / gain;
    if (score < bestScore) {
      bestScore = score;
      best = o;
    }
  }
  return best;
}

/** Plays one strategy for `hours` of film time; prestige when a new cinema at least doubles the stars. */
function play(strategyName, playerName, hours) {
  const strategy = STRATEGIES[strategyName];
  const player = PLAYERS[playerName];
  const save = freshSnack();
  const log = [];
  let firstCinema = null;
  let wanted = null;
  let customerClock = 0;
  for (let t = 1; t <= hours * 3600; t++) {
    ctx.item = { id: `film-${Math.floor(t / FILM_S)}` };
    tick(save, 1, ctx);
    // Customers and taps.
    customerClock += 1;
    const every = save.staff.includes('long-line') ? CUSTOMER_EVERY_S / 2 : CUSTOMER_EVERY_S;
    if (customerClock >= every) {
      customerClock = 0;
      const served = save.staff.includes('usher') ? 1 : player.serves;
      if (served >= 1 || (served > 0 && (t * 7919) % 100 < served * 100)) serveCustomer(save, ctx);
    }
    if (player.taps > 0 && t % Math.round(1 / player.taps) === 0) serve(save, ctx);
    if (t % FILM_S === 0) collectReceipt(save, `film-${Math.floor(t / FILM_S) - 1}`);
    if (t % 5 === 0) checkBadges(save);
    if (process.env.SIM_TRACE && strategyName === 'best' && playerName === process.env.SIM_TRACE && [60, 300, 600, 1800, 3600, 7200, 18000, 36000].includes(t))
      console.log(`t=${t}s income=${fmt(income(save, player))}/s earned=${fmt(save.earned)} levels=${STAND_IDS.map((id) => save.levels[id]).join('/')} recipes=${save.recipes.length} staff=${save.staff.join('+')} buys=${log.length}`);
    // A new cinema once it at least doubles the stars (the usual idle-game rule of thumb).
    const stars = starsFor(save);
    if (stars >= Math.max(1, save.stars)) {
      if (process.env.SIM_DEBUG) console.log('cinema at', t, 'earned', save.earned, 'stars', stars, strategyName, playerName, JSON.stringify(save.levels), save.recipes.join(), save.staff.join(), log.slice(0,15).map(e=>e.t+':'+e.id).join(' '));
      newCinema(save);
      firstCinema ??= t;
      wanted = null;
      log.push({ t, kind: 'cinema', id: `#${save.cinemas + 1}` });
      continue;
    }
    // Buy: pick a target, then buy it as soon as it is affordable.
    if (!wanted || !options(save, strategy).some((o) => o.kind === wanted.kind && o.id === wanted.id)) wanted = strategy.pick(save, options(save, strategy), player);
    for (let guard = 0; wanted && guard < 50; guard++) {
      const fresh = options(save, strategy).find((o) => o.kind === wanted.kind && o.id === wanted.id);
      if (!fresh || fresh.cost > save.coins) break;
      if (!fresh.apply(save)) throw new Error(`could not buy ${fresh.kind} ${fresh.id}`);
      log.push({ t, kind: fresh.kind, id: fresh.id });
      wanted = strategy.pick(save, options(save, strategy), player);
    }
  }
  return { save, log, firstCinema, income: income(save, player), lifetime: save.lifetime };
}

const fmt = (n) => (n >= 1e9 ? `${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : n.toFixed(0));
const hm = (s) => (s == null ? '—' : `${Math.floor(s / 3600)} h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')} min`);

export { play, PLAYERS, STRATEGIES };
const main = import.meta.url === `file://${process.argv[1]}`;
const check = process.argv.includes('--check');
const results = {};
if (main) for (const playerName of Object.keys(PLAYERS)) {
  for (const strategyName of Object.keys(STRATEGIES)) {
    for (const hours of check ? [10] : HORIZONS) {
      results[`${playerName}|${strategyName}|${hours}`] = play(strategyName, playerName, hours);
    }
  }
}

if (main && !check) {
  for (const playerName of Object.keys(PLAYERS)) {
    console.log(`\n## ${playerName} player (customers served ${PLAYERS[playerName].serves * 100} %, ${PLAYERS[playerName].taps} taps/s)\n`);
    console.log('| strategy | earned in 2 h | earned in 10 h | earned in 50 h | stars at 50 h | first new cinema |');
    console.log('|---|---|---|---|---|---|');
    for (const strategyName of Object.keys(STRATEGIES)) {
      const r = (h) => results[`${playerName}|${strategyName}|${h}`];
      console.log(`| ${strategyName} | ${fmt(r(2).lifetime)} | ${fmt(r(10).lifetime)} | ${fmt(r(50).lifetime)} | ${r(50).save.stars} | ${hm(r(50).firstCinema)} |`);
    }
  }
  // What the best play bought, by window.
  const best = results['active|best|50'];
  console.log('\n## What the best play (active) bought\n');
  console.log('| window | purchases | by kind | top stands bought |');
  console.log('|---|---|---|---|');
  for (const [from, to] of [[0, 2], [2, 10], [10, 50]]) {
    const part = best.log.filter((e) => e.t > from * 3600 && e.t <= to * 3600 && e.kind !== 'cinema');
    const kinds = Object.entries(part.reduce((m, e) => ((m[e.kind] = (m[e.kind] ?? 0) + 1), m), {})).map(([k, v]) => `${k} ${v}`).join(', ');
    const stands = Object.entries(part.filter((e) => e.kind === 'stand').reduce((m, e) => ((m[e.id] = (m[e.id] ?? 0) + 1), m), {}))
      .sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k} ${v}`).join(', ');
    console.log(`| ${from}–${to} h | ${part.length} | ${kinds} | ${stands} |`);
  }
  console.log(`\nCinemas opened by the best active play in 50 h: ${best.log.filter((e) => e.kind === 'cinema').map((e) => `${e.id} at ${hm(e.t)}`).join(', ')}`);
}

// Balance rules (CI: `--check`).
const rules = [];
if (main) {
const at = (p, s, h) => results[`${p}|${s}|${h}`];
const H = check ? 10 : 10;
for (const p of Object.keys(PLAYERS)) {
  const best = at(p, 'best', H).lifetime;
  rules.push([`${p}: the best play beats "newest stand" by at least 1.5× in ${H} h`, best >= 1.5 * at(p, 'newest stand', H).lifetime]);
  rules.push([`${p}: recipes and staff are worth buying (best ≥ 1.2× "stands only" in ${H} h)`, best >= 1.2 * at(p, 'stands only', H).lifetime]);
  const kinds = new Set(at(p, 'best', H).log.filter((e) => e.kind === 'stand').map((e) => e.id));
  rules.push([`${p}: the best play buys every stand it opened, not only the newest (${kinds.size} stands)`, kinds.size >= 5]);
}
const first = at('active', 'best', H).firstCinema;
rules.push([`active: the first new cinema opens between 1.5 h and 6 h of film (${hm(first)})`, first != null && first >= 1.5 * 3600 && first <= 6 * 3600]);
const idleFirst = at('idle', 'best', H).firstCinema;
rules.push([`idle: the first new cinema opens within 10 h of film (${hm(idleFirst)})`, idleFirst != null && idleFirst <= 10 * 3600]);
console.log('\n## Balance rules\n');
let bad = 0;
for (const [name, ok] of rules) {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) bad++;
}
console.log(`\nPRESTIGE_MIN = ${fmt(PRESTIGE_MIN)}`);
if (check && bad) process.exit(1);
}
