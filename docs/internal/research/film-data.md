# Film data: Letterboxd, TMDB and the alternatives (Research, 21 Nov 2026, card LB1)

_The owner's question (via the Planner, 21 Nov 2026): can users connect Letterboxd, or can we read film data, for
session-recap comments ("you watched X, rated 4.1 on average") and film suggestions? Method: web search excerpts. The
providers' own pages (letterboxd.com, themoviedb.org, omdbapi.com, wikidata.org, trakt.tv) do not resolve from the
cloud session, so every fact below is a search excerpt of those pages; **WEAK** = secondary / third-party source,
**GUESS** = inference. Whoever builds on this re-reads the linked terms first. Not legal advice._

## Summary

| Source | Can we use it? | Data | Licence / cost | Verdict |
|---|---|---|---|---|
| **Letterboxd API** | **No, not for us.** By request only, and Letterboxd says it is *currently not approving* data-analysis, visualization, **recommendation**, LLM or private / personal projects [L1] | Member diary, ratings, watchlist, film pages (OAuth) | Free if approved; terms by agreement | **Drop.** Optional later: a link out, or a local CSV import |
| **TMDB API** | **Yes**, free for non-commercial use with attribution [T1][T2] | Title, year, poster, genres, `vote_average`, runtime, similar / recommended films | Free non-commercial; commercial needs a written deal [T2]; cache ≤ 6 months [T3] | **Recommended** (server-side, opt-in) |
| **Wikidata** | Yes | Title, year, genres, director, cross ids (TMDB, IMDb, Letterboxd) | **CC0**, no attribution needed [W1] | Good free fallback; no posters, no ratings |
| **OMDb** | Possible | Title, year, genres, IMDb / Rotten Tomatoes / Metacritic scores | 1,000 calls / day free; posters only for paying patrons [O1] | Skip: ratings belong to other companies, licence unclear |
| **Trakt** | Possible | User watch history and ratings (OAuth) | Free accounts limited to one connected app since 2025 [K1][K2] | Skip: few of our users have it |

**Recommendation in one line:** build film features in two steps. **Step 1 (no third party):** the room's own data
(FR1 star ratings, watch time) feeds the recap: "you rated it 4.1 ★ on average". **Step 2 (opt-in):** the host can
"identify the film" through TMDB, called **from our server**, to add a poster, year, genres and 3 suggestions, with
TMDB's attribution. Letterboxd is not possible through its API; offer a plain "Log it on Letterboxd" link instead.

## 1. Letterboxd

- **Access:** "available by request only" (email api@letterboxd.com with the use case). The official API page says
  Letterboxd is **currently not approving** requests for data-analysis, visualization or recommendation projects,
  LLM / GPT-related use, or private / personal projects, and points anyone who needs general film data to **TMDB**
  [L1][L2]. A third-party guide (2026) says access "remains effectively closed to the general public" [L3] (**WEAK**).
- **Our fit:** "film suggestions" is exactly the excluded kind; a recap of a member's diary is close to "data
  analysis". **Approval odds: very low (GUESS)**, and asking costs the owner an e-mail and a wait with no likely gain.
- **OAuth:** the docs say third parties use Client Credentials or Authorization Code (the password flow is first-party
  only) [L4]. So "connect Letterboxd" would mean a login redirect, tokens on our server and a privacy-policy change.
- **Scraping:** Letterboxd's terms forbid automated scraping (quoted by [L3], **WEAK**); scraper vendors report 403s.
  **Never scrape.**
- **What is still possible without the API (all GUESS, to verify when built):**
  - **A link out**: after FR1's results, "Log it on Letterboxd" opens `letterboxd.com/search/<title>` in a new tab.
    Nothing is sent by us; the user chooses to go. (Letterboxd also has `letterboxd.com/tmdb/<id>` redirects once we
    know a TMDB id; **GUESS**, check.)
  - **A local CSV import**: members can export their data as a zip with `ratings.csv`, `diary.csv`, `watched.csv`,
    `watchlist.csv` … [L5] (**WEAK**; columns are said to include Date, Name, Year, Letterboxd URI, Rating). Our page
    could read that file **in the browser only** for a fun "your Letterboxd vs. this room" line. Small audience, more
    privacy text; **not now**.
- **Branding:** Letterboxd's trademarks and logo are not licensed except as its terms set out [L6]. Without an API
  deal we use the plain word in a link text only, no logo.

## 2. TMDB (The Movie Database)

- **Cost and terms:** the API is free for **non-commercial** use if TMDB is credited as the source [T1]. A project is
  commercial when its main purpose is to make money for its owner [T1]; commercial use needs a separate written
  agreement, maybe with fees, and using it commercially without one is a material breach [T2].
- **Donations:** the terms found say nothing about donations (**open**). Sidelit has no income now; donations are
  planned only after 1.0 (CLAUDE.md §10). **Before a donate button goes live, ask TMDB in writing** whether a
  donation-funded free app stays non-commercial (one e-mail from the owner's project address). GUESS: likely yes,
  since the main purpose is not revenue, but get it on paper.
- **Attribution (required):** the sentence "This product uses the TMDB API but is not endorsed or certified by TMDB."
  with TMDB's approved logo, in an About / Credits place, and the TMDB logo **less prominent** than ours [T1][T4]. For
  us: a line in `about` / help + `third-party-notices.txt`, and a small "Film data: TMDB" credit on any card showing
  TMDB data.
- **Caching:** no caching of TMDB information for **longer than 6 months** [T3]. A KV cache with a 30-day TTL fits.
- **Rate limits:** the old 40 requests / 10 s limit was removed in Dec 2019; TMDB limits by IP and asks clients to back
  off on 429 [T3] (**WEAK**). Our volume (a few lookups per film per room) is tiny.
- **Images:** posters come from `image.tmdb.org`; the image CDN is not counted in the API rate limit [T3] (**WEAK**).
  No TMDB text found on hotlinking either way; showing posters through TMDB's CDN is how most apps do it (GUESS).
  Needs `image.tmdb.org` in `img-src` of `apps/web/public/_headers` (CLAUDE.md §7 CSP).
- **Key:** one free key from a TMDB account (the owner's; KeePass entry `TMDB – API key (film data)`), stored as a
  Cloudflare secret, used **only by the Worker**. Never in site or extension code (the repo is public).
- **Data we would use:** `search/movie` (title + year → id), `movie/{id}` (title, year, poster, genres, runtime,
  `vote_average`), `movie/{id}/recommendations` or `/similar` (suggestions). Endpoint names: common knowledge of the
  v3 API, verify in the docs.
- **Apple / store note:** one developer reports an app rejected for using TMDB posters [T5] (**WEAK**, an App Store
  case, not Chrome). Chrome Web Store risk is the listing text, not in-app data (see §5).

## 3. Wikidata

- **Licence:** all structured data in the main, property and lexeme namespaces is **CC0** (public domain); no
  attribution needed [W1].
- **Access:** query service `query.wikidata.org/sparql`; send a proper User-Agent (Wikimedia policy: a site URL or
  contact) [W2]; about 60 s of query time per minute per client (**WEAK**) [W3]; the query service is moving to a new
  backend in 2026–27, endpoints may change [W3].
- **Data:** film title in many languages, year, genres, director, cast, and cross ids: TMDB movie id (P4947),
  Letterboxd film id (P6127), IMDb id (P345) (property numbers: GUESS, verify). **No ratings**, and posters are
  usually not on Commons (copyright).
- **Fit:** a free, no-key fallback for "year · genre · director", or to turn a TMDB id into a Letterboxd link. Not
  enough alone for posters or suggestions.

## 4. OMDb, Trakt and others

- **OMDb:** free key, 1,000 requests / day; the Poster API is for paying patrons only [O1][O2]. Returns IMDb, Rotten
  Tomatoes and Metacritic scores, which are other companies' data (IMDb licenses its data separately [O3]); licence of
  OMDb's own data not found. **Skip.**
- **Trakt:** OAuth with user history and ratings; since Feb 2025 free accounts may connect only one app and VIP costs
  more [K1][K2]; non-commercial API terms not found. Few of our users will have it. **Skip.**
- **IMDb datasets / API:** licensed, commercial (AWS Data Exchange); **skip** (GUESS from [O3]).
- **JustWatch** ("where to stream"): no public API; TMDB's watch-provider data comes from JustWatch and carries its own
  attribution (GUESS, verify). Not needed now.

## 5. Privacy and store policy

- **What would go to a third party:** with TMDB called from our Worker, TMDB sees **our server**, never the user's IP
  or browser; it receives only a search text (the film title guess + year). No user ids, names, ratings or room ids.
- **But it is still a change:** FR1 says "no film title is sent anywhere outside the room", and `privacy.html` says of
  the poll "No film title is sent". A TMDB lookup sends a title to TMDB. So: (a) it must be **opt-in by the host** per
  film ("🔎 Find film details", off by default), (b) `privacy.html` gets a dated line in both languages ("when the host
  asks for film details, our server sends the film's name to TMDB to look it up; nothing about you is sent"), (c)
  results cached on our server ≤ 6 months, keyed by the normalized title, not by room.
- **Matching is a guess:** the extension knows only the page title (e.g. "Watch X (2019) – SiteName"). Cleaning it
  and searching TMDB will sometimes pick the wrong film. The host must **confirm** the match (poster + year shown,
  "Yes, that's it" / "No"), and can type the name instead.
- **YouTube:** most YouTube videos are not films; offer the lookup only on film pages (extension) and direct video
  files, never as an automatic YouTube feature (and nothing over the YouTube player, §7).
- **Chrome Web Store:** posters and titles appear only inside a room, chosen by users; public texts (README, listing,
  site copy, screenshots) still name no film (CLAUDE.md §6). Store screenshots use a made-up film card, not a real
  poster.
- **Letterboxd OAuth or CSV** would add account data and need a bigger privacy section; another reason to leave it.

## 6. How it fits our features

- **RC2 (session recap):** step 1 needs no film data: "2 h 10 min together · you rated it 4.1 ★ (FR1) · Sam liked it
  most". Step 2 adds the confirmed film's poster as the recap's "marquee" and "a 2019 thriller" from its genres.
- **FR1 (Rate the film):** stays as written (no title leaves the room). After the results card, an optional
  "Log it on Letterboxd" link (user-initiated, opens a new tab), plus, if the host confirmed the film, its poster.
- **Suggestions:** after the recap: "Next time? 3 films like this" from TMDB recommendations, each one a search link
  (we host no films and link no piracy sites; a suggestion is a title + poster + TMDB link only).

## 7. Recommendation

1. **Now:** nothing third-party. Let FR1 store each film's room ratings in the session recap data (`recap.ts`), so
   RC2 can say "rated 4.1 ★ on average". No new data leaves the room.
2. **Next (card FD1 below):** TMDB through the Worker, host opt-in, confirm step, KV cache 30 days, attribution,
   `privacy.html` line, CSP for `image.tmdb.org`. Owner creates the TMDB account and key.
3. **Before donations go live:** the owner e-mails TMDB to confirm a donation-funded free app is non-commercial.
4. **Letterboxd:** do not apply now (the stated policy excludes us); only the link out. Re-check the API page once a
   year or when we have real users.
5. Wikidata is the fallback if TMDB ever refuses us; OMDb and Trakt are not worth the work.

## Sources

- [L1] Letterboxd, API Access (beta): https://letterboxd.com/api-beta/ (via search excerpt)
- [L2] Letterboxd help, "Do you have mobile apps or an API": https://letterboxd.zendesk.com/hc/en-us/articles/15269070369551-Do-you-have-mobile-apps-or-an-API
- [L3] "Letterboxd Has No API" (2026, third party): https://logiover.pages.dev/guides/letterboxd-no-api-export-film-review-data/
- [L4] Letterboxd API docs: https://api-docs.letterboxd.com
- [L5] Letterboxd importing / data help: https://letterboxd.com/about/importing-data/ ; export analysis (third party): https://julianegerez.github.io/blog/2023/06/11/Letterboxd
- [L6] Letterboxd terms of use: https://letterboxd.com/legal/terms-of-use/
- [T1] TMDB developer FAQ: https://developer.themoviedb.org/docs/faq
- [T2] TMDB API Terms of Use: https://www.themoviedb.org/api-terms-of-use
- [T3] Rate limits profile (third party) and TMDB forum on caching: https://apis.io/rate-limits/tmdb/tmdb-rate-limits/ ; https://www.themoviedb.org/talk/5ba32c77925141523700e0c9
- [T4] TMDB logos and attribution: https://www.themoviedb.org/about/logos-attribution
- [T5] Apple developer forum, app rejected over TMDB posters: https://developer.apple.com/forums/thread/649351
- [W1] Wikidata licensing: https://www.wikidata.org/wiki/Wikidata:Licensing
- [W2] Wikidata data access: https://www.wikidata.org/wiki/Wikidata:Data_access
- [W3] Wikidata Query Service manual: https://www.mediawiki.org/wiki/Wikidata_Query_Service/User_Manual
- [O1] OMDb: https://www.omdbapi.com/
- [O2] Movie API comparison (third party): https://zuplo.com/learning-center/best-movie-api-imdb-vs-omdb-vs-tmdb
- [O3] IMDb licensing conditions: https://m.imdb.com/licensing/plugintc/
- [K1] Trakt, limits for 2026: https://forums.trakt.tv/t/updating-trakt-limits-for-2026/101592
- [K2] AlternativeTo, Trakt free-tier limits (Feb 2025): https://alternativeto.net/news/2025/2/trakt-tv-has-set-stricter-limits-for-free-users-and-raised-vip-subscription-prices-by-100-
