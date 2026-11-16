# Planner handoff

The Planner's working memory, so a fresh Planner session can continue without the old chat (owner, 16 Nov 2026:
"keep contexts small, everything needed must be in the repo"). The Planner rewrites this file at every handoff;
rules stay in `CLAUDE.md`, cards in `CARDS.md` / `cards-games.md` / `cards-proposed.md`, the owner's lists in `STATUS.md`.

## State on 17 Nov 2026, 02:20 Istanbul (handoff 4; previous Planner session_015Fyri4tNaodxWjvbDYpkqT)

**Live:** v0.9.97.157 (MSG1). Tags complete except v0.9.97.113 (left missing on purpose: GitHub's release page can't
reach the old commit; the owner's draft was deleted). TAG_TOKEN works (back-filled .141).

**Sessions:**
- Lane A "ScreenWithMe · 🔨 Developer" (session_015Fyri2uT2Xhd9RrdYztMEC): CR2 #512 (YouTube Music lists) merging; it
  is the FIRST deploy with the rolled Cloudflare token: check its deploy + live e2e + tag. Then DM1 (needs the owner's
  Dailymotion Player ID). Its context is large: open a fresh lane A when it hands off.
- Game Studio "ScreenWithMe · 🎮 Game Studio" (session_015Fyri6VqZiy5iJ9AUoRvzv): card GW3 (only videos go fullscreen).

**Owner decisions on 17 Nov (all in the repo):** secrets all in the `production` environment, repository secrets only
TAG_TOKEN, every secret in KeePass (CLAUDE.md §5 KeePass fields rule); Dailymotion yes (DM1); Vimeo search yes
(VIMEO_TOKEN, he adds it later); SoundCloud later; film page intro decided right before the store; TV plan (STATUS);
**only videos go fullscreen** (CLAUDE.md §7, GW3: when he says "tam ekran" for a game he means the video's place; warn
him if a request breaks it); no DRM tricks like screen-sharing paid services (already a rule).

**Waiting on the owner (board "Kararların" tab):** Dailymotion Player ID, VIMEO_TOKEN, the source picker pick: design
`docs/internal/design/source-picker.md` (#516), options A grid (recommended) / B shelves / C bigger ⠿ menu; ask him
again with clickable choices, then write the lane A card replacing SRC1's popover (Test Lab `sources.picker`).
Passed hand test: VC1's YouTube volume drag (tell lane A to move it to the archive). Also still open from before:
`sidelit.app` after the trademark check, security guide (2FA), competitor names on alternative pages, CR1–CR8, the
0.9.98 gate, Fable audit (only on his words).

**The owner's board** (Artifact `NWZG7GLH4JzAnZt1rNgrJo`) is current (version 67). Its source is not in the repo:
`Artifact` read with `path: "index.html"`, keep from `<title>` to the last `</script>`, add TESTS items (`d` phone |
pc | ext, group "🆕 Yeni (önce bunlar)"), republish to the same URL.

**Scheduled:** "Daily context check" (trig_01TajuA38ByAnD6Q72fjgSiR, 18:41 Istanbul) fires into the session it was
made in; the new Planner re-creates it bound to itself and deletes the old one.

**Room JS budget:** 145 kB guard, ~125 kB after the lazy games window (#493). Never raise it; move code into lazy chunks.

**Owner's decisions made 15–16 Nov (already in cards):** chat history kept (CH1); search click plays + ＋ Queue (SR2);
TikTok tile A; YouTube logo 20 px drawing (YTQ1); video-ended card centered (EC1); speed picker, phone speed stays in
the rail (UI2); home screens = sunset + balloon (TH3); tables ⛶ / 🪟, frames may cover YouTube when the user puts them
there (GW2, `CLAUDE.md` §7); voice + VPN = warning only, no TURN yet (VC3); CI numbering option 1; fewer CI jobs.

**PDFs given to the owner** (scratchpad, not in the repo): the official-tasks and security guide (15 Nov) and the
general status (16 Nov). Their content lives in `STATUS.md` (to-dos, decisions) and this file.
