import { el } from '../dom.ts';
import { canShareSheet, isPhoneLayout, onPhoneLayout } from '../device.ts';
import { t } from '../i18n.ts';
import { flashHint } from './hint.ts';

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
    const on = isPhoneLayout() && !html.classList.contains('shorts-view') && !html.classList.contains('tv-mode');
    if (on === html.classList.contains('ph-room')) return;
    html.classList.toggle('ph-room', on);
    drawEmptyStep();
    if (!on) closeSheet();
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
  document.body.append(backdrop, sheet);
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
      tile('🎮', t('tool.game'), press('#game-btn')),
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
    const lang = html.lang === 'en' ? 'tr' : 'en';
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
        tile('🌐', lang === 'en' ? 'English' : 'Türkçe', () => {
          closeSheet();
          document.querySelector<HTMLButtonElement>(`.topbar [data-lang="${lang}"]`)?.click();
        }),
      ),
    );
    openSheet({ name: 'more', nodes });
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
  function placeCams(): void {
    const on = html.classList.contains('ph-room');
    for (const [id, video] of videos) {
      if (!cams.has(id) || !on) {
        video.remove();
        if (!cams.has(id)) {
          video.srcObject = null;
          videos.delete(id);
        }
      }
    }
    if (!on) return;
    for (const [id, stream] of cams) {
      const face = root.querySelector<HTMLElement>(`#voice-people .voice-face[data-voice-id="${CSS.escape(id)}"]`);
      if (!face) continue;
      const video = camVideo(id, stream);
      if (video.parentElement !== face) {
        face.append(video);
        void video.play().catch(() => {});
      }
      face.classList.add('has-cam');
    }
  }
  const people = $('#voice-people');
  // The voice card redraws the faces on every change: put the pictures back each time.
  if (people) new MutationObserver(placeCams).observe(people, { childList: true });

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
