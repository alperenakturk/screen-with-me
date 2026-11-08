// Test Lab (card DL3b): server powers for testing (set a board position, end a quiz / draw phase now, fill the tip
// jar). Only a local test server has them: `wrangler dev --var SWM_LAB_SERVER:1` AND a localhost address. The flag
// is never in wrangler.jsonc or the deploy, so every live object answers a lab message with an error.

/** Is this request reaching a local lab server? Every object asks once per request (`this.lab ||= …`). */
export function labServer(env: { SWM_LAB_SERVER?: string }, request: Request): boolean {
  return env.SWM_LAB_SERVER === '1' && /^(localhost|127\.0\.0\.1)$/.test(new URL(request.url).hostname);
}

// LABWAKE: an object that hibernates (≈ 10–20 s without a message, also on wrangler dev) is rebuilt for the next socket
// message without a request, so a flag kept only in memory came back false and a lab message got `lab_off` (a flaky
// game-result run in CI). The object remembers it in its own storage instead, written only after `labServer` said yes
// for a real request, and read back only while the variable is still set. Live never writes it.
const LAB_KEY = 'swm:lab';

/** On every request: true on a local lab server, remembered in the object's storage so a wake-up still knows it. */
export async function labOnRequest(storage: DurableObjectStorage, env: { SWM_LAB_SERVER?: string }, request: Request, known: boolean): Promise<boolean> {
  if (known) return true;
  if (!labServer(env, request)) return false;
  await storage.put(LAB_KEY, true);
  return true;
}

/** Before refusing a lab message: was this object reached as a local lab server before it hibernated? */
export async function labRemembered(storage: DurableObjectStorage, env: { SWM_LAB_SERVER?: string }): Promise<boolean> {
  return env.SWM_LAB_SERVER === '1' && (await storage.get(LAB_KEY)) === true;
}
