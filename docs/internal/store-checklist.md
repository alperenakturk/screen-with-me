# Store submission check (card STORE1 dry run, 7 Nov 2026; redone for card STORE2, 21 Nov 2026)

**STORE2 re-check (21 Nov 2026, extension 0.9.97.141, submission planned by ~25 Nov, before 1.0 by the owner's pick).**
What changed since the 7 Nov dry run and what was done:

| Item | Result |
|---|---|
| Manifest (name, summary, permissions, host permissions, content scripts, web-accessible resources) | ✅ unchanged since STORE1 (`apps/extension/build.mjs`); nothing new to justify |
| No remote code | ✅ scanned the zip: no `eval` / `new Function`, every `<script>` is a packaged file, the only outside address is our own server (WebSocket + the website in the room layer's iframe) |
| Package | ✅ `npm run store` builds; the zip is the same file as the live site's `/screenwithme-extension.zip`, so the owner downloads it there (it carries the live release number). No `1.0.0` bump: the store takes the four-part CI number |
| Screenshots | 🔧 regenerated (the room now fills the window and lost the room name / IP line in the top bar, as on the live site); the "Go to the film" highlight ring in screenshot 2 moved back onto its button. A fresh reviewer found no blockers |
| Description | 🔧 games listed by kind (classics, Sea Battle, quiz, draw and guess, a card game, a word race); block / report added; the IP sentence now points at the privacy policy (the separate notice before joining voice is gone) |
| Privacy tab | 🔧 chat kept as the last 1000 messages until the room is deleted (was 50); reports (name + last chat lines to us); session recap (per-person counts and watched videos, ≤ 90 days) added under user activity / web history; the `offscreen` justification no longer mentions the removed notice. Checked against `privacy.html` (last updated 17 Nov 2026) |
| Privacy policy, support | ✅ `privacy.html` EN + TR with a dated change list; support URL `help.html` (FAQ, feedback form, abuse e-mail) |
| Public-text rules (CLAUDE.md §6) | ✅ no film / series / piracy site names, no "open source", no donation prompt |
| `PROTOCOL_VERSION` | ⚠️ never bumped while the review runs (CLAUDE.md §7); the Planner tells the building sessions on submission day |
| Owner's steps | sent to the Planner (Turkish, step by step, with the Brave / Edge hand test first) |

The STORE1 tables below are kept as the field-by-field reference; where they say "1.0", read "the STORE2 submission".

We went through the Chrome Web Store submission field by field as if we were sending it today (extension
0.9.97.72), plus the Edge Add-ons differences. The texts to paste are in `web-store.md` (the form guide); this page
says, per field, where its text comes from, whether it is ready, and what only the owner can do.

Legend: ✅ ready · 🔧 fixed in this card · 👤 only the owner can do it · ❓ the owner decides (asked through the Planner)

## 0. Before anything

| Item | State | Notes |
|---|---|---|
| Chrome Web Store developer account | ✅ | Opened earlier (publisher e-mail screenwithme.app@gmail.com, non-trader). |
| 2-step verification on that Google account | 👤 | Google requires it before publishing. Check it is on. |
| Publisher contact e-mail verified in the dashboard | 👤 | Dashboard → Account → contact e-mail → verify link. |
| Version for submission | ✅ | STORE2: the live release number as it is (four parts); no `1.0.0` needed. |
| Package | ✅ | the live site's `/screenwithme-extension.zip` = `npm run store` → `store/screenwithme-<version>.zip` (checked 0.9.97.72, again 0.9.97.141). |
| Real-browser hand test (Brave / Edge / Opera) | 👤 | `STATUS.md` "Owner's hand tests"; remind the owner right before submitting. |

## 1. Package (the manifest, `apps/extension/build.mjs`)

| Field | Value | State |
|---|---|---|
| `name` (store title, ≤ 75) | `Sidelit – Watch Videos Together in Sync` (39) | ✅ |
| `description` (store summary, ≤ 132) | `A watch party for any site: everyone's video stays in sync, with chat, emoji reactions and voice. Free, no account needed.` (122) | ✅ |
| `version` | follows `apps/extension/package.json` | ✅ |
| `minimum_chrome_version` | `116` | ✅ |
| `homepage_url` | `…/extension.html` | ✅ (moves to the own domain later) |
| `permissions` | `storage`, `offscreen`, `scripting` | ✅ each has a justification (§3) |
| `host_permissions` | `<all_urls>` | ✅ justification + reviewer note (§3); expect a longer review (1–3 weeks) |
| `web_accessible_resources` | `shell.html`, `shell.js` for `<all_urls>` | ✅ the room layer; it opens nothing unless the background knows the tab (see CLAUDE.md "Shell") |
| `content_scripts` | `content.js` + `fullscreen-guard.js` (MAIN world) on all sites except ours, `site-bridge.js` on ours | ✅ dormant outside a room |
| Icons 16 / 32 / 48 / 128 | `apps/extension/static/` | ✅ |
| No remote code | everything in the package; the room layer shows our website in an iframe (a web page in its own origin) | ✅ answer "No" (§3) |

## 2. Store listing tab

| Field | Text / file | State |
|---|---|---|
| Description | `web-store.md` §1 (English + a short Turkish paragraph) | 🔧 the old product name in a heading replaced; cameras, screen sharing, games and the site's players (Vimeo, TikTok, podcasts, YouTube search) added. `check-name.mjs` now also reads `web-store.md` and this page, so the old name can't come back. ❓ a copy pass (`humanizer`) before 1.0 |
| Category | Entertainment (Lifestyle) | 🔧 the fallback named the old category; now "Social Networking" |
| Language | English | ✅ |
| Store icon 128×128 | `store/icon128.png` | ✅ regenerated |
| Screenshots 1280×800 (1–5) | `store/screenshot-1.png` … `-5.png` | ✅ regenerated in this card; they show today's film view (MB refreshed `store/src/room.html`) |
| Small promo tile 440×280 | `store/promo-small.png` | ✅ |
| Marquee 1400×560 | — | optional; skip for 1.0 |
| Promo video | — | optional (`hyperframes` / `video-use` in the owner's catalogue could make one after 1.0) |
| Official URL | — | 👤 needs the own domain verified in Google Search Console; leave empty until then |
| Homepage URL | `https://screen-with-me.swm-server.workers.dev/` | ✅ (own domain later) |
| Support URL | `…/help.html` | 🔧 was the home page; the help page has the FAQ, the feedback form and the abuse e-mail |
| Mature content | No | ✅ |

## 3. Privacy practices tab

| Field | Text | State |
|---|---|---|
| Single purpose | `web-store.md` §2 | ✅ |
| `storage` justification | `web-store.md` §2 | ✅ matches the privacy policy's extension section |
| `offscreen` justification | `web-store.md` §2 | ✅ |
| `scripting` justification | `web-store.md` §2 | ✅ |
| Host permission justification | `web-store.md` §2 (+ the short two-line version) | ✅ |
| Remote code | "No" | 🔧 added why the iframed website is not remote code, for a reviewer who asks |
| Data usage boxes | `web-store.md` §2: personally identifiable info, personal communications, location (IP in voice), user activity, website content, web history | ✅ checked against `privacy.html` (H3 + M7 rewrite): every box has a matching section there |
| The three certifications | all ticked | ✅ true today: nothing is sold, nothing is used outside the single purpose, no lending |
| Privacy policy URL | `…/privacy.html` | ✅ EN + TR, dated change list |

## 4. Distribution and test instructions

| Field | Value | State |
|---|---|---|
| Payment | Free | ✅ |
| Visibility | Public | 👤 the owner may prefer "Unlisted" for a first quiet week |
| Regions | All regions | ✅ |
| Test instructions | `web-store.md` §4 (Plyr / Video.js demo pages, two windows) | ✅ no login needed |

## 5. Edge Add-ons (Microsoft Partner Center)

| Item | State | Notes |
|---|---|---|
| Partner Center developer account (free, individual) | 👤 | same publisher e-mail |
| Package | ✅ | the same zip as Chrome |
| Store logo (square, 300×300 recommended) | 🔧 | `store/edge-logo-300.png`, now made by `npm run store` from the full-bleed app icon |
| Screenshots | ✅ | the same 1280×800 files |
| Small promo tile | ✅ | the same 440×280 file (optional on Edge) |
| Description per language | ✅ | the same text; Edge lets us add a separate Turkish listing (paste the Turkish paragraph extended, or the English text) |
| Search terms (Edge only) | ✅ | proposed: `watch party`, `watch together`, `sync video`, `group watch`, `video chat`, `movie night`, `Sidelit` |
| Category | ✅ | Entertainment (or Social) |
| Privacy policy URL, website, support | ✅ | as for Chrome |
| Notes for certification | ✅ | the same reviewer note as §4 |
| Submit | 👤 | together with Chrome (1.0) |

## 6. Mismatches found and what happened

| # | Found | Fix |
|---|---|---|
| 1 | A heading in the description still had the old product name (the name check didn't read `docs/internal`) | 🔧 fixed; `check-name.mjs` reads `web-store.md` and `store-checklist.md` now |
| 2 | The description didn't mention cameras, screen sharing, games or the site's other players | 🔧 one line each, factual |
| 3 | Support URL pointed at the home page | 🔧 `help.html` |
| 4 | Category fallback used an old Chrome category name | 🔧 "Social Networking" |
| 5 | No 300×300 logo for Edge | 🔧 `store/edge-logo-300.png` in `npm run store` |
| 6 | The link preview picture (`og.png`, also what WhatsApp shows for an invite) is Turkish only ("Sana bir koltuk ayırdım 🍿") although English comes first | ❓ asked: English, Turkish, or by the page's language (two pictures) |
| 7 | Everything still lives on `screen-with-me.swm-server.workers.dev` | 👤 the own domain (ROADMAP §6–7); the store listing works without it, but "Official URL" and a support e-mail on the domain wait for it |

## 7. Only the owner (submission day)

1. Turn on 2-step verification and verify the contact e-mail (Chrome dashboard).
2. Open the Edge Partner Center account.
3. (STORE2) No version step: download the live `/screenwithme-extension.zip` (or Claude runs `npm run store`).
4. Upload the zip, paste the texts from `web-store.md` (Claude can walk him through it live), press **Submit for review** in both stores.
5. Optional, before 1.0: a lawyer's read of `privacy.html` and `terms.html` (Turkish law / KVKK, EU users).
6. After approval: tell Claude the store link; the install steps on `extension.html` become an "Add to Chrome" button.
