# The form's answers (English, ready to paste)

Field list from `research/youtube-audit.md` §1 (the live form could not be opened from a cloud session; on the day,
any field not here is mapped by B2 before the owner submits). `<…>` = the owner types it himself; it never goes into
this repository.

## 1. Request type
A compliance audit to request a quota extension.

## 2. Organisation and contact
- Individual or organisation: **Individual** (independent developer, no company).
- Full legal name: `<owner>` · Country and address: `<owner>`.
- Primary, technical and business contact: `<owner's name>`, support@sidelit.app (until that mailbox exists:
  screenwithme.app@gmail.com).
- Website: https://sidelit.app
- Industry: Entertainment / media. Business type: independent developer.

## 3. Business model
**What does your organization do and how is it related to YouTube?**

> Sidelit is a free website (no account, no ads) where small groups of friends watch a video together in sync. A
> person creates a room, shares the link, and everyone's player follows the same play, pause and seek. YouTube videos
> play only in the official embedded YouTube player, with YouTube's own controls and nothing of ours in front of it.
> We use the YouTube Data API for: (1) search, when a person types words and presses Enter (search.list, then
> videos.list for durations); (2) Discover, one shared daily list per category and region, cached for the day;
> (3) "More like this", a channel's uploads; (4) following a channel the person names. We store no user YouTube data
> and use no OAuth. Search answers are cached for 24 hours and titles are refreshed or dropped within 30 days. Every
> result list shows the YouTube logo, "Results from YouTube" and a link to the YouTube Terms of Service.

- Primary audience: people watching videos together with friends.
- Revenue model: none. Free, no ads, no paid features.
- Ads over or around YouTube content: **none**.
- YouTube partner manager: no. How we learned about the API: the YouTube Data API documentation.

## 4. API client
- Name: **Sidelit** (does not contain "YouTube").
- Primary access URL: https://sidelit.app/
- Privacy policy: https://sidelit.app/privacy.html · Terms: https://sidelit.app/terms.html
- Public: **yes, no login.**
- Access instructions for the reviewer:

> Open https://sidelit.app, press "Create room", enter any name. In the box above the video, type a few words (for
> example "nature documentary") and press Enter: the YouTube results appear with the YouTube logo and the Terms link;
> press a result to play it in the embedded player. For Discover: open the ♾ button in the room, pick a category.
> No account or invitation is needed.

## 5. Google Cloud projects
- Number of projects: **1** · Project number: `<owner, the numeric project number from Cloud Console>`.
- Use cases: search and discovery of videos; playback in the embedded YouTube player.
- OAuth: **no**; no user YouTube data.

## 6. API methods
`search.list`, `videos.list`, `channels.list`, `playlistItems.list` (every method our Worker calls,
`apps/server/src/youtube.ts`; recheck on the day).

## 7. Quota request
- Daily: **100,000 units**; `search.list`: about 950 calls a day; peak per minute: from the usage table.
- Justification: the arithmetic and our own limits in `quota.md`, with the 30-day usage table.

## 8. Evidence
The screenshots and the screencast link from `self-check.md` and `screencast.md`.
