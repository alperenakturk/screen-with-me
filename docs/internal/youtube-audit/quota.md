# How much quota to ask for

## What one action costs (our code, `packages/shared/src/yt-usage.ts`)
`search.list` = 100 units; `videos.list`, `channels.list`, `playlistItems.list` = 1 unit each (`UNIT_COST`).

| Action | API calls | Units |
|---|---|---|
| A new search (Enter in the link box) | search.list + videos.list | 101 |
| The same words again within 24 h | answered from our cache | 0 |
| A Discover list | one shared answer per kind, region, language and day | 101 the first time that day, then 0 |
| "More like this" | channels.list + playlistItems.list + videos.list | ≈ 4 (101 when it falls back to a search) |
| Following a channel | ≈ 3 | ≈ 3 |
| A queue title | YouTube's public oEmbed (not the Data API) | 0 |

## Our own limits (they stay after a grant, as a safety net)
- search only when the person presses Enter, never as they type;
- the same words answered from a 24 h cache;
- at most 10 searches a minute per address;
- a daily budget of `DAILY_UNIT_BUDGET` = 9,000 units today (90 % of the free 10,000; raised to 90 % of the grant);
- at most `IP_DAILY_UNITS` = 2,000 units per address per day.

## The request
- **Daily quota: 100,000 units.** Arithmetic for the form: a launch with 500 active rooms a day × 2 new searches ×
  101 units ≈ 101,000 units, before our cache (the same words in the same day cost 0) and before the cheap calls
  (Discover, More like this and the planned video and Shorts feeds use the 1-unit calls first, card SH2). Today's
  10,000 units are about 99 new searches a day for everyone together, which a few busy rooms use up.
- **`search.list` per day:** about 950 calls (≈ 95,000 units); the rest for `videos.list`, `channels.list`,
  `playlistItems.list`.
- **Peak per minute:** fill from the counters (the busiest minute is bounded by our 10 searches a minute per address;
  give the measured figure, not a guess).
- Ask modestly and grow through "another extension within 12 months" (the research: requests not backed by real use are
  a common reason for refusal).

## The usage table (on the day)
The counters live in our Worker (`GET /api/youtube/usage`, plain numbers per day: requests by kind, calls by method,
units; no words, no addresses, no rooms; 90 days). The owner reads them; the token never goes into the chat or the repo:

```bash
curl -s -H "X-Usage-Token: <USAGE_TOKEN, from KeePass, Sidelit folder>" https://sidelit.app/api/youtube/usage
```

He sends B2 the JSON (it holds only counts). B2 fills this table with the last 30 days and the peak day:

| Day | search | pool | like | channel | units |
|---|---|---|---|---|---|
| … | | | | | |
| **Peak day** | | | | | |
| **30-day average** | | | | | |
