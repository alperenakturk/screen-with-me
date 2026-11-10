// Card QA1 part 1b: the live run is paced per address (60 room connections a minute), so it is split over separate
// runners (separate addresses): SWM_E2E_SHARD=<i>/<n> runs shard i of n. Files go to the lightest shard, the longest
// first, by their time on live (seconds, 10 Nov 2026; a new file counts 15 until measured), so shards end together.
export const LIVE_SECONDS = { 'room.mjs': 3, 'page.mjs': 1, 'avatar.mjs': 2, 'host.mjs': 7, 'handover.mjs': 55, 'wait.mjs': 21, 'pins.mjs': 3, 'stickers.mjs': 5, 'chatimage.mjs': 3, 'uploads.mjs': 3, 'modes.mjs': 29, 'saved.mjs': 15, 'recap.mjs': 12, 'shorts.mjs': 4, 'voice.mjs': 6, 'live.mjs': 46, 'xox.mjs': 7, 'draw.mjs': 27, 'quiz.mjs': 26, 'roomgame.mjs': 10, 'poker.mjs': 9, 'search.mjs': 2, 'tv.mjs': 2, 'fallback.mjs': 50, 'countdown.mjs': 11, 'feedback.mjs': 1, 'move.mjs': 20, 'gamestream.mjs': 4, 'podcasts.mjs': 1, 'links.mjs': 1, 'abuse.mjs': 36, 'people.mjs': 5, 'knock.mjs': 24, 'private.mjs': 38, 'sidegames.mjs': 8, 'classics.mjs': 28, 'classics-switch.mjs': 18, 'sea.mjs': 11, 'duel.mjs': 7, 'ghost.mjs': 112, 'lab-server.mjs': 8, 'lab-check.mjs': 9, 'quota.mjs': 18 };
/** Shard `index` (1-based) of `count`: every file in exactly one shard, each file's own order kept. */
export function shardFiles(files, index, count, seconds = LIVE_SECONDS) {
  const load = Array(count).fill(0);
  const owner = new Map();
  for (const f of [...files].sort((a, b) => (seconds[b] ?? 15) - (seconds[a] ?? 15) || files.indexOf(a) - files.indexOf(b))) {
    const lightest = load.indexOf(Math.min(...load));
    owner.set(f, lightest + 1);
    load[lightest] += seconds[f] ?? 15;
  }
  return files.filter((f) => owner.get(f) === index);
}

