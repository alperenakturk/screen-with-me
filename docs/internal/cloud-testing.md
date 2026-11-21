# Testing in the cloud (verified 28 Oct 2026)

The tested command sequence for a cloud session (moved from `STATUS.md` on 21 Nov 2026 to keep STATUS small).
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
- Deploys from the cloud go through GitHub Actions (no `wrangler login`); deploy keys are `production` environment secrets (`TAG_TOKEN` is the only repository secret).
