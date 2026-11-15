# Research: how far can the Shorts view take TikTok?

_Research session, 15 Nov 2026, short job from the Planner. Read-only. Not legal advice. developers.tiktok.com and
tiktok.com cannot be opened from this cloud session (blocked hosts, as in the TikTok harness note); TikTok's pages are
quoted from search excerpts of developers.tiktok.com / tiktok.com/legal. **WEAK** = one or low-quality source,
**GUESS** = inference. Related: `more-players.md`, reference "TikTok" (`players/tiktok.ts`)._

## Verdict
- **Swiping together already works for TikTok links** in the queue: a TikTok item always opens the Shorts view, and
  ↑ / ↓ / swipe move the room. Pasting many links already accepts `tiktok.com` links.
- **What's missing is a source of TikToks.** TikTok gives third parties **no search API and no trending feed**:
  - the Display API reads only a logged-in user's own videos;
  - the Research API is for vetted, non-commercial researchers.
- A "Discover" feed of TikToks like our YouTube 🎲 Discover is **not possible legally**; only scraping would give it.
- **What we can add:**
  - a "TikTok bunch" path: paste or share many links, short `vm.` links included;
  - a creator's own feed only with that creator's TikTok login, via an approved TikTok app (an owner step);
  - TikTok's official profile embed as a browse-only view.

## 1. What TikTok's official tools allow

| Tool | What it gives | Who may use it | Use for us |
|---|---|---|---|
| **Embed Player** (`www.tiktok.com/player/v1/{id}`) | an iframe player driven by `postMessage`: host → player `play`, `pause` (and `seekTo` in the code example), `mute` / `unMute`; player → host `onPlayerReady`, `onStateChange`, `onCurrentTime` (time + duration in seconds), `onMute`, `onError` ([Embed Player](https://developers.tiktok.com/doc/embed-player); seek added in the 23 Jul 2024 [changelog](https://developers.tiktok.com/docs/en/changelog)) | anyone, no key | **have it** (0.9.91.19). Enough to sync: play / pause / seek / time events. No rate control, so always 1×. Seek is only in the example, not the methods table (WEAK). |
| **oEmbed** (`tiktok.com/oembed?url=`) | title, author, thumbnail and embed HTML for **one known URL**; follows oembed.com ([Embed Videos](https://developers.tiktok.com/docs/en/embed-videos)) | anyone, no key | **have it** (titles). Cannot list or search. |
| **Embed Creator Profiles** | an official widget with a creator's profile and recent videos, linking back to TikTok ([docs](https://developers.tiktok.com/docs/en/embed-creator-profiles)) | anyone | browse-only: clicks open TikTok, so we can't sync from it. At most a "🔗 open on TikTok" window to find links. |
| **Display API** (Login Kit + `user.info.basic`, `video.list`, `video.query`) | `/v2/video/list/`: "the metadata of a TikTok user's recently uploaded videos", newest first; `/v2/video/query/`: up to 20 known IDs; **no search** ([Display API](https://developers.tiktok.com/doc/display-api-overview/), [video list](https://developers.tiktok.com/docs/en/tiktok-api-v1-video-list), [scopes](https://developers.tiktok.com/docs/en/tiktok-api-scopes)) | a registered app, reviewed by TikTok; each user grants scopes via "Log in with TikTok" | "Show **my** TikToks in the room" for a creator who logs in. Needs an approved app and a TikTok login (an exception to "no accounts", see §4). |
| **Research API** (video / comment / user queries, keywords, hashtags) | real search and trends | **only** academic and not-for-profit researchers in the US, EEA, UK, Canada or Switzerland; independence from commercial interests, funding disclosure, ethical review, a professor's letter, about 4 weeks ([Research API](https://developers.tiktok.com/products/research-api), [FAQ](https://developers.tiktok.com/docs/en/research-api-faq)) | **not eligible** (a commercial product; terms also limit the data to research). |
| **Content Posting API** | upload or post to TikTok | approved apps | irrelevant (we don't post). |
| **Commercial Content API** | the ads library | approved apps | irrelevant. |
| Search, trending, For You | — | **no public API** | not possible. |

**Quotas and review.** Display API apps need a registered app, a review of the use case and scopes, and an audit for
public posting (WEAK, third-party). Exact Display API rate limits were not found (the docs page was not reachable).
Embed and oEmbed have no key and no published quota; our Worker already caches oEmbed titles.

**Can we sync the embed?** Yes, that's what we do today.
- Play, pause and seek go out; time and state come back.
- We can't control speed, and the player's own bar stays visible (TikTok's bar, `controls=1`).
- The cloud can't reach tiktok.com, so the real player is checked only on the owner's devices; the harness uses a
  stand-in.

## 2. Who else syncs TikTok
- **TikTok itself (Dec 2025 – Jan 2026):** **Shared Feeds**: friends get a shared, interest-based feed in DMs, a
  selection of **15 videos a day**. Group chats with shared viewing are also reported (up to 32 people, WEAK)
  ([TikTok newsroom](https://newsroom.tiktok.com/new-ways-for-friends-and-families-to-discover-share-and-connect-on-tiktok),
  [TechCrunch](https://techcrunch.com/2025/12/08/tiktok-adds-a-space-for-organizing-content-with-others-teases-shared-feeds)).
  This is the real competitor for "TikTok with friends", and it lives inside TikTok.
- **Teleparty, Rave, Kosmi, Watch2Gether:** no TikTok support found (W2G and Kosmi play YouTube, Vimeo, files and
  screen share; Rave plays YouTube and its own library). **GUESS:** without a search or feed API nobody can offer
  "browse TikTok together" except by screen-sharing the TikTok app or site.
- Small tools (Cliqroom, SynchFun, GroupTube) don't confirm TikTok support either.
- **So pasted TikTok links that swipe together in a room are already rare. We are early, not behind.**

## 3. Rules that bite a sync tool
- **TikTok Developer Terms:** no adding "a brand name, logo, watermark, or other promotional branding" to TikTok
  content shown on Display Sites without TikTok's written consent
  ([Developer Terms](https://www.tiktok.com/legal/page/global/tik-tok-developer-terms-of-service/en), excerpt).
  Developer Guidelines: never remove a creator's watermark, follow the branding requirements; Design Guidelines: no
  TikTok logos or icons without written permission
  ([guidelines](https://developers.tiktok.com/docs/en/our-guidelines-developer-guidelines),
  [design](https://developers.tiktok.com/docs/en/getting-started-design-guidelines)).
  - **For us:** nothing of ours over the TikTok player (as with YouTube; already true in the Shorts view: emojis rise
    from the seats).
  - Keep TikTok's own credits ("Discover more on TikTok", creator, sound): `description=1`, `music_info=1`, already
    set.
  - Say "TikTok" in plain text, no logo, unless we read their brand rules and they allow it. Our "TikTok" chip text is
    fine; a TikTok logo icon is not.
- **No scraping:** the Developer Terms and TikTok's own Terms forbid automated collection. Any "trending TikToks" list
  would come from scraping or an unofficial third-party "TikTok API" reseller (several exist). **Never use those.**
- **Data:** Display API data sits under TikTok's Developer Data Sharing Agreement (retention, deletion when a user
  disconnects, [agreement](https://www.tiktok.com/legal/page/global/tiktok-data-sharing-agreement/en)). Our privacy
  policy would need a "Log in with TikTok" section.
- **Sync itself:** no clause found that forbids controlling the embed with its own `postMessage` API; that API exists
  for this purpose.

## 4. Recommendation in steps

**Now (no TikTok app, no owner step):**
1. **A "TikTok bunch" path in the Shorts view.** Today `parseMediaList` accepts `tiktok.com` links but not the short
   `vm.tiktok.com` / `vt.tiktok.com` share links. Those are what phones copy, and they need the Worker resolver one by
   one. Accept them in a paste of many links, resolving them 300 ms apart through `/api/tiktok/resolve`.
2. **A ♾ window note for TikTok:** when a TikTok plays, the ♾ window says "TikTok has no public feed: paste or share
   links to add more". It points to ＋ Add instead of offering YouTube Shorts topics. (Today the feed only adds
   YouTube Shorts.)
3. **"Share → Sidelit" on Android** (the PWA share target in `mobile-app.md` §4): from the TikTok app's Share sheet
   straight into the room's queue. This is the closest legal thing to "browse TikTok and bring it in".
4. **Mixed swipe:** a room's queue can hold YouTube Shorts and TikToks together; ↑ / ↓ already handles both. Check the
   prev / next and loop path with mixed items in the TikTok harness.

**Needs an approved TikTok developer app (owner: TikTok for Developers account, app review, a privacy-policy section;
an exception to "no accounts": a login only for that feature, nothing stored beyond the session):**

5. **"My TikToks" for creators:** a creator logs in with TikTok and their latest uploads (`video.list`) become a feed
   in the room. Useful for creators showing their own videos to friends; not a Discover feed. Low priority.

**Not possible (legally):**
- a TikTok Discover / trending feed;
- keyword search of TikTok;
- the For You feed;
- anything from the Research API.

TikTok's own Shared Feeds keeps it inside TikTok. Speed control isn't possible either (the embed has none).

**Order:** 1 → 2 → 4 (small, lane A) and 3 with the PWA polish card; 5 only if the owner wants creators as a target.

## Proposed cards (for the Planner)
1. **TikTok bunch:** short share links in a paste of many, resolved one by one; mixed swipe checked in the harness.
2. **♾ window for TikTok:** an honest note and ＋ Add instead of YouTube topics.
3. (With PWA polish) **Android share target** for TikTok and YouTube links.
4. (Owner decision, later) **"My TikToks" with Log in with TikTok:** TikTok developer app, review, privacy section.

## What could not be checked
- developers.tiktok.com pages in full: the Embed Player method table, Display API rate limits, review steps;
- TikTok's brand guidelines;
- the real embed player (the owner's devices).
