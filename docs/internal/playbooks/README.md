# Playbooks: reusable guides for the next project

What this project set up and learned, written so another project can repeat it in order. Each guide marks every item
**done** or **open** for this project (state on 21 Nov 2026) and ends with a "Next project: setup in order" list.

| Guide | What it covers |
|---|---|
| [`github.md`](github.md) | Repo settings (public repo, squash, auto-merge, auto-delete head branches, rulesets, `production` environment, Secret Protection + push protection, Dependabot, CodeQL), the CI/CD pipeline, many AI sessions on one repo, secrets |
| [`cloudflare.md`](cloudflare.md) | Account and API tokens, Workers + Durable Objects rules that are security, edge security (headers, CSP, WAF, own domain), secrets, free limits and usage alerts, monitoring, rollback, breach steps |
| [`security-privacy.md`](security-privacy.md) | App security invariants, the browser extension and store review, privacy (KVKK / GDPR, retention), review cadence, breach plan, password manager + 2FA, supply chain |
| [`ai-team.md`](ai-team.md) | Running many Claude Code sessions as a team: roles and the Planner hub, the files every project needs, cards, session lifecycle and handoff, talking to the owner, usage limits, lessons learned |

Start a new project with `ai-team.md` §8, then `github.md` §5, `cloudflare.md` §7 and `security-privacy.md`'s last list.
The open items of this project are tracked in `../STATUS.md` (owner's to-dos) and `../OPTIMIZATION.md`.
