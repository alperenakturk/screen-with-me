import { el } from '../dom.ts';
import { canShareSheet, isPhoneLayout, onPhoneLayout, onTurn } from '../device.ts';
import { t, type I18nKey } from '../i18n.ts';
import { debugHooks } from '../debug-lab.ts';
import { flashHint } from './hint.ts';
import { phoneCamSize } from './phone-cams.ts';
import { switchNote, watchCamVideo } from './cam-watch.ts';
import type { SettingsSection } from './room-more.ts';

/**
 * The room on a phone: an app screen (PH1, owner's pick A of `docs/internal/design/phone-room.md`, 13 Nov 2026).
 *
 * The page keeps the desktop room's DOM (every feature works the same); room.css lays it out under
 * `<html class="ph-room">` and a bottom tab bar (`data-ph-tab` on <html>) switches between four panels, no router:
 * - 🎬 Room: the video, the strip (faces · 📌 ⏩ 🔄 ⏭), the chat with its activity lines, ONE input row
 *   (🔗 · box · 🎙 · 📷 · 😀; ➤ takes 🎙 📷's place while typing; 😀 = reactions + 🖼 Send an image).
 * - 🔍 Search: the room's own link / search box and results, and "Up next" (the queue).
 * - 🎮 Games: the games hall (games/stage.ts opens it next to this tab's own hidden trigger).
 * - 👤 Me: the profile and every settings category as cards (borrowed from the settings window, all shown).
 * Panels borrow the room's own nodes and put them back when another tab opens; the tab is kept per room for a reload.
 * A face whose camera is on shows the live picture in its circle; tapping the faces opens the People sheet.
 */
export interface PhoneRoomDeps {
  root: HTMLElement;
  myId: () => string | null;
  /** The settings window (Shorts' ⋯ → Settings; in the room the Me tab holds the categories). */
  openSettings: (section?: SettingsSection) => void;
  /** The settings window's categories and its "lend them to the Me tab" switch (PH1). */
  settings: { sections: () => HTMLElement[]; setInPage: (on: boolean) => void };
  /** The Me tab's head: my avatar and name (a tap opens the profile). */
  meHead: () => HTMLElement;
}

type Borrowed = { node: Element; parent: Node; next: Node | null };
type Tab = 'room' | 'search' | 'games' | 'me';
const TABS: [Tab, string, I18nKey][] = [
  ['room', '🎬', 'phone.tab.room'],
  ['search', '🔍', 'phone.tab.search'],
  ['games', '🎮', 'phone.tab.games'],
  ['me', '👤', 'phone.tab.me'],
];
const SECTION_TITLES: Record<string, I18nKey> = {
  me: 'settings.secMe',
  view: 'settings.secView',
  room: 'settings.secRoom',
  rules: 'settings.secRules',
  schedule: 'settings.secSchedule',
  sound: 'settings.secSound',
  about: 'settings.secAbout',
};

export function createPhoneRoom(deps: PhoneRoomDeps) {
  const { root } = deps;
  const html = document.documentElement;
  const $ = <T extends HTMLElement = HTMLElement>(sel: string) => root.querySelector<T>(sel) ?? document.querySelector<T>(sel);
  const roomBox = $('.room');
  const borrow = (nodes: Element[]): Borrowed[] => nodes.map((node) => ({ node, parent: node.parentNode!, next: node.nextSibling }));
  const giveBack = (list: Borrowed[]) => {
    for (const { node, parent, next } of list.reverse()) parent.insertBefore(node, next && next.parentNode === parent ? next : null);
  };

  // ---- When the phone layout is on: a phone (or a phone-narrow window), in the room, not the Shorts view / TV ----
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
    if (on) {
      // The tab kept from before a reload opens once the room has finished setting up (the Me tab draws the
      // settings, which read the room's state).
      setTab('room', false);
      const saved = savedTab();
      if (saved !== 'room') queueMicrotask(() => html.classList.contains('ph-room') && setTab(saved, false));
    }
    else {
      setTab('room', false);
      if (!sheet.dataset.sheet?.startsWith('shorts')) closeSheet();
    }
    placeCams();
  };

  // ---- Bottom sheets (People, the chat sideways and in Shorts, Shorts' ⋯): list rows, no grip, no shadow ----
  const backdrop = el('div', { class: 'ph-backdrop', hidden: '' });
  const sheet = el('section', { class: 'ph-sheet', role: 'dialog', 'aria-modal': 'true', hidden: '' });
  const head = el('div', { class: 'ph-sheet-head' });
  const body = el('div', { class: 'ph-sheet-body' });
  sheet.append(head, body);
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
    borrowed = borrow(opts.borrow ?? []);
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
    giveBack(borrowed);
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
  // Pull the sheet down by its head to close it.
  let drag: { y: number; id: number } | null = null;
  head.addEventListener('pointerdown', (event) => {
    if ((event.target as Element).closest('button')) return;
    drag = { y: event.clientY, id: event.pointerId };
    head.setPointerCapture(event.pointerId);
  });
  head.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    sheet.style.translate = `0 ${Math.max(0, event.clientY - drag.y)}px`;
  });
  const endDrag = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.id) return;
    const moved = event.clientY - drag.y;
    drag = null;
    if (moved > 90) closeSheet();
    else sheet.style.translate = '';
  };
  head.addEventListener('pointerup', endDrag);
  head.addEventListener('pointercancel', endDrag);

  // The room's own small windows (emoji tray, games, speed) are bottom sheets on a phone too, but a tap on the video
  // never reaches the page (YouTube's frame takes it), so they get a backdrop: a tap on it is a press outside them,
  // which closes them by their own rules.
  const popBackdrop = el('div', { class: 'ph-backdrop ph-pop-backdrop', hidden: '' });
  root.append(popBackdrop);
  const POPS = '.toolbar :is(.react-tray, .speed-pop), .shorts-bar :is(.react-tray, .shorts-feed-pop, .game-menu)';
  const watchPops = () => {
    const open = (html.classList.contains('ph-room') || html.classList.contains('ph-shorts')) && !!root.querySelector(`:is(${POPS}):not([hidden])`);
    // Only on a change: setting the attribute is itself a mutation this observer sees.
    if (popBackdrop.hidden === open) popBackdrop.hidden = !open;
  };
  new MutationObserver(watchPops).observe(root, { subtree: true, attributes: true, attributeFilter: ['hidden'] });

  /** A sheet's or the Me tab's list row: icon, words, an optional muted value at the end (decision 1: rows, not tiles). */
  const row = (icon: string, label: string, action: () => void, end?: string) => {
    const button = el('button', { type: 'button', class: 'ph-row' }, el('span', { class: 'ph-row-ico', 'aria-hidden': 'true' }, icon), el('span', { class: 'ph-row-label' }, label));
    if (end) button.append(el('span', { class: 'ph-row-end' }, end));
    button.addEventListener('click', action);
    return button;
  };
  /** Closes the sheet, then presses one of the room's own buttons (its popups open as sheets of their own). */
  const press = (selector: string) => () => {
    closeSheet();
    requestAnimationFrame(() => $<HTMLButtonElement>(selector)?.click());
  };
  /** 🔗: the room's invite (the phone's share sheet, or the link copied with a note by `anchor`). */
  const invite = (anchor: HTMLElement) => {
    closeSheet();
    $<HTMLButtonElement>('#invite-btn')?.click();
    if (!canShareSheet()) flashHint(anchor, t('phone.more.copied'));
  };

  // ---- The bottom tab bar (option A): 🎬 Room · 🔍 Search · 🎮 Games · 👤 Me ----
  const tabKey = `phTab:${location.pathname}`;
  const savedTab = (): Tab => {
    try {
      const v = sessionStorage.getItem(tabKey);
      return v === 'search' || v === 'games' || v === 'me' ? v : 'room';
    } catch {
      return 'room';
    }
  };
  const tabBar = el('nav', { class: 'ph-tabs', role: 'tablist', 'aria-label': t('phone.tabs') });
  const tabButtons = new Map<Tab, HTMLButtonElement>();
  const panels = new Map<Tab, HTMLElement>();
  for (const [tab, icon, label] of TABS) {
    const button = el(
      'button',
      { type: 'button', class: 'ph-tab', role: 'tab', id: `ph-tab-${tab}`, 'data-ph-tab': tab, 'aria-selected': 'false', tabindex: '-1' },
      el('span', { class: 'ph-tab-ico', 'aria-hidden': 'true' }, icon),
      el('span', { class: 'ph-tab-label', 'data-i18n': label }, t(label)),
    ) as HTMLButtonElement;
    button.addEventListener('click', () => setTab(tab));
    tabButtons.set(tab, button);
    tabBar.append(button);
    if (tab !== 'room') {
      const panel = el('section', { class: 'ph-panel', role: 'tabpanel', 'data-ph-panel': tab, 'aria-labelledby': `ph-tab-${tab}`, hidden: '' });
      panels.set(tab, panel);
      roomBox?.append(panel);
    }
  }
  // Arrow keys move between the tabs, like the computer's tabs.
  tabBar.addEventListener('keydown', (event) => {
    const order = TABS.map(([tab]) => tab);
    const at = order.indexOf(tab);
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = order[(at + step + order.length) % order.length]!;
    setTab(next);
    tabButtons.get(next)?.focus();
  });
  roomBox?.append(tabBar);

  let tab: Tab = 'room';
  let lent: Borrowed[] = [];
  /** Hidden trigger the games hall opens beside (games/stage.ts moves its hall next to the 🎮 pressed). */
  const gamesButton = el('button', { type: 'button', id: 'ph-games-open', class: 'ph-games-open', tabindex: '-1', 'aria-hidden': 'true' }) as HTMLButtonElement;
  const gamesWrap = el('div', { class: 'game-menu-wrap ph-games-wrap' }, gamesButton);
  panels.get('games')?.append(gamesWrap);
  const meBody = el('div', { class: 'ph-me' });
  panels.get('me')?.append(meBody);

  function setTab(next: Tab, remember = true): void {
    if (next !== 'room' && !html.classList.contains('ph-room')) next = 'room';
    const was = tab;
    if (was === next && html.dataset.phTab === next && (next !== 'games' || !$('#game-menu')?.hidden)) return;
    // Leaving a panel: its borrowed nodes go home first.
    if (was !== next) {
      if (was === 'me') {
        deps.settings.setInPage(false);
        meBody.replaceChildren();
      }
      giveBack(lent);
      lent = [];
      panels.get(was)?.setAttribute('hidden', '');
    }
    tab = next;
    html.dataset.phTab = next;
    for (const [key, button] of tabButtons) {
      button.setAttribute('aria-selected', String(key === next));
      button.tabIndex = key === next ? 0 : -1;
    }
    if (remember) {
      try {
        sessionStorage.setItem(tabKey, next);
      } catch {
        /* storage blocked: the tab is simply not kept */
      }
    }
    const panel = panels.get(next);
    if (panel) panel.hidden = false;
    if (next === 'search') fillSearch(panel!);
    else if (next === 'me') fillMe();
    else if (next === 'games' && $('#game-menu')?.hidden) requestAnimationFrame(() => gamesButton.click());
    if (next !== 'room') closeSheet();
  }

  // 🔍 Search: the room's link box, its results and "Up next" (the queue).
  function fillSearch(panel: HTMLElement): void {
    const nodes = ['#media-form', '#media-done'].map((sel) => $(sel)).filter((n): n is HTMLElement => !!n);
    const queue = $('[data-panel="queue"]');
    lent = borrow(queue ? [...nodes, queue] : nodes);
    const title = el('h4', { class: 'ph-sub' }, `${t('phone.upNext')} ${$('#queue-count')?.textContent ?? ''}`.trim());
    panel.replaceChildren(...nodes, ...(queue ? [title, queue] : []));
  }
  // "Play now" shows the video at once: back to the Room tab. "Add to queue" stays (Up next grows).
  $('#media-form button[value="load"]')?.addEventListener('click', () => {
    if (tab === 'search') setTimeout(() => setTab('room'), 0);
  });

  // 🎮 Games: the hall shows in the panel; picking a game (it opens full screen) goes back to the Room tab.
  const gameMenu = $('#game-menu');
  if (gameMenu) {
    new MutationObserver(() => {
      if (tab === 'games' && gameMenu.hidden) requestAnimationFrame(() => tab === 'games' && $('#game-menu')?.hidden && setTab('room'));
    }).observe(gameMenu, { attributes: true, attributeFilter: ['hidden'] });
  }

  // 👤 Me: my avatar and name, then every settings category as a card, then the room's extras.
  function fillMe(): void {
    const sections = deps.settings.sections();
    lent = borrow(sections);
    const cards: HTMLElement[] = [];
    for (const sec of sections) {
      const key = SECTION_TITLES[sec.dataset.sec ?? ''];
      const card = el('div', { class: 'ph-me-card', 'data-me-card': sec.dataset.sec ?? '' }, ...(key ? [el('h4', { class: 'ph-me-title' }, t(key))] : []), sec);
      cards.push(card);
    }
    const extras: HTMLElement[] = [];
    if ($('#recap-open')) extras.push(row('✨', t('phone.more.recap'), press('#recap-open')));
    extras.push(...labRow());
    meBody.replaceChildren(deps.meHead(), ...cards, ...(extras.length ? [el('div', { class: 'ph-me-card' }, ...extras)] : []));
    deps.settings.setInPage(true);
  }

  // ---- The Room tab ----
  // The strip under the video: the faces (tap → People) and the video's own controls, one tap each.
  const stripTool = (icon: string, label: I18nKey, target: string) => {
    const button = el('button', { type: 'button', class: 'cam-ctl ph-strip-tool', 'data-press': target, title: t(label), 'aria-label': t(label) }, icon);
    button.addEventListener('click', () => {
      const real = $<HTMLButtonElement>(target);
      if (real?.disabled) return flashHint(button, real.title || t('hostLock'));
      real?.click();
    });
    return button;
  };
  const stripTools = el(
    'div',
    { class: 'ph-strip-tools' },
    stripTool('📌', 'tool.pin', '#pin-btn'),
    stripTool('⏩', 'phone.plus.speed', '#speed-btn'),
    stripTool('🔄', 'tool.sync', '#sync-all'),
    stripTool('⏭', 'skip', '#skip'),
  );
  $('.together-strip')?.append(stripTools);
  addEventListener('langchange', () => {
    for (const button of stripTools.querySelectorAll<HTMLElement>('.ph-strip-tool')) {
      const key = ({ '#pin-btn': 'tool.pin', '#speed-btn': 'phone.plus.speed', '#sync-all': 'tool.sync', '#skip': 'skip' } as Record<string, I18nKey>)[button.dataset.press ?? ''];
      if (key) button.title = button.ariaLabel = t(key);
    }
    tabBar.setAttribute('aria-label', t('phone.tabs'));
  });

  // The faces open the People sheet (who is here, 👑 host, 🎙, then 🔗 Invite); a camera tile opens that person.
  let toPerson = false;
  function openPeople(): void {
    const people = $('[data-panel="people"]');
    if (!people) return;
    const inviteRow = row('🔗', t('phone.more.invite'), () => invite(inviteRow));
    openSheet({ name: 'people', title: `${t('tab.people')} ${$('#people-count')?.textContent ?? ''}`.trim(), nodes: [people, inviteRow], borrow: [people], tall: true });
  }
  $('#voice-people')?.addEventListener(
    'click',
    (event) => {
      if (!html.classList.contains('ph-room') || toPerson) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      openPeople();
    },
    true,
  );

  // The one input row: 🔗 invites, 🎙 📷 are voice's own quick buttons, 😀 opens the reactions (with 🖼 in them).
  const inviteButton = $<HTMLButtonElement>('#chat-invite');
  inviteButton?.addEventListener('click', () => invite(inviteButton));
  // 😀 opens the room's emoji tray (a bottom sheet on a phone). The tray closes itself on a press outside, which this
  // press is too: remember whether it was open, so a second 😀 closes it instead of opening it again.
  const reactButton = $('#chat-react');
  let trayWasOpen = false;
  reactButton?.addEventListener('pointerdown', () => (trayWasOpen = $('.toolbar .react-open')?.getAttribute('aria-expanded') === 'true'), true);
  reactButton?.addEventListener('click', () => {
    if (!trayWasOpen) $<HTMLButtonElement>('.toolbar .react-open')?.click();
    trayWasOpen = false;
  });
  // 🖼 Send an image sits in the reactions sheet on a phone (the tray redraws itself: the row goes back in each time).
  const trayBar = $('.toolbar .tray-bar');
  const imageRow = row('🖼', t('phone.plus.image'), () => {
    $<HTMLButtonElement>('.toolbar .react-open')?.click();
    $<HTMLButtonElement>('#chat-attach')?.click();
  });
  imageRow.classList.add('ph-tray-image');
  const placeImageRow = () => {
    const tray = trayBar?.querySelector('.react-tray');
    if (tray && imageRow.parentElement !== tray) tray.append(imageRow);
  };
  if (trayBar) new MutationObserver(placeImageRow).observe(trayBar, { childList: true, subtree: true });
  placeImageRow();
  addEventListener('langchange', () => (imageRow.querySelector('.ph-row-label')!.textContent = t('phone.plus.image')));

  // The empty room: 🔍 Search a video (the Search tab) and 🔗 Invite.
  $('#empty-search')?.addEventListener('click', () => setTab('search'));
  const emptyInvite = $<HTMLButtonElement>('#empty-invite-ph');
  emptyInvite?.addEventListener('click', () => invite(emptyInvite));

  // No top bar here: the connection's state shows as a dot on the Room tab (yellow while connecting, red when cut off).
  const titleDot = $('.room-title-dot');
  const showStatus = () => {
    const roomTab = tabButtons.get('room');
    if (roomTab && titleDot) roomTab.dataset.status = titleDot.dataset.status ?? '';
  };
  if (titleDot) new MutationObserver(showStatus).observe(titleDot, { attributes: true, attributeFilter: ['data-status'] });
  showStatus();

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
          toPerson = true;
          person?.click();
          toPerson = false;
        });
      }
      if (tile.parentElement !== camRow) camRow.append(tile);
      tile.dataset.size = phoneCamSize(id);
      const person = root.querySelector<HTMLElement>(`#voice-people .voice-face[data-voice-id="${CSS.escape(id)}"]`)?.closest<HTMLElement>('.together-person');
      const name = id === deps.myId() ? t('voice.me') : (person?.title.split(' · ')[0] ?? '');
      tile.querySelector('.ph-cam-name')!.textContent = name;
      // CAM1: replayed when paused, "waiting for the picture…" / "camera changing…" over it when it shows nothing.
      watchCamVideo(video, tile, name || id.slice(0, 4), () => switchNote(id));
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
        const host = el('div', { class: 'person-cam-box' }, big);
        node.prepend(host);
        void big.play().catch(() => {});
        const who = lastFace;
        watchCamVideo(big, host, 'sheet', () => switchNote(who));
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
  // Messages that came in while the chat was out of sight: a count on each 💬.
  let unread = 0;
  const badges: HTMLElement[] = [];
  function unreadBadge(): HTMLElement {
    const badge = el('span', { class: 'badge ph-unread', hidden: '' });
    badges.push(badge);
    return badge;
  }
  function drawUnread(): void {
    for (const badge of badges) {
      badge.hidden = unread === 0;
      badge.textContent = unread > 9 ? '9+' : String(unread);
    }
  }
  const shortsChat = barButton('💬', t('chat'), () => openShortsChat(), 'ph-shorts-chat');
  shortsChat.append(unreadBadge());
  shortsBar.append(
    faces,
    toast,
    shortsChat,
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

  /** The chat as a sheet (Shorts' 💬, and 💬 on a phone held sideways); its unread count resets. */
  function openShortsChat(): void {
    const panel = $('[data-panel="chat"]');
    if (!panel) return;
    unread = 0;
    drawUnread();
    openSheet({ name: 'shorts-chat', title: t('chat'), nodes: [panel], borrow: [panel] });
    requestAnimationFrame(() => {
      const list = $('#chat-list');
      if (list) list.scrollTop = list.scrollHeight;
    });
  }

  // LABFAB: with the Test Lab on, an upright phone has no floating 🐞 in the room (it sat over the player, chat names or
  // the Shorts video): the Me tab and Shorts' ⋯ get this row instead, red-ringed like 🐞 while there are errors.
  function labRow(): HTMLElement[] {
    const fab = $<HTMLButtonElement>('.debug-fab');
    if (!fab) return [];
    const error = fab.classList.contains('has-error');
    const button = row('🐞', t(error ? 'phone.more.labError' : 'phone.more.lab'), () => {
      closeSheet();
      fab.click();
    });
    button.classList.add('ph-lab-row');
    button.classList.toggle('has-error', error);
    return [button];
  }

  function openShortsMore(): void {
    const rows: HTMLElement[] = [];
    if (!$('#shorts-voice')?.hidden) {
      const mic = $('#shorts-mic');
      const cam = $('#shorts-cam');
      rows.push(row('🎙', mic?.title || t('voice.join'), press('#shorts-mic')));
      if (cam && !cam.hidden) rows.push(row('📷', cam.title || t('voice.camOn'), press('#shorts-cam')));
    }
    const inviteRow = row('🔗', t('phone.more.invite'), () => invite($('#ph-shorts-more')!));
    rows.push(
      row('＋', t('shorts.add'), press('#shorts-add')),
      row('♾', $('#shorts-feed-label')?.textContent || t('feed.short'), press('#shorts-feed')),
      row('🎮', t('tool.game'), press('#shorts-game')),
      row('🔁', t('shorts.loop'), press('#shorts-loop'), roomLoop() ? '✓' : undefined),
      inviteRow,
      row('⚙️', t('tab.settings'), () => {
        closeSheet();
        deps.openSettings();
      }),
      row('↩', t('shorts.roomView'), press('#shorts-exit')),
      ...labRow(),
    );
    openSheet({ name: 'shorts-more', nodes: rows });
  }
  const roomLoop = () => $('#shorts-loop')?.getAttribute('aria-pressed') === 'true';

  // The newest message from someone else shows in the bar for a few seconds (the chat itself is one tap away).
  let toastTimer = 0;
  const chatList = $('#chat-list');
  if (chatList) {
    new MutationObserver((records) => {
      const shortsOn = html.classList.contains('ph-shorts');
      const sidewaysOn = html.classList.contains('ph-room') && html.classList.contains('sideways');
      if ((!shortsOn && !sidewaysOn) || sheet.dataset.sheet === 'shorts-chat' && !sheet.hidden) return;
      // A full redraw (language change, history) adds many lines at once: only a single new line is a new message.
      if (records.length !== 1 || records[0]!.addedNodes.length !== 1) return;
      const line = records[0]!.addedNodes[0];
      if (!(line instanceof HTMLElement) || !line.classList.contains('chat-line') || line.classList.contains('me')) return;
      let name = line.querySelector('.chat-name')?.textContent ?? '';
      // A follow-up line from the same person has no name: take it from the line above.
      for (let prev = line.previousElementSibling; !name && prev; prev = prev.previousElementSibling) name = prev.querySelector('.chat-name')?.textContent ?? '';
      const text = line.querySelector('.chat-text')?.textContent ?? (line.querySelector('.chat-image-btn, .chat-image-missing') ? '🖼️' : '');
      if (!text) return;
      // PH1: 💬 counts what came in while the chat was out of sight (Shorts, and a phone held sideways).
      unread++;
      drawUnread();
      if (!shortsOn || !sheet.hidden) return;
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
    if (now) {
      closeSheet();
      if (tab !== 'room') setTab('room');
    }
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
  // A minimized table puts a dot on the Games tab, which brings it back.
  const gameButton = $<HTMLButtonElement>('#game-btn');
  if (gameButton) {
    const sync = () => tabButtons.get('games')?.classList.toggle('game-waiting', gameButton.classList.contains('game-waiting'));
    new MutationObserver(sync).observe(gameButton, { attributes: true, attributeFilter: ['class'] });
    sync();
  }

  // ---- Fullscreen on a phone (0.9.92.6, owner; PH1: ⛶ Watch fullscreen is in the sideways column) ----
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
  // PH1: with a video, the sideways column also holds 💬 (the chat as a sheet, with a count) and 🎙 (voice's own).
  const sideChat = el('button', { type: 'button', class: 'btn ph-turn-chat', id: 'ph-side-chat' }, '💬 ', el('span', { 'data-i18n': 'phone.chat' }, t('phone.chat')), unreadBadge());
  sideChat.addEventListener('click', () => openShortsChat());
  const sideMic = el('button', { type: 'button', class: 'btn ph-turn-mic', id: 'ph-side-mic' }, '🎙 ', el('span', { 'data-i18n': 'voice.join' }, t('voice.join')));
  sideMic.addEventListener('click', () => $<HTMLButtonElement>('#strip-mic')?.click());
  const turn = el('div', { class: 'ph-turn' }, turnFs, sideChat, sideMic, turnText);
  roomBox?.append(turn);
  // BH13: a video that can't be played here (the player's error card) has nothing to watch fullscreen.
  const playerError = $('#player-error');
  const drawTurn = () => {
    const playing = !!$('.room.has-item') && (!playerError || playerError.hidden);
    turnFs.hidden = sideChat.hidden = sideMic.hidden = !playing;
    turnText.textContent = t(playing ? 'phone.turn.or' : 'phone.turn.upright');
  };
  if (roomBox) new MutationObserver(drawTurn).observe(roomBox, { attributes: true, attributeFilter: ['class'] });
  if (playerError) new MutationObserver(drawTurn).observe(playerError, { attributes: true, attributeFilter: ['hidden'] });
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

  onPhoneLayout(decide);
  new MutationObserver(decide).observe(html, { attributes: true, attributeFilter: ['class'] });
  decide();

  // 🐞 Test Lab (PH1): the tab, the input row's state and which of the room's controls show.
  const shows = (sel: string) => {
    const node = $(sel);
    return !!node && node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden';
  };
  const phoneState = () => ({
    on: html.classList.contains('ph-room'),
    tab,
    typing: !!$<HTMLInputElement>('#chat-input')?.value,
    sheet: sheet.hidden ? null : (sheet.dataset.sheet ?? null),
    unread,
    visible: Object.fromEntries(
      ['#chat-invite', '#chat-input', '#strip-mic', '#strip-cam', '#chat-send', '#chat-react', '.ph-strip-tools', '.ph-tabs', '.ph-empty-actions', '.ph-turn']
        .map((sel) => [sel, shows(sel)]),
    ),
  });
  debugHooks.register('phoneRoom', () => ({
    commands: [{
      id: 'phoneRoom.state',
      tab: 'screen',
      title: { en: 'Phone room: what shows now', tr: 'Telefon odası: şu an ne görünüyor' },
      help: { en: 'Writes the open tab, the input row and the visible buttons into the log.', tr: 'Açık sekmeyi, yazma satırını ve görünen düğmeleri kayda yazar.' },
      available: () => html.classList.contains('ph-room') || { en: 'not the phone room', tr: 'telefon odası değil' },
      run: () => JSON.stringify(phoneState()),
    }],
    status: () => html.classList.contains('ph-room') ? [[{ en: 'Phone tab', tr: 'Telefon sekmesi' }, tab]] : [],
  }));

  return {
    /** The cameras on screen (member → picture), from the voice card. */
    setCams(next: Map<string, MediaStream>): void {
      cams = next;
      placeCams();
    },
    closeSheet,
    /** The hidden 🎮 the games hall opens beside on the Games tab (for games/stage.ts' triggers). */
    gamesButton,
    /** PH1: the settings window shows as the Me tab on a phone; false when this isn't the phone room. */
    openMe(section?: SettingsSection): boolean {
      if (!html.classList.contains('ph-room')) return false;
      setTab('me');
      const card = section && meBody.querySelector<HTMLElement>(`[data-me-card="${section === 'save' ? 'room' : section}"]`);
      card?.scrollIntoView({ block: 'start' });
      return true;
    },
    setTab,
  };
}
