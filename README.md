<div align="center">

# ▶ Sidelit

_Formerly ScreenWithMe._

**Watch any video together, in perfect sync.**<br/>
Free · no accounts · no ads · works on YouTube and on (almost) any website.

[**Live site**](https://screen-with-me.swm-server.workers.dev) ·
[**Get the extension**](https://screen-with-me.swm-server.workers.dev/extension.html) ·
[🇹🇷 Türkçe](README.tr.md)

![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers%20%2B%20Durable%20Objects-f38020?logo=cloudflare&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-4285f4?logo=googlechrome&logoColor=white)
![Tests](https://img.shields.io/badge/tests-251%20unit%20%2B%20e2e%20%2B%20real%20Chrome-3ccf8e)
![Version](https://img.shields.io/badge/version-0.9.81-7c5cff)
![License](https://img.shields.io/badge/license-MIT-blue)

</div>

---

Send a link, and everyone watches the same second. If anyone pauses, seeks or changes the speed, it happens
for everyone. Chat, voice, cameras, reactions, games and a shared queue sit around the video.

- **YouTube, YouTube Shorts, TikTok, Vimeo links, a podcast episode (🎧 Podcasts on the search results) or a video file** → plays right on the site, nothing to install. No link at
  hand? Type words and search YouTube from the same box.
- **Any other site** (the page has an HTML5 `<video>`, even inside an iframe) → the tab goes to that site and,
  with the browser extension, the **room itself** opens over it, with the video sitting in the room's player area.
  Works on sites that forbid being framed, too.

## ✨ What's inside

### Watching together
| | |
|---|---|
| ⏯️ **Tight sync** | Play / pause / seek / speed (0.25×–4×, YouTube up to 2×) for everyone. Server-time based, measured **30–100 ms** apart on real players; small drift is closed silently by playing ±5 % faster or slower. A new video starts with a short "3, 2, 1, together!" so everyone begins at the same moment (the host can turn it off). |
| ⏳ **Everyone ready** | If someone's video stalls, the room waits for them (at most 12 s). Someone watching an ad never holds the room up. |
| 🧩 **Any website** | The extension finds the right video, also inside iframes and in players that load late or switch sources, and skips typical ads (short, muted looping or small corner videos). Wrong video? **🎯 Pick video** lets you choose. Pop-up ad tabs are closed and redirects keep the room open (both can be undone). |
| 🖼️ **Room over the film page** | The site's own room page opens as a layer over the film page, with a hole where the video goes. **👁 Show page** steps the room aside to close a pop-up covering the video. |
| 🖥️ **One remote** | Every player keeps its own bar (quality, captions, chapters), and the video is as big as the screen allows. Our buttons live in one slim rail: message, emojis, pin, game, mic, camera, screen share, ⋯ (speed, sync, next, side panel) and fullscreen. With YouTube the rail sits beside the video, never on it: it opens when the mouse reaches the video's right edge and closes when it leaves, in the window and in fullscreen, a window opened from it too ("Keep the controls open" in ⋯ or Settings pins it), and the room's notes appear in the chat panel instead of on the video. Press ? for the keyboard shortcuts. |
| 📱 **Shorts view** | A Shorts or TikTok link turns the room vertical: the video in the middle, friends seated on both sides, messages as bubbles and reactions rising from their avatars, cameras inside the avatar circles. ↑ / ↓, the mouse wheel or a swipe move everyone to the previous / next short; 🔁 loops. ♾ **Shorts feed** keeps the queue full on a topic, **🎲 Discover** picks popular categories and **✨ More like this** follows the playing short. TikTok plays in TikTok's official player. |
| 🔎 **YouTube search** | Type words and press 🔍 Search (or Enter): results open under the box; add one to the queue or play it now. Shorts are marked 📱 and open in the Shorts view. The API key stays on our server. |
| 🧪 **Sync test** | A built-in 12-second counter; a badge shows how far apart you are. |

### Together
| | |
|---|---|
| 🔗 **One link, no accounts** | Open a room and the invite window is already there: the link with Copy, Share or WhatsApp, and a QR code a friend next to you can scan with their phone. The invite opens one short screen for them: who is waiting and what is playing, their name and avatar, one button in. Three small tips show the way the first time. Paste a link anywhere in the room (or drop it on the page) and it goes to the queue. Every room gets a friendly name (like "Velvet Lounge"), and the home page offers "Continue where you left off". Name and avatar are kept per room. |
| 🎙 **Voice & cameras** | Join voice and talk while you watch: mute, push-to-talk (hold V), see who speaks. Cameras as free windows you drag and resize, a spotlight layout, or one window; in fullscreen they move onto the video. Per-person volume, mute and hide just for you; a pre-join check to pick microphone, camera and speaker. Voice survives reloads and short connection drops. Peer-to-peer and encrypted (the server never hears it), up to 6 people and 4 cameras; the room says before you join that people in voice can see each other's IP address. Works on film pages too. |
| 📺 **Screen sharing** | Share a screen, window or tab (with your camera in the corner if you like) to up to 4 viewers, 720p, peer-to-peer. The picture sits in the video or floats anywhere; "sharp text" or "smooth" quality. Not for re-broadcasting films. |
| 💬 **Chat & reactions** | Messaging-app bubbles, images (paste or drop), safe clickable links, private messages to one person (🔒, never kept in the room's history). A 😀 React tray with emoji pages and custom emojis (images / GIFs added to one room, optionally kept in your own collection); reactions rise with the sender's name. 📌 Pins mark moments with a note. |
| 🎮 **Games in the room** | Classics (one table with a shelf of board games: tic-tac-toe, Four in a Row, Turkish draughts (dama) and chess, against a friend or against Glowbeam (easy or medium) when you're alone), Last Heart (a 2–6 player card game where you bet life instead of chips), Draw & Guess and a quiz (almost 1,200 questions in 11 topics, easy to hard, the ones you have seen rarely come back; Turkish / English). A games gallery with a picture card per game ("Together" / "On the side"), up to 4 tables at once; games open in a free window or in the video's place while the film keeps going. **Play on the side:** 🍿 Snack Bar, a little idle game of your own that earns only while you are in a room and its video plays (nothing while you are away) (more with friends, more in voice; everyone's serves fill the room's shared tip jar for +10 %), and 🌱 Window Garden, plants on a window sill that grow while you watch and fill an album (a bloom can give a cutting to a friend in the room), and 🎟️ Five Frames, one five-letter word a day in English or Turkish (a solid frame ✓ right place, a dashed frame • in the word, a faded × not in it); each one starts with a few "How to play" picture cards; a game window's ✕ only puts it away (a game is never lost by it, and the browser asks before you close the tab mid-game); your progress stays in your browser (📲 "Move to another device" takes it to your phone once with a 6-digit code). |
| 🎵 **Queue & voting** | Add, reorder, play now; paste up to 30 links at once. 👍 votes reorder the queue; auto-next can be turned off. |
| ⏰ **Film time** | Plan the start ("in 30 minutes", "tonight 9 pm" or any time); everyone sees a countdown and the video starts for all at once. |
| 💾 **Saved rooms & recap** | One-off or named saved rooms (kept 30 days) that remember where each video stopped. A playful recap of the session with a downloadable image. |

### Everywhere
| | |
|---|---|
| 📱 **Made for phones** | On a phone the room is an app screen: the video edge to edge, everyone's faces and cameras under it, then the chat. ＋ and ⋯ open bottom sheets (add a video, games, invite, settings…), the back button closes them, ⛶ gives a real fullscreen (iPhone too) with a slim column of buttons beside the video. Shorts and games take the whole screen. Everything except film pages works on a phone. **Tablets:** upright, the video sits on top with its buttons beside it and two columns below (the chat; Together, Queue and People), with no scrolling; sideways, the room looks like it does on a computer. |
| 📶 **Hard networks** | On networks where WebSockets never open (some phone hotspots) the room switches by itself to an HTTP fallback and back again when it can. If a room can't be reached, "Try again" and a connection test are one tap away. |
| 📲 **Install as an app** | The site installs as an app on phones and computers and always loads the latest version. |
| 🎨 **Look & sound** | 11 themes (plain and illustrated), a short intro, soft generated sound effects (no files; adjustable or off). English and Turkish, on the site and in the extension (English by default). |

### Host & safety
| | |
|---|---|
| 👑 **Room host** | The first person in is the host and sets the rules in ⚙️ Settings: host-only playback, locked queue, emoji limits, host-only streams, ready check. If the host is gone for more than 20 s, hosting passes to whoever has been in the room longest. The host can hand the role to someone else (👑 in People), remove and ban people, and turn on "Ask before letting people in": someone new waits at the door until the host lets them in or refuses. |
| 🔐 **Private by design** | Video plays in each person's own browser; the server only relays small "pause at 12:34" messages and the room's chat. The extension is dormant outside a room, and the film page can't read which room you are in. User text is never written as HTML; rate limits (also per IP), an origin check, a strict Content-Security-Policy and a frame guard protect the site. |

## 🧠 How it works

```mermaid
flowchart LR
  subgraph A[Alex's browser]
    SA[Site / extension] --> EA[Sync engine]
    EA <--> PA[(Player)]
  end
  subgraph B[Sam's browser]
    SB[Site / extension] --> EB[Sync engine]
    EB <--> PB[(Player)]
  end
  EA <-- WebSocket --> R{{Durable Object<br/>one per room}}
  EB <-- WebSocket --> R
```

- **The server is the single source of truth.** A room's state is just `{ item, paused, position, rate, updatedAt }`;
  the current position is `position + (serverNow − updatedAt) × rate`. Messages are only sent when someone *does* something.
- **Clock sync.** Clients estimate server time with a few ping/pongs (a mini NTP) and do all math in server time.
- **"Was that the user or me?"** When the engine commands the player it records which event it expects
  (e.g. one `pause`). Expected events are ignored for a moment; anything unexpected is a user action.
  This prevents echo loops without swallowing a real pause.
- **Seeks** are detected from unexpected jumps in time (YouTube has no seek event).
- **Drift** above 1 s jumps back into place; smaller drift is closed by playing ±5 % faster/slower.
- **One Durable Object per room**: rooms scale independently; with WebSocket Hibernation an idle room costs
  nothing. Timers that must survive sleep (ready-check timeout, scheduled start, room deletion) use one storage alarm.
- **Networks without WebSockets** (some phone hotspots): if the WebSocket doesn't open within 6 s the client switches
  by itself to an HTTP fallback (a held request for what the room says, small posts for what we say) with the very
  same messages and rules, and moves back to a WebSocket once one opens again.

### Extension in one paragraph
A Manifest V3 extension with no UI and no room connection of its own. When a page is opened in a room, the site
sends the tab there; on the film page the extension opens `shell.html` as a full-screen layer, which asks the
background for the room and loads the site's room page (`/r/ROOM?shell=1`). The site keeps the room connection;
the extension only relays: a content script in every frame reports its best video, the background picks the
winner and the same sync engine as the site runs there, playback messages go to the site, room state comes back.
The site reports where its player area is; the top frame clips a hole there (`clip-path`) and moves the film's
player into it.

## 🧪 Quality

| Check | What it covers |
|---|---|
| Unit tests (`npm test`) | 256 passing: sync engine with a fake clock and player, protocol validation, room rules, ready check, game rules, sound policy, the HTTP fallback, recap, video scoring |
| End-to-end (`npm run e2e`, in CI against a local and then the live server) | Fake users against the real server code: queue, chat, images, host and kick, handover, ready check, pins, custom emojis, host modes, saved rooms, recap, Shorts, search, voice / stream signalling, every game, the HTTP fallback |
| Real Chrome with the extension (`scripts/harness/embed`) | The room layer over a film page: hole placement, no page flash, see-through messages, the film's own bar kept, the dock, video picker, ad tabs, redirects, pre-roll ads |
| Real voice, cameras and streams (`scripts/harness/voice`) | Two Chromes with fake devices: received audio energy and camera frames are measured, on the site and on film pages; free camera / stream windows; browsers that block direct connections |
| Phones, Shorts, YouTube room, TikTok, sounds, hotspot (`scripts/harness/*`) | iPhone and Android layouts, the Shorts rail at many screen sizes, nothing over the YouTube player, a stand-in for TikTok's player protocol, which sounds really play, a proxy that swallows WebSockets |
| Real players (extension code on public demo pages) | **Plyr, hls.js, Video.js**: detection ✓, remote and local actions ✓, 26–100 ms apart |

## 🛠️ Tech

TypeScript (strict) everywhere, no front-end framework · Vite · Cloudflare Workers + Durable Objects
(SQLite-backed, WebSocket Hibernation) · Chrome Manifest V3 + esbuild · Vitest · GitHub Actions.

```
packages/shared   protocol + validation, room rules, sync engine, clock, connection, media parsing,
                  ready check, recap, video scoring, logo
apps/server       Worker + Durable Object (one per room)
apps/web          the site (plain TS/HTML/CSS)
apps/extension    browser extension (background, content script, room layer "shell", site bridge, popup)
scripts/          end-to-end tests, real-Chrome extension harness, icon / theme art / avatar generators
store/            Chrome Web Store package and screenshots
```

## 🚀 Development

Requires Node.js 20+ (CI uses 24).

```bash
npm install
npm run dev          # server on :8787 + site on :5173 (proxies /api)
npm test             # unit tests
npm run typecheck
npm run e2e          # end-to-end against the local server
```

Extension: `npm run build:extension:dev`, then `chrome://extensions` → Developer mode → **Load unpacked** →
`apps/extension/dist`.

Deploy: every push to `main` is tested and then deployed by GitHub Actions (needs the `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID` repository secrets), followed by the end-to-end tests against the live server.
Locally: `npx wrangler login` once, then `npm run deploy`.

## 🗺️ What's next

Chrome Web Store release, more games, a short domain, Firefox; after 1.0 a TV version with Google Cast (the phone
as the remote).

## 📄 License & privacy

[MIT](LICENSE) © 2026 Alperen Aktürk. All shipped code (site, server, extension) is our own; build tools are
MIT / Apache-2.0. Privacy policy: [privacy.html](https://screen-with-me.swm-server.workers.dev/privacy.html?lang=en)
(no accounts, no tracking; a one-off room is deleted 24 h after it is empty, a saved room after 30 days).
Questions and troubleshooting: [help page](https://screen-with-me.swm-server.workers.dev/help.html?lang=en).

## ⚠️ Limitations

- DRM-protected streaming services are not supported yet.
- The extension is not in the Chrome Web Store yet (manual install, about a minute).
- The extension works in Chromium-based desktop browsers (Chrome, Edge, Brave, Opera, Vivaldi). The website also opens in Firefox and Safari (rooms with YouTube or video files, chat, games, voice); pages from other sites need a desktop Chromium browser with the extension.
- Sidelit never hosts or relays video content; it only synchronizes players that each person opens themselves.
