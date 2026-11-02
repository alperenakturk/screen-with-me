# Research: solo games while watching, and accounts

_Research session, 2 Nov 2026, job from the Planner for the owner. Read-only. Existing game notes:
`oyun-fikirleri.md` (Turkish, room games), CLAUDE.md "PlayWithMe"._

## Part A: solo games beside the video

### What such a game must be (derived from our rules and idle-game practice)
- **Video first.** Played in a free window / the side panel while the room keeps playing; never pauses the room,
  never takes the room's keys (1–8 send emojis, Enter = message, P = pin, V = push-to-talk), never steals focus from the
  message box. Silent by default (`opt:gameSound` off for solo games).
- **Low attention, pause-safe.** No timers that punish looking away; a round can stop mid-move and wait for hours.
- **Fits without scrolling** (owner's rule): a fixed grid that scales to the window (free window, side panel, phone
  sheet). No lists that grow.
- **Plain TypeScript + CSS / canvas,** no framework, tiny bundle, lazy-loaded chunk (like `ui/recap.ts`), no network
  (the server is not involved: nothing to secure or pay for).
- **Computer + phone:** tap / click only, ≥ 44 px targets, one hand.
- **Original theme**: a genre with our own look and name, never a copy of a known game (and no film / series names).

Idle-game design notes: offline progress is a core requirement, usually with a cap; a small, easy core loop with a
deeper meta loop on top; "prestige" (restart with a bonus) keeps people coming back
([Machinations: how to design idle games](https://machinations.io/articles/idle-games-and-how-to-design-them),
[DEV: 7 idle games in 30 days](https://dev.to/aguier/i-built-7-idle-games-in-30-days-what-i-learned-about-incremental-design-5d3f)).
Players dislike offline progress that is far below active play
([r/incremental_games thread](https://reddit.birdcat.cafe/r/incremental_games/comments/16snoif/game_feature_youd_defend_to_your_grave), weak).

### Categories that fit
| Category | Why it fits | Attention |
|---|---|---|
| **Idle / incremental** (the owner's idea) | Progress grows while you watch; one tap now and then | very low |
| **Collect** (album filled over time) | Rewards watching together, no skill | very low |
| **Logic puzzles** (nonogram-style grids, sliding tiles, pipes, minesweeper-style) | Fixed grid, pause-safe, no timer, old public genres | low–medium |
| **Merge** (combine two equal items into a bigger one on a small board) | Tap / drag, fixed board | low |
| **Patience card games** (classic solitaire rules are public domain) | Pause-safe, familiar | medium |
| **Zen / toy** (sand, garden, building blocks with no goal) | Zero pressure | very low |

Not a fit: anything with reflexes or a clock (draws the eyes off the film), endless lists, online leaderboards (needs
the server and identities).

### Specific suggestions (our own themes), in recommended order
1. **🍿 Snack Bar (idle, flagship).** You run the room's snack bar: popcorn machine → drinks → nachos → a second
   counter… Income comes **only while a video plays in the room** (fair, and it ties the game to watching, not to
   leaving a tab open), with a capped "while you were away" bonus. **Together bonus:** +10 % per other person in the
   room, more in voice: playing alone, next to others, without any shared state. Prestige = "open a new cinema" with a
   star bonus. One screen: the counter (canvas or CSS grid), 3–5 upgrade buttons, the total. Save in the browser.
2. **🌱 Window Garden (zen idle).** Plants grow over watched minutes; tap to water once in a while; rare seeds after a
   film ends. Even lower attention than Snack Bar; good on phones.
3. **🧩 Puzzle box (logic pack).** Daily small grids generated from a seed: picture-logic grid, pipe connector,
   sliding tiles. No timer, auto-saves each move, a new one each day (same seed for everyone → "did you solve today's?"
   chat moment, without a server).
4. **🎟️ Ticket album (collect).** A stamp for every 15 min watched together, special stamps for Shorts streaks, a
   full game of Quiz, a film time reached. Could later merge into Snack Bar as its reward track.
5. Merge board and solitaire: fine fillers later.

Fits the existing code: the free window and stage from `games/stage.ts` (`shortsView` / float), the sound policy
(`sounds.ts`, game group), the "room is playing" signal the engine already has, `localStorage` per browser.

## Part B: accounts

### What accounts would open
- Saved game progress across devices and after clearing the browser.
- Saved rooms and "continue where you left off" on every device (today: per browser, `saved-rooms.ts`, `lastRoom`).
- Friends list, "who is online", invites without a link.
- Bans that work better than per browser (today another browser gets around them).
- Premium / donations perks later (owner: income only through donations after 1.0).
- Custom emoji collection on all devices.

### Costs and risks
- **Our promise.** Home page "Free · no account · no ads"; VIZYON lists "no forced account" among things we never do.
  Competitors use "no account" as a selling point (Watch2Gether: rooms without an account, the account only keeps
  rooms after 24 h, [W2G forum](https://community.w2g.tv/t/how-to-use-watch2gether/736)). An optional account keeps
  the promise only if nothing in a room ever needs it.
- **GDPR / KVKK.** An account = a persistent personal identifier + whatever we store under it: lawful basis, privacy
  policy section, retention, deletion on request, data export (portability), breach duty, processor terms with
  Cloudflare. E-mail logins add more data and an e-mail sending service. KVKK: whether VERBİS registration applies
  depends on thresholds; check before launch (owner, ROADMAP §4). Run `kvkk-gdpr-denetim` (owner's catalogue) on any
  account design before building.
- **Stores.** Apple: apps that support account creation must let people start **account deletion inside the app**
  (guideline 5.1.1(v), in force since 30 Jun 2022,
  [Apple](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion),
  [offering account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app)); a
  third-party / social login brings the Sign in with Apple / login-services rule (4.8) and token revocation (secondary
  source: [ptkd](https://ptkd.com/journal/app-store-rejection-4-8-sign-in-with-apple); check Apple's current text).
  Chrome Web Store: more user data → more in the data-use disclosure (`web-store.md`).
- **Security.** Login, sessions, recovery, account takeover, rate limits, a bigger attack surface for the 0.9.97
  security gate.
- **Work and support.** Recovery requests ("I lost my account") become the main support load.

### Lighter options, cheapest first
| Option | What it gives | Cost / risk |
|---|---|---|
| **A. Browser only** (`localStorage`) | Progress on this browser | None. Lost when site data is cleared; not on the phone. |
| **B. Move-to-device code** | Carry progress / saved rooms / emoji collection to another device: the old device shows a 6-digit code + QR (we have `qr.ts` and the TV pairing pattern: a short-lived Durable Object that stores nothing), the new one types / scans it, the blob passes once | Small. Nothing stored on the server beyond minutes. Still per device afterwards. |
| **C. Backup code** (anonymous cloud save) | A random secret shown once ("write this down"); the server keeps an encrypted / hashed-key blob; any device with the code restores | Pseudonymous personal data → GDPR applies (retention, deletion); no e-mail; lost code = lost save. |
| **D. Optional passkey account** | Real sign-in with no password and no e-mail (WebAuthn); several passkeys per account as recovery; saved rooms + friends later | Medium build; needs recovery design; GDPR as an account; Apple deletion rule if in an app. Passkeys avoid storing passwords and can work with one identifier (vendor sources: [Corbado](https://www.corbado.com/faq/ensure-gdpr-compliance-with-passkeys.md), [1Password Passage](https://passage.1password.com/post/passkeys-compliance-standards)). |
| **E. E-mail / social accounts** | What users know | Highest: e-mail service, resets, more data, Apple 4.8, promise weakened. |

### Recommendation for the owner
1. **Now (with the first solo game): A**, with saves designed as one versioned JSON blob, so B/C/D can carry it later
   without changes.
2. **Next: B** (move-to-device code), reusing the TV pairing pattern: it answers "my phone doesn't have my progress"
   with no account and no stored data, and also moves saved rooms and the emoji collection.
3. **After 1.0, only if users ask:** D (optional passkey account), never needed to join or use a room, with in-app
   deletion from day one. Skip C (D does it better) and E.
4. Keep "no account" in the slogan; if D comes, the line becomes "no account needed".

---

## Cards proposed (in `CARDS.md` → Proposed)
1. 🍿 Snack Bar: first solo side game (idle, browser save).
2. Move my things to another device (6-digit code / QR).
3. Accounts: owner's decision (option page).
Also listed here for later: Window Garden, Puzzle box, Ticket album.
