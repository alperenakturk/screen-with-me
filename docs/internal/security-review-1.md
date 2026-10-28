# Security and privacy review 1: custom emojis and WebRTC IP exposure

> Date: 28 Oct 2026 · Code reviewed: `main` at 0.9.82 (`607f6ec`) · Scope: the owner's two concerns (custom emojis,
> IP addresses in peer-to-peer voice/video/streams) plus other issues noticed on the way.
> This document only proposes changes; the main development session implements what the owner agrees to.
> Not legal advice: the legal notes below are a developer's reading of GDPR/KVKK and store policies.

## Summary

| # | Finding | Risk | Fix effort |
|---|---------|------|-----------|
| S1 | Custom emojis are silently re-uploaded to **every room you join**, forever | **High** (privacy) | Small–medium |
| S2 | Privacy policy does not say emojis are auto-uploaded to other rooms | Medium (transparency, GDPR Art. 13 / KVKK Art. 10) | Text only |
| S3 | Joining with > 4 saved emojis shows a "slow down" error on every join | Low (bug) | Disappears with S1 fix |
| S4 | A joiner's auto-uploaded emojis can push the room's own emojis out (24 cap) | Low | Disappears with S1 fix |
| W1 | Peer-to-peer voice/camera/stream reveals your public IP to everyone in voice, **including people who join later**, without a clear notice at the moment of joining | **Medium** (High in rooms with strangers) | Phase 1 small, Phase 2 medium |
| W2 | Streams reveal IPs **both ways** (streamer ↔ viewers); the policy only says viewers see the streamer's IP | Medium (transparency) | Text only |
| W3 | Google's STUN server (`stun.l.google.com`) learns every voice user's IP; not in the privacy policy | Medium (third party, transparency) | One line |
| W4 | Anyone can "join voice" with a modified client and no microphone, just to collect IPs | Low–Medium (it is visible in the people list) | Covered by W1 notice / Phase 2 |
| O1 | WebSocket upgrades have no `Origin` check (any website can open room connections from its visitors' browsers) | Low | Small |
| O2 | No security headers on the site (CSP, `frame-ancestors`, …) | Medium | Already in ROADMAP §3 |
| O3 | Rate limits are keyed on the client-supplied browser ID / connection; a script that reconnects with new IDs gets fresh buckets (sticker storage abuse) | Low–Medium (cost) | Medium |
| O4 | Animated GIF emojis are stored byte-for-byte (metadata inside the GIF is kept) | Low | Small |
| O5 | Room IDs accept 4 characters (`ROOM_ID_PATTERN`): hand-typed short codes are guessable | Low / info | Small |
| O6 | Workers observability logs are on; the policy does not mention server logs and their retention | Low (transparency) | Text only |

## Outcome (shipped in 0.9.86, 28 Oct 2026)

The owner accepted the emoji design (existing lists become "My collection", the collection box starts unchecked) and
Phase 1 for IP addresses; hiding the IP (TURN/SFU, needs a card) is a Phase 2 goal in `ROADMAP.md`, because moving
only voice to the SFU would still leave camera and streams peer-to-peer. The owner asked for every other finding to be
fixed. What shipped:

| # | Status | Change |
|---|--------|--------|
| S1–S4 | Fixed | No automatic upload (`registerMine` removed). Add dialog with preview, "added to this room only" note and an unchecked "Also save to my collection" (`stickerCollection`, local, max 12). Tray: *Emojis · In this room · My collection*; tapping a collection item adds that one image. Old `myStickers` lists move to the collection once (key emptied, one-time note). Server sends `mine: true` only to the uploader (✕ still works after a reload), host-only `{t:'sticker-clear'}` (Settings → Room rules → "Remove all custom emojis"). |
| S2 | Fixed | Privacy policy (TR + EN) rewritten as proposed in §1.5. |
| W1 | Fixed (Phase 1) | `ui/ip-notice.ts`: notice before joining voice (peer-to-peer mode only; lists who is in voice), before starting a stream and before watching one; "Don't show this again" per action (`opt:ipNotice:<kind>`). Permanent "🔒 People in voice can see your IP · Why?" line under the voice row. |
| W2 | Fixed | Policy says streams expose IPs both ways. |
| W3 | Fixed | `voice-p2p.ts` and `live-p2p.ts` use Cloudflare STUN only; policy names it. |
| W4 | Mitigated | Covered by the notice (people see who is in voice before joining). Hiding IPs: Phase 2. |
| O1 | Fixed | `index.ts` `guardSocket`: WebSocket upgrades from another site's origin get 403 (own origin and `localhost` allowed; no `Origin` = not a browser). Also on `POST /unsave`. |
| O2 | Fixed | `apps/web/public/_headers`: CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`. Inline scripts moved to files (`eklenti.js`, `gizlilik.js`, `offline.js`; `sw.js` caches the offline script, `CACHE` bumped). `frame-ancestors` is impossible (the film site is an ancestor of the overlay), so `main.ts` refuses to run in any frame other than the extension overlay. |
| O3 | Fixed | Workers rate-limit binding `CONNECT_LIMIT` (60 new connections per IP and minute, rooms and games); the room object gets a short SHA-256 hash of the IP (`X-SWM-Ip`, set by the Worker only, kept in the connection's memory) and limits emoji uploads per IP; at most 60 emoji uploads per room and day. |
| O4 | Fixed | `stripGifMetadata` (`sticker-file.ts`, unit-tested): comment and application blocks other than the loop block are dropped, frames untouched. |
| O5 | No change (decided) | The site only creates 10-character codes; shortening the accepted pattern would break existing links and tests for no real gain. |
| O6 | Fixed | Policy mentions Cloudflare's short technical logs and the per-IP counting. |

Tests: unit (+3 GIF tests), e2e (emoji `mine` / clear cases), a browser check of the whole flow (no CSP violations on
any page incl. YouTube, migration, collection, add dialog, voice notice, frame guard), the extension embed harness
(92/92 on Vite; on the production build with the CSP 89/92, the 3 misses are dev-only hooks: `import('/src/…')` and
`window.__swm`), and the voice harnesses (24 + 17 + 28).

**Recommendations in one line each (original review):**
- Emojis: room-only by default, an explicit "also save to my collection" choice, nothing uploaded automatically; fix
  the privacy policy now.
- IP: ship a clear, friendly notice before joining voice / starting or watching a stream now (free), drop Google
  STUN, fix the policy. If the owner adds a card to Cloudflare, add an "Hide my IP address" option through Cloudflare
  TURN (relay-only), which covers voice, camera and streams with one mechanism.

---

## 1. Custom emojis (stickers)

### 1.1 What the code really does

| Step | Where | Behaviour |
|------|-------|-----------|
| Add | `apps/web/src/ui/reactions.ts` (`fileInput` change handler) | The image is prepared by `fileToSticker` (PNG/JPEG/WebP → 160 px WebP, which also drops EXIF/GPS; GIF kept as is, ≤ 280 000 chars). It is **saved to `localStorage` `myStickers`** (last 12) and sent to the current room (`sticker-add`). There is no choice: every emoji you add goes into the list. |
| Join any room | `apps/web/src/room.ts:859-861` → `reactions.registerMine()` | On **every `welcome`** (every room you join, every reload, every reconnect) the site sends `sticker-add` for **every** item in `myStickers`. No UI, no question. |
| Server | `apps/server/src/room.ts:397-416` | Stores each emoji in Durable Object storage (`sticker:<id>`, `stickers`, `stickerOwners`), at most 24 per room; when full, the oldest is deleted. Broadcasts it to everyone in the room. Every later joiner receives all of them (`room.ts:786`). |
| Retention | `room.ts` `alarm()` | Deleted with the room: 24 h after the last person leaves, **30 days** in a saved room. |
| Remove | `reactions.ts` `removeSticker` | ✕ on my own emoji removes it from the room **and** from `myStickers`. The host can remove any emoji. |
| Extension | `storage.ts` → `store.ts` (`site:myStickers`) | The list is mirrored into the extension's storage so the room view on the film page (which is the site itself) uses the same list; therefore the film page also re-uploads it on every join. |

So Alperen's description is correct. A photo added once, for one room, is:
1. kept in the browser indefinitely (until removed with ✕ or 12 newer ones push it out),
2. uploaded again to **every** room the person enters later (friends' rooms, a public room from a link on social
   media, a room with a stranger), automatically and without any visible sign,
3. stored on our server in each of those rooms for 24 h – 30 days after it empties, and shown to everyone who enters
   those rooms in that time, even after the uploader has left.

### 1.2 Risks

- **Context leak (High):** a private or inside-joke photo (a friend's face, a family picture, a screenshot with a
  name) made for one group appears in a completely different group's room. The person may not even notice, because the
  emoji only appears in the 🖼️ / "Mine" page of the tray.
- **Strangers (High):** invite links get posted publicly. Anyone in such a room receives the full images (data URLs);
  they can save them.
- **Retention multiplies (Medium):** one image becomes N copies in N rooms, each with its own 24 h / 30 day clock. ✕ in
  one room does not remove the copies already stored in other rooms (it only stops future uploads).
- **Shared computers (Medium):** a school or family computer keeps the list; the next person's rooms get the
  previous person's photos.
- **Moderation (Low–Medium):** nothing is checked (we can't and shouldn't scan images), so "unrelated photos" may also
  be offensive ones; the host can remove them, but there is no report path yet (ROADMAP §3 "User-generated content").

### 1.3 Proposed design: "room emojis" + an optional personal collection

Principle: **an emoji goes to a room only when the person adds it to that room, every time.**

1. **Room-only by default.** Adding an image from the tray puts it in *this* room only. Nothing is written to a
   list that travels.
2. **Explicit collection.** In the add step, an unchecked box: "Also save to my collection". Only checked images go
   to `myStickers` (rename the key to `stickerCollection` so old behaviour can't come back by accident; see
   migration). The collection is **local only** and never uploaded by itself.
3. **No automatic upload.** Delete `registerMine()` and its call in `room.ts`. In the tray's "Mine" tab show two
   sections: *In this room* (what the room has) and *My collection* (local thumbnails, each with "Add to this room";
   one tap = one `sticker-add`). Collection thumbnails are drawn from local data and are never sent anywhere until
   tapped.
4. **Removing is explicit.** ✕ on a room emoji = "Remove from room" (owner or host). In the collection: "Delete from my
   collection" (local). They are separate actions, so removing a room emoji never surprises the user by deleting their
   collection or vice versa.
5. **Server retention (unchanged mechanism, shorter where cheap):** emojis are already deleted with the room. In a
   one-time (not saved) room, also delete an uploader's emojis when the room has been empty for the "long empty" time
   that already freezes playback (`freezeIfLongEmpty`, 1 min)? This would make emojis disappear after a page reload
   in an empty room, so **recommendation: keep "deleted with the room"** and state it clearly; add a host button
   "Remove all custom emojis" in Settings → Room rules for cleanup.
6. **Migration of existing lists** (owner's choice, see questions): either (a) turn the old `myStickers` into the
   collection (not uploaded anymore, user can delete), or (b) clear it once. Recommendation: (a) plus a one-time note
   in the tray: "Your custom emojis are no longer added to every room automatically. They are in *My collection*;
   add them to a room when you want."
7. **Extension:** nothing extra; it mirrors the site storage. The mirrored key changes with the rename.
8. **Tests:** e2e `stickers` case: join room A, add an emoji without "collection", join room B → B has no emoji;
   add with "collection" → B still has none until "Add to this room" is pressed.

Side effects: S3 (rate-limit error on join when the list has > 4 items, because `stickerLimit` is
`RateLimiter(4, 0.05)`) and S4 (a joiner's list evicting the room's own emojis) disappear because nothing is uploaded
on join.

### 1.4 UI copy (proposal; owner reviews wording)

Add step (small confirm under the preview, after picking a file):

| | TR | EN |
|---|----|----|
| Note | Bu özel emoji sadece bu odaya eklenir; odadaki herkes görür. | This custom emoji is added to this room only; everyone in the room can see it. |
| Checkbox | Koleksiyonuma da kaydet (başka odalarda istersem ben eklerim) | Also save to my collection (I can add it to other rooms myself) |
| Button | Odaya ekle | Add to room |
| Tray sections | Bu odada · Koleksiyonum | In this room · My collection |
| Collection item | Bu odaya ekle · Koleksiyonumdan sil | Add to this room · Delete from my collection |
| Room item ✕ | Odadan kaldır | Remove from room |
| Host setting | Özel emojilerin hepsini kaldır — Odaya eklenen bütün resim ve GIF'ler silinir. | Remove all custom emojis — Every image and GIF added to this room is deleted. |
| One-time note | Özel emojilerin artık her odaya kendiliğinden eklenmiyor. Hepsi "Koleksiyonum"da; istediğin odaya sen eklersin. | Your custom emojis are no longer added to every room automatically. They're in "My collection"; you add them to a room when you want. |

### 1.5 Privacy policy (S2)

Today: *"Custom emojis: images or GIFs you add to a room … Stored with the room … Your own list is also kept in your
browser so you can use it in other rooms."* This does not say that the list was **automatically uploaded** to every
room you join, so the policy did not match reality. Proposed text **after** the fix (EN, then TR):

> **Custom emojis:** images or GIFs you add to a room (pictures are resized to 160 px, which also removes hidden
> photo data such as location; GIFs are kept as they are). They are stored only with that room, everyone in the room
> can see and save them, and they are deleted with the room (at most 24 per room; the oldest goes first). You, or the
> host, can remove one at any time. If you choose "Also save to my collection", a copy is kept **only in your
> browser** (and the extension's storage on your computer); it is sent to a room only when you add it there yourself.

> **Özel emojiler:** Odaya eklediğin resim ya da GIF'ler (resimler 160 px'e küçültülür; bu, konum gibi gizli
> fotoğraf bilgilerini de siler; GIF'ler olduğu gibi kalır). Sadece o odayla birlikte saklanır, odadaki herkes görebilir
> ve kaydedebilir, odayla birlikte silinir (odada en fazla 24; dolunca en eskisi gider). Sen ya da oda yöneticisi
> istediğin an kaldırabilir. "Koleksiyonuma da kaydet"i seçersen bir kopyası **sadece tarayıcında** (ve
> bilgisayarındaki eklenti deposunda) tutulur; bir odaya sadece sen eklediğinde gönderilir.

Until the fix ships, the current sentence should at least say "…and is added automatically to every room you join".

---

## 2. IP addresses in peer-to-peer voice, camera and streams

### 2.1 What is exposed, to whom

Transport today (`welcome.voiceMode = 'p2p'`, the default because the Cloudflare card decision is pending):
`packages/shared/src/voice-p2p.ts` (voice + camera, full mesh, ≤ 6) and `live-p2p.ts` (streams, ≤ 4 viewers), ICE
servers `stun:stun.cloudflare.com:3478` + `stun:stun.l.google.com:19302`, no TURN, no `iceTransportPolicy`.

| Who | Learns | How |
|-----|--------|-----|
| Everyone in voice with you | Your **public IP** (IPv4, and IPv6 if you have it) and port | Server-reflexive ICE candidates in `signal` messages, and the remote address of the actual media connection. The server relays `signal` only if both sides are in voice (`room.ts:354`), which is correct, but every voice member automatically connects to **every** other voice member, including people who join after you. |
| Streamer ↔ viewers | Both directions (streamer sees each viewer's IP, each viewer sees the streamer's) | `live-signal`, relayed only between the streamer and people who pressed "Watch stream" (`room.ts:345`). |
| Your local network | Normally hidden: Chrome replaces local addresses with random `*.local` mDNS names. In our test (headless Chromium in this container, page with an active fake microphone) host candidates stayed `<uuid>.local` both without and with microphone access. Browsers have historically revealed the real LAN address once camera/mic permission is granted, so verify once in real Chrome/Edge/Brave (and the extension's offscreen document). | — |
| STUN servers (Cloudflare, **Google**) | Your public IP and the time you joined voice | Each voice/stream user sends a STUN request to both. Google is a third party we never mention. |
| People in the room but not in voice | Nothing | Correct today. |
| Our server | Nothing new (Cloudflare already sees the IP of every HTTP/WebSocket request) | — |

A public IP shows roughly the **city/region and the internet provider**; for home connections it is often stable for
days or weeks; on mobile networks it is usually shared (CGNAT) and less identifying. IPv6 addresses can be more
specific (per household, sometimes per device, depending on privacy extensions).

### 2.2 Realistic attacks

1. **Flooding a home connection (DoS):** with an IP, a "booter" service can knock a home connection offline for a few
   euros. This was common against gamers when Skype calls were peer-to-peer; Skype moved calls behind its servers
   (2016) largely for this reason. Realistic in rooms with strangers (public invite links), especially with teens.
2. **Rough de-anonymization:** IP → city + ISP, combined with the name, avatar, voice and chat, narrows down who a
   person is. Not a home address, but meaningful for stalking/harassment cases.
3. **Silent harvesting (W4):** the server accepts `{t:'voice', on:true, mic:false}` from any member; a modified client
   joins voice without ever sending audio and collects the IPs of everyone in voice. It is visible (the person shows as
   "in voice" with 🔇), so friends would notice, strangers might not. Likewise anyone can start a stream (unless the
   host turned on `liveHostOnly`) and learn the IP of each viewer.
4. **Making a victim's browser send connectivity checks:** a voice peer can put arbitrary addresses into its ICE
   candidates; the victim's browser then sends small, rate-limited STUN checks to them. Not useful for amplification;
   noted for completeness.

Overall: **Medium** for the intended use (friends), **High** when invite links are public or minors are involved.

### 2.3 How others handle it

- **Discord:** voice and video go through Discord's own voice servers; other users do not get your IP.
- **Google Meet:** media goes through Google's servers (direct connection possible only in some 1:1 calls).
- **WhatsApp** added "Protect IP address in calls" (2023: relay through its servers); **Signal** has "Always relay
  calls"; **Telegram** lets users choose who may connect peer-to-peer. The pattern: direct by default for quality,
  a clearly labelled relay option for privacy.
- **Watch2Gether:** its webcam feature is peer-to-peer (stated on its community forum, ≤ 10 users per room).
- **Teleparty:** video/audio chat is a Premium feature; its architecture is not documented publicly.

So peer-to-peer with disclosure is an accepted pattern for small products; the bigger services hide the IP by
default because they pay for media servers.

### 2.4 Legal / policy assessment

- **GDPR / KVKK:** an IP address is personal data (CJEU *Breyer*, C-582/14; KVKK treats it the same way). Revealing it
  to other participants is a consequence of a feature the user switches on, and it is necessary for that feature, so a
  legal basis exists (performance of the service). What is required is **transparency** (GDPR Art. 13, KVKK Art. 10
  "aydınlatma"): the policy must say who receives it, including third parties (Cloudflare and Google STUN), and the
  user should be told **at the moment it happens**, not only in a policy page. GDPR Art. 25 (privacy by default)
  makes a relay option good practice, not a strict requirement for a free hobby service.
- **Transfers abroad (KVKK Art. 9, amended 2024):** STUN/Cloudflare servers abroad receive the IP; using Cloudflare
  only (already our infrastructure) keeps the processor list short. Whether extra KVKK steps are needed for a
  personal, non-commercial project is a question for a lawyer before 1.0 (ROADMAP §4).
- **Chrome Web Store User Data policy:** the extension's offscreen document runs voice on film pages, so the extension
  takes part in sending the IP to other users. The store's privacy practices form lists IP address under
  "Location"; we should declare it there and in the policy (prominent disclosure + consent at the point of use is the
  store's own expectation for sensitive data).

Conclusion: **acceptable and legal if clearly disclosed at the point of use and in the policy**, with Google STUN
removed or named.

### 2.5 Options

| Option | Hides IP from peers | Covers | Cost | Code |
|--------|---------------------|--------|------|------|
| A. Notice before joining (consent) | No (informs) | voice, camera, streams | 0 | Small (site dialog + i18n) |
| B. "Hide my IP" via Cloudflare TURN (`iceTransportPolicy: 'relay'`) | Yes, for the person who turns it on (and for whoever they talk to, since media goes via the relay) | voice, camera, streams (same p2p code) | Cloudflare Realtime: 1 000 GB/month free (shared SFU + TURN), then $0.05/GB egress; **needs the card** | Medium: a Worker endpoint that mints short-lived TURN credentials, rate-limited per room/cid; a monthly GB budget brake |
| C. SFU (Cloudflare Realtime, already written for voice) | Yes, for everyone | voice only today (no camera/streams on this path) | Same card and pricing | Small to switch, large to add camera/streams |

Rough TURN traffic: Opus voice ≈ 18 MB per hour per incoming stream; camera (≤ 280 kbit/s) ≈ 125 MB/h; screen stream
(≤ 2.5 Mbit/s) ≈ 1.1 GB per viewer-hour. The free 1 000 GB ≈ 50 000 voice-stream-hours, but only ≈ 900 stream
viewer-hours, so streams are the cost driver (cap stream quality on relay, or keep streams direct with the notice).

### 2.6 Recommendation

**Phase 1 now (free, next 0.9.8x):**
1. Consent notice the first time a browser joins voice, turns on the camera, starts a stream or watches one
   (remembered per browser: `opt:ipNotice`), listing who is in voice right now. Plus a short permanent line under the
   voice row.
2. Remove `stun.l.google.com` from `voice-p2p.ts` and `live-p2p.ts` (Cloudflare STUN only; it is already our
   processor). `voice.ts` already uses only Cloudflare.
3. Privacy policy update (W2, W3, later joiners), and declare IP in the Chrome Web Store form.
4. Verify the local-IP behaviour (mDNS) once in real Chrome with a granted mic, on the site and in the offscreen
   document; record the result here.

**Phase 2 (only if the owner adds the card; with a budget brake):** Option B, "Hide my IP address" toggle in the
voice row and the stream menu. Reasons over C: one mechanism protects voice, camera **and** streams, reuses the
existing peer-to-peer code (the SFU path has no camera or streams), and only users who want it generate traffic.
Default: off for friends' rooms; the owner may decide to make it default-on later. Media stays end-to-end encrypted
(DTLS-SRTP); the relay cannot hear it.

### 2.7 UI copy (proposal; no technical words except "IP", which users search for)

Dialog before joining voice (first time):

| | TR | EN |
|---|----|----|
| Title | Sese katılmadan önce | Before you join voice |
| Body | Sesin sunucumuzdan geçmez, seste olanlara doğrudan gider. Bu yüzden seste olan herkes — sonradan katılanlar da — internet adresini (IP) görebilir. Bu kabaca şehrini ve internet şirketini gösterir; ev adresini göstermez. | Your voice doesn't go through our server; it goes straight to the people in voice. That's why everyone in voice — including people who join later — can see your internet address (IP). It shows roughly your city and internet provider, not your home address. |
| Who | Şu an seste: Ali, Ayşe · Seste kimse yok | In voice now: Ali, Ayşe · Nobody is in voice yet |
| Advice | Tanımadığın kişilerin olduğu odalarda sese katılmamanı öneririz. | If there are people in the room you don't know, it's better not to join voice. |
| Checkbox | Bunu bir daha gösterme | Don't show this again |
| Buttons | Anladım, sese katıl · Vazgeç | Got it, join voice · Cancel |
| Permanent line under the voice row | 🔒 Seste olanlar IP adresini görebilir · Neden? | 🔒 People in voice can see your IP · Why? |
| Start stream | Yayını izleyenler internet adresini (IP) görebilir, sen de onlarınkini. | People who watch your stream can see your internet address (IP), and you can see theirs. |
| Watch stream | Yayını izlersen yayıncı internet adresini (IP) görebilir. | If you watch, the person streaming can see your internet address (IP). |
| Phase 2 toggle | IP adresimi gizle — Bağlantı Cloudflare'in aktarma sunucusundan geçer; ses yine şifreli kalır, biraz gecikebilir. | Hide my IP address — The connection goes through Cloudflare's relay server; your voice stays encrypted, there may be a little delay. |

### 2.8 Privacy policy text (replace the voice/stream IP sentences)

> Because the connection is direct, everyone who is in voice with you — including people who join voice later — can
> technically see your public IP address (roughly your city and internet provider, not your home address). People who
> haven't joined voice can't. Streams work the same way in both directions: the person streaming and the people
> watching can see each other's public IP address. To set up these direct connections your browser asks Cloudflare's
> STUN server for your public address. During the room our server only keeps who is in voice, whether their microphone
> and camera are on, and who is streaming or watching.

> Bağlantı doğrudan olduğu için seninle seste olan herkes — sonradan sese katılanlar da — genel IP adresini teknik
> olarak görebilir (kabaca şehrin ve internet şirketin; ev adresin değil). Sese katılmayanlar göremez. Yayınlar da iki
> yönlü böyledir: yayın yapan ve yayını izleyenler birbirinin genel IP adresini görebilir. Bu doğrudan bağlantıları
> kurmak için tarayıcın genel adresini Cloudflare'in STUN sunucusuna sorar. Oda açık olduğu sürece sunucumuz sadece
> kimin seste olduğunu, mikrofonunun ve kamerasının açık olup olmadığını, kimin yayın yaptığını ve kimin izlediğini
> tutar.

---

## 3. Other findings (not fixed here)

- **O1 – No `Origin` check on WebSocket upgrades** (`apps/server/src/index.ts`, `room.ts` `fetch`). Any website can
  open room connections from its visitors' browsers (cross-site WebSocket). There are no cookies, so no account
  takeover, but a malicious page can spam a known room or join it with visitors' IPs. Fix: accept only our site's
  origin (+ `localhost` in dev); the extension never connects by itself (the shell is our site), so no extension
  origin is needed. Check games/draw/quiz routes too.
- **O2 – No security headers.** Static assets come from Workers assets with no `_headers`. Add CSP (`default-src
  'self'`, YouTube frames, `img-src 'self' data:` for emojis, `connect-src 'self'`), `frame-ancestors` (allow
  `chrome-extension://<id>` for the shell only), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`
  (`microphone=(self)`, `camera=(self)`, `display-capture=(self)`). Already on ROADMAP §3.
- **O3 – Rate limits use client-chosen keys.** `keyOf()` uses the `cid` the client sends, other limiters use the
  connection id; both are free to change. A script can reconnect with new IDs and add 24 × 280 KB emojis to any
  number of rooms (≈ 6.7 MB each, kept 24 h / 30 days). Cost is small today but unbounded; consider a per-IP limit
  (`CF-Connecting-IP`, hashed, memory only) on joins and `sticker-add`, and a per-room daily emoji-add cap.
- **O4 – GIFs stored byte-for-byte.** Animated GIFs can carry comment/XMP blocks (rarely personal data, but possible).
  Low; either strip non-image blocks on the client or mention it (done in the proposed policy text).
- **O5 – Short room IDs accepted.** `ROOM_ID_PATTERN` allows 4–32 characters; generated IDs are 10 characters (~50
  bits, fine). If any path lets people type their own short code, those rooms are guessable. Info only.
- **O6 – Logs.** `observability.enabled` in `wrangler.jsonc` keeps Worker logs at Cloudflare for a few days. The
  policy's "Infrastructure" section should say that technical logs (time, path, errors) are kept briefly by
  Cloudflare for operation and security.
- **Good things checked:** `innerHTML` templates contain only constants (user text goes through `el()`/`textContent`);
  emoji data is validated as raster `data:image/...;base64` (no SVG) and only shown as `<img src>`; site-bridge and
  shell `postMessage` handlers check `source` and `origin`; cids, ban keys, voters and emoji owners never reach other
  clients; `signal`/`live-signal` are only relayed between people who opted in; room IDs come from `crypto`.

## 4. Decisions for the owner

1. **Existing emoji lists:** keep them as "My collection" (not uploaded anymore; recommended) or clear them once?
2. **"Save to my collection" default:** off (recommended) or on?
3. **Card on Cloudflare (Phase 2 "Hide my IP"):** yes/no, and a monthly budget limit if yes.
4. **Texts:** approve or change the TR/EN UI copy and privacy policy paragraphs above (the policy is a legal
   commitment).
5. **Lawyer before 1.0:** whether to have the privacy policy (KVKK transfers abroad, minimum age) checked.

## Sources

- Cloudflare Realtime / TURN pricing: <https://developers.cloudflare.com/realtime/pricing/>,
  <https://developers.cloudflare.com/realtime/turn/faq/>
- RFC 8828, WebRTC IP Address Handling: <https://www.rfc-editor.org/rfc/rfc8828.html>
- Watch2Gether webcam (community forum): <https://community.w2g.tv/t/general-help-for-a-new-user/412>
- Teleparty (App Store listing, Premium video/audio chat): <https://apps.apple.com/jp/app/id6471985961>
