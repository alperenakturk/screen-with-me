# Store submission dry run (card STORE1, 7 Nov 2026)

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
| Version for submission | 👤 | `1.0.0` in `apps/extension/package.json` and the site footer on submission day (the owner names the step). |
| Package | ✅ | `npm run store` → `store/screenwithme-<version>.zip` (made and checked in this card: 0.9.97.72). |
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
3. Say "1.0" so the version moves to `1.0.0`; Claude runs `npm run store`.
4. Upload the zip, paste the texts from `web-store.md` (Claude can walk him through it live), press **Submit for review** in both stores.
5. Optional, before 1.0: a lawyer's read of `privacy.html` and `terms.html` (Turkish law / KVKK, EU users).
6. After approval: tell Claude the store link; the install steps on `extension.html` become an "Add to Chrome" button.
