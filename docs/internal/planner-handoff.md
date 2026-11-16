# Planner handoff

The Planner's working memory, so a fresh Planner session can continue without the old chat (owner, 16 Nov 2026:
"keep contexts small, everything needed must be in the repo"). The Planner rewrites this file at every handoff;
rules stay in `CLAUDE.md`, cards in `CARDS.md` / `cards-games.md` / `cards-proposed.md`, the owner's lists in `STATUS.md`.

## State on 16 Nov 2026, 19:30 UTC (handoff 2; Planner session_015Fyri4tNaodxWjvbDYpkqT)

**Live:** v0.9.97.154. Since .147: Quiz tournament + jokers (.148), Window Garden WG2 (.149), Shorts start together
SH1-2 (.150), feeds SH2 (.151), speaking ring SH1-3, EC1 "Video ended" dialog, GMP b (Duel + Sea Battle 2–6), lazy games
window (room JS 139 → 125 kB), GT1 "❓ How to play", TikTok share links in a pasted list SH1-4 (.153), docs (.154).
Live e2e was red twice (runs 43917089949, 43921749258): Cloudflare-side object restarts (canary rooms dropped at the
same minutes), not code; compare canary drop times with the deploy before blaming a PR.

**Sessions:** only lane A runs ("ScreenWithMe · 🔨 Developer", session_015Fyri6k6ZeiEPuFPmbY4rc): archive SH1 / EC1
cards → SH3 → VC1 + VC3 → MSG1. Archived today: old lane A, Game Studio (×2), GS2, B2 (×3). No Game Studio, B2 or
Design open: open one only when its lane has work (B2: YTQ1 after `sidelit.app`; games: QZ2 Quiz cards for GT1, the
games layout ideas if the owner picks them). Sessions now reach 300k+ in 1–3 hours: give each one card group.

**Owner, waiting on him:** TAG_TOKEN (steps on the board's Decisions tab), VIMEO_TOKEN, `sidelit.app` after the
trademark check, the security guide (15 Nov PDF), deleting branches `tagtest-probe-do-not-use`, `claude/qa2-shots`,
`claude/yt-logo-official`. Hand test SH1 start: he says whether the ≤1.5 s pause before a swiped Short feels slow (if
slow: a fixed ~0.8 s hold for manual swipes, lane A).

**Owner decisions still open:** competitor names on "alternative" pages (recommend yes after 1.0); order of
no-extension sources (YT Music → SoundCloud → HLS → Twitch → Kick, after 0.9.98); CR1–CR8 in `cards-proposed.md`;
stopping new features for the 0.9.98 gate; Fable security + privacy audit (only on "Fable ile güvenlik denetimini
başlat").

**The owner's board** (Artifact `NWZG7GLH4JzAnZt1rNgrJo`) is current at 0.9.97.153 (version 58). Its source is not in
the repo: `Artifact` read with `path: "index.html"`, strip the document skeleton (keep from `<title>` to the last
`</script>`), add TESTS items (`d` phone | pc | ext, group "🆕 Yeni (önce bunlar)"), republish to the same URL. Two
hand tests are both numbered 27p in STATUS (WG2, GMP-b): renumber one when STATUS C is next edited.

**Scheduled:** "Daily context check" (trig_01TajuA38ByAnD6Q72fjgSiR, 18:41 Europe/Istanbul) fires into the Planner.
The old Planner (session_015Fyri4VJ2JA1XRi7Y6v5Zy) is archived once the owner writes to the new one.

**Room JS budget:** 145 kB guard, ~125 kB after the lazy games window (#493). Never raise it; move code into lazy chunks.

**Owner's decisions made 15–16 Nov (already in cards):** chat history kept (CH1); search click plays + ＋ Queue (SR2);
TikTok tile A; YouTube logo 20 px drawing (YTQ1); video-ended card centered (EC1); speed picker, phone speed stays in
the rail (UI2); home screens = sunset + balloon (TH3); tables ⛶ / 🪟, frames may cover YouTube when the user puts them
there (GW2, `CLAUDE.md` §7); voice + VPN = warning only, no TURN yet (VC3); CI numbering option 1; fewer CI jobs.

**PDFs given to the owner** (scratchpad, not in the repo): the official-tasks and security guide (15 Nov) and the
general status (16 Nov). Their content lives in `STATUS.md` (to-dos, decisions) and this file.
