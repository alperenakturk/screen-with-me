# Feed start window and the Shorts view (card FD1)

_Design session, 16 Nov 2026, for card FD1 (`docs/internal/CARDS.md`). Status: **options, waiting for the owner's
pick** (the Planner asks). Build only after the pick (lane A). Sketches (Night theme, English):
`feed-start/*.svg`, made by `feed-recap-sketches.mjs` (`node docs/internal/design/feed-recap-sketches.mjs
docs/internal/design`)._

## What is wrong today (screenshots of `main`, 16 Nov 2026, 1366 / 1920 / iPhone 13)

Taken with `scripts/shots.cjs` (`feed-window`, `feed-queue`, `shorts-chat`) and a small script for the start state, the
Shorts view with a feed and the recap. The window is SH2's `ui/feed-window.ts`.

| # | Where | What a person sees |
|---|---|---|
| 1 | Start window, all sizes | A Discover chip (🔥 Popular, 🎵 Music …) **starts the feed at once** and closes the window: there is no "choose, then start". The box below has its own "Start". Two ways to start, neither says what will happen. |
| 2 | Start window, computer | A **centred modal over a blurred, dimmed room**: the Short / video he wants to keep watching is hidden while he sets up. |
| 3 | Start window | The kind tabs (♾ Shorts feed / ▶ Video feed) look like the feed's title, not a choice; "Start a feed" and "🎲 Discover: the most watched Shorts now" are two headings in a row; the country select hangs on the heading line (on the phone alone on its own line). |
| 4 | Start window | Labels are terse or technical: "Words, a video link or a channel's link / @handle", "From a channel", "Newest / Random / Most viewed" appear only for ▶; the line "Words follow a topic; a video link brings videos like it…" explains in one breath three different things. |
| 5 | Running feed window | "Steer it" is four button + sentence pairs (8 lines) and "Or start a new one" is a folded `<details>`: starting a different feed is hidden. Pause / Stop do not say they act **for everyone**. Nothing says **who** started the feed. |
| 6 | Phone | The sheet takes ~80 % of the screen (running state almost 100 %): only a sliver of the video is left. |
| 7 | Shorts view, computer | The rail is **11 icon-only buttons** (💬 😀 🎙 📹 ＋ 🎮 ♾ 🔁 ↩ ⋯ ▲▼) with no labels and no grouping. ♾, 🔁 and ↩ are not guessable. |
| 8 | Shorts view | A toast ("Nothing new left for 🔥 Popular, the feed stopped") **sits on top of the rail** and hides 🎮. |
| 9 | Shorts view | No sign that a feed runs, which one or who started it; the bare "1" between ▲ and ▼ is unexplained (videos left). |
| 10 | Shorts view, phone | The bottom bar has 💬 😀 ▲ 1 ▼ ⋯; ♾ (the feed) is hidden in ⋯. |

Everything below keeps today's feed engine (`shorts-feed.ts`, `@swm/shared/feed`): same sources (pools, topic,
`like`, channel, `chanOf`), same steer actions, same region list. Only the window, its wording and who may press it
change, plus the Shorts view tidy.

## What every option includes (FD1's asks)

1. **Choose first, then "▶ Start feed".** Tiles and the box only select (a ✓ on the picked one); a summary line says
   what will happen ("Will play: ♾ Shorts · 🎵 Music · 🇹🇷 for everyone"); one big primary button starts. Enter in the
   words box selects "your own" and moves focus to the button, it does not start.
2. **On the right, the video stays visible.** No backdrop and no blur: computer = a drawer on the right edge (over the
   side panel; in the Shorts view right of the rail, where the 💬 chat panel opens, which closes while it is open);
   phone upright = a half sheet (the top ~40 % keeps the video); phone sideways / tablet = the right-side drawer.
   Esc / ✕ closes with no change; focus returns to ♾.
3. **Everyone sees, anyone can cancel and start their own.**
   - A **feed pill** for everyone while a feed runs: top-left of the video in the room view, top-centre of the Short in
     the Shorts view: "♾ Feed: 🎵 Music · 12 left · by Sam   ⏸  ✕". ✕ stops it for the room (a toast to all:
     "Robin stopped Sam's feed").
   - The drawer's running state starts with that line + "⏸ Pause" / "✕ Stop" (both labelled "for everyone" in their
     tooltip), then the steer actions, then the same picker as a fresh start, where the button reads "▶ Start this feed
     instead" and the summary says "replaces Sam's feed".
   - New protocol field (optional, no version bump): the feed's `by` (display name only, like chat; never `cid`).
4. **Host rule** in Room rules (`settings.secRules`): "Only the host can start a feed" / "Akışı yalnızca yönetici
   başlatabilir", default off. Recommendation: when on, it covers **start, steer and stop** (otherwise anyone could stop
   the host's feed, which defeats the rule); pausing stays open to everyone, because pausing is ordinary playback. Guests
   then see the pill without ✕ and the drawer's button disabled-looking but still focusable, with the line "🔒 Only the
   host can start a feed in this room". Enforced on the server (`feed` messages from non-hosts refused with a code), the
   acting host counts as host.
5. **Tidy Shorts view** (same for every option):
   - The rail gets **three groups with small headings**: TALK (💬 Chat, 😀 React, 🎙 Voice, 📹 Camera) · WATCH (＋ Add,
     ♾ Feed, 🔁 Loop) · ROOM (🎮 Games, ↩ Room view, ⋯ More). **Labels beside the icons** when the free width beside the
     Short allows (it does at 1366 and up: ~600 px are empty today), icon + tooltip below that. ♾ shows "on" (accent
     border) while a feed runs.
   - "12 left" under ▲ instead of a bare number (`aria-label` "12 videos left in the feed").
   - **Toasts move under the Short** (bottom-centre of the video column), never over the rail or the chat panel.
   - Phone bottom bar: 💬 Chat · 😀 React · ♾ Feed · ▲ · ▼ · ⋯ More, with short labels under 💬, 😀, ♾, ⋯; voice,
     camera, loop, games and room view stay in ⋯. The feed pill sits top-left with its ✕.
6. **Words** (EN / TR, plain, no tech words):

| Place | English | Türkçe |
|---|---|---|
| Drawer title | Start a feed · (running) Feed | Akış başlat · (açıkken) Akış |
| Step 1 | What to watch: ♾ Shorts — short vertical clips, one after another · ▶ Videos — longer videos, back to back | Ne izlenecek: ♾ Shorts — kısa dikey videolar, art arda · ▶ Videolar — uzun videolar, art arda |
| Step 2 | Where they come from | Nereden gelsin |
| Tiles | 🔥 Popular now — Most watched today · 🎵 Music — Hits and new songs · 🎮 Gaming — Plays and clips · 😂 Comedy — Sketches, fails · 🐾 Animals — Cats, dogs, more · ⚽ Sports — Goals, highlights | 🔥 Şu an popüler — Bugün en çok izlenenler · 🎵 Müzik — Hitler ve yeni şarkılar · 🎮 Oyun — Oynanışlar ve klipler · 😂 Komedi — Skeçler, kazalar · 🐾 Hayvanlar — Kediler, köpekler, daha fazlası · ⚽ Spor — Goller, özetler |
| Own | 🔤 Or your own: words, a video or @channel (hint under the box once typed: "Topic: cats" / "Videos like this one" / "Channel: @name") | 🔤 Ya da kendin yaz: kelimeler, bir video ya da @kanal (yazınca altında: "Konu: kediler" / "Bu videoya benzerler" / "Kanal: @ad") |
| Channel order (only for a channel, ▶ Videos) | Newest first · Most viewed · Shuffled | Önce en yeniler · En çok izlenenler · Karışık |
| Step 3 | Country: 🌍 My country (Türkiye) / 🌐 World / a list | Ülke: 🌍 Benim ülkem (Türkiye) / 🌐 Dünya / liste |
| Summary + button | Will play: ♾ Shorts · 🎵 Music · 🇹🇷 for everyone · ▶ Start feed | Oynayacak: ♾ Shorts · 🎵 Müzik · 🇹🇷 herkes için · ▶ Akışı başlat |
| Pill | ♾ Feed: 🎵 Music · 12 left · by Sam | ♾ Akış: 🎵 Müzik · 12 kaldı · başlatan Sam |
| Host rule | Only the host can start a feed | Akışı yalnızca yönetici başlatabilir |

   The steer actions keep today's four, shorter: 📺 More from this channel · ✨ More like this one · 🌍 Same, other
   country ▾ · 🔤 New topic [box] Go; each with its line as a tooltip + `aria-describedby`, not a second text line,
   so the running drawer fits a phone without scrolling.
7. **Rules:** no scrolling inside the drawer at 1366 × 768 or on an iPhone 13 (the 6 tiles drop their second line and
   shrink on short screens; the running state folds the picker behind "Start a different feed ▾" only on phones under
   700 px tall); 44 px targets on phones; `:focus-visible` rings; the tiles are a radio group (arrow keys); the drawer
   is `role="dialog"` **without** `aria-modal` (the room stays usable), with a labelled close. YouTube attribution
   (logo + "Results from YouTube · Terms") stays at the drawer's foot. Nothing of ours over the YouTube player: the
   pill sits in our frame above / beside the player, never inside the iframe (needs a check per layout during build:
   in the Shorts view the pill goes above the Short, in the 2 px gap and the top bar, not on the video).

## Options

### A. "Right drawer, three short steps on one screen" (recommended)
Sketches: `feed-start/a-computer.svg`, `a-phone.svg`, `a-shorts-computer.svg`, `a-shorts-phone.svg`.

> Preview: a drawer slides in on the right; the video keeps playing beside it. **1 What to watch** (♾ Shorts | ▶ Videos,
> two big buttons with a line under), **2 Where they come from** (six tiles with a line each + "Or your own" box),
> **3 Country**, then "Will play: ♾ Shorts · 🎵 Music · 🇹🇷 for everyone" and **▶ Start feed**. A running feed shows its
> pill to everyone on the video.

- Everything visible at once, so a person sees all choices and the result before pressing; one click fewer than B.
- Same drawer in the room view and in the Shorts view; the phone gets a half sheet with the same three parts.
- Cost: the most build work of the three (the drawer, the pill, the Shorts rail labels), but no new engine work.

### B. "Three steps, one at a time"
Sketch: `feed-start/b-steps.svg`.

> Preview: the same right drawer, but one question per screen with a progress bar: "What to watch?" → "Where should the
> Shorts come from?" (big list rows) → "Which country?" with **▶ Start feed** on the last step; ‹ Back on each.

- Very calm, big targets, easiest on a small phone.
- Slower for people who already know what they want (3–4 clicks every time); the result is not visible until step 3.
  Good for first-timers, tiring for regulars.

### C. "Ready-made feed cards"
Sketch: `feed-start/c-cards.svg`.

> Preview: the drawer lists ready feeds as large cards ("🎵 Music — New songs and hits, back to back", "🔥 Popular in
> Türkiye — What most people watch right now" …), a ♾ Shorts | ▶ Videos switch at the top, a dashed "🔤 Make your own"
> card, the country as one line, and **▶ Start "Music" for everyone**.

- The fastest to read; each card says what it is in human words.
- Shorts vs videos becomes a small switch that is easy to miss; the custom feed (words, a channel) is one card among
  many; and six cards + "make your own" need ~560 px of height, so on short laptop screens the list scrolls unless the
  descriptions are dropped.

## Recommendation
**A.** It answers every ask on one screen (choose, see the result, start), keeps the video visible on every size, and
its parts (pill, rail groups, toasts under the Short) also fix the Shorts view. B is the fallback if the owner finds A
too busy on a phone: the phone could use B's one-question-per-screen while the computer keeps A.

## For the build (lane A, after the pick)
- `ui/feed-window.ts` / `.css` become the drawer; `room.ts` adds the pill and the rail groups (`#shorts-bar`,
  `.yt-rail` / `#fs-dock` labels), toasts get a Shorts-view anchor.
- Protocol: optional `by` on the feed info and the room setting `feedHostOnly` (both optional, no `PROTOCOL_VERSION`
  bump); server refuses `feed` start / steer / stop from non-hosts when it is on, e2e for both ways.
- Test Lab hook `feed.start` (opens the drawer with a fixed pick and starts it); texts in `i18n.ts` + `i18n-tr.ts`
  (or the chunk's `TEXT`); shots at 4 sizes (`feed-window`, `shorts-chat` + a new `shorts-feed` screen).
