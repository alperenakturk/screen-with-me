# The session recap, redesigned (card RC1)

_Design session, 16 Nov 2026, for card RC1 (`docs/internal/CARDS.md`). Status: **options, waiting for the owner's
pick** (the Planner asks). Build only after the pick (lane A). Sketches (Night theme, English): `session-recap/*.svg`,
made by `feed-recap-sketches.mjs`._

## Today (screenshots of `main`, 16 Nov 2026)

- Entry: Profile menu → "✨ Today's recap" (`#recap-open`, also ⋯ More → ✨). Few people open the Profile menu during
  a film; nothing points there.
- Look (`ui/recap.ts`): a **phone story card** (400 × 680 on a 1366 laptop) over a dimmed room, progress bars on top,
  tap left / right. Purple-pink gradients that are not the Sidelit night-gold palette; the room behind is hidden.
- It plays **only for the person who pressed it**; nobody else knows it exists.
- Wording: the title says "Today's recap" although the stats are per session (`SESSION_GAP_MS`, 4 h), not per date;
  "0 videos · 1 people" (plural bug) on a short session.

## What every option includes

- **Horizontal, windowed, in the video's place.** A 16:9 show inside the player area (the room view's video box; a
  game's "big" mode uses the same place). Never fullscreen by itself (only videos go fullscreen, CLAUDE.md §7), never
  over the YouTube player: the player is paused and our show replaces it in the box, as a newly opened video would.
  Chat, people and voice stay usable beside it.
- **Our brand on every scene:** the D1 logo + "Sidelit · Session recap" top-left, the logo's **light cone** sweeping
  across each background (the family trait), Glowbeam (`mascot-n1-expressions`) on the opening and closing scene.
- **Each fact its own cute background** (`session-recap/look-a-scenes.svg`), from the existing facts in
  `@swm/shared/recap` (`chooseFacts`), 5–8 per show, ~5 s each, ~45 s in all:

| Fact | Scene | Palette (text contrast ≥ 4.5:1) |
|---|---|---|
| time (how long, when it started, how many people) | **Night sky**: stars, Glowbeam watching | `#22174f → #08061a`, cream text |
| emoji (most-used, who sent it most) | **Emoji rain**: that emoji falling softly | teal `#0f766e → #073b3a`, white text |
| talker | **Bubble pop**: chat bubbles drifting up | pink `#ffd7e2 → #ff9bb8`, plum text `#3b0f2a` |
| videos (count, last title) | **Film reel**: sprocket strip along the bottom | cream → gold `#fff3d6 → #ffc65a`, brown text |
| crowd (most people at once, avatars) | **Front row**: a row of cinema seats with the avatars | blue `#1e3a8a → #0b1430`, white text |
| pauser / seeker | **Snack break**: popcorn | yellow `#fde68a → #f59e0b`, brown text |
| laugh / sad / reactor / pins / speed | variants of the above (confetti, rain of 😢, pin board, a speedometer) | |
| summary (last) | **Poster**: big logo, all numbers in a row, "⬇ Save image", "▶ Back to the video" | night |

- **Accessible:** each scene's text is real text (screen readers get it via `aria-live="polite"`); ⏸ / ▶, ← / → keys,
  a labelled "✕ Close for me"; `prefers-reduced-motion`: no sliding or falling, scenes cross-fade and wait for ▶;
  no flashing. Fits 16:9 at any size without scrolling (text scales with the box, `cqi` units).
- **Fixes:** "Session recap" / "Oturum özeti" (not "Today's"), correct plurals ("1 person"), no scene for a zero.
- **Privacy:** no new data. The facts are counts the room object already keeps (`StatsTracker`). New: one timestamp
  per session (`shownAt`) and transient "ask the host" requests; names shown are display names already in the room.
  "Don't remind me" lives only in the browser (`localStorage`). So `privacy.html` needs no change unless the owner picks
  music from an outside library (then only `third-party-notices.txt`).

## The session rule (RC1's proposal, checked)

Proposal: a **session** starts after a gap of **≥ 4 h without activity** in the room (activity = a video playing with
someone present, a chat line, a reaction, a pin, a new video); the recap can be shown **once per session**, only after
**≥ 30 min watched**; after it is shown it cannot be shown again in that session; the next session resets it.

Worked examples (the owner's words; times are the room's activity, any time zone):

1. **Thursday 22:00 → Friday 02:00, one evening across midnight.** Gaps inside are minutes, so it is one session
   (22:00–02:00), 4 h watched. The recap unlocks at 22:30 (30 min watched). If the host shows it at 01:50, it covers
   22:00–01:50 and is locked for the rest of the night. Midnight changes nothing: right ("a day is a session").
2. **Friday 20:00, 3 h (20:00–23:00).** The last activity was 02:00, 18 h earlier (≥ 4 h): a new session, the lock
   from Thursday is gone, the recap unlocks at 20:30 and shows Friday's numbers only. Right.
3. **11:30 for 1.5 h (11:30–13:00), about 20 h after the last watching** (read as: the room's last activity was ~20 h
   before 11:30, e.g. the evening before). ≥ 4 h: a new session; 90 min watched → the recap unlocks at 12:00. A late
   morning watch gets its own recap. Right.

Two more cases that test the edges:
4. **Dinner break:** 18:00–19:30, pause, 22:00–23:30. The gap is 2.5 h (< 4 h): one session "this evening", 3 h. Good:
   people feel that as one evening.
5. **Afternoon and night:** 14:00–15:00, then 19:30–21:00. Gap 4.5 h: two sessions, each with its own recap. Good.

**Verdict: keep the rule, with four small improvements.**
- (a) **Say "≥ 4 h" everywhere**: the code today starts a new session only when the gap is *more than* 4 h
  (`now - last > SESSION_GAP_MS`); use `>=` so the card, the help page and the code say the same.
- (b) **Count 30 min of watching together**: the 30 min count only while **≥ 2 people** are in the room (the room
  already knows its `peak`). A solo test does not unlock a "together" show; the Test Lab hook `recap.show` bypasses it.
- (c) **Shown means "played for everyone"**: the lock is set when the host's show starts (server `shownAt`), not when
  someone opens it alone; "✕ Close for me" does not unlock it, and a cancelled request does not lock it.
- (d) **The whole session is still kept:** when a session ends (the next activity after a ≥ 4 h gap), its full recap
  goes into the room's recap list as today (`RECAPS_KEEP`), so a show at 22:45 does not lose 22:45–02:00: anyone can
  replay the full one alone from ✨ → "Earlier recaps" (alone, not for everyone; no lock involved).

## Entry point (findable, not screen-filling)

### E1. A ✨ button on the rail that appears when it is ready (recommended)
> Preview: from the moment a session is eligible, a ✨ **Recap** button joins the rail beside the video (room view:
> `#fs-dock` / `.yt-rail`; Shorts view: the ROOM group; phone: the bottom bar's ⋯ and a ✨ on the video's top bar)
> with a small gold dot until someone opens it. Hidden before 30 min, gone (or "Earlier recaps" only) after the show.

Sketch: `session-recap/entry-flow.svg` ①. Findable exactly when it means something; one 42 px button, no panel.

### E2. ✨ in the top bar next to Invite
> Preview: "✨ Recap ready" as a small chip in the room's top bar, the same rules. More visible, but the top bar is
> already full on 1366 and phones, and it is far from where people look at the end (the video).

### E3. Profile menu, as today, plus the end card only
> Preview: keep today's place and add the end-of-queue button (N1 below). Least change, but still hard to find during
> the evening.

## End-of-session nudges (we cannot know when the tab closes)

Use signals that a session is *probably* ending, at most **one nudge per person per session**, never after the recap
was shown, never for a person who pressed "✕ Don't remind me" (stored in the browser), and never as a popup over the
video. Recommended set: **N1 + N2 + N4**.

- **N1. The queue ran out (recommended).** The existing "Video ended / ▶ Play next / Close" end card gets, for the
  host, **"✨ Show this session's recap to everyone"** (guests: "🙋 Ask the host to show the recap"), only while
  eligible. The most natural "the evening is over" moment.
- **N2. Late and long (recommended).** After ≥ 90 min watched and once the local time passes 23:00 (or 3 h watched at
  any time), one quiet line under the video with Glowbeam: "Long night! The recap of these 3 h 12 min is ready under ✨
  whenever you like. ✕". It fades after 12 s.
- **N3. A long pause.** Paused for ≥ 10 min after ≥ 45 min watched: the ✨ button glows once (no text). Gentle, but
  pauses are often toilet / snack breaks; optional.
- **N4. The next session's opening (recommended).** If a session ended without a show, the first person in the next
  session sees for 10 min a small chip "✨ Last time's recap (Fri, 3 h) ▸" that replays it **alone**. This catches
  everyone who simply closed the tab, without interrupting anybody.
- Rejected: reading "bye / good night" in the chat (feels like we read their messages), and the browser's "leave page?"
  prompt (`beforeunload`, nags exactly those who want to leave).

## Flow (who starts it)

### F1. The host shows it, guests ask (recommended; the owner's lean)
Sketch: `session-recap/entry-flow.svg` ②–④.
> Preview: the host presses ✨ → it plays for everyone in the video's place, synced, with a 3-2-1 from Glowbeam. A
> guest's ✨ opens "✨ The recap is ready (1 h 40 min) · 🙋 Ask the host to show it"; the host gets one toast "🙋 Sam
> asks to see the recap · ✨ Show to everyone · Not now" (names merge if several ask).

- Server: a room-wide show state (like a video), `{ t:'recap-show' }` from the host only (the acting host counts), the
  recap's facts chosen once on the server so everyone sees the same scenes in the same order at the same moment
  (`ServerClock`); a late joiner lands in the right scene. "Ask the host": `{ t:'recap-ask' }`, one per person per
  10 min (server rate limit), never stored.
- The current video is **paused and kept**: the queue does not change; at the end (or when the host presses "▶ Back to
  the video") the paused item comes back at the same second. If the room is in the **Shorts view it switches to the
  normal view** for the show and back after. On an extension film page the show opens in the room view (🏠) and the film
  pauses; "Go to the film" after.
- Each person may "✕ Close for me" (they return to the paused video); only the host ends it for everyone.

### F2. Anyone starts it, anyone can cancel (a 10-second count)
> Preview: any person presses ✨ → everyone sees "Alex wants to show the recap · starts in 10 s · ✕ Cancel"; if nobody
> cancels, it plays for everyone. Host rule in Room rules: "Only the host can show the recap" (default off).

- Same server show state; no "ask" step. Faster in friendly rooms; in a bigger room one person can interrupt a film, so
  the count and Cancel are needed, and it can feel like a vote every time.

### F3. Everyone watches it alone
> Preview: ✨ plays the show for the person who pressed it, in their own video box, no sync, no host.

- Simplest (close to today, new look only), no protocol work; but the shared "look what we did" moment, the thing the
  owner wants people to love, is lost.

## Look

### L-A. "Night stage" (recommended)
Sketches: `session-recap/look-a-stage.svg`, `look-a-scenes.svg`, `phone.svg`.
> Preview: one scene at a time fills the 16:9 video box; each scene slides in from the right with its own background
> (night sky, emoji rain, bubbles, film reel, front row, popcorn), our logo and light cone on all; under it a **filmstrip**
> of small coloured frames shows where we are (click one to jump, for yourself).

- Big, readable numbers at every size; the scenes are where the "cute" lives; the filmstrip replaces the story bars.
- Phone upright: the 16:9 frame where the video is, chat below; sideways: fills the screen like a video.

### L-B. "Filmstrip"
Sketch: `session-recap/look-b-filmstrip.svg`.
> Preview: the whole session as a strip of film moving right-to-left on its own, two to three frames in view, the
> middle one lit; sprocket holes above and below.

- The most "cinema" and the most horizontal; frames are smaller, so numbers are smaller (on a phone one frame at a time).

### L-C. "Postcards"
Sketch: `session-recap/look-c-postcards.svg`.
> Preview: each fact is a postcard with a Sidelit stamp, dealt onto a wooden table one by one, slightly tilted; the last
> frame is the whole collage, saved as one image.

- The warmest and the best "Save image" (a collage people can share); busier, and text on tilted cards is harder to read
  on a phone.

## Music (optional, every look)

- **Recommended: our own, generated.** A 45 s loop made with Web Audio from the room's existing **"A warm pad"** family
  (`packages/shared/src/sounds.ts`, the same F-major notes as the intro): nothing to licence, no file to download, matches
  the brand's sound. On by default **only** for people whose room sounds are on, at a low level, quieter while someone
  talks in voice, 🔊 / 🔇 on the show's controls; off with reduced-sound settings.
- Acceptable: a **CC0** track (public-domain dedication) checked one by one, self-hosted (CSP: our own origin), listed in
  `apps/web/public/third-party-notices.txt`. CC-BY needs visible credit on every showing; avoid.
- Not allowed: popular songs, "royalty-free" stock (paid licences with redistribution limits), YouTube Audio Library
  tracks (their licence is for videos on YouTube), anything AI-generated whose terms are unclear.

## Recommendation
**L-A + E1 + F1 + nudges N1, N2, N4 + our own generated music, and the session rule with the four improvements.** It
is the owner's lean, keeps the show readable on a phone, puts the entry exactly where and when it means something, and
adds no new personal data.

## For the build (lane A, after the pick)
- `ui/recap.ts` (+ a lazy `recap-show` chunk with its own `TEXT` in EN + TR), `room.ts` (rail ✨, end card button,
  show state in the player box, Shorts view switch), `packages/shared/recap.ts` (`>=` gap, `shownAt`, `peak ≥ 2`
  for the 30 min), server: `recap-show` / `recap-ask` (host check, rate limit, protocol optional fields only).
- Test Lab hook `recap.show` (a fixed recap, skips the 30 min / 2 people), e2e "once per session" (second show refused,
  next session after a 4 h fake gap allowed), shots at 4 sizes, `privacy.html` checked (no change expected).
