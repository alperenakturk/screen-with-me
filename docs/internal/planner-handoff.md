# Planner handoff

The Planner's working memory, so a fresh Planner session can continue without the old chat (owner, 16 Nov 2026:
"keep contexts small, everything needed must be in the repo"). The Planner rewrites this file at every handoff;
rules stay in `CLAUDE.md`, cards in `CARDS.md` / `cards-games.md` / `cards-proposed.md`, the owner's lists in `STATUS.md`.

## State on 16 Nov 2026, 15:00 UTC (handoff 1)

**Live:** v0.9.97.147. CI numbers releases (card CI3; `CLAUDE.md` §9). Since 15 Nov live: Shorts way back + Google
search (.137), spectators + word lists (.138), stream button (.139), YouTube logo (.140), chat history (.141), quiz
first-click (.142), home Neon / 4 people / balloon + 587 quiz questions (.143), kept assets GR1 (.144–.146), game
windows ⛶/🪟 + fast open GW2/GP1 (.145), search click / ＋ Queue / TikTok tile SR2, phone-room lazy BUD2, no silent
reload GR1 (.146), quiz tournament + jokers (.147, check).

**Open PRs and owners:** #469 UI2 speed, #471 SH1 ring (lane A, merging); #465 EC1 (lane A, waits for Game Studio's
state-matrix drag / hover flake fix and the quiz-float measuring flake); #467 WG2 (GS2, after #466); #483 GMP b
(Game Studio). Lane A also has SH1 "start together" on `claude/sh1-start` (ready-based start, 1.5 s cap, every swipe).

**Lanes and next cards:**
- Lane A ("ScreenWithMe · 🔨 Developer"): UI2 → #471 → EC1 → SH1 rest (start together, TikTok small items, waiting
  banner slot) → SH3 → VC1 + VC3 → MSG1.
- B2 ("Sidelit · 🔨 Developer lane B2"): CI3 close (measure a real batch after #482, quiet vs busy) → SH2 feeds.
  YTQ1 waits for the owner (domain).
- Game Studio ("ScreenWithMe · 🎮 Game Studio"): flake fixes first (stage.ts drag survives lost pointer capture; hover
  and quiz-float checks wait for state) → GMP b (#483) → GT1 tutorials → lazy `games/stage.ts` (budget).
- Game Studio 2: #466 / #467, then stops (Quiz + Window Garden only).
- Closed today: A2 (TH3), Field Research (competitors), YouTube logo one-off. Design idle.

**Room JS budget:** 145 kB guard, ~138 kB after BUD2 / lab-texts. Never raise it; move code into lazy chunks.

**Owner, waiting on him:** TAG_TOKEN (tags v0.9.97.113 and .141 are missing; the catch-up needs it), VIMEO_TOKEN,
sidelit.app purchase after the trademark check, the security guide (2FA etc., PDF of 15 Nov), deleting branches
`tagtest-probe-do-not-use`, `claude/qa2-shots`, `claude/yt-logo-official` (sessions get 403 on deletes).

**Owner decisions still open:** competitor names on public "alternative" pages (asked twice, unanswered; recommend
yes after 1.0); order of no-extension sources (recommend YT Music playlists → SoundCloud → HLS → Twitch → Kick, after
0.9.98); the 8 research ideas CR1–CR8 in `cards-proposed.md`; stopping new features after the current cards and
moving to the 0.9.98 gate (recommended in the 16 Nov PDF); Fable use (recommended: an independent security + privacy
audit before the store; start it only when he says "Fable ile güvenlik denetimini başlat").

**Owner's decisions made 15–16 Nov (already in cards):** chat history kept (CH1); search click plays + ＋ Queue (SR2);
TikTok tile A; YouTube logo 20 px drawing (YTQ1); video-ended card centered (EC1); speed picker, phone speed stays in
the rail (UI2); home screens = sunset + balloon (TH3); tables ⛶ / 🪟, frames may cover YouTube when the user puts them
there (GW2, `CLAUDE.md` §7); voice + VPN = warning only, no TURN yet (VC3); CI numbering option 1; fewer CI jobs.

**The owner's board** (Artifact `NWZG7GLH4JzAnZt1rNgrJo`, "Sidelit Deneme Panosu") was last published at
0.9.97.136. First job of the next Planner: read it (`Artifact` read), add the hand tests from `STATUS.md` C since 27f
(27h SH1/GMP-a, 27i CH1/YTQ1, 27j ST1, 27k GW2, 27m–27p QZ2/WG2, 16d TH3 and the lanes' new ones), keep W's
structure (each TESTS item has `d`: phone | pc | ext; the DEVICES array; the group "🆕 Yeni (önce bunlar)"), republish.

**PDFs given to the owner** (scratchpad, not in the repo): the official-tasks and security guide (15 Nov) and the
general status (16 Nov). Their content lives in `STATUS.md` (to-dos, decisions) and this file.

**Scheduled for the Planner:** a daily context check (see `CLAUDE.md` §4 "Fresh sessions").
