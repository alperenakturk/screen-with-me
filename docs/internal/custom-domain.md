# Moving to an own domain (card R3-3)

Today the site, the API and the extension's room overlay all live on `https://screen-with-me.swm-server.workers.dev`.
This page prepares the day the owner buys a domain. Two things are already true:

- **The address is one value.** It lives in `site.config.json` at the repo root.
- **The check fails if anything else hardcodes it.** `scripts/check-domain.mjs` runs in CI.

The owner picks the domain later. `example.app` below stands for it.

## 1. What is already in place

| Piece | Where | What it does with the address |
|---|---|---|
| `site.config.json` | repo root | `origin` = the main address, `aliases` = other addresses of the same Worker (today: none) |
| `scripts/site-config.mjs` | scripts | reads and checks the file. `node scripts/site-config.mjs origin\|ws\|aliases` prints one value for CI. `SWM_SITE_CONFIG` points at another file (harness only) |
| Extension build | `apps/extension/build.mjs`, `src/config.ts` | `SITE_URL` (the overlay opens `origin/r/<room>?shell=1`) and `homepage_url`. `SITE_ORIGINS` / `isSiteOrigin` / `sitePatterns` treat every address as "our site": the site bridge runs on all of them, the film-page scripts skip all of them, and the background's `site-go`, `navigate` and "back on our site" checks plus the popup accept all of them |
| Site build | `apps/web/vite.config.ts` | `%SITE_ORIGIN%` in `index.html` (`og:image`, what WhatsApp shows for an invite); `__SITE__` in the code (`src/site.ts`); `/domain.js`, written for the static pages |
| Alias → main | `src/main.ts` → `src/domain-move.ts` (lazy chunk) | see §3 |
| Static pages | `extension.html`, `help.html`, `privacy.html`, `terms.html`, `thanks.html` load `/domain.js` first | an alias visit moves to the same page on the main address (no saves carried; see §3) |
| CI | `.github/workflows/test.yml` | `check-domain.mjs` in the check job. The deploy's `wait-live`, live e2e and `check-domain.mjs --live` all read the address |
| Monitor | `monitor.yml`, `scripts/monitor.mjs` | checks the config's main address |
| Harness | `scripts/harness/domain-move/run.cjs` | builds the site with a two-address test config (`localhost` main, `127.0.0.1` alias) and checks everything in §3 |

**Already domain-agnostic, nothing to change:**

- The CSP (`'self'` in `_headers`).
- The Worker's own-origin checks (`allowedOrigin` / `guardSocket` / feedback / lab check compare against the request's own origin).
- Invite links, QR codes, the TV and move-device links, the connection test (all `location.origin`).
- Rooms: one Durable Object per room id. Both addresses reach the same rooms.

## 2. The switch, step by step

### Owner, before anything (only the owner can do these)

1. **Buy the domain on Cloudflare Registrar**, in the same Cloudflare account as the Worker.
   - A custom domain needs the zone on Cloudflare. Registrar puts it there with no nameserver step, at cost price.
   - Another registrar works too: add the site to Cloudflare and change the nameservers to the two Cloudflare gives.
   - KeePass: `Cloudflare – <domain> registrar` (the account is the existing Cloudflare login; note the renewal date).
2. **Tell the Planner the domain.** A Developer card does steps 3–6.

### Step A: the new domain serves the site but still points to the old address (one PR, a normal release)

3. `apps/server/wrangler.jsonc`: add the routes and keep `workers.dev` on:

   ```jsonc
   "routes": [
     { "pattern": "example.app", "custom_domain": true },
     { "pattern": "www.example.app", "custom_domain": true }
   ],
   ```

   Cloudflare creates the DNS records and the certificate. `workers_dev` must not become `false`: it keeps the old links alive.
4. `site.config.json`: keep `origin` as is and set `"aliases": ["https://example.app", "https://www.example.app"]`.
   - This release's **extension** knows the new domain as our site.
   - The new domain moves visitors to the old address for now.
5. Release (version bump, PR, deploy). `check-domain.mjs --live` in the deploy checks that both addresses answer and that the new one's `/domain.js` names the old one.

### Wait until the extension with the alias has reached people

- **Unpacked installs:** reinstall from the extension page.
- **Store:** one approved review.
- **Why the wait matters.** An older extension only treats the old address as our site. On the new address its "Go to the film" bridge is missing, and the room would say the extension isn't installed.
- **Best order:** do step A before the store submission, so the store's first version already knows both addresses.

### Step B: the switch itself (one PR)

6. `site.config.json`:

   ```json
   { "origin": "https://example.app", "aliases": ["https://screen-with-me.swm-server.workers.dev", "https://www.example.app"] }
   ```

   Then release.
   - Old links now move to the new address and carry the browser's saves once (§3).
   - The new extension opens rooms on the new address.
   - `og:image`, the monitor, the live e2e and the deploy checks follow by themselves.
   - **Rollback** = swap `origin` and the alias back and release.
7. **By hand, the same day** (Developer, in the switch PR or right after it):
   - `README.md` + `README.tr.md` links; CLAUDE.md "Live" line and the address at the top.
   - `store/src/shots.html` (`SITE_URL` text in the screenshots), then `npm run store`.
   - `docs/internal/web-store.md`, `store-checklist.md`, `youtube-audit.md`: homepage, support, privacy and terms URLs.
   - `apps/web/public/*.html`: the contact e-mail once §4 is done.

## 3. What happens to people's saves

`localStorage` belongs to one address, so a browser's saves stay on the old address unless something carries them. The pieces:

- **Room pages and the home page** (`main.ts` → `domain-move.ts`). On an alias, outside the film page's overlay:
  - The page packs the saves into the fragment `#handoff=…`. A fragment is never sent to a server and never logged.
  - What it packs: the "Move to another device" keys, plus every other setting up to 20 kB each and 300 kB in all.
  - It then calls `location.replace` to the same path on the main address.
- **On the main address,** before the site starts:
  - It accepts the handoff only when all three hold: `document.referrer` is an alias, the handoff was packed less than two minutes ago, and it is at most ≈ 1.2 MB. A crafted or saved link writes nothing.
  - The fragment is read and replaced (`history.replaceState`, the same history entry) before anything else of the site runs, so no log, report or server ever sees it.
  - Nothing new for the privacy policy: the saves stay in the browser and move between two addresses of the same site.
  - Move keys merge like "Move to another device": games keep the save that got further, saved rooms and the emoji collection are joined, and the name / avatar fill only empty ones.
  - Every other key only fills what is empty.
  - The page's own fragment (`#back`, `#move=…`, `#theme`) is put back, so the address bar never keeps the saves.
- **Once per browser.** The alias marks itself (`swm-handed-off`); later visits there only redirect.
- **The film page's overlay never redirects.** An extension built for the old address keeps working there until it updates; the Worker serves both addresses.
- **Static pages** (help, privacy…) move without carrying anything. The saves go along on the person's next room or home visit through an old link. If they only ever use new links, "📲 Move to another device" works between two tabs of the same browser.
- **Extension users** get their name, language and theme from the extension's own store anyway (`syncStore`, newest wins).
- **An installed PWA** keeps its old start address; opening it moves to the new address in the browser. People reinstall from the new domain (one line in the release note).

## 4. E-mail: support@

- **Receiving:** Cloudflare **Email Routing** (free, same dashboard). Forward these to the owner's inbox (today `screenwithme.app@gmail.com`):
  - `support@example.app` (help, store contact);
  - `privacy@example.app` (the privacy policy's contact, KVKK / GDPR requests);
  - `abuse@example.app` (reports).

  Cloudflare adds the MX and SPF records itself.
- **Sending as support@ (owner's call, not needed on day one).** Gmail's "Send mail as" needs an SMTP server for a custom address. Options:
  - **A.** Keep replying from the Gmail address (zero cost). **Recommended until there is real traffic.**
  - **B.** A free sending tier of a mail provider, added as SMTP in Gmail. Needs DKIM records.
- **Then change** the contact address in `privacy.html`, `terms.html`, `help.html` (EN + TR) and `SECURITY.md`, plus the store forms below.
- **KeePass:** `Cloudflare – Email Routing (<domain>)`. Holds no password, just a note of which addresses forward where.

## 5. Forms outside the repo to update (owner, after step B)

| Where | Field | New value |
|---|---|---|
| Chrome Web Store dashboard | Homepage URL, Support URL, Privacy policy URL | `https://example.app/`, `/help.html`, `/privacy.html` |
| Chrome Web Store | **Official URL** | verify the domain in **Google Search Console** first (a DNS TXT record in Cloudflare), then pick it |
| Chrome Web Store | Developer contact e-mail | `support@example.app` once it forwards (verify link) |
| Edge Partner Center | Website, Support, Privacy policy | as above |
| YouTube API Services form (`youtube-audit.md`) | App / website URL, privacy policy URL, terms URL, contact | the new addresses (send it after step B, or update it) |
| Google Cloud console | the YouTube API key's restrictions | The key is only used by the Worker; if it has HTTP referrer restrictions, add the new domain (normally it has none) |
| GitHub repo | "Website" field | the new address |

## 6. The check script

- **CI** runs `node scripts/check-domain.mjs` (fast, no network). It checks:
  - the config is valid (https origins with no path; no alias equal to the origin; no duplicates);
  - no code, public page or workflow writes the address (`apps/web/src`, `apps/web/public`, `index.html`, the extension's code and build, the server, `packages/shared`, the workflows, `monitor.mjs`; tests and docs may name it);
  - every non-workers.dev address has a `custom_domain` route in `wrangler.jsonc`, and `workers_dev` isn't switched off while an address is on workers.dev;
  - if built, the page's `og:image` and `/domain.js` follow the config;
  - if built, the extension's `homepage_url` and its site matches / excludes follow the config.
- **The deploy** runs `node scripts/check-domain.mjs --live` after the live e2e. It checks that every address answers `/api/version` from the Worker and serves `/domain.js` naming the main address, and that the live page's `og:image` is on the main address.
