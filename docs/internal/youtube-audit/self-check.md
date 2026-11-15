# Compliance self-check (YouTube Developer Policies, Branding Guidelines, Required Minimum Functionality)

Status on 15 Nov 2026 (0.9.97.140). ✅ passes · 🟡 passes, evidence still to capture on the final domain.
"Shot" = a screenshot to take on `https://sidelit.app` on the day, computer (1366 wide) and phone, saved with the form.

| # | Rule | What it asks | Status | Evidence in the product | Shot |
|---|---|---|---|---|---|
| 1 | III.A.1 Terms link | a link to the YouTube Terms of Service where the API is used; our terms bind users to them | ✅ | "Results from YouTube · YouTube Terms of Service" under every YouTube result list (`.yt-attrib`, `ui/search.ts`, `room.ts`); `terms.html` "By playing or searching YouTube videos in Sidelit you agree to…" (EN + TR) | search results; the YouTube line in `terms.html` |
| 2 | III.A.2 Privacy policy | always reachable; says we use YouTube API Services; links the Google Privacy Policy; contact | ✅ | `privacy.html` "YouTube search" (EN + TR), `policies.google.com/privacy`, the contact e-mail; linked from the join card, the profile menu and ⋯ More; `check-yt-audit.mjs` checks the page | the privacy policy's YouTube section |
| 3 | III.A.2.h revoke | only for OAuth (Authorized) data | ✅ n/a | no OAuth, no sign-in to YouTube | – |
| 4 | III.D.1.c / d one project, no key sharing | one API project per client | ✅ | one Cloud project, the key only in the Worker (`YOUTUBE_API_KEY`, never in the page) | – |
| 5 | III.E.4.d storage | non-authorized data not longer than 30 days; kept consistent | ✅ | search answers cached 24 h by the words (`caches.default`); Discover pools daily; queue titles refreshed or dropped after 30 days (`TITLE_MAX_AGE_MS`); usage counters are plain numbers, 90 days | – |
| 6 | III.E.4.g deletion | delete on request within 7 days | ✅ | we hold no user YouTube data; the privacy policy's contact handles requests ("within 7 days" if asked) | – |
| 7 | III.F.2 attribution | make clear YouTube is the source, with YouTube brand features | ✅ (0.9.97.140) | the YouTube icon + "Results from YouTube" + Terms link on every list | search, Shorts search, Discover |
| 8 | Branding Guidelines | the logo next to the API results, linking back to YouTube; unmodified; minimum size; not our most prominent element; no "YouTube" in our name | 🟡 | `public/brand/youtube-icon.svg` 24 × 17 linking to youtube.com; our name is Sidelit. **Before submitting:** the file must be YouTube's own (Design is swapping the traced icon) and Design confirms size and clear space | each list's line, close up |
| 9 | Required Minimum Functionality | player ≥ 200 × 200; nothing in front of the player or its controls; one autoplaying player; metadata unmodified | ✅ | the overlap harness (`yt-room`), the game window and the stream window keep clear of the player (ST1: the stream window hides in YouTube fullscreen); thumbnails, titles, channels and durations as YouTube gives them | the room playing a YouTube video, the rail beside it |
| 10 | Policy guide: standard YouTube experience, no copy of YouTube | | ✅ | our own room screen around YouTube's own player | – |
| 11 | III.F.3.1 no charge to watch | | ✅ | free, no ads, no paid features | – |
| 12 | III.H don't conceal use | | ✅ | the key is called only from our Worker, with our domain as origin | – |
| 13 | Reviewer access | the reviewer can reach and test the app | ✅ | public, no login; access steps in `form-answers.md` §4 | – |

**Not shown in the screencast:** a person dragging their own camera window over the player (the owner's accepted grey
area, design D in the research); every other window keeps clear by itself.

## Day-of checklist
- [ ] `node scripts/check-yt-audit.mjs https://sidelit.app` green.
- [ ] The logo file is YouTube's own (Design) and its size confirmed.
- [ ] Shots (computer + phone): search results with the logo line; the Shorts view's ＋ search; the ♾ Discover window;
      a queue with YouTube titles; the room playing YouTube (nothing over the player); `privacy.html` YouTube section;
      `terms.html` YouTube line.
- [ ] Screencast recorded (`screencast.md`), uploaded unlisted, link in the form.
