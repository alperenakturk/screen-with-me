#!/usr/bin/env bash
# Installs Playwright's Chromium on a GitHub runner. A runner whose Ubuntu apt mirror is unreachable doesn't fail the
# job (seen 11 Nov 2026: "Temporary failure resolving azure.archive.ubuntu.com" for minutes on some runners).
#
# `playwright install --with-deps` runs apt-get. On ubuntu-24.04 runners the image already holds every library
# Chromium needs; apt only adds extra fallback fonts (CJK, Thai, unifont, freefont, xfonts) that our EN / TR pages never
# use. So the apt part gets APT_TRIES tries of at most APT_SECONDS each, APT_PAUSE apart. If the mirror stays down,
# the browser still installs, and the job goes on only after it checks that Chromium's libraries and the fonts our pages do use (emoji, a Latin sans) are present.
# Otherwise it fails loudly, saying why.
set -euo pipefail

APT_SECONDS="${APT_SECONDS:-45}"   # one try's limit
APT_TRIES="${APT_TRIES:-3}"
APT_PAUSE="${APT_PAUSE:-30}"       # seconds between tries

# Short apt timeouts and no retries: a dead mirror otherwise costs ~20 s per file, several minutes in all.
printf 'Acquire::Retries "0";\nAcquire::http::Timeout "10";\nAcquire::https::Timeout "10";\n' | sudo tee /etc/apt/apt.conf.d/99ci-timeouts > /dev/null

deps=0
for try in $(seq 1 "$APT_TRIES"); do
  if timeout "$APT_SECONDS" npx playwright install-deps chromium; then
    deps=1
    echo "system dependencies installed (try $try)"
    break
  fi
  # A killed apt can leave its lock behind; free it for the next try and for later apt steps in the job.
  sudo rm -f /var/lib/dpkg/lock-frontend /var/lib/dpkg/lock /var/cache/apt/archives/lock /var/lib/apt/lists/lock
  sudo dpkg --configure -a || true
  if [ "$try" -lt "$APT_TRIES" ]; then
    echo "apt try $try of $APT_TRIES failed; next in ${APT_PAUSE} s"
    sleep "$APT_PAUSE"
  fi
done
if [ "$deps" = 0 ]; then
  echo "::warning::Ubuntu's apt mirror failed ${APT_TRIES} times (${APT_SECONDS} s each); using the runner image's own libraries and fonts (only extra fallback fonts are skipped)"
fi

npx playwright install chromium

# Check what the fallback relies on.
chrome=$(find "${PLAYWRIGHT_BROWSERS_PATH:-$HOME/.cache/ms-playwright}" -type f \( -name chrome -o -name headless_shell \) -path '*chrom*' | head -n 1)
if [ -z "$chrome" ]; then
  echo "::error::Playwright's Chromium binary was not found after the install"
  exit 1
fi
missing=$(ldd "$chrome" 2>/dev/null | grep 'not found' || true)
if [ -n "$missing" ]; then
  echo "::error::Chromium is missing system libraries and the apt mirror could not supply them: $missing"
  exit 1
fi
for font in 'Noto Color Emoji' 'Liberation Sans\|DejaVu Sans'; do
  if ! fc-list | grep -qi "$font"; then
    echo "::error::font '$font' is missing on this runner (the screenshots and contrast checks need it) and the apt mirror could not supply it"
    exit 1
  fi
done
echo "Chromium ready: $chrome"
