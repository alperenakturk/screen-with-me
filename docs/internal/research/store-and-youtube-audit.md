# Research: Chrome Web Store submission + YouTube API audit (checklists for 0.9.99 → 1.0)

_Research session, 3 Nov 2026, Job 9 from the Planner. Read-only. developer.chrome.com was not reachable from the cloud
session (Chrome policy text comes from search excerpts); the YouTube pages on developers.google.com were read
directly. Not legal advice. Our current form texts: `docs/internal/web-store.md`; manifest: `apps/extension/build.mjs`
(`permissions: storage, offscreen, scripting`, `host_permissions: <all_urls>`, content scripts on `<all_urls>` minus our
site, `shell.html` web-accessible)._

## Verdict
- **Chrome Web Store: 🟢 mostly ready, 🟡 a handful of gaps.** Our form guide already covers single purpose,
  every permission, the data-use form and the reviewer note. Missing: the new name everywhere, a real support contact,
  fresh screenshots and description (today's UI), a reviewer note about the website iframe (so it is not mistaken for
  remote code), and expecting a long review (all-sites access).
- **YouTube audit: 🟡 a few fixes before applying.** Our caching (24 h search answers, daily Shorts pools) is within the
  30-day rule. To fix first: YouTube branding next to search / Discover results, a YouTube Terms link inside the
  product (not only in the privacy policy), the overlay items already carded (nothing of ours over the player by
  itself), a check that stored YouTube titles never outlive 30 days, and the own domain (the form wants the product URL
  and policy URLs).

## 1. Chrome Web Store

### What the policies require (primary / official where reachable)
- **Single purpose**, narrow permissions, honest listing: violations come back as coded rejections; *Purple Potassium*
  = excessive permissions (Google's troubleshooting page, via an
  [appspot mirror](https://3-72-0-dot-chrome-apps-doc.appspot.com/docs/webstore/troubleshooting); developers report it
  even for justified permissions, [chromium-extensions](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/GdtnseYh5Ng));
  *Blue Argon* = Manifest V3 requirements incl. no remotely hosted code (secondary,
  [dev.to](https://dev.to/bdilip48/blue-argon-mv3-additional-requirements-explained-82g)).
- **Review time:** Google says reviews "may take longer for extensions that request broad host permissions or sensitive
  execution permissions" ([review process](https://developer.chrome.com/docs/webstore/review-process)); a store-wide
  slowdown was reported in April 2026 ([chromium-extensions PSA](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/VJ6DcpEn51Y));
  third-party guides say "hours to 3 weeks" (WEAK). Plan for 1–3 weeks, as `web-store.md` already says.
- **User data:** a privacy policy that covers every data type, the data-use disclosure form, the three certifications
  (no sale, no unrelated use, no credit use), and "limited use" of user data to the single purpose.

### Checklist against `web-store.md` and the manifest
| Item | Status | What to do |
|---|---|---|
| Single purpose text | ✅ | keep; the website features (games, voice) are the site's, the extension's purpose stays "sync a video in the room's tab" |
| Permission justifications (`storage`, `offscreen`, `scripting`, `<all_urls>`) | ✅ | keep; add the two plain lines (0.9.93.16) as the reviewer note too |
| Remote code = "No" | 🟡 | true (all code in the package), but `shell.html` opens **our website in an iframe**. Add one line to the reviewer note: "the overlay is an iframe of our own website; no remote script runs in the extension's context". Prevents a Blue Argon guess. |
| Data-use form (PII, communications, location/IP, website content, web history) | ✅ | re-check against today's features: chat images, TikTok titles via oEmbed, YouTube search words go **from the website**, not the extension (the form is about the extension; keep it honest, not inflated) |
| Privacy policy URL | 🟡 | works, but on `workers.dev`; switch to the own domain before submitting (0.9.96) |
| Name, title, summary, icon | ⬜ | still "ScreenWithMe"; change to the final name (Sidelit, if it holds) in manifest, listing, screenshots, privacy policy, help page |
| Support URL | 🟡 | points to the home page; use a contact page or the support e-mail (the store shows it to users) |
| Description | 🟡 | outdated in places (lists features that changed: "quick chat over the video", the old toolbar); mention Shorts / TikTok / games only as website features, keep "a neutral sync tool for any HTML5 video", no service names |
| Screenshots (1280×800) | ⬜ | retake with today's UI (one rail, simpler room, phone) via `npm run store`; `store/src/room.html` must follow `room.ts` |
| Reviewer test steps | ✅ | plyr.io / videojs.com demos; re-run them on submission day |
| Edge Add-ons (300 px logo) | ⬜ | already noted in `web-store.md` |
| Manifest V3, no `eval`, no remote scripts | ✅ | (esbuild bundles; keep it that way) |
| `scripting` justification | ✅ | used once on install for our own tabs; good |
| Store "Official URL" (verified domain) | ⬜ | after the own domain: verify it in Search Console to get the "verified" badge |
| `PROTOCOL_VERSION` frozen during review | ✅ | rule in `web-store.md` |

## 2. YouTube API Services compliance audit / quota extension

### What it is (primary)
- To get quota above the default you "must first complete an audit" via the **YouTube API Services – Audit and Quota
  Extension Form**; after an audit within 12 months, further requests use the same / audited-developer form; failed
  audits have an **Appeals Form**; YouTube also runs **periodic audits** (Periodic Audit Form)
  ([Quota and Compliance Audits](https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits)).
- The form asks about "(i) your business, (ii) your API Client, and (iii) your API Client's access to and usage of
  YouTube API Services", with quota per method (search.list separately)
  (same page, [form](https://support.google.com/youtube/contact/yt_api_form)). Third-party guides add: product URL,
  public privacy policy, terms of use, use-case description, expected daily usage, screenshots / a screencast
  (WEAK, [example draft](https://github.com/webpot-ru/luna/blob/main/docs/youtube-api-quota-extension-form.md)).
- **Timeline:** none published ("contact you as soon as possible"); guides say weeks to months (WEAK).
- YouTube may monitor and audit any client and suspend access (ToS §6, §3.1; Developer Policies III.H).

### The rules that apply to us (Developer Policies, read directly)
- **Caching / storage (III.E.4):** non-authorized data (search results, titles) may be stored "temporarily" in limited
  amounts, "not longer than 30 calendar days"; stored data must be kept reasonably fresh and the most current data shown.
  → **Our 24 h search cache and per-day Shorts pools are allowed.** ✅
- **Privacy policy (III.A.2):** prominent, says the client uses YouTube API Services, links the Google Privacy Policy,
  explains what is collected and used. → ✅ in `privacy.html` (EN + TR).
- **Terms link (III.A.1):** the client must "display a link to YouTube's Terms of Service" and state that using the
  client means agreeing to them. → 🟡 only inside the privacy policy; add it in the product next to search / Discover.
- **Branding (III.F.2):** every page or feature showing YouTube content "must make clear to the viewer that YouTube is
  the source", using YouTube Brand Features, on all devices. → 🟡 search results say "On YouTube: …" in text; add the
  official YouTube logo / "Results from YouTube" with the brand guidelines on search, Shorts search, Discover, More like
  this and the queue rows from YouTube.
- **RMF (overlays, player size, no changes to the player):** → see `youtube-overlay-rail.md`; 0.9.93.10 removed our
  automatic overlays; the remaining "user dragged a camera over the player" is the owner's accepted grey area (design D).
- **Deletion (III.E.4.g):** users must be able to ask for deletion of their data; we hold no authorized (OAuth) data, so
  a contact address in the privacy policy is enough. → 🟡 the support e-mail must be in the policy.
- **No charging to watch embeds, no ads around the player:** ✅ (free, no ads).

### Checklist against the current site
| Item | Status | What to do |
|---|---|---|
| Embedded player: privacy-enhanced (youtube-nocookie), YouTube's own controls | ✅ (0.9.93.14) | — |
| Nothing of ours over the player by default | ✅ (0.9.93.10) | keep the overlap harness; decide design D in writing |
| Player ≥ 200 × 200 px, controls visible (incl. phone, Shorts, fullscreen side column) | ✅ by design | add a harness assertion for the smallest layouts |
| Search: only on Enter, cached 24 h, rate-limited, quota errors handled | ✅ | — |
| Shorts pools (daily) and "More like this" (cached) | ✅ | describe them in the form as separate uses with their unit cost |
| YouTube branding next to results | 🟡 | add logo / "from YouTube" per brand guidelines |
| YouTube Terms link in the product | 🟡 | small line under the search box / in the Discover window |
| Privacy policy: YouTube API section, Google privacy link, data explained | ✅ | add the support e-mail; move to the own domain |
| Terms of use page | ⬜ | ROADMAP §4 (the form asks for it) |
| Stored YouTube data ≤ 30 days | 🟡 | search / pool caches ✅; check that queue titles, saved-room `history` titles and `lastRoom` in a saved room that stays active for months are refreshed or dropped after 30 days (a saved room can live longer than 30 days while used) |
| A demo account / steps for the auditor | ⬜ | no login needed; prepare a short screencast of search → room → Shorts feed |
| Own domain + product URL | ⬜ | 0.9.96 |
| Expected daily usage numbers | ⬜ | log daily search / pool calls (counts only, no words) for a few weeks before applying |

## What could not be checked
The Chrome program-policy pages themselves (developer.chrome.com blocked), the exact current audit form questions
(support.google.com form), and real 2026 review / audit times. The owner can open the form at
https://support.google.com/youtube/contact/yt_api_form and paste its questions to the Planner; the Research session can
then map our answers.

## Proposed cards (for the Planner)
1. **YouTube branding + Terms link next to search, Shorts search, Discover, More like this** (before the audit).
2. **30-day freshness for stored YouTube titles** (refresh or drop in saved rooms / history).
3. **Store listing refresh on name day:** new name, support contact, description, screenshots, reviewer note line about
   the website iframe.
4. **Usage counters for the quota form:** daily search / pool / like-call counts in the Worker (no query text).
