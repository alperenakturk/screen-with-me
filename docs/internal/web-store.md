# Chrome Web Store: form guide (for submission day)

Developer dashboard: chrome.google.com/webstore/devconsole → **New item** → upload the zip, then fill in the tabs as
below. The texts for the form fields are in English (the store's main language); the description ends with a short
Turkish paragraph.

**File to upload:** `store/screenwithme-<version>.zip` (made by `npm run store`).

**Title and summary come from the zip** (manifest, `apps/extension/build.mjs`):
- Title: `ScreenWithMe – Watch Videos Together in Sync`
- Summary: `A watch party for any site: everyone's video stays in sync, with chat, emoji reactions and voice. Free, no account needed.`

> The repo is private for now. The texts don't say "open source"; that can be added once the repo is public (before
> that, remove the site names in `docs/internal/rakip-analizi.md`).

---

## 1. Store listing

**Description:**

```
Watch videos together with friends, perfectly in sync.

Create a room on the ScreenWithMe website and share the link. Paste the link of a page with a video into the room: everyone goes to that page, and the extension opens your room around the video (chat, reactions, voice chat, controls). When anyone plays, pauses, seeks or changes the speed, it happens for everyone, and anyone who falls behind quietly catches up.

HOW IT WORKS
1. Create a room on the website (no account needed) and share the invite link.
2. Paste the link of the page with the video; friends get a "Go to the film" button.
3. The page opens with your room around the video. Press play and you're watching together.
There are no settings to learn: the extension icon only shows whether the tab is in a room, with one button back to the room.

WHY SCREENWITHME
• Works with standard HTML5 video players, even inside iframes and in players that load late
• Tight sync, measured 30–100 ms apart on popular open-source players
• Wrong video picked up (a trailer or a preview)? Choose the right one with one click
• "Everyone ready": if someone is still buffering, the room waits for them (up to 12 s)
• Emoji reactions and quick chat over the video, also in fullscreen
• Voice chat while you watch: the microphone is asked for once and only turns on when you join voice
• Pin moments with an optional note and jump back to talk about them later
• Add your own custom emojis (images or GIFs) to a room; they stay in that room only
• Keyboard shortcuts: 1–8 send reactions, Enter opens chat, P pins the moment
• Shared speed: other speed extensions can't knock the room out of sync
• The room host can lock the controls, remove people and lift bans
• Eleven themes and drawn avatars; just pick a name, no account
• YouTube and direct video links play right on the website, no extension needed
• English and Turkish

PRIVATE BY DESIGN
• No account, no ads, no third-party analytics or tracking
• Runs only in the tab you joined a room with; dormant everywhere else
• Videos play in each person's own browser; our server only relays small sync messages and the room's chat
• Voice chat is direct between the people in voice; you're told before joining that they can see your IP address
• Privacy policy: https://screen-with-me.swm-server.workers.dev/privacy.html

NOTES
• DRM-protected streaming services are not supported.
• ScreenWithMe does not host or provide any video. Only watch content you have the right to access.
• Free.

—

Türkçe: Arkadaşlarınla videoyu aynı saniyede izle. Sitede oda kur, linki paylaş, videonun olduğu sayfanın linkini odaya yapıştır: herkes o sayfaya gider ve oda (sohbet, emojiler, sesli sohbet, kontroller) videonun etrafında açılır. Biri durdurduğunda, sardığında ya da hızı değiştirdiğinde herkeste olur. Hesap yok, reklam yok, takip yok; eklenti sadece odaya katıldığın sekmede çalışır.
```

**Category:** Entertainment. If it isn't listed: Social & Communication.
**Language:** English.

**Images** (in the `store/` folder, made by `npm run store`):
| Field | File | Size |
|---|---|---|
| Store icon | `store/icon128.png` | 128×128 |
| Screenshots | `store/screenshot-1.png` … `-5.png` | 1280×800 |
| Small promo tile | `store/promo-small.png` | 440×280 |

Screenshot order: 1) room view on the film page (sync + emojis + chat), 2) flow: page link into the room → "Go to the
film" → press play on the film page (thin strip on top), 3) everyone ready + shared speed (people tab),
4) customisation (theme dialog, avatars), 5) privacy + popup (info only and the "Back to the room" button).
Source: `store/src/shots.html` (window, popup, titles) + `store/src/room.html` (a copy of the room; it uses the
site's real `styles.css`, so keep its markup in step with `room.ts` when the site's UI changes).

**Extra fields:**
- Official URL: leave empty (it asks for domain verification).
- Homepage URL: `https://screen-with-me.swm-server.workers.dev/`
- Support URL: `https://screen-with-me.swm-server.workers.dev/`

---

## 2. Privacy

**Single purpose description:**

```
ScreenWithMe has a single purpose: watch parties. It keeps one HTML5 video, in the tab where the user joined a room, playing in sync (play, pause, seek position, playback speed) for everyone in that room. Reactions, short chat messages and voice chat with the people in the room are part of that shared-watching experience.
```

**Permission justifications:**

`storage`:
```
Stores the website's settings (nickname, avatar, theme, language, saved rooms, the user's own custom emoji collection and a random browser ID) locally in chrome.storage.local, so the room layer on the film page uses the same settings as the website, and which tab shows a room layer (chrome.storage.session), so it survives the service worker restarting. The custom emoji collection never leaves the device by itself; an image is sent to a room only when the user adds it there.
```

`offscreen` (since 0.9.60):
```
Voice chat while watching: on the film page the microphone is used in the extension's own offscreen document (reason USER_MEDIA), so the permission is asked once for the extension instead of for every film site, the film site can never reach the microphone through us, and voice keeps going when the film page reloads. The microphone is only on after the user presses "Join voice" (after a notice that the people in voice can see their IP address) and turns off with "Leave". Nothing is recorded; audio goes peer-to-peer to the others in voice.
```

Host permission (`<all_urls>`):
```
Users watch videos on sites we cannot list in advance, and players are usually inside cross-origin iframes, so the content script must be able to run in every frame. activeTab is not enough: invited friends open the page through a link without clicking the extension icon, and players that load later in iframes must be detected automatically. Outside a tab that has joined a room the script stays dormant. Within that tab it only reads the <video> element's playback state (time, paused, rate) and shows our own website's room page as a layer over the page (a web-accessible extension page, shell.html, in an iframe), with a hole where the video sits. It never reads page text, forms or cookies. The page URL and title leave the device only when the user explicitly creates a room or shares that page with their room. To keep the watch party usable, a tab that the room's film tab opens to another site right after the user clicks the video (an ad pop-up) is closed locally and can be reopened with one click (tabs.onCreated openerTabId; can be turned off).
```

**Are you using remote code?** **No, I am not using remote code.**
(All code is in the package; only JSON messages go to and from the server over a WebSocket.)

**Data usage**: tick these boxes (declaring too much doesn't get an item rejected, declaring too little does):
- ☑ **Personally identifiable information**: the nickname the user picks (shown to the people in the room).
- ☑ **Personal communications**: short chat messages go to the room; the room keeps the last 50.
- ☑ **Location**: IP address. In peer-to-peer voice chat (also on film pages, through the offscreen document) the
  people in voice can see each other's public IP address; the user is told so before joining voice (security review
  1, W1).
- ☑ **Website content**: the page title, when a room is created or a page is opened in the room.
- ☑ **Web history**: in the same case the page address goes to the people in the room.
- The rest empty (health, financial, authentication, user activity).

Tick all three statements below them:
- ☑ I do not sell or transfer user data to third parties, outside of the approved use cases
- ☑ I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- ☑ I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL:** `https://screen-with-me.swm-server.workers.dev/privacy.html`

---

## 3. Distribution

- Payment: **Free**. Visibility: **Public**. Regions: **All regions**.

---

## 4. Test instructions (a note to the reviewer)

```
No login needed. Allow autoplay or click "Start watching" if the page asks.
1. Open https://screen-with-me.swm-server.workers.dev, press "Create room", enter a nickname and pick an avatar.
2. Paste https://plyr.io/ (an open-source video player demo) or https://videojs.com/ into the link box and press "Play now". The tab goes to that page.
3. The website's room opens over the page right away (chat, reactions, pins, speed, fullscreen); once the video is found, it sits in the room's player area.
4. Open the invite link in a second window (the same profile works) and press "Go to the film and watch together".
5. Play, pause or seek in one window: the other follows within about 1 second.
Tabs that have not joined a room are not affected.
```

---

## Afterwards

- Review usually takes a few days; because of the "all sites" permission it can take 1–3 weeks.
- **Don't bump `PROTOCOL_VERSION` while the review is running** (the store version would no longer be able to connect
  to the server).
- If it is rejected, paste the reason from the e-mail into the session.
- Once approved: share the store link; the manual install steps in `eklenti.html` become an "Add to Chrome" button,
  and the site's "install the extension" links go to the store.
- New version: bump `apps/extension/package.json` → `npm run store` → **Package** in the dashboard → upload the new
  zip → submit for review.

## 1.0 readiness checklist

Before submitting (Claude checks; ✅ items were done in 0.9.0):
- ✅ Minimal permissions: `storage` + `<all_urls>` (to find the video on any site) + `offscreen` (voice chat on film
  pages, 0.9.60; shows no warning); justifications above.
- ✅ The privacy policy describes every piece of data stored (name/avatar, room state, chat, browser ID, pins, custom
  emojis, IP addresses in voice).
- ✅ No film/series/site names in the description; "a neutral sync tool for any HTML5 video".
- ✅ Automated tests (GitHub Actions: typecheck, unit, build, end-to-end).
- ✅ Screenshots up to date (`npm run store`).
- ⬜ A real test with a friend on Brave/Edge.
- ⬜ Version `1.0.0` → `npm run store` → upload the zip in the dashboard → fill in the form with this guide → submit
  (with the owner's account; Claude can't submit).
- ⬜ Once approved: change the install links in `eklenti.html` and on the site to the store link.
