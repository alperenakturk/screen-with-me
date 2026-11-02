# Research: more players without the extension

_Research session, 2 Nov 2026, Job 4 from the Planner (owner's idea "More players without the extension"; Watch2Gether's
search box has a source picker: YouTube, Vimeo, Freesound, Web Radio, Apple Music, Podcasts, KLIPY, Coub, Dailymotion,
Mixcloud, "Streaming"). Read-only._

**Limits.** The players' developer sites (developer.vimeo.com, developers.soundcloud.com, dev.twitch.tv,
developers.dailymotion.com) could not be opened from this cloud session (not in the allowed network domains); facts
come from web search excerpts of those pages, GitHub (Vimeo's SDK README) and forums. Each row is marked **(firm)** or
**(weak)**. Before building any of them, the Developer should read that player's official reference once.

**What our sync engine needs** (`packages/shared/src/sync-engine.ts`): play, pause, seek, read the current time
(events or polling), ideally a rate (else lock 1× like TikTok, `maxRateFor`), an "ended" signal, and a player that
plays after a user tap on phones. A player kind is a `PlayerAdapter` like `players/tiktok.ts`.

## Candidates

| Player | Embed / control API | play · pause · seek · time · rate | Search API, cost | Terms / notes | CSP hosts (frame / script) | Phones |
|---|---|---|---|---|---|---|
| **Vimeo** | `player.js` SDK (postMessage) (firm, [README](https://github.com/vimeo/player.js)) | all yes; `timeupdate` ≈ 250 ms, `seeked`, `ended`; **rate 0–2 only on videos from PRO / Business accounts**, else lock 1× | REST API with OAuth token; per-app rate limits (≈ 250 req / 15 min on free apps, weak, [Vimeo help](https://help.vimeo.com/hc/en-us/articles/12427783954065-Rate-limits)) | owner can disable embedding / rate; private videos fail with `PrivacyError` | `player.vimeo.com` | iOS: no programmatic play until the viewer tapped once; no `setVolume` on phones (firm) |
| **Dailymotion** | Player Web SDK (`createPlayer`, `getState` → `videoTime`, events); a **Player ID** from a (free) Dailymotion account is mandatory (firm, [docs](https://developers.dailymotion.com/docs/retrieve-player-state-web)) | play / pause / state yes; web `seek` and `setPlaybackSpeed` (0.25–2) documented for iOS / Android, web to verify (weak) | public Data API `api.dailymotion.com/videos?search=` answers without a key (weak, several sources) | ads by Dailymotion inside the player; overlay rules unknown | `geo.dailymotion.com`, `*.dailymotion.com` | yes |
| **SoundCloud** | Widget API `SC.Widget` (firm, [docs](https://developers.soundcloud.com/docs/api/html5-widget)) | play, pause, `seekTo(ms)`, `getPosition`, `PLAY_PROGRESS`, `FINISH`; **no rate** (lock 1×) | REST API (search) reportedly not open to new apps (weak); links + oEmbed only | attribution in the widget | `w.soundcloud.com` | yes (tap first) |
| **Twitch** | Interactive embed `Twitch.Player`; `parent=` must name our domain; min height 300 (≈ 400 × 300) (firm, [embed docs](https://dev.twitch.tv/docs/embed/video-and-clips/)) | **live channels: nothing to sync** (everyone sees live); **VODs**: play / pause / `seek` / `getCurrentTime` (seek snaps up to ~4 s to a segment, weak, [forum](https://discuss.dev.twitch.com/t/embed-player-seek-function/5927)); no rate | Helix API with app token (search channels / videos), rate-limited (weak) | player must not be hidden while playing; overlay rules not found | `player.twitch.tv`, `embed.twitch.tv` | yes |
| **Mixcloud** | Widget JS API: `seek` (resolves false when not allowed), `getPosition`, `getIsPaused`, play / pause / progress / ended events; widget **must be visible** (firm, [docs](https://www.mixcloud.com/developers/widget/)) | yes, but seeking can be refused (licensing) | public API | DJ mixes; licensing limits seeks | `player-widget.mixcloud.com`, `widget.mixcloud.com` | yes |
| **Web radio** (Radio Browser) | plain `<audio>` stream: our `html5` kind already plays it | live: no seek; sync = same station | Radio Browser API: free, no key, community servers via `all.api.radio-browser.info` (firm, [api.radio-browser.info](https://api.radio-browser.info)); filter broken stations | stations' own streams; HTTP-only streams blocked on HTTPS | `media-src` for any `https:` stream (CSP change) | yes |
| **Podcasts** (iTunes Search → RSS → MP3) | episode = an audio file: our `html5` kind, **perfect sync** | all yes incl. rate | iTunes Search API free, no key, ~20 req/min (weak); RSS read by the Worker | public feeds; show the podcast's name / art | `media-src https:`; Worker fetches RSS | yes |
| **Spotify** | iFrame API embed controller (`seek`, `pause`, `resume`, `playback_update`) (firm, [docs](https://developer.spotify.com/documentation/embeds/references/iframe-api)) | works, but users report API-started playback falls back to **30 s previews** and `ready` not firing (weak, [community](https://community.spotify.com/t5/Spotify-for-Developers/Spotify-iframe-API-play-resume-starts-preview-playback-while/td-p/7430703)) | Web API needs OAuth | everyone needs their own login / Premium for full tracks | `open.spotify.com` | partly |
| **Apple Music** | MusicKit JS / web components; needs an Apple developer token (paid program) | controllable | catalog search with the developer token | subscription per listener; previews otherwise (weak) | `js-cdn.music.apple.com`, `embed.music.apple.com` | yes |
| **Streamable** | iframe embed; **no control API** found, only a read-only metadata API (weak, [help](https://streamable.helpscoutdocs.com/article/46-streamable-api)) | no | no | — | — | — |
| **Kick** | iframe `player.kick.com/<user>` with URL options; **no JS control API**, live only (firm, [Kick help](https://help.kick.com/en/articles/8010826-how-to-embed-your-kick-livestream)) | live only | no | — | `player.kick.com` | yes |
| **Bilibili, Coub** | not researched in depth: Bilibili embeds are region / login dependent; Coub is short loops (a GIF-like feed) | — | — | — | — | — |
| **Freesound, KLIPY** | sound effects / GIF search, not "watch together": candidates for the soundboard / chat GIFs, not players | — | Freesound needs a free key; KLIPY is a GIF API | CC licences per sound (Freesound) | — | — |

## Ranked shortlist (value for watching / listening together × effort × risk)

1. **Vimeo**: high value (the second video site people paste), small effort (the SDK maps 1:1 to our adapter; lock
   1× unless `getPlaybackRate` works), low risk. Links first; search later only if wanted (needs an OAuth app token
   in the Worker).
2. **Podcasts**: good "listen together" value, small–medium effort, very low risk: episodes are plain audio files the
   `html5` kind already syncs perfectly, rate included; the work is search (iTunes Search API via the Worker) and an
   episode picker.
3. **SoundCloud**: medium value (music / DJ sets together), small effort (widget API), low risk; links only (no new
   search keys). 1× only.
4. **Dailymotion**: medium value, medium effort (needs a Player ID in the owner's account; verify web seek), keyless
   search is a plus; ads inside its player.
5. **Twitch**: medium value. Live channels need no engine at all (a "watch this channel" kind, everyone live), VODs
   sync roughly (segment-snapped seeks). Needs the `parent` parameter for our domain, so best **after** the domain
   move (0.9.96).
6. **Web radio**: fun, tiny effort if `media-src` is opened to `https:` streams (security review: it widens the CSP),
   no sync beyond "same station".
7. Later / not recommended: **Mixcloud** (seeks may be refused), **Spotify** and **Apple Music** (every listener needs
   their own login / subscription, unreliable APIs, previews), **Streamable**, **Kick** (no control API), **Bilibili**.

**Common work for any new kind:** a `PlayerAdapter` (`players/<kind>.ts`), link parsing in `media.ts` +
`cleanMedia` validation in `protocol.ts` (optional new kind, no version bump), CSP hosts in `apps/web/public/_headers`,
the privacy policy (each third-party player sets its own cookies), a harness with a fake player speaking the same
protocol (the cloud can't reach these sites; the TikTok harness is the model), and the owner's real-browser check.

## Suggested cards (for the Planner to fold into the "More players without the extension" card from PR #121)
1. **Vimeo player (links):** `players/vimeo.ts` on `player.js`; 1× lock unless `getPlaybackRate` works; CSP
   `player.vimeo.com`; fake-player harness; owner's real check (computer + phone).
2. **Podcasts together:** iTunes Search via the Worker (cached, rate-limited), RSS → episode list, episode = `html5`
   audio item with show art; privacy policy line.
3. **SoundCloud player (links):** `players/soundcloud.ts` on the Widget API; 1× lock; CSP `w.soundcloud.com`.
Later: Dailymotion (needs a Player ID in the owner's account), Twitch (after the domain move: `parent=`), web radio
(needs `media-src https:` in the CSP, security review first).
