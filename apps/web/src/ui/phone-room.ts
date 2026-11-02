import { el } from '../dom.ts';
import { canShareSheet, isPhoneLayout, onPhoneLayout, onTurn } from '../device.ts';
import { t } from '../i18n.ts';
import { flashHint } from './hint.ts';
import { phoneCamSize } from './phone-cams.ts';

/**
 * The room on a phone (0.9.92.3, owner's picks on https://claude.ai/artifact/MsCuFRZjQ6EyDAX8YFtEQu: 1A live layout,
 * 2B no top bar, 3A 😀 / ＋ beside the message box, 6B bubbles, 7A faces strip, 8A one "Add" sheet, 9A ⋯ More menu).
 *
 * The page keeps the desktop room's DOM (every feature works the same); phone.css lays it out as an app screen under
 * `<html class="ph-room">`: the video edge to edge at the top, the faces strip (🎙 / 📷 / ⋯), the chat, the message
 * box with 😀 and ＋ at the bottom. Everything else opens in bottom sheets: ＋ (video, game, image, pin, speed, sync,
 * next), ⋯ (queue, people, games, recap, film time, invite, settings, profile, language), the Add sheet (link box,
 * YouTube search and the queue in one place) and the people list. Sheets borrow the room's own panels and put them
 * back when they close. A face whose camera is on shows the live picture in its circle; tapping it opens the person
 * sheet with the camera big.
 */
export interface PhoneRoomDeps {
  root: HTMLElement;
  /** The settings dialog (a section may be named). */
  openSettings: (section?: 'view' | 'rules' | 'save' | 'schedule') => void;
  myId: () => string | null;
}

type Borrowed = { node: Element; parent: Node; next: Node | null };

export function createPhoneRoom(deps: PhoneRoomDeps) {
  const { root } = deps;
  const html = document.documentElement;
  const $ = <T extends HTMLElement = HTMLElement>(sel: string) => root.querySelector<T>(sel) ?? document.querySelector<T>(sel);

  // ---- When the phone layout is on: a phone (or a phone-narrow window), in the room, not the Shorts view / TV ----
  // The empty room's second step says where the link box is: "above" on a computer, "＋ below" here.
  const emptyStep = root.querySelector<HTMLElement>('.empty-steps [data-i18n="emptyBody"], .empty-steps [data-phone-text]');
  const drawEmptyStep = () => {
    if (!emptyStep) return;
    const on = html.classList.contains('ph-room');
    if (on) {
      emptyStep.removeAttribute('data-i18n');
      emptyStep.dataset.phoneText = '';
      emptyStep.textContent = t('phone.emptyBody');
    } else if (emptyStep.dataset.phoneText !== undefined) {
      emptyStep.setAttribute('data-i18n', 'emptyBody');
      delete emptyStep.dataset.phoneText;
      emptyStep.textContent = t('emptyBody');
    }
  };
  addEventListener('langchange', drawEmptyStep);
  const decide = () => {
    const phone = isPhoneLayout() && !html.classList.contains('tv-mode');
    const shorts = phone && html.classList.contains('shorts-view');
    if (shorts !== html.classList.contains('ph-shorts')) {
      html.classList.toggle('ph-shorts', shorts);
      placeShortsBar(shorts);
      if (!shorts && sheet.dataset.sheet?.startsWith('shorts')) closeSheet();
    }
    const on = phone && !shorts;
    if (on === html.classList.contains('ph-room')) return;
    html.classList.toggle('ph-room', on);
    drawEmptyStep();
    if (!on && !sheet.dataset.sheet?.startsWith('shorts')) closeSheet();
    placeCams();
  };
  onPhoneLayout(decide);
  new MutationObserver(decide).observe(html, { attributes: true, attributeFilter: ['class'] });

  // ---- Bottom sheets ----
  const backdrop = el('div', { class: 'ph-backdrop', hidden: '' });
  const sheet = el('section', { class: 'ph-sheet', role: 'dialog', 'aria-modal': 'true', hidden: '' });
  const grip = el('div', { class: 'ph-grip', 'aria-hidden': 'true' });
  const head = el('div', { class: 'ph-sheet-head' });
  const body = el('div', { class: 'ph-sheet-body' });
  sheet.append(grip, head, body);
  // Inside the room's root: the room's code finds the panels a sheet borrows (it searches the root, not the page).
  root.append(backdrop, sheet);
  let borrowed: Borrowed[] = [];
  let onSheetClose: (() => void) | null = null;
  /** A history entry while a sheet is open: the phone's back button closes it. */
  let historyEntry = false;

  function openSheet(opts: { title?: string; nodes: Element[]; tall?: boolean; borrow?: Element[]; onClose?: () => void; name: string }): void {
    closeSheet(true);
    head.replaceChildren(...(opts.title ? [el('h3', {}, opts.title)] : []));
    const close = el('button', { type: 'button', class: 'icon-btn ph-sheet-close', 'aria-label': t('close'), title: t('close') }, '✕');
    close.addEventListener('click', () => closeSheet());
    head.append(close);
    borrowed = (opts.borrow ?? []).map((node) => ({ node, parent: node.parentNode!, next: node.nextSibling }));
    body.replaceChildren(...opts.nodes);
    sheet.classList.toggle('tall', opts.tall === true);
    sheet.dataset.sheet = opts.name;
    onSheetClose = opts.onClose ?? null;
    backdrop.hidden = false;
    sheet.hidden = false;
    sheet.style.translate = '';
    if (!historyEntry) {
      history.pushState({ ...(history.state ?? {}), phSheet: true }, '');
      historyEntry = true;
    }
  }

  function closeSheet(keepHistory = false): void {
    if (sheet.hidden) return;
    sheet.hidden = true;
    backdrop.hidden = true;
    for (const { node, parent, next } of borrowed) parent.insertBefore(node, next && next.parentNode === parent ? next : null);
    borrowed = [];
    body.replaceChildren();
    const done = onSheetClose;
    onSheetClose = null;
    done?.();
    if (historyEntry && !keepHistory) {
      historyEntry = false;
      if (history.state?.phSheet) history.back();
    }
  }
  addEventListener('popstate', () => {
    if (!historyEntry) return;
    historyEntry = false;
    closeSheet(true);
  });
  backdrop.addEventListener('click', () => closeSheet());
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !sheet.hidden) closeSheet();
  });
  // Pull the sheet down by its top to close it.
  let drag: { y: number; id: number } | null = null;
  for (const handle of [grip, head]) {
    handle.addEventListener('pointerdown', (event) => {
      if ((event.target as Element).closest('button')) return;
      drag = { y: event.clientY, id: event.pointerId };
      handle.setPointerCapture(event.pointerId);
    });
    handle.addEventListener('pointermove', (event) => {
      if (!drag || event.pointerId !== drag.id) return;
      sheet.style.translate = `0 ${Math.max(0, event.clientY - drag.y)}px`;
    });
    const end = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      const moved = event.clientY - drag.y;
      drag = null;
      if (moved > 90) closeSheet();
      else sheet.style.translate = '';
    };
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  }

  // The room's own small windows (emoji tray, add, feed, games, speed) are bottom sheets on a phone too, but a tap on
  // the video never reaches the page (YouTube's frame takes it), so they get a backdrop: a tap on it is a press
  // outside them, which closes them by their own rules.
  const popBackdrop = el('div', { class: 'ph-backdrop ph-pop-backdrop', hidden: '' });
  root.append(popBackdrop);
  const POPS = '.toolbar :is(.react-tray, .game-menu, .speed-pop), .shorts-bar :is(.react-tray, .shorts-feed-pop, .game-menu)';
  const watchPops = () => {
    const open = (html.classList.contains('ph-room') || html.classList.contains('ph-shorts')) && !!root.querySelector(`:is(${POPS}):not([hidden])`);
    // Only on a change: setting the attribute is itself a mutation this observer sees.
    if (popBackdrop.hidden === open) popBackdrop.hidden = !open;
  };
  new MutationObserver(watchPops).observe(root, { subtree: true, attributes: true, attributeFilter: ['hidden'] });

  const tile = (icon: string, label: string, action: () => void, extra?: HTMLElement) => {
    const button = el('button', { type: 'button', class: 'ph-tile' }, el('span', { class: 'ph-tile-ico', 'aria-hidden': 'true' }, icon), el('span', { class: 'ph-tile-label' }, label));
    if (extra) button.append(extra);
    button.addEventListener('click', action);
    return button;
  };
  /** Closes the sheet, then presses one of the room's own buttons (its popups open as sheets of their own). */
  const press = (selector: string) => () => {
    closeSheet();
    requestAnimationFrame(() => $<HTMLButtonElement>(selector)?.click());
  };

  // ---- ＋ beside the message box: add a video, a game, an image, a pin; speed, sync, next ----
  function openPlus(): void {
    const hasItem = !!$('.room.has-item');
    const tiles = [
      tile('🎬', t('phone.plus.video'), () => openAdd()),
      tile('🖼️', t('phone.plus.image'), press('#chat-attach')),
    ];
    if (hasItem) {
      tiles.push(
        tile('📌', t('tool.pin'), press('#pin-btn')),
        tile('⏩', `${t('phone.plus.speed')} · ${$('#speed-label')?.textContent ?? '1×'}`, press('#speed-btn')),
        tile('🔄', t('tool.sync'), press('#sync-all')),
        tile('⏭', t('skip'), press('#skip')),
        tile('⛶', t('phone.plus.fullscreen'), press('#fullscreen')),
      );
    } else {
      tiles.push(tile('🧪', t('syncTest'), press('#sync-test')));
    }
    openSheet({ name: 'plus', nodes: [el('div', { class: 'ph-grid' }, ...tiles)] });
  }

  // ---- The Add sheet: the room's link box (+ YouTube search results) and the queue together ----
  function openAdd(): void {
    const form = $('#media-form');
    const done = $('#media-done');
    const queue = $('[data-panel="queue"]');
    const nodes: Element[] = [];
    const borrow: Element[] = [];
    for (const node of [form, done]) {
      if (node) {
        nodes.push(node);
        borrow.push(node);
      }
    }
    if (queue) {
      nodes.push(el('h4', { class: 'ph-sub' }, `${t('tab.queue')} ${$('#queue-count')?.textContent ?? ''}`.trim()), queue);
      borrow.push(queue);
    }
    openSheet({ name: 'add', title: t('phone.add.title'), nodes, borrow, tall: true });

    requestAnimationFrame(() => $<HTMLInputElement>('#media-input')?.focus());
  }

  // ---- ⋯ More: everything that used to sit in the top bar, the tabs and the toolbar ----
  function openMore(): void {
    const name = $('.room-title-name')?.textContent ?? '';
    const count = $('.room-title-count')?.textContent ?? '';
    const dot = $('.room-title-dot');
    const status = $('.room-title-status')?.textContent ?? '';
    const playing = $('.room.has-item') ? ($('#now-title')?.textContent ?? '') : '';
    const headLine = el('div', { class: 'ph-room-line' }, el('span', { class: 'ph-dot', 'data-status': dot?.dataset.status ?? 'connected' }), el('b', {}, name), el('span', { class: 'muted' }, ` ${count} ${status}`.trimEnd()));
    const nodes: Element[] = [headLine];
    if (playing) nodes.push(el('p', { class: 'ph-playing muted small' }, `▶ ${playing}`));
    const inviteButton = $<HTMLButtonElement>('#invite-btn');
    nodes.push(
      el(
        'div',
        { class: 'ph-grid' },
        tile('🔗', t('phone.more.invite'), () => {
          closeSheet();
          inviteButton?.click();
          if (!canShareSheet()) flashHint($('#strip-more')!, t('phone.more.copied'));
        }),
        tile('🎵', t('tab.queue'), () => openAdd(), el('span', { class: 'ph-tile-count' }, $('#queue-count')?.textContent ?? '')),
        tile('👥', t('tab.people'), () => openPeople(), el('span', { class: 'ph-tile-count' }, $('#people-count')?.textContent ?? '')),
        tile('🎮', t('phone.more.games'), press('#game-btn')),
        tile('✨', t('phone.more.recap'), press('#recap-open')),
        tile('⏰', t('phone.more.filmTime'), () => {
          closeSheet();
          deps.openSettings('schedule');
        }),
        tile('👤', t('tab.profile'), press('.profile-btn')),
        tile('⚙️', t('tab.settings'), () => {
          closeSheet();
          deps.openSettings();
        }),
        // "Language" asks which one (0.9.92.8, owner: it used to switch at once, which was confusing).
        tile('🌐', t('phone.more.language'), () => openLanguage()),
      ),
    );
    openSheet({ name: 'more', nodes });
  }

  function openLanguage(): void {
    const choice = (code: 'en' | 'tr', label: string) => {
      const button = el('button', { type: 'button', class: `ph-lang${html.lang === code ? ' on' : ''}`, 'aria-pressed': String(html.lang === code) }, label);
      button.addEventListener('click', () => {
        closeSheet();
        if (html.lang !== code) document.querySelector<HTMLButtonElement>(`.topbar [data-lang="${code}"]`)?.click();
      });
      return button;
    };
    openSheet({ name: 'language', title: t('phone.more.language'), nodes: [el('div', { class: 'ph-langs' }, choice('en', 'English'), choice('tr', 'Türkçe'))] });
  }

  function openPeople(): void {
    const people = $('[data-panel="people"]');
    if (!people) return;
    openSheet({ name: 'people', title: `${t('tab.people')} ${$('#people-count')?.textContent ?? ''}`.trim(), nodes: [people], borrow: [people], tall: true });
  }

  // "Play now" shows the video at once; "Add to queue" keeps the Add sheet open (the queue below grows).
  $('#media-form button[value="load"]')?.addEventListener('click', () => {
    if (!sheet.hidden && sheet.dataset.sheet === 'add') setTimeout(() => closeSheet(), 0);
  });
  $('#strip-more')?.addEventListener('click', openMore);
  // No top bar here (2B): the connection's state shows as a dot on ⋯ (yellow while connecting, red when cut off).
  const titleDot = $('.room-title-dot');
  const showStatus = () => {
    const more = $('#strip-more');
    if (more && titleDot) more.dataset.status = titleDot.dataset.status ?? '';
  };
  if (titleDot) new MutationObserver(showStatus).observe(titleDot, { attributes: true, attributeFilter: ['data-status'] });
  showStatus();
  $('#chat-plus')?.addEventListener('click', openPlus);
  // 😀 opens the room's emoji tray (it is a bottom sheet on a phone). The tray closes itself on a press outside, which
  // this press is too: remember whether it was open, so a second 😀 closes it instead of opening it again.
  const reactButton = $('#chat-react');
  let trayWasOpen = false;
  reactButton?.addEventListener('pointerdown', () => (trayWasOpen = $('.toolbar .react-open')?.getAttribute('aria-expanded') === 'true'), true);
  reactButton?.addEventListener('click', () => {
    if (!trayWasOpen) $<HTMLButtonElement>('.toolbar .react-open')?.click();
    trayWasOpen = false;
  });

  // ---- Cameras in the faces strip (7A) and big in the person sheet ----
  let cams = new Map<string, MediaStream>();
  const videos = new Map<string, HTMLVideoElement>();
  function camVideo(id: string, stream: MediaStream): HTMLVideoElement {
    let video = videos.get(id);
    if (!video) {
      video = el('video', { autoplay: '', playsinline: '', class: 'face-cam', 'aria-hidden': 'true' }) as HTMLVideoElement;
      video.muted = true;
      videos.set(id, video);
    }
    if (video.srcObject !== stream) video.srcObject = stream;
    video.classList.toggle('mine', id === deps.myId());
    return video;
  }
  // A simple row of cameras under the faces strip (owner, 0.9.92.6: one picture per person, the face stays a face;
  // no free camera windows on a phone). A tap opens that person's sheet with the camera big.
  const camRow = el('div', { class: 'ph-cams', hidden: '' });
  $('.together-strip')?.after(camRow);
  function placeCams(): void {
    const on = html.classList.contains('ph-room');
    for (const [id, video] of videos) {
      if (!cams.has(id) || !on) {
        video.closest('.ph-cam')?.remove();
        if (!cams.has(id)) {
          video.srcObject = null;
          videos.delete(id);
        }
      }
    }
    camRow.hidden = !on || cams.size === 0;
    if (!on) return;
    for (const [id, stream] of cams) {
      const video = camVideo(id, stream);
      let tile = video.closest<HTMLElement>('.ph-cam');
      if (!tile) {
        tile = el('button', { type: 'button', class: 'ph-cam' }, video, el('span', { class: 'ph-cam-name' }));
        tile.addEventListener('click', () => {
          const person = root.querySelector<HTMLElement>(`#voice-people .voice-face[data-voice-id="${CSS.escape(id)}"]`)?.closest<HTMLElement>('.together-person');
          lastFace = id;
          person?.click();
        });
      }
      if (tile.parentElement !== camRow) camRow.append(tile);
      tile.dataset.size = phoneCamSize(id);
      const person = root.querySelector<HTMLElement>(`#voice-people .voice-face[data-voice-id="${CSS.escape(id)}"]`)?.closest<HTMLElement>('.together-person');
      const name = id === deps.myId() ? t('voice.me') : (person?.title.split(' · ')[0] ?? '');
      tile.querySelector('.ph-cam-name')!.textContent = name;
      tile.setAttribute('aria-label', name);
      if (video.paused) void video.play().catch(() => {});
    }
  }
  const people = $('#voice-people');
  // The voice card redraws the faces on every change: put the pictures back each time.
  if (people) new MutationObserver(placeCams).observe(people, { childList: true });
  addEventListener('swm-phcam-size', () => placeCams());

  // Tapping a face opens the person menu (a bottom sheet here): their camera goes on top of it, big.
  let lastFace: string | null = null;
  people?.addEventListener('pointerdown', (event) => {
    lastFace = (event.target as Element).closest<HTMLElement>('.together-person')?.querySelector<HTMLElement>('[data-voice-id]')?.dataset.voiceId ?? null;
  });
  new MutationObserver((records) => {
    if (!html.classList.contains('ph-room')) return;
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (!(node instanceof HTMLElement) || !node.classList.contains('person-pop') || !lastFace) continue;
        const stream = cams.get(lastFace);
        if (!stream) continue;
        const big = el('video', { autoplay: '', playsinline: '', class: 'person-cam', 'aria-hidden': 'true' }) as HTMLVideoElement;
        big.muted = true;
        big.srcObject = stream;
        big.classList.toggle('mine', lastFace === deps.myId());
        node.prepend(big);
        void big.play().catch(() => {});
      }
    }
  }).observe(document.body, { childList: true });

  // ---- Shorts on a phone (0.9.92.4, pick 5A): the video takes the screen; one slim bar under it holds the seats
  // (faces, cameras inside), the newest message for a moment, and 💬 😀 ▲ ▼ ⋯. The desktop Shorts bar stays in the
  // page out of sight: its windows (emoji tray, add, feed, games) open as sheets from the ⋯ / 😀 buttons. ----
  const shortsBar = el('div', { class: 'ph-shorts-bar' });
  const faces = el('div', { class: 'ph-faces' });
  const toast = el('div', { class: 'ph-toast', role: 'status', hidden: '' });
  const barButton = (icon: string, label: string, action: () => void, id: string) => {
    const button = el('button', { type: 'button', class: 'chat-tool ph-bar-btn', id, title: label, 'aria-label': label }, icon);
    button.addEventListener('click', action);
    return button;
  };
  const count = el('span', { class: 'ph-left', 'aria-hidden': 'true' });
  shortsBar.append(
    faces,
    toast,
    barButton('💬', t('chat'), () => openShortsChat(), 'ph-shorts-chat'),
    barButton('😀', t('reactTray.hint'), () => $<HTMLButtonElement>('#shorts-bar .react-open')?.click(), 'ph-shorts-react'),
    el('span', { class: 'ph-nav' }, barButton('▲', t('shorts.prev'), () => $<HTMLButtonElement>('#shorts-prev')?.click(), 'ph-shorts-prev'), count, barButton('▼', t('shorts.next'), () => $<HTMLButtonElement>('#shorts-next')?.click(), 'ph-shorts-next')),
    barButton('⋯', t('phone.more'), () => openShortsMore(), 'ph-shorts-more'),
  );
  const seatsL = $('#seats-l');
  const seatsR = $('#seats-r');
  const seatsHome = seatsL ? { parent: seatsL.parentElement!, next: seatsL } : null;
  const stage = $('.stage');
  /** Moves the seats into the bar while the phone shows Shorts, and back after. */
  function placeShortsBar(on: boolean): void {
    if (!seatsL || !seatsR || !stage || !seatsHome) return;
    if (on) {
      faces.append(seatsL, seatsR);
      stage.append(shortsBar);
      count.textContent = $('#shorts-left')?.textContent ?? '';
    } else if (shortsBar.isConnected) {
      seatsHome.parent.insertBefore(seatsL, seatsHome.parent.querySelector('#theater'));
      // seats-r sits after the ▲▼ column on a computer.
      $('#shorts-nav')?.after(seatsR);
      shortsBar.remove();
    }
  }
  const left = $('#shorts-left');
  if (left) new MutationObserver(() => (count.textContent = left.textContent ?? '')).observe(left, { childList: true, characterData: true, subtree: true });

  function openShortsChat(): void {
    const panel = $('[data-panel="chat"]');
    if (!panel) return;
    openSheet({ name: 'shorts-chat', title: t('chat'), nodes: [panel], borrow: [panel] });
    requestAnimationFrame(() => {
      const list = $('#chat-list');
      if (list) list.scrollTop = list.scrollHeight;
    });
  }

  function openShortsMore(): void {
    const tiles: HTMLElement[] = [];
    if (!$('#shorts-voice')?.hidden) {
      const mic = $('#shorts-mic');
      const cam = $('#shorts-cam');
      tiles.push(tile('🎙', mic?.title || t('voice.join'), press('#shorts-mic')));
      if (cam && !cam.hidden) tiles.push(tile('📷', cam.title || t('voice.camOn'), press('#shorts-cam')));
    }
    tiles.push(
      tile('＋', t('shorts.add'), press('#shorts-add')),
      tile('♾', $('#shorts-feed-label')?.textContent || t('feed.short'), press('#shorts-feed')),
      tile('🎮', t('tool.game'), press('#shorts-game')),
      tile(roomLoop() ? '🔁✓' : '🔁', t('shorts.loop'), press('#shorts-loop')),
      tile('🔗', t('phone.more.invite'), () => {
        closeSheet();
        $<HTMLButtonElement>('#invite-btn')?.click();
        if (!canShareSheet()) flashHint($('#ph-shorts-more')!, t('phone.more.copied'));
      }),
      tile('⚙️', t('tab.settings'), () => {
        closeSheet();
        deps.openSettings();
      }),
      tile('↩', t('shorts.roomView'), press('#shorts-exit')),
    );
    openSheet({ name: 'shorts-more', nodes: [el('div', { class: 'ph-grid' }, ...tiles)] });
  }
  const roomLoop = () => $('#shorts-loop')?.getAttribute('aria-pressed') === 'true';

  // The newest message from someone else shows in the bar for a few seconds (the chat itself is one tap away).
  let toastTimer = 0;
  const chatList = $('#chat-list');
  if (chatList) {
    new MutationObserver((records) => {
      if (!html.classList.contains('ph-shorts') || !sheet.hidden) return;
      // A full redraw (language change, history) adds many lines at once: only a single new line is a new message.
      if (records.length !== 1 || records[0]!.addedNodes.length !== 1) return;
      const line = records[0]!.addedNodes[0];
      if (!(line instanceof HTMLElement) || !line.classList.contains('chat-line') || line.classList.contains('me')) return;
      let name = line.querySelector('.chat-name')?.textContent ?? '';
      // A follow-up line from the same person has no name: take it from the line above.
      for (let prev = line.previousElementSibling; !name && prev; prev = prev.previousElementSibling) name = prev.querySelector('.chat-name')?.textContent ?? '';
      const text = line.querySelector('.chat-text')?.textContent ?? (line.querySelector('.chat-image-btn, .chat-image-missing') ? '🖼️' : '');
      if (!text) return;
      toast.textContent = name ? `${name}: ${text}` : text;
      toast.hidden = false;
      clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => (toast.hidden = true), 4000);
    }).observe(chatList, { childList: true });
  }
  toast.addEventListener('click', () => openShortsChat());

  // ---- Games on a phone (0.9.92.5, pick 10A): full screen, the video a small preview in the game's head ----
  // games/stage.ts sets `ph-game`; here the strip's 🎙 / 📷 move into the game's head and back, and a tap on the
  // preview (the theater, shrunk by phone.css) goes back to the video.
  const stripVoice = $('#strip-voice');
  const stripVoiceHome = stripVoice ? { parent: stripVoice.parentElement!, next: stripVoice.nextSibling } : null;
  const gameMinimize = () => document.querySelector<HTMLButtonElement>('#game-stage .game-minimize');
  let inGame = false;
  new MutationObserver(() => {
    const now = html.classList.contains('ph-game');
    if (now === inGame) return;
    inGame = now;
    if (now) closeSheet();
    const head = document.querySelector('#game-stage .game-stage-head');
    if (!stripVoice || !stripVoiceHome) return;
    if (now && head) head.querySelector('.game-hub-open')?.before(stripVoice);
    else if (!now && stripVoice.parentElement !== stripVoiceHome.parent) stripVoiceHome.parent.insertBefore(stripVoice, stripVoiceHome.next);
  }).observe(html, { attributes: true, attributeFilter: ['class'] });
  $('#theater')?.addEventListener('click', (event) => {
    if (!inGame) return;
    event.preventDefault();
    event.stopPropagation();
    gameMinimize()?.click();
  }, true);
  // Games live only in ⋯ (owner, 0.9.92.8: "once, not in ＋, ⋯ and the strip"): a minimized table puts a dot on ⋯,
  // and ⋯ → Games brings it back.
  const gameButton = $<HTMLButtonElement>('#game-btn');
  if (gameButton) {
    const sync = () => $('#strip-more')?.classList.toggle('game-waiting', gameButton.classList.contains('game-waiting'));
    new MutationObserver(sync).observe(gameButton, { attributes: true, attributeFilter: ['class'] });
    sync();
  }

  // ---- Fullscreen on a phone (0.9.92.6, owner) ----
  // ⛶ in the faces strip while something plays (fullscreen was hidden in ＋): the browser's own fullscreen, a landscape
  // video turns the phone sideways by itself.
  const stripFs = el('button', { type: 'button', id: 'strip-fs', class: 'cam-ctl phone-only', title: t('phone.plus.fullscreen'), 'aria-label': t('phone.plus.fullscreen') }, '⛶');
  stripFs.addEventListener('click', () => $<HTMLButtonElement>('#fullscreen')?.click());
  $('#strip-more')?.before(stripFs);
  // Sideways in fullscreen, 💬 opens and closes a side panel (the faces, cameras, chat and the message box): open, the
  // video and the panel share the screen; closed, the video fills it. Its nodes are the room's own, borrowed and put
  // back (the browser's fullscreen only shows the theater, so they move into it).
  const theaterEl = $('#theater');
  const side = el('aside', { class: 'ph-fs-side', hidden: '' });
  theaterEl?.append(side);
  let sideBorrowed: Borrowed[] = [];
  const inFs = () => !!theaterEl && (document.fullscreenElement === theaterEl || theaterEl.classList.contains('fake-fs'));
  const sideOpen = () => !side.hidden;
  function setSide(open: boolean): void {
    if (!theaterEl || open === sideOpen()) return;
    if (open) {
      const nodes = ['.together-strip', '.ph-cams', '[data-panel="chat"]', '#chat-form'].map((sel) => $(sel)).filter((n): n is HTMLElement => !!n);
      sideBorrowed = nodes.map((node) => ({ node, parent: node.parentNode!, next: node.nextSibling }));
      side.append(...nodes);
    } else {
      for (const { node, parent, next } of sideBorrowed.reverse()) parent.insertBefore(node, next && next.parentNode === parent ? next : null);
      sideBorrowed = [];
    }
    side.hidden = !open;
    theaterEl.classList.toggle('ph-side-open', open);
    $('#dock-chat')?.classList.toggle('on', open);
    if (open) {
      const list = $('#chat-list');
      if (list) list.scrollTop = list.scrollHeight;
    }
  }
  // Sideways without fullscreen (0.9.92.8, owner: "use it upright, or sideways in fullscreen; nothing by itself"): the
  // video big on the left, and on the right only one big ⛶ (the browser's fullscreen, which also locks the phone
  // sideways) or "hold the phone upright". No chat, faces or camera boxes there.
  const turnFs = el('button', { type: 'button', class: 'btn primary ph-turn-fs' }, `⛶ ${t('phone.turn.fs')}`);
  // Opened from here: turning the phone upright again leaves it (Android locks the phone sideways meanwhile).
  let fsFromTurn = false;
  turnFs.addEventListener('click', () => {
    fsFromTurn = true;
    $<HTMLButtonElement>('#fullscreen')?.click();
  });
  onTurn((sideways) => {
    if (sideways || !fsFromTurn) return;
    fsFromTurn = false;
    if (inFs()) $<HTMLButtonElement>('#fullscreen')?.click();
  });
  const turnText = el('p', { class: 'muted' });
  const turn = el('div', { class: 'ph-turn' }, turnFs, turnText);
  $('.room')?.append(turn);
  const drawTurn = () => {
    const playing = !!$('.room.has-item');
    turnFs.hidden = !playing;
    turnText.textContent = t(playing ? 'phone.turn.or' : 'phone.turn.upright');
  };
  const roomBox = $('.room');
  if (roomBox) new MutationObserver(drawTurn).observe(roomBox, { attributes: true, attributeFilter: ['class'] });
  addEventListener('langchange', drawTurn);
  drawTurn();
  $('#dock-chat')?.addEventListener(
    'click',
    (event) => {
      if (!html.classList.contains('phone') || !html.classList.contains('sideways') || !inFs()) return;
      event.stopImmediatePropagation();
      setSide(!sideOpen());
    },
    true,
  );
  const closeSideOutsideFs = () => {
    if (sideOpen() && (!inFs() || !html.classList.contains('sideways'))) setSide(false);
  };
  if (theaterEl) new MutationObserver(closeSideOutsideFs).observe(theaterEl, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('fullscreenchange', closeSideOutsideFs);
  new MutationObserver(closeSideOutsideFs).observe(html, { attributes: true, attributeFilter: ['class'] });

  decide();

  return {
    /** The cameras on screen (member → picture), from the voice card. */
    setCams(next: Map<string, MediaStream>): void {
      cams = next;
      placeCams();
    },
    closeSheet,
  };
}
