# Research: may our rail overlay an embedded YouTube player?

_Research session, 2 Nov 2026, for the Planner's card "Rail look on YouTube: verdict". Read-only._

**Question.** On the extension's film page the right rail (😀 📌 🎙 📷 1× ⏭ ⛶) is a translucent column that sits on
the video's right edge and auto-hides. On YouTube (site) the rail sits beside the player, never on it (CLAUDE.md "One
remote", 0.9.91.18). Could the film-page look be used on YouTube too, if it is translucent, auto-hiding and does not
cover YouTube's own bar, logo, title, ads or controls?

## Verdict: **not allowed** (not grey)

The rule does not depend on what is covered or how transparent it is: **any** visual element in front of **any part**
of the embedded player is out.

## Primary sources (exact lines)

**YouTube API Services – Required Minimum Functionality**, section "Overlays and frames"
([developers.google.com/youtube/terms/required-minimum-functionality](https://developers.google.com/youtube/terms/required-minimum-functionality)):
> "You must not display overlays, frames, or other visual elements in front of any part of a YouTube embedded player,
> including player controls."
>
> "…you must not use overlays, frames or other visual elements to obscure any part of an embedded player…"

Same page, "YouTube Player attributes":
> "You must not make changes to the YouTube player that are not explicitly described by the API documentation."

Same page, "Embedded YouTube Player size":
> "Embedded players must have a viewport that is at least 200px by 200px." … (controls must fit) "without shrinking
> the viewport below the minimum size." "We recommend 16:9 players be at least 480 pixels wide and 270 pixels tall."

**YouTube API Services – Developer Policies**
([developers.google.com/youtube/terms/developer-policies](https://developers.google.com/youtube/terms/developer-policies)):
- III.C.1: API clients "must also comply with the Requirements for Minimum Functionality for YouTube API Services".
- III.I.6: you must not "modify, build upon, or block any portion or functionality of a YouTube player;"
- III.I.4: you "must not remove, obscure, alter, or disable any links that appear in YouTube players or in API Data."
- III.F.2.c: you must not "interfere with or obscure any attribution provided by YouTube", "including attribution
  provided via or shown in embedded YouTube players."
- III.I.5: you must not "modify, interfere with, replace, or block advertisements placed or served by YouTube".

**YouTube API Services Terms of Service**
([developers.google.com/youtube/terms/api-services-terms-of-service](https://developers.google.com/youtube/terms/api-services-terms-of-service)):
§6 "YouTube may monitor, review and inspect your API Client(s)" and "monitor and audit your access to and use of the
YouTube API Services"; §3.1 / §24.2 YouTube "may suspend or terminate your access". The Developer Policies are part of
the Agreement (§2.1).

The revision history ([revision-history](https://developers.google.com/youtube/terms/revision-history)) shows no
recent loosening; the latest embedded-player change (7 Jul 2025) only adds API-client identity requirements.

## Why "translucent, auto-hiding, at the edge" does not help
- "in front of **any part**" + "**other visual elements**": a translucent rounded column over the right edge is a visual
  element in front of part of the player, whether or not it covers YouTube's own buttons.
- Auto-hiding only shortens the time it is in front; while it shows, it breaks the rule.
- The rule says "including player controls", i.e. controls are covered **in addition**; it is not limited to them.
- III.I.6 "block any portion" also covers a click-catching layer: the rail takes clicks meant for the video there.

## What the API compliance audit would likely say
The quota increase we need (ROADMAP §4, YouTube search) goes through the "YouTube API Services Audit and Quota
Extension Form" ([quota and compliance audits](https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits)).
Auditors check the live product against the Developer Policies and RMF; a rail drawn over the player is a direct,
easy-to-see match for "Overlays and frames" and would likely be listed as a violation to fix before approval (or a
reason to refuse / later suspend). No public source lists audit failures by overlay specifically, but the rule is
literal and the auditor needs no interpretation to apply it.

## What others with YouTube embeds do
- **Watch2Gether:** staff on their forum say an invisible frame over the player "would violate the terms of service
  of Youtube which do not allow to put anything on top of the player"; their own controls sit **under** the video
  ([W2G forum](https://community.w2g.tv/t/use-youtubes-own-video-control-instead-of-an-overlayed-one/51526)).
- Typical sync rooms: video, basic controls underneath, chat beside it
  ([gHacks on Synctube alternatives](https://www.ghacks.net/?p=85822)).
- **Discord Watch Together** is an official YouTube integration with its own agreement; its activity is the YouTube
  player plus a queue beside it, not a reference for third parties.
- Chat-over-YouTube overlays exist only as **browser extensions on youtube.com** (e.g. OverPlay), which are not API
  clients of the embedded player and are outside these terms.

## Recommendation
- **YouTube:** keep the current formula: the rail beside the player, never on it (player width shrinks while the rail
  shows, as in 0.9.92.8).
- **One design everywhere** (owner's wish): use the YouTube formula on the film page too: a rail that opens and
  closes but is placed by the video's size and never covers the video. The film page itself is not under YouTube's
  terms, so this is a design choice there, not a legal need; it gives one look and removes "our rail covers the
  film's own buttons" issues.

## Related compliance risks found while checking (for the Planner)
The same rule touches other things we still draw over the YouTube player today (from CLAUDE.md and the code):
1. **`#rail-edge`** (`apps/web/src/room.ts`, `styles.css` `.rail-edge`): a see-through 36 px strip **over the
   player's right edge** that catches the mouse while the rail rests. Invisible, but still an element in front of part
   of the player that takes its clicks (W2G staff call exactly this a ToS violation).
2. **Flying emojis over the video in the room view** (0.9.93 brought them back on the owner's wish).
3. **The "3-2-1, together" countdown** (`.countdown`) and other notes shown over the video, and the fullscreen dock /
   toasts / camera tiles over a YouTube player in fullscreen.
ROADMAP §1 already has "Room view YouTube overlays … before the YouTube API audit" and CLAUDE.md notes the owner
accepted some risks (one remote, "6 / 7"). These need one decision before the audit: move each beside / outside the
player, or accept the audit risk in writing.

---

## Follow-up (Job 3): Watch2Gether's webcams, and our four items

_Asked by the Planner for the owner, 2 Nov 2026: W2G has YouTube search and webcams; do its cameras sit over the
video, and how does that square with RMF "Overlays and frames"?_

### (1) Where W2G puts webcams, chat and controls
- **Webcams are not drawn over the YouTube player.** Users see them as tiles in the room; to see a camera big, the
  user picks "webcams" (or a screen share) **as the source of the player area** from the dropdown next to the search
  bar, i.e. the cameras take the player's place instead of floating on it. A 2020 user request to "bring back"
  clicking a box to put a webcam "on the player screen" was answered by staff with this dropdown
  ([W2G: Bring back the ability to play webcams on screen](https://community.w2g.tv/t/bring-back-the-ability-to-play-webcams-on-screen/147527),
  [W2G: How do I play my camera on the YouTube player screen?](https://community.w2g.tv/t/how-do-i-play-my-camera-on-the-youtube-player-screen/147551)). (firm for the mechanism; the exact
  current UI is not visible from here: weak.)
- When a user asked to **swap cameras and video** on mobile, staff replied: "Most video platforms allow the embed
  only if it's visible on the page with a certain minimum size"
  ([W2G: Swap camera and video location](https://community.w2g.tv/t/swap-camera-and-video-location/187625)).
- Staff on overlays: an invisible frame over the player "would violate the terms of service of Youtube which do not
  allow to put anything on top of the player"; their play / pause controls sit **under** the video
  ([W2G: use YouTube's own control](https://community.w2g.tv/t/use-youtubes-own-video-control-instead-of-an-overlayed-one/51526)).
- Search results show **under** the player
  ([W2G: How to use](https://community.w2g.tv/t/how-to-use-watch2gether/736)); a request for a fullscreen view with a
  chat **sidebar** shows there is no chat over the fullscreen video
  ([W2G: W2gSync separate window](https://community.w2g.tv/t/when-using-w2gsync-video-opens-in-a-separate-window-to-chat/23762)).
  W2G has had its own fullscreen button removed at some point ([W2G: Add back Full Screen button](https://community.w2g.tv/t/add-back-full-screen-button/182867)).
- So the picture the owner remembers ("cameras over the video") is most likely the camera **source** in the player
  area, or cameras next to a small player; no source shows W2G tiles over a YouTube iframe.

### (2) W2G's API key and audit
W2G runs a YouTube search inside rooms, so it uses the Data API with its own key; staff say results differ from
YouTube's own search ([W2G: search results limited](https://community.w2g.tv/t/youtube-video-search-result-limited/142268)).
**No public statement** about a compliance audit or quota extension was found (unknown). Their staff's own words
above show they treat RMF as binding.

### (3) Does the user moving a window, or a page-level fullscreen, change the rule?
- The rule is about what the **API client displays**: "You must not display overlays, frames, or other visual elements
  in front of any part of a YouTube embedded player". It has **no exception** for elements the user moves there.
  Letting the user drag our camera over the player is still our page displaying it in front of the player. (No
  official text discusses user-moved windows: weak, but the literal reading has no gap.)
- **A page-level fullscreen** (our ⛶ makes the theater element fullscreen, with the player inside it) is fine **as long
  as nothing sits in front of the player inside it** and the player keeps ≥ 200 × 200 px with room for its controls
  (RMF "Embedded YouTube Player size"). Cameras and chat **beside** the player inside that fullscreen are allowed; on
  it, they are not.

### (4) Other apps with YouTube and video chat
- **Discord Watch Together**: an official YouTube integration with its own agreement; video chat is Discord's call UI
  around the activity (not a model for an API client).
- **Kosmi**: friends' webcams and chat "on the side of the screen", layout resizable
  ([galaxus review](https://www.galaxus.at/en/page/how-to-enjoy-online-movie-and-gaming-nights-with-your-friends-15842), weak).
- **Teleparty**: runs on youtube.com itself as an extension (not an embedded-player API client); a side-window chat
  layout ([Teleparty changelog via Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/igbncjcgfkfnfgbaieiimpfkobabmkce));
  video calls are Premium. A third-party theme moves the chat over the video (not Teleparty's own choice).
- **Rave**: mobile app; a review mentions typed messages "over your video" (weak, unknown which sources).
- **Scener**: nothing current found.
Pattern among web clients: cameras and chat beside the player; only the official partner (Discord) or
non-embed products differ.

### (5) Recommendation for our four items (YouTube only; video files and film pages may keep today's design)
| Item | Today | Recommendation |
|---|---|---|
| **`#rail-edge`** strip | Invisible 36 px strip over the player's right edge catches the mouse | **Remove from over the player.** Detect the edge from outside: a thin gutter (≈ 12–16 px) **beside** the player where the strip lives, plus the document `mousemove` (`EDGE_OUT`). Or keep a slim always-visible handle beside the player. |
| **Flying emojis** (room view) | Rise over the video | Rise in a **column beside the video** (between the video and the rail, or from the rail / the Together faces), like the Shorts seats do. Keep over-video emojis for video files and film pages. |
| **"3-2-1" countdown + notes over the video** | Big numbers / notes on the player | Show the countdown **above or beside the player** (top bar / rail head) or in the chat's notice area (`.yt-notices`, as 0.9.92.9 already did for other notes). |
| **Fullscreen messages + camera tiles** | Toasts and free camera tiles over the fullscreen YouTube player | In fullscreen with YouTube, use a **split layout**: the player shrinks to leave a side column (the rail already does this) that holds cameras (a vertical strip of tiles, 1–4) and the newest messages; free camera windows may move anywhere **except over the player's box** (they snap out / the player shrinks to make room). An optional "cameras big" mode puts the cameras **in the player area** like W2G's camera source only if the player stays visible ≥ 200 × 200 px beside them. |

**Which design keeps cameras usable while watching YouTube:** the split layout: video + a camera column beside it
(window and fullscreen), with tile sizes from the person menu (small / medium / large) changing the column width, not
covering the video. It matches W2G / Kosmi and is the only form that passes the audit.
