# IP / copyright audit before 1.0 (Sidelit)

_Research session, 4 Nov 2026, for the Planner and the owner. Read-only: **nothing is changed until the owner
approves.** Method: every drawn avatar, theme scene, mascot, game cover, the logo and the mascot were rendered at real
size from `main` (`apps/web/public/avatars/*.svg`, `apps/web/public/themes/*.svg`, `apps/web/src/games/art/covers/*.svg`,
`apps/web/public/logo.svg`, `mascot*.svg`) and looked at one by one; names and texts were read in `i18n.ts`, the word,
quiz and draw lists were searched for brand / film names. **Not legal advice**; risk = how likely a rights owner,
the Chrome Web Store review or an app store would see it as their character / mark._

Risk scale: **high** = reads as one specific copyrighted or trademarked character / mark (body + colours + signature
outfit / prop, often helped by the name); **medium** = a strong hint that a fan would name at once, or a protected
"look"; **low** = a genre archetype or factual / licensed use.

## Headline
- **Avatars are the only big risk.** Of the 33 parody avatars, **26 read as one specific character** (high), 5 more are
  strong hints (medium). Our own rule (CLAUDE.md "Avatars": "parodies only hint at a style: no names, logos, exact
  costumes") is broken by most of them. "Parody" is a weak defence here: an avatar does not comment on the original,
  it just reuses the character. The 13 themed avatars are fine.
- **Five Frames:** green / gold / grey tiles + a keyboard strip under the board are two of the four elements the NYT's
  2024 takedowns called its protected gameplay look, and the cover shows CRANE / SLATE (famous starting words of the
  original). Medium; easy to fix.
- Everything else (themes, logo, mascot, icons, game names, sounds, fonts, word / quiz lists, WhatsApp button, texts) is
  low risk.

## 1. Avatars

### High risk (reads as one specific character)
| Avatar (id · EN name) | What it resembles | Why | Suggested fix |
|---|---|---|---|
| `sponge` · Sea sponge | SpongeBob (Nickelodeon) | yellow square sponge, big blue eyes, buck teeth | **remove** (owner already decided) |
| `squid` · Grumpy squid | Squidward | grey-green squid head, droopy eyes, brown shirt | **remove** (decided) |
| `starfish` · Pink starfish | Patrick Star | pink star, green shorts with purple flowers | **remove** (decided) |
| `nightguard` · Night guardian | Batman (DC) | black pointed-ear cowl on yellow | remove |
| `speedster` · Speedy blue hedgehog | Sonic (Sega) | blue spiky hedgehog, green eyes, peach muzzle; name says it | remove |
| `scientist` · Mad scientist | Rick (Rick and Morty) | spiky light-blue hair, unibrow, lab coat, portal-green | remove |
| `sidekick` · Nervous grandson | Morty | brown hair, yellow T-shirt, wobbly mouth; "grandson" pairs it with Rick | remove |
| `chemist` · Chemistry teacher | Walter White (Breaking Bad) | bald, glasses, goatee, green-yellow shirt, flask | remove or redesign (hair, glasses, no goatee) |
| `cavecreature` · Cave creature | Gollum (LOTR) | bald grey creature, huge blue eyes, a gold ring | remove (the ring is the signature) |
| `greenblade` · Green-haired swordsman | Zoro (One Piece) | green hair, scar over one eye, katana; name says it | remove |
| `strawhat` · Straw-hat pirate | Luffy (One Piece) | straw hat with red band, scar under the eye, red shirt | remove |
| `cook` · Curly-brow cook | Sanji (One Piece) | blond hair over one eye, black suit; "curly-brow" is his trait | remove |
| `notebookgenius` · Notebook genius | Light Yagami (Death Note) | brown hair, beige uniform, black notebook | remove |
| `sweetsleuth` · Sweet-tooth sleuth | L (Death Note) | messy black hair, white shirt, thumb at mouth, sweets | remove |
| `airmonk` · Air monk | Aang (Avatar: TLA) | bald boy, blue arrow tattoo, yellow-orange robe | remove |
| `waterfriend` · Water-bending girl | Katara | brown hair loops, blue necklace, water; "-bending" is the show's term | remove |
| `earthgirl` · Earth-bending girl | Toph | black bun with band, pale eyes, green-yellow outfit; "-bending" | remove |
| `pinecap` · Mystery-hunting kid | Dipper (Gravity Falls) | the blue-white cap with a pine tree logo | remove |
| `sweaterkid` · Cheerful sweater girl | Mabel (Gravity Falls) | braces, headband, pink sweater with a star | remove |
| `timetraveler` · Time traveler in a fez | the 11th Doctor (Doctor Who, BBC) | fez, bow tie, tweed jacket | remove or redesign |
| `wizardboy` · Wizard boy with glasses | Harry Potter (WB) | round glasses, black hair, red-gold house tie | remove |
| `redhead` · Red-haired wizard boy | Ron Weasley | red hair, freckles, red-gold tie | remove |
| `wizardgirl` · Curly-haired bookish girl | Hermione Granger | bushy brown hair, red-gold tie, book | remove |
| `hunter` · Monster hunter | Geralt (The Witcher) | white hair, scar, yellow eyes, two swords | remove |
| `jester` · Chaos jester | Harley Quinn (DC) | pink-blue pigtails, red / black split outfit, diamonds | remove |
| `dragonqueen` · Dragon queen | Daenerys (Game of Thrones, HBO) | silver braided hair, blue dress, black dragon | remove or redesign (hair colour, no dragon) |

### Medium risk (strong hint)
| Avatar | What it resembles | Why | Suggested fix |
|---|---|---|---|
| `goth` · Goth girl | Wednesday Addams | black braids, white collar, black dress | soften: no braids + collar together, change palette |
| `hacker` · Black-coat hacker | Neo (The Matrix) | small black sunglasses, black coat, green code | soften: drop the green rain code or the coat |
| `catburglar` · Cat burglar | Catwoman (DC) | black cat-ear mask, black suit | soften: a plain eye mask, no cat ears |
| `lawyer` · Sly lawyer | Saul Goodman (Better Call Saul) | light-blue suit, loud orange tie, grin | soften: a normal suit / tie |
| `swordsman` · Black swordsman | an anime swordsman (Guts / Ichigo style) | spiky black hair, scar, huge sword | soften: smaller sword, different hair |

### Low risk (genre archetypes, keep)
`wizard` (generic pointed-hat wizard; long white beard is the archetype), `warrior`, `elf`, `dwarf`, `janissary`,
`horseman`, `veiled`, `director`, `diva`, `driver` (3D glasses), `captain`, `conductor`, `sorceress`, `armadillo`,
`cartoonist` (no clear single source found; keep, but re-check if someone names one).

**Recommendation:** before the store submission, ship only the themed tab + the low / softened medium ones. Either
remove the parody tab completely, or replace it with our own "genre" archetypes (space captain, pirate, detective,
vampire, robot, knight, ninja…) drawn without any one character's silhouette + palette + prop. Rename the tab
"Genres" (not "Parody"). Keep the old SVGs out of the repo too if it goes public (`docs/internal/design/avatars-2/`).
Saved users with a removed avatar get a random themed one (the 0.9.57 path).

## 2. Themes (scenes, mascot costumes, names)
| Item | Resembles | Risk | Why | Fix |
|---|---|---|---|---|
| Drive-In (`acikhava`) | generic drive-in cinema | low | cars, screen, lights; Istanbul-style tower silhouette | keep |
| Arabian Nights (`binbirgece`) | the public-domain tales | low | desert, domes, camels, flying carpet; no film's characters | keep |
| Ocean Liner (`gemi`) | a 1930s liner | low | generic liner, no ship name or line livery | keep |
| Moonlit Nights (`lokum`) | Istanbul skyline | low | real landmarks are free to draw | keep |
| Opera Night, Picture Palace (`opera`, `sinema`) | generic theatre / cinema | low | curtain, balconies, projector | keep |
| Night Express (`tren`) | a clock tower + streamlined train | low | no railway brand / logo | keep |
| Night, Ocean, Sunset, Neon | plain colour themes | low | — | keep |
| Glowbeam costumes (fez, captain hat, beret, headphones, snorkel, top hat, nightcap…) | everyday items | low | none is a character's outfit | keep |
| Theme names (EN + TR) | — | low | descriptive; "Arabian Nights" is a public-domain title | keep |

## 3. Everything else that ships
| Item | Resembles | Risk | Why | Fix |
|---|---|---|---|---|
| **Five Frames board colours + keyboard** | the NYT daily word game | **medium** | green ✓ / gold • / grey tiles and a keyboard strip under the board = 2 of the 4 elements the NYT named in its 2024 DMCA notices (`word-game.md` §2) | gold / outline / plain marks with ✓ • ×, not green + yellow; keyboard to the side or alphabetical; keep the film-strip rows, 7 tries and our share line (already ours) |
| **Five Frames cover** (`covers/word.svg`) | the same game | **medium** | shows CRANE / SLATE, the original's most famous starting words, in coloured tiles | other example words (e.g. CLIPS / SCENE / FRAME) |
| Four in a Row (`four`) | Hasbro's CONNECT FOUR | low | the EN name is already "Four in a Row" (generic); the mechanic is not protected | keep; never call it "Connect Four" in UI, store or docs (CLAUDE.md still says "Connect Four" internally: fine, but not public) |
| Tic-tac-toe / XOX, Draw & Guess, Quiz | generic | low | no "Pictionary" etc. | keep |
| Last Heart (poker) | generic Texas hold'em rules | low | standard card faces drawn by us | keep |
| Snack Bar, Window Garden + art | own | low | — | keep |
| Logo (play triangle + beam with eyes) and Glowbeam mascot | — | low | own shapes; not close to Plex / YouTube marks | keep (trademark search for the name is separate) |
| Line icons (`ui/icons.ts`) | — | low | drawn in-house | keep |
| Sounds, intro | — | low | generated with Web Audio, no samples | keep |
| Font: Bricolage Grotesque | SIL OFL 1.1 | low | self-hosted with `OFL-bricolage-grotesque.txt` | keep the licence file next to it |
| Word lists (ENABLE, Zemberek) | — | low | public domain / Apache 2.0, credited in `third-party-notices.txt` | keep |
| Quiz / Draw & Guess words | — | low | only generic words; "iPhone", "Apple" (fruit), "Frozen" (as an answer option) appear as plain facts | keep (nominative / factual) |
| WhatsApp button | WhatsApp trademark | low | Simple Icons CC0 path (the SVG data is CC0, the **mark** stays Meta's); share-button use is what WhatsApp's brand resources allow if the glyph is not altered and the name is written "WhatsApp" | keep; use the official green / white, don't recolour or animate it |
| "YouTube" / "TikTok" in texts | trademarks | low | factual use (nominative) | keep; YouTube logo use must follow YouTube branding (see `store-and-youtube-audit.md`) |
| Store / README / help texts | — | low | no film / series / piracy names; "a neutral sync tool" | keep the rule |
| Design source files in `docs/internal/design/` | the avatars above | low now / medium if the repo goes public | they hold the same characters | delete with the avatars before the repo is made public |

## What the owner decides
1. Remove the 26 high-risk parody avatars (3 already decided) and either drop the parody tab or replace it with own
   genre archetypes.
2. Soften or remove the 5 medium avatars.
3. Five Frames: change tile colours + keyboard position, and the cover's example words.
After his picks the Planner writes the cards; no file is touched before that.
