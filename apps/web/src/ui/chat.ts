import { CHAT_MAX_LENGTH, cleanChatText, personOf, type ChatMessage, type ClientMessage, type Member } from '@swm/shared/protocol';
import { el } from '../dom.ts';
import { avatarNode } from './avatar.ts';
import { lang, t, type I18nKey } from '../i18n.ts';
import { confirmDialog } from './confirm.ts';
import { load, save } from '../storage.ts';
import { linkify } from './links.ts';
import { setIcon } from './icons.ts';
import { isPhoneLayout } from '../device.ts';
import { menuKeys } from './menu-keys.ts';
import { loadChunk } from './lazy.ts';

/**
 * Card CH1: how much of the room's chat stays loaded here (the server keeps at least 1,000 messages; older pages load on
 * scroll-up). The room's activity lines ("Alex paused") have their own small cap: they used to share one 120-line cap
 * with the chat, so a busy room pushed real messages out of the list.
 */
const CHAT_LINES_MAX = 1200;
const SYSTEM_LINES_MAX = 150;
/** Aynı kişinin bu kadar süre içindeki art arda mesajları tek balon grubunda (isim/avatar bir kez). */
const GROUP_MS = 3 * 60_000;

type Line = { kind: 'chat'; message: ChatMessage } | { kind: 'system'; at: number; text: () => string };

/**
 * Sohbet sekmesi: mesaj geçmişi (mesajlaşma uygulamaları gibi balonlar: benimkiler sağda vurgu renginde, diğerleri
 * solda avatarla; aynı kişinin art arda mesajları birleşir) ve yazma kutusu. "Ali durdurdu" gibi oda
 * hareketleri de gri sistem satırı olarak aynı akışa düşer. Sekme açık değilken
 * gelen mesajlar okunmamış sayılır.
 */
export function createChatPanel(
  root: HTMLElement,
  send: (message: ClientMessage) => void,
  myId: () => string | null,
  onUnread: (count: number) => void,
  /** A link in a message was clicked (the room asks first, then opens a new tab). */
  openLink: (url: string) => void,
  /** SAFE1: someone I blocked for me; their lines stay in memory (an unblock shows them again) but are not drawn. */
  isBlocked: (by: Member) => boolean = () => false,
  /** MSG1: I am the (acting) host now (I may delete others' room messages). */
  amHost: () => boolean = () => false,
  /** MSG1: this sender is me (this tab, or my earlier tab: the same person key). */
  isMe: (by: Member) => boolean = (by) => by.id === myId(),
) {
  const list = root.querySelector<HTMLUListElement>('#chat-list')!;
  const form = root.querySelector<HTMLFormElement>('#chat-form')!;
  const input = root.querySelector<HTMLInputElement>('#chat-input')!;
  input.maxLength = CHAT_MAX_LENGTH;
  let lines: Line[] = [];
  /** CH1: the drawn node of each shown line (a line trimmed off the top takes its node with it). */
  const nodes = new Map<Line, HTMLElement>();
  /** CH1: the server keeps older chat: the page to ask for next (undefined: everything is here). */
  let olderPage: number | undefined;
  let asking = false;
  let visible = false;
  let unread = 0;

  // Oda hareketleri ("Ali durdurdu") hep kaydedilir ama varsayılan gizli: sohbeti boğuyordu.
  // Sağ üstteki küçük düğme hem eskileri hem yeni gelecekleri gösterir.
  const eventsButton = root.querySelector<HTMLButtonElement>('#chat-events')!;
  // PH1: the phone room is one feed (chat + the room's activity), so a phone starts with the activity shown.
  let showEvents = (load('opt:chatEvents') ?? (isPhoneLayout() ? '1' : '0')) === '1';
  const drawEvents = () => {
    list.classList.toggle('hide-events', !showEvents);
    eventsButton.setAttribute('aria-pressed', String(showEvents));
    const hidden = lines.filter((line) => line.kind === 'system').length;
    eventsButton.textContent = showEvents ? t('eventsHide') : hidden ? t('eventsShowN', { n: hidden }) : t('eventsShow');
    eventsButton.title = t('eventsTitle');
    // Nothing to show yet: no button (it read as a control with no purpose in an empty chat, first-look review).
    eventsButton.hidden = !showEvents && hidden === 0;
  };
  eventsButton.addEventListener('click', () => {
    showEvents = !showEvents;
    save('opt:chatEvents', showEvents ? '1' : '0');
    drawEvents();
    scrollToEnd();
  });
  window.addEventListener('langchange', drawEvents);
  drawEvents();

  // R13 private messages: while `privateTo` is set the box writes to that person only (a bar above it says so; ✕ or
  // Esc goes back to the room chat). No images in private: they live in the room's shared image store.
  let privateTo: Member | null = null;
  const privateText = el('span', { class: 'chat-private-text' });
  const privateEnd = el('button', { type: 'button', class: 'chat-private-end' }, '✕');
  const privateBar = el('div', { class: 'chat-private', hidden: '', role: 'status' }, privateText, privateEnd);
  form.before(privateBar);
  const drawPrivate = () => {
    privateBar.hidden = !privateTo;
    form.classList.toggle('private', !!privateTo);
    privateEnd.title = t('chat.privateEnd');
    privateEnd.setAttribute('aria-label', t('chat.privateEnd'));
    if (privateTo) {
      privateText.textContent = t('chat.privateBar', { name: privateTo.name });
      input.placeholder = t('chat.privatePlaceholder', { name: privateTo.name });
    } else {
      const key = input.dataset.i18nPlaceholder as I18nKey | undefined;
      if (key) input.placeholder = t(key);
    }
  };
  const setPrivate = (member: Member | null) => {
    privateTo = member && member.id !== myId() ? member : null;
    drawPrivate();
    if (privateTo) input.focus();
  };
  privateEnd.addEventListener('click', () => {
    setPrivate(null);
    input.focus();
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && privateTo) {
      event.preventDefault();
      event.stopPropagation();
      setPrivate(null);
    }
  });
  window.addEventListener('langchange', drawPrivate);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = cleanChatText(input.value);
    if (text === null) return;
    send(privateTo ? { t: 'chat', text, to: privateTo.id } : { t: 'chat', text });
    input.value = '';
  });

  // Images in chat (owner's feedback, 0.9.88): 🖼️ button, paste or drop a picture. It is shown first with the
  // typed text as its caption, and goes to the room only after "Send".
  const images = new Map<string, string>();
  const attach = root.querySelector<HTMLButtonElement>('#chat-attach')!;
  setIcon(attach, 'image-add');
  const fileInput = el('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/gif', hidden: '' }) as HTMLInputElement;
  form.append(fileInput);
  attach.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (file) void sendImage(file);
  });
  input.addEventListener('paste', (event) => {
    const file = [...(event.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'));
    if (!file) return;
    event.preventDefault();
    void sendImage(file);
  });
  const panel = list.closest<HTMLElement>('.chat-panel') ?? list;
  panel.addEventListener('dragover', (event) => {
    if (![...(event.dataTransfer?.types ?? [])].includes('Files')) return;
    event.preventDefault();
    panel.classList.add('drop-on');
  });
  panel.addEventListener('dragleave', () => panel.classList.remove('drop-on'));
  panel.addEventListener('drop', (event) => {
    panel.classList.remove('drop-on');
    const file = [...(event.dataTransfer?.files ?? [])].find((f) => f.type.startsWith('image/'));
    if (!file) return;
    event.preventDefault();
    void sendImage(file);
  });

  async function sendImage(file: File): Promise<void> {
    let data: string;
    try {
      data = await (await import('@swm/shared/sticker-file')).fileToChatImage(file);
    } catch (error) {
      const code = error instanceof Error && ['type', 'too_big'].includes(error.message) ? error.message : 'broken';
      alert(t(`chatImageError.${code}` as I18nKey));
      return;
    }
    const caption = cleanChatText(input.value);
    const extra = el(
      'div',
      { class: 'chat-image-confirm' },
      el('img', { class: 'chat-image-preview', src: data, alt: '' }),
      caption ? el('p', { class: 'small' }, caption) : '',
    );
    const ok = await confirmDialog({ icon: '🖼️', title: t('chatImage.title'), text: t('chatImage.note'), yes: t('chatImage.send'), extra });
    if (!ok) return;
    send({ t: 'chat', text: caption ?? '', image: data });
    input.value = '';
  }

  function imageNode(id: string): HTMLElement {
    const data = images.get(id);
    if (!data) return el('span', { class: 'chat-image-missing', 'data-image': id }, `🖼️ ${t('chatImage.missing')}`);
    const img = el('img', { class: 'chat-image', src: data, alt: t('chatImage.alt') }) as HTMLImageElement;
    const button = el('button', { type: 'button', class: 'chat-image-btn', 'data-image': id, title: t('chatImage.open') }, img);
    // Keep the newest message in view once the picture has its height.
    img.addEventListener('load', () => {
      if (list.scrollHeight - list.scrollTop - list.clientHeight < img.height + 80) scrollToEnd();
    });
    button.addEventListener('click', () => openViewer(data));
    return button;
  }

  /** Full-size view; a click anywhere or Esc closes it. */
  function openViewer(data: string): void {
    const backdrop = el('div', { class: 'dialog-backdrop image-viewer', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('chatImage.alt') }, el('img', { src: data, alt: '' }));
    const close = () => {
      backdrop.remove();
      document.removeEventListener('keydown', onKey, true);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      close();
    };
    backdrop.addEventListener('click', close);
    document.addEventListener('keydown', onKey, true);
    document.body.append(backdrop);
  }

  // The site's language decides the clock, not the browser's (owner, 13 Nov 2026: a Turkish screen showed "12:18 PM").
  const time = (at: number) => new Date(at).toLocaleTimeString(lang() === 'tr' ? 'tr-TR' : 'en-US', { hour: '2-digit', minute: '2-digit' });

  function node(line: Line, prev?: Line): HTMLLIElement {
    if (line.kind === 'system') {
      return el('li', { class: 'chat-system' }, el('span', {}, el('time', {}, time(line.at)), ' ', line.text()));
    }
    const { message } = line;
    if (message.deleted) {
      const own = personOf(message.deleted.by) === personOf(message.by);
      const text = own ? t('chat.deleted', { name: message.by.name }) : t('chat.deletedByHost', { host: message.deleted.by.name, name: message.by.name });
      return el('li', { class: `chat-deleted${message.to ? ' private' : ''}`, 'data-id': message.id }, el('span', {}, el('time', {}, time(message.at)), ' ', text));
    }
    const mine = message.by.id === myId();
    const priv = message.to;
    const cont =
      prev?.kind === 'chat' &&
      !prev.message.deleted &&
      prev.message.by.id === message.by.id &&
      prev.message.to?.id === priv?.id &&
      message.at - prev.message.at < GROUP_MS;
    // Someone else's name: a press writes back to them privately (R13).
    const nameButton = () => {
      const b = el('button', { type: 'button', class: 'chat-name', title: t('chat.privateWith', { name: message.by.name }) }, message.by.name);
      b.addEventListener('click', () => setPrivate(message.by));
      return b;
    };
    const label = priv
      ? (() => {
          const other = mine ? priv : message.by;
          const b = el(
            'button',
            { type: 'button', class: 'chat-private-label', title: t('chat.privateWith', { name: other.name }) },
            t(mine ? 'chat.privateTo' : 'chat.privateFrom', { name: other.name }),
          );
          b.addEventListener('click', () => setPrivate(other));
          return b;
        })()
      : null;
    const meta = mine
      ? el('div', { class: 'chat-meta' }, ...(label ? [label] : []), el('time', {}, time(message.at)))
      : el('div', { class: 'chat-meta' }, label ?? nameButton(), el('time', {}, time(message.at)));
    const more = deletable(message) ? [moreButton(message)] : [];
    return el(
      'li',
      { class: `chat-line${mine ? ' me' : ''}${cont ? ' cont' : ''}${priv ? ' private' : ''}`, title: time(message.at), 'data-id': message.id },
      ...(mine ? more : [avatarNode(message.by.avatar, 'chat-avatar')]),
      el(
        'div',
        { class: 'chat-body' },
        ...(cont ? [] : [meta]),
        ...(message.image ? [imageNode(message.image)] : []),
        ...(message.text ? [el('p', { class: 'chat-text' }, ...linkify(message.text, openLink))] : []),
      ),
      ...(mine ? [] : more),
    );
  }

  // MSG1: "Delete for everyone" in a message's menu (⋯ on hover or focus on a computer, a long press on a phone): my
  // own messages, and anyone's room message for the host. The server checks again and has the last word.
  function deletable(message: ChatMessage): boolean {
    if (message.deleted) return false;
    return isMe(message.by) || (amHost() && !message.to);
  }
  const menuItem = el('button', { type: 'button', role: 'menuitem', class: 'chat-menu-item' });
  const menu = el('div', { class: 'chat-menu', role: 'menu', hidden: '' }, menuItem);
  document.body.append(menu);
  let menuFor: { message: ChatMessage; button: HTMLElement } | null = null;
  const closeMenu = () => {
    menu.hidden = true;
    menuFor?.button.setAttribute('aria-expanded', 'false');
    menuFor?.button.closest('.chat-line')?.classList.remove('menu-open');
    menuFor = null;
  };
  // Esc gives the focus back to the ⋯ that opened the menu (menuKeys focuses this stand-in after closing).
  let opener: HTMLElement | null = null;
  const keys = menuKeys(menu, { focus: () => opener?.isConnected && opener.focus() } as unknown as HTMLElement, closeMenu);
  // The menu opens under its anchor (the ⋯, or the bubble after a long press) and stays inside the chat panel, so it
  // never reaches over the video (QA1 first look).
  // The menu's and ⋯'s styles are a lazy stylesheet (the room page's CSS budget), asked for as the chat starts.
  const menuCss = loadChunk(() => import('./chat-menu-css.ts'));
  async function openMenu(message: ChatMessage, button: HTMLElement, anchor: HTMLElement = button): Promise<void> {
    closeMenu();
    await menuCss;
    if (!button.isConnected) return;
    menuFor = { message, button };
    opener = button;
    menuItem.textContent = t('chat.delete');
    menu.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    button.closest('.chat-line')?.classList.add('menu-open');
    const r = anchor.getBoundingClientRect();
    const box = list.getBoundingClientRect();
    const w = menu.offsetWidth;
    const h = menu.offsetHeight;
    const mine = !!button.closest('.chat-line.me');
    const min = Math.max(8, box.left + 4);
    const max = Math.min(window.innerWidth - 8, box.right - 4) - w;
    const left = Math.max(min, Math.min(max, mine ? r.right - w : r.left));
    const top = r.bottom + 4 + h > window.innerHeight - 8 ? Math.max(8, r.top - h - 4) : r.bottom + 4;
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    keys.focusFirst();
  }
  function moreButton(message: ChatMessage): HTMLElement {
    const b = el('button', { type: 'button', class: 'chat-more', 'aria-haspopup': 'menu', 'aria-expanded': 'false', 'aria-label': t('chat.more'), title: t('chat.more') }, '⋯');
    b.addEventListener('click', (event) => {
      event.stopPropagation();
      if (menuFor?.button === b) closeMenu();
      else void openMenu(message, b);
    });
    return b;
  }
  menuItem.addEventListener('click', () => {
    const target = menuFor;
    closeMenu();
    if (target) void askDelete(target.message, target.button);
  });
  document.addEventListener('pointerdown', (event) => {
    if (menuFor && !menu.contains(event.target as Node) && !menuFor.button.contains(event.target as Node)) closeMenu();
  });
  list.addEventListener('scroll', () => menuFor && closeMenu(), { passive: true });
  window.addEventListener('resize', () => menuFor && closeMenu());
  async function askDelete(message: ChatMessage, focusBack: HTMLElement): Promise<void> {
    const yes = await confirmDialog({ icon: '🗑', title: t('chat.deleteTitle'), text: t('chat.deleteText'), yes: t('chat.deleteYes') });
    if (yes) send({ t: 'chat-delete', id: message.id });
    else if (focusBack.isConnected) focusBack.focus();
  }
  /** The message of a drawn line (by its `data-id`), when I may delete it. */
  const deletableAt = (target: EventTarget | null): { message: ChatMessage; line: HTMLElement } | null => {
    const line = (target as Element | null)?.closest?.<HTMLElement>('.chat-line[data-id]');
    const found = line && lines.find((l): l is Extract<Line, { kind: 'chat' }> => l.kind === 'chat' && l.message.id === line.dataset.id);
    return found && line && deletable(found.message) ? { message: found.message, line } : null;
  };
  // A long press on a phone (Android fires contextmenu; iOS doesn't, so a 500 ms touch timer opens it too).
  let press: { timer: number; x: number; y: number } | null = null;
  const cancelPress = () => {
    if (press) clearTimeout(press.timer);
    press = null;
  };
  list.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'touch') return;
    const hit = deletableAt(event.target);
    if (!hit) return;
    const { clientX: x, clientY: y } = event;
    press = { x, y, timer: window.setTimeout(() => {
      press = null;
      openLong(hit);
    }, 500) };
  });
  list.addEventListener('pointermove', (event) => {
    if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 10) cancelPress();
  });
  for (const type of ['pointerup', 'pointercancel'] as const) list.addEventListener(type, cancelPress);
  list.addEventListener('contextmenu', (event) => {
    if (!(event as PointerEvent).pointerType || (event as PointerEvent).pointerType === 'mouse') return;
    const hit = deletableAt(event.target);
    if (!hit) return;
    event.preventDefault();
    cancelPress();
    openLong(hit);
  });
  function openLong(hit: { message: ChatMessage; line: HTMLElement }): void {
    void openMenu(hit.message, hit.line.querySelector<HTMLElement>('.chat-more') ?? hit.line, hit.line.querySelector<HTMLElement>('.chat-body') ?? hit.line);
  }

  function scrollToEnd(): void {
    list.scrollTop = list.scrollHeight;
  }

  /** CH1: "Show earlier messages" at the top while the server has older chat (scrolling to the top asks too). */
  const olderButton = el('button', { type: 'button', class: 'btn small-btn chat-older', style: 'display:block;margin:4px auto' }, t('chatOlder'));
  olderButton.addEventListener('click', () => askOlder());
  const olderItem = el('li', { class: 'chat-older-row' }, olderButton);

  function askOlder(): void {
    if (olderPage === undefined || asking) return;
    asking = true;
    olderButton.disabled = true;
    olderButton.textContent = t('chatOlderLoading');
    send({ t: 'chat-older', page: olderPage });
  }
  list.addEventListener('scroll', () => {
    if (list.scrollTop < 40 && list.scrollHeight > list.clientHeight) askOlder();
  });

  function render(keepPlace = false): void {
    const fromBottom = list.scrollHeight - list.scrollTop;
    const visibleLines = lines.filter(shown);
    nodes.clear();
    const drawn = visibleLines.map((line, i) => {
      const n = node(line, visibleLines[i - 1]);
      nodes.set(line, n);
      return n;
    });
    olderButton.disabled = false;
    olderButton.textContent = t('chatOlder');
    list.replaceChildren(el('li', { class: 'chat-empty' }, t('chatEmpty')), ...(olderPage === undefined ? [] : [olderItem]), ...drawn);
    drawEvents();
    if (keepPlace) list.scrollTop = list.scrollHeight - fromBottom;
    else scrollToEnd();
  }

  /** CH1: the oldest chat lines past CHAT_LINES_MAX and activity lines past SYSTEM_LINES_MAX leave (with their nodes). */
  function trim(): void {
    let chats = lines.filter((line) => line.kind === 'chat').length;
    let systems = lines.length - chats;
    if (chats <= CHAT_LINES_MAX && systems <= SYSTEM_LINES_MAX) return;
    lines = lines.filter((line) => {
      if (line.kind === 'chat' ? chats > CHAT_LINES_MAX : systems > SYSTEM_LINES_MAX) {
        if (line.kind === 'chat') chats--;
        else systems--;
        nodes.get(line)?.remove();
        nodes.delete(line);
        return false;
      }
      return true;
    });
    // Older pages would come back above the gap: stop offering them once the list is full.
    if (chats >= CHAT_LINES_MAX) {
      olderPage = undefined;
      olderItem.remove();
    }
  }

  const shown = (line: Line) => line.kind !== 'chat' || line.message.by.id === myId() || !isBlocked(line.message.by);

  function push(line: Line, countsAsUnread: boolean): void {
    if (!shown(line)) {
      lines.push(line);
      trim();
      return;
    }
    const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 60;
    const prev = [...lines].reverse().find(shown);
    lines.push(line);
    const drawn = node(line, prev);
    nodes.set(line, drawn);
    list.append(drawn);
    trim();
    if (line.kind === 'system') drawEvents();
    if (atBottom || (line.kind === 'chat' && line.message.by.id === myId())) scrollToEnd();
    if (countsAsUnread && !visible) {
      unread++;
      onUnread(unread);
    }
  }

  return {
    /** The room's chat on (re)joining; `more`: the server keeps older pages (CH1). */
    set(messages: ChatMessage[], more?: number): void {
      lines = messages.map((message) => ({ kind: 'chat', message }));
      olderPage = more;
      asking = false;
      render();
    },
    /** CH1: an older page arrived (oldest first): it goes on top, the reader's place stays. */
    older(messages: ChatMessage[], more?: number): void {
      asking = false;
      const have = new Set(lines.flatMap((line) => (line.kind === 'chat' ? [line.message.id] : [])));
      const fresh = messages.filter((message) => !have.has(message.id));
      lines = [...fresh.map((message): Line => ({ kind: 'chat', message })), ...lines];
      olderPage = more;
      trim();
      render(true);
    },
    /** CH1 Test Lab: how much chat is loaded here and whether older pages are offered. */
    history(): { loaded: number; system: number; olderPage: number | null } {
      const loaded = lines.filter((line) => line.kind === 'chat').length;
      return { loaded, system: lines.length - loaded, olderPage: olderPage ?? null };
    },
    add(message: ChatMessage): void {
      push({ kind: 'chat', message }, message.by.id !== myId());
    },
    /**
     * MSG1: a message was deleted: its line becomes "Alex deleted a message". A private one arrives without its
     * details (they are never stored), so the bubble I hold keeps its sender, recipient and time.
     */
    deleted(message: ChatMessage): void {
      const line = lines.find((l): l is Extract<Line, { kind: 'chat' }> => l.kind === 'chat' && l.message.id === message.id);
      if (!line || line.message.deleted || !message.deleted) return;
      if (menuFor?.message.id === message.id) closeMenu();
      const { image: _image, ...kept } = line.message;
      line.message = line.message.to ? { ...kept, text: '', deleted: message.deleted } : message;
      render(true);
    },
    /** MSG1 Test Lab: my newest message I may delete (null: none), and how many lines read "deleted". */
    deleteState(): { mine: string | null; deleted: number } {
      const mine = [...lines].reverse().find((l): l is Extract<Line, { kind: 'chat' }> => l.kind === 'chat' && !l.message.deleted && isMe(l.message.by));
      return { mine: mine?.message.id ?? null, deleted: lines.filter((l) => l.kind === 'chat' && l.message.deleted).length };
    },
    /** Data of a chat image (it may arrive after its message: the placeholder is replaced). */
    setImage(id: string, data: string): void {
      images.set(id, data);
      for (const old of list.querySelectorAll<HTMLElement>(`.chat-image-missing[data-image="${id}"]`)) old.replaceWith(imageNode(id));
    },
    /** Gri sistem satırı (oda hareketleri). Okunmamış sayılmaz. */
    system(text: () => string): void {
      push({ kind: 'system', at: Date.now(), text }, false);
    },
    /** Sohbet sekmesi açıldı/kapandı. */
    setVisible(value: boolean): void {
      visible = value;
      if (visible) {
        unread = 0;
        onUnread(0);
        scrollToEnd();
      }
    },
    render,
    /** R13: write to this person privately (the person menu's "Message privately"); null = the room chat again. */
    privateTo: setPrivate,
    /** SAFE1: the last chat lines this person sent (for a report), oldest first; pictures read as 🖼️. */
    linesBy(member: Member, count: number): string[] {
      return lines
        .filter((line): line is Extract<Line, { kind: 'chat' }> => line.kind === 'chat' && !line.message.deleted && personOf(line.message.by) === personOf(member))
        .slice(-count)
        .map((line) => (line.message.image ? `🖼️ ${line.message.text}`.trim() : line.message.text));
    },
    /** The private message could not go (they left): back to the room chat. */
    privateGone(): void {
      setPrivate(null);
    },
  };
}
