# Research: daily five-letter word game (English + Turkish)

_Research session, 2 Nov 2026, Job 5 from the Planner (card "🔤 Daily word game", 0.9.95). Read-only; no legal
advice: the owner decides, a lawyer for anything doubtful._

## (1) Word lists we may ship in client code

| List | Licence | Attribution / duty | What it gives us |
|---|---|---|---|
| **ENABLE** (`enable1.txt`) | **Public domain**: "WORD.LST, is herewith formally released into the Public Domain. Anyone is free to use it or distribute it in any manner they see fit." (firm, [Debian SCOWL copyright](https://sources.debian.org/src/scowl/7.1-1/Copyright/)) | none (a voluntary donation was asked, not required) | **8,636 five-letter words** (counted here from a public copy) → the **English allowed guesses**. Contains rare and some offensive words: filter. |
| **12dicts** (Alan Beale; `2of12`, `3esl`, `2of4brif`…) | **Public domain**: "The 12Dicts package and Supplement is in the Public Domain" (firm, same Debian file) | none | Lists of **common** words found in several learner / small dictionaries → pick the **English answers** (5-letter ∩ common ≈ 1.5–2.5k, then a hand pass). |
| SCOWL (as a whole) | SCOWL's own permissive licence (BSD-like; sources disagree on wording, check `Copyright` in the release) | keep its copyright notice | Size-graded lists (e.g. "size 35" = common): a second way to choose common answers. Use only if ENABLE + 12dicts are not enough. |
| FrequencyWords (OpenSubtitles) | content **CC BY-SA 4.0** (firm, [README](https://github.com/hermitdave/FrequencyWords)) | attribution + **share-alike** on the list we ship if derived | Frequency ranks. Avoid shipping it; at most use it **offline** to help a human rank candidates (grey: keep the shipped list a hand-picked selection from the public-domain lists). |
| **Zemberek-NLP** lexicon (`morphology/src/main/resources/tr/master-dictionary.dict`) | **Apache 2.0** (firm, [LICENSE](https://github.com/ahmetaa/zemberek-nlp/blob/master/LICENSE)) | ship a copy of the Apache licence + a credit line (no NOTICE file in the repo); mark that we changed it | **4,619 five-letter Turkish lemmas** (counted here: no proper nouns, abbreviations or punctuation; `I/İ` lower-cased the Turkish way, letters a–z + ç ğ ı ö ş ü) → **Turkish allowed guesses**; answers = a hand-picked common subset (~1–1.5k). Lemmas only: plural / suffixed forms (e.g. "evler") are not in it, so the rules say "dictionary words, no suffixes". |
| hunspell-tr (tdd-ai) | **MPL 2.0** in the repo (firm, [LICENSE](https://github.com/tdd-ai/hunspell-tr)); packagers list MIT (conflict) | MPL: the file stays MPL, changes to it shared | Bigger, with suffixes via affix rules; harder to use for 5-letter lists. Not needed. |
| TDK dictionary / scraped "TDK lists" | **No reuse licence found**; a Hugging Face dump tagged CC0 says it "is not an official TDK dataset" (weak, [dataset](https://huggingface.co/datasets/erogluegemen/TDK_Turkish_Words)) | — | **Do not ship.** The popular Turkish clone took its words from the TDK dictionary ([Diken](https://www.diken.com.tr/?p=1080610)), but that is no licence for us. |

**Filtering (both languages):** remove slurs and sexual / insult words with an openly licensed block list (e.g. the
"List of Dirty, Naughty, Obscene, and Otherwise Bad Words", CC BY 4.0: verify) **plus a human pass** of the answers;
keep the block list out of the shipped files (only its effect). Turkish needs `toLocaleLowerCase('tr')` /
`toLocaleUpperCase('tr')` everywhere (I ↔ ı, İ ↔ i), an on-screen keyboard with ç ğ ı İ ö ş ü, and matching that
treats `ı`/`i` as different letters.

**Credits:** an "About the word lists" line in the game + `THIRD-PARTY-NOTICES` (ENABLE: public domain, Zemberek:
Apache 2.0 with the licence text). Fits the Thanks page card too.

## (2) The original game: what to stay away from

- The New York Times owns the **name** as a trademark and, in March 2024, sent DMCA notices to ~1,900 clone forks on
  GitHub, claiming as its "copyrighted gameplay" the **5 × 6 grid, green tiles for correct letters, yellow tiles for
  right letter / wrong place, and the keyboard directly beneath the grid**; a site got a complaint under US trademark
  law. The Times said it has no issue with similar word games "that do not infringe its Wordle trademarks or
  copyrighted gameplay" (firm: [Gizmodo](https://gizmodo.com/nyt-dmca-takedown-request-wordle-clones-reactle-1851320538),
  [ABC](https://www.abc.net.au/news/2024-03-13/new-york-times-wordle-copyright-infringement-notices/103582756),
  [CBS](https://cbsnews.com/detroit/news/nyt-copyright-takedown-wordle-clones-new-york-times)). A law professor noted
  the trademark claim does not belong in a DMCA notice (game mechanics themselves are generally not copyrightable),
  but the practical risk is a takedown, not a court case.
- **So ours must differ visibly in all four claimed elements, plus the name and the share text:**
  - **Name:** our own, never "Wordle", "-dle", "-ordle" or "Wordle in Turkish" (the owner picks; English first).
  - **Board:** not a 5 × 6 square grid of tiles: e.g. a ticket / film-strip row per guess, round "seats", or a single
    row with a history list beside it; the number of guesses can stay 6 or change (7 suits Turkish better).
  - **Colours and marks:** not green / yellow / grey squares: use the theme's accent for "right place", an outline or
    a dot for "in the word", plus symbols (✓ / • / ×), which also helps colour-blind players.
  - **Keyboard:** not a full QWERTY strip right under the grid: e.g. letters in alphabetical order in the side panel,
    or a compact keyboard to the side; the physical keyboard always works.
  - **Share:** not rows of 🟩🟨⬛: e.g. "🍿 Word of the day #12 · 4/7 · solved in the room" with our own symbols, or
    a small image card.
- Daily mechanics (one word per day, same for everyone, a streak) are common to many games and fine.

## (3) If the Turkish list is not reusable: word-free daily games of the same shape

The Turkish list **is** reusable (Zemberek, Apache 2.0), so this is a fallback only.
1. **Emoji code breaker:** guess a hidden row of 4–5 emojis from 6–8; marks for right place / in the row.
   Pitfall: close to the old "Mastermind"-type games (generic mechanic, avoid that name / pegs look); emoji look
   differs per device (use our drawn icons).
2. **Number target:** reach a daily target with 6 numbers and + − × ÷. Pitfall: needs a solver to check every day's
   puzzle is solvable; close to a TV-show format (avoid its name).
3. **Daily colour mix:** guess a hidden colour by mixing sliders, "warmer / colder" after each try. Pitfall: screens
   show colours differently; needs a tolerance and colour-blind support.

## Recommendation
English: allowed guesses = ENABLE 5-letter (filtered); answers = 12dicts common 5-letter (filtered + a hand pass).
Turkish: allowed guesses = Zemberek 5-letter lemmas; answers = a hand-picked common subset; rules say "no suffixes".
Our own name, board, marks, keyboard placement and share text; credits for both lists. The daily word comes from a
seeded shuffle (same for everyone, works offline, no server), the answer list is shipped obfuscated, not plain.

## Name check: "Five Frames" (TR "Beş Kare"), 3 Nov 2026
Owner's pick for the daily word game. Web search only (registries not reachable from the cloud).
- **No game, app or word game called "Five Frames" was found.** "Five frame(s)" is a common early-maths teaching tool
  (a 5-box counting grid; printables, edx Education counter sets, [classplayground](https://classplayground.com/five-frame/)):
  harmless, but it crowds search results.
- **Nearest neighbour: "Framed"** ([framed.wtf](https://alternativeto.net/software/framed-wtf/about)), a well-known
  daily *movie* guessing game since March 2022 (guess the film from up to 6 frames, Wordle-style sharing;
  [GameSpot](https://www.gamespot.com/articles/framed-is-a-wordle-like-with-scenes-from-movies/1100-6501819/)). A
  daily game named "…Frames" inside a film-watching product may make people expect a movie-still game. Different name,
  different mechanic: low legal risk, some confusion risk.
- **Original word game's trade dress:** the name does not copy that game's name or "-dle" pattern, so it is not a
  problem by itself. The risk sits in the board: "five frames" read as five square tiles in a row could pull the
  design back towards the 5 × 6 square grid. Keep the earlier rule (§2): film-strip / ticket rows, our own marks and
  colours, no green / yellow squares, our own share text. A film-strip look actually fits the name ("frames" = film
  frames) and moves us further from the original.
- **Verdict: 🟢/🟡 usable.** No collision found; mind "Framed" (expectation, not law) and keep the board a film strip,
  not a square grid. Registry check (TÜRKPATENT / TMview / USPTO, class 9 / 41) still the owner's step before 1.0.
