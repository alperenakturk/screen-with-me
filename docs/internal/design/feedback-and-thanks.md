# "Send feedback" dialog (card 9) and the Thanks page (card 11)

_Design session, 3 Nov 2026. Live preview (every dialog state, computer + phone sheet; Thanks page EN / TR, computer +
phone): https://claude.ai/artifact/NSkaqMxmVS5RciyACptcVW. No owner pick needed. The data rules come from card 9 and
R3-7 in `CARDS.md`; this note covers the look, the words and the states. Colours are today's theme tokens (`--surface`,
`--surface-2`, `--border`, `--text`, `--muted`, the accent; white text only on the darker accent `#6a4cf2`, see
`a11y-1.md` C1)._

## 1. "Send feedback" dialog

**Where it opens:** ⋯ More (computer and phone, last item before "Help and FAQ", icon 💌), the profile menu (next to
Help), and a "Send feedback" button on the Help page. All three open the same dialog; on the Help page it opens over the
page (no room needed). Not in the shell (film page) for now: the ⋯ there has no More list.

**Shape:** the existing `.dialog-backdrop` + dialog (420 px wide, 16 px radius, 18 px padding, 12 px gaps). On a phone
(`html.phone`) a bottom sheet with the grip, full width, radius 18 px on top, like the other sheets. Fits without
scrolling: computer ≥ 1024 × 620, phone 390 × 844 (the technical details stay folded on phones).

**Fields, top to bottom (EN · TR):**
1. Title "Send feedback" · "Geri bildirim gönder" + ✕.
2. Type, required, three chips in a `radiogroup` ("Type" · "Tür"): 🐞 "Something broke" · "Bir şey bozuldu",
   💡 "An idea" · "Bir fikir", 💬 "Something else" · "Başka bir şey". None preselected. Opened from an error card later,
   "Something broke" can be preselected.
3. "What happened?" · "Ne oldu?" + textarea, 96 px (72 px on phones), max 2000 characters, counter under it right
   ("58 / 2000"). Placeholder: "Tell us what you saw or what you'd like. Please don't include passwords or private
   details." · "Ne gördüğünü ya da ne istediğini yaz. Lütfen şifre ya da özel bilgi yazma."
4. E-mail, optional, `type=email`: placeholder "E-mail (optional, for a reply)" · "E-posta (isteğe bağlı, yanıt için)".
5. Checkbox, **unticked**: "Attach technical details (version, browser, connection)" · "Teknik bilgileri ekle (sürüm,
   tarayıcı, bağlantı)". Under it a folded "See what is sent" · "Neler gönderilir" showing the exact lines (site +
   extension version, browser + OS + window size, transport, last `/connection` summary). Never room id, names, chat.
6. Privacy line (12 px, muted): "Goes to the Sidelit team only. We keep your e-mail just to reply, and delete it
   within 90 days. Privacy" · "Sadece Sidelit ekibine gider. E-postanı yalnızca yanıt vermek için tutarız ve 90 gün
   içinde sileriz. Gizlilik" (link to `privacy.html#feedback`; the 90 days must match the policy text card 9 writes).
7. Buttons right: "Cancel" · "Vazgeç", "Send" · "Gönder" (primary). Send is disabled until a type is picked and the
   text has ≥ 3 non-space characters. On a phone the two buttons share the row 50 / 50.

**States:**
| State | What shows |
|---|---|
| Sending | Send shows a small spinner and "Sending…" · "Gönderiliyor…", fields read-only. |
| Sent | The form is replaced by Glowbeam (happy, 72 px, gold shadow), "Thanks! We got it." · "Teşekkürler! Aldık." and "We read every message. If you left an e-mail, we'll answer there." · "Her mesajı okuyoruz. E-posta bıraktıysan oradan yanıt veririz." + "Close" · "Kapat". The typed text is cleared only now. |
| Too many (`429`) | A red-tinted note above the privacy line: "You've sent a few already. Please try again in an hour." · "Az önce birkaç tane gönderdin. Bir saat sonra tekrar dener misin?" The text stays. |
| Off (`off`, no token) | Same note: "Feedback is switched off right now. You can write to screenwithme.app@gmail.com." (the address selectable; switch to the new support address when it exists); Send disabled. |
| Network error | "Couldn't send it. Check the connection and try again." · "Gönderilemedi. Bağlantını kontrol edip tekrar dene."; Send active again. |

**Behaviour:** focus goes to the first chip on open, trapped in the dialog, Esc / ✕ / Cancel close it and return focus
to the opener (`a11y-1.md` K4). An unsent draft survives closing for the tab (`sessionStorage feedbackDraft`). The
"Credit me on the Thanks page" checkbox (card 11) goes under the e-mail field when the closed beta starts, unticked:
"Credit me on the Thanks page (first name or the name you give)" · "Teşekkürler sayfasında adımı yazın".

## 2. Thanks page `/thanks`

**One screen, no scroll** at 1366 × 768 and on a phone 390 × 844 (checked with the six names in the preview).
- Same frame as `help.html` / `privacy.html` (back link "← Sidelit" top left, TR / EN switch top right, `lang.js`,
  `?lang=tr`), but centred and in the night-gold world: background `linear-gradient(160deg, #22174f, #08061a)` with a
  soft gold glow from the left (`radial-gradient` at 12 % 60 %, gold 20 %).
- Glowbeam (happy), 112 px (96 px on phones), gold drop shadow, a slow 2.4 s bob (none with reduced motion).
- Title "Thank you" · "Teşekkürler" (Bricolage ExtraBold 30 px / 24 px on phones).
- One line (14.5 px, muted, max 42 characters per line): "These people tested Sidelit before anyone else, found the
  bugs and told us what felt wrong. The room is better because of them." · "Bu insanlar Sidelit'i herkesten önce
  denedi, hataları buldu ve neyin yanlış hissettirdiğini söyledi. Oda onlar sayesinde daha iyi."
- The names as gold pills (gold 12 % fill, 1 px gold 33 % border, cream text, 14.5 px bold, `white-space: nowrap`),
  centred and wrapping, in the order the owner gave: **Tecem Öztürk, Feyza Hacıalioğlu, Ömer Tuğrul Bakan, Ahmet Faruk
  Uğurluoğlu, Nevin Senem Kanar, Mert Arı** (exactly as written; `lang="tr"` on the list so screen readers say the
  Turkish letters right). The names are the same in both languages.
- Under them: "Want to help too? Send feedback" · "Sen de yardım etmek ister misin? Geri bildirim gönder" (opens the
  dialog above).
- More names later: the pill row wraps; up to ~20 names still fit on one screen at 1366 × 768, beyond that the list
  scrolls inside its own box (the only allowed scroll).
- Links to it: the site footer ("Thanks" · "Teşekkürler", after Help) and a line at the end of the Help page.

## Tests for the cards
Card 9 harness: the dialog opens from ⋯, the profile menu and Help on 1366 × 768 and 390 × 844 without inner
scrollbars; Send stays disabled until type + text; the details box is unticked and its preview lists no room id or
name; the `off` answer shows the e-mail note; focus trap and return. Card 11 harness: `/thanks` and `?lang=tr` show the
six names exactly, no page scroll at both sizes, footer and Help link to it.
