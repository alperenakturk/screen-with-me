# QA2 first-look findings (main 0.9.97.121)

What was covered:
- 408 shots across 8 batches:
  - Night: every screen at 1366 / 1920 / tablet both ways / phone both ways, EN + TR (352 shots).
  - Matinee: laptop / tablet / phone, 8 screens.
  - Two scene themes, sinema and lokum: laptop / tablet, 8 screens.
- 7 fresh reviewer subagents. I checked the key "broken" items against the pictures myself.
- State matrix on main: all checks green. The only notes are the known exceptions: a side game's free window over the video on a tablet and in cinema mode.

Dropped as not real:
- The extension page showed "Version 0.9.97.116": my local build had not rebuilt the zip.
- The old name "screenwithme" in the publisher e-mail and the zip name: kept on purpose (CLAUDE.md §1).
- "(aydınlatma metni)" in the English privacy page: an intended legal term.

## W (game window frame, stage.ts)
1. BROKEN: on a tablet, upright and sideways, the side-game free window opens over the video.
   - Snack, garden and word, in all themes. It covers the right half of the video.
   - Upright, it also covers the search bar's 🔍 / Add to queue / Play now buttons.
   - Sideways, it hides the video's "Next".
   - The state matrix lists this as a known exception. The owner's rule says never cover the video, so it needs a decision: keep the exception, or fix it. Files: games2/game_{snack,garden,word}-tablet*.png.
2. BROKEN: on an upright tablet, the games hall popover is taller than the video and the second row of cards is cut off. Same in every theme. Files: room/games-hall-tablet-en.png, themes*/games-hall-tablet-*.
3. BROKEN: on a sideways phone, the games hall sheet shows only its header, the tabs, "What's new" and the top third of the first card row. Files: room/games-hall-phone-land-en.png.
4. UGLY: the "Video paused for the game" flash hint sits on the head bar and covers the top of the ?, 🎮 and Leave buttons. Every table at every computer and tablet size. Files: games1/game_*-{laptop,desktop,tablet*}-en.png.
5. UGLY: the head buttons are icon-only (↩ ■ ✕) at 1366 and on tablets, and labelled only at 1920, although the bar has room. ■ and ↩ are hard to guess, and ✕ reads as "close the game", not "back to video".
6. UGLY: phone head bar problems:
   - "‹ Back to video" wraps onto its own second row, leaving a tall head with an empty block.
   - There is no game name.
   - The mic button is round while the other buttons are square.
   - The "?" is in the head for Last Heart, in the body for xox / four / sea / duel (alone in an empty row on duel), and missing for draw / quiz / classics.
7. UGLY: Classics has no "?" in its head on computers; every other table has one.
8. UGLY: on a laptop, the side-game free window covers the whole side panel (Together card, chat tabs) and leaves the chat input looking orphaned. Its left edge touches or clips "Play now", which is "Şimdi aç" in TR.

## Game Studio (inside the games)
1. BROKEN: xox and four cut "Waiting for an opponent: someone in the room need…" at every size, even 1920. It should wrap.
2. BROKEN: on a sideways phone, lobby rules are cut with "…".
   - Quiz loses the 50:50 sentence and shows a doubled "…."
   - Last Heart is cut at "whoever…".
   - There is free space below both.
3. BROKEN: on a sideways phone, the Five Frames Duel lobby title sits on the card's top border, and the medallion and rules are gone.
4. BROKEN: on an upright phone, the Classics 2×3 grid runs to the bottom edge and the bottom row looks clipped.
5. BROKEN: on a sideways phone, Snack Bar leaves "Popcorn machine" (the only item you can afford) out of the list and shows "+1 more when the window is bigger" over an empty band.
6. UGLY: text cut where it could fit:
   - Snack: "Opens with the Soda fount…", "Patlamış mısır …" (TR laptop), and a footer "#1 · …" / "🎬 …" that is also cryptic.
   - Garden: "about 18 watched…"; the laptop drops the "Album" label (📖 0/24 only).
   - Five Frames: "Tamam" fills its key edge to edge.
7. UGLY: the Duel lobby card's "Waiting for a second player…" and mascot touch its bottom gold border, and the medallion cuts its top border (computers).
8. UGLY: the Five Frames guess rows sit off centre (wide gap after the row number); empty space between the legend and the keyboard on desktop.
9. UGLY: the Four-in-a-row stand floats apart from the board, and on a phone it is wider than the board.
10. UGLY: xox and four at 1920 are scaled up very large, with a big empty gap between the player rows and the waiting line.
11. UGLY: large empty areas: Sea on a sideways phone (between settings and buttons), Snack on desktop and phone (below the list).
12. UGLY, wording: the bot "Stub" is an unexplained English word ("Play Stub:", "Stub'a karşı oyna", the garden button "✨ Stub"). On a phone the "Play against Stub" label is dropped, so Easy / Medium have no context. "👁 0" is unclear.
13. UGLY, TR: Duel defaults "Kelime dili" to English (Draw and Quiz default to Türkçe). Snack uses English number formats ("0.5", "6K", "Sv 1", "Nachos"). Poker says "Hold'em"; quiz says "bonus".
14. NIT:
    - Classics cards wrap "Stub" alone onto a line.
    - Orphan words: "join." (Draw) and "hands." (Last Heart).
    - Last Heart: "100 %" with a space, and no empty "Waiting…" seat like the other lobbies.
    - Score shows "0 – 0" in xox but "0 : 0" in Sea.
    - On a sideways phone, the "You need at least 2 players" hint sits far from its button.
    - Stray highlight on the Backgammon card on a sideways phone.
    - Five Frames is named twice (head + header).
15. UGLY, contrast: locked garden plants and empty letter tiles are barely visible in the dark scene themes, and beige on beige in Matinee. Matinee's game tiles stay dark navy on the cream hall.
16. UGLY: the games hall's "What's new" is a run-on changelog sentence, in EN and in TR ("…sayaçlar ne saydığını söylüyor"). Title "Game hall" vs the glossary's "games hall".

## Lane A (room / site)
1. BROKEN: on a sideways phone, the invite dialog runs off the bottom (WhatsApp cut in half).
2. BROKEN: on a sideways phone, Settings → My screen / Room rules / Sound & camera are cut at the bottom edge (a row sliced through its text), with no sign there is more. A long list may scroll, but it needs a visible cue or reflow.
3. BROKEN, Test Lab: with the drawer open on a sideways tablet, the room squeezes: the search box becomes "Search YouTu", the player bar runs off its card and fullscreen is gone. The TR drawer says "Test Lab" / "Lab'ı kapat" (glossary TR: "Test Panosu").
4. UGLY: Settings categories are inconsistent:
   - Room and Film time have no card or intro and use filled primary buttons, unlike the outlined buttons elsewhere.
   - Sound puts its intro after the card.
   - The About "Feedback" link is grey while the other links are purple.
   - Short categories leave more than half the pane empty at a fixed height.
   - The upright phone drops the "⚙️ Settings" title.
   - The Room name field shows the room's name as placeholder text, so it is unclear whether a name is set.
5. UGLY: on an upright phone, Film time's "In 1 hour" chip shows a selected / focus outline with nothing set.
6. UGLY: the empty room has only the "Chat" tab on computers and a sideways tablet; Queue and People appear only once a video plays.
7. UGLY: cinema mode shows two leave hints at once: the "× Leave cinema mode · T" pill and the "press T or Esc" toast.
8. UGLY: the room doesn't fill the window height: an empty band below the cards (about 60 px at 1366, about 90 px at 1920, about a third of the screen on a sideways tablet).
9. UGLY: on a sideways phone, the join card drops the room name and the avatar hint, and "Enter room" sits about 40 px below the name field.
10. UGLY: the top-bar Extension button is a labelled "🧩 Extension" at 1366 / 1920 / sideways tablet, a bare 🧩 on an upright tablet and a sideways phone, and hidden on an upright phone. The sideways phone offers an extension that can't work on a phone.
11. UGLY: on a phone, the extension page offers a big "Download the extension" button with no "computer only" note. On a sideways phone the hero fills the first screen.
12. UGLY, dark themes (sinema, lokum):
    - The invite Link / QR switch's selected tab looks pressed in or off.
    - The Settings dialog is see-through on a tablet (empty-room text bleeds through).
    - The selected name in the join field is hard to see.
    - The 🔗 on the gold Invite button looks washed out.
    - On an upright phone (Matinee), the invite backdrop isn't blurred and the text behind it is readable.
13. UGLY, TR:
    - Generated room names are English ("Cozy Screen" …) in the join card and Settings → Room.
    - "▶️ Oynatma" reads as "don't play".
    - "Kumanda hep açık" calls the rail a remote (glossary: never "remote").
    - The lab footer says "?debug=0 de kapatır" (wrong suffix, and a raw URL parameter).
14. NIT:
    - "iframe" on the extension page (no technical words), EN and TR.
    - The join hint says "Tap your avatar" on computers.
    - The join ⓘ has no hint.
    - Help / privacy / terms: the right contents column sits a few px higher than the left.
    - The "← Sidelit" back link is styled differently on the extension page.
    - Help / privacy contents misalignment.
    - Home at 1920 and on an upright tablet: an empty band between the Shorts card and the feature row.
    - The home hero on a sideways phone sits low, with leftover avatars.
    - The Sound privacy link's underline runs under the 🔒.
    - Row descriptions are punctuated unevenly.
    - "70%" in TR (should be "%70").
    - The date field's US placeholder.
    - The invite text wraps "account needed." alone onto a line.
    - Faint rail icons over the empty video on a tablet.
    - The extension page's step image clips its file label (desktop).
    - Test Lab: the Status table's value column jumps between three x positions and wraps; a ⌘ Ctrl+K chip shows on touch devices; on a phone the drawer shows only a few rows.
    - On a phone, Settings → My screen lacks the tablet's "Fullscreen when turned sideways" (intended?).

## Design (art)
1. UGLY: home with scene themes: the film reel (sinema) and the column / lantern (lokum) collide with the hero's phone mockup and its "this part!" bubble.
2. UGLY: in the room, scene pieces poke out between panels: the sinema reel's gold arc, the lokum moon and column top.
3. UGLY: the sinema projector beam runs through the semi-transparent join card, behind the name field and the avatar.
4. NIT: the cinema-seat silhouette heads read as broken avatar circles (home and join, tablet). The lokum moon is cut by the join card's edge.
5. NIT: the ticket mascot in the Sea lobby is dimmed to muddy brown in the dark themes. The garden's window scene is washed out in Matinee.
