# YouTube API audit pack (card YTQ1)

Everything the owner needs to submit the **YouTube API Services – Audit and Quota Extension Form**
(https://support.google.com/youtube/contact/yt_api_form) for a bigger daily quota than the free 10,000 units.
Research behind it: `docs/internal/research/youtube-audit.md` (form fields, rules, timing).

The form is submitted **after the move to `sidelit.app`** (owner's pick, 15 Nov 2026): every URL in it is the final
address. Google gives no review time; plan for 4–12 weeks.

| File | What it is |
|---|---|
| `self-check.md` | Each rule the audit checks, our status, the evidence, and what to capture on the day |
| `form-answers.md` | The form's answers in English, field by field, ready to paste |
| `quota.md` | How much quota to ask for, with the arithmetic, and how to fill the usage table on the day |
| `screencast.md` | The 2–3 minute screen recording the reviewer gets, scene by scene |
| `scripts/check-yt-audit.mjs` | Checks a running site's privacy policy, terms and YouTube logo for what the audit needs |

## Order on the day (after `sidelit.app` is live)
1. `node scripts/check-yt-audit.mjs https://sidelit.app`: all green.
2. B2 takes the screenshots listed in `self-check.md` on the live domain (computer and phone) and records the screencast
   (`screencast.md`).
3. The owner reads the usage counters (`quota.md`, step "The usage table") and B2 fills the table.
4. The owner opens the form **signed in with the Google account that owns the Cloud project holding `YOUTUBE_API_KEY`**,
   copies the answers from `form-answers.md` (his legal name, address and the project number he types himself; they
   never go into this repository), attaches the screenshots and the screencast link, and submits.
5. The Planner records the answer; once granted, the new quota goes into `docs/internal/costs.md`.

## Status
- Self-check: every item passes (see `self-check.md`). Two items wait for the day: the official logo file (Design is
  replacing the traced icon with YouTube's own) and the screenshots on the final domain.
- Still open before submitting: the own domain (owner), the official YouTube logo file (Design), the screenshots and the
  screencast (B2, on the live domain).
