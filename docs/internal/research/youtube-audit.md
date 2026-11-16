# Research: the YouTube API audit and quota extension (card YTQ1)

_Research session, 15 Nov 2026, priority job from the Planner for card YTQ1 (PR #448). B2 builds the audit pack from
this file. Official Google pages on developers.google.com were read directly. **The form itself
(support.google.com) cannot be opened from this cloud session**, so its fields come from Google's own description,
search excerpts of the live form and a public filled-in draft by another developer (marked WEAK). Before submitting,
the owner opens the live form and B2 maps any new field. Not legal advice. Earlier: `store-and-youtube-audit.md` §2
(3 Nov)._

## Verdict
- **Who submits:** the owner, signed in with the Google account that **owns the Google Cloud project** holding
  `YOUTUBE_API_KEY`. That project is the "API Client", and there must be exactly one project per API client (III.D.1.c).
  B2 prepares the answers and evidence; the owner pastes them and clicks submit.
- **We pass most checks already:**
  - privacy policy with the YouTube API section, the Google Privacy Policy link and a contact;
  - the YouTube Terms link in the product and in our terms;
  - 30-day title refresh (Y2);
  - 24 h search cache;
  - nothing of ours over the player;
  - usage counters (Y3).
- **Two gaps before submitting:**
  1. YouTube **logo** branding next to results. Today we show text only ("Results from YouTube · YouTube Terms of
     Service"); the branding guidelines ask for a YouTube logo that links back to YouTube.
  2. The **own domain**: every URL in the form should be the final one.
- **Timing:** Google publishes no review time ("as soon as possible"). Reports range from weeks to months. Apply as
  soon as the domain is live, well before quota becomes a problem.

## 1. The form
**Where:** "YouTube API Services – Audit and Quota Extension Form", https://support.google.com/youtube/contact/yt_api_form.
The same form covers a first audit, another extension within 12 months, and the periodic audit when YouTube asks.
Separate forms: Appeals (https://support.google.com/youtube/contact/yt_api_appeals) and Change of Control
([Quota and Compliance Audits](https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits)).

**Default quota** (same page): 10,000 units a day, with `search.list` at 100 units a call. To get more you "must first
complete an audit to show that your project is in compliance" with the YouTube API Services Terms. Approved extra quota
is limited to the approved use case (Developer Policies III.D.3).

**Fields, in order.** Sources: the live form's opening sections via search excerpt, plus a public filled-in draft
([webpot-ru/luna](https://github.com/webpot-ru/luna/blob/main/docs/youtube-api-quota-extension-form.md), WEAK). Our
answer is in the right-hand column.

| Section | Field | Our answer (draft for B2) |
|---|---|---|
| 1 Request type | "compliance audit to request a quota extension" / "… to keep current quota (re-audit)" | the first |
| 2 Organisation / contact | individual or organisation; full legal name; organisation name (if any); country and address; primary, technical and business contact (name, e-mail); organisation website; industry; business type | **individual** (no company); the owner's legal name and address (owner fills in, never in the repo); contact = the support e-mail (screenwithme.app@gmail.com until the domain mailbox exists); website = the own domain; industry = entertainment / media; independent developer |
| 3 Business model | "What does your organization do and how is it related to YouTube?"; primary audience; revenue model; ads over YouTube content; commercial use approval; partner manager; how you learned about the API | see §5 text; audience = general viewers watching with friends; revenue = **free, no ads, no paid features**; ads over YouTube content = **none**; partner manager = no |
| 4 API client | client name (and "does it contain 'YouTube'?" → must not); primary access URL; privacy policy URL; terms URL; is it public; access instructions for the reviewer | Sidelit; no; `https://<domain>/`; `/privacy.html`; `/terms.html`; **public, no login**; "open the site, Create room, type words in the link box and press Enter; Discover in the ♾ window of the Shorts view" |
| 5 Google Cloud projects | number of projects; **project number(s)** (the numeric one from Cloud Console, not the ID); use cases per project; OAuth used? | **1** project; its number (owner); use cases: search and discovery, playback in the embedded player; **no OAuth, no user YouTube data** |
| 6 Endpoints | which methods | `search.list`, `videos.list`, `channels.list`, `playlistItems.list` (the methods `callYouTube` uses; check against `apps/server/src/youtube.ts` on the day) |
| 7 Quota request | general daily quota + peak per minute + justification; per-method figures for `search.list` (and `videos.insert`, not used) | §5 |
| 8 Evidence | screenshots / screencast of every place API data shows; privacy and terms pages; how YouTube is attributed | §4 checklist |

Up to 10 projects per form. Google may ask for accounts or access to every feature on request (III.H). We have no
login, so we say so.

## 2. What the audit checks (official text, our status)

| Rule (Developer Policies unless said) | Requirement | Our status |
|---|---|---|
| III.A.1 Terms link | "API Clients must display a link to YouTube's Terms of Service"; our terms must say using the client binds users to them | ✅ `.yt-attrib` line under every YouTube result list (Y1) + `terms.html` ("By playing or searching YouTube videos in Sidelit you agree to…", EN + TR) |
| III.A.2 Privacy policy | prominent, always reachable; says we use YouTube API Services; links the Google Privacy Policy (III.A.2.c); how to contact us (III.A.2.i) | ✅ `privacy.html` (YouTube API section, `policies.google.com/privacy`, e-mail, EN + TR, linked from the join card, profile menu, ⋯ More). Check on submission day that it renders on the live domain |
| III.A.2.h revoke link | only for Authorized (OAuth) data | n/a: no OAuth |
| III.D.1.c one project per client; III.D.1.d no key sharing | "exactly one (1) API Project for that API Client"; no splitting quota across projects ([policy guide](https://developers.google.com/youtube/terms/developer-policies-guide)) | ✅ one project; separate dev / test keys are allowed |
| III.E.4.d storage of non-authorized data | titles and results stored "not longer than 30 calendar days"; III.E.4.e keep stored data consistent with current data | ✅ search cache 24 h, pools daily, titles `titleAt` refreshed or dropped within 30 days (Y2) |
| III.E.4.g deletion requests | delete "as soon as possible and within 7 calendar days" | ✅ we hold no user YouTube data; the privacy policy gives the contact address; say "within 7 days" if asked |
| III.F.2 attribution | every page showing YouTube content "must make clear to the viewer that YouTube is the source" using YouTube Brand Features; don't obscure YouTube's own attribution | 🟡 text only today |
| [Branding Guidelines](https://developers.google.com/youtube/terms/branding-guidelines) | logo "next to the location where the API implementation appears", "needs to link back to YouTube content"; minimum sizes; colours unchanged; not the most prominent element; never "YouTube" in our product name | 🟡 **add the official YouTube logo** (from YouTube's brand site, unmodified, minimum size) to the attribution line on search results, Shorts search, Discover / More like this / channel lists, linking to youtube.com; our name has no "YouTube" ✅ |
| [Required Minimum Functionality](https://developers.google.com/youtube/terms/required-minimum-functionality) | player ≥ 200 × 200 px; nothing in front of the player or its controls; autoplay only when > half visible, one autoplaying player per screen; metadata unmodified | ✅ (0.9.93.10 onwards; overlap harness); the owner's accepted grey area: a user dragging their own camera window over the player (design D), so the screencast must not show it |
| Policy guide: "reflect a user's standard YouTube experience", no "identical" YouTube copy, thumbnails and titles visible and unmodified | ✅ our rows show the thumbnail, title, channel and duration as YouTube gives them |
| III.F.3.1 | no charging to watch embeds | ✅ free |
| III.H | YouTube may monitor and audit; don't conceal use | ✅ the key is called only from our Worker with our domain as Referer / origin |

## 3. Common rejection reasons and review time
Google publishes **no** list of reasons and **no** review time. These come from developer reports (WEAK):
- an incomplete form;
- a quota request not backed by real usage numbers;
- data shown or stored against the storage and branding rules;
- **a reviewer who can't reach or test the app**;
- privacy or terms pages that don't render or don't contain the required text, e.g. the Google privacy link (the
  public draft above found its own `/privacy` empty for the reviewer);
- use cases outside the request: scraping, bulk harvesting, competitive analytics.

Sources: [Blotato](https://www.blotato.com/blog/youtube-api-pricing),
[singhamandeep](https://singhamandeep.com/youtube-data-api-quota-increase-audit/), and one
[Google developer forum thread](https://discuss.google.dev/t/youtube-api-compliance-review-no-response-for-8-weeks-after-full-remediation/405834)
with about eight weeks of silence after remediation. Plan for **4–12 weeks**, and an appeal if refused.

## 4. workers.dev or our own domain first?
No official rule names workers.dev. Our own domain should come first anyway:
- **Stable URLs.** The form's organisation website, primary access URL, privacy URL and terms URL are what the
  reviewer opens and what the approval records. Changing the product URL after approval means telling YouTube, and
  the periodic audit checks the live client (GUESS: a changed URL may trigger questions or a re-audit).
- **A shared hosting subdomain looks temporary** to a reviewer judging "a real, maintained product" (GUESS). It also
  matches the "workers.dev may be filtered" note for some networks.
- **The Chrome Web Store listing**, the YouTube form and Search Console verification all want the same final domain
  (`store-and-youtube-audit.md`).
- **The domain also gives a support mailbox** for the contact fields.

**Order:** domain live → privacy, terms and help on it, with the support e-mail → YouTube logo attribution → screencast →
submit.

## 5. What we state about usage and growth
**The use-case text** (draft for the "What does your organization do" field; B2 adapts):

> Sidelit is a free website (no account, no ads) where small groups of friends watch a video together in sync. A
> person creates a room, shares the link, and everyone's player follows the same play, pause and seek. YouTube videos
> play only in the official embedded YouTube player, with YouTube's own controls and nothing of ours in front of it.
> We use the YouTube Data API for four things:
> (1) search: a user types words and presses Enter; we call search.list plus videos.list for durations;
> (2) Shorts Discover: one shared daily list per category and region, cached for the day;
> (3) "More like this": a channel's uploads;
> (4) following a channel the user names.
> We store no user YouTube data and use no OAuth. Search answers are cached for 24 hours and titles are refreshed or
> dropped within 30 days. Every result list says "Results from YouTube" with a link to the YouTube Terms of Service.

**Numbers to give** (from the `YoutubeUsage` counters, `GET /api/youtube/usage`):
- daily units and requests by kind (search, pool, like, channel) for the last 30–90 days; peak day; average units per
  active room;
- our own limits:
  - search only on Enter;
  - a 24 h cache for the same words;
  - 10 searches a minute per address;
  - a daily budget of `DAILY_UNIT_BUDGET` 9,000 units (we stop at 90 % of the free quota);
  - `IP_DAILY_UNITS` 2,000 per address.

**Units per action** (`UNIT_COST` in `yt-usage.ts`; `search` 100, `videos` / `channels` / `playlistItems` 1):

| Action | Calls | Units |
|---|---|---|
| a new search | search.list + videos.list | 101 |
| a Discover page | one shared answer per kind, region, language and day | about 101 the first time, 0 after |
| More like this | channels.list + playlistItems.list + videos.list | ≈ 4, or 101 when it falls back to a search |
| a channel page | ≈ 3 | |

**How much to ask for.**
- Today 10,000 units ≈ 99 new searches a day for everyone.
- Ask for what a realistic launch needs, with arithmetic: for example, 1,000 daily active rooms × 2 new searches ×
  101 units ≈ 200,000, minus the cache hits we measure. Our caching means real use stays below this.
- A **`search.list` per-day** figure with its own justification.
- **Peak per minute** from the counters.
- Ask modestly (for example **100,000 units a day**) and grow through the "additional extension within 12 months"
  path. Requests "not backed by real usage" are a reported rejection reason.
- **Growth:** the store launch after 1.0, the Chrome Web Store extension (it uses no YouTube API itself), and that
  the budget guard stays as a safety net.

## 6. The audit pack (for B2)
1. A screencast, 2–3 minutes, on the live domain:
   - home → create a room;
   - a search with words → the result list with the YouTube logo, "Results from YouTube" and the Terms link;
   - play in the embedded player (YouTube's controls visible, nothing over it);
   - the Shorts view and Discover → More like this;
   - the privacy policy's YouTube section;
   - the terms' YouTube line.
2. Screenshots of each place API data appears (search, Shorts search, Discover, More like this, channel list, queue
   rows from YouTube), computer and phone.
3. The privacy and terms URLs, checked with a plain `curl` that the YouTube text and the Google privacy link are in
   the HTML.
4. 30 days of usage numbers from `/api/youtube/usage` (counts only), in a small table.
5. The list of methods called, from `youtube.ts`.
6. The answers in §1, and the use-case text in §5.

## Proposed cards (for the Planner)
1. **YouTube logo attribution:** the official logo (unmodified, minimum size, links to youtube.com) beside every
   "Results from YouTube" line; CSP if served from YouTube's brand host (better: self-host the official file); harness
   checks it in every list.
2. **Audit pack (B2):** §6, after the domain.
3. **Owner steps:**
   - (a) confirm which Google account owns the Cloud project and note its project number;
   - (b) submit the form on that account;
   - (c) a KeePass entry is not needed: no new secret.

## What could not be checked
- the live form's full field list (support.google.com blocked here);
- official review times;
- whether YouTube has a view on workers.dev.
