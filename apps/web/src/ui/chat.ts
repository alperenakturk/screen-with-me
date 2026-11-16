import { CHAT_MAX_LENGTH, cleanChatText, personOf, type ChatMessage, type ClientMessage, type Member } from '@swm/shared/protocol';
import { el } from '../dom.ts';
import { avatarNode } from './avatar.ts';
import { lang, t, type I18nKey } from '../i18n.ts';
import { confirmDialog } from './confirm.ts';
import { load, save } from '../storage.ts';
import { linkify } from './links.ts';
import { setIcon } from './icons.ts';
import { isPhoneLayout } from '../device.ts';

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
    const mine = message.by.id === myId();
    const priv = message.to;
    const cont =
      prev?.kind === 'chat' &&
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
    return el(
      'li',
      { class: `chat-line${mine ? ' me' : ''}${cont ? ' cont' : ''}${priv ? ' private' : ''}`, title: time(message.at) },
      ...(mine ? [] : [avatarNode(message.by.avatar, 'chat-avatar')]),
      el(
        'div',
        { class: 'chat-body' },
        ...(cont ? [] : [meta]),
        ...(message.image ? [imageNode(message.image)] : []),
        ...(message.text ? [el('p', { class: 'chat-text' }, ...linkify(message.text, openLink))] : []),
      ),
    );
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
        .filter((line): line is Extract<Line, { kind: 'chat' }> => line.kind === 'chat' && personOf(line.message.by) === personOf(member))
        .slice(-count)
        .map((line) => (line.message.image ? `🖼️ ${line.message.text}`.trim() : line.message.text));
    },
    /** The private message could not go (they left): back to the room chat. */
    privateGone(): void {
      setPrivate(null);
    },
  };
}
