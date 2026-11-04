# GitHub page art (card GH)

Design session, 4 Nov 2026, for the now-public repo. The art is in the D1 "night gold" style: the logo, the Sidelit
wordmark, the slogan, and Glowbeam shining on the home page's laptop, tablet and phone (card 15c scene).

| File | Size | Use |
|---|---|---|
| `banner-en.svg` | 1280 × 400 | README hero banner, English (`README.md`) |
| `banner-en@2x.png` | 2560 × 800 | PNG fallback of the same |
| `banner-tr.svg` / `banner-tr@2x.png` | 1280 × 400 / 2560 × 800 | The Turkish banner for `README.tr.md` ("Ayrı ekranlar, aynı an.") |
| `social-preview.png` | 1280 × 640 | Settings → Social preview (the owner uploads it); `social-preview.svg` is its source |

**Light and dark GitHub:** every banner has its own dark rounded background, so one file reads on both themes; no
`<picture>` switch is needed. The SVGs embed the wordmark font (Bricolage Grotesque ExtraBold, OFL), the logo,
Glowbeam and three themed avatars as data URIs. That way they look the same inside GitHub's `<img>`, which loads no
outside files. This was checked in Chromium through an `<img>` on a white page and a `#0d1117` page.

**README snippet** (lane A):
```html
<p align="center"><img src="docs/internal/design/github/banner-en.svg" width="100%" alt="Sidelit: Different screens, same moment."></p>
```
In `README.tr.md`, use `banner-tr.svg` with the alt text "Sidelit: Ayrı ekranlar, aynı an.". If a renderer ever drops
the SVG, point `src` at the `@2x.png` instead.

**Words:** the English slogan is the site's own home page line, "Different screens, same moment.". The card's brief
said "Separate screens…", but slogans are the owner's, so the live wording is kept. No film, series or site names
appear anywhere, and nothing says "open source".

**Rebuild:** `NODE_PATH=$(npm root -g) node docs/internal/design/github/build.mjs --png` (Playwright's Chromium). Drop
`--png` to rebuild only the SVGs.
