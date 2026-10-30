import { CHAT_MAX_LENGTH, cleanChatText, type ChatMessage, type ClientMessage } from '@swm/shared/protocol';
import { fileToChatImage } from '@swm/shared/sticker-file';
import { el } from '../dom.ts';
import { avatarNode } from './avatar.ts';
import { t, type I18nKey } from '../i18n.ts';
import { confirmDialog } from './confirm.ts';
import { load, save } from '../storage.ts';
import { linkify } from './links.ts';
import { setIcon } from './icons.ts';

const MAX_LINES = 120;
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
) {
  const list = root.querySelector<HTMLUListElement>('#chat-list')!;
  const form = root.querySelector<HTMLFormElement>('#chat-form')!;
  const input = root.querySelector<HTMLInputElement>('#chat-input')!;
  input.maxLength = CHAT_MAX_LENGTH;
  let lines: Line[] = [];
  let visible = false;
  let unread = 0;

  // Oda hareketleri ("Ali durdurdu") hep kaydedilir ama varsayılan gizli: sohbeti boğuyordu.
  // Sağ üstteki küçük düğme hem eskileri hem yeni gelecekleri gösterir.
  const eventsButton = root.querySelector<HTMLButtonElement>('#chat-events')!;
  let showEvents = load('opt:chatEvents') === '1';
  const drawEvents = () => {
    list.classList.toggle('hide-events', !showEvents);
    eventsButton.setAttribute('aria-pressed', String(showEvents));
    const hidden = lines.filter((line) => line.kind === 'system').length;
    eventsButton.textContent = showEvents ? t('eventsHide') : hidden ? t('eventsShowN', { n: hidden }) : t('eventsShow');
    eventsButton.title = t('eventsTitle');
  };
  eventsButton.addEventListener('click', () => {
    showEvents = !showEvents;
    save('opt:chatEvents', showEvents ? '1' : '0');
    drawEvents();
    scrollToEnd();
  });
  window.addEventListener('langchange', drawEvents);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = cleanChatText(input.value);
    if (text === null) return;
    send({ t: 'chat', text });
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
      data = await fileToChatImage(file);
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

  const time = (at: number) => new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  function node(line: Line, prev?: Line): HTMLLIElement {
    if (line.kind === 'system') {
      return el('li', { class: 'chat-system' }, el('span', {}, el('time', {}, time(line.at)), ' ', line.text()));
    }
    const { message } = line;
    const mine = message.by.id === myId();
    const cont = prev?.kind === 'chat' && prev.message.by.id === message.by.id && message.at - prev.message.at < GROUP_MS;
    const meta = mine
      ? el('div', { class: 'chat-meta' }, el('time', {}, time(message.at)))
      : el('div', { class: 'chat-meta' }, el('span', { class: 'chat-name' }, message.by.name), el('time', {}, time(message.at)));
    return el(
      'li',
      { class: `chat-line${mine ? ' me' : ''}${cont ? ' cont' : ''}`, title: time(message.at) },
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

  function render(): void {
    list.replaceChildren(el('li', { class: 'chat-empty' }, t('chatEmpty')), ...lines.map((line, i) => node(line, lines[i - 1])));
    drawEvents();
    scrollToEnd();
  }

  function push(line: Line, countsAsUnread: boolean): void {
    const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 60;
    const prev = lines.at(-1);
    lines.push(line);
    if (lines.length > MAX_LINES) lines = lines.slice(-MAX_LINES);
    list.append(node(line, prev));
    while (list.children.length > MAX_LINES + 1) list.children[1]?.remove();
    if (line.kind === 'system') drawEvents();
    if (atBottom || (line.kind === 'chat' && line.message.by.id === myId())) scrollToEnd();
    if (countsAsUnread && !visible) {
      unread++;
      onUnread(unread);
    }
  }

  return {
    set(messages: ChatMessage[]): void {
      lines = messages.map((message) => ({ kind: 'chat', message }));
      render();
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
  };
}
