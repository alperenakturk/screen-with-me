# Status: where we are (every session reads this first)

> Live: site and extension **0.9.97.121** (11 Nov 2026), tagged `v0.9.97.121`. What to work on: `ROADMAP.md` "Focus:
> now / next / frozen" and the Ready cards in `CARDS.md`. What each release changed: `CHANGELOG.md`. Everything
> finished that used to be in this file (old task queue, every per-release hand-test block, the Lab test round, the
> design sweep, the last full test pass, the short history) is verbatim in `docs/internal/archive/status-history.md`
> (card DOCS2). Keep this file short: a finished item leaves it in the PR that finishes it.

## Task queue (continue from the first unchecked item; keep it in sync with the session's task list)
One handoff per lane or role; each session updates only its own lines and deletes them when done.
- [ ] **Lane A, after 0.9.97.120 (stopped 10 Nov for the usage limit; continue from here).** Pre-existing items the
  LABFAB first look found (not fixed, need cards from the Planner): (1) phone sideways with a video: the first-time tip
  bubble covers "Watch fullscreen" (iPhone SE: fully); (2) iPhone SE sideways, empty room: "No video yet" and "Run a sync
  test" cut off (fit rule); (3) the Test Lab drawer on a phone: the "Font shown" value cut off at the right, "⌘ Ctrl+K"
  shown on touch screens, the drawer says "Test Lab" in Turkish while the glossary says "Test Panosu" (the ⋯ tile follows
  the drawer); (4) shots.cjs's phone room shot catches the intro mid-fade.
- [ ] Game Studio, next pass: Snack Bar's "Closed until the film plays" note covers the SNACK BAR sign (all sizes; on a
  phone the bottom-left "#1 · …" is also cut off). Found by 0.9.97.119's first-look reviewer; queued by the Planner.

## Owner's hand tests (things only the owner can try; ask Claude "what should I test?" and it reads this list)
One ordered list, most useful first. Tick here (or tell the Planner and it ticks); a ticked item leaves the list.
Every item's original wording, the older per-release blocks and the ones already ticked are in
`archive/status-history.md` "Owner's hand tests" (search the ID in brackets). New releases add their lines at the end
of "C. Recent releases" with an ID; the Planner folds them into the board Artifact.

**A. One sitting with a friend** (a friend in Chrome on another computer, or your phone as the second person) [BH10]
- [ ] 1. YouTube together: join by the invite link; play, pause, seek, speed and ← / → from both sides stay in step.
- [ ] 2. Fullscreen on YouTube: the rail comes at the right edge and goes; Enter opens the message box; the friend's
  messages come in on the right, never over YouTube's bar.
- [ ] 3. Voice + camera: the mic check, then Join; hear each other without echo; M mutes; the camera window drags and
  resizes; a reload keeps voice, mic and camera as they were.
- [ ] 4. Screen share: share a tab with sound, the friend watches and hears it, and it comes back after their reload.
- [ ] 5. Knock + host: "Ask before letting people in", let the friend in; 👑 Make host: the next knock goes to them.
- [ ] 6. Private message: only the friend sees it, marked 🔒; ✕ goes back to the room chat.
- [ ] 7. Phone by QR code: YouTube in sync; sideways ⛶ "Watch fullscreen"; 💬 beside the video; voice for a minute.
- [ ] 8. Phone, Shorts: swipe on the bar under the video or ▲ ▼; both move together; "waiting…" only in that bar.
- [ ] 9. The extension in Chrome on a legal demo film page (Video.js / Plyr): Go to the film, the room view, sync, the
  film's own ⛶ with our rail, 🎮 over the film, voice on the film page.

**B. Games with the same friend** (about 20 minutes) [BH13-G G1–G11]
- [ ] 10. Classics: dama to the end (sounds, the result card, Rematch); "🎲 Change game" → chess; a reload keeps the seat.
- [ ] 11. Sea Battle on a phone: tap aims, second tap fires; Wi-Fi off 10 s mid-game, the game goes on.
- [ ] 12. Quiz, then Draw & Guess, to the end: the podium, "Play again" / "Waiting for …", "Everyone got it!".
- [ ] 13. Last Heart to the end (How to play cards, the result card). Alone against Glowbeam in chess or dama: he
  answers in about a second.
- [ ] 14. Friend's phone data off 2 minutes during a Quiz: offline after ~1.5 min, the lobby 20 s later, back on returns.
- [ ] 15. While a film plays: Snack Bar earns (×10, Max, 📋 Upgrades, the usher), Window Garden grows, Five Frames in
  Turkish. Does buying in Snack Bar feel like a choice?

**C. Recent releases** (each one line; the release's own wording is in the archive under its version)
- [ ] 16. [W121, 0.9.97.121] Snack Bar on a laptop and a big screen: its window covers the chat column from the top to
  just above the message box and you can still type; drag, resize, double-click the top bar: back to the column.
- [ ] 17. [L1–L2, 0.9.97.120] Test Lab on a phone: no floating 🐞 upright (⋯ has the Test Lab tile); sideways a small
  🐞 bottom right, never over the video; none in fullscreen.
- [ ] 18. [Y1–Y7, 0.9.97.118] Plain 🎙 / 📷 before voice (red only when muted in voice); ➤ inside the chat box on a
  tablet; T cinema mode with its "✕ Leave cinema mode · T" button; the Matinee WhatsApp button; a readable greyed
  "Next ⏭"; Stub in the phone's empty room; the tablet's Queue / People tabs.
- [ ] 19. [M1–M4, 0.9.97.116] Matinee: calm paper, the video in a framed screen (fullscreen black), edge to edge on a
  phone, the film page unpainted; a table's "?" works on the first click right after entering.
- [ ] 20. [Q1–Q2, 0.9.97.114; P2–P4, 0.9.97.112; W1–W5, 0.9.97.111] Game windows: a side game keeps the video playing,
  a table pauses it for everyone with a note; side games open as a window on the right; the hall slides out of the
  window's left; hovering the corner moves nothing; drag, resize, reopen and reload keep each game's spot; no ⛶.
- [ ] 21. [LAB1, 0.9.97.109] `?debug=<your code>` on phone and computer: 🐞 stays after a reload; 🧪 "Test turu" rows run and undo.
- [ ] 22. [C1–C5, 0.9.97.107] A calmer room screen; ⚙️ categories without scrolling (phone chips too); About, Move,
  the mic check without the IP window; the join card's ⓘ.
- [ ] 23. [S1–S4, 0.9.97.105; N1–N4, 0.9.97.102] Stub in each theme's costume, Neon's new look, scene themes' sky behind
  the title, Matinee by day, the theme colours on the home page, the Sidelit font, the camera window's spot.
- [ ] 24. [F1–F2, 0.9.97.100; T1–T2, 0.9.97.98] The seven fonts (Turkish letters, kept after reload); picture themes'
  text readable; the search and chat boxes visible in each theme.
- [ ] 25. [L1–L3, 0.9.97.96] Phone sideways: a game fills the screen; a stream's small picture top right; a big
  monitor's bigger Snack Bar keeps its size.
- [ ] 26. [Q1–Q6, 0.9.97.93 and .95] On a hotspot or the backup connection, and with a background tab, an idle table and
  five tabs of one room for 10 minutes: no "reconnecting", nothing "too many connections".
- [ ] 27. [QW1–QW5, 0.9.97.124] Tablet upright and sideways, a video playing: Snack Bar never covers the video
  (sideways the right column down to the message box, upright the column beside the chat); the rail's 🎮 hall shows
  whole; a sideways phone's hall shows all six tables in a row. Laptop, chess with a video playing: "Video paused for
  the game" under the window's top bar, its buttons read "Game hall · Leave table · Close table · Back to video".
  Phone upright, a table: one top row (the small video with "‹" = back, the name, ?, 🎙, 🎮, ⋯ holding Leave / Close,
  Close asks first); sideways Leave / Close sit in that row. Cinema mode (T) then Snack Bar: cinema mode ends, the
  window sits off the video with a small gap to "Play now".

**D. Before the 1.0 store submission** (Claude reminds the owner right before it)
- [ ] 28. The extension in Edge, Brave and Opera: install unpacked, room + YouTube sync, voice, camera, tab share, the
  film page and voice there, fullscreen, sounds; Brave Shields + "Disable non-proxied UDP" shows the "blocks direct
  connections" note; Edge "Strict" tracking prevention; Opera's ad blocker, VPN and GX limits; write down each version.
- [ ] 29. The site without the extension in Firefox, Safari (Mac) and on an iPhone: room, YouTube, chat, a game, voice +
  camera, screen share (Firefox: picture only), fullscreen, "Add to Home Screen".
- [ ] 30. On your own phone: the 20 no-code release tests of `is-akislari/yayina-hazirlik.md` part C (in the owner's
  guide repo); Claude turns them into a Sidelit list when asked.
- [ ] 31. Real YouTube / TikTok (the cloud can't play them): ♾ → 🎲 Discover chips and ✨ More like this; the Shorts view's
  bar; `?measure=1` switch times with a friend (then decide on a hidden preload player); TikTok links play and loop;
  a fresh invite opens on one screen; the extension's install card turns into "Go to the film" by itself.

## Owner's to-dos (settings and accounts; tell the Planner when done)
- [ ] GitHub: the `production` environment holds the deploy secrets and `LAB_CODE`; private vulnerability reporting on;
  Dependabot alerts and security updates on (Settings → Code security). [0.9.97.49, .69, .3]
- [ ] The private feedback repository: Watch → Custom → Issues, so an `outage` issue reaches your phone. [0.9.97.92]
- [ ] Before the store: the Microsoft Partner Center account for Edge Add-ons (`web-store.md`).

## Pending decisions (owner's)
- **Domain** with the own address (`custom-domain.md`); the name is Sidelit (decided 3 Nov 2026), a trademark database
  check before the store submission (`name-research.md`).
- **Cloudflare Realtime card:** Cloudflare asks for a card even for the free quota and has no spending cap, so voice
  stays peer-to-peer. With a card: Worker secrets `REALTIME_APP_ID` + `REALTIME_APP_SECRET`, the code switches to SFU
  by itself (`ses-goruntu.md`), a budget brake is mandatory, and the same card could hide IP addresses in voice,
  camera and streams (ROADMAP Phase 2).
- **Chrome Web Store submission:** with 1.0. **Trademark filing, donations, legal entity:** `ROADMAP.md` §4.
- **After 1.0:** a Firefox extension (L), a TURN relay (Phase 2). Not planned: a Safari extension, Opera's own store.

## Ideas waiting for the owner's pick
Claude's and the sessions' ideas that came up mid-task (`CLAUDE.md` §4: never built without a card). The full list
with what became of each (built in 0.9.93.2, Test Lab, not planned …) is in `archive/status-history.md`.
- **Invite with the film time:** the invite window also offers "invite with the film time" when one is set (agreed for
  0.9.95, not built yet).
- **More players without the extension:** Vimeo + podcasts first (Planner's proposal; card under Proposed in `CARDS.md`).
- **A TV can keep the host role:** fix with the Google Cast TV version after 1.0 (ROADMAP Phase 2).

## Testing in the cloud (verified 28 Oct 2026)
Order matters: the server wants `apps/web/dist`, so build first.
```bash
npm ci && npm run typecheck && npm test           # 165 unit tests
npm run build                                     # extension + site (apps/web/dist)
(cd apps/server && npx wrangler dev --port 8787 > /tmp/wrangler.log 2>&1 &)   # local server
npm run e2e                                       # all pass except room.mjs when YouTube is blocked
npm run dev -w @swm/web &                         # site only (5173); `npm run dev` also starts the server and clashes on 8787
npm run build:extension:dev                       # extension that talks to the local server
ffmpeg -loglevel error -f lavfi -i testsrc2=size=640x360:rate=10:duration=660 \
  -c:v libvpx-vp9 -deadline realtime -cpu-used 8 -b:v 200k /tmp/film.webm      # 11 min video, ~25 s
FILM_VIDEO=/tmp/film.webm node scripts/harness/embed/film-server.mjs &
CHROME=/opt/pw-browsers/chromium node scripts/harness/embed/run.mjs apps/extension/dist http://localhost:5173 ws://localhost:8787 /tmp/shell-test
# Voice: two different fake microphones are required (same beep = removed by echo cancellation)
ffmpeg -loglevel error -f lavfi -i "sine=frequency=330:duration=20,tremolo=f=3:d=0.7,volume=4" -ac 1 -ar 48000 /tmp/a.wav  # volume=4: loud enough for the speech detector (film ducking in voice/shell.mjs)
ffmpeg -loglevel error -f lavfi -i "anoisesrc=color=pink:amplitude=0.4:duration=20,tremolo=f=2:d=0.8" -ac 1 -ar 48000 /tmp/b.wav
VOICE_A=/tmp/a.wav VOICE_B=/tmp/b.wav CHROME=/opt/pw-browsers/chromium node scripts/harness/voice/run.mjs http://localhost:5173
VOICE_A=/tmp/a.wav VOICE_B=/tmp/b.wav CHROME=/opt/pw-browsers/chromium node scripts/harness/voice/shell.mjs
NODE_PATH=$(npm root -g) node scripts/harness/phone/run.cjs   # phones; needs the film-server's video on :5300
bash scripts/harness/run-all.sh                   # every run.cjs harness in one go (needs a video on :5300; see its header)
# Pre-roll ad test: 12 s short video, FILM_AD=/tmp/ad.webm for film-server, FILM_AD=1 for run.mjs
```
- Chromium: `/opt/pw-browsers/chromium` (as root `cdp.mjs` adds `--no-sandbox`).
- Network: in the default environment `www.youtube.com` and `upload.wikimedia.org` are blocked (proxy 403), so
  `room.mjs` waits for "title" forever (not a code bug) and the film video is generated with ffmpeg. To allow them:
  environment settings → Network access → Allowed domains.
- Voice tests pass without STUN (two Chromes on one machine connect with local candidates).
- Screenshots go to `/tmp/...png` (voice harness writes some into `scripts/harness/voice/`); never commit them.
- Careful: `pkill -f vite`-style commands kill your own shell too (the command line matches); find processes with
  `ps` + `awk`.
- When a new file is added to a package's `exports` (`@swm/shared/...`), restart Vite.
- Security headers (CSP…) come from `apps/web/public/_headers` and are only sent by the Worker (`wrangler dev` on
  8787 / live), **not by Vite on 5173**. To test the CSP, use 8787, or put a small 5173 → 8787 proxy in front so the
  dev extension loads the built site (the embed harness then misses 3 dev-only checks, see the 0.9.86 test pass).
- The server allows WebSockets only from its own origin and `localhost` (`index.ts` `guardSocket`) and at most 60 new
  connections per IP and minute (`CONNECT_LIMIT`, also simulated by `wrangler dev`): a test that opens many
  connections in a burst gets `429`.
- GitHub: no `gh`; use the GitHub MCP tools for PRs; `git push` works.
- Deploys from the cloud go through GitHub Actions (no `wrangler login`); keys are in repo Secrets.
