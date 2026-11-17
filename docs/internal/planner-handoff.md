# Planner handoff

The Planner's working memory, so a fresh Planner session can continue without the old chat (owner, 16 Nov 2026:
"keep contexts small, everything needed must be in the repo"). The Planner rewrites this file at every handoff;
rules stay in `CLAUDE.md`, cards in `CARDS.md` / `cards-games.md` / `cards-proposed.md`, the owner's lists in `STATUS.md`.

## State on 17 Nov 2026, 12:45 Istanbul (handoff 5; previous Planner session_015Fyri4om23mvzYMosodsyX)

**Live:** v0.9.97.171. Deploys use the rolled Cloudflare token (works). v0.9.97.113 tag still missing on purpose.

**Sessions:** none building. Lane A and Game Studio finished their groups and were archived (handoffs in STATUS).
Open a fresh session per card group (CLAUDE.md §4); the owner said on 17 Nov: "open them, don't hold back on usage,
I'll reset; finish every job". The account's seven-day limit shows `allowed_warning` (resets 21 Nov ~06:00 Istanbul).

**Shipped 17 Nov (all on the owner's board as hand tests):** CR2 YouTube Music lists (.158), GW3 games never
fullscreen (.159), SRC2 "What are we watching?" big grid + FD1a feed drawer (.160), FD1b Shorts view tidy (.161),
GW4 layout never moves (.162), FC1 feed country + words + kind combined, GMP2 2–6 players (.163), RC1 session recap
(.165), UI4 polish: no feed pill on top, Drive-In default theme, picker centred + generic "Subscription services ·
Coming" row, Shorts ⋯ More works (.166), GW5 game windows scale in proportion (.167), LH2 / LH3 Last Heart on tablets
(.168/.169), XO1 tic-tac-toe on sideways tablet (.170), BG1 backgammon on upright tablet (.171).

**Owner decisions 17 Nov:** picks page (Artifact 5jN5FuuqcPpVW3nRMba65Z): all A (source picker grid, feed drawer,
recap night stage / host shows / ✨ on rail / own music). Default theme Drive-In. Game windows: what shows at first
size shows at every size, aspect ratio kept, else no resize. Brand logos: we keep our glyphs (YouTube needs approval,
TikTok written permission). Usage: don't hold back. He asked for visual option pages this time (picks page): when
asking design questions, give him visuals (a page or the SVGs), not only text.

**Waiting on the owner:**
- Five Frames' home at 1366: covers Together's "Join voice / Share". A = Together card one row shorter while a side
  game is open (lane A card, recommended); B = leave as is (current). Ask again with clickable choices.
- Netflix / Prime names in the picker: he asked to list them as "coming"; I applied the rule (no names, one generic
  row) and told him; he hasn't objected. If he insists, it's his call (store risk explained).
- Dailymotion Player ID (DM1, lane A), VIMEO_TOKEN, `sidelit.app` after the trademark check, the 0.9.98 gate.

**Ideas from sessions (put in STATUS ideas when convenient):** upright-tablet Shorts bottom bar has no ⋯ More; the
feed drawer cuts the room's text mid-word at its edge; live e2e quota.mjs flake (parallel shards share one address).

**The owner's board** (Artifact NWZG7GLH4JzAnZt1rNgrJo, version 78) now has a 📲 Tablette device section; every item is
one device. Source not in the repo: `Artifact` read (with and without `path`), keep from `<title>` to the last
`</script>`, edit TESTS (`d`: phone | tablet | pc | ext), republish to the same URL.

**Scheduled:** "Daily context check" trig_01UurtiJTp8MAPYRK1Pc791w (18:41 Istanbul) is bound to the old Planner
session: re-create it bound to yourself (same prompt, `get_trigger`) and delete the old one.

**Leftover merged branches** the sessions couldn't delete (squash merges): claude/shorts-rail-short-screens,
claude/rc1-session-recap, claude/ui4-polish, claude/lane-a-handoff-17nov, claude/gmp2-six-seats, claude/ng2-menu-wait,
claude/gw5-proportional, claude/xo1-board-tablet (unmerged, superseded). Harmless.

**Room JS budget:** 145 kB guard; room CSS budget full (38 kB): new room styles go into lazy stylesheets.
