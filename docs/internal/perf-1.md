# Speed and weight pass 1 (card PERF1, 8 Nov 2026, main at bc4b6ab, 0.9.97.75)

How fast and how heavy Sidelit is before 0.9.98: what was measured, how, and the five wins worth doing, ranked.

**Verdict: fast enough today.**
- Lighthouse performance is 94–100 everywhere; accessibility and best practices are 100.
- Every phone time is well inside its budget.
- The pressure points are:
  - the room's JS budget (1.8 kB left);
  - one stylesheet that every page waits for;
  - the Worker's 10 ms CPU limit on one rare path (very large podcast feeds).

## 1. Page timings

New harness `scripts/harness/perf/run.cjs`. It times phone and laptop and adds the bytes on the wire per step. It reports only; `phone-speed` is still the budgeted check.

It ran on the built site under `wrangler dev` in the cloud container. Each figure is the median of 3 fresh visits, in one browser session per visit, so the join step reuses the files the home page already fetched.

| Step | Phone (Pixel 7, 4× CPU, 4G) | Laptop (1366 × 768) | On the wire |
|---|---|---|---|
| Home: navigation → "Create room" visible | 681 ms | 265 ms | 136 kB |
| Join card: navigation → name field (assets cached from home) | 537 ms | 215 ms | 123 kB |
| Room: "Enter" → live connection | 478 ms | 172 ms | 10 kB |
| Game: a Classics table asked for → its picker on screen | 314 ms | 75 ms | 34 kB |

**The budgeted phone check (`phone-speed`):** home 618 / join 528 / room 473 ms, against a budget of 1500 each. On 2 Nov it was 556 / 478 / 369 ms. That is about +10 % for home and join and +28 % for the room, after a week of features. The phone still has two-thirds of its budget to spare.

**The film page overlay** was not timed here. It needs the extension in a headful Chromium (the `embed` harness under `xvfb-run`). It loads the same room page as the site, so the room figures and the JS budget below apply to it too.

## 2. Lighthouse 12.8 (on the local build; the live site adds the network)

| Page | Profile | Perf | A11y | Best practices | FCP | LCP | TBT | CLS | Weight |
|---|---|---|---|---|---|---|---|---|---|
| Home | mobile | 96 | 100 | 100 | 1.6 s | 2.3 s | 30 ms | 0.087 | 167 KiB |
| Home | desktop | 100 | 100 | 100 | 0.4 s | 0.6 s | 0 ms | 0.024 | 167 KiB |
| Room (join card) | mobile | 94 | 100 | 100 | 1.9 s | 2.9 s | 0 ms | 0.016 | 247 KiB |
| Room (join card) | desktop | 100 | 100 | 100 | 0.5 s | 0.7 s | 0 ms | 0.007 | 247 KiB |

What Lighthouse flags:
- **Render-blocking CSS: the one `index-*.css`** (37.7 kB gzipped).
  - Estimated saving: 560 ms of FCP on the home page and 610 ms on the room page, on mobile.
  - 96 % of it is unused on the home page: it is the room's stylesheet.
- **Unused JS on the join card: 78 KiB of `room-*.js`.** Expected: the room code is needed once the person enters. It is already the budgeted chunk.
- **LCP element:** a paragraph of text on both pages: the home slogan, and the join card's line. No image is on the critical path.

## 3. Weight and budgets

- **Room page (`scripts/size-budget.mjs`):**
  - JS: **143.2 kB of 145 kB** gzipped. **1.8 kB headroom**: the next feature in the room chunk crosses it.
  - CSS: 35.9 kB of 37 kB.
- **The shared `dom-*.js` chunk: 39.5 kB gzipped, loaded by every page.** It is `i18n.ts`, both languages' full tables (≈ 1 400 keys each), plus `dom.ts`. A page only ever shows one language at a time.
- **The font** `bricolage-grotesque-800.woff2` (22.7 kB) loads on every page with `font-display: swap`. The home page's headings and the game covers' SVG text use it too, so it is not only the wordmark.
- **Icons:**
  - `icon-192.png` (27 kB) is fetched by Chrome for the manifest on page load.
  - `icon-512.png` (158 kB) and `icon-maskable-512.png` (154 kB) are only for installing.
  - Lossless re-compression saves 15–25 %: 512 px 158 → 119 kB, 192 px 28 → 24 kB, `og.png` 204 → 176 kB.
  - A 256-colour palette would save about 90 %, but it bands the logo's light beam visibly, so it is rejected.

## 4. Server

- **Worker CPU per request:** this needs the owner's dashboard. The cloud session has no Cloudflare API token, and `wrangler dev` reports no CPU time. Where to read it: Cloudflare → Workers & Pages → screen-with-me → Metrics → CPU time (median and p99). The Free plan stops a request at 10 ms of CPU (`docs/internal/costs.md`). Every route is a short handler except one:
  - **The podcast episodes route** reads a feed of up to 4 MB (`FEED_MAX_BYTES`) and parses every `<item>` before keeping the newest 30.
  - A synthetic 3.9 MB feed with 2 000 episodes takes **14–24 ms** in `parseFeed` on this container's CPU. That is over the limit.
  - Typical feeds (100–500 kB) take a few ms, and the answer is cached for an hour. So only very large shows are at risk, on their first lookup in an hour.
- **Durable Object storage per room:** unchanged since OPS1 (`costs.md` "Storage per room"). A typical room without images is 10–50 kB; a full room is about 10 MB, mostly 24 custom emojis plus 12 chat images. The risk there is saved rooms full of images, already named in `costs.md`.
- **Rows written** is still the free limit a busy evening would hit first (`costs.md`). The room writes on most user actions: 58 `storage.put` / `delete` call sites in `room.ts`. Nobody has measured how many writes one chat message or one play / pause costs.

## 4b. Storage writes per user action (card PERF1d, measured)

**How it was measured:** a local-only counter wrapped the room object's `storage.put` / `delete` (never committed). Two people then went through one room on `wrangler dev`, and each step's writes were counted. A row is one key written.

| Step | Rows written | Which keys |
|---|---|---|
| First person joins | 6 | `roomId`, `admitted`, `personSalt`, `memberIds`, `host`, `stats` |
| Second person joins | 3 | `admitted`, `memberIds`, `stats` |
| A video added to an empty room (plays at once) | 5 | `room` ×2, `stats` ×2, `counted` |
| A video added to the queue | 5 | `room` ×2, `stats` ×2, `voters` |
| Pause / play / seek | 2 each | `room`, `stats` |
| A chat message | 1 each | `chat` |
| An emoji | **1 each** | `stats` (the recap's counters) |
| A pin | 1 | `pins` |
| Someone leaves / the last one leaves | 1 / 4 | `waits`; `hostGoneAt`, `waits`, `stats`, `emptySince` |

**What it means:**
- Every emoji and every play / pause / seek writes the recap's counters (`stats`) once more. Half of a lively room's writes are those counters.
- A busy evening in one room: 5 people for 2 hours, about 200 messages, 500 emojis and 50 controls. That is ≈ 200 + 500 + 100 = **≈ 800 rows**.
- The Free plan's 100 000 rows a day is then about **125 such room evenings**.
- If the counters were saved at most every 30 s (and when the room empties), the same evening would be ≈ 300 rows, or about **330 room evenings a day**.
- What a restart would lose: up to 30 s of recap counts. That matches what "sleep resilience" accepts elsewhere.

**Chat:** one write per line, but it rewrites the 50-message history each time. That is fine for the rows count; it is bytes, not rows, that grow.

**Built (PERF1e, 0.9.97.78):** `room.ts` keeps the counters in memory and writes `stats` at most every `STATS_SAVE_MS`
(30 s) through the room's alarm, and at once when the last person leaves. Emojis and play / pause / seek now write
0 rows each between those saves (play / pause / seek still write `room`), so the busy evening above is ≈ 200 chat +
100 controls + about 240 counter saves at most (one per 30 s for 2 hours) ≈ 300–540 rows, instead of ≈ 800. The
recap e2e checks that a burst of emojis and messages counts in full, also after the room empties and someone returns.

## 5. The five wins, ranked

| # | Win | Gain | Cost / risk | Who |
|---|---|---|---|---|
| 1 | **Load only the page's language.** Split `i18n.ts` into an English table (in the main chunk, the default) and a Turkish table, loaded before the site starts when `lang` is `tr` and on a switch to Turkish. `t()` falls back to English while it loads. | ≈ −19 kB gzipped on every page (the `dom` chunk 39.5 → ≈ 20 kB); gives the room's JS budget its headroom back. | Medium: `setLang` becomes async, `check-texts.mjs` reads two files, every harness that picks Turkish must wait for it. App code, so a version. | Developer (proposed card PERF1a) |
| 2 | **The home page without the room's stylesheet.** Move room-only rules out of `styles.css` into a `room.css` loaded with the room chunk, as `home.css` already is for the home page. | Lighthouse estimates ≈ −460 ms FCP on a mobile home page; the home page fetches ≈ 30 kB less. | Medium–high: a wrong split shows an unstyled flash in the room. The sweep (110 screens), the phone and tablet harnesses are the guard. App code, a version. | Developer (PERF1b, after 1). **Done in 0.9.97.83:** every page's first stylesheet 36.9 → 4.9 kB gzipped; the room page's CSS 36.9 → 37.2 kB (phone.css rides twice to keep its order); computed styles of every element compared before / after on 144 screens (room, join, home, /connection; three computer sizes, phone, sideways phone, tablet; EN + TR): only timing noise differs. |
| 3 | **Podcast feeds within the CPU limit.** Stop parsing a feed once enough items are read: feeds list the newest first, so the first ≈ 200 items are enough. Also stop reading the body there instead of up to 4 MB. | A 4 MB feed falls from 14–24 ms to the few ms of a normal one, under the Free plan's 10 ms. | Low; a unit test with a big feed. The one trade-off: a feed listed oldest first and longer than 200 items would show older episodes. Server code, a version. | Developer (PERF1c) |
| 4 | **Save the recap's counters at most every 30 s.** Measured in §4b: every emoji and every play / pause / seek writes `stats`. Keep them in memory and write on a 30 s timer through the room's existing alarm, and when the room empties. Never an in-memory `setTimeout` (the room's sleep-resilience rule). | About −60 % rows on a lively evening (≈ 800 → ≈ 300 per room evening), so roughly 2.5× more busy rooms a day under the Free plan's 100 000 rows. | Low–medium: a restart loses at most 30 s of recap counts. Server code, a version. | Developer (PERF1e) |
| 5 | **Lossless PNG re-compression** in `make-icons.mjs` (icons) and `store-shots.mjs` (`og.png`). | −15–25 % per file: icon-192 −4 kB on most page loads, and the install icons and link preview lighter. | Low: same pixels; a byte-size check in the icons script. Files only, but the icons ship in the extension too, so it rides a version. | Developer (small, with any release) |

**Not worth doing now:**
- Subsetting the font: it already serves the home headings and game covers; saving it means fewer letters for future copy.
- Inlining critical CSS: win 2 gets most of it without a build step.

**Built (PERF1a + win 5, 0.9.97.79):** English stays in the main chunk and Turkish is `i18n-tr.ts`, loaded before the
first frame when the saved language is Turkish; the room page's static JS is **124.3 kB** gzipped (was 143.2; budget
145). Lossless PNG re-compression is `scripts/png-squeeze.mjs` (best row filter, deflate 9, pixels compared before
writing): icon-512 158 → 119 kB, icon-192 28 → 24 kB, maskable 154 → 119 kB, `og.png` 204 → 175 kB, the store images
3–24 % smaller.

## 6. Built in this card

- `scripts/harness/perf/run.cjs`: the phone + laptop timing and weight table above, re-runnable for the next pass (`PERF2`).

No app code changed, so no version. Every win above is a proposed card with its numbers; none trades away a feature or a test.
