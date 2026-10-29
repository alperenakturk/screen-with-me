# Phone apps: the path to the App Store and Google Play

Owner's wish (29 Oct 2026): build the phone version so that later work is easy and an Apple release goes smoothly.
This page says what is ready, what a store app needs and in which order. Nothing here is decided: money (developer
accounts), the final name and the domain are the owner's calls (ROADMAP §4, §6, §7).

## Where we are (0.9.91.2)
- **The site is the app.** It works on a phone in the browser and can be added to the home screen (PWA:
  `public/manifest.webmanifest`, `public/sw.js`; the service worker never caches code).
- **One place for phone styles:** `apps/web/src/phone.css` (loaded after `styles.css`). The desktop layout stays in
  `styles.css`.
- **One place for device facts:** `apps/web/src/device.ts`. It answers:
  - `isTouch`, `isIOS`, `isStandalone`, `isApp`, `canElementFullscreen`, `canShareSheet`;
  - turning the phone (`lockLandscape`, `unlockOrientation`, `onTurn`);
  - it also marks `<html>` with `is-touch`, `is-ios`, `is-standalone`, `is-app`.

  A store app or a TV version changes the answers here, not all over the code.
- **Already shaped for a native shell:**
  - safe areas (`viewport-fit=cover` + `env(safe-area-inset-*)`);
  - our own fullscreen where page elements can't go fullscreen (`.pseudo-fs`, like inside an iOS web view);
  - no third-party code;
  - the share sheet for invites;
  - 16 px inputs (no zoom).

## Google Play (easiest first)
- **How:** a Trusted Web Activity (TWA) wraps the PWA as it is, built with Bubblewrap. It is Chrome without its bar,
  so everything that works in Chrome works.
- **Needs:**
  - our own domain, because Digital Asset Links (`/.well-known/assetlinks.json`) must live on it, and workers.dev is
    not ours;
  - the final name and icon;
  - a Play developer account (one-time fee);
  - a privacy policy URL (we have one).
- **Risk:** low. Play accepts TWAs of real web apps.

## App Store (more work)
- **How:** a native shell around the site with a WKWebView (Capacitor is MIT and fits). Two ways to load the page:
  - point the shell at the live site, so there is one codebase and updates never need a new app build;
  - or ship the files inside the app, which then needs absolute API / WebSocket addresses.

  `isApp()` in `device.ts` turns on app-only behaviour.
- **Apple guideline 4.2 "minimum functionality":** a website in a box is rejected. Rooms, voice, cameras, games and
  sync are real app features. Worth adding natively:
  - push notifications for invites and "film time" (needs a small push service on the Worker);
  - universal links (`/r/ROOM` opens the app);
  - keeping the screen awake while watching;
  - the native share sheet.
- **Guideline 1.2 (user-generated content).** Chat, images and custom emojis count as user content. Apple requires
  three things:
  - a way to **report** content;
  - a way to **block** a user;
  - a contact address.

  We have kick / ban by the host only. A "report" and a "hide this person for me" option are needed before
  submitting (they help on the web too).
- **Privacy:**
  - the App Store privacy labels (we collect very little: see the privacy policy);
  - microphone and camera usage texts (`NSMicrophoneUsageDescription`, `NSCameraUsageDescription`).
  - No tracking, no login, so no "Sign in with Apple".
- **What works inside an iOS web view:**
  - WebRTC voice / camera (iOS 14.3+; the shell must allow inline media and microphone access);
  - YouTube's official player (`playsinline`);
  - our pseudo fullscreen.

  Voice that keeps going with the screen locked needs the "audio" background mode.
- **Not in the app:** film pages. They need the browser extension on a computer. The app should say so, as the site
  does on phones.
- **Needs:**
  - the Apple Developer Program (yearly fee);
  - a Mac or a cloud build service for the build;
  - the final name, icon and domain.
- **Risk:** medium. Review is strict about guidelines 4.2 and 1.2 above.

## Suggested order (after 1.0's name and domain)
1. Polish the PWA (already the base of both apps).
2. Google Play TWA (small step, same code).
3. Report / block in the room (needed for the App Store, useful everywhere).
4. App Store shell (Capacitor) + push notifications + universal links.

## Rules for new code meanwhile
- Ask `device.ts` instead of reading `navigator.userAgent` or media queries in feature code.
- Phone-only styles go to `phone.css`.
- Never depend on element fullscreen, hover or a keyboard key for something important. Every key action needs a
  button (push-to-talk is hidden on touch screens).
- Keep the site free of third-party scripts. A store review and the CSP both stay simple that way.
