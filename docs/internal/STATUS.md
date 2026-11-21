# Status: where we are (every session reads this first)

> What to work on: `ROADMAP.md` "Focus" and the Ready cards in `CARDS.md`; what each release changed: `CHANGELOG.md`.
> Finished items live verbatim in `docs/internal/archive/status-history.md` (DOCS2). A finished item leaves this file
> in the PR that finishes it.

## Task queue (continue from the first unchecked item; keep it in sync with the session's task list)
One handoff per lane or role; each session updates only its own lines and deletes them when done.
- [ ] Lane A: idle (PTT1, TG2, CI4 done 21 Nov). Tag `v0.9.97.113` (8ce4385) missing. DM1 waits for the owner's
  Player ID, FILM1 for his pick. UI2 `rail-speed` flake: if it fails again, add a `sync-engine.test.ts` scenario.
  CI4: count 10 PR runs from #608 with no first-attempt failure on games-shorts / Sea zoom / shorts-tidy / phone-sideways.
- [ ] Game Studio: idle (LH4, QZ5b done 21 Nov; no Ready game card).
- [ ] B2 (handoff 16 Nov, 17:00; no unmerged B2 branch; nothing left in B2's lane until YTQ1):
  - [ ] YTQ1 day-of work, after `sidelit.app` is live: shots + screencast on the live domain, the usage table from the
    owner's JSON, `node scripts/check-yt-audit.mjs https://sidelit.app` (pack: `docs/internal/youtube-audit/`).

## Owner's hand tests (things only the owner can try; ask Claude "what should I test?" and it reads this list)
One ordered list, most useful first. Tick here (or tell the Planner and it ticks); a ticked item leaves the list.
Every item's original wording, the older per-release blocks and the ones already ticked are in
`archive/status-history.md` "Owner's hand tests" (search the ID in brackets). New releases add their lines at the end
of "C. Recent releases" with an ID; the Planner folds them into the board Artifact.

**A. One sitting with a friend** (a friend in Chrome on another computer, or your phone as the second person) [BH10]
- [ ] 1. YouTube together: join by the invite link; play, pause, seek, speed and ← / → from both sides stay in step.
- [ ] 2. Fullscreen on YouTube: the rail comes at the right edge and goes; Enter opens the message box; the friend's
  messages come in on the right, never over YouTube's bar.
- [ ] 3. Voice + camera: the mic check, then Join; hear each other without echo; M mutes; the camera window drags and
  resizes; a reload keeps voice, mic and camera as they were.
- [ ] 4. Screen share: share a tab with sound, the friend watches and hears it, and it comes back after their reload.
- [ ] 5. Knock + host: "Ask before letting people in", let the friend in; 👑 Make host: the next knock goes to them.
- [ ] 6. Private message: only the friend sees it, marked 🔒; ✕ goes back to the room chat.
- [ ] 7. Phone by QR code: YouTube in sync; sideways ⛶ "Watch fullscreen"; 💬 beside the video; voice for a minute.
- [ ] 8. Phone, Shorts: swipe on the bar under the video or ▲ ▼; both move together; "waiting…" only in that bar.
- [ ] 9. The extension in Chrome on a legal demo film page (Video.js / Plyr): Go to the film, the room view, sync, the
  film's own ⛶ with our rail, 🎮 over the film, voice on the film page.

**B. Games with the same friend** (about 20 minutes) [BH13-G G1–G11]
- [ ] 10. Classics: dama to the end (sounds, the result card, Rematch); "🎲 Change game" → chess; a reload keeps the seat.
- [ ] 11. Sea Battle on a phone: tap aims, second tap fires; Wi-Fi off 10 s mid-game, the game goes on.
- [ ] 12. Quiz, then Draw & Guess, to the end: the podium, "Play again" / "Waiting for …", "Everyone got it!".
- [ ] 13. Last Heart to the end (How to play cards, the result card). Alone against Glowbeam in chess or dama: he
  answers in about a second.
- [ ] 14. Friend's phone data off 2 minutes during a Quiz: offline after ~1.5 min, the lobby 20 s later, back on returns.
- [ ] 15. While a film plays: Snack Bar earns (×10, Max, 📋 Upgrades, the usher), Window Garden grows, Five Frames in
  Turkish. Does buying in Snack Bar feel like a choice?

**C. Recent releases** (each one line; the release's own wording is in the archive under its version)
- [ ] 15d. [W135, 0.9.97.135] Tablet sideways, a video: Snack Bar's window starts just right of the link box ("Şimdi aç" whole), full height.
  Phone upright, open a game: the small video shows on top with "▶ Videoya dön" under it (a tap goes back to the room).
- [ ] 15c. [PH2, 0.9.97.130] Phone, upright: open Snack Bar, then a table with a friend (Quiz or Dama): it plays in
  the Oyunlar tab, the video a strip on top (a tap on it goes back to the room), nothing cut off or tiny. Turned
  mid-game: the PH4 note. Draw & Guess: draw with the tools and 🎨. Tavla: a tap just beside a point counts.
- [ ] 15d. [0.9.97.134] Laptop and a sideways tablet, with a friend in the room and the film playing: Büfe shows every
  text whole (the income, 👥 +%…, the stand names), and the BÜFE sign is whole in the picture.
- [ ] 15a. [QA3, 0.9.97.126] The four table lobbies look alike: 👑 / "(sen)", the "Bekleniyor…" chair, the grey
  "Oyunu başlat" (Duel: "Hazır") with its hint under it. In Five Frames typing T / M / F / Boşluk writes letters, no
  cinema mode. Matinee: Five Frames and Snack Bar are light. Window Garden on an upright tablet and an upright phone:
  the album under the window sill, Sula / Stub'un ışığı inside their card.
- [ ] 15b. [0.9.97.128] Phone, upright: open any table (Draw & Guess, Quiz, Sea Battle…), tap ⋯ in its top bar:
  "Masadan kalk" and "Masayı kapat" can be tapped, and "Masadan kalk" leaves the table.
- [ ] 16. [QA2, 0.9.97.123] Games on phones: sideways Quiz / Last Heart rules read in full, the Duel card fits; XOX
  shows "Stub'a (bota) karşı oyna" with Kolay / Orta and "👁 0 izliyor"; Snack Bar sideways lists the popcorn machine; in
  Turkish Snack Bar numbers read 0,5 / 6 B; Matinee: the games hall covers are warm posters.
- [ ] 16a. [M1–M3, Q1–Q5, 0.9.97.122] On a laptop and a big screen the room reaches the window's foot, and the
  Queue / People tabs are there before any video. A table under a YouTube video, or in the video's place, stays whole.
  On a phone held sideways: no tip over "Watch fullscreen"; on an iPhone SE the empty room fits; Invite (WhatsApp
  included) and every Settings category fit. On a phone there is no 🧩 in the top bar, and the extension page says it
  is for computers. Turkish: a nameless room gets a Turkish name; Settings → Sound shows "%70"; the Test Lab says
  "Test Panosu". Sinema / Lokum: the chosen invite tab and Settings category are lit, and the new scene art stays
  clear of the text.
- [ ] 18. [L1–L2, 0.9.97.120] Test Lab on a phone: no floating 🐞 upright (⋯ has the Test Lab tile); sideways a small
  🐞 bottom right, never over the video; none in fullscreen.
- [ ] 19. [Y1–Y7, 0.9.97.118] Plain 🎙 / 📷 before voice (red only when muted in voice); ➤ inside the chat box on a
  tablet; T cinema mode with its "✕ Leave cinema mode · T" button; the Matinee WhatsApp button; a readable greyed
  "Next ⏭"; Stub in the phone's empty room; the tablet's Queue / People tabs.
- [ ] 20. [M1–M4, 0.9.97.116] Matinee: calm paper, the video in a framed screen (fullscreen black), edge to edge on a
  phone, the film page unpainted; a table's "?" works on the first click right after entering.
- [ ] 22. [LAB1, 0.9.97.109] `?debug=<your code>` on phone and computer: 🐞 stays after a reload; 🧪 "Test turu" rows run and undo.
- [ ] 23. [C1–C5, 0.9.97.107] A calmer room screen; ⚙️ categories without scrolling (phone chips too); About, Move,
  the mic check without the IP window; the join card's ⓘ.
- [ ] 24. [S1–S4, 0.9.97.105; N1–N4, 0.9.97.102] Stub in each theme's costume, Neon's new look, scene themes' sky behind
  the title, Matinee by day, the theme colours on the home page, the Sidelit font, the camera window's spot.
- [ ] 25. [F1–F2, 0.9.97.100; T1–T2, 0.9.97.98] The seven fonts (Turkish letters, kept after reload); picture themes'
  text readable; the search and chat boxes visible in each theme.
- [ ] 27. [Q1–Q6, 0.9.97.93 and .95] On a hotspot or the backup connection, and with a background tab, an idle table and
  five tabs of one room for 10 minutes: no "reconnecting", nothing "too many connections".
- [ ] 27a. [PH1, 0.9.97.127] On your own phone: the four tabs at the bottom (Room, Search, Games, Me) each one tap;
  typing swaps 🎙 📷 for ➤; 😀 sends a reaction and "🖼 Send an image"; Search adds and plays a video; the Me tab;
  sideways ⛶ / 💬 / 🎙 with a message count; the welcome sound starts with the picture; the line "Sidelit is made for
  computers…" under "Enter room".
- [ ] 27i. [CH1, 0.9.97.141] In a room, chat a while with a friend (or use 🐞 Test Lab → "Chat: add 250 numbered messages" on a
  test server), leave and come back later: the earlier messages are still there; scroll up and older ones load.
- [ ] 27f. [SRC1, 0.9.97.136] In a room (computer, then the phone's 🔍 Search tab): press ⠿ → Vimeo, type a few
  words + Enter: before the VIMEO_TOKEN secret the tile and the search say "Not available yet" (the real search is
  27g). ⠿ → Search the web: a new tab opens with your words; come back, the box asks for the link.
- [ ] 27h. [SH1, 0.9.97.137] On your phone, play a Short, ⋯ → ↩ Room view, then tap "📱 Shorts view" in the strip
  under the video; repeat a few times. On a computer the same button is beside Next above the video.
- [ ] 27g. [SRC1, 0.9.97.136] After the VIMEO_TOKEN secret is set and a deploy has run: in a live room, ⠿ → Vimeo,
  search a few words, press ▶ Play now on a result: it plays for everyone.
- [ ] 27e. [0.9.97.133] On a laptop with a friend: play a video, open Snack Bar from 🎮; when the friend writes, the
  message shows as a note beside the game window. On a phone held sideways: open 🚩 Report; the reasons are one row
  you can slide, the note box shows two lines.
- [ ] 27d. [PWA1, 0.9.97.132] On your Android phone: install Sidelit (Chrome menu → Install app); in the YouTube app,
  Share a video → Sidelit: a new room opens and plays it once you enter; let it play a few minutes, the screen stays on.
  Long-press the Sidelit icon → "Create room". On an iPhone (Safari), the home page shows the "Add to Home Screen" hint
  once.
- [ ] 27b. [AV1, 0.9.97.129] On your phone: open the character picker (join card or profile), scroll down, tap a
  character: the list stays where it was and the one you tapped stays in view.
- [ ] 27c. [SAFE1, 0.9.97.131] In a real room with a friend: tap their face → 🔇 Block for me; their new messages and
  emojis disappear for you only (ask them: they still see yours); reload, still hidden; 🔈 Unblock brings the lines
  back. Then 🚩 Report: pick a reason, open "See what is sent", send; tell the Planner when the report issue arrives in
  the private feedback repository. On the phone the same two buttons are on their row in the People list.
- [ ] 27h. [GMP-a, 0.9.97.138] With a friend at Sea Battle and your phone as a third person: open 🎮 on the phone and
  Join the table: you watch, and you see both fleets as they are shot; the friend never sees yours. Same in the Five
  Frames Duel: the phone shows both boards with their letters. Five Frames in English and Turkish: new everyday words
  are accepted (Turkish forms such as "evler", "kitabı"), and the day's word is a common, clean word.
- [ ] 27l. [GP1] On a computer, open 🎮 and pick Classics, then Snack Bar: each shows at once, pictures complete, no
  blank moment. On an iPad held sideways, open Five Frames: its letters and the ticket numbers are easy to read.
- [ ] 27j. [ST1, 0.9.97.139] With a friend sharing a tab (on a computer): the stream has one button, "⛶ Fullscreen";
  it fills the screen, "🪟 Window" brings it back; drag the window anywhere and resize it from its corner; reload and
  watch again: it comes back where you left it. With a YouTube video playing, drag it onto the video: it moves beside it.
- [ ] 27i. [YTQ1, 0.9.97.140] Search a few words in the room, then open the Shorts view's ＋ and ♾: under each list the
  YouTube logo (red icon + "YouTube" word: white on dark themes, near-black on Matinee) sits before "Results from
  YouTube"; clicking the logo opens youtube.com in a new tab.
- [ ] 27p. [WG2] Window Garden while a film plays: tap each pot, water, pick a bloom: no button or the
  window moves. 🎨: try the four window views and pot colours; compost 5 petals into a seed.
- [ ] 27m. [QZ2a] Quiz with a friend on a phone and a computer: every answer counts on the first tap or
  click, also when the friend answers at the same moment.
- [ ] 27n. [QZ2b] Quiz with a friend, Turkish and English: the new topics (Languages and words, The human
  body, World and cultures); a typed question: type with a small typo or without Turkish letters, it still counts; the
  friend's answer shows only at the reveal. Tell the Planner any question that looks wrong.
- [ ] 27o. [QZ2c] Quiz with a friend: pick Tournament, 1 pick each; each of you picks a round's topic in
  turn. Try ×2 (Double) and ↺ (Second chance: answer wrong first, then try again). The winner has the most round wins.
- [ ] 27p2. [GMP-b] With two or more friends (phones and computers): open Sea Battle, the others press "Take the seat"
  before the battle. On your turn tap a friend's chip, then fire on their sea; a sunk player is crossed out and only
  watches; at the end the card lists 1st to last. Then the Five Frames Duel with three or more: the race goes on after
  the first one solves, and the end card shows the places.
- [ ] 27q. [SH1, 0.9.97.153] Swipe Shorts with a friend: each Short starts from 0:00 for both of you; tell the Planner
  how long the short pause before each one feels.
- [ ] 27r. [SH1] Join voice in the Shorts view and talk: your face and your friend's get a green ring while speaking.
- [ ] 27s. [EC1, 0.9.97.153] Auto-next off, let a video end: "Video ended" opens in the middle of the screen (▶ Play
  next / Close; Esc and a click outside close it too).
- [ ] 27t. [SH1] Paste several TikTok app links (vm.tiktok.com) together with YouTube Shorts: they queue in paste order.
- [ ] 27u. [SH3, 0.9.97.155] Computer, Shorts view: 💬 opens the chat beside the video; a friend's messages show there
  and count on 💬 while it is closed.
- [ ] 27v. [VC1, 0.9.97.155] In voice press 🎧: you hear nobody, your mic goes off, your friend sees a crossed 🎧 on your
  face; 🎙 brings everything back.
- [ ] 27x. [VC3, 0.9.97.156] With a VPN on, join voice: after ~10 s "Your voice isn't reaching the others" and an ⓘ.
- [ ] 27y. [MSG1, 0.9.97.157] With a friend: open ⋯ on your message (on a phone, press and hold it), "🗑 Delete for
  everyone": you both see "… deleted a message"; as the host delete your friend's message; reload: the lines stay.
- [ ] 27z. [CR2, 0.9.97.158] In YouTube Music open an album or a playlist → Share → Copy link, paste it in the room:
  its songs go into the queue in order and play one after another (the cloud can't test real YouTube Music).
- [ ] 27aa. [GW3, 0.9.97.159] Open a table (Classics) with a YouTube video and with a video file: it fills the video's
  place, never the whole screen; chat, voice and the rail at the video's right edge still work; 🪟 makes it a frame you
  drag anywhere, ▣ / Esc back; 📱 Shorts view → a small frame beside the Short, "Room view" brings it back unchanged.
- [ ] 27ab. [SRC2, 0.9.97.160] Press ⠿ beside the search box (or "🔍 Search a video" in an empty room): "What are we
  watching?" shows big tiles and chips. Try a chip (Music), pick Podcasts and search words, open ▶ Video feed and 🎮
  Games from it; with a YouTube video playing it opens in the side panel's place and never covers the video; on the
  phone it slides up from the bottom; Esc closes it.
- [ ] 27ac. [FD1a, 0.9.97.160] With a friend: ♾ / ▶ opens the feed drawer on the right (from the bottom on a phone),
  the video stays visible; picking a tile only selects it, "▶ Start feed" starts it; you both see "Feed: … · N left ·
  by …" in the Queue's feed row; in Room rules turn on "Only the host can start a feed": your friend can pause but not start
  or stop; when someone stops a feed the chat says who.
- [ ] 27ad. [FD1b] A Short with a ♾ Shorts feed running: on a laptop the buttons beside the Short sit in three
  groups (Talk · Watch · Room) with their names, ▲ ▼ say "12 left", and a note like "the feed stopped" shows under or beside the Short, never over the buttons. On the phone the bottom bar
  shows 💬 Chat · 😀 React · ♾ Feed (lit) · ▲ 12 left ▼ · ⋯ More.
- [ ] 27ae. [RC1] With a friend, watch together for 30 minutes: a ✨ with a gold dot appears beside the video. Your
  friend's ✨ offers "🙋 Ask the host"; you get one toast. Press "✨ Show to everyone": after 3-2-1 you both see the same
  scenes in the video's place (the video pauses), with a soft tune (🔇 turns it off). "✕ Close for me" closes it only
  for one of you; "▶ Back to the video" ends it for both and the video plays on. ✨ is then gone for this session.
- [ ] 27af. [FC1] Start a ♾ Shorts feed with Japan: the Shorts are Japanese. Then 🔥 Popular + type "hay" + Japan:
  "Will play" says so, and the most watched Japanese Shorts about hay come. Try Turkey, US, Brazil, Germany the same
  way. Paste a video link instead of words: the kinds and the country grey out with a one-line reason.
- [ ] 27ag. [UI4] In a private window the site opens in Drive-In; your usual window keeps its theme. No feed strip
  above the video or a Short. In the Shorts view press ⋯ More beside the Short: a menu with Invite … Settings opens
  (laptop, big screen); on a phone ⋯ opens its sheet. "What are we watching?" sits in the middle with a
  "Subscription services · Coming" row at the bottom.
- [ ] 27ah. [GD1] Play a table with a friend for 20 min: lock your phone 30 s, switch Wi-Fi, background the tab.
  You are never thrown out; a table that closes says why.
- [ ] 27ai. [CAM2] On your laptop: join voice and press the camera button: your camera window opens with your picture
  (even if you had made it small with "−" before) and your friend sees you. Leave voice and press the camera button on
  the rail beside the video: you join with the camera on, and your friend sees you within a second. Block the camera
  for the site (the lock icon at the left of the address bar → Camera → Block), press the camera button: a message next
  to it says the browser blocked it and how to allow it.
- [ ] 27aj. [QZ5, QZ4, QZ3] Quiz: no true / false or typed words; a number field (closest wins 200/100/50);
  tournament ends with a 5-guess finale; Film & TV, Games, Travel topics; ×2 after answering doubles a right one.
- [ ] 27ak. [TG1] At 1366 open Five Frames beside the chat: the Together card gets short, "Join voice" and "Share" stay
  visible and work (in voice too). Put the game away (✕): the full card comes back.
- [ ] 27al. [PH4] Phone, a video playing, turn it: video, ⛶, 💬, 🎙 as before. Turn it in Oyunlar, Ara, Ben, a game,
  the invite window, the home page: a "📱↻ Telefonu dik tut" note, nothing under it reacts; upright, all as it was.
- [ ] 27am. [PH3] Phone upright, an empty room, open a game: the small strip on top shows Ara / Davet et whole.
- [ ] 27an. [FW1] Five Frames: odd words refused; 🌍 Countries: gold hint, a country is a guess.
- [ ] 27ao. [GPH1] Phone: Son Kalp shows all 5 🤖; Büfe / Bahçe "closed" note below art.
- [ ] 27ap. [GPH1] Phone: chess still at start, XOX # lines, quiz bar clear, Beş Kare picker by 🔥. PC: Büfe note off art.
- [ ] 27aq. [RAIL2] Computer, a video playing: the rail beside it stays. Its last small button: the rail now opens at
  the right edge only; pressed again it stays; a reload remembers. ⋯ has no such item. YouTube ⛶: the rail waits for the edge.
- [ ] 27dg. [DG2] Draw & Guess with 2+ friends: results after each drawing fit and the game keeps its size; big canvas,
  tools beside it; on a phone too.
- [ ] 27gn. [GN1] With a friend: open a Sea Battle table. The friend sees a chat line with its picture and Join; Join
  takes them to the table. Close it: the line greys out with "The table closed".
- [ ] 27em. [EMO1] Phone: 😀 React → Hands → pick a skin tone → send 🫶. The friend sees it in that tone; the tone stays
  after a reload; the second hand page is reached with >.
- [ ] 27ar. [CAM3] With 2–5 friends' cameras: the camera window starts framed (one window), tiles same size in rows
  like 3 + 2, faces whole; pull any edge or corner of the window: it resizes and the cameras re-row.
- [ ] 27aw. [GFIT1] Laptop and a big screen: press 🪟 on a table, then open another table: it opens in the video's place
  again. Classics there (chess, backgammon, Four in a Row): the board as tall as the box, the score, Stub, players and status in a
  narrow column beside it, names whole.
- [ ] 27rc. [RC2a] With a friend, the recap only after 2 h together (or Test Lab `recap.button`): ✨ shows for both,
  nothing pops up by itself, either person's one press starts it for both, the music starts softly, ✨ is gone after.
- [ ] 27fw. [FW2] Five Frames Duel, 3 players: the first finder stays "1st"; points show at the end (+10 / +6 …);
  "⏱ 1 min": the clock counts down, at 0 the rest are out; laptop: my board big, the others smaller. Solo: Easy /
  Medium / Hard each have their own word and stay after a reload; "?" ends with "Which words count".
- [ ] 27lh. [LH4] Last Heart, 3 players: Shield out of turn doesn't reset the other player's 30 s; the showdown says
  "takes N from the middle", each seat shows +/−, only the winner's cards are gold. Laptop, video's place: a round
  table, rivals on top with ♥ chips, big shared cards, buttons on the right; cards and chips fly, new sounds; 🪟 brings
  the window layout back. Phone Games tab: my two cards show their rank.

- [ ] 27qz. [QZ5b] Computer or tablet, Quiz in the video's place: card + players column fill it (no empty band), big
  question on a big screen; a 🏆 tournament with 4–5: one row each, names whole, "🏆 n" in a gold pill, a used joker a
  grey button; upright tablet: the topic chip stays on one line.
- [ ] 27vc. [VC4] With 5+ friends with cameras: 6 cameras fit, the 7th says it's full; the chat shows one note
  recommending 4 cameras / 6 people (once per room), even with room activity hidden.
- [ ] 27pt. [PTT1] In voice, push-to-talk on, the key button, press B: holding B talks, V doesn't; M is refused with a
  hint; the updated extension on a film page: the chosen key talks too. Chrome on a computer: "🪟 Talk window" opens a small window; in another tab hold its button: friends hear you.
- [ ] 27tg. [TG2] Together card at 1366 and on a phone: no title or counter, icons in one row; 🔊 opens sound settings;
  the voices slider changes how loud friends are.
- [ ] 27rc2. [RC2] After 2 h (or Test Lab `recap.button`) press ✨: the sign's lights chase, the first sign reads "Now
  showing / Our movie night", the music starts quiet; with the system's "reduce motion" the lights stay still.
- [ ] 27fr. [FR1] Chrome + extension, a film page with 2 people: the host presses ⭐ on the rail, both answer (try a
  half star), both see the same results card; the guest has no ⭐.
- [ ] 27sb. [SB2] Sea Battle with a friend: drag a ship (gold outline = where it lands, R turns), pick Pirates / Bath
  toys; sink a fleet: the explosion + "ALEX SANK!". With 3 players: the big box follows whose sea the shooter aims at.
- [ ] 16d. [TH3] Home page in Neon: the name, slogan, buttons and devices glow, calm; Tab shows a clear
  ring. Any theme: four faces under the devices and "4 kişi izliyor · 2'si seste"; the balloon drifts across all three
  screens in step (and stands still with "reduce motion" on).

**D. Before the store submission (STORE2, ~25 Nov)** (the Planner reminds the owner first)
- [ ] 28. The extension in Edge, Brave and Opera: install unpacked, room + YouTube sync, voice, camera, tab share, the
  film page and voice there, fullscreen, sounds; Brave Shields + "Disable non-proxied UDP" shows the "blocks direct
  connections" note; Edge "Strict" tracking prevention; Opera's ad blocker, VPN and GX limits; write down each version.
- [ ] 29. The site without the extension in Firefox, Safari (Mac) and on an iPhone: room, YouTube, chat, a game, voice +
  camera, screen share (Firefox: picture only), fullscreen, "Add to Home Screen".
- [ ] 30. On your own phone: the 20 no-code release tests of `is-akislari/yayina-hazirlik.md` part C (in the owner's
  guide repo); Claude turns them into a Sidelit list when asked.
- [ ] 31. Real YouTube / TikTok (the cloud can't play them): ♾ → 🎲 Discover chips and ✨ More like this; the Shorts view's
  bar; `?measure=1` switch times with a friend (then decide on a hidden preload player); TikTok links play and loop;
  a fresh invite opens on one screen; the extension's install card turns into "Go to the film" by itself.

## Owner's to-dos (settings and accounts; tell the Planner when done)
- [ ] Cloudflare (22 Nov, `playbooks/cloudflare.md`): confirm 2FA and the members list; usage notifications at 50 / 80 %
  (Workers requests + Durable Objects) and the error-rate alert; open one invocation log so Claude can compare its
  fields with the privacy policy (CF-8).
- [ ] Google Cloud: confirm 2FA and that the YouTube key is restricted to the YouTube Data API + our site.
- [ ] The private feedback repository: Watch → Custom → Issues, so an `outage` issue reaches your phone. [0.9.97.92]
- [ ] Before the store: the Microsoft Partner Center account for Edge Add-ons (`web-store.md`).

## Pending decisions (owner's)
- **Domain** with the own address (`custom-domain.md`); the name is Sidelit (decided 3 Nov 2026), a trademark database
  check before the store submission (`name-research.md`).
- **Cloudflare Realtime card:** Cloudflare asks for a card even for the free quota and has no spending cap, so voice
  stays peer-to-peer. With a card: Worker secrets `REALTIME_APP_ID` + `REALTIME_APP_SECRET`, the code switches to SFU
  by itself (`ses-goruntu.md`), a budget brake is mandatory, and the same card could hide IP addresses in voice,
  camera and streams (ROADMAP Phase 2).
- **Chrome Web Store submission:** ~25 Nov 2026, before 1.0 (owner, 21 Nov; card STORE2). **Trademark filing, donations, legal entity:** `ROADMAP.md` §4.
- **Film page intro** (play the room intro on the film page or not; Planner recommends not): decided right before the store
  submission, not now (owner, 17 Nov 2026).
- **After 1.0:** a Firefox extension (L), a TURN relay (Phase 2). Not planned: a Safari extension, Opera's own store.
- **TV (owner, 17 Nov 2026):** all three, in this order: short term a TV-browser mode joined with a short code
  (after 1.0 for now, maybe earlier), medium term Google Cast / Google TV (one-time developer fee), long term an Android
  TV app. Cards are written when the first one is due.

## Ideas waiting for the owner's pick
Claude's and the sessions' ideas that came up mid-task (`CLAUDE.md` §4: never built without a card). The full list
with what became of each (built in 0.9.93.2, Test Lab, not planned …) is in `archive/status-history.md`.
- **Invite with the film time:** the invite window also offers "invite with the film time" when one is set (agreed for
  0.9.95, not built yet).
- **More players without the extension:** Vimeo + podcasts first (Planner's proposal; card under Proposed in `CARDS.md`).
- **A TV can keep the host role:** fix with the TV work above (Google Cast step).
- **A link pasted while the room is still connecting:** it is dropped without a note (`connection.send` drops while
  the socket is not open); queue it until open or show "still connecting" (lane A, 16 Nov).
- **Screenshot on failure for the feed harness:** `scripts/harness/feed/run.cjs` failed once on main (the friend's
  `#feed-row-pause` never visible) and CI kept no picture (B2, 16 Nov).
- **Old game layout points (16 Nov):** tablet: an empty band above the game; Draw & Guess rounds "1 / 2 / 3" vs "1 tur".
- **Later ideas (21 Nov):** an extension shortcut to toggle the mic from any tab (`chrome.commands`, toggle only,
  needs a store update); a noise-suppression switch; Sea Battle's pirate sails and paper boat redrawn.
- **Game leftovers (21 Nov):** Test Lab 🤖 friends can share the player's name (`lab-table-friend.ts`); room.css's
  global `.slot` rule hits any game element with class `slot`. Phone Games tab: Last Heart's ± amounts panel covers the table while open.
- **Small leftovers (Planner, 20 Nov):** upright-tablet Shorts bar has no ⋯ More; the feed drawer cuts room text
  mid-word; live e2e `quota.mjs` flake (shards share one address); `side-games-polish` harness stale since GW5.

## Testing in the cloud
The tested sequence moved to `docs/internal/cloud-testing.md` (21 Nov 2026).
