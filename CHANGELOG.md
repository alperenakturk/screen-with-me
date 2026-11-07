# Changelog

What changed for people using Sidelit, newest first. The website and the extension share one version number (shown
in the site's footer and on the extension page). Every version that went live after its tests passed is tagged in
this repository as `v<version>` (from 0.9.97.70 on).

Versions count in four parts before 1.0: the fourth part is a release, the third part moves for a bigger step.

## 0.9.97 — 3 to 7 November 2026

### 0.9.97.72 — 7 Nov
- The hidden test panel speaks plain English and Turkish, following the site's language (also when you switch it),
  with green / yellow / red dots for what is fine and what is not; its search finds a command in either language.

### 0.9.97.70 — 7 Nov
- Behind the scenes: this changelog, a version tag for every release that goes live, and a check of the live site
  every 30 minutes that tells us at once when it is down.

### 0.9.97.69 — 7 Nov
- The hidden test panel now opens on the live site only with the owner's code.

### 0.9.97.68 — 5 Nov
- Games on a phone: every button is big enough to tap; Glowbeam plays smarter on medium and fairer on
  easy; better "How to play" cards; easier aiming in Sea Battle.

### 0.9.97.67 — 5 Nov
- On an upright tablet the test panel opens as a sheet at the bottom; menus no longer offer cinema mode or keyboard
  shortcuts on a tablet without a mouse.
- The help page and privacy policy name the daily limit for uploaded images (20 MB per address).

### 0.9.97.66 — 5 Nov
- Terms of use, in English and Turkish, with a way to report abuse or a copyright problem (we answer within 72 hours).
  Linked from the footer, the join card, the profile menu and the help page.

### 0.9.97.65 — 5 Nov
- New on the Classics shelf: Reversi, against a friend or against Glowbeam.

### 0.9.97.64 — 5 Nov
- Cameras on phones: switching between the front and back camera happens in place ("Camera changing…" for the
  others), a camera picture that goes black or pauses recovers by itself, and only your own front camera is shown
  mirrored. A 🔄 button in the phone's faces strip switches camera.

### 0.9.97.63 — 5 Nov
- On a tablet a game's window opens beside the chat instead of over it.

### 0.9.97.62 — 5 Nov
- "📱 Scroll Shorts together" on the home page: one press makes a room that starts a feed of popular Shorts.

### 0.9.97.61 — 5 Nov
- New room game: 🚢 Sea Battle. Two hidden fleets, shots in turns, a hit shoots again; play a friend or Glowbeam.

### 0.9.97.60 — 5 Nov
- The privacy policy was rewritten for KVKK and GDPR: who is responsible, what is kept and for how long, your rights
  and how to use them.

### 0.9.97.59 — 5 Nov
- Every room game opens in its own small window. Classics starts on a game picker, and "Change game" works at any
  time (mid-game it asks first).

### 0.9.97.58 — 5 Nov
- Film page: the games hall shows inside the side rail, and the film's own fullscreen button now switches the room's
  fullscreen.

### 0.9.97.57 — 5 Nov
- Every game fits its window on a laptop and a phone with readable text; Quiz and Draw & Guess wait 20 s for a
  player whose connection drops; a reload reopens the game you had open.

### 0.9.97.56 — 4 Nov
- "Keep the controls open" now keeps the side rail out in the window too, not only in fullscreen.

### 0.9.97.52 to 0.9.97.55 — 4 Nov
- The room page loads less code up front (voice check, streaming and some players load when first needed).
- Rooms recover more reliably on networks without WebSockets.
- More tools in the hidden test panel for checking video, network and two-person scenarios.

### 0.9.97.47 to 0.9.97.51 — 4 Nov
- Security: uploaded images count against a daily budget across all rooms; tighter limits on diagnostics and usage
  requests; standard safety headers on every server answer.
- More tools in the hidden test panel for the games.

### 0.9.97.46 — 4 Nov
- Chess and backgammon on the Classics shelf, against a friend or Glowbeam.

### 0.9.97.44 and 0.9.97.45 — 4 Nov
- A hidden test panel (`?debug=1`) for finding and reporting bugs, with pretend friends that join the room.

### 0.9.97.40 to 0.9.97.43 — 4 Nov
- Draw & Guess: 12 word categories, an eraser and redo.
- Room shortcuts work right after a click on the video.
- In fullscreen, chat messages appear below the rail's message box and never jump.
- The home page's picture fills each screen; the avatar picker is one grid.

### 0.9.97.33 to 0.9.97.39 — 4 Nov
- A new look for the home page's light beam.
- Classics: one table for XOX, Four in a Row and dama, with Glowbeam as referee and opponent.
- Quiz: almost 1200 questions that go from easy to hard and avoid the ones you have seen.
- In fullscreen, chat messages come in on the right with bigger text.
- While someone streams, the Together card stays compact.
- The Opera Night theme was retired.

### 0.9.97.29 to 0.9.97.32 — 4 Nov
- Side games: a shared tip jar for Snack Bar, gifting a Window Garden cutting to a friend, customers, badges,
  new cinema places, hybrid flowers and an album with memories.
- Side games only move while a film plays in the room.
- Most parody avatars were replaced by our own genre characters.

### 0.9.97.20 to 0.9.97.28 — 4 Nov
- Two names in one browser count as two people; each tab keeps its own name after a reload.
- Clearer order on entering a room: the intro, then the invite window and tips; nothing shows while you wait at the
  door.
- English page addresses (`/connection`, `/extension.html`); the old ones still work.
- Home page: a laptop, a tablet and a phone showing the same moment, with Glowbeam in your theme's costume.

### 0.9.97.12 to 0.9.97.19 — 4 Nov
- Private messages in the chat.
- One place for each thing in the menus; the intro plays on your first entry into a room.
- A reloaded viewer gets the stream back; the knock cards follow whoever is host.

### 0.9.97 to 0.9.97.11 — 3 Nov
- "Ask before letting people in": a door the host can turn on.
- A stream and a game survive a short connection drop or a server update.
- Two people with the same name and avatar are told apart.
- Side games got "How to play" cards and a size that fits.
- Security fixes: TikTok links, deploy secrets, a privacy link everywhere, older data cleaned up on time.

## Earlier versions (summary)
- **0.9.96 (3 Nov 2026):** send feedback from the room, a thanks page, a hidden test panel, move your things to
  another device with a code, podcasts, cinema mode, tablet layouts, a new home page, accessibility pass, YouTube
  attribution and usage limits, many security fixes.
- **0.9.95 (3 Nov 2026):** the name Sidelit with its logo and mascot Glowbeam, the first side games (Snack Bar, Window
  Garden, Five Frames) and the games gallery.
- **0.9.93 (2–3 Nov 2026):** one side rail on every screen, the invite window with a QR code, "3-2-1, together"
  before a new video, a help page, Vimeo links, YouTube in privacy-enhanced mode.
- **0.9.92 (31 Oct – 2 Nov 2026):** rooms work on networks where WebSockets never open; the phone room rebuilt as an
  app screen; a bigger room on a computer.
- **0.9.90 and 0.9.91 (29–31 Oct 2026):** sound effects, YouTube search, endless Shorts feeds, TikTok links, camera
  windows, a check before joining voice, phone layouts.
- **Before 0.9.90 (October 2026):** synced YouTube and video files, the browser extension for films on other sites,
  voice and cameras, screen sharing, games, custom emojis, saved rooms and the daily recap.
