/**
 * The cloud's network blocks youtube-nocookie.com, the player's privacy-enhanced host since 0.9.93.14 (card 6a): test
 * browsers fetch the same embed from www.youtube.com instead. Real browsers use the no-cookie host.
 */
exports.viaYouTube = (ctx) =>
  ctx.route('https://www.youtube-nocookie.com/**', (route) => route.continue({ url: route.request().url().replace('://www.youtube-nocookie.com/', '://www.youtube.com/') }));
