// Card FD1 (owner's pick A, design/feed-start.md): the ♾ / ▶ feed drawer. It slides in on the right (a half sheet on an
// upright phone), with no backdrop, so the playing Short / video stays visible. Three short steps on one screen:
// 1 What to watch, 2 Where they come from (six tiles or your own words / video / @channel), 3 Country; a summary line
// says what will play, and only "▶ Start feed" starts it. A running feed shows on top: who started it, ⏸ / ✕ for
// everyone and four ways to steer it. "Only the host can start a feed" (Room rules) locks start / steer / stop for
// guests. A lazy chunk with its own texts and styles (the room page's size budget). Test Lab: `feed.start`.
import './feed-window.css';
import type { ChannelOrder, FeedKind, FeedSource } from '@swm/shared/feed';
import { isFeedRegion } from '@swm/shared/feed';
import { parseMediaInput } from '@swm/shared/media';
import type { QueueItem } from '@swm/shared/protocol';
import { channelParam, parseChannelInput, POOL_KINDS, POOL_REGIONS, type PoolKind, type PoolRegionChoice, isPoolRegionChoice } from '@swm/shared/youtube-search';
import { el } from '../dom.ts';
import { lang, t } from '../i18n.ts';
import type { RoomFeed } from './shorts-feed.ts';
import { ytLogo } from './yt-logo.ts';

export const loaded = true;

const TEXT = {
  en: {
    title: 'Start a feed',
    titleOn: 'Feed',
    step1: 'What to watch',
    shorts: '♾ Shorts',
    shortsLine: 'Short vertical clips, one after another',
    videos: '▶ Videos',
    videosLine: 'Longer videos, back to back',
    step2: 'Where they come from',
    'pool.popular': 'Most watched today',
    'pool.music': 'Hits and new songs',
    'pool.gaming': 'Plays and clips',
    'pool.comedy': 'Sketches, fails',
    'pool.animals': 'Cats, dogs, more',
    'pool.sports': 'Goals, highlights',
    own: '🔤 Or your own: words, a video or @channel',
    ownWith: '🔤 Add words: they combine with the kind and the country',
    noCombine: 'A video or a channel plays as it is: the kind and the country don\'t apply.',
    ownTopic: 'Topic: {x}',
    ownLike: 'Videos like this one',
    ownChannel: 'Channel: {x}',
    order: 'Order',
    newest: 'Newest first',
    popular: 'Most viewed',
    random: 'Shuffled',
    step3: 'Country',
    regionAuto: 'My country',
    regionWorld: 'World',
    willPlay: 'Will play: {what} for everyone',
    pickFirst: 'Pick where the videos come from.',
    replaces: 'This replaces {name}’s feed.',
    startBtn: '▶ Start feed',
    startInstead: '▶ Start this feed instead',
    locked: '🔒 Only the host can start a feed in this room',
    now: '{kind}: {label} · by {name}',
    nowPaused: 'Paused · {kind}: {label} · by {name}',
    someone: 'someone',
    pause: '❚❚ Pause',
    resume: '▶ Resume',
    stop: '✕ Stop',
    forAll: 'For everyone in the room',
    steer: 'Steer it',
    channel: '📺 More from this channel',
    channelText: 'More from the channel of the video playing now.',
    channelLabel: '📺 This channel',
    country: '🌍 Same, other country',
    countryText: 'The same feed as people in another country see it.',
    countryNone: 'Works for a topic or a Popular / category feed.',
    like: '✨ More like this one',
    likeText: 'Like the video playing now: its channel first, then similar titles.',
    likeLabel: '✨ Like this one',
    topic: '🔤 New topic',
    topicText: 'New words; the next videos are about them.',
    go: 'Go',
    noVideo: 'A YouTube video has to be playing first.',
    startOther: 'Start a different feed',
    close: 'Close',
    tiktok: 'TikTok has no public feed. Add TikTok links with + beside the video (several at once is fine) or share them here from the TikTok app.',
  },
  tr: {
    title: 'Akış başlat',
    titleOn: 'Akış',
    step1: 'Ne izlenecek',
    shorts: '♾ Shorts',
    shortsLine: 'Kısa dikey videolar, art arda',
    videos: '▶ Videolar',
    videosLine: 'Uzun videolar, art arda',
    step2: 'Nereden gelsin',
    'pool.popular': 'Bugün en çok izlenenler',
    'pool.music': 'Hitler ve yeni şarkılar',
    'pool.gaming': 'Oynanışlar ve klipler',
    'pool.comedy': 'Skeçler, kazalar',
    'pool.animals': 'Kediler, köpekler, daha fazlası',
    'pool.sports': 'Goller, özetler',
    own: '🔤 Ya da yaz: kelime, video ya da @kanal',
    ownWith: '🔤 Kelime ekle: tür ve ülkeyle birleşir',
    noCombine: 'Bir video ya da kanal olduğu gibi oynar: tür ve ülke uygulanmaz.',
    ownTopic: 'Konu: {x}',
    ownLike: 'Bu videoya benzerler',
    ownChannel: 'Kanal: {x}',
    order: 'Sıra',
    newest: 'Önce en yeniler',
    popular: 'En çok izlenenler',
    random: 'Karışık',
    step3: 'Ülke',
    regionAuto: 'Benim ülkem',
    regionWorld: 'Dünya',
    willPlay: 'Oynayacak: {what}, herkes için',
    pickFirst: 'Videoların nereden geleceğini seç.',
    replaces: 'Bu, {name} adlı kişinin akışının yerine geçer.',
    startBtn: '▶ Akışı başlat',
    startInstead: '▶ Bunun yerine bu akışı başlat',
    locked: '🔒 Bu odada akışı yalnızca yönetici başlatabilir',
    now: '{kind}: {label} · başlatan {name}',
    nowPaused: 'Duraklatıldı · {kind}: {label} · başlatan {name}',
    someone: 'biri',
    pause: '❚❚ Duraklat',
    resume: '▶ Sürdür',
    stop: '✕ Durdur',
    forAll: 'Odadaki herkes için',
    steer: 'Yönlendir',
    channel: '📺 Bu kanaldan daha fazla',
    channelText: 'Şu an oynayan videonun kanalından daha fazlası.',
    channelLabel: '📺 Bu kanal',
    country: '🌍 Aynısı, başka ülke',
    countryText: 'Aynı akış, başka bir ülkedeki insanların gördüğü gibi.',
    countryNone: 'Bir konu ya da Popüler / kategori akışında çalışır.',
    like: '✨ Buna benzer daha fazla',
    likeText: 'Şu an oynayana benzer: önce kanalı, sonra benzer başlıklar.',
    likeLabel: '✨ Buna benzer',
    topic: '🔤 Yeni konu',
    topicText: 'Yeni kelimeler; sıradaki videolar onlarla ilgili olur.',
    go: 'Git',
    noVideo: 'Önce bir YouTube videosu oynamalı.',
    startOther: 'Başka bir akış başlat',
    close: 'Kapat',
    tiktok: "TikTok'un herkese açık bir akışı yok. TikTok linklerini videonun yanındaki + ile ekle (birkaç tane birden olur) ya da TikTok uygulamasından buraya paylaş.",
  },
};
type Tx = (typeof TEXT)['en'];

export interface FeedWindowOptions {
  kind: FeedKind;
  feed: RoomFeed;
  playing: () => QueueItem | null;
  /** The Discover / Popular region remembered in this browser. */
  region: () => PoolRegionChoice;
  setRegion: (region: PoolRegionChoice) => void;
  /** A member's name by member id (who started the feed), null when they left. */
  who: (id: string) => string | null;
  /** "Only the host can start a feed" is on and I am not the host. */
  locked: () => boolean;
}

/** What is picked in the drawer (nothing starts until "▶ Start feed"). */
type Choice = { pool: PoolKind | null; own: string };

let openNow: { close: () => void; render: () => void; state: () => Record<string, unknown>; pick: (kind: FeedKind, pool: PoolKind) => void; start: () => void } | null = null;

/** Redraw the open drawer (the feed or the room's rules changed). */
export function refreshFeedWindow(): void {
  openNow?.render();
}

/** Test Lab `feed.start`: the open drawer's state, or a fixed pick (kind + pool) started through the drawer. */
export function feedWindowLab(): { state: () => Record<string, unknown> | null; pickAndStart: (kind: FeedKind, pool: PoolKind) => boolean } {
  return {
    state: () => openNow?.state() ?? null,
    pickAndStart(kind, pool) {
      if (!openNow) return false;
      openNow.pick(kind, pool);
      openNow.start();
      return true;
    },
  };
}

export function openFeedWindow(opts: FeedWindowOptions): void {
  openNow?.close();
  const tx = TEXT[lang() === 'tr' ? 'tr' : 'en'];
  const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  let kind = opts.kind;
  // Card FC1: a kind chip and the own words are picked independently and combine (Japan + "hay" + 🎵 Music).
  let pick: Choice = { pool: null, own: '' };
  let own = '';
  let order: ChannelOrder = 'newest';
  let region = opts.region();
  /** On a short phone a running feed folds the picker away ("Start a different feed ▾"). */
  let pickerOpen = false;
  const closeX = el('button', { type: 'button', class: 'icon-btn', id: 'feed-close', title: tx.close, 'aria-label': tx.close }, '✕');
  const body = el('div', { class: 'feed-body' });
  const dialog = el('div', { class: 'feed-window feed-drawer', id: 'feed-window', role: 'dialog', 'aria-labelledby': 'feed-title' }, body);
  const playingId = () => {
    const item = opts.playing();
    return item?.media.kind === 'youtube' ? item.media.id : null;
  };
  const regionSelect = (value: string, withAuto: boolean) => {
    const names = typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames([lang()], { type: 'region' }) : null;
    const select = el(
      'select',
      { class: 'feed-region', 'aria-label': tx.step3 },
      ...(withAuto ? [el('option', { value: 'auto' }, `🌍 ${tx.regionAuto}`)] : []),
      el('option', { value: 'world' }, `🌐 ${tx.regionWorld}`),
      ...POOL_REGIONS.map((code) => el('option', { value: code }, names?.of(code) ?? code)),
    );
    select.value = value;
    return select;
  };
  const kindName = (k: FeedKind) => (k === 'shorts' ? tx.shorts : tx.videos);

  /** The own words read as a video or a channel: no kind or country applies (greyed out with a reason). */
  function ownIsFixed(): boolean {
    const read = pick.own ? readInput(pick.own, kind, order, tx) : null;
    return !!read && read.source.kind !== 'topic';
  }
  /** The feed the picks describe, or null when nothing is picked yet. */
  function chosen(): { label: string; source: FeedSource } | null {
    const read = pick.own.trim() ? readInput(pick.own, kind, order, tx) : null;
    if (read && read.source.kind === 'topic') {
      // Card FC1: words + country + kind chip, one query.
      const label = pick.pool ? `${t(`pool.${pick.pool}`)} · ${read.label}` : read.label;
      const flag = region === 'auto' ? '' : region === 'world' ? ' · 🌐' : ` · ${flagOf(region)}`;
      return { label: `${label}${flag}`, source: { ...read.source, region, ...(pick.pool ? { pool: pick.pool } : {}) } };
    }
    if (read) return read;
    if (pick.pool) return { label: t(`pool.${pick.pool}`), source: { kind: 'pool', pool: pick.pool, region } };
    return null;
  }
  /** "Topic: cats" / "Videos like this one" / "Channel: @name" under the own box. */
  function ownHint(text: string): string {
    const read = readInput(text, kind, order, tx);
    if (!read) return '';
    if (read.source.kind === 'channel') return tx.ownChannel.replace('{x}', read.label);
    if (read.source.kind === 'like') return tx.ownLike;
    return tx.ownTopic.replace('{x}', read.label);
  }
  function start(): void {
    const feed = chosen();
    if (!feed || opts.locked()) return;
    opts.feed.start(kind, feed.label, feed.source);
    close();
  }

  /** An upright phone (a half sheet) or a screen too short for the steer actions and the picker together. */
  function shortScreen(): boolean {
    const html = document.documentElement;
    return (html.classList.contains('phone') && !html.classList.contains('sideways')) || innerHeight < 900;
  }

  function render(): void {
    const info = opts.feed.info;
    const locked = opts.locked();
    const runnerName = info ? (opts.who(info.by) ?? tx.someone) : '';
    const head = el('div', { class: 'feed-head-row' }, el('h3', { id: 'feed-title', class: 'feed-title' }, info ? tx.titleOn : tx.title), closeX);
    const parts: (HTMLElement | string)[] = [head];
    // Card SH1 item 4: TikTok has no public feed or search; while a TikTok plays the drawer says so.
    if (kind === 'shorts' && opts.playing()?.media.kind === 'tiktok') parts.push(el('p', { class: 'small feed-tiktok', id: 'feed-tiktok', role: 'note' }, tx.tiktok));

    if (info) {
      // The running feed: who started it, ⏸ / ✕ for everyone, then the steer actions.
      const pause = el('button', { type: 'button', class: 'btn small-btn', id: 'feed-pause', title: tx.forAll }, info.paused ? tx.resume : tx.pause);
      pause.addEventListener('click', () => opts.feed.pause(!info.paused));
      const stop = el('button', { type: 'button', class: 'btn small-btn', id: 'feed-stop', title: tx.forAll }, tx.stop);
      stop.addEventListener('click', () => {
        opts.feed.stop();
        close();
      });
      const line = (info.paused ? tx.nowPaused : tx.now).replace('{kind}', kindName(info.kind)).replace('{label}', info.label).replace('{name}', runnerName);
      parts.push(el('div', { class: 'feed-now', id: 'feed-now' }, el('span', { id: 'feed-now-text' }, line), pause, locked ? '' : stop));
      // A short screen shows either the steer actions or (after "Start a different feed ▾") the picker.
      if (!locked && !(pickerOpen && shortScreen())) parts.push(steerBlock(info.kind, info.source, info.label));
    }

    // The picker: 1 what, 2 where from, 3 country, the summary and the one button that starts.
    const kinds = el(
      'div',
      { class: 'feed-tabs', role: 'radiogroup', 'aria-label': tx.step1 },
      ...(['shorts', 'videos'] as const).map((k) => {
        const tab = el(
          'button',
          { type: 'button', class: 'feed-tab', role: 'radio', 'aria-checked': String(k === kind), 'data-kind': k },
          el('b', {}, kindName(k)),
          el('span', { class: 'feed-tile-line' }, k === 'shorts' ? tx.shortsLine : tx.videosLine),
        );
        tab.addEventListener('click', () => {
          kind = k;
          render();
        });
        return tab;
      }),
    );
    const pools = el(
      'div',
      { class: 'feed-pools', id: 'feed-pools', role: 'radiogroup', 'aria-label': tx.step2 },
      ...POOL_KINDS.map((pool) => {
        const on = pick.pool === pool;
        const tile = el(
          'button',
          { type: 'button', class: 'feed-pool', role: 'radio', 'aria-checked': String(on), 'data-pool': pool },
          el('b', {}, t(`pool.${pool}`)),
          el('span', { class: 'feed-tile-line' }, tx[`pool.${pool}`]),
        );
        tile.addEventListener('click', () => {
          // A second click takes the kind off again (words alone).
          pick = { ...pick, pool: pick.pool === pool ? null : pool };
          render();
        });
        return tile;
      }),
    );
    const ownLabel = pick.pool ? tx.ownWith : tx.own;
    const input = el('input', { id: 'feed-topic', autocomplete: 'off', maxlength: '200', value: own, 'aria-label': ownLabel, placeholder: ownLabel });
    const hint = el('span', { class: 'feed-own-hint muted small', id: 'feed-own-hint' }, ownHint(own));
    input.addEventListener('input', () => {
      own = input.value;
      pick = { ...pick, own };
      hint.textContent = ownHint(own);
      greyOut();
      summary();
    });
    // Enter selects "your own" and moves to the button; it never starts.
    input.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      startBtn.focus();
    });
    const ownChannel = !!pick.own && readInput(pick.own, kind, order, tx)?.source.kind === 'channel';
    const orderSelect = el('select', { id: 'feed-order', class: 'feed-region', 'aria-label': tx.order }, ...(['newest', 'popular', 'random'] as const).map((o) => el('option', { value: o }, tx[o])));
    orderSelect.value = order;
    orderSelect.addEventListener('change', () => {
      order = orderSelect.value as ChannelOrder;
      summary();
    });
    const regionPick = regionSelect(region, true);
    regionPick.id = 'feed-region';
    regionPick.addEventListener('change', () => {
      if (!isPoolRegionChoice(regionPick.value)) return;
      region = regionPick.value;
      opts.setRegion(region);
      summary();
    });
    const summaryLine = el('p', { class: 'feed-summary', id: 'feed-summary', role: 'status' });
    // Card FC1: a video or a channel can't take a kind or a country: both grey out, with the reason in one line.
    const noCombine = el('p', { class: 'feed-own-hint muted small', id: 'feed-no-combine', hidden: '' }, tx.noCombine);
    function greyOut(): void {
      const fixed = ownIsFixed();
      noCombine.hidden = !fixed;
      pools.classList.toggle('feed-greyed', fixed);
      pools.setAttribute('aria-disabled', String(fixed));
      for (const tile of pools.querySelectorAll<HTMLButtonElement>('.feed-pool')) tile.disabled = fixed;
      regionPick.disabled = fixed;
    }
    const startBtn = el('button', { type: 'button', class: 'btn primary feed-start', id: 'feed-start' }, info ? tx.startInstead : tx.startBtn);
    startBtn.addEventListener('click', start);
    function summary(): void {
      const feed = chosen();
      const flag = region === 'auto' ? `🌍 ${tx.regionAuto}` : region === 'world' ? '🌐' : flagOf(region);
      // The label carries the country's flag already for words; a kind chip alone gets it here.
      const what = feed ? `${kindName(kind)} · ${feed.label}${feed.source.kind === 'pool' || (feed.source.kind === 'topic' && region === 'auto') ? ` · ${flag}` : ''}` : '';
      summaryLine.textContent = locked ? tx.locked : feed ? `${tx.willPlay.replace('{what}', what)}${info ? ` ${tx.replaces.replace('{name}', runnerName)}` : ''}` : tx.pickFirst;
      startBtn.setAttribute('aria-disabled', String(!feed || locked));
    }
    summary();
    greyOut();
    const step = (n: number, title: string) => el('h4', { class: 'feed-sub' }, el('span', { class: 'feed-step', 'aria-hidden': 'true' }, String(n)), ' ', title);
    const picker = [
      step(1, tx.step1),
      kinds,
      step(2, tx.step2),
      pools,
      el('div', { class: 'feed-topic-row' }, input, kind === 'videos' && ownChannel ? orderSelect : ''),
      hint,
      el('div', { class: 'feed-country-row' }, step(3, tx.step3), regionPick),
      noCombine,
      summaryLine,
      startBtn,
    ];
    // While a feed runs on an upright phone (a half sheet) or a short screen, the picker folds away so the drawer fits
    // without scrolling.
    const fold = info && shortScreen() && !pickerOpen;
    if (fold) {
      const more = el('button', { type: 'button', class: 'btn small-btn feed-more', id: 'feed-more', 'aria-expanded': 'false' }, `${tx.startOther} ▾`);
      more.addEventListener('click', () => {
        pickerOpen = true;
        render();
        document.querySelector<HTMLElement>('#feed-window .feed-tab[aria-checked="true"]')?.focus();
      });
      // In the head row beside ✕, so the steer actions and the YouTube attribution keep their room.
      head.insertBefore(more, closeX);
    } else parts.push(el('div', { class: 'feed-picker' }, ...picker));
    parts.push(el('p', { class: 'yt-attrib small' }, ytLogo(), el('span', {}, el('span', {}, t('yt.from')), ' · ', el('a', { href: 'https://www.youtube.com/t/terms', target: '_blank', rel: 'noopener' }, t('yt.terms')))));
    const focused = document.activeElement?.id;
    body.replaceChildren(...parts);
    if (focused) document.getElementById(focused)?.focus();
  }

  /** The four steer actions, each with its line as a tooltip and description (not a second text line). */
  function steerBlock(runKind: FeedKind, source: FeedSource, label: string): HTMLElement {
    const id = playingId();
    const regional = source.kind === 'topic' || source.kind === 'pool';
    const current = source.kind === 'topic' ? (source.region ?? 'world') : source.kind === 'pool' ? (source.region ?? 'auto') : 'world';
    const country = regionSelect(current, source.kind === 'pool');
    country.id = 'feed-steer-region';
    country.disabled = !regional;
    const words = el('input', { id: 'feed-steer-topic', autocomplete: 'off', maxlength: '80', 'aria-label': tx.topic, placeholder: tx.topic });
    const wordsGo = el('button', { type: 'button', class: 'btn small-btn', id: 'feed-steer-go' }, tx.go);
    const steerTopic = () => {
      const q = words.value.replace(/\s+/g, ' ').trim();
      if (q) opts.feed.start(runKind, q, { kind: 'topic', q });
    };
    wordsGo.addEventListener('click', steerTopic);
    words.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') steerTopic();
    });
    const row = (rowId: string, text: string, line: string, onClick: () => void, extra?: HTMLElement, disabled = false) => {
      const button = el('button', { type: 'button', class: 'btn small-btn feed-act', id: rowId, title: line, 'aria-describedby': `${rowId}-d` }, text);
      button.disabled = disabled;
      button.addEventListener('click', onClick);
      return el('div', { class: 'feed-row-line' }, button, extra ?? '', el('p', { class: 'sr-only', id: `${rowId}-d` }, line));
    };
    // 🔤 New topic is the box itself (its line describes it) with Go: no second "New topic" button beside it.
    words.setAttribute('aria-describedby', 'feed-steer-topic-d');
    return el(
      'div',
      { class: 'feed-steer' },
      el('h4', { class: 'feed-sub' }, tx.steer),
      el(
        'div',
        { class: 'feed-steer-grid' },
        row('feed-steer-channel', tx.channel, id ? tx.channelText : tx.noVideo, () => id && opts.feed.start(runKind, tx.channelLabel, { kind: 'chanOf', id, ...orderOf(source) }), undefined, !id),
        row('feed-steer-like', tx.like, id ? tx.likeText : tx.noVideo, () => id && opts.feed.start(runKind, tx.likeLabel, { kind: 'like', id }), undefined, !id),
        row(
          'feed-steer-country',
          tx.country,
          regional ? tx.countryText : tx.countryNone,
          () => {
            const value = country.value;
            // Card FC1: the kind chip stays with the words when the country changes.
            if (source.kind === 'topic') opts.feed.start(runKind, withFlag(label, value), { kind: 'topic', q: source.q, ...(isFeedRegion(value) ? { region: value } : {}), ...(source.pool ? { pool: source.pool } : {}) });
            else if (source.kind === 'pool' && isPoolRegionChoice(value)) opts.feed.start(runKind, withFlag(label, value), { kind: 'pool', pool: source.pool, region: value });
          },
          country,
          !regional,
        ),
        el('div', { class: 'feed-row-line' }, el('span', { class: 'feed-words' }, words, wordsGo), el('p', { class: 'sr-only', id: 'feed-steer-topic-d' }, tx.topicText)),
      ),
    );
  }

  function close(): void {
    dialog.remove();
    document.removeEventListener('keydown', onKey, true);
    removeEventListener('resize', place);
    openNow = null;
    if (opener?.isConnected) opener.focus();
  }
  const onKey = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !dialog.contains(document.activeElement)) return;
    event.stopImmediatePropagation();
    close();
  };
  /** Below the room's top bar on a computer (the drawer covers the side panel, never the video). */
  function place(): void {
    const bar = document.querySelector('.topbar')?.getBoundingClientRect();
    dialog.style.top = bar && bar.height > 0 && bar.bottom < innerHeight / 3 ? `${Math.round(bar.bottom)}px` : '';
    // A phone's tab bar stays usable: the sheet stands on it.
    const tabs = document.querySelector('.ph-tabs')?.getBoundingClientRect();
    const floor = tabs && tabs.height > 0 && tabs.top > innerHeight / 2 ? tabs.top : innerHeight;
    dialog.style.bottom = floor < innerHeight ? `${Math.round(innerHeight - floor)}px` : '';
    // An upright phone's sheet never reaches over the player (nothing of ours over a YouTube player).
    const html = document.documentElement;
    const playing = document.querySelector('#player iframe, #player video');
    const player = playing && html.classList.contains('phone') && !html.classList.contains('sideways') ? document.querySelector('.player-wrap')?.getBoundingClientRect() : null;
    dialog.style.maxHeight = player && player.height > 0 && player.bottom < floor ? `${Math.round(floor - Math.max(player.bottom, 0) - 4)}px` : '';
  }
  closeX.addEventListener('click', close);
  document.addEventListener('keydown', onKey, true);
  addEventListener('resize', place);
  render();
  document.body.append(dialog);
  place();
  openNow = {
    close,
    render,
    start,
    pick(k, pool) {
      kind = k;
      pick = { ...pick, pool };
      render();
    },
    state() {
      const r = dialog.getBoundingClientRect();
      return {
        kind,
        pick,
        summary: document.getElementById('feed-summary')?.textContent ?? '',
        locked: opts.locked(),
        running: opts.feed.info ? { kind: opts.feed.info.kind, label: opts.feed.info.label, by: opts.who(opts.feed.info.by) } : null,
        box: `${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}×${Math.round(r.height)}`,
        right: Math.round(innerWidth - r.right) <= 1,
        onScreen: r.left >= 0 && r.top >= 0 && r.bottom <= innerHeight + 1,
        scrolls: dialog.scrollHeight > dialog.clientHeight + 1,
      };
    },
  };
  dialog.querySelector<HTMLElement>('.feed-tab[aria-checked="true"]')?.focus();
}

function orderOf(source: FeedSource): { order?: ChannelOrder } {
  return (source.kind === 'channel' || source.kind === 'chanOf') && source.order ? { order: source.order } : {};
}

function flagOf(region: string): string {
  return String.fromCodePoint(...[...region].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/** "cats" → "cats · 🇯🇵" (a steer to another country shows it in the label). */
function withFlag(label: string, region: string): string {
  const base = label.replace(/ · \S+$/u, '');
  if (region === 'auto') return base;
  if (region === 'world') return `${base} · 🌐`;
  return `${base} · ${flagOf(region)}`;
}

/** The own box: a channel, a video link ("like this video") or words (a topic). */
export function readInput(text: string, kind: FeedKind, order: ChannelOrder, tx: Pick2): { label: string; source: FeedSource } | null {
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
type Pick2 = Pick<Tx, 'channelLabel' | 'likeLabel'>;
