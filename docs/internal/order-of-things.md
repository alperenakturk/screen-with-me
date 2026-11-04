# Order of things: entering and leaving a room (BH5)

This page lists every way into and out of a room on the site, and what may show in which order. The rule from card
R18 runs through all of it: **nothing that belongs to being in the room shows before the first `welcome`**. That
covers the intro, the invite window, the first-time tips, join sounds, the "continue" record, the extension-update
bubble and voice rejoining.

Each row names the harness check that holds it. Code: `apps/web/src/room.ts` (`playIntro`, `firstJoined`,
`maybeAutoInvite`, `rememberRoom`, the `welcome` / `knock-wait` / `error` cases), `apps/web/src/ext-update.ts`,
`apps/web/src/ui/first-tips.ts`.

## The things and their rules

| Thing | Shows | Never | Order |
|---|---|---|---|
| Join card (name + avatar) | First entry into a room in this tab | On a reload (`in:<room>`), `#back`, the shell, a TV | Before everything else |
| Knock waiting card `#knock-wait` | Between `hello` and `welcome` when the room asks first | After `welcome`; behind the refusal screen | Instead of the room |
| Intro (`.swm-intro`, 2.7 s) | The first `welcome` of the first entry in this tab | Before `welcome` (at the door); on a reload, in the shell, on a TV | First |
| Invite window (automatic) | ≥ 1.7 s after the first `welcome` **and** after the intro is gone, only when nobody else is in | On a reload, `#back`, in the shell, on a TV, when someone came in, when another dialog is open | After the intro |
| First-time tips (3 bubbles) | Once ever (`tipsSeen`), after the first `welcome` | At the door; on a reload / `#back`, in the shell, on a TV; under the intro or the invite window | After the intro and the invite window |
| `data-swm-joined` + `swm-joined` event | The first `welcome` in this page | Before it | Same moment as the intro |
| "Continue where you left off" (`lastRoom`) | Written on `welcome` and on `pagehide` once in | At the door; for a TV; after being removed from that room (and that room's record is forgotten) | — |
| Extension-update bubble | Room pages: after `swm-joined`; other pages: at once | At the door (and then it is not marked seen) | After joining |
| "Someone joined" sound (`roomJoin`) | A new person (name + avatar) arrives, or a new knock card for the host | For reloads / second tabs within 30 s (`JoinFilter`) | — |
| Voice rejoin | After `welcome`, quietly, when `voice:<room>` says I was in voice | Before `welcome` | After joining |
| Refusal screen `#kicked` | Kicked, or refused at the door | Together with the waiting card | Replaces everything |

## Paths in

| # | Path | What shows, in order | Checked by |
|---|---|---|---|
| 1 | First visit, alone in a fresh room | Join card → `welcome` → intro → invite window (after the intro) → tips (after the invite window closes) | `harness/order` |
| 2 | First visit, others already inside | Join card → `welcome` → intro → tips (no invite window) | `harness/knock` (friend let in), `harness/invite` |
| 3 | Reload of the same tab | Room straight away (no join card), no intro, no invite window, no tips; `data-swm-joined` after `welcome` | `harness/order` |
| 4 | `#back` from the film page | As 3 | `harness/embed` |
| 5 | Film page (shell) | The room overlay only: no intro, no invite window, no tips | `harness/embed` |
| 6 | TV (`?tv=1`) | TV mode only: no join card, intro, invite window, tips or `lastRoom` | `harness/tv` (BH6) |
| 7 | Room asks first, let in | Join card → waiting card (nothing of the room, no `lastRoom`) → `welcome` → intro → tips | `harness/knock` |
| 8 | Room asks first, refused | Join card → waiting card → refusal screen alone; no intro, tips or `lastRoom` | `harness/knock` (BH5) |
| 9 | Waiting longer than 10 min | The server closes the knock (4011) and the page reconnects and knocks again: the waiting card stays | — |
| 10 | Too many knocks from one address (`knock_busy`) or a full room (`room_full`) | An error note; the connection closes; nothing of the room | e2e `knock.mjs` (`knock_busy`), `room.mjs` (`room_full`) |
| 11 | Old client (`version`) | "Refresh the page" note; the connection closes; no intro, invite window, tips or `lastRoom` | `harness/order` (BH6) |
| 12 | Dropped connection / deploy | The same member id comes back (`hello.prev`): voice, stream and games carry on; no intro, tips or invite window again | e2e `handover.mjs`, harness `game-drop` |
| 13 | Networks without WebSockets | As any path above, over the HTTP fallback | harness `hotspot`, e2e `fallback.mjs` |
| 14 | Two names in one browser (two tabs) | Two people: each tab keeps its own name over reloads, both see each other | harness `same-browser` (R17) |

## Paths out

| # | Path | What happens | Checked by |
|---|---|---|---|
| A | Close the tab / leave the page | `pagehide`: the connection closes, its member id goes to the next page of this tab (30 s), `lastRoom` written (only if I was in) | e2e `handover.mjs` |
| B | Kicked | Refusal screen alone; voice, stream and player stop; the room's `lastRoom` is forgotten and not written again | `harness/knock` (BH5) |
| C | Go to the film page | The tab goes to the film site; the shell keeps the room | `harness/embed` |
| D | "🏠 Back to the room" on the film page | `#back`: path 3 | `harness/embed` |
| E | The host leaves | After 20 s the oldest person becomes the host (`settleHost`); knock cards move to whoever acts as host | e2e `host.mjs`, `knock.mjs` |

## Saved rooms follow the host (BH6)

A saved room's row is "mine" in my saved-rooms list only while I am its host: entering the room writes the current
answer (`rememberSaved` takes `mine` as given). After "Make host" the old host's row stops being theirs, so its ✕ no
longer warns about unsaving a room they can no longer unsave. Harness `saved-host`.

## Fixed in BH5

- **Refused at the door** showed the refusal screen over the still-visible waiting card. Now the waiting card goes.
- **Removed from a room**, the home page still offered "Continue: <that room>". It was written again on `pagehide`. Now the record is forgotten and not written again.
- **The automatic invite window** opened at 1.7 s, on top of the 2.7 s intro. The first-time tips could also show under the intro. Both now wait for the intro to be gone.
