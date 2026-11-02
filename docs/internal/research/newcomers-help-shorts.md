# Research: newcomers, help / FAQ, pain points, Shorts together (for 0.9.94)

_Research session, 2 Nov 2026. Read-only. Inputs for the 0.9.94 "Next" items in `ROADMAP.md` (simplify the room,
Help / FAQ, "Send feedback", Shorts). Older competitor analysis: `rakip-analizi.md` (17 Oct 2026, Turkish)._

**How this was done and its limits.** Web search only. From this cloud session the competitors' own sites
(`w2g.tv`, `teleparty.com`, `kosmi.io`, `support-apps.discord.com`) could not be opened directly (outside the
environment's allowed domains), and the search tool returned **no Reddit threads** and no Chrome Web Store review
text. So screens and copy below come from search snippets, help-article excerpts, forums and press; several sources are
vendor marketing or SEO pages and are marked as such. Confidence: **(firm)** = official page or several independent
sources; **(weak)** = one source / marketing. For real user voices (Reddit, X, YouTube comments, store reviews), run
the owner's **`agent-reach`** skill on his computer (catalogue `alperenakturk/my-awesome-list`, `skills/agent-reach/
REHBER.md` has the command), e.g. on r/LongDistance, r/discordapp, r/chrome_extensions with "teleparty desync",
"watch2gether ads", "watch tiktok together".

---

## 1. Simple first screens

| Tool | What the first screen shows | What is hidden / not there |
|---|---|---|
| **Watch2Gether** | Home page: one button "Create your room" → straight into a temporary room, no account. In the room the main things are the player, a search bar at the top (YouTube search) and the room link to share. (firm: [forum "How to use Watch2Gether?"](https://community.w2g.tv/t/how-to-use-watch2gether/736), [permanent rooms](https://community.w2g.tv/t/how-to-make-a-room-permenent/509)) | Permanent rooms, moderation and settings need an account; the first screen never asks for them. |
| **Teleparty** | No room page of its own: the user opens the film, clicks the toolbar icon, one button "Start the party", gets a link. Only one option on that card: "Only I have control". (firm: several guides, e.g. [TechRadar](https://www.techradar.com/how-to/how-to-use-netflix-party-to-watch-tv-and-movies-together-online), [Digital Citizen](https://www.digitalcitizen.life/how-to-have-a-watch-party-on-netflix/)) | Everything else (chat, reactions) is a side panel that can be collapsed; Premium features behind a badge. |
| **Kosmi** | "Click the button. Your room is ready instantly, no sign-up", guests join "in one tap" from a link. (weak, vendor: [kosmi.io/rave-alternative](https://kosmi.io/rave-alternative/), [blog](https://blog.kosmi.io/p/kosmiio-is-the-best-way-to-have-a)) | Apps/premium (4K share, bigger rooms) appear later. One app-store user reports the sign-up/join buttons doing nothing (weak, [mwm.ai](https://mwm.ai/apps/kosmi/1547460222)). |
| **Discord Watch Together** | Lives inside a voice channel: rocket "Start an Activity" → Watch Together → authorise → pick a video; invite = copy the activity link. (firm: [Beebom](https://beebom.com/how-watch-youtube-videos-discord), [Discord help](https://support-apps.discord.com/hc/en-us/articles/26502500234519-Watch-Together-FAQ)) | Only YouTube; the activity is just the player + a queue; chat and voice are Discord's own. |
| **Hyperbeam** | A shared virtual browser; the host has control and can hand it on; reviews call it "very user friendly, simple". The host likely needs an account, guests usually not. (weak, mixed sources: [wpreset guide](https://wpreset.com/hyperbeam-watch-party-guide-how-to-host-in-minutes/), [SaaSHub](https://www.saashub.com/hyperbeam)) | — |
| **Rave** | Mobile app; Common Sense Media calls it "a cool idea with frustrating interface and privacy concerns" (firm: [review](https://www.commonsensemedia.org/app-reviews/rave-watch-together)). | — |

**Pattern.** Every successful first screen is **one verb + one link**: "Create your room" / "Start the party" /
"Start an activity". The first view of a room is the **player, a way to add a video, and the invite link**; chat and
voice exist but are either the platform's own (Discord) or a side panel. Settings, saved rooms, moderation, premium
come later or need an account. Nobody shows games, recaps, film time, pins or votes on the first view.

**ScreenWithMe today.** The home page already follows the pattern (one "Create room" button, 0.9.77 / 0.9.92.5), and
the join card + 3 tips + automatic invite window (0.9.91.20, 0.9.93.1) cover "one link". The room itself still shows
much more at once than any competitor: dock with 😀 📌 🎮 🎙 📷 ⋯, the Together card, three tabs, pin strip, film
time, votes, recap, saved room. ROADMAP §1 item 3 ("rarely used features under More") is supported by every competitor
looked at. Suggested rule from the pattern: **until a video plays for the first time, the room shows only: add a
video (search / link), invite, chat, join voice.** Everything else appears once something plays or under ⋯.

## 2. Help / FAQ and feedback

**What their help covers first** (in the order it appears in guides and official pages):
1. *How to start / join* (3 steps). Everyone.
2. *Who needs what*: Teleparty's FAQ says every viewer needs the extension and access to the service (firm, via
   [guides](https://laptops251.com/how-to-use-netflix-party-teleparty-full-guide)). Phones: "Teleparty only works on
   laptop and desktop computers… Chrome on iPhone doesn't support extensions" (firm,
   [documentarytube](https://www.documentarytube.com/blog/how-to-enjoy-netflix-party-on-ipad-and-iphone-what-works-now/)).
3. *It doesn't sync / it doesn't work*: the same checklist everywhere: update the extension and browser; turn off ad
   blockers, VPNs and other video extensions; try a private window with only this extension; same title / episode /
   region for everyone; site changes break things until an update ships ([GearProbe](https://gearprobe.com/teleparty-not-syncing/),
   [WatchNest](https://www.watchnest.party/teleparty-not-working), [xtrium](https://xtrium.com/teleparty-hbo-max-not-working/)).
   Discord's official FAQ adds "turn on hardware acceleration" and "why do Premium users still see ads" (firm,
   [Discord FAQ](https://support-apps.discord.com/hc/en-us/articles/26502500234519-Watch-Together-FAQ)).
4. *Permissions*: "read and change site data" is explained in third-party guides, not prominently by the vendors
   ([xtrium](https://xtrium.com/teleparty-hbo-max-not-working/), [treblab](https://treblab.com/blogs/news/what-is-teleparty)).
   An automated scanner rates "all websites" host access of watch-party extensions as **critical** risk
   ([extensionauditor](https://extensionauditor.com/scan/watch-party-extension-bkghkflpajhnilonpnominghkekafemb)).
   Nobody we found explains it well: an opening for us.
5. *Billing / cancel* (Teleparty), not relevant to us.

**How they collect feedback.**
- **Watch2Gether:** a public Discourse forum (`community.w2g.tv`): a pinned "How to use" FAQ thread, bugs and wishes
  as ordinary threads, staff answer there and point to fixes ("update to 4.5"), plus a changelog thread split into
  New features / Bug fixes ([changelog](https://community.w2g.tv/t/watch2gether-changelog/3426),
  [example bug thread](https://community.w2g.tv/t/video-found-but-not-synced/33158)). Staff ask for the browser
  version in almost every thread.
- **Teleparty:** e-mail only on its support page; Premium messages answered first (firm,
  [teleparty support](https://ww1.teleparty.com/support)). Its public reputation is then made on Trustpilot
  ([Trustpilot](https://uk.trustpilot.com/review/teleparty.com)) where billing and "didn't work" complaints pile up.
- **Discord:** bug report link `dis.gd/bugreport` in the activity FAQ; the general feedback form is explicitly
  "one-way, we can't reply" ([Discord feedback](https://support.discord.com/hc/en-us/articles/38842714645527-How-to-Share-Feedback-with-Discord)).
- **Kosmi:** nothing public found about its feedback channel.

**Take-aways for us.**
- The FAQ's first screen should be: how it works (3 steps) → **who needs the extension** (only for film pages; YouTube,
  TikTok and video links need nothing, phones work) → **why the extension asks for "all sites"** in plain words →
  **"not in sync / video not found" checklist** → phones → voice and IP → privacy. The answers we already have in the
  product (`/baglanti`, "🎯 Video seç", "👁 Sayfayı göster", the blocked-WebRTC hint) should be linked from the matching
  FAQ answer and back.
- Every competitor's support first asks "which browser / version?". Our feedback form can attach that automatically
  (site + extension version, browser, `data-swm-transport`, the `/baglanti` result) **after the user ticks a box**.
- Before 1.0 a forum is too much; an in-product form (Worker endpoint, stored, owner reads it) plus GitHub issue
  templates (ROADMAP §7) is enough. A Discord server is the common public channel later, after launch.

## 3. Users' pain points, and where ScreenWithMe stands

| Pain point (source) | ScreenWithMe today |
|---|---|
| **Drift / random desync**, esp. after pause-resume or on long videos; "locked 10 s apart"; clock mismatch between PCs (W2G forum: [long videos](https://community.w2g.tv/t/sync-issues-when-playing-long-videos-on-watch2gether/196528), [pause-resume](https://community.w2g.tv/t/video-sync-issues-with-youtube-on-chrome/192172), [lag](https://community.w2g.tv/t/dealing-with-the-lag-time/142111)); Teleparty Firefox reviews ([AMO](https://addons.mozilla.org/en-US/firefox/addon/netflix-party-is-now-teleparty/reviews/?score=1)) | **Solved by design**: server time + `ServerClock` (no reliance on PC clocks), drift jump > 1 s, ±5 % nudging, "everyone ready", "3-2-1 together". Not yet proven to users: a public "how sync works" FAQ answer and the sync test are our evidence. |
| **Extension can't find the video / video found but not synced** ([W2G](https://community.w2g.tv/t/video-found-but-not-synced/33158), [new pages](https://community.w2g.tv/t/cant-sync-new-pages-with-watch2gether-extension/150585)) | Partly solved: iframe-aware scoring, "🎯 Video seç" manual pick, ad handling. Needs a FAQ answer pointing at "🎯". |
| **Breaks after the site changes its player** (Teleparty on Prime / YouTube, [flickcall](https://www.flickcall.com/teleparty-not-working-on-prime-video), [anidachi](https://www.anidachi.app/guides/teleparty-not-working-youtube)) | Mostly avoided: we drive the generic `<video>`, no per-site adapters (yet). |
| **Everyone must install an extension; phones can't** ([documentarytube](https://www.documentarytube.com/blog/how-to-enjoy-netflix-party-on-ipad-and-iphone-what-works-now/)) | Solved for YouTube / TikTok / links (site only, phones included). Film pages still need the extension for everyone and a computer. Say this clearly in the FAQ and on the "Filme git" card. |
| **Ads**: Discord's Watch Together shows YouTube ads even to Premium users and has a 180-minute session cap ([Discord forum](https://support.discord.com/hc/ko/community/posts/18744592937751-Do-something-to-Watch-Together-so-it-doesn-t-need-the-180-minute-cap)); W2G free tier has banner ads | Our own UI has no ads and no session cap. YouTube embeds still show YouTube's ads (same as Discord); film-page ads handled by "a3/a5/a6". Worth one FAQ line: "ads inside YouTube come from YouTube". |
| **Privacy / trust**: a Teleparty Premium user reports an "I'm watching you" pop-up via the plugin (single unverified account, [Trustpilot](https://uk.trustpilot.com/review/teleparty.com)); Rave has a privacy warning ([Common Sense](https://www.commonsensemedia.org/app-reviews/rave-watch-together)); scanners flag "all sites" access as critical | Our extension sleeps outside rooms; no account; policy in `privacy.html`. **Not yet told well to users**: a plain "what the extension can and cannot see" answer + the permission explainer before install. |
| **Billing / cancel / paywalls** (Teleparty Trustpilot, AMO) | Not applicable: free, no account. Worth saying in the store listing ("free, no account, no time limit"). |
| **Voice / video chat**: users name "built-in voice chat" as the reason to pick an app (Hearo, Squad; [rigorousthemes](https://rigorousthemes.com/blog/apps-to-watch-movies-together-long-distance-on-phone-pc-and-tv/)); W2G caps webcams | We have voice (6), cameras (4), streams; the "IP visible" notice is honest but can scare: the FAQ should explain it calmly. |
| **"Not connected to room"** due to security software / SSL warnings ([W2G](https://community.w2g.tv/t/not-connected-to-room/37696)) | Solved better than W2G: HTTP fallback, `/baglanti` connection test, "Try again". |

No source in this round gave complaints about **mobile voice** specifically; that needs `agent-reach` on Reddit.

## 4. Shorts / short video together

| Who | How | Notes |
|---|---|---|
| **Instagram Blend** (Meta, launched Apr 2025) | A shared Reels feed for a friend or a group chat, built from everyone's interests; members see the same reels in the same order. **Not live / synced**: each person scrolls on their own time, reactions come back in the DM. (firm: [TechCrunch](https://techcrunch.com/2025/04/17/instagrams-new-blend-feature-creates-a-custom-reels-feed-for-you-and-your-friends/), [Engadget](https://www.engadget.com/social-media/instagram-now-lets-you-combine-your-reels-recommendations-with-friends-160023003.html), [Beebom](https://beebom.com/instagram-blend-create-reels-watch-party)) | Shows the demand ("watch short video together") from the biggest player, and the idea of a **mixed feed from everyone's taste**. |
| **TandemParty** | The host installs an extension on a computer and opens the real Shorts / TikTok feed; when the host scrolls, the clip changes for everyone; friends join from a link on any device, no install. (weak, vendor pages: [Shorts](https://tandemparty.com/en/clips/youtube-shorts), [TikTok](https://tandemparty.com/en/clips/tiktok)) | Closest to us. Weakness: host needs a computer + extension; only the host scrolls. |
| **SofaScroll** | For couples: each shares TikToks from TikTok's share menu into one shared queue; free for 2, paid for 3+. (weak, [vendor](https://www.sofascroll.com/blog/watch-tiktoks-together)) | A queue, not a live room. |
| **flock.video** | Added Shorts sync + "daily reel" of Shorts, rooms with chat. Announcement is years old; status unknown. (weak, [blog](https://blog.flock.video/post/watch-youtube-shorts-together-remotely-in-the-browser)) | |
| **Squad, Moonbounce** | Squad: rooms up to 9 with voice / video and TikTok watching (screen sharing); Moonbounce: Chrome extension promoted as "doomscroll with friends" (weak, [TikTok discover](https://www.tiktok.com/discover/watch-tiktok-together-app)). | |
| General tools (W2G, SyncUp, Discord) | Paste a Shorts link like any video; no vertical view, no swipe. ([SyncUp](https://syncup.tv/watch-youtube-together), [glint](https://glint.so/blog/watch-youtube-together-online)) | |
| Teleparty | Guides warn that Shorts and embeds are unreliable in Teleparty ([anidachi](https://www.anidachi.app/guides/teleparty-not-working-youtube)). | |

**Where we stand.** ScreenWithMe's Shorts view (vertical player, seats with faces / cameras, swipe on phones, ♾ feed,
🎲 Discover, ✨ More like this, TikTok official player) is already more complete than anything found: **no host
computer, no extension, anyone in the room can swipe, works on phones, live and synced.** Nobody markets this well;
TandemParty has SEO pages exactly for "watch YouTube Shorts / TikTok together". Two ideas worth the owner's look:
1. A public **"Scroll Shorts together"** page / home-page door (English first) with a one-click "start a Shorts room"
   (opens 🎲 Discover in a new room). Low effort, matches what people search for.
2. **Blend-style mixed feed** (each person's ♾ topic or ✨ pick takes turns in the feed). This is a new idea, so it
   belongs in `STATUS.md` "Ideas waiting for the owner's pick", not in 0.9.94 work.

---

## Cards proposed (in `CARDS.md` → Proposed)
1. Simplify the room: "first view" rule (until something plays).
2. Help / FAQ: order and content from this research.
3. "Send feedback" form with opt-in diagnostics.
4. Extension permission explainer (FAQ answer + extension page + "Filme git" card).
5. "Scroll Shorts together" landing page / home door.

(The Blend-style mixed feed is an idea for the Planner to put on `STATUS.md` "Ideas waiting for the owner's pick";
Research does not edit `STATUS.md`.)
