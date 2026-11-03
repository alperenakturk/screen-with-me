# New home page (card 15b, owner's picks 1A · 2A · 3A)

_Design session, 3 Nov 2026. The owner picked every recommendation on https://claude.ai/artifact/AMuQiAM7itZuXchbzKDRUS:
**1: A "Light beam"**, **2: A** (a short intro section under the first screen), **3: A** (no video link box on the home
page anywhere). The build reference is `home-15b/options.html`, direction A (the `.dA` rules + `#sceneA`). Direction A at the
four sizes: `home-15b/A-<w>x<h>.jpg` (the phone shot predates the save box rule below). The slogan stays the owner's. There is no theme picker (6g.4: everyone starts
on Gece; a saved theme still applies). This also closes design sweep 1 #10 (a theme's beam across the heading) and #11
(the phone's empty bottom half)._

## 1. First screen
Top bar as today (logo + wordmark, 🧩 Extension, TR / EN). No 🎨 button. Under it, one screen that never scrolls
inside:

**Text column** (in order):
1. Pill: "Free · no account · no ads" · "Ücretsiz · hesap yok · reklam yok". 14 px, gold text on gold 9 % with a gold
   27 % border.
2. Slogan, two lines, the second in gold: "Different screens, / **same moment.**" · "Ayrı ekranlar, / **aynı an.**".
   Bricolage Grotesque ExtraBold, line-height 1.02, letter-spacing −0.02em, `text-wrap: balance`.
3. Line: "Watch a video with friends anywhere, in sync. Talk, see each other and play in the same room." · "Arkadaşlarınla
   nerede olursanız olun aynı videoyu aynı anda izle. Aynı odada konuş, birbirinizi gör, oyna." Muted `#c9c0ea`.
4. Buttons: **"Create room" · "Oda oluştur"** (primary, the gold gradient `#ffd27a → #ffb347`, ink text) and
   **"Join with a code" · "Kodla katıl"** (secondary, white 4 % fill + 18 % border). 18 px bold, 15 × 26 px padding,
   radius 14.
5. "Save the room (a name and a link that stays)" · "Odayı kaydet (adı ve linki hep aynı kalır)", the existing
   checkbox, 15 px, the box 20 px (a11y-1 T1).
6. "Continue where you left off" line (card 5's `renderContinue`), here, under the save box: "↺ Continue: **Velvet
   Otter** · 3 inside · Open" · "↺ Devam et: **Velvet Otter** · içeride 3 kişi · Aç", 15 px, one line with an ellipsis.
   It is absent when there is nothing to continue; nothing jumps then, because the column is centred.

**Art: the light beam** (`#sceneA` in the reference, viewBox 640 × 380, drawn as inline SVG / CSS, no image file):
Glowbeam (happy, `createMascot`) on the left with a soft gold halo; its light, a gold cone (`#ffd27a` at 75 % →
`#ffc65a` at 6 %), falls on a "screen" card on the right. On that card: a sunset video, a 5 px progress bar in gold, an
"In sync · 30 ms" · "Senkron · 30 ms" pill, a chat bubble "this part! 😄" · "işte bu kısım! 😄" (**opaque** `#6a4cf2`, white
text, 5.4:1, fixes sweep 1 #12), and under it three faces (two with the green voice ring) + "3 watching · 2 in voice" ·
"3 kişi izliyor · 2'si seste". The art is `aria-hidden`.

**Feature row** (bottom of the first screen), three cards: 📱 "No app" / "A link, on a computer or a phone" · "Uygulama
yok" / "Bir link; bilgisayarda ya da telefonda"; 🎙 "Voice and camera" / "Talk while you watch" · "Ses ve kamera" / "İzlerken
konuşun"; 🎮 "Games in the room" / "XOX, Draw & Guess, quiz" · "Odada oyunlar" / "XOX, Çiz-Bil, bilgi yarışması". Titles 15 px
bold, lines 14 px, cards white 3 % + 9 % border, radius 14. Under them, centred, "How it works ↓" · "Nasıl çalışır ↓"
(13 px muted) scrolls to section 2.

## 2. Sizes and breakpoints
| Size | Layout | Numbers |
|---|---|---|
| Computer 1366×768 (and wider landscape ≥ 900 px) | Text left (46 %), art right (54 %), vertically centred; feature row across the bottom | side padding 56 px, gap 40; slogan 64 px; line 19 px, max 30ch; at 1920×1080 the page content is capped at 1240 px wide and centred, slogan 72 px |
| Sideways tablet 1180×820 | Same as the computer | slogan 64 px (wraps to three lines at 1180, fine); touch targets ≥ 44 px |
| Upright tablet 820×1180 (portrait, 600–1100 px wide) | One centred column: art on top at full width, then the text centred, then the feature row | side padding 64, gap 28; slogan 72 px; line max 34ch; buttons side by side, centred |
| Phone 390×844 (< 600 px wide) | One column: art on top (edge to edge minus 14 px), text left-aligned under it, buttons full width stacked, the save box, the continue line; the feature row as three compact tiles (icon + title, no line) at the bottom | side padding 20; slogan 40 px; line 16 px; buttons 14 px padding; tiles 13 px titles (never smaller) |

Selectors: wide = `(orientation: landscape) and (min-width: 900px)`; upright tablet = `(orientation: portrait) and
(min-width: 600px)`; phone = `html.phone` (the existing `isPhoneLayout()`), so the phone home of 0.9.92.5 is replaced
by this one. The first screen is `min-height: calc(100dvh - 56px)`, its content centred; the feature row sits at its
foot. Today's phone "How does it work?" toggle goes (the art is on the first screen, the intro is section 2).

**Sweep 1 #11 (empty phone space):** the art fills the top third and the feature tiles sit at the foot, so the phone
screen is full (checked at 390×844 and 375×667; at 375×667 the feature tiles drop under the fold, which is fine).

**Sweep 1 #10 (a theme's beam over the heading):** our beam lives only inside the art column. With a saved scene theme
whose picture has its own light (Sinema's projector), the text column gets a soft backdrop:
`background: radial-gradient(closest-side, rgba(10, 8, 30, .62), transparent)` behind the text, no blur. Plain themes
need nothing.

## 3. Section 2: "How it works" (one computer screen)
Heading "How it works" · "Nasıl çalışır". Under it:
- Three step cards in a row (one column on phones): **1 Create a room** / "One click, no account." · **1 Oda oluştur** /
  "Tek tık, hesap yok."; **2 Send the link** / "Friends join from their browser, nothing to install." · **2 Linki gönder**
  / "Arkadaşların tarayıcıdan katılır, kurulacak bir şey yok."; **3 Watch together** / "Pause for one, pause for all."
  · **3 Birlikte izleyin** / "Biri durdurunca herkes durur." Gold step numbers, 17 px titles, 15 px lines.
- One wide card: 🧩 **"Video on any site"** / "With the extension, the room opens on top of the site the video is on;
  everyone in their own tab, at the same second." + "Get the extension" · 🧩 **"Her sitede video"** / "Eklentiyle oda,
  videonun olduğu sitenin üstünde açılır; herkes kendi sekmesinde, aynı saniyede." + "Eklentiyi al".
- Saved rooms (when any), as today's list, under the heading "Your saved rooms" · "Kaydettiğin odalar".
- A line: "Questions? Help and FAQ" · "Sorun mu var? Yardım ve SSS" → `help.html`.
- Then the footer.
Removed from the home page: the link box (3A), the theme strip (6g.4), the "three doors" and the "What's in a room"
chips (their content is in the feature row and the cards above).

## 4. Motion
- The progress bar on the art's screen runs 6 s, linear, looped. The beam breathes (opacity 1 → 0.6 → 1, 3.2 s).
  Glowbeam stays still (the intro is its moment).
- **Reduced motion:** nothing moves. The bar rests at 40 %, the beam at full opacity.
- No motion on the text, the buttons or the feature row.

## 5. Tests for the card
Home harness at 1920×1080, 1366×768, 1180×820, 820×1180, 390×844 (EN + TR):
- The first screen fits: the feature row's bottom is ≤ the viewport height, and nothing overflows horizontally.
- There is no link box, no theme strip, no 🎨 button.
- "Create room" makes a room as today; the save box still carries the name.
- "Join with a code" opens today's code path.
- The continue line shows only with a `lastRoom`.
- The art is `aria-hidden`, and the bubble contrast is ≥ 4.5:1.
- With reduced motion no animation runs.
- The phone-speed budget is still green.
- A Sinema saved theme gets the text backdrop.
