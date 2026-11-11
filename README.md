# QA2 screenshots (never merge)

This branch holds the screenshots from the QA2 first-look sweep of main at 0.9.97.121, converted to JPEG. It only shares the pictures between sessions; it is never merged, and it gets deleted once the regression sweep is done.

- `qa2/FINDINGS.md`: the findings, grouped by owner.
- `qa2/<batch>/index.md`: what each picture is.
- File names: `<screen>-<size>-<lang>[-<theme>].jpg`. A name without a theme is Night (`gece`).
- Sizes:
  - laptop: 1366×768
  - desktop: 1920×1080
  - tablet: 820×1180
  - tablet-land: 1180×820
  - phone: iPhone 13
  - phone-land: iPhone 13 sideways

To reproduce a shot: `NODE_PATH=$(npm root -g) node scripts/shots.cjs --screens <screen> --sizes <size> --langs <lang> --themes <theme>`. Run it against `wrangler dev` with `SWM_LAB_SERVER:1`, and serve the video with the film server on :5300.
