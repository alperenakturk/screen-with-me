# Status: where we are (every session reads this first)

> Last update: 28 Oct 2026. Site and extension **0.9.90**. The owner moved to a **new Claude
> account** on 28 Oct 2026: the old account's sessions and memory are gone, everything needed is here, in
> `ROADMAP.md` and in `CLAUDE.md`. The owner mostly works from **cloud sessions** (claude.ai/code). Update this file
> (keep it short) whenever a task is finished.

## Working with the owner (summary; details in CLAUDE.md)
- Talk in Turkish, simply; Alperen is a student learning JS/HTML/CSS and often follows from the phone.
- Everything on GitHub in English (commits, branches, PRs, docs, code comments).
- Make technical decisions yourself and say why; ask about money/accounts/publishing/legal/naming.
- Every task: code → tests (unit, e2e, real Chrome when needed) → PR → merge when CI is green → check the deploy run in
  Actions → short Turkish report (done / tried / waiting for / next). If the extension changed, bump
  `apps/extension/package.json` (same number as the site footer).
- Likes running big, separate topics (research, design alternatives) in separate sessions; summarize their results.

## Current direction
**The 1.0 plan is in `ROADMAP.md`** (owner's plan, 28 Oct 2026): polish existing features, zero known bugs,
security hardening, legal/name/policies, consistency (English-first repo), operations, then 1.0 in the Chrome Web
Store together with the domain and the final name. New feature areas wait until then unless the owner asks.

## Task queue (continue from the first unchecked item; keep it in sync with the session's task list)
Owner's feedback from friends' real use (28 Oct 2026). Details in `ROADMAP.md` §1 "Feedback round 1".
- [x] Record the plan, conventions and this queue (CLAUDE.md, ROADMAP, STATUS).
- [x] Separate session: name brainstorm + inspiration page (results → `docs/internal/name-ideas.md`).
- [x] Separate session: security review of custom emojis across rooms and WebRTC IP exposure (results →
  `docs/internal/security-review-1.md`).
- [x] **0.9.83** quick fixes: extension popup button opens a new tab (doesn't replace our room tab); "your extension
  is outdated" shown to an up-to-date extension (friend had to reinstall); film ducking off by default + only on real
  speech (clicks must not trigger it); film-page cover flash.
- [x] **0.9.84** voice/camera bugs (+ friends' "random mic on": reconnect turned a muted mic back on): tiles drop and come back (maybe when a game is opened/closed); the same person
  appears with 2–3 camera tiles (one frozen); own camera visible in a slot even when hidden; small audio glitches.
- [x] **0.9.85** Meet/Discord-style controls: mic/camera toggles under the camera tiles while watching; per-person
  mute and volume; host can kick from the tile; pin a camera; hide my own camera; resize tiles horizontally and
  vertically.
- [x] **0.9.86** security review 1 fixes (separate session, owner approved): custom emojis stay in their room +
  optional local "My collection"; IP notice before peer-to-peer voice / streams; CSP and security headers, frame
  guard, `Origin` check, per-IP limits, GIF metadata stripped (details: `security-review-1.md` "Outcome").
- [x] **0.9.87** settings: ⚙️ button to the right of the profile picture; remove the ⚙️ next to the tabs and the
  settings inside the profile menu; scheduled start redesigned as "Film time" (quick picks, countdown card, invite
  with the time). Started in another session (WIP commit on `claude/focused-franklin-ye6g2g`), finished here (the WIP
  crashed the room: `$('#settings-open')` looked inside `app`). Also from round 3: avatar changes only on "Tamam";
  empty "Bu odada" sticker tab no longer opens the file picker; "Neden?" / hint bubbles close on click, Esc, scroll.
- [x] **0.9.88** feedback round 2–3 (owner, 28 Oct 2026): **rooms are independent** (name and avatar per room: changing
  them in one room must never change another room; only things the owner names, like the sticker collection, are
  shared); send images in chat; links in chat are clickable, ask "you
  are leaving this page" first and open in a new tab (our room tab stays); voice join / leave appear in the room
  activity like pause / play; clicking myself in the "Together" card while in voice said "you are not in voice" (bug)
  → show my own controls instead.
- [x] **0.9.89** extension toolbar icon: outside a room's film tab the popup only offered "Open ScreenWithMe" (home page
  in a new tab) even with a room open; now "🏠 Odama dön" switches to the open room tab (home page as second button).
  Test: `scripts/harness/popup/run.cjs`.
- [x] **0.9.90** film page (owner, 29 Oct 2026): 🏠 / 👁 / 🎯 in the middle of the top bar; scrolling the room view
  made the film video slide out of its frame → the room view now fits the window and doesn't scroll.
- [ ] **Sound effects** (owner, 29 Oct 2026; branch `claude/sound-effects`): proposal page with three generated
  sound families (A warm pad, B glass marimba, C soft clicks) + event list published
  (https://claude.ai/artifact/SPrx6qse6qiKJGJCynqdfy). **Waits for the owner's choice**, then: `sounds.ts` (one shared
  AudioContext, registry, rate limit), Settings → Ekranım switch + volume, hooks in voice/room/games, tests, docs,
  version 0.9.90.x, PR, merge, deploy check.
- [ ] **Fullscreen design** (owner, 29 Oct 2026): our controls over the film's / YouTube's own player look
  unprofessional; options (hide theirs completely vs. our controls docked to the side) + messages flowing under the
  message box. Proposal page first, owner chooses.
- [ ] **0.9.91** YouTube player on the site: controls stay visible long after the mouse leaves; YouTube's own volume
  control doesn't work. YouTube is reachable from the sandbox again (29 Oct 2026).
- [ ] **0.9.92** YouTube search inside the app. **Waits for the owner:** YouTube Data API v3 key in GitHub Secrets
  `YOUTUBE_API_KEY` (steps and plan in CLAUDE.md "Next up"; guide given to the owner on 28 Oct 2026).
- [ ] Before 1.0: try Shorts / Reels scrolling together end to end (ROADMAP §1).

## Last full test pass (28 Oct 2026, 0.9.82, cloud)
- Typecheck ✅, unit 157/157 ✅, e2e 172 checks ✅ (only `room.mjs` hangs because YouTube is blocked here; known).
- Voice on the site 24/24 ✅ and voice on the film page 28/28 ✅, **both only with `VOICE_A`/`VOICE_B`**: without them
  both Chromes use the same fake beep and the echo canceller removes it, so the "really hears" checks fail (not a
  code bug; the harness should default to two different sounds).
- **0.9.87:** unit 165/165, e2e 181 (+ `room.mjs` blocked by the YouTube proxy here), embed harness 93/93, voice 38,
  plus a browser check of every change (⚙️ spot, Film time chips/card/banner/clear, empty sticker tab, hint bubble
  closing, avatar Esc vs. "Tamam").
- **0.9.85:** voice harness 38/38 (person menu, pin, mute for me, controls under cameras, vertical resize).
  Careful: after `git stash`/checkout while `npm run dev` runs, Vite may keep serving an old module — restart it.
- **0.9.84:** voice harness 29/29 (new: game open/close keeps cameras, reconnect keeps one tile, muted mic stays
  muted), film-page voice 28/28, e2e 174 (new `prev` checks in handover.mjs).
- **0.9.86** (re-run after merging 0.9.85: unit 165/165, e2e 181 + `room.mjs` blocked by the YouTube proxy, voice 39
  checks, streams, film-page voice, embed harness all green; first run below): unit 165/165, e2e 192 (YouTube reachable here, `room.mjs` passed too), embed harness 92/92 (Vite),
  voice 29/29 + streams 17/17 + film-page voice 28/28, plus a browser check of the security fixes (24 checks:
  no CSP violation on any page incl. YouTube, emoji migration/collection/add dialog, voice notice, frame guard).
  Embed harness against the **production build** (CSP on) 89/92: the 3 misses use dev-only hooks
  (`import('/src/themes.ts')`, `window.__swm`), not product bugs.
- **0.9.83:** embed harness 92/92 (flash fixed with `#swm-cover`), voice 24/24 and 28/28, unit 162/162.
- Extension (embed harness, 0.9.82) 91/92: **"no flash when going from the site to the film page" failed in both runs**: the
  film page is visible for one frame (~60 ms) before the cover. Cause: on the first transition from the site the film
  origin has no `sessionStorage` `swm-cover`, so the cover waits for the async `storage.session` read
  (`content.ts` `checkSessions`) and the first paint wins the race. Timing-dependent. Fix planned for 0.9.83.

Side sessions started 28 Oct 2026 (results come as PRs from their branches; integrate them here):
- Name ideas: session `session_015Fyri2xNPa9YWMwBanhQXV`, branch `claude/name-ideas`.
- Security review 1: session `session_015Fyri6wwCuwDm697YF5dv6`, branch `claude/security-review-1` → shipped as
  0.9.86.

## Pending decisions (owner's)
- **Product name** (keep "ScreenWithMe" or rename): research in `name-research.md` (no registered mark found in web
  searches; descriptive name, crowded category; best alternatives Sofaloop / Yanyana / Seyirdaş). The owner should
  run the 30-minute database check described there. Decide before the store submission and the domain.
- **Domain:** e.g. `screenwithme.app` (~14 $/year), bought together with the final name.
- **Cloudflare Realtime card:** Cloudflare asks for a card even for the free quota and has no spending cap → voice
  stays peer-to-peer. If a card is added: Worker secrets `REALTIME_APP_ID` + `REALTIME_APP_SECRET`, the code switches
  to SFU by itself (see `ses-goruntu.md`); a budget brake is mandatory then. The same card would also allow hiding
  IP addresses in voice, camera and streams (TURN relay or SFU for all three; owner: later, ROADMAP Phase 2).
- **Chrome Web Store submission:** with 1.0.
- **Trademark filing, donations, legal entity:** see `ROADMAP.md` §4.

## History (short)
- **0.9.60:** manual video pick ("🎯 Video seç"), ads step 2 (ad tabs closed with "Geri aç", "Filme geri dön" after ad
  redirects, "📺 reklamda" doesn't make the room wait), voice chat on the film page (offscreen document, ducking).
- **0.9.61:** site audit (11 bugs, phone layout, first load ~55 → ~24 KB).
- **0.9.62–0.9.75:** PlayWithMe games (XOX, Connect Four, Draw & Guess, Quiz); since 0.9.75 they live inside the room
  (no separate game pages).
- **0.9.63 / 0.9.65:** video chat on the site / on the film page (local WebRTC bridge); limits always visible.
- **0.9.64 / 0.9.66:** screen share and camera streaming (peer-to-peer, one stream, ≤4 viewers), stage 2 (quality
  modes, host can stop, `liveHostOnly`).
- **0.9.67:** Mehtaplı Geceler sultan mascot. **0.9.68:** push-to-talk (V) + "Ali paused" notice.
- **0.9.70:** PWA. **0.9.71:** hide side panel. **0.9.76:** room layout "Cinema Rail" (design A).
- **0.9.77:** home page "Showcase" + theme picker. **0.9.78:** extension version = site version; old pages reload.
- **0.9.79:** networks that can't connect: retry, warning, `/baglanti` diagnostics (the owner's phone-hotspot test
  result is still pending).
- **0.9.80:** room UI pass (chat bubbles, settings dialog, reaction tray, clean top bar).
- **0.9.81:** free camera windows (drag, resize, inside the video in fullscreen; also on the film page).
- **0.9.87–0.9.89:** ⚙️ next to the profile picture, Film time, rooms independent (name/avatar per room), images
  and links in chat, voice join/leave in activity, popup goes back to an open room tab.
- **0.9.90:** film-page tools in the middle of the top bar; the room view fits the window (no scrolling).
- **0.9.86:** security review 1: room-only custom emojis + local collection, IP notice, CSP/headers, frame guard,
  `Origin` check, per-IP limits, GIF metadata stripped.
- **0.9.85:** Meet/Discord-style voice: 🎙/📷 under the cameras, person menu (volume / mute for me, show camera
  big, hide myself, host: remove), camera window resizes both ways, M toggles the mic.
- **0.9.84:** reconnect drops the old connection at once (`hello.prev`), keeps mic/camera state, lost voice
  connections are rebuilt, one camera tile per person, people counted once.
- **0.9.83:** popup opens the room in a new tab, "reload the page" instead of a false "outdated extension",
  film ducking off by default and only on real speech, film-page cover flash fixed.
- **0.9.82:** copy pass: all site/extension/privacy/README/store texts rewritten (glossary in CLAUDE.md), the owner's
  slogans, privacy policy aligned with the code.
- Design canvases (claude.ai artifacts, old account — may not be accessible any more): room alternatives
  https://claude.ai/artifact/Beiq1ueBUUHjUkRbL5LTHL, room UI options https://claude.ai/artifact/3v3MennhEPMFedeW9bNDQQ.

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
ffmpeg -loglevel error -f lavfi -i "sine=frequency=330:duration=20,tremolo=f=3:d=0.7" -ac 1 -ar 48000 /tmp/a.wav
ffmpeg -loglevel error -f lavfi -i "anoisesrc=color=pink:amplitude=0.4:duration=20,tremolo=f=2:d=0.8" -ac 1 -ar 48000 /tmp/b.wav
VOICE_A=/tmp/a.wav VOICE_B=/tmp/b.wav CHROME=/opt/pw-browsers/chromium node scripts/harness/voice/run.mjs http://localhost:5173
VOICE_A=/tmp/a.wav VOICE_B=/tmp/b.wav CHROME=/opt/pw-browsers/chromium node scripts/harness/voice/shell.mjs
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
