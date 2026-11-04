# Rooms on networks where WebSockets don't open (phone hotspot) — 0.9.92

Owner's report (31 Oct 2026): sharing the phone's hotspot, the laptop can't get into the site / room ("it doesn't get
in"); the phone itself on its own mobile data works. Earlier (0.9.79) the same hotspot showed the page loading but the
room's WebSocket neither opening nor closing ("Bağlanıyor…" forever). The `/connection` result from the hotspot is
in below ("Owner's result").

## Why a hotspot differs from the phone itself
The laptop's traffic takes a different path than the phone's own apps:

| Cause | How it shows | Notes |
| --- | --- | --- |
| **MTU / MSS black hole on the tethered path** | TCP + TLS handshakes stall once large packets (the server's certificate) are sent; small things work | The laptop announces MSS 1460 (Wi-Fi); the cellular bearer (and 464XLAT / CLAT on IPv6-only carriers) has less room. If the "packet too big" ICMP is filtered, packets vanish silently and the connection hangs — exactly "neither opens nor closes". The phone's own stack uses the right MTU. |
| **HTTP/3 (QUIC, UDP) vs TCP** | The page loads, the WebSocket doesn't | Chrome loads our site over HTTP/3 when it can (Cloudflare offers it). QUIC keeps its packets ≤ ~1350 bytes and probes the path itself, so it survives an MTU black hole. **A WebSocket is always a new TCP connection** (HTTP/1.1 upgrade), so it hits the black hole. A `fetch()` on the same page reuses the HTTP/3 connection. |
| **Carrier tethering detection / proxy** | Upgrade requests broken or dropped | Carriers detect tethering (TTL, a separate APN) and may push tethered traffic through a transparent proxy or a different policy. Turkish forums report TTL-based detection; Vodafone TR has blocked some protocols (WireGuard) on mobile. Inside TLS a proxy cannot see the Upgrade, but a TCP-level filter can still drop it. |
| **DNS filtering of `*.workers.dev`** | Nothing loads | Would also break the page itself; doesn't match "page loads". The own domain (ROADMAP §6) removes it. |
| **IPv6-only tether + NAT64** | Connections to IPv4-only hosts fail | Cloudflare is dual-stack; affects everything, not only WebSockets. |
| **The laptop itself** (VPN, antivirus "web shield", proxy setting, old browser) | Fails on every network | Ruled out if the laptop works on other Wi-Fi. |

Most likely: the TCP path from the laptop through the phone is broken for full-size packets (MTU black hole or
carrier tethering policy), while the page itself arrives over HTTP/3. We cannot change the carrier or the laptop's
MTU, so the room must not depend on a raw TCP WebSocket.

## Owner's result (31 Oct 2026, 0.9.92, laptop on the phone's hotspot, Mac, Chrome 156)
Page loads; plain request 200; **200 kB answer over h3 in 116 ms**; the tiny WebSocket and the room WebSocket both hang
for 10 s; **the fallback opens in 153 ms**, the room answers in 306 ms, round trip 183 ms. The room works (owner: "no
problems"). So UDP / HTTP/3 passes and every new TCP connection hangs on the tether: the expected case. (The page row
showed `?`: behind the service worker the navigation entry has no protocol; since 0.9.92.1 the guess uses any h3
request.)

## Telling the causes apart (`/connection`, 0.9.92)
Rows: page protocol (h3 = UDP, h2 = TCP) · plain request (+ its protocol) · a 200 kB answer · a tiny WebSocket
(`/api/probe`) · the room's WebSocket (open / welcome / ping) · the HTTP fallback (open / welcome / ping). The copied
text ends with a `guess:` line:
- page `h3`, every WebSocket hangs, fallback ok → TCP path broken on the tether (MTU / filtering);
- page `h2`/`http/1.1`, WebSockets hang → the Upgrade is blocked (proxy / filter);
- tiny WebSocket ok, the 200 kB answer fails → MTU black hole;
- nothing works → no internet or the address is filtered (own domain would help).

## Options
| Option | Pros | Cons |
| --- | --- | --- |
| **A. Automatic HTTP fallback** (long-poll GET + POST batches, same messages) — **chosen** | Rides whatever carries the page (HTTP/3 or plain HTTP through any proxy); no user action; every message goes through the same `webSocketMessage` (validation, rate limits, rules); works for games too; normal users never use it | ~1 RTT more latency per message; while a poll is held the Durable Object is awake (duration billed; only for rooms with a fallback user) |
| B. Server-Sent Events + POST | One long stream, lower latency | Some proxies buffer streams; same DO wake cost; long-poll is more robust and simpler |
| C. WebSocket over HTTP/2 (RFC 8441) | Would share the page's connection | Cloudflare does not offer it to Workers; browsers decide |
| D. WebTransport (HTTP/3) | UDP, modern | Not available in Workers / Durable Objects |
| E. WebSocket on another port | Trivial | Cloudflare proxies only standard ports; doesn't fix an MTU black hole |
| F. Own domain | Removes `workers.dev` filters, nicer name | Owner's money decision (planned with 1.0); does not fix MTU / tethering policies |
| G. Smaller first frames / shorter timeouts | Cheap | The TLS handshake itself carries the large certificate; we can't shrink it |
| H. Tell the user to change networks / DNS | Nothing to build | Doesn't solve it; the owner wants it to just work |

**Decision: A** (technical decision). Own domain (F) is still recommended for 1.0 (ROADMAP §6), it is complementary.

## How the fallback works
- Client `packages/shared/src/socket.ts`: `openSocket(url)` tries a WebSocket; not open in 6 s (`WS_OPEN_MS`) or failed
  before opening → `HttpSocket` to the same address with `?http=`. Same events as a WebSocket. After it once worked,
  the tab (sessionStorage `swm:http`, 30 min) goes straight to it. With `upgrade` (the room) a probe WebSocket to
  `/api/probe` runs after 1, 2, 4 … 10 min; when it opens the socket closes with `4100` and the room reconnects over
  a WebSocket at once (same member id). `RoomConnection` (open timeout 16 s), the games (`match`, `draw`, `quiz`,
  `poker`) use it. The TV pairing (`tv.ts`, hidden) stays WebSocket-only.
- Server `apps/server/src/fallback.ts`: `PollHub` per Durable Object; `PollSocket` looks like the server end of a
  hibernatable WebSocket (`send`, `close`, `readyState`, attachments), the objects list them next to
  `ctx.getWebSockets()` and run every message through the same `webSocketMessage`. `open` (new session, counts against
  `CONNECT_LIMIT`, origin checked) · `send` (JSON array, ≤ 40 messages, ≤ 1.1 MB) · `poll` (held ≤ 20 s, messages one per
  line, ≤ 1 MB per answer) · `close`. Closed / unknown session → `410 {code}` (kick 4003, replaced 4005 …). A session
  that doesn't poll for 45 s is closed; a client that stops reading more than 16 MB is closed. Sessions live in
  memory: a restart (deploy) → `410` → reconnect with `prev` (same member id).
- A reload hands the member id to the next page of the tab (`swm:prev:<room>`, 30 s) so the old connection is
  replaced at once even if the closing tab's last request (beacon) didn't get out.
- The room's alarm no longer deletes a room that was never marked empty (it could be one that only had fallback
  sessions when the object restarted): it starts counting instead.

## Cost
A held poll keeps the room's object awake (DO duration billing; free plan 13 000 GB-s/day ≈ 29 object-hours/day).
One fallback user for a 3-hour film ≈ 10 % of a day's free duration. Acceptable because only people whose WebSocket
fails use it; revisit if the measured share grows (Cloudflare dashboard → Durable Objects → duration).

## Tests
- e2e `scripts/e2e/fallback.mjs` (in CI and live): WebSocket + HTTP person in one room, chat, sync, voice signals,
  batches in order, limits, reconnect with the same id, kick, leave, held poll, a game, the probe.
- Unit `packages/shared/src/socket.test.ts`: WebSocket used when it opens, fallback when it hangs, remembered, 410
  codes, repeated failures, upgrade probe; `connection.test.ts` open timeout with the fallback.
- Harness `scripts/harness/hotspot/run.mjs`: a proxy in front of `wrangler dev` swallows WebSocket upgrades (the
  hotspot); real Chromium: joins over HTTP in ~7 s, chat both ways, the sync test in step (~30 ms), reload back in
  < 1 s, survives a 6 s network drop, `/connection` verdict, switches back to a WebSocket when they work again.
- The real hotspot is the owner's check (STATUS "Owner's hand tests").

## Sources
- MTU black holes and tethering: [TrackerControl PR #603](https://github.com/TrackerControl/tracker-control-android/pull/603),
  [ZeroTier: Android issues on cellular](https://discuss.zerotier.com/t/android-issues-on-cellular-but-not-wifi-connection/7960),
  [Debian user list](https://lists.debian.org/debian-user/2019/12/msg00514.html),
  [Path MTU Discovery](https://en.wikipedia.org/wiki/Path_MTU_Discovery).
- QUIC and PMTU: [NANOG](https://lists.nanog.org/archives/list/nanog@lists.nanog.org/message/QV6VJ5PTQZANHUE6KOAXNC4FF7RXHDWC).
- Mobile networks and WebSockets: [kiwix SO mirror](https://dev.library.kiwix.org/content/stackoverflow_en_nopic_2021-08/questions/20224341/websocket-connection-failed-in-mobile-network-on-port-8080-or-80).
- Tethering detection (TR): [DonanımHaber TTL thread](https://forum.donanimhaber.com/root-olmadan-ttl-degistirme-dunyada-ilk-kez-dh-de--160452149-15).
- RFC 8441: [rfc-editor.org/rfc/rfc8441](https://rfc-editor.org/rfc/rfc8441).
- DO billing: [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing).
