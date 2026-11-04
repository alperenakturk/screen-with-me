// Test Lab (card DL3b): server powers for testing (set a board position, end a quiz / draw phase now, fill the tip
// jar). Only a local test server has them: `wrangler dev --var SWM_LAB_SERVER:1` AND a localhost address. The flag
// is never in wrangler.jsonc or the deploy, so every live object answers a lab message with an error.

/** Is this request reaching a local lab server? Every object asks once per request (`this.lab ||= …`). */
export function labServer(env: { SWM_LAB_SERVER?: string }, request: Request): boolean {
  return env.SWM_LAB_SERVER === '1' && /^(localhost|127\.0\.0\.1)$/.test(new URL(request.url).hostname);
}
