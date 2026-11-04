/**
 * Security R4-10: the TV version (pairing route, a room's `tv-link`, a TV's `hello`) works only with the Worker variable
 * `TV=on` (a local `wrangler dev --var TV:on`); it is hidden in the site and off on live until it ships with M8 done.
 */
export function tvOn(env: Env): boolean {
  return env.TV === 'on';
}
