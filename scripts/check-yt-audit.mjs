// Card YTQ1: the reviewer of YouTube's API audit opens our privacy policy and terms. This checks, on a running site,
// that both pages answer and carry what YouTube's Developer Policies ask for (III.A.1 the YouTube Terms link, III.A.2
// the YouTube API Services mention, the Google Privacy Policy link and a contact), in English and Turkish.
//   node scripts/check-yt-audit.mjs [origin]   (default: the site's address from site.config.json)
import { readFileSync } from 'node:fs';

const site = JSON.parse(readFileSync(new URL('../site.config.json', import.meta.url), 'utf8'));
const origin = (process.argv[2] ?? site.origin).replace(/\/$/, '');
let fails = 0;
const check = (ok, label) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`);
  if (!ok) fails++;
};
const page = async (path) => {
  const res = await fetch(`${origin}${path}`, { redirect: 'follow', signal: AbortSignal.timeout(15_000) });
  return { status: res.status, html: res.status === 200 ? await res.text() : '' };
};

const privacy = await page('/privacy.html');
check(privacy.status === 200, `${origin}/privacy.html answers 200`);
check(/YouTube API Services/.test(privacy.html), 'privacy: says it uses the YouTube API Services (III.A.2)');
check(privacy.html.includes('https://policies.google.com/privacy'), 'privacy: links the Google Privacy Policy (III.A.2.c)');
check(privacy.html.includes('https://www.youtube.com/t/terms'), 'privacy: links the YouTube Terms of Service');
check(/mailto:|@gmail\.com|@sidelit\.app/.test(privacy.html), 'privacy: gives a way to contact us (III.A.2.i)');
check(/24 hours/.test(privacy.html) && /30 days/.test(privacy.html), 'privacy: says how long YouTube data is kept (24 h answers, 30-day titles)');
check(/Gizlilik|gizlilik/.test(privacy.html) && /YouTube Hizmet Şartları/.test(privacy.html), 'privacy: the Turkish version carries the YouTube section too');

const terms = await page('/terms.html');
check(terms.status === 200, `${origin}/terms.html answers 200`);
check(terms.html.includes('https://www.youtube.com/t/terms'), 'terms: links the YouTube Terms of Service (III.A.1)');
check(/agree to/.test(terms.html), 'terms: says using Sidelit with YouTube means agreeing to YouTube\'s terms (III.A.1)');
check(terms.html.includes('https://policies.google.com/privacy'), 'terms: links the Google Privacy Policy');

const logo = await fetch(`${origin}/brand/youtube-icon.svg`, { signal: AbortSignal.timeout(15_000) }).catch(() => null);
check(logo?.status === 200, 'the YouTube logo file answers (branding beside the result lists)');

console.log(fails ? `\n✗ ${fails} check(s) failed` : `\n✓ ${origin}: privacy, terms and the YouTube logo are ready for the audit`);
process.exit(fails ? 1 : 0);
