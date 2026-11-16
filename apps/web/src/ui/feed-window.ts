// Card SH2: the ♾ Shorts / ▶ video feed window, one screen (a lazy chunk with its own texts and styles, for the room
// page's size budget). On top: the running feed with Pause / Resume and Stop, and four plain ways to steer it, each
// with one line saying what it does; a steer changes the next videos without a restart. Below: start a feed.
import './feed-window.css';
import type { ChannelOrder, FeedKind, FeedSource } from '@swm/shared/feed';
import { isFeedRegion } from '@swm/shared/feed';
import { parseMediaInput } from '@swm/shared/media';
import type { QueueItem } from '@swm/shared/protocol';
import { channelParam, parseChannelInput, POOL_KINDS, POOL_REGIONS, type PoolRegionChoice, isPoolRegionChoice } from '@swm/shared/youtube-search';
import { el } from '../dom.ts';
import { lang, t } from '../i18n.ts';
import type { RoomFeed } from './shorts-feed.ts';
import { ytLogo } from './yt-logo.ts';

export const loaded = true;

const TEXT = {
  en: {
    shorts: '♾ Shorts feed',
    videos: '▶ Video feed',
    kinds: 'Which feed',
    now: 'On now: {label}',
    paused: 'Paused: {label}',
    pause: '⏸ Pause',
    resume: '▶ Resume',
    stop: 'Stop',
    steer: 'Steer it',
    steerNote: 'The queue’s next videos follow your choice; nothing restarts.',
    channel: '📺 Continue from this channel',
    channelText: 'More from the channel of the video playing now.',
    channelLabel: '📺 This channel',
    country: '🌍 Same topic, other country',
    countryText: 'The same feed as people in another country see it.',
    countryNone: 'Works for a topic or Discover / Popular feed.',
    like: '✨ More like this one',
    likeText: 'Like the video playing now: its channel first, then similar titles.',
    likeLabel: '✨ Like this one',
    topic: '🔤 Change the topic',
    topicText: 'New words; the next videos are about them.',
    go: 'Go',
    noVideo: 'A YouTube video has to be playing first.',
    start: 'Start a feed',
    startOther: 'Or start a new one',
    discoverShorts: '🎲 Discover: the most watched Shorts now',
    discoverVideos: '🔥 Popular now on YouTube',
    country2: 'Country',
    regionAuto: 'My country',
    regionWorld: 'World',
    input: 'Words, a video link or a channel’s link / @handle',
    inputHint: 'Words follow a topic; a video link brings videos like it; a channel brings that channel.',
    placeholderShorts: 'e.g. cats, or @channel',
    placeholderVideos: 'e.g. cooking, a video link, or @channel',
    order: 'From a channel',
    newest: 'Newest',
    random: 'Random',
    popular: 'Most viewed',
    startBtn: 'Start',
    switchNote: 'Starting this stops the {other}.',
    close: 'Close',
  },
  tr: {
    shorts: '♾ Shorts akışı',
    videos: '▶ Video akışı',
    kinds: 'Hangi akış',
    now: 'Şu an açık: {label}',
    paused: 'Duraklatıldı: {label}',
    pause: '⏸ Duraklat',
    resume: '▶ Sürdür',
    stop: 'Durdur',
    steer: 'Yönlendir',
    steerNote: 'Sıradaki videolar seçtiğine göre gelir; hiçbir şey baştan başlamaz.',
    channel: '📺 Bu kanaldan devam',
    channelText: 'Şu an oynayan videonun kanalından daha fazlası.',
    channelLabel: '📺 Bu kanal',
    country: '🌍 Aynı konu, başka ülke',
    countryText: 'Aynı akış, başka bir ülkedeki insanların gördüğü gibi.',
    countryNone: 'Bir konu ya da Keşfet / Popüler akışında çalışır.',
    like: '✨ Buna benzer',
    likeText: 'Şu an oynayana benzer: önce kanalı, sonra benzer başlıklar.',
    likeLabel: '✨ Buna benzer',
    topic: '🔤 Konuyu değiştir',
    topicText: 'Yeni kelimeler; sıradaki videolar onlarla ilgili olur.',
    go: 'Git',
    noVideo: 'Önce bir YouTube videosu oynamalı.',
    start: 'Akış başlat',
    startOther: 'Ya da yenisini başlat',
    discoverShorts: '🎲 Keşfet: şu an en çok izlenen Shorts',
    discoverVideos: '🔥 YouTube’da şu an popüler',
    country2: 'Ülke',
    regionAuto: 'Benim ülkem',
    regionWorld: 'Dünya',
    input: 'Kelimeler, bir video linki ya da kanal linki / @adı',
    inputHint: 'Kelimeler bir konuyu izler; video linki ona benzerleri getirir; kanal o kanalı getirir.',
    placeholderShorts: 'ör. kediler ya da @kanal',
    placeholderVideos: 'ör. yemek, bir video linki ya da @kanal',
    order: 'Kanaldan',
    newest: 'En yeni',
    random: 'Karışık',
    popular: 'En çok izlenen',
    startBtn: 'Başlat',
    switchNote: 'Bunu başlatmak {other} kapatır.',
    close: 'Kapat',
  },
};

export interface FeedWindowOptions {
  kind: FeedKind;
  feed: RoomFeed;
  playing: () => QueueItem | null;
  /** The Discover / Popular region remembered in this browser. */
  region: () => PoolRegionChoice;
  setRegion: (region: PoolRegionChoice) => void;
}

let openNow: { close: () => void; render: () => void } | null = null;

/** Redraw the open window (the feed changed). */
export function refreshFeedWindow(): void {
  openNow?.render();
}

export function openFeedWindow(opts: FeedWindowOptions): void {
  openNow?.close();
  const tx = TEXT[lang() === 'tr' ? 'tr' : 'en'];
  const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  let kind = opts.kind;
  const closeX = el('button', { type: 'button', class: 'icon-btn', id: 'feed-close', title: tx.close, 'aria-label': tx.close }, '✕');
  const body = el('div', { class: 'feed-body' });
  const dialog = el('div', { class: 'feed-window card', id: 'feed-window', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'feed-title' }, body);
  const backdrop = el('div', { class: 'dialog-backdrop feed-backdrop' }, dialog);
  const playingId = () => {
    const item = opts.playing();
    return item?.media.kind === 'youtube' ? item.media.id : null;
  };
  /** One row: a button and the line that says what it does (and an extra control). */
  const row = (id: string, label: string, text: string, onClick: () => void, extra?: HTMLElement, disabled = false) => {
    const button = el('button', { type: 'button', class: 'btn small-btn feed-act', id }, label);
    button.disabled = disabled;
    button.addEventListener('click', onClick);
    return el('div', { class: 'feed-row-line' }, el('div', { class: 'feed-row-main' }, button, extra ?? ''), el('p', { class: 'muted small' }, text));
  };
  const regionSelect = (value: string, withAuto: boolean) => {
    const names = typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames([lang()], { type: 'region' }) : null;
    const select = el(
      'select',
      { class: 'feed-region', 'aria-label': tx.country2 },
      ...(withAuto ? [el('option', { value: 'auto' }, `🌍 ${tx.regionAuto}`)] : []),
      el('option', { value: 'world' }, `🌐 ${tx.regionWorld}`),
      ...POOL_REGIONS.map((code) => el('option', { value: code }, names?.of(code) ?? code)),
    );
    select.value = value;
    return select;
  };

  function render(): void {
    const info = opts.feed.info;
    const other: FeedKind = kind === 'shorts' ? 'videos' : 'shorts';
    const tabs = el(
      'div',
      { class: 'feed-tabs', role: 'radiogroup', 'aria-label': tx.kinds },
      ...(['shorts', 'videos'] as const).map((k) => {
        const tab = el('button', { type: 'button', class: 'feed-tab', role: 'radio', 'aria-checked': String(k === kind), 'data-kind': k }, tx[k]);
        tab.addEventListener('click', () => {
          kind = k;
          render();
        });
        return tab;
      }),
    );
    const head = el('div', { class: 'feed-head-row' }, el('h3', { id: 'feed-title', class: 'sr-only' }, tx[kind]), tabs, closeX);
    const parts: (HTMLElement | string)[] = [head];
    const running = info && info.kind === kind ? info : null;
    if (running) {
      const pause = el('button', { type: 'button', class: 'btn small-btn', id: 'feed-pause' }, running.paused ? tx.resume : tx.pause);
      pause.addEventListener('click', () => opts.feed.pause(!running.paused));
      const stop = el('button', { type: 'button', class: 'btn small-btn', id: 'feed-stop' }, tx.stop);
      stop.addEventListener('click', () => {
        opts.feed.stop();
        close();
      });
      parts.push(el('div', { class: 'feed-now', id: 'feed-now' }, el('span', { id: 'feed-now-text' }, (running.paused ? tx.paused : tx.now).replace('{label}', running.label)), pause, stop));
      const id = playingId();
      const source = running.source;
      const regional = source.kind === 'topic' || source.kind === 'pool';
      const current = source.kind === 'topic' ? (source.region ?? 'world') : source.kind === 'pool' ? (source.region ?? 'auto') : 'world';
      const country = regionSelect(current, source.kind === 'pool');
      country.id = 'feed-steer-region';
      country.disabled = !regional;
      const words = el('input', { id: 'feed-steer-topic', autocomplete: 'off', maxlength: '80', 'aria-label': tx.topic });
      const wordsGo = el('button', { type: 'button', class: 'btn small-btn', id: 'feed-steer-go' }, tx.go);
      const steerTopic = () => {
        const q = words.value.replace(/\s+/g, ' ').trim();
        if (q) opts.feed.start(kind, q, { kind: 'topic', q });
      };
      wordsGo.addEventListener('click', steerTopic);
      words.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') steerTopic();
      });
      parts.push(
        el('h4', { class: 'feed-sub' }, tx.steer, el('span', { class: 'muted small' }, ` · ${tx.steerNote}`)),
        row('feed-steer-channel', tx.channel, id ? tx.channelText : tx.noVideo, () => id && opts.feed.start(kind, tx.channelLabel, { kind: 'chanOf', id, ...(running.source.kind === 'channel' || running.source.kind === 'chanOf' ? orderOf(running.source) : {}) }), undefined, !id),
        row('feed-steer-country', tx.country, regional ? tx.countryText : tx.countryNone, () => {
          const region = country.value;
          if (source.kind === 'topic') opts.feed.start(kind, withFlag(running.label, region), isFeedRegion(region) ? { kind: 'topic', q: source.q, region } : { kind: 'topic', q: source.q });
          else if (source.kind === 'pool' && isPoolRegionChoice(region)) opts.feed.start(kind, withFlag(running.label, region), { kind: 'pool', pool: source.pool, region });
        }, country, !regional),
        row('feed-steer-like', tx.like, id ? tx.likeText : tx.noVideo, () => id && opts.feed.start(kind, tx.likeLabel, { kind: 'like', id }), undefined, !id),
        row('feed-steer-topic-btn', tx.topic, tx.topicText, () => words.focus(), el('span', { class: 'feed-words' }, words, wordsGo)),
      );
    }
    // Start a feed: chips (Discover / Popular now) with a country, or one box for words, a video or a channel.
    const region = regionSelect(opts.region(), true);
    region.id = 'feed-region';
    region.addEventListener('change', () => isPoolRegionChoice(region.value) && opts.setRegion(region.value));
    const chips = el(
      'div',
      { class: 'feed-pools', id: 'feed-pools', role: 'group' },
      ...POOL_KINDS.map((pool) => {
        const chip = el('button', { type: 'button', class: 'feed-pool', 'data-pool': pool }, t(`pool.${pool}`));
        chip.addEventListener('click', () => {
          opts.feed.start(kind, t(`pool.${pool}`), { kind: 'pool', pool, region: opts.region() });
          close();
        });
        return chip;
      }),
    );
    const input = el('input', { id: 'feed-topic', autocomplete: 'off', maxlength: '200', placeholder: kind === 'shorts' ? tx.placeholderShorts : tx.placeholderVideos, 'aria-label': tx.input });
    const order = el(
      'select',
      { id: 'feed-order', class: 'feed-region', 'aria-label': tx.order },
      ...(['newest', 'random', 'popular'] as const).map((o) => el('option', { value: o }, tx[o])),
    );
    const startBtn = el('button', { type: 'submit', class: 'btn primary small-btn', id: 'feed-start' }, tx.startBtn);
    const form = el(
      'form',
      { class: 'feed-start-form' },
      el('label', { class: 'small', for: 'feed-topic' }, tx.input),
      el('div', { class: 'feed-topic-row' }, input, kind === 'videos' ? order : '', startBtn),
      el('p', { class: 'muted small' }, tx.inputHint),
    );
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const picked = readInput(input.value, kind, order.value as ChannelOrder, tx);
      if (!picked) return;
      opts.feed.start(kind, picked.label, picked.source);
      close();
    });
    parts.push(
      el('h4', { class: 'feed-sub' }, running ? tx.startOther : tx.start),
      info && info.kind !== kind ? el('p', { class: 'muted small' }, tx.switchNote.replace('{other}', tx[other])) : '',
      el('p', { class: 'small feed-discover-title' }, el('b', {}, kind === 'shorts' ? tx.discoverShorts : tx.discoverVideos), ' ', region),
      chips,
      form,
      el('p', { class: 'yt-attrib small' }, ytLogo(), el('span', {}, el('span', {}, t('yt.from')), ' · ', el('a', { href: 'https://www.youtube.com/t/terms', target: '_blank', rel: 'noopener' }, t('yt.terms')))),
    );
    const focused = document.activeElement?.id;
    body.replaceChildren(...parts);
    if (focused) document.getElementById(focused)?.focus();
  }

  function close(): void {
    backdrop.remove();
    document.removeEventListener('keydown', onKey, true);
    openNow = null;
    if (opener?.isConnected) opener.focus();
  }
  const onKey = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    event.stopImmediatePropagation();
    close();
  };
  closeX.addEventListener('click', close);
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) close();
  });
  document.addEventListener('keydown', onKey, true);
  render();
  document.body.append(backdrop);
  openNow = { close, render };
  dialog.querySelector<HTMLElement>('.feed-tab[aria-checked="true"]')?.focus();
}

function orderOf(source: FeedSource): { order?: ChannelOrder } {
  return (source.kind === 'channel' || source.kind === 'chanOf') && source.order ? { order: source.order } : {};
}

/** "cats" → "cats · 🇯🇵" (a steer to another country shows it in the label). */
function withFlag(label: string, region: string): string {
  const base = label.replace(/ · \S+$/u, '');
  if (region === 'auto') return base;
  if (region === 'world') return `${base} · 🌐`;
  const flag = String.fromCodePoint(...[...region].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
  return `${base} · ${flag}`;
}

/** The start box: a channel, a video link ("like this video") or words (a topic). */
export function readInput(text: string, kind: FeedKind, order: ChannelOrder, tx: { channelLabel: string; likeLabel: string }): { label: string; source: FeedSource } | null {
  const raw = text.replace(/\s+/g, ' ').trim();
  if (!raw) return null;
  const channel = parseChannelInput(raw);
  if (channel) {
    const label = 'id' in channel ? tx.channelLabel : `@${channel.handle}`;
    return { label, source: kind === 'videos' && order !== 'newest' ? { kind: 'channel', c: channelParam(channel), order } : { kind: 'channel', c: channelParam(channel) } };
  }
  const media = parseMediaInput(raw);
  if (media?.kind === 'youtube') return { label: tx.likeLabel, source: { kind: 'like', id: media.id } };
  const q = raw.slice(0, 80);
  return { label: q, source: { kind: 'topic', q } };
}

