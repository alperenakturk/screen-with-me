# Proposed cards from the competitor field research (15 Nov 2026)

Research's suggestions for the Planner and the owner (`CLAUDE.md` §4: Research writes "Proposed" cards; the Planner
decides whether each moves to `CARDS.md` Ready, and when). Evidence and sources:
`research/competitors/overview.md` §4 and the profile named on each card. All are new features: under `ROADMAP.md`
"Focus" they wait until after the 0.9.98 gate unless the Planner says otherwise; CR1's texts fit the 1.0 launch content.
None of them adds an account, ads, a paywall, re-broadcasting or any DRM workaround.

Card format as in `CARDS.md`.

### CR1. "Do I need the extension?" table and tested players (Research, 15 Nov 2026; lane A + Planner for copy)
- Why: the first question of every newcomer; SyncUp answers it with one table, Teleparty with a service list
  (`research/competitors/syncup.md`, `teleparty.md`). We have no such page, and we say nothing about what does not work.
- Done when: help and `extension.html` show one table (source → works on the site / needs the extension / on a phone)
  in EN + TR, generated from one list in code so it can't drift from `media.ts`; a "Tested players" block names player
  stacks (not film sites) with a last-checked date; the store text (`web-store.md`) gets the same short version; a
  Test Lab hook opens help at the table.
- Tests: the help harness checks both languages have the table with the same rows; `check-texts.mjs`.
- Owner's pick: the wording (public text); no service name unless it really works (`CLAUDE.md` §6).

### CR2. YouTube Music playlists and albums into the queue (Research, 15 Nov 2026; lane B)
- Why: `music.youtube.com/watch?v=` already plays (`media.ts` accepts the host), but playlist / album links don't;
  SyncUp lists YouTube Music as a no-extension source (`research/competitors/no-extension-sources.md`).
- Done when: a `music.youtube.com/playlist?list=` (and `browse/` album link where it resolves to a playlist id) adds its
  videos to the queue through the Data API calls we already make (quota counted in the usage book); an
  embedding-disabled track shows the existing "can't play here" state and is skipped; help says YouTube Music links
  work; a Test Lab scenario adds a fixture playlist.
- Tests: unit (link parsing in `media.ts`), e2e with a mocked playlist answer, the owner's real check.
- Owner's pick: none needed (folds into "More players without the extension").

### CR3. More sources without the extension, first wave: SoundCloud, HLS / audio files, Twitch (Research, 15 Nov 2026; lane B)
- Why: SyncUp and Watch2Gether play these without an extension; we don't. Research's order (`no-extension-sources.md`,
  correcting `more-players.md`): SoundCloud widget (no key, 1× lock) → HLS `.m3u8` + audio files in the `html5` kind
  (lazy `hls.js`, Apache-2.0, a third-party notice line) → Twitch live / VODs / clips via the official embed (works on
  `workers.dev` now: `parent` = `location.hostname`; 400 × 300 minimum; seeks only while playing; ads per viewer) →
  a "live channel" kind (Twitch live, Kick live iframe, no sync needed).
- Done when: each source is a `PlayerAdapter` (or the `html5` kind) with link parsing, `cleanMedia` validation (optional
  new kind, no protocol bump), CSP hosts in `_headers` (`w.soundcloud.com`, `player.twitch.tv`, `embed.twitch.tv`,
  `player.kick.com` only for the live kind), a privacy-policy line in both languages, and a Test Lab hook / fake-player
  harness like `tiktok/run.cjs`; phones checked at 390 px (Twitch's minimum height).
- Tests: unit (parsing), a fake-player harness per kind, e2e for the new kinds, the owner's real check (computer +
  phone).
- Owner's pick: needed: which sources and when (this replaces the ranking in the "More players without the
  extension" card); never extraction (yt-dlp), page proxies or a cloud browser.

### CR4. "Make a room with this video" link and a better invite preview (Research, 15 Nov 2026; lane A)
- Why: one click from a Discord / community post to a ready room (W2G, GroupTube); Discord's own Watch Together is
  YouTube-only with ads and, since Mar 2026, age checks (`research/competitors/others.md`).
- Done when: `/new?v=<url>` creates a one-time room with that video queued (same validation as a pasted link,
  rate-limited per IP hash on the server, no new data stored); the invite link's preview (title, image) reads well in
  Discord and WhatsApp in both languages; a Test Lab hook opens `/new?v=` with a fixture URL.
- Tests: e2e (room created, video queued, limit enforced), a preview check of the meta tags.
- Owner's pick: none needed (the invite slogan stays the owner's).

### CR5. Ad-break hold on the film page (Research, 15 Nov 2026; lane B)
- Why: most of Teleparty's recent release notes are sync fixes for ad-supported plans (`research/competitors/teleparty.md`);
  today, after an ad, the person just jumps to the room's time (reference "Resilience to ads"), and nobody sees why
  they were gone.
- Done when: when a person's extension sees an ad (the existing short-video rule), the room shows "Sam is in an ad"
  beside their name; a room setting (default off) lets the room wait at the end of that person's ad and start together
  with the existing "3-2-1"; never skips or hides an ad (`CLAUDE.md` §7); a Test Lab scenario fakes an ad.
- Tests: an embed-harness scenario (film → 30 s "ad" video → film), a `sync-engine.test.ts` scenario if the engine
  changes, e2e for the new presence state.
- Owner's pick: none needed (default off).

### CR6. Subtitles stay free on a sideways phone (Research, 15 Nov 2026; lane A)
- Why: Kosmi users complain the chat covers subtitles in landscape (`research/competitors/kosmi.md`).
- Done when: on a sideways phone, chat bubbles, floating reactions and the rail never cover the bottom band of the video
  where subtitles sit (a measured band, not a guess); a Test Lab hook draws that band so the owner can see it.
- Tests: a phone harness check at sideways sizes (`html.sideways`), `scripts/shots.cjs` first look.
- Owner's pick: none needed.

### CR7. Local file together, nothing uploaded (Research, 15 Nov 2026; lane A; after 1.0)
- Why: WatchParty.me, Kosmi and SyncUp let people watch a file from their own computer (`research/competitors/others.md`,
  `syncup.md`); our rule is never to re-broadcast, so each person opens their own copy.
- Done when: "Play a file from this device" lets each person pick a file; the `html5` kind plays a `blob:` URL; the room
  shares only the file's name, size and duration (no upload) and warns when someone's copy differs; works on phones;
  `privacy.html` says nothing is uploaded; a Test Lab hook loads a fixture file.
- Tests: e2e with two fake people and the same fixture, the owner's real check.
- Owner's pick: needed (after 1.0, or earlier).

### CR8. Safety kit before any store app or public room (Research, 15 Nov 2026; lane A; after 1.0)
- Why: Rave lost the App Store over moderation (`research/competitors/rave.md`, `research/competitors-how.md` §2); we have kick
  and ban, but no report, block or chat filter.
- Done when: "Report this person" (sends the existing feedback with the room id and recent messages, capped, no `cid`),
  "Block" (hide their chat and reactions for me), an optional word filter for chat, and the abuse contact
  (`terms.html#abuse`) one tap away in the room; privacy texts updated in both languages; Test Lab hooks for each.
- Tests: e2e (report reaches the feedback store, block hides messages for one person only), unit for the filter.
- Owner's pick: needed (before `apps.md` work or any public rooms).
