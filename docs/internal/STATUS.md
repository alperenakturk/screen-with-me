# Status: where we are (every session reads this first)

> Last update: 28 Oct 2026. Site and extension **0.9.82** (on `main`, live). The owner moved to a **new Claude
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

**Next (0.9.83 →):**
1. Fix the film-page cover flash (see test results below).
2. Owner's feature walkthrough → polish list in `ROADMAP.md` §1.
3. English migration of `docs/internal/` (one doc at a time) and the consistency items.
4. GitHub Issues as the bug list (labels + `1.0` milestone), `CHANGELOG.md`.

## Last full test pass (28 Oct 2026, 0.9.82, cloud)
- Typecheck ✅, unit 157/157 ✅, e2e 172 checks ✅ (only `room.mjs` hangs because YouTube is blocked here; known).
- Voice on the site 24/24 ✅ and voice on the film page 28/28 ✅, **both only with `VOICE_A`/`VOICE_B`**: without them
  both Chromes use the same fake beep and the echo canceller removes it, so the "really hears" checks fail (not a
  code bug; the harness should default to two different sounds).
- Extension (embed harness) 91/92: **"no flash when going from the site to the film page" failed in both runs**: the
  film page is visible for one frame (~60 ms) before the cover. Cause: on the first transition from the site the film
  origin has no `sessionStorage` `swm-cover`, so the cover waits for the async `storage.session` read
  (`content.ts` `checkSessions`) and the first paint wins the race. Timing-dependent. Fix planned for 0.9.83.

## Pending decisions (owner's)
- **Product name** (keep "ScreenWithMe" or rename): research in `name-research.md` (no registered mark found in web
  searches; descriptive name, crowded category; best alternatives Sofaloop / Yanyana / Seyirdaş). The owner should
  run the 30-minute database check described there. Decide before the store submission and the domain.
- **Domain:** e.g. `screenwithme.app` (~14 $/year), bought together with the final name.
- **Cloudflare Realtime card:** Cloudflare asks for a card even for the free quota and has no spending cap → voice
  stays peer-to-peer. If a card is added: Worker secrets `REALTIME_APP_ID` + `REALTIME_APP_SECRET`, the code switches
  to SFU by itself (see `ses-goruntu.md`); a budget brake is mandatory then.
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
- **0.9.82:** copy pass: all site/extension/privacy/README/store texts rewritten (glossary in CLAUDE.md), the owner's
  slogans, privacy policy aligned with the code.
- Design canvases (claude.ai artifacts, old account — may not be accessible any more): room alternatives
  https://claude.ai/artifact/Beiq1ueBUUHjUkRbL5LTHL, room UI options https://claude.ai/artifact/3v3MennhEPMFedeW9bNDQQ.

## Testing in the cloud (verified 28 Oct 2026)
Order matters: the server wants `apps/web/dist`, so build first.
```bash
npm ci && npm run typecheck && npm test           # 157 unit tests
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
- GitHub: no `gh`; use the GitHub MCP tools for PRs; `git push` works.
- Deploys from the cloud go through GitHub Actions (no `wrangler login`); keys are in repo Secrets.
