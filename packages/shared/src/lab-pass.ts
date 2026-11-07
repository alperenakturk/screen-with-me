// Card LABLOCK: the 🐞 Test Lab opens on the live site only with the owner's code. The Worker keeps the code as the
// secret `LAB_CODE`; a right code gets a pass (`<expiry>.<HMAC>`) the browser keeps for 30 days, so `?debug=1` opens
// the lab again without the code. Shared by the Worker (checks) and its unit tests; the page only stores the pass.

/** How long a pass opens the lab in one browser. */
export const LAB_PASS_MS = 30 * 24 * 60 * 60 * 1000;
/** Longest code or pass the check reads (anything longer is refused before any hashing). */
export const LAB_INPUT_MAX = 200;
/** The check's request body, at most (JSON `{code}` or `{pass}`). */
export const LAB_BODY_MAX = 1024;

const encoder = new TextEncoder();

function hex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Equal strings in a time that does not depend on where they differ (both are fixed-length hex digests here). */
export function sameDigest(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function sha256(text: string): Promise<string> {
  return hex(await crypto.subtle.digest('SHA-256', encoder.encode(text)));
}

async function hmac(secret: string, text: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, encoder.encode(text)));
}

/** Is `code` the lab code? Both sides are hashed first, so the compare never depends on the code's length or letters. */
export async function labCodeMatches(code: unknown, secret: string | undefined): Promise<boolean> {
  if (!secret || typeof code !== 'string' || code.length === 0 || code.length > LAB_INPUT_MAX) return false;
  return sameDigest(await sha256(code), await sha256(secret));
}

/** A pass that opens the lab until `now + LAB_PASS_MS`. */
export async function makeLabPass(secret: string, now = Date.now()): Promise<string> {
  const until = now + LAB_PASS_MS;
  return `${until}.${await hmac(secret, `lab-pass:${until}`)}`;
}

/** Is `pass` one this secret made, and not yet expired? (A new `LAB_CODE` ends every old pass.) */
export async function labPassValid(pass: unknown, secret: string | undefined, now = Date.now()): Promise<boolean> {
  if (!secret || typeof pass !== 'string' || pass.length > LAB_INPUT_MAX) return false;
  const match = /^(\d{13})\.([0-9a-f]{64})$/.exec(pass);
  if (!match) return false;
  const until = Number(match[1]);
  if (until <= now || until > now + LAB_PASS_MS) return false;
  return sameDigest(match[2]!, await hmac(secret, `lab-pass:${until}`));
}
