// TV test (/tv-test): open the site in a TV browser (Google TV with TV Bro, Fire TV Silk, a TV's own browser) and see
// what works there before the TV room is used: the room's live connection, the YouTube player, hearing voice
// (WebRTC audio, tried locally between two connections in this page), a microphone, sound, fullscreen, and which keys
// the remote sends. Nothing is stored or sent anywhere; the result is on screen (take a photo) or copied.

import { PROTOCOL_VERSION } from '@swm/shared/protocol';
import { newRoomId } from '@swm/shared/room-id';
import { el } from './dom.ts';
import { t } from './i18n.ts';
import { loadYouTubeApi } from './players/youtube.ts';

type State = boolean | null | 'warn';

interface Row {
  label: string;
  ok: State;
  detail: string;
}

const TIMEOUT_MS = 12_000;
/** A short, freely licensed video that is embeddable everywhere. */
const TEST_VIDEO = 'aqz-KE-bpKQ';

export function renderTvTest(app: HTMLElement): void {
  document.documentElement.classList.add('tv-test-page');
  const list = el('ul', { class: 'tvt-list' });
  const keys = el('div', { class: 'tvt-keys', 'aria-live': 'polite' }, t('tvtest.keysIdle'));
  const ytBox = el('div', { class: 'tvt-yt' });
  const micBtn = el('button', { type: 'button', class: 'btn tvt-btn' }, `🎙 ${t('tvtest.tryMic')}`);
  const soundBtn = el('button', { type: 'button', class: 'btn tvt-btn' }, `🔊 ${t('tvtest.trySound')}`);
  const fsBtn = el('button', { type: 'button', class: 'btn tvt-btn' }, `⛶ ${t('tvtest.tryFs')}`);
  const copyBtn = el('button', { type: 'button', class: 'btn tvt-btn' }, t('diag.copy'));
  app.replaceChildren(
    el(
      'section',
      { class: 'tvt' },
      el('h1', {}, `📺 ${t('tvtest.title')}`),
      el('p', { class: 'muted' }, t('tvtest.intro')),
      el('div', { class: 'tvt-grid' }, list, el('div', { class: 'tvt-side' }, ytBox, el('h2', {}, t('tvtest.keysTitle')), keys)),
      el('div', { class: 'tvt-actions' }, micBtn, soundBtn, fsBtn, copyBtn),
      el('p', { class: 'muted tvt-foot' }, t('tvtest.photo')),
    ),
  );

  const rows: Row[] = [];
  const icon = (state: State) => (state === null ? '⏳' : state === 'warn' ? '⚠️' : state ? '✅' : '❌');
  const draw = () =>
    list.replaceChildren(
      ...rows.map((row) => el('li', { class: 'tvt-row' }, el('span', { class: 'tvt-icon' }, icon(row.ok)), el('b', {}, row.label), el('span', { class: 'muted' }, row.detail))),
    );
  const add = (label: string): Row => {
    const row: Row = { label, ok: null, detail: '' };
    rows.push(row);
    draw();
    return row;
  };
  const done = (row: Row, ok: State, detail: string) => {
    row.ok = ok;
    row.detail = detail;
    draw();
  };

  done(add(t('tvtest.browser')), true, `${screen.width}×${screen.height} · ×${devicePixelRatio} · ${navigator.userAgent}`);
  const ws = add(t('tvtest.ws'));
  const yt = add(t('tvtest.youtube'));
  const files = add(t('tvtest.files'));
  const rtc = add(t('tvtest.rtc'));
  const mic = add(t('tvtest.mic'));
  const sound = add(t('tvtest.sound'));
  const fs = add(t('tvtest.fs'));

  // Room connection: open, welcome.
  void (async () => {
    const start = performance.now();
    const socket = new WebSocket(`${location.origin.replace(/^http/, 'ws')}/api/rooms/tvtest${newRoomId().slice(0, 6)}/ws`);
    const timer = setTimeout(() => {
      if (ws.ok === null) done(ws, false, t('diag.timeout', { s: TIMEOUT_MS / 1000 }));
      socket.close();
    }, TIMEOUT_MS);
    socket.addEventListener('open', () => socket.send(JSON.stringify({ t: 'hello', v: PROTOCOL_VERSION, name: 'TV test' })));
    socket.addEventListener('message', (event) => {
      if ((JSON.parse(String(event.data)) as { t: string }).t !== 'welcome') return;
      done(ws, true, `${Math.round(performance.now() - start)} ms`);
      clearTimeout(timer);
      socket.close();
    });
    socket.addEventListener('close', (event) => {
      if (ws.ok === null) done(ws, false, `${t('diag.closed')} (${event.code})`);
    });
  })();

  // YouTube: does the official player load and start playing (muted, so autoplay is allowed)?
  void (async () => {
    const timer = setTimeout(() => yt.ok === null && done(yt, false, t('diag.timeout', { s: 20 })), 20_000);
    try {
      await loadYouTubeApi();
      const host = el('div');
      ytBox.append(host);
      new YT.Player(host, {
        videoId: TEST_VIDEO,
        width: '100%',
        height: '100%',
        playerVars: { playsinline: 1, rel: 0, controls: 1, mute: 1, autoplay: 1 },
        events: {
          onReady: (event) => {
            event.target.mute();
            event.target.playVideo();
          },
          onStateChange: (event) => {
            if (event.data === YT.PlayerState.PLAYING && yt.ok === null) {
              clearTimeout(timer);
              done(yt, true, t('tvtest.playing'));
            }
          },
          onError: (event) => {
            clearTimeout(timer);
            done(yt, false, `${t('tvtest.error')} ${event.data}`);
          },
        },
      });
    } catch {
      clearTimeout(timer);
      done(yt, false, t('tvtest.noApi'));
    }
  })();

  // Video files: which formats the browser says it can play.
  const video = document.createElement('video');
  const formats = (
    [
      ['MP4', 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"'],
      ['WebM', 'video/webm; codecs="vp9, opus"'],
      ['HLS', 'application/vnd.apple.mpegurl'],
    ] as const
  ).filter(([, type]) => video.canPlayType(type) !== '');
  done(files, formats.length ? true : false, formats.map(([name]) => name).join(' · ') || '—');

  // Hearing voice: two connections inside this page send a tone to each other. Received bytes = voice can be heard.
  void (async () => {
    if (typeof RTCPeerConnection !== 'function') return done(rtc, false, t('tvtest.noRtc'));
    let ctx: AudioContext | null = null;
    const a = new RTCPeerConnection();
    const b = new RTCPeerConnection();
    try {
      ctx = new AudioContext();
      const tone = ctx.createOscillator();
      const dest = ctx.createMediaStreamDestination();
      tone.connect(dest);
      tone.start();
      a.onicecandidate = (event) => event.candidate && void b.addIceCandidate(event.candidate).catch(() => {});
      b.onicecandidate = (event) => event.candidate && void a.addIceCandidate(event.candidate).catch(() => {});
      for (const track of dest.stream.getAudioTracks()) a.addTrack(track, dest.stream);
      await a.setLocalDescription(await a.createOffer());
      await b.setRemoteDescription(a.localDescription!);
      await b.setLocalDescription(await b.createAnswer());
      await a.setRemoteDescription(b.localDescription!);
      const until = performance.now() + TIMEOUT_MS;
      let bytes = 0;
      while (performance.now() < until && bytes === 0) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        (await b.getStats()).forEach((report: { type: string; kind?: string; bytesReceived?: number }) => {
          if (report.type === 'inbound-rtp' && report.kind === 'audio') bytes = report.bytesReceived ?? 0;
        });
      }
      done(rtc, bytes > 0, bytes > 0 ? t('tvtest.rtcOk') : t('tvtest.rtcNoData'));
    } catch (error) {
      done(rtc, false, String((error as Error).message || error));
    } finally {
      a.close();
      b.close();
      void ctx?.close();
    }
  })();

  // Microphone: is there one at all (count only; names need permission), and can a page use it (button).
  void (async () => {
    if (!navigator.mediaDevices?.getUserMedia) return done(mic, false, t('tvtest.noMicApi'));
    const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
    const count = devices.filter((d) => d.kind === 'audioinput').length;
    done(mic, count ? 'warn' : false, count ? t('tvtest.micFound', { n: count }) : t('tvtest.micNone'));
  })();
  micBtn.addEventListener('click', async () => {
    done(mic, null, '…');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const label = stream.getAudioTracks()[0]?.label ?? '';
      for (const track of stream.getTracks()) track.stop();
      done(mic, true, `${t('tvtest.micOk')} ${label}`);
    } catch (error) {
      done(mic, false, `${t('tvtest.micDenied')} (${(error as Error).name})`);
    }
  });

  // Sound: a short tone after a press (browsers only allow sound after the person pressed something).
  done(sound, 'warn', t('tvtest.soundHint'));
  soundBtn.addEventListener('click', () => {
    try {
      const ctx = new AudioContext();
      const tone = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.15;
      tone.frequency.value = 660;
      tone.connect(gain).connect(ctx.destination);
      tone.start();
      tone.stop(ctx.currentTime + 0.4);
      done(sound, ctx.state === 'running' ? true : 'warn', `${t('tvtest.soundPlayed')} (${ctx.state})`);
    } catch (error) {
      done(sound, false, String((error as Error).message || error));
    }
  });

  // Fullscreen.
  done(fs, document.fullscreenEnabled ? 'warn' : false, document.fullscreenEnabled ? t('tvtest.fsHint') : t('tvtest.fsNo'));
  fsBtn.addEventListener('click', () => {
    const request = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.();
    void Promise.resolve(request)
      .then(() => done(fs, true, t('tvtest.fsOk')))
      .catch((error: Error) => done(fs, false, error.name));
  });

  // Remote keys: show what each press reaches the page as. Back is caught with a history entry, so it doesn't leave.
  const seen: string[] = [];
  const showKey = (text: string) => {
    seen.unshift(text);
    seen.length = Math.min(seen.length, 6);
    keys.replaceChildren(...seen.map((line, i) => el('div', { class: i === 0 ? 'tvt-key new' : 'tvt-key' }, line)));
  };
  addEventListener('keydown', (event) => {
    showKey(`${event.key || '?'} · ${event.code || '?'} · ${event.keyCode}`);
    // Arrow keys move between the buttons (some TV browsers have no focus movement of their own).
    const focusables = [...document.querySelectorAll<HTMLElement>('.tvt-btn')];
    const index = focusables.indexOf(document.activeElement as HTMLElement);
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      focusables[(index + 1) % focusables.length]?.focus();
      event.preventDefault();
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      focusables[(index - 1 + focusables.length) % focusables.length]?.focus();
      event.preventDefault();
    }
  });
  history.pushState({ tvTest: true }, '');
  addEventListener('popstate', () => {
    showKey(`${t('tvtest.back')} (popstate)`);
    history.pushState({ tvTest: true }, '');
  });
  micBtn.focus();

  copyBtn.addEventListener('click', () => {
    const summary = [`ScreenWithMe ${t('tvtest.title')} · ${new Date().toISOString()}`, ...rows.map((row) => `${icon(row.ok)} ${row.label}: ${row.detail}`), `keys: ${seen.join(' | ')}`].join('\n');
    void navigator.clipboard?.writeText(summary).then(() => (copyBtn.textContent = t('copied')), () => {});
  });
}
