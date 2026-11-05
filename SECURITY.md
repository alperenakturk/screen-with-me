# Security policy

Sidelit is a free, account-free tool for watching videos together. It has a website, a browser extension and a
Cloudflare server. This page explains how to report a security or privacy problem in any of them.

## Reporting a problem

Report it privately, in one of two ways:

- GitHub's private vulnerability reporting:
  [Report a vulnerability](https://github.com/alperenakturk/screen-with-me/security/advisories/new) (only you and the
  maintainer see it);
- or e-mail **screenwithme.app@gmail.com** with the subject "Security".

Please include:

- what you found and where (site page, extension, server endpoint);
- the steps to see it, and the browser and version you used;
- what someone could do with it.

Please do not open a public issue for a security problem, and do not test against other people's rooms. Use rooms
you created yourself.

If personal data may have been exposed, we follow our [data breach plan](docs/internal/breach-plan.md).

We aim to answer within 7 days and to fix confirmed problems as soon as we can. When a fix ships, we will say so in
the release notes (and credit you if you want).

## Abuse in a room, illegal content, copyright

Not a security problem? Content or behaviour in a room (harassment, illegal content, a copyright notice) is handled as
described in the [terms of use](https://screen-with-me.swm-server.workers.dev/terms.html#abuse): e-mail
**screenwithme.app@gmail.com** with the subject "Report". We act within 72 hours.

## Supported versions

Only the live site (https://screen-with-me.swm-server.workers.dev) and the latest extension version get fixes.

## Scope

In scope: the website, the server's API and WebSocket endpoints, the browser extension.

Out of scope: third-party services we embed or link to (YouTube, Vimeo, TikTok, Apple Podcasts, Cloudflare itself),
denial of service by sheer volume, and reports that need a compromised device or browser.
