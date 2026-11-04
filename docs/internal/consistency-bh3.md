# BH3: consistency + server-side sweep (4 Nov 2026, Developer lane A)

Planner's card BH3 (ROADMAP §5 "Consistency"): (a) every number a user can read matches the code, (b) a server-side
sweep of the new paths with a regression test for each real bug, (c) a list of old Turkish names (no renames yet).

## (a) Numbers a user can read

Checked against the code: the privacy policy (EN + TR), the help page (EN + TR), the UI strings (`i18n.ts`) and the
store texts (`docs/internal/web-store.md`).

| Where | Number | Code | Result |
| --- | --- | --- | --- |
| Privacy | chat history 50, chat images 12, recap session gap 4 h, saved recaps 20 / 5, recaps 90 days, move code 10 min, saved-room videos 30, custom emojis 24, rooms 24 h / 30 days, TV token 12 h, TV code 10 min, games 24 h, search cache 24 h, YouTube titles 30 days, usage counters 90 days | `CHAT_HISTORY`, `MAX_CHAT_IMAGES`, `SESSION_GAP_MS`, `RECAPS_KEEP(_SAVED)`, `RECAP_MAX_AGE_MS`, `MOVE_TTL_MS`, `MAX_HISTORY`, `MAX_STICKERS`, `EMPTY_ROOM_TTL_MS` / `SAVED_ROOM_TTL_MS`, `TV_TOKEN_TTL_MS`, `CODE_TTL_MS`, `EMPTY_TTL_MS`, `RESULT_TTL_S`, `TITLE_MAX_AGE_MS`, `USAGE_DAYS` | all match |
| Privacy | R12's "let in" record (browser ids kept 24 h after they were last there) | `ADMIT_TTL_MS` | **missing → added** (EN + TR, under "Browser ID") |
| Help | voice 6, cameras 4, viewers 4, chat 50, rooms 24 h / 30 days | (already checked by the help harness) | match |
| UI | queue 100, GIF ~200 KB, countdown 3 s, reaction gaps, TV code 10 min, recap 4 h, rooms 24 h / 30 days, poker 2–6 / blinds 2/4 every 5 hands / 100 % life, draw 2–8 | `QUEUE_MAX_LENGTH`, `STICKER_MAX_CHARS` (280 000 base64 ≈ 210 KB), `COUNTDOWN_MS`, `REACTION_GAPS`, `POKER_*`, catalog | match |
| UI | quiz "**Over 400** questions in 11 topics" | `QUIZ_BANK` = 395 (388 in English), 11 categories | **wrong → "Almost 400 questions"** (EN + TR) |
| Store | "everyone ready" ≤ 12 s, reactions 1–8, last 50 messages | `WaitTracker`, keys, `CHAT_HISTORY` | match |

Kept honest from now on: the help harness checks 16 numbers in each language of the privacy policy against the
constants above, and the games hall's quiz line against the real question bank (loaded the way the server loads it).

## (b) Server sweep of the new paths

| Path | Case | Found | Fix + test |
| --- | --- | --- | --- |
| Knock (R12) | The host is away (reload grace or gone) while others stay | **Bug:** the oldest person *acts* as host (`hostId`, `isHost`, may answer a knock), but the "wants to join" list went only to the stored `hostKey`, so nobody saw the card and the newcomer was told "the host isn't here". | `sendKnocks` sends the list to whoever acts as host; e2e `knock.mjs` "the person acting as host sees the card … can let them in" (fails on the old code). |
| Knock | "Make host" while someone waits | **Bug:** the new host saw no card until the next join; the old host kept a stale card (and got `not_host` on pressing it). | `makeHost` re-sends; everyone who isn't host gets an empty list. e2e "the new host gets the card, the old host's list empties". |
| Knock | The same browser knocks twice (reload, dropped network) | **Bug:** two cards for one person; the older connection waited out its 10 minutes. | The older knock is replaced (closed `4005`). e2e "one card; the older knock is replaced". |
| Knock | The host turns the switch off while someone waits | **Bug:** they stayed at the door until the 10-minute timeout. | They come in at once. e2e "turning it off lets whoever waits in". |
| Knock | A knocker leaves | ok: never recorded as "let in" (`admit24h` on leave needs a joined name). | — |
| Knock | TV + knock | ok: a TV comes with its person's token and never knocks. | — |
| Knock | A banned browser knocks | ok: the ban check runs before the door. | — |
| Private messages (R13) | To someone who left / a knocker / a TV / myself | ok: only joined, non-TV connections are targets; otherwise `private_gone` (e2e `private.mjs`). | — |
| Private messages | The recipient reconnects | ok: the server gives a reconnect the same member id, so a message still finds them. | — |
| Person key (R11) | TV, tabs, another room | ok (e2e `people.mjs`). | — |
| e2e pacing (BH1) | Live run | ok: the 0.9.97.14 live run waited 2–46 s between files, no 429, no retry. | — |

Stream / game resume (R1, BH2) is lane B's; not touched here.

## (c) Old Turkish names in English-first places (listed only, no renames)

- Pages and routes: `/eklenti.html` + `eklenti.js` (the extension page, linked from the site in 5 places),
  `/gizlilik.html` + `gizlilik.js` (redirect to `privacy.html`), the route `/baglanti` (`diag.ts`, linked from the
  room, the help page, the debug panel and the Worker).
- Query switch `?olcum=1` (Shorts switch measurement; `room.ts`, `styles.css`, the debug panel).
- Test data with Turkish names (Ali, Ayşe, Can, Deniz) in 25 files: e2e avatar, chatimage, draw, handover, host,
  live, modes, page, pins, poker, quiz, recap, room, roomgame, saved, shorts, stickers, tv, voice, wait, xox; harnesses
  embed, sound, tiktok, voice. Several harnesses also read the Turkish UI on purpose (they pick Turkish in a fresh
  browser).
- Turkish code comments: 1 643 comment lines in 184 files. Most: `apps/web/src/room.ts` (177), `apps/server/src/room.ts`
  (111), `apps/extension/src/content.ts` (90), `scripts/harness/embed/run.mjs` (65), `scripts/theme-art.mjs` (63),
  `scripts/avatars.mjs` (60), `apps/extension/src/background.ts` (55), `packages/shared/src/protocol.ts` (45),
  `packages/shared/src/sync-engine.ts` (38), `apps/web/src/ui/voice.ts` (31).
- Kept on purpose (CLAUDE.md): storage keys, message `source` strings, the `swm` prefixes, the extension zip / folder
  name.

Suggested order for the renames, when the Planner schedules them: the routes and page names first (one redirect each,
like `gizlilik.html`), then test data, then comments file by file as files are touched.
