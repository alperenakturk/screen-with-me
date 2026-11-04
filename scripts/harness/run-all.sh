#!/usr/bin/env bash
# Runs every Playwright harness (scripts/harness/*/run.cjs) one after another against a local server and prints a
# pass / fail table, so a harness that is not in CI cannot break silently (the TV harness was broken from 0.9.92.3 to
# 0.9.97.28 without anyone noticing). Run it before a milestone step, or after a change to the room's markup.
#
#   npm run build && (cd apps/server && npx wrangler dev --port 8787 &)
#   # a local video for the harnesses that play one (any webm; ffmpeg can make one):
#   ffmpeg -loglevel error -f lavfi -i testsrc2=size=320x240:rate=15 -t 30 -c:v libvpx -b:v 200k /tmp/v/video.webm
#   (cd /tmp/v && python3 -m http.server 5300 &)
#   bash scripts/harness/run-all.sh [http://localhost:8787] [only-these names…]
#
# Skipped (they need more than the built site): sweep (100 screenshots, by hand), popup (loads the extension),
# phone-speed (timing budget, noisy in a busy container). The .mjs harnesses (embed, voice, sound, hotspot) have their
# own set-up lines in docs/internal/STATUS.md "Testing in the cloud".
set -u
SITE="${1:-http://localhost:8787}"
shift || true
cd "$(dirname "$0")/../.."
export NODE_PATH="${NODE_PATH:-$(npm root -g)}"
SKIP=" sweep popup phone-speed "
names=("$@")
if [ ${#names[@]} -eq 0 ]; then
  for f in scripts/harness/*/run.cjs; do names+=("$(basename "$(dirname "$f")")"); done
fi
pass=(); fail=()
for n in "${names[@]}"; do
  case "$SKIP" in *" $n "*) continue ;; esac
  log="$(mktemp)"
  if timeout 600 node "scripts/harness/$n/run.cjs" "$SITE" >"$log" 2>&1; then
    pass+=("$n")
    echo "ok    $n"
  else
    fail+=("$n")
    echo "FAIL  $n"
    grep -E "^FAIL|Error" "$log" | head -5 | sed 's/^/        /'
  fi
  rm -f "$log"
done
echo
echo "${#pass[@]} passed, ${#fail[@]} failed${fail:+: ${fail[*]}}"
[ ${#fail[@]} -eq 0 ]
