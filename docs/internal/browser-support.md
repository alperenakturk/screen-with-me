# Browser support research (Chromium browsers, Firefox, Safari)

Research only (31 Oct 2026, version 0.9.91.16). No product code was changed. The owner decides what to build.

How sure each statement is:
- **Tested**: measured in the cloud sandbox in this session.
- **Code**: read from our source (file references given).
- **Docs**: from vendor docs, bug trackers or forums (links at the end).
- **Belief**: general knowledge that could not be confirmed in this session. `developer.mozilla.org` was blocked by
  the sandbox network, so several Firefox and Safari API facts are "Belief". Check them before building.

Only Chromium could be run here. Installing the Microsoft Edge `.deb` was blocked by the sandbox's safety rule
(running downloaded binaries), and the Brave, Opera and Playwright Firefox/WebKit download hosts were refused by the
network proxy. So the browser rows below come from reading the code and the docs, plus one WebRTC experiment in
Chromium that copies the setting Brave, Opera's VPN and uBlock Origin use (see §A.3).

## Summary table

Legend: ✅ works / expected to work · ⚠️ works with a caveat or needs a hand test · ❌ does not work today · — not
applicable. Confidence: H high, M medium, L low.

| Browser | Ext. install today | Store path | Voice | Camera | Screen share | Film-page overlay | Fullscreen | Known issues | Conf. |
|---|---|---|---|---|---|---|---|---|---|
| **Chrome** (desktop) | ✅ unpacked | Chrome Web Store | ✅ | ✅ | ✅ (tab audio) | ✅ | ✅ | none known; our CI and harnesses run on Chromium | H |
| **Edge** (desktop) | ✅ unpacked (Developer mode) | Chrome Web Store (after "Allow extensions from other stores") **or** Edge Add-ons (free, own review) | ✅ | ✅ | ✅ | ✅ | ✅ | Tracking prevention "Strict" and sleeping tabs need a hand test | M–H |
| **Brave** (desktop) | ✅ unpacked | Chrome Web Store (works directly) | ⚠️ | ⚠️ | ⚠️ | ✅ | ✅ | **Voice / camera / stream fail if WebRTC policy is "Disable non-proxied UDP"** (Brave setting, or forced by uBlock Origin); Tor windows have no WebRTC; Shields fingerprint "farbling" may change device lists slightly | M |
| **Opera / Opera GX** (desktop) | ✅ unpacked | Chrome Web Store ("Add to Opera") **or** Opera add-ons (slow review: weeks to months) | ⚠️ | ⚠️ | ⚠️ | ✅ | ✅ | **Opera's built-in VPN likely forces proxy-only WebRTC → voice fails while VPN is on**; built-in ad blocker should not touch us (test) | M |
| **Vivaldi** | ✅ unpacked | Chrome Web Store | ✅ | ✅ | ✅ | ✅ | ✅ | same WebRTC setting exists in its privacy settings | M |
| **Arc** (macOS/Windows) | ✅ | Chrome Web Store | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | in maintenance mode since 2025 (no new features); its own window/"Little Arc" UI may change popups and fullscreen; low priority | L |
| **Yandex** | ✅ | Chrome Web Store / Opera add-ons | ✅ | ✅ | ✅ | ✅ | ✅ | not a target market; skip | L |
| **Chrome / Edge / Brave on Android** | ❌ (no extensions in stable) | — | ✅ site | ✅ site | ❌ (no `getDisplayMedia`, button hides) | — | ✅ | site + PWA only | H |
| **Samsung Internet** (Android) | ❌ (own add-on store, not Chrome extensions) | — | ✅ site | ✅ site | ❌ (button hides) | — | ✅ | site only | M |
| **Firefox** (desktop) | ❌ today | AMO (free, needs Firefox-specific manifest + source upload) | ✅ site (test) | ✅ site (test) | ⚠️ site: no tab audio | ❌ (needs work: no `offscreen`, origin check) | ✅ | see Part B | M |
| **Firefox Android** | ❌ | AMO (Android extensions allowed since Dec 2023) | ✅ site (test) | ✅ site (test) | ❌ | ❌ (much harder, not worth it) | ✅ | site only | M |
| **Safari** (macOS) | ❌ | Mac App Store app (Xcode conversion, Apple Developer $99/yr) | ⚠️ site (test) | ⚠️ site (test) | ⚠️ site: no audio | ❌ (no `offscreen`, origin check) | ✅ | see Part B | M |
| **Safari / any browser on iPhone** | ❌ | App Store (same) | ⚠️ site (test) | ⚠️ site (test) | ❌ | ❌ | ✅ our pseudo fullscreen | every iPhone browser is WebKit; site + PWA only | M |

Short version:
1. **All desktop Chromium browsers already run the extension** (same engine, same APIs, `minimum_chrome_version: 116`).
   The real risk there is not the extension APIs, it is **privacy settings that block peer-to-peer WebRTC** (§A.3).
2. **The website is close to working in Firefox and Safari**, because risky features already hide themselves when
   missing. It needs one real test pass on each.
3. **A Firefox extension is a real project** (size L): the film-page overlay refuses to run outside `chrome-extension://`,
   and film-page voice depends on Chrome's `offscreen` API, which Firefox does not have.
4. **A Safari extension costs money and a Mac** and gives little on iPhone. Not before 1.0.

---

## Part A: Chromium-based browsers

### A.1 Install and store paths

| Browser | Unpacked (today) | Store later | Notes |
|---|---|---|---|
| Chrome | `chrome://extensions` → Developer mode → Load unpacked (our `extension.html` steps) | Chrome Web Store (account ready, not submitted) | reference browser |
| Edge | `edge://extensions` → Developer mode → Load unpacked | (a) Chrome Web Store: Edge shows "Allow extensions from other stores" once, then "Get" works; (b) **Edge Add-ons** via Microsoft Partner Center: free developer account, the same zip, review usually a few business days | Listing on Edge Add-ons is cheap (same package) and Edge users trust it more than "other stores" |
| Brave | `brave://extensions`, same steps | Chrome Web Store works directly (Brave has no store of its own) | |
| Opera / GX | `opera://extensions`, Developer mode | (a) Chrome Web Store: Opera shows an "Add to Opera" button on store pages (older versions needed Opera's "Install Chrome Extensions" helper); (b) **addons.opera.com**: free, but developers report reviews taking weeks to many months | Not worth waiting for Opera's own store; send Opera users to the Chrome Web Store |
| Vivaldi | `vivaldi://extensions` | Chrome Web Store directly | |
| Arc | via Chrome Web Store | Chrome Web Store | |

Confidence: H for Chrome/Edge/Brave/Vivaldi (well known), M for Opera's current button (Docs: forum).

### A.2 Extension APIs we use, per Chromium browser

What the extension uses (Code: `apps/extension/build.mjs:37-86`, `apps/extension/src/*`):

| Feature | Where | Chromium browsers |
|---|---|---|
| MV3 service worker background (`type: module`) | `build.mjs:54` | all fine (Chromium ≥ 116) |
| `offscreen` document, reason `USER_MEDIA` (film-page voice) | `background.ts:443-459`, `offscreen.ts` | Chrome 109+; same code in Edge/Brave/Opera/Vivaldi (Belief, H: it is plain Chromium, not a Google service). Hand test: voice on a film page |
| `storage.session` + `setAccessLevel('TRUSTED_AND_UNTRUSTED_CONTEXTS')` | `background.ts:34`, `content.ts` | all fine |
| `world: 'MAIN'` content script (`fullscreen-guard.js`) | `build.mjs:71-79` | Chromium 111+, fine |
| `chrome.windows.create({type:'popup'})` for the mic prompt | `background.ts:487-511` | fine on desktop; tab fallback already exists (`background.ts:512-514`). Arc may show the popup as a "Little Arc" window (Belief, L) |
| `getUserMedia` permission from an extension page (`mic.html`) | `mic.ts` | permission belongs to `chrome-extension://<id>`. Note: the unpacked id differs from the store id, so friends who move from the zip to the store version will be asked once more (all browsers) |
| `tabs.onCreated` + `openerTabId` + `pendingUrl` (ad tab closing) | `background.ts:631-668` | fine. Brave Shields / Opera ad blocker may block the pop-up before it opens: then our code simply sees nothing |
| `web_accessible_resources` `shell.html` iframe on `<all_urls>` | `build.mjs:53`, `content.ts:456-470` | fine. Brave Shields does not block extension frames (Belief, M); inside it our site is a third-party frame, so its storage is partitioned or blocked — already handled (falls back to the extension's storage / memory, CLAUDE.md "Shared settings") |
| `exclude_matches` for our site, `ancestorOrigins` | `build.mjs:63`, `content.ts:49` | fine |
| WebSocket to `*.workers.dev` | site | fine in all; some networks/filters block `workers.dev` (known, 0.9.79): own domain fixes it (ROADMAP §6) |
| `allow="autoplay"` on our frames, autoplay | `content.ts:462`, `shell.ts:26` | Chrome's autoplay rules everywhere. Brave has its own Autoplay site setting; if set to "Block", the YouTube player / sounds wait for a click (our "İzlemeye başla" card already covers the film page). Hand test |

Conclusion: **no Chromium-specific API gap found.** Every API we use is part of Chromium itself, so the Chromium forks
inherit it.

### A.3 WebRTC IP handling (the main real risk) — Tested

Our voice, camera and stream are peer-to-peer with **STUN only** (`packages/shared/src/voice-p2p.ts:26`,
`live-p2p.ts:11`, `voice.ts:41`: `stun:stun.cloudflare.com:3478`, no TURN server). Chromium has a "WebRTC IP handling
policy" with four values. Brave and Vivaldi show it in settings; uBlock Origin's "Prevent WebRTC from leaking local IP
addresses" option and many "WebRTC leak" extensions set it; Opera's VPN is reported to need it; companies can set it by
policy (`WebRtcIPHandling` in Edge/Chrome).

Experiment (scratch script, Chromium 1243 in the sandbox, two `RTCPeerConnection`s in one page, launched with
`--force-webrtc-ip-handling-policy=<value>`):

| Policy | ICE result | Candidates |
|---|---|---|
| `default` | connected | 1 host (mDNS `.local`) |
| `default_public_and_private_interfaces` | connected | 1 host |
| `default_public_interface_only` | stayed `new` here | none (the sandbox has no public interface; on a real PC STUN would give a public candidate, so this mode should work across the internet) |
| `disable_non_proxied_udp` | **stayed `new`** | **none** |

So with **"Disable non-proxied UDP"** WebRTC gathers **no candidates at all** unless there is a TURN server reachable
over TCP/TLS. Our voice then shows "couldn't connect" after the retries (CLAUDE.md "Lost peer connections"), with no
explanation. This is a real bug class for Brave users with that setting, uBlock Origin users with that option ticked,
and Opera VPN users. It also hits Chrome users with uBlock Origin.

Fix options (owner decides, not part of this research):
1. **Cheap, before 1.0:** detect "zero ICE candidates after gathering finished" and show a friendly hint ("Your browser
   blocks direct voice connections: Brave → Settings → Privacy → WebRTC IP handling policy → Default; or turn off the
   VPN / uBlock's WebRTC option"). Size S.
2. **Real fix, Phase 2:** a TURN relay over TCP/TLS (Cloudflare TURN), which also hides IPs (already a Phase 2 goal in
   ROADMAP "Hide IP addresses"; needs the Cloudflare card decision).

### A.4 Other browser-specific behaviour

- **Edge:** Tracking prevention "Balanced" (default) only blocks known trackers; our site is not on those lists.
  "Strict" may block more third-party content (YouTube embeds, `i.ytimg.com` thumbnails?) → hand test. Sleeping tabs
  skip tabs that play media or use WebRTC (Belief, M), but a room tab that is only open in the background could sleep;
  our reconnect logic handles that. Edge's "Enhanced security mode" (off by default) disables the JIT on unfamiliar
  sites: our site may feel slower there.
- **Brave:** Shields block ads/trackers inside the YouTube embed (fine for us). Fingerprinting protection ("farbling")
  adds tiny noise to some Web Audio analysis and may randomise device names; our level meter / speech detector
  (`packages/shared/src/level-meter.ts`, `speech-detector.ts`) use the analyser and should not care about tiny noise.
  Private window with Tor: no WebRTC at all (voice impossible; say so in the hint).
- **Opera / GX:** the built-in ad blocker uses EasyList-style lists; `workers.dev` and our paths are not on them
  (Belief, M). GX Control (RAM/CPU limiter) can throttle background tabs. Opera's sidebar and "Add to Opera" flows
  are cosmetic.
- **Vivaldi:** same as Chrome; has its own WebRTC setting ("Broadcast IP for best WebRTC performance") → same hint.
- **Arc:** our popup window for the mic permission and fullscreen of the whole film page should be tested if the owner
  cares; Arc is no longer developed, so low priority.

### A.5 Site features in Chromium browsers

All are Chromium features, so they behave like Chrome: View Transitions, `:has()`, `setSinkId`, `getDisplayMedia`
with tab audio, `MediaStreamTrackProcessor/Generator` (camera in the corner), element fullscreen, PWA install (Edge
and Opera have their own "Install app" menus; Brave too). Samsung Internet and mobile Chromium: no screen sharing
(button hides: `apps/web/src/ui/live.ts:83`), everything else like Chrome on Android.

---

## Part B: non-Chromium browsers

### B.1 The website alone (no extension)

Code shows most risky features are already feature-detected:

| Feature | Code | Firefox | Safari macOS | Safari iOS / iPhone browsers |
|---|---|---|---|---|
| YouTube rooms (IFrame API) | `apps/web/src/players/` | ✅ | ✅ | ✅ (autoplay needs a tap; our flows already start from a tap) |
| Room WebSocket | `packages/shared/src/connection.ts` | ✅ | ✅ | ✅ (background tabs freeze; reconnect handles it) |
| Voice / camera (WebRTC, STUN) | `voice-p2p.ts` | ✅ (Belief, H) | ⚠️ test: remote audio needs a gesture (join is a click, fine) | ⚠️ test: audio stops when Safari goes to the background |
| Speaking glow `getSynchronizationSources().audioLevel` | `voice.ts:143`, `voice-p2p.ts:268` | ✅ | ✅ | ✅ (also optional-chained) |
| Speaker pick `setSinkId` | `ui/voice-check.ts:61` | ✅ (Firefox 116+) | ❌ → select hidden (detected) | ❌ → hidden |
| Permission state `permissions.query('microphone')` | `ui/voice.ts:787`, `ui/voice-check.ts:27` | ⚠️ newer Firefox only; errors are caught | ✅ | ✅ |
| Screen share `getDisplayMedia({audio:true})` | `live-p2p.ts:23-28` | ⚠️ video only, no tab audio (test that `audio:true` does not make it fail) | ⚠️ same | ❌ (no API → button hidden, `live.ts:83`) |
| Camera in the corner of a stream (`MediaStreamTrackProcessor/Generator` + `OffscreenCanvas`) | `ui/live-compose.ts:20`, `ui/live.ts:84` | ❌ → **option hides itself** (checked: `composeSupported` requires both constructors on the main thread) | ❌ → hides (Safari only has them in workers) | ❌ → hides |
| `contentHint` on stream tracks | `live-p2p.ts:88` | harmless if unsupported | ✅ | — |
| Sound effects (Web Audio, `webkitAudioContext` fallback, `userActivation`) | `apps/web/src/sound.ts:17-25` | ✅ (falls back to our own `gestured` flag) | ✅ | ✅ (needs the ring/silent switch off) |
| View Transitions (Shorts view switch) | `room.ts:1970` | ✅ in recent Firefox (Belief, M); detected anyway | ✅ Safari 18+ | ✅ |
| `:has()` | CSS (e.g. `.side:has(.live-menu…)`) | ✅ Firefox 121+ | ✅ | ✅ |
| Element fullscreen | `device.ts` `canElementFullscreen` | ✅ | ✅ | iPhone ❌ → our pseudo fullscreen (exists since 0.9.91.2); iPad ✅ |
| `screen.orientation.lock` | `device.ts:52-55` | Android only, errors caught | — | ignored |
| Share sheet `navigator.share` | `device.ts:45` | Android ✅, desktop mostly ❌ (falls back to copy) | ✅ | ✅ |
| PWA (manifest + `sw.js`) | `public/manifest.webmanifest`, `public/sw.js` | desktop: no install prompt (Windows taskbar web apps are new in Firefox); Android ✅ | "Add to Dock" (macOS 14+) | "Add to Home Screen" ✅ |
| Our CSP / `Permissions-Policy` | `apps/web/public/_headers:11` | standard headers, ✅ | ✅ | ✅ |

Conclusion: **the site should already work in Firefox and Safari** for YouTube rooms, chat, games, voice and camera,
with screen share being "picture only". Nothing was found that crashes; the missing features hide themselves. A hand
test (or a Playwright Firefox/WebKit run once those hosts are allowed) is still needed. Effort to polish: **S**.

### B.2 Firefox extension (desktop)

Concrete blockers in our code:

1. **The site refuses to run in the overlay.** `apps/web/src/storage.ts:18-19`: `isShell` requires the parent origin
   to start with `chrome-extension://`, and `main.ts` refuses to run in any other frame (CLAUDE.md "Security").
   Firefox extension pages are `moz-extension://<random uuid>`; Safari's are `safari-web-extension://…`. Also
   `location.ancestorOrigins` only exists in Firefox **148+** (shipped 2026; there was a 151 regression with content
   scripts, fixed in 152) (Docs). Fix: accept the other schemes and keep the shell.html ⇄ background handshake as the
   real check. Size S, but security-sensitive (re-review the "shell mode only if the top frame is the extension" rule).
2. **No `offscreen` API in Firefox** (`background.ts:443-459`). Firefox's MV3 background is an event page *with* a DOM,
   but Firefox **never allows `getUserMedia` in background pages** (Mozilla bug 1579489) and permission remembering for
   `moz-extension://` pages has been unreliable (bug 1511934). Options for film-page voice:
   - (a) a small visible extension **"voice window"** (`windows.create` popup, like today's `mic.html`, but it stays
     open, minimisable) that runs `P2pVoice`. Closest to today's design. Size L.
   - (b) let the site inside the overlay hold voice itself (`allow="microphone; camera"` on both frames). The prompt
     would be on behalf of the film site (asked again on every film site), which is exactly why Chrome moved to
     offscreen. Size M, worse UX.
   - (c) no voice on the film page in Firefox at first (voice works on the site). Size S. **Recommended first step.**
3. **Manifest differences** (`build.mjs:37-86`): Firefox needs `background.scripts` instead of `service_worker`
   (both keys can be listed; Firefox 121+ handles that); `browser_specific_settings.gecko.id`; for new AMO listings the
   `data_collection_permissions` key (Mozilla's data-collection disclosure, required since late 2025) (Belief, M);
   `offscreen` permission removed; `minimum_chrome_version` ignored. Firefox MV3 treats host permissions as
   grantable by the user; since Firefox 127 they are offered at install, but the user can still turn `<all_urls>` off
   → the extension must cope ("grant access to this site" note). Size M (a second manifest + build flag).
4. **APIs that exist but differ (Belief, M — verify on MDN):** `storage.session` (Firefox 115+; `setAccessLevel` for
   content scripts is newer), `world: 'MAIN'` content scripts (Firefox 128+), `tabs.pendingUrl` missing (our code
   falls back to `tab.url`, `background.ts:641`), `-webkit-media-controls-enclosure` CSS has no effect
   (`content.ts:358`; only used by the unused "skin" action), the `chrome.*` namespace works with promises in MV3.
5. **Firefox specifics on the film page:** `clip-path: path(evenodd …)` is supported; Firefox's own fullscreen and
   `requestFullscreen` patching in the MAIN world should work; Total Cookie Protection partitions our site in the
   overlay (already handled like Chrome's partitioning).
6. **AMO review:** free account; listed or unlisted (self-distributed, signed `.xpi` for friends) — both are signed by
   Mozilla; release Firefox does not keep unsigned extensions (only "temporary add-on" until restart). Because we
   bundle and minify with esbuild, AMO asks for the **source code + build instructions** (the private repo can be
   uploaded as a zip, only reviewers see it). Reviews are usually days. `<all_urls>` + remote site in an iframe will
   get a closer human review: our "the overlay is our own website" design needs a clear reviewer note.

Firefox Android: extensions can be listed for Android, but there is no `windows` API, overlays on a phone film page
are fragile, and voice would have the same offscreen problem. Not worth it; site + PWA only.

Overall Firefox extension effort: **L** (≈ 1–2 weeks of sessions: manifest variant + origin check M, voice
alternative L, test harness for Firefox M, AMO listing S).

### B.3 Safari extension (macOS + iOS)

- Safari Web Extensions are shipped **inside an app** made with Xcode (`xcrun safari-web-extension-converter`, or the
  newer packager in App Store Connect — check whether it now removes the Mac requirement, Belief, L). Needs an
  **Apple Developer Program membership ($99/year)** and in practice **a Mac**. Distribution through the App Store with
  Apple's app review.
- Same blockers as Firefox: no `offscreen`, the `chrome-extension://` origin check (`storage.ts:19`), plus Safari's
  extension permissions are per-site and opt-in by the user ("Allow on every website" is a separate step), iOS
  requires a non-persistent background, `windows.create` is meaningless on iPhone, and video on iPhone often plays in
  the system's own player where no overlay can appear.
- Value is low compared to cost: macOS Safari users can use the site; iPhone users get the site + PWA (and later a
  store app, `docs/internal/apps.md`). Effort **L** + money + a Mac.

### B.4 Others, briefly

- **Orion (Kagi, WebKit)** can install some Chrome/Firefox extensions; unsupported, ignore.
- **Firefox forks** (LibreWolf, Zen, Floorp): follow Firefox; LibreWolf disables or restricts WebRTC by default
  (voice will fail; same hint as A.3).
- **iOS in the EU** may get non-WebKit engines; nothing changes for us yet.

---

## Recommendation

**Status (31 Oct 2026, owner: "do the recommendations"):** done in 0.9.91.17: the WebRTC-blocked hint
(`packages/shared/src/ice-watch.ts`, harness `scripts/harness/voice/blocked.mjs`), the extension page's browser notes
and "voice doesn't connect" FAQ, Edge Add-ons steps (`web-store.md`). The hand tests are in `STATUS.md` "Owner's hand
tests". Waiting for the owner: those tests and the Microsoft Partner Center account. Firefox / Safari site passes need
a real Firefox / Safari (not available in the cloud).

**Do now (small, safe, no new accounts):**
1. Run the owner's Brave/Edge/Opera hand test (checklist below) — it is the cheapest way to raise "M" to "H".
2. Allow `developer.mozilla.org`, Playwright's Firefox/WebKit download host and (optionally) `packages.microsoft.com`
   in the cloud environment if we want automated non-Chrome test runs later; the site's e2e/harness could then also
   run on Playwright Firefox and WebKit.

**Before 1.0:**
1. **WebRTC-blocked hint** (A.3 option 1): show why voice cannot connect when no ICE candidate is gathered. Size S.
2. **List on Edge Add-ons** in addition to the Chrome Web Store (same zip, free account, quick review). Size S. 👤 the
   owner opens the Microsoft Partner Center account.
3. **Website test pass in Firefox and Safari** (desktop) and fix what breaks; write "Works best in Chrome, Edge, Brave,
   Opera; the website also works in Firefox and Safari; the extension needs a Chromium browser" in the store listing /
   `extension.html`. Size S.
4. Do **not** submit to Opera's own store (slow); point Opera users to the Chrome Web Store.

**After 1.0:**
1. **Firefox extension** (B.2): first step without film-page voice (option c), then the voice window (option a). Size
   L. AMO account 👤.
2. **TURN relay** for WebRTC (fixes A.3 for good and hides IPs; already a Phase 2 goal, needs the Cloudflare card 👤).

**Don't (for now):**
- Safari extension (money, a Mac, App Store review, little gain on iPhone). Revisit only if many Mac Safari users ask.
- Firefox Android / iPhone extensions.
- Opera add-ons store submission.

### Decisions that belong to the owner
- Opening store accounts: Microsoft Partner Center (Edge, free), Mozilla AMO (free), Opera (free, slow), Apple
  Developer Program (**$99/year**, needs a Mac in practice).
- Whether the store listing names other browsers.
- The Cloudflare card for TURN (Phase 2).

## Hand-test checklist for the owner (Edge, Brave, Opera)

Use the zip from the site (unpacked install), a friend in Chrome, and a legal demo video page (e.g. a Video.js / Plyr
demo) for the film page. For each browser:

1. Install: Developer mode → Load unpacked → the ScreenWithMe icon appears; popup opens.
2. Site room: create a room, friend joins from Chrome; YouTube plays; play/pause/seek sync both ways.
3. Voice: "Sese katıl", both hear each other; mic on/off; 🎛 shows my microphones (and speakers in Edge/Opera).
4. Camera: 📷 on, friend sees me, I see them.
5. Screen share: share a tab with sound; friend sees and hears it.
6. Film page: open the demo page link in the room → "Filme git" → overlay appears, video sits in the hole, sync works.
7. Voice on the film page: join voice there; the small permission window appears once; friend hears me.
8. Fullscreen: our ⛶ on the site and on the film page; the dock on the right shows and hides.
9. Sounds: someone joins voice → a soft sound plays.
10. Browser-specific:
    - **Brave:** Shields on (default) for steps 2–8. Then Settings → Privacy and security → WebRTC IP handling policy
      → "Disable non-proxied UDP" → voice should fail (confirms §A.3); set it back to "Default". Also try a Private
      window *with Tor*: voice fails (expected).
    - **Edge:** Settings → Privacy → Tracking prevention "Strict" → repeat step 2 and 6 (YouTube, thumbnails, overlay).
      If installing from the Chrome Web Store later: "Allow extensions from other stores" appears once.
    - **Opera / GX:** built-in ad blocker on → steps 2 and 6; then turn on Opera's VPN → step 3 (expected to fail:
      tell us what happens). GX: GX Control limits on → leave the room tab in the background for 10 min, come back.
11. Note the browser version (`edge://version`, `brave://version`, `opera://about`) and anything odd.

## Sources

- Chrome offscreen API: https://developer.chrome.com/docs/extensions/reference/api/offscreen
- Chromium extensions group, offscreen in production: https://groups.google.com/a/chromium.org/g/chromium-extensions/c/ks8N4vHUIz4
- MDN `background` manifest key (Firefox: no `service_worker`, use `scripts`):
  https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background
- MDN Chrome incompatibilities (could not be fetched from the sandbox; read before building):
  https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Chrome_incompatibilities
- Background script support across browsers: https://mv3-extension.com/manifest-v3-architecture-extension-lifecycle/service-worker-fundamentals/background-script-support-across-browsers/
- Firefox MV3 from a developer's view: https://www.stefanvd.net/blog/2023/11/30/firefox-manifest-v3-extension-a-developer-perspective/
- `location.ancestorOrigins` support: https://caniuse.com/mdn-api_location_ancestororigins ·
  https://developer.mozilla.org/docs/Web/API/Location/ancestorOrigins · Firefox bugs
  https://bugzilla.mozilla.org/show_bug.cgi?id=1085214 , https://bugzilla.mozilla.org/show_bug.cgi?id=2034329 ,
  https://bugzilla.mozilla.org/show_bug.cgi?id=2016071
- Firefox `getUserMedia` in extension pages / background: https://source-hub.etos-pro.ru/mozilla/gecko-dev/commit/ec59c497c694c4ed5e0512fa21fd417839d61e20
  (bug 1579489) · https://bugzilla.mozilla.org/show_bug.cgi?id=1511934 · https://bugzilla.mozilla.org/show_bug.cgi?id=1278100
- Brave WebRTC settings: https://github.com/brave/brave-browser/wiki/WebRTC-Custom-Settings ·
  https://community.brave.app/t/webrtc-ip-handling-policy-stuck-on-disable-non-proxied-udp/66722 ·
  https://community.brave.app/t/webrtc-doesnt-use-configured-proxy-regardless-of-ip-handling-policy-setting/399372
- Edge WebRTC policy: https://learn.microsoft.com/en-ca/DeployEdge/microsoft-edge-policies/webrtciphandlingurl
- Samsung Internet WebRTC policy: https://developer.samsung.com/browser/policy/web-rtc-ip-handling.html
- Opera VPN and WebRTC: https://forums.opera.com/post/14850 · https://github.com/aghorler/WebRTC-Leak-Prevent/blob/master/DOCUMENTATION.md
- Opera add-ons review times (forum, anecdotal): https://forums.opera.com/post/217947 · https://forums.opera.com/post/262304
- Apple, Safari web extension compatibility: https://developer.apple.com/documentation/safariservices/assessing-your-safari-web-extension-s-browser-compatibility
- Safari WebRTC notes: https://www.videosdk.live/developer-hub/webrtc/webrtc-safari
