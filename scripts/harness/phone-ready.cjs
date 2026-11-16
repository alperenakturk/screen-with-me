// Card BUD2: the phone room is a lazy chunk, so `.room` can show a moment before the phone layout takes over. On a
// phone-sized page, wait until the phone room (or its Shorts view) is on before looking at what is visible.
const PHONE_QUERY = '(max-width: 700px), (pointer: coarse) and (max-height: 500px)';

async function phoneReady(page, timeout = 10000) {
  await page.waitForFunction(
    (q) => {
      const html = document.documentElement;
      return !matchMedia(q).matches || html.classList.contains('tv-mode') || html.classList.contains('ph-room') || html.classList.contains('ph-shorts');
    },
    PHONE_QUERY,
    { timeout },
  );
}

module.exports = { phoneReady };
