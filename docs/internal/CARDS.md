# Job cards (the board)

Owner's rule (2 Nov 2026): one board for every session. The **Planner** writes and orders cards; the **Developer** takes
the top **Ready** card, moves it to **In progress**, and when it is live adds `Done: <PR link>` and moves it to
**Done**. **Security** and **Research** add their suggestions under **Proposed**; the Planner and the owner decide
whether they become Ready. Roles and rules: `CLAUDE.md` "Sessions as an office". The order follows `ROADMAP.md`
"Focus: now / next / frozen"; the owner's tick view is https://claude.ai/artifact/EtqKiBo8k5vgR422rq14K5.

Card format:

```
### <short title>
- Why: <one line>
- Done when: <what can be checked>
- Tests: <unit / e2e / harness / owner's hand test>
- Owner's pick: <link or "none needed">
```

## In progress

### Phone: next speed steps (0.9.93 "Now" 2)
- Why: the phone room should open and react fast on mid-range phones.
- Done when: voice / stream / TV code loads only when needed, phones get a lighter stylesheet, and an automatic phone
  speed test (4× slower CPU) runs against the built site with agreed budgets.
- Tests: the speed test itself in CI; `scripts/harness/phone/run.cjs` still passes.
- Owner's pick: none needed.

## Ready

### Owner's hand tests 0.9.92.3 – 0.9.93.5 (0.9.93 "Now" 3)
- Why: the 0.9.93 gate needs them.
- Done when: every box in `STATUS.md` "Owner's hand tests" for these versions is ticked or turned into a bug card.
- Tests: the owner's own (computer, phone, Shorts, first-time path, hotspot).
- Owner's pick: none needed.

## Proposed

(Security and Research add cards here.)

### Simplify the room: a "first view" until something plays (Research, 0.9.94 "Next" 1)
- Why: every competitor's first room view is player + add a video + invite (+ chat); ours shows the full dock, the
  Together card, three tabs, pins, film time, votes, recap. Details: `research/newcomers-help-shorts.md` §1.
- Done when: until the room's first video plays, a computer and a phone show only: add a video (search / link), invite,
  chat, join voice; games, pins, film time, votes, recap, saved room, speed sit under ⋯ (or appear once something
  plays). The owner picks the exact list on an option page (ROADMAP §1 item 3).
- Tests: harness check per layout (computer, phone) that only those controls are visible in an empty room and the rest
  appear after play; first-tips still find their anchors.
- Owner's pick: needed (which features stay visible; option page by the Planner).

### Help / FAQ page, ordered by what users ask first (Research, 0.9.94 "Next" 2)
- Why: competitors' help starts with "how to start", "who needs the extension", "it doesn't sync", "permissions";
  nobody explains permissions well. Details: `research/newcomers-help-shorts.md` §2–3.
- Done when: `/help` (EN first, TR variant) answers in this order: 3 steps; who needs the extension (only film pages;
  YouTube / TikTok / links and phones need nothing); what the extension can and cannot see; "not in sync / video not
  found" checklist (update, other video extensions / VPN, reload, 🎯 Pick video, 👁 Show the page, Sync everyone to me);
  connection problems → `/baglanti`; phones; voice, cameras and IP; ads inside YouTube come from YouTube; privacy link.
  In-product hints (`.net-hint`, video not found, blocked WebRTC) link to their answer. No film / service names.
- Tests: e2e / harness that `/help` loads in EN and TR and every in-product help link lands on an existing anchor; a
  non-Turkish reader check (owner).
- Owner's pick: none needed for the order; copy follows the slogan rules.

### "Send feedback" with opt-in diagnostics (Research, 0.9.94 "Next" 3)
- Why: every support thread starts with "which browser / version?"; Teleparty's e-mail-only support ends up on
  Trustpilot; Discord's form is one-way. Details: `research/newcomers-help-shorts.md` §2.
- Done when: "Send feedback" in the profile menu / ⋯ and on `/help` opens a small form (text, optional e-mail, an
  unticked "attach technical info": site + extension version, browser, transport ws/http, last `/baglanti` result; no
  room id, names or chat); a Worker endpoint stores it with a rate limit; the owner can read the list; the privacy
  policy names it.
- Tests: e2e (send, rate limit, nothing attached when unticked); unit for the payload builder.
- Owner's pick: where the owner reads them (stored list vs. e-mail), and whether GitHub issue templates come too.

### Extension permission explainer (Research)
- Why: scanners rate "all websites" access as critical; users and guides struggle with "read and change site data";
  trust is a top complaint (Teleparty, Rave). Details: `research/newcomers-help-shorts.md` §3.
- Done when: the extension page and the "Filme git" card say in two plain lines why the extension asks for every site,
  that it does nothing outside a room, and link to the FAQ answer; the same text is ready for the store's permission
  justifications (ROADMAP 0.9.97).
- Tests: harness / e2e that the text and link are present (EN + TR).
- Owner's pick: none needed.

### "Scroll Shorts together" page / home-page door (Research)
- Why: people search for "watch YouTube Shorts / TikTok together"; the only competitor with pages for it (TandemParty)
  needs a host computer + extension and only the host scrolls; ours works on phones, no install, anyone swipes.
  Details: `research/newcomers-help-shorts.md` §4.
- Done when: a home-page door (and a small English-first page) "Scroll Shorts together" creates a room that opens
  straight into the Shorts view with 🎲 Discover; no service is named beyond YouTube Shorts / TikTok.
- Tests: e2e / harness: the door creates a room in the Shorts view with a feed starting.
- Owner's pick: copy and whether it is a page or only a home door.

## Done

### Root cause of the live e2e first-attempt failures
- Done: https://github.com/alperenakturk/screen-with-me/pull/113, https://github.com/alperenakturk/screen-with-me/pull/114
  (deploys restarted test rooms mid-test; the deploy job now waits for the new version).
