# Data breach plan (one page)

What to do when personal data of Sidelit users may have leaked, been changed or been lost. Written for the privacy
card (H3, `security-review-2.md` §3 E); the privacy policy's "Security and data breaches" section promises the same.
Not legal advice: check the current rules on kvkk.gov.tr and with the lawyer before the store submission.

## What counts
Anything that exposes, changes or destroys personal data we hold or that passes through us: room data in Durable
Objects (names, avatars, browser IDs, chat, images, emojis, recaps), feedback issues (messages, e-mail addresses),
the daily IP-hash key, Worker logs, a leaked secret (`CLOUDFLARE_API_TOKEN`, `YOUTUBE_API_KEY`,
`FEEDBACK_GITHUB_TOKEN`, `USAGE_TOKEN`), a bug that sends one room's data to another room or to anyone with a link,
a compromised extension build or store account.

## Who
The owner (Alperen Aktürk, data controller) decides and reports. Any Claude session that notices a possible breach
tells the Planner at once (`send_message`) with what, since when and how sure; the Planner tells the owner the same
hour. Nobody waits for certainty to start step 1.

## Steps (start the clock when we first know)
1. **Contain (first hour).** Stop the leak: revert or roll back the deploy (Actions → re-run the last good `main`
   commit, or `wrangler rollback`), rotate every secret that may be exposed (Cloudflare token, YouTube key, GitHub
   token, `USAGE_TOKEN`; the IP-hash key renews by itself each UTC day), turn the feature off (e.g. `VOICE=off`,
   remove `FEEDBACK_GITHUB_TOKEN`), unpublish the extension version if the build is bad. Delete exposed feedback
   issues.
2. **Understand (first day).** Which data, whose (how many rooms / people, Turkey and EU), since when, how it
   happened. Sources: Cloudflare Workers Logs (≤ 7 days), Actions runs, GitHub audit log, the repo history. Write it
   down in `docs/internal/incidents/<date>.md` (facts only, no personal data copied into the repo).
3. **Report to the authority (within 72 hours).** KVKK: the Personal Data Protection Board through the breach
   notification form on kvkk.gov.tr (the Board's decision sets 72 hours; check the current form and rules). If people
   in the EU are affected: the supervisory authority where they live (GDPR art. 33). A late report must say why it is
   late. Report what is known; add the rest later.
4. **Tell the people affected (as soon as possible).** A plain note on the home page and, while a room still exists,
   in that room; by e-mail only where we have the address (feedback). Say what happened, which data, what we did, what
   they can do (e.g. clear site data, leave a room, use a new link), and the contact address.
5. **Fix and learn.** Fix the cause with a regression test (as for any bug), note it in the incident file, update
   `SECURITY.md` / the security review if the threat model changed, and check the privacy policy still says the truth.

## Keep ready
- The contact address on the privacy page works and is read (`screenwithme.app@gmail.com`).
- Secrets only in GitHub / Cloudflare secrets, never in the repo (CI checks it; Dependabot is on; keep GitHub secret scanning on now that the repo is public).
- This page is linked from `SECURITY.md` and `docs/internal/ROADMAP.md` §4.
