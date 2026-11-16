# What the next release changes (card CI3b)

Every PR with a user-facing change adds **one file here**, named after its branch (`claude-st2-stream-chat.md`), with
its lines for `CHANGELOG.md`: plain English for the people using Sidelit, one `- ` bullet per change, no version number
(CI gives the release its number). A PR never edits the footer version, the extension version or a version heading
in `CHANGELOG.md` (`scripts/check-version-edits.mjs` fails it).

When main's run puts a batch live, the `tag` job tags it and publishes the files added since the previous tag as the
release notes of that tag. Now and then a docs PR folds them into `CHANGELOG.md` (one block per tag) and deletes them:
`node scripts/changelog.mjs fold`.
