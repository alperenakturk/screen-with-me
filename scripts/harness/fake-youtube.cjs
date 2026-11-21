/**
 * Card CI4: a stand-in for YouTube's player in test browsers, so a required CI step never waits on YouTube's servers
 * (a real Short took up to 15 s to load on a busy runner and failed many first attempts). It serves its own
 * `https://www.youtube.com/iframe_api` (same address, so the site's CSP and loader don't change) with a small `YT.Player`
 * that keeps time like the real one (UNSTARTED → BUFFERING → PLAYING, PAUSED, ENDED, CUED, rate, volume, seek), and
 * answers the embed pages with a plain black page. Real-YouTube behaviour stays covered by the non-required
 * `games-youtube` / `yt-*` steps and by the owner's hand tests.
 *
 *   const { fakeYouTube } = require('../fake-youtube.cjs');
 *   await fakeYouTube(ctx);                 // every page in this context gets the stand-in
 *   await fakeYouTube(ctx, { duration: 30 }); // seconds each video lasts (default 60)
 */
const PLAYER = (duration) => `(() => {
  const S = { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 };
  const DURATION = ${Number(duration) || 60};
  class Player {
    constructor(host, opts = {}) {
      const el = typeof host === 'string' ? document.getElementById(host) : host;
      const frame = document.createElement('iframe');
      frame.src = (opts.host || 'https://www.youtube.com') + '/embed/' + encodeURIComponent(opts.videoId || '') + '?swmFake=1';
      frame.title = 'YouTube video player';
      frame.width = '100%';
      frame.height = '100%';
      frame.setAttribute('allow', 'autoplay');
      if (el.id) frame.id = el.id;
      el.replaceWith(frame);
      this._frame = frame;
      this._events = opts.events || {};
      this._state = S.UNSTARTED;
      this._time = 0;
      this._at = performance.now();
      this._rate = 1;
      this._volume = 100;
      this._muted = false;
      this._video = opts.videoId || '';
      this._timer = setInterval(() => {
        if (this._state === S.PLAYING && this._now() >= DURATION) this._set(S.ENDED, DURATION);
      }, 200);
      setTimeout(() => this._events.onReady && this._events.onReady({ target: this }), 30);
      if (opts.playerVars && opts.playerVars.autoplay) setTimeout(() => this.playVideo(), 40);
    }
    _now() {
      return this._state === S.PLAYING ? Math.min(DURATION, this._time + ((performance.now() - this._at) / 1000) * this._rate) : this._time;
    }
    _set(state, time) {
      this._time = time === undefined ? this._now() : time;
      this._at = performance.now();
      if (this._state === state) return;
      this._state = state;
      setTimeout(() => this._events.onStateChange && this._events.onStateChange({ target: this, data: state }), 0);
    }
    playVideo() {
      if (this._state === S.PLAYING) return;
      if (this._now() >= DURATION) this._time = 0;
      this._set(S.BUFFERING);
      setTimeout(() => this._state === S.BUFFERING && this._set(S.PLAYING), 80);
    }
    pauseVideo() { if (this._state !== S.ENDED) this._set(S.PAUSED); }
    stopVideo() { this._set(S.CUED, 0); }
    seekTo(seconds) {
      const to = Math.max(0, Math.min(DURATION, Number(seconds) || 0));
      this._time = to;
      this._at = performance.now();
      if (this._state === S.ENDED && to < DURATION) this._set(S.PAUSED, to);
    }
    loadVideoById(id, start) {
      this._video = typeof id === 'object' ? id.videoId : id;
      this._set(S.UNSTARTED, Number(start) || 0);
      this.playVideo();
    }
    cueVideoById(id, start) {
      this._video = typeof id === 'object' ? id.videoId : id;
      this._set(S.CUED, Number(start) || 0);
    }
    getCurrentTime() { return this._now(); }
    getDuration() { return DURATION; }
    getPlayerState() { return this._state; }
    getPlaybackRate() { return this._rate; }
    setPlaybackRate(rate) { this._time = this._now(); this._at = performance.now(); this._rate = Number(rate) || 1; }
    getAvailablePlaybackRates() { return [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]; }
    getVideoLoadedFraction() { return 1; }
    getVolume() { return this._volume; }
    setVolume(v) { this._volume = Math.max(0, Math.min(100, Number(v) || 0)); }
    isMuted() { return this._muted; }
    mute() { this._muted = true; }
    unMute() { this._muted = false; }
    getVideoData() { return { video_id: this._video, title: 'Test video ' + this._video, author: 'Test channel' }; }
    getVideoUrl() { return 'https://www.youtube.com/watch?v=' + this._video; }
    getIframe() { return this._frame; }
    addEventListener(name, fn) { this._events[name] = fn; }
    removeEventListener(name) { delete this._events[name]; }
    destroy() { clearInterval(this._timer); this._frame.remove(); }
  }
  window.YT = { Player, PlayerState: S, loaded: 1, ready: (fn) => fn() };
  setTimeout(() => typeof window.onYouTubeIframeAPIReady === 'function' && window.onYouTubeIframeAPIReady(), 0);
})();`;

const EMBED = '<!doctype html><meta charset="utf-8"><title>YouTube</title><body style="margin:0;background:#000"></body>';

exports.fakeYouTube = async (ctx, { duration = 60 } = {}) => {
  await ctx.route('https://www.youtube.com/iframe_api*', (route) => route.fulfill({ contentType: 'text/javascript', body: PLAYER(duration) }));
  for (const host of ['https://www.youtube.com/embed/**', 'https://www.youtube-nocookie.com/embed/**']) {
    await ctx.route(host, (route) => route.fulfill({ contentType: 'text/html', body: EMBED }));
  }
  // Thumbnails and YouTube's other assets: an empty answer at once instead of a slow or blocked request.
  await ctx.route(/^https:\/\/(i\.ytimg\.com|www\.youtube\.com\/(s|generate_204|youtubei))\b/, (route) => route.fulfill({ status: 204, body: '' }));
};
