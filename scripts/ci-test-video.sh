#!/usr/bin/env bash
# The test video the CI harnesses play (Tablets, game window heads, the state matrix): a 2-minute testsrc2 webm, served
# at http://localhost:5300/video.webm. GitHub's runner image has no ffmpeg. apt-get can hang for many minutes when
# Ubuntu's mirror is unreachable (11 Nov 2026), so ffmpeg comes from PyPI instead: imageio-ffmpeg (BSD-2-Clause) ships
# a static ffmpeg build. It is used in CI only and never shipped.
set -euo pipefail

ffmpeg_bin=$(command -v ffmpeg || true)
if [ -z "$ffmpeg_bin" ]; then
  py=python3
  if python3 -m venv /tmp/ci-ffmpeg > /dev/null 2>&1; then
    py=/tmp/ci-ffmpeg/bin/python
    timeout 120 "$py" -m pip install -q --disable-pip-version-check imageio-ffmpeg==0.8.1
  else
    timeout 120 python3 -m pip install -q --user --break-system-packages --disable-pip-version-check imageio-ffmpeg==0.8.1
  fi
  ffmpeg_bin=$("$py" -c 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())')
fi

mkdir -p /tmp/vid
[ -s /tmp/vid/video.webm ] || "$ffmpeg_bin" -loglevel error -f lavfi -i testsrc2=size=640x360:rate=24 -t 120 -c:v libvpx -b:v 300k /tmp/vid/video.webm
if ! curl -sf -o /dev/null http://localhost:5300/video.webm; then
  (cd /tmp/vid && python3 -m http.server 5300 > /dev/null 2>&1 &)
  for _ in $(seq 1 20); do curl -sf -o /dev/null http://localhost:5300/video.webm && break; sleep 0.5; done
fi
echo "test video at http://localhost:5300/video.webm ($ffmpeg_bin)"
