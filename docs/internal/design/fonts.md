# FONT1: font candidates (Design, 10 Nov 2026)

This answers the owner's feedback (10 Nov): "general colour / font mismatches" and "research fonts: free, no licence trouble, many fonts".

Sample page: `fonts/index.html`. Open it locally; the fonts are in `fonts/files/`. A still of it is `fonts/samples.jpg`. Each card shows the home title, the home line and a room UI line in English and Turkish, then the Turkish letters.

How the files were made:
- `fonts/subset.py` cuts the sample fonts from the `@fontsource-variable/<id>` npm packages.
- `fonts/build.mjs` writes the page.
- Licence texts are in `fonts/licenses/`.

## What is wrong today
1. **The site has no font of its own.** The body is `system-ui`, so the look depends on the device: Segoe UI on Windows, SF on a Mac, Roboto on Android. Only the wordmark is ours (`apps/web/public/fonts/bricolage-grotesque-800.woff2`, 22 KB, static 800).
2. **The home title misses its font.**
   - `home.css` asks for `'Bricolage Grotesque'` (`.hm-slogan` and the "How it works" heading).
   - The `@font-face` in `styles.css` is named `'Sidelit Wordmark'`.
   - So the title quietly falls back to the system font: the "mismatch" between the logo and the title right under it.
   - A one-line fix either way: use `'Sidelit Wordmark'` in `home.css`, or name the face 'Bricolage Grotesque'.
3. System bold titles next to a quirky grotesque wordmark read as two brands.

## Candidates
- All are **SIL Open Font License 1.1**. You may self-host, bundle and modify them; the licence text ships with the font, and nobody can sell the font on its own.
- All are on Google Fonts and npm (`@fontsource-variable/*`) and have a **variable weight axis**.
- No Apache candidate was needed.
- Every one has all of ğ Ğ ş Ş ı İ ç Ç ö Ö ü Ü, checked in the font files' cmaps.
  - ç ö ü are in the `latin` file; ğ ş ı İ are in the `latin-ext` file, so a site needs both, or one custom cut.
- "Turkish cut" is one variable woff2 holding Basic Latin, Latin-1, ğĞ ıİ şŞ, quotes, dashes, € and ₺: what we would actually ship (`pyftsubset`, all weights kept).

| Font | Role | Weights (variable) | latin + latin-ext (npm) | Turkish cut | ₺ | Licence | User setting? |
|---|---|---|---|---|---|---|---|
| **Bricolage Grotesque** | titles (our wordmark) | 200–800, + opsz, wdth | 58 KB | ≈ 38 KB | ✓ | [OFL](https://fonts.google.com/specimen/Bricolage+Grotesque/license) | (titles stay) |
| **Figtree** | body | 300–900 | 29 KB | ≈ 20 KB | – | [OFL](https://fonts.google.com/specimen/Figtree/license) | **default body** |
| Plus Jakarta Sans | body | 200–800 | 47 KB | ≈ 26 KB | ✓ | [OFL](https://fonts.google.com/specimen/Plus+Jakarta+Sans/license) | |
| Inter | body | 100–900, + opsz | 130 KB | ≈ 40 KB | ✓ | [OFL](https://fonts.google.com/specimen/Inter/license) | |
| Fraunces | titles (soft serif) | 100–900, + opsz, soft, wonk | 68 KB | ≈ 37 KB | ✓ | [OFL](https://fonts.google.com/specimen/Fraunces/license) | |
| Manrope | body | 200–800 | 39 KB | ≈ 25 KB | ✓ | [OFL](https://fonts.google.com/specimen/Manrope/license) | |
| Outfit | titles | 100–900 | 45 KB | ≈ 31 KB | – | [OFL](https://fonts.google.com/specimen/Outfit/license) | |
| Onest | body | 100–900 | 60 KB | ≈ 32 KB | ✓ | [OFL](https://fonts.google.com/specimen/Onest/license) | |
| Space Grotesk | titles | 300–700 | 40 KB | ≈ 20 KB | ✓ | [OFL](https://fonts.google.com/specimen/Space+Grotesk/license) | |
| DM Sans | body | 100–1000, + opsz | 53 KB | ≈ 36 KB | ✓ | [OFL](https://fonts.google.com/specimen/DM+Sans/license) | |
| Unbounded | titles (wide) | 200–900 | 165 KB | ≈ 46 KB | ✓ | [OFL](https://fonts.google.com/specimen/Unbounded/license) | |
| Rubik | body | 300–900 | 53 KB | ≈ 34 KB | – | [OFL](https://fonts.google.com/specimen/Rubik/license) | |
| Sora | titles | 100–800 | 48 KB | ≈ 32 KB | – | [OFL](https://fonts.google.com/specimen/Sora/license) | |
| Instrument Sans | body | 400–700, + wdth | 40 KB | ≈ 29 KB | – | [OFL](https://fonts.google.com/specimen/Instrument+Sans/license) | |
| **Atkinson Hyperlegible Next** | one family | 200–800 | 51 KB | ≈ 33 KB | – | [OFL](https://fonts.google.com/specimen/Atkinson+Hyperlegible+Next/license) | **"Readable"** |
| **Nunito** | one family | 200–1000 | 72 KB | ≈ 36 KB | ✓ | [OFL](https://fonts.google.com/specimen/Nunito/license) | **"Rounded"** |
| **Lexend** | one family | 100–900 | 72 KB | ≈ 37 KB | ✓ | [OFL](https://fonts.google.com/specimen/Lexend/license) | **"Easy reading"** |

A missing ₺ only matters if the UI ever shows the lira sign; the browser then draws it from the system font.

## Pairs on the sample page
1. **Bricolage Grotesque + Figtree (recommended default).**
   - The titles use the wordmark's own face, so the logo and the title finally match.
   - Figtree is warm and open, and clear at 13–14 px in the room.
   - It is the smallest body font here (≈ 20 KB).
   - Together that is ≈ 58 KB, or ≈ 42 KB if the titles keep a 600–800 cut.
2. Bricolage Grotesque + Plus Jakarta Sans: the same titles with a more polished, geometric body (≈ 26 KB).
3. Bricolage Grotesque + Inter: the safest UI body. But Inter is the default of countless apps and AI-generated sites, so it would keep the "generic" feel the owner dislikes.
4. **Fraunces + Manrope (the cinema mood).** A soft poster serif for titles and a clean body. It is the most distinct, and suits the night-gold brand and Picture Palace. The wordmark stays Bricolage, so the logo and titles differ on purpose.
5. Outfit + Onest: round, geometric, young.
6. Space Grotesk + DM Sans: crisp and techy; a common start-up look.
7. Unbounded + Rubik: the most playful, with wide titles. The titles are the heaviest file (≈ 46 KB).
8. Sora + Instrument Sans: calm and neat. The body only goes 400–700.
9. Atkinson Hyperlegible Next: one family, made by the Braille Institute for low vision. I l 1 and O 0 are all clearly different.
10. Nunito: one family; rounded ends, soft and cosy.
11. Lexend: one family; wide spacing made to reduce reading stress.

## Recommendation
- **Default: Bricolage Grotesque for titles + Figtree for everything else.** One family of feeling with the logo, small, and not the overused Inter look.
- **A "Font" setting** under Settings → Appearance, next to the theme, with five choices:
  - **Sidelit** (the default pair);
  - **Readable** (Atkinson Hyperlegible Next);
  - **Rounded** (Nunito);
  - **Easy reading** (Lexend);
  - **Device font** (`system-ui`, nothing downloaded).
  - Only the picked font is downloaded.
  - This is also an accessibility win: low vision, dyslexia and a "just my system font" choice.

## Notes for lane A (once picked)
- **Files:**
  - Self-host in `apps/web/public/fonts/`: one variable Turkish cut per family (the range in `fonts/subset.py`, but over the full npm `latin` + `latin-ext` files, not the sample text).
  - Add the OFL text beside each, as `OFL-bricolage-grotesque.txt` is today, and a line in `apps/web/public/third-party-notices.txt`.
  - CSP `font-src 'self'` already allows it.
  - **Never** link Google Fonts' CDN: it would send visitors' IPs to Google, and `privacy.html` would have to say so.
- **CSS:**
  - Set `--font: 'Sidelit Body', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif` on `:root`. The token already exists in `styles.css`; no theme sets it.
  - Add one `--font-title` used by `.hm-slogan`, headings and dialog titles.
  - `font-display: swap`, and preload only the body file on the room page.
- **Weights in use:** 400, 500, 600, 700 and 800 (titles). The variable files cover them with no extra downloads.
- **Fix the home title's face name** (above), even if nothing else is picked.
- **The setting:**
  - store it like the theme (localStorage `font`, an id);
  - set `data-font` on `<html>` before first paint, like `data-theme`;
  - each choice only changes `--font`;
  - texts go into `i18n.ts` + `i18n-tr.ts`;
  - add a Test Lab hook that cycles the fonts.
- **Check after:**
  - the design sweep (`scripts/harness/sweep/run.cjs`) at all five sizes: no overflow or new wraps. Figtree is a little narrower than Segoe UI, Lexend and Nunito a little wider;
  - the size budget (`scripts/size-budget.mjs`) if fonts count toward it.

## Options for the owner (the Planner asks)
**Q1. The site's font:**
- **A (recommended):** Bricolage Grotesque titles + Figtree text. Preview: the logo's face for every title, warm and clear text.
- **B:** Fraunces titles + Manrope text. Preview: soft cinema-poster serif titles, clean text; the most distinctive.
- **C:** Bricolage Grotesque titles + Plus Jakarta Sans text. Preview: the same titles, a slightly more polished, geometric text.
- **D:** Keep the device's own font; only fix the home title so it uses the logo's face.

**Q2. A font choice for users:**
- **A (recommended):** a "Font" setting with five choices: Sidelit, Readable, Rounded, Easy reading and Device font.
- **B:** No setting; everyone gets the default.
