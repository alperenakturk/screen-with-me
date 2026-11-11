# QA2 reviewer brief (read this first, then the folder's REVIEW.md)

You review screenshots of a web product (Sidelit: watch videos in sync with friends, with games beside the video).
Read only the files named in your task: this BRIEF.md, the folder's REVIEW.md (product rules + what to look for) and
index.md (what each picture is), then EVERY PNG in your list. Do not read source code or other folders.

Sizes: laptop 1366×768, desktop 1920×1080, tablet 820×1180 (upright), tablet-land 1180×820, phone (iPhone 13
upright), phone-land (iPhone 13 sideways). Screens open as the room's only person (the host). The test video is a
colour-bar test pattern (not a fault). A computer hides the rail beside the video and the player bar until the mouse is
over the video (not a fault). A phone room shot may catch an intro animation fading out (ignore that). A screen that
needs scrolling to see everything is only a fault if it is a dialog / panel / game that should fit (the rules say so);
long pages (help, privacy, terms, home) are shown at the top only.

Output ONLY a list, one line per problem, most severe first:
`<severity> | <area> | <file(s)> | <what is wrong, concretely: where on the screen> | <why (rule or reason)>`
- severity: broken (something can't be used / is cut off / overlaps / is wrong) · ugly (works but looks wrong or
  inconsistent) · nit (small polish).
- area: site (home, help, legal, extension pages) · room (room page, side panel, top bar, settings, invite, join, Test
  Lab drawer) · game (inside a game: board, cards, its texts) · frame (the game window's frame: its head bar, buttons,
  placement, size, position over/beside the video) · art (illustrations, icons, theme scenes, mascots).
- When the same problem shows in many files, write it once and list the files (or "all phone shots").
- Turkish (`-tr`) pictures: flag any English words left in the UI, and text that overflows because Turkish is longer.
End with one line: `checked N pictures`. If a picture has nothing wrong, don't list it.
