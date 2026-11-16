# Hyperbeam (competitor profile)

_Field research, 15 Nov 2026 (Research session). Method: web search excerpts; the vendor site was not reachable from
the cloud session unless said (`news.ycombinator.com` failed with ENOTFOUND, so the Launch HN thread was read only via
excerpts). **WEAK** = single / vendor / SEO source, **GUESS** = inference. Related: overview.md._

## At a glance
| | |
|---|---|
| What | Two products from one 3-person Waterloo (Canada) company: **Hyperbeam Watch Party**, a shared cloud browser for friends, and the **Hyperbeam API**, embeddable "virtual computers" / multiplayer browsers for developers [1][2][3] |
| Platforms | Web (watch.hyperbeam.com, also watchnext.hyperbeam.com); help centre mentions desktop and mobile apps; a Discord bot [4][5][6] |
| Services | Any website opened in the cloud browser; DRM services (Netflix, Hulu) reported not to play [7][8] |
| Talk | Text chat with emoji / GIFs, audio and video calls [4] |
| Games | None of its own; any browser game can be opened in the shared browser (GUESS) |
| Account | Host signs in (GUESS from Premium perks); guests by link |
| Phone | Help centre lists a mobile app; a competitor says phone friends cannot use it (WEAK) [5][9] |
| Price | Watch Party: free with **3-hour sessions + 10-minute wait**, Premium **~$5 / month** (WEAK) [10][11]; API: 10,000 free minutes / month, then usage-based [3] |
| Size / ratings | 150 K MAU and 1 M+ video hours / month at the 2022 pivot [1]; 1.25 M+ hours / month (undated) [3]; Trustpilot 3.5–3.7 from ~138 reviews [7] |
| Status 2026 | Both "Watch Party" and "Dispatch API" listed operational (date unknown) [12]; "We aren't shutting down" (X, 22 Jul 2024) [13]; no dated 2025–2026 news found |

## Product and platforms
- Origin: a university project / anime watch-party site **Tutturu** → renamed **Hyperbeam** → launched on Product Hunt
  **3 Aug 2021** (#2 Product of the Day, 296 upvotes) [2][14].
- **YC W22**, founded 2021, ~$500 K raised (YC, Pioneer Fund, University of Waterloo endowment, WEAK) [3][15]. Founders
  Philip, Amby and Declan [1].
- **Pivot (Feb 2022, Launch HN):** the consumer site had grown to **150 K MAU and 1 M+ hours of video a month, then
  stopped growing**; companies asked to buy the tech; after three deals they sold multiplayer browsers as an API [1].
- The consumer product moved from hyperbeam.com to **watch.hyperbeam.com**; hyperbeam.com is now the developer site
  ("Embed virtual computers in your website") [2][4].
- API positioning: web, mobile, VR and VS Code embeds with multi-user browser sync (WEAK) [3]. Open-source examples
  (including a Chrome-extension upload example) and a Discord bot on GitHub [6][16].
- Many AI-agent "browser infrastructure" startups raised large rounds in 2025 (e.g. Kernel $22 M, Oct 2025); no sign
  that Hyperbeam joined that wave [17].

## Supported services and how
- **Cloud browser:** a Chromium runs on Hyperbeam's servers; everyone sees the same video stream and can pass control
  ("visit almost any website and pass control of the browser to anyone") [4]. Sync is by construction (one browser);
  guests do not need a fast connection (vendor) [4].
- **No extension and no own players.** Nothing runs on the user's side except the video stream.
- **DRM services:** Trustpilot reviewers report "no compatibility with Netflix or Hulu", and that Hulu will not play
  even through the proxy feature [7][8]. Third-party roundups list DRM among the limits of shared virtual browsers
  (WEAK) [18]. GUESS: services detect the server browser or block its DRM, so black screens / errors are expected.
- **YouTube:** the built-in ad blocker stopped working; reviewers say YouTube ads now ruin watch parties; the company
  replied that it does not make ad blockers and YouTube blocks them [7].

## Room features
- Shared browser with control hand-off; emoji and GIF chat; audio and video calls; private rooms; custom invite links
  [4].
- Premium help-centre items: **saving browser state, vanity links, moderators**; "animated profile pictures" and
  "ultra bitrate" per a review (WEAK) [5][10].
- Stream quality: one source says 720p unless Premium (WEAK) [11].
- Room size: API supports 1–10,000 participants (older research, `rakip-analizi.md`); consumer room caps not found.
- Discord bot brings a shared browser into a server (mobile / tablet / desktop, vendor) [6].

## Onboarding and accounts
- **Host:** open watch.hyperbeam.com → create a room → share the link; Premium needs an account (GUESS: vanity links
  and saved browser state imply one).
- **Guest:** open the link; nothing to install (vendor: "no downloads or browser extensions necessary") [2].
- **Free-tier friction:** sessions end after **3 hours**, then a **10-minute wait** before a new room (two reviews;
  one said it was briefly cut to 2 hours) [8][10][11].

## Phone experience
- Help centre: "Download the mobile app" and "Download the desktop app" (undated Notion page) [5]. SaaSHub tags iOS
  and Android (WEAK) [19].
- GroupTube (competitor): if a friend is on a phone "you will not be able to use Hyperbeam" (WEAK) [9].
- A Trustpilot reviewer asks for a working mobile watch-party app "like this one" [8].
- Verdict: phone support is unclear; no store listing with ratings was found (GUESS: no current native app).

## Pricing, limits, ads and income
- **Watch Party Free:** 3-hour sessions, 10-minute wait, standard bitrate (WEAK) [10][11].
- **Watch Party Premium:** ~$5 / month ($4.99 in one source): unlimited session length, custom / vanity links, saved
  browser state, moderators, higher bitrate (WEAK, several sources up to May 2026) [7][10][11][20].
- **API:** 10,000 free participant-minutes a month, then pay-as-you-go [3]; older research found ~$0.007 per
  participant-minute (WEAK, `competitors-how.md`). SaaSworthy's page dates from Oct 2022 and is stale [21].
- No ads of its own. Income: Premium + API usage (the API is the main business since 2022 [1]).

## Privacy
- Watch Party privacy policy dated **5 Aug 2022**: standard site data; log files with IP address, browser type, ISP
  and similar [22]. Nothing specific found on cloud-browser sessions, stored cookies or logins.
- Users who log in to services inside the shared browser hand that session to a third-party server (send.win, WEAK)
  [18]. "Saving browser state" (Premium) means cookies / logins persist on Hyperbeam's side (GUESS).
- Account deletion process: not found.

## Store ratings and recurring complaints
| Source | Number | Date |
|---|---|---|
| Trustpilot (hyperbeam.com) | TrustScore 3.5; 3.7 average over ~138 reviews, 83% five-star [7] | seen 15 Nov 2026 |
| Trustpilot (older regional snapshot) | 4.5 from 33 reviews [8] | older, undated |
| Product Hunt | #2 Product of the Day, 3 Aug 2021 [14] | 2021 |
| App stores / Chrome Web Store | no listing with ratings found | seen 15 Nov 2026 |

Complaint themes:
1. **Ad blocker gone → YouTube ads in watch parties** (several 1-star reviews) [7].
2. **No Netflix / Hulu** (DRM services do not play) [7][8].
3. **Free-tier time limit and wait** (3 h / 10 min) [10][11].
4. **Lag, bugs, crashes** on the website (review cons) [10].
5. **Support moved off Trustpilot** to e-mail only [7].
6. No working phone experience [8][9].

## Recent changes (2025–2026)
- No dated Hyperbeam announcement found for 2025–2026. Status page shows "Watch Party" and "Dispatch API" operational
  (date unknown) [12].
- Jul 2024: the Watch Party account on X denied a shutdown and pitched it to online friends and long-distance couples
  [13].
- A second consumer host, **watchnext.hyperbeam.com**, serves the same Watch Party pitch (a new front end, GUESS) [23].
- Competitors now run "Hyperbeam alternative" pages (Kosmi, SyncUp, GroupTube, Cliqroom, mzelo), a sign that people
  search for a replacement (GUESS) [9][24][25].
- The previous research's "status unclear" stands: the product is alive, apparently maintained at low effort (GUESS).

## Against Sidelit
- Where they are ahead:
  - **Any website with nothing installed**, including on networks where our extension cannot be used.
  - **Pass control** of one browser: any person can drive, search or click.
  - A paying API business that funds the servers.
  - Long-distance couples and anime groups as a known audience [2][13].
- Where Sidelit is ahead:
  - **Free with no time limit and no wait.**
  - **Full-quality picture**: each person's own player, no 720p stream, no server lag.
  - **YouTube without the ad problem:** the official player, no ad-blocker dependence (and our rule: no ad skipping).
  - **Never relays DRM content**; Netflix etc. planned through each person's own subscription.
  - **Phone site** (YouTube, Shorts, TikTok, files) vs unclear phone support.
  - Games, reactions, queue, pins, votes, saved rooms, recap; English + Turkish.
  - No login data on our servers (no shared browser holding cookies).

## Ideas worth taking
1. **"Pass the remote"**: a visible host-to-person hand-off of control (who drives the queue / player now), one tap,
   shown to everyone. Why: Hyperbeam's best-loved feature is "pass control to anyone"; we have host and acting host but
   no simple hand-off. Effort S–M. Fit: lane A (check existing host rules first).
2. **Long-distance couples page / preset**: a two-person room preset (voice on, cams on, cozy theme) and one help
   entry. Why: Hyperbeam and Kosmi both market to LDRs. Effort S. Fit: lane A + Design.
3. **Answer the "Hyperbeam time limit" search** with an honest help page: "Sidelit rooms have no time limit and no
   wait." Effort S. Fit: lane A copy, after the own domain.
4. **Saved room "state"** (last video, position, queue) already exists as saved rooms; make "pick up where we left
   off" visible on rejoin. Why: Hyperbeam charges for saved browser state. Effort S. Fit: lane A.
5. **Discord entry point**: a share button that formats the invite nicely for Discord (title, thumbnail via the
   existing link preview). Why: Hyperbeam built a Discord bot to meet groups where they are. Effort S. A real Discord
   bot / Activity: L, after 1.0.
6. Cloud browser: **not recommended** (server cost, DRM relay, login custody). Recorded as a decision only.

## What could not be checked
- Current watch.hyperbeam.com pricing page, room size, Premium list and changelog (Notion help centre not readable).
- Whether a mobile app is still in any store.
- The 2022 Launch HN thread text beyond excerpts (host blocked).
- Exact date of the status-page snapshot; any 2025–2026 product release.

## Sources
1. [Launch HN: Hyperbeam API (YC W22)](https://news.ycombinator.com/item?id=30433104) — Feb 2022 (via search excerpt)
2. [What is Hyperbeam? (Watch Party blog)](https://watch.hyperbeam.com/blog/What-is-Hyperbeam/) and [hyperbeam.com](https://hyperbeam.com/) — seen 15 Nov 2026, WEAK (vendor)
3. [Y Combinator: Hyperbeam](https://www.ycombinator.com/companies/hyperbeam) and [yespress: Hyperbeam YC W22](https://yespress.io/hyperbeam-yc-w22) — seen 15 Nov 2026
4. [Hyperbeam Watch Party](https://watch.hyperbeam.com/) — seen 15 Nov 2026, WEAK (vendor)
5. [Hyperbeam Watch Party Help Center (Notion)](https://showy-backpack-b3f.notion.site/Hyperbeam-Watch-Party-Help-Center-5cfcba218905485eb76a0662d341c7c8) — undated
6. [GitHub: hyperbeam/discord-bot](https://github.com/hyperbeam/discord-bot) — seen 15 Nov 2026
7. [Trustpilot: hyperbeam.com](https://www.trustpilot.com/review/hyperbeam.com) and [page 3](https://www.trustpilot.com/review/hyperbeam.com?page=3) — seen 15 Nov 2026
8. [Trustpilot CA: hyperbeam.com](https://ca.trustpilot.com/review/hyperbeam.com) — seen 15 Nov 2026
9. [GroupTube: Hyperbeam alternative](https://group.tube/hyperbeam-alternative) — seen 15 Nov 2026, WEAK (competitor)
10. [Scalarly: Hyperbeam, a better way to watch together](https://scalarly.medium.com/hyperbeam-a-better-way-to-watch-together-online-45d0382038c) — undated, WEAK
11. [SyncUp: Best watch party apps 2026](https://syncup.tv/blog/best-watch-party-apps-2026) and [SyncUp: Hyperbeam alternative](https://syncup.tv/hyperbeam-alternative) — May 2026, WEAK (competitor)
12. [Hyperbeam status page](https://status.hyperbeam.com/) — seen 15 Nov 2026 (snapshot date unknown)
13. [Hyperbeam Watch Party on X: "We aren't shutting down"](https://x.com/hyperbeamapp/status/1815203546704282010) — 22 Jul 2024 (date from the post id)
14. [YC Launch: Hyperbeam](https://www.ycombinator.com/launches/H4D-hyperbeam-embed-third-party-apps-games-and-websites-anywhere) and [yespress: Philip Scott](https://yespress.io/philip-scott) — 2022, WEAK
15. [CB Insights: Hyperbeam](https://www.cbinsights.com/company/hyperbeam) — seen 15 Nov 2026, WEAK
16. [GitHub: hyperbeam/examples](https://github.com/hyperbeam/examples) — seen 15 Nov 2026
17. [Kernel: Series A announcement](https://blog.onkernel.com/series-a-announcement) — Oct 2025
18. [send.win: Hyperbeam alternatives compared](https://blog.send.win/hyperbeam-alternatives-watch-party-tools-compared/) — seen 15 Nov 2026, WEAK
19. [SaaSHub: Hyperbeam](https://www.saashub.com/hyperbeam) — seen 15 Nov 2026, WEAK
20. [Beebom: screen-sharing app to browse the web together](https://beebom.com/screen-sharing-app-browse-the-web-watch-movies-with-friends/) — undated, WEAK
21. [SaaSworthy: Hyperbeam API pricing](https://dev.saasworthy.com/product/hyperbeam-api/pricing) — Oct 2022, WEAK
22. [Hyperbeam Watch Party privacy policy](https://watch.hyperbeam.com/privacy) — 5 Aug 2022
23. [watchnext.hyperbeam.com](https://watchnext.hyperbeam.com/) — seen 15 Nov 2026
24. [Kosmi: Hyperbeam alternative](https://kosmi.io/hyperbeam-alternative/) — seen 15 Nov 2026, WEAK (competitor)
25. [Cliqroom: Hyperbeam alternative](https://cliqroom.com/p/hyperbeam-alternative) and [mzelo: Hyperbeam alternative](https://mzelo.com/hyperbeam-alternative.html) — seen 15 Nov 2026, WEAK (competitors)
