# Job cards (the board)

One board for every session (owner, 2 Nov 2026). The **Planner** writes, orders and routes cards and assigns versions;
a **Developer** or **Game Studio** takes the top **Ready** card of its lane, moves it to **In progress**, and when it is
live writes `Done: <PR link>`. **Security** and **Research** add suggestions under **Proposed**; the Planner and the
owner decide whether they become Ready. Roles, who edits what and how the owner is asked: `CLAUDE.md` §4. What to work
on now: `ROADMAP.md` "Focus: now / next / frozen". The owner's tick view is the Planner's board Artifact (`CLAUDE.md` §2).

**A finished card leaves this file in the same PR that writes its `Done:` line**: it moves verbatim to
`docs/internal/archive/cards-done.md` (DOCS2, 11 Nov 2026). CI (`scripts/check-docs.mjs`) proves no card heading or
backticked identifier is lost in a move.

Card format:

```
### <ID>. <short title> (<who asked, date>; <lane>)
- Why: <one line>
- Done when: <what can be checked, including its Test Lab hook or scenario>
- Tests: <unit / e2e / harness / owner's hand test>
- Owner's pick: <link or "none needed">
```

## Lanes

| Lane | Role | Owns (files) | Where its work stands |
|---|---|---|---|
| A | 🔨 Developer: room / site | the site, the room page and the room server, their tests and reference sections | `STATUS.md` task queue "Lane A" |
| B (+ B2) | 🔨 Developer: players, Shorts, extension, ops | players, Shorts, the extension, CI and the shared test tooling | QA1 below |
| W | 🔨 Developer: game windows (opened by the Planner when needed) | `apps/web/src/games/stage.ts`, game-window head / drag / fit, `catalog.ts` sizes, the game-window rules in `room.css` | idle (0.9.97.121 live) |
| Games 2 | 🎮 Game Studio 2 (opened 15 Nov 2026) | the Quiz and Window Garden files only (QZ2, WG2) | its PRs |
| Games | 🎮 Game Studio | the games' code, art, sounds, tutorials, server objects, `docs/internal/design/games/` | `STATUS.md` task queue "Game Studio" |
| — | 🛡️ Security · 🔎 Research · 🎨 Design | their own docs; cards go to Proposed | — |

Two sessions never edit the same lines; the Planner splits work by files.

## In progress

(see `STATUS.md` "Task queue")

## Ready

### YTQ1. PRIORITY: a bigger YouTube API quota through YouTube's audit (owner, 15 Nov 2026; Research + B2, owner submits)
- Why: the default quota is 10,000 units a day. One `search.list` costs 100 units, so roughly 100 searches a day across
  every room. The video and Shorts feeds (SH2), search and the Sources picker all depend on it. YouTube grants more
  quota for free after its "YouTube API Services Audit and Quota Extension" review. The owner: "important and urgent".
- What:
  1. **Research** (first, short): the current audit form and its requirements, how long reviews take, what gets
     rejected (Developer Policies, Required Minimum Functionality, branding, privacy, data storage limits), and whether
     the workers.dev address is acceptable or the own domain should come first. Write `research/youtube-audit.md`.
  2. **B2** (the pack):
     - a compliance self-check against the Developer Policies, with screenshots: no overlays on the player, YouTube
       branding, the privacy policy's YouTube section with the Google Privacy Policy link, the API data we store and
       for how long, and deletion;
     - fix anything that fails;
     - a quota-need estimate from our own usage numbers (QUOTA3 counters);
     - the form's answers drafted in English.
  3. **Owner:** submits the form from the Google Cloud project that owns `YOUTUBE_API_KEY` (his Google account). The
     Planner gives him the click-by-click steps with the drafted answers.
  3b. **Owner's picks (15 Nov 2026):**
     - The official YouTube logo, linked to YouTube, shows next to our YouTube result lists (search, Discover, feeds),
       never over the player. This replaces the earlier "text only" pick, for the audit. B2 builds it; Design checks
       the size and spacing rules.
     - The own domain comes first: `sidelit.app` (the owner buys it on Cloudflare; then `custom-domain.md`).
  4. Meanwhile the code stays quota-light (SH2 rules: cheap calls first, cache searches, no search per video).
- Done when: the audit pack is in `docs/internal/youtube-audit/`, every self-check item passes, and the owner has
  submitted. Later: the granted quota is recorded in `costs.md`.
- Tests: the self-check list ticked with shots; QUOTA3 counters show daily use.
- Owner's pick: "important and urgent" (Planner chat, 15 Nov 2026).

### UI4. The owner's 17 Nov polish pass (owner, 17 Nov 2026; lane A, after FC1 and RC1)
- Why: the owner's notes after trying SRC2 / FD1 live.
- What:
  1. **No feed pill on top.** Remove the "♾ Feed: … · N left · by …" pill from above the video / the "Now playing"
     bar in the room view and the Shorts view. The feed shows only where the feed lives (the feed window / drawer and
     the queue's feed row). Keep pause / stop there.
  2. **Drive-In is the default theme.** Every new visitor and every room starts in the Drive-In theme
     (`themes.ts` `acikhava`); anyone can change it and the choice stays saved in the browser as today. A saved
     choice is never overwritten. (The owner: "I like it most right now; we may change it later.")
  3. **"What are we watching?" picker polish (SRC2):** (a) the grid sits too high with empty space below: centre it
     and balance the card in the space it gets; (b) service marks: show the official logo / icon of a service only
     where that brand's published guidelines allow it at tile size (YouTube's rules forbid the logo under 100 px and
     as the most prominent element, so YouTube and Shorts likely stay our glyph + the name; check TikTok, Vimeo,
     Dailymotion, YouTube Music, Spotify-like podcast marks one by one and write the findings in the PR; never a
     lookalike); (c) planned services: one tile "🎬 Subscription services · Coming" (everyone with their own
     subscription, via the extension), **no service names** (CLAUDE.md §6: a name only if it really works; store
     policy) unless the owner decides otherwise.
  4. **Shorts view "Other" button does nothing.** The rail's groups (Talk · Watch · Room) are liked; its "Other" /
     "More" entry doesn't work. Fix it (open its menu on laptop and phone) with a harness check.
- Done when: all four live on computer + phone; Test Lab hooks `ui.feedPill` (gone), `theme.default`, `sources.picker`
  layout check, `shorts.more`; shots at 4 sizes; owner's hand test.
- Owner's pick: his message to the Planner (17 Nov 2026).

### DM1. Dailymotion links play in sync without the extension (owner, 17 Nov 2026; lane A, after CR2)
- Why: Dailymotion is the most visited entertainment site in Turkey (research `docs/internal/research/video-sources.md`).
- What: a `dailymotion` media kind like Vimeo's (`players/vimeo.ts` as the model): links `dailymotion.com/video/<id>`
  and `dai.ly/<id>`; the official player with the owner's Player ID (from `site.config.json`, not a secret); play,
  pause, seek, time and ended through the engine's `command()`; Dailymotion's own ads covered by the everyone-ready
  wait; CSP hosts in `_headers`; privacy page line in both languages; public texts only say "Dailymotion links work".
  First verify web seek and whether the iframe's postMessage is enough without their SDK script.
- Done when: a Dailymotion link plays, pauses and seeks in sync for two people on a computer and a phone; Test Lab
  hook `player.dailymotion`; fake-player harness in the `site` job; the owner's real check.
- Owner step: a free Dailymotion account and a player (Player ID), given to the Planner (not a secret).
- Owner's pick: "Dailymotion ekleyelim" (Planner chat, 17 Nov 2026).

### RC1. The session recap, redesigned: design options, then build (owner, 17 Nov 2026; Design first, then lane A)
- Why: today's recap (Profile menu, `ui/recap.ts`) is hard to find, looks out of place, and its phone-like story screen
  with side swipes is not what he wants. He wants something people love and use at the end of a session.
- What (owner's asks; he is undecided on the flow, so give options):
  - Findable but not screen-filling. Beautiful backgrounds with our logo, several cute designs; facts get their own
    background (e.g. "most emojis").
  - Ideas for getting people to see it at the end of a session although we can't know when they close the tab,
    without nagging people who already know it.
  - Flow he leans to: only the host can start it; others send "ask the host to show the recap"; on the host's yes it
    plays for everyone in the video's place like a newly opened video (Shorts view switches to the normal view), the
    queue unchanged: a horizontal, windowed, scrolling show (not a phone story), maybe with its own music. Content:
    when you started, how long you watched, the most-used emoji and who sent it, who talked most, etc.
  - Session rule: a "day" is a session, not a date. Proposal to check: a session starts after a gap of ≥ 4 h without
    activity (today's `SESSION_GAP_MS`); the recap can be shown once per session after ≥ 30 min of watching; after it
    is shown it cannot be shown again in that session; the next session resets it. The design note confirms or
    improves this rule.
- Design step: `docs/internal/design/session-recap.md` with 2–3 options for look, entry point and flow (recommended
  first, short previews), sent to the Planner as text. Build only after the owner's pick.
- **Owner's picks (17 Nov 2026, picks page):** look A night stage (one 16:9 scene per fact, own background each, logo,
  filmstrip); who A host shows, guests ask ("🙋 Ask the host", one toast "Show to everyone / Not now"); where A ✨ on the
  rail once ready (≥ 30 min, gold dot until opened); music A our own Web Audio pad, low, 🔇, off when sounds are muted.
  Defaults he saw and did not object to: nudges N1 / N2 / N4 (max one per person per session, "Don't remind me"), the
  session rule with Design's 4 improvements (`design/session-recap.md`).
- Done when: the picked design is live; Test Lab hook `recap.show`; server rule (once per session) with an e2e;
  privacy page checked (no new data unless stated); shots at 4 sizes; owner's hand test.

Game Studio cards (GMP, GW2, GP1, GT1, QZ2, WG2): `docs/internal/cards-games.md`.

## Proposed

Security and Research suggestions: `docs/internal/cards-proposed.md`.

## Done

Every finished card: `docs/internal/archive/cards-done.md` (and the release notes in `CHANGELOG.md`).
