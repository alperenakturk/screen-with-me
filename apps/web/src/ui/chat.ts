import { CHAT_MAX_LENGTH, cleanChatText, type ChatMessage, type ClientMessage } from '@swm/shared/protocol';
import { el } from '../dom.ts';
import { avatarNode } from './avatar.ts';
import { t } from '../i18n.ts';
import { load, save } from '../storage.ts';

const MAX_LINES = 120;

type Line = { kind: 'chat'; message: ChatMessage } | { kind: 'system'; at: number; text: () => string };

/**
 * Sohbet sekmesi: mesaj geçmişi ve yazma kutusu. "Ali durdurdu" gibi oda
 * hareketleri de gri sistem satırı olarak aynı akışa düşer. Sekme açık değilken
 * gelen mesajlar okunmamış sayılır.
 */
export function createChatPanel(
  root: HTMLElement,
  send: (message: ClientMessage) => void,
  myId: () => string | null,
  onUnread: (count: number) => void,
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

  const time = (at: number) => new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  function node(line: Line): HTMLLIElement {
    if (line.kind === 'system') {
      return el('li', { class: 'chat-system' }, el('time', {}, time(line.at)), ' ', line.text());
    }
    const { message } = line;
    const mine = message.by.id === myId();
    return el(
      'li',
      { class: mine ? 'chat-line me' : 'chat-line' },
      avatarNode(message.by.avatar, 'chat-avatar'),
      el(
        'div',
        { class: 'chat-body' },
        el('div', { class: 'chat-meta' }, el('span', { class: 'chat-name' }, message.by.name), el('time', {}, time(message.at))),
        el('p', { class: 'chat-text' }, message.text),
      ),
    );
  }

  function scrollToEnd(): void {
    list.scrollTop = list.scrollHeight;
  }

  function render(): void {
    list.replaceChildren(el('li', { class: 'chat-empty' }, t('chatEmpty')), ...lines.map(node));
    drawEvents();
    scrollToEnd();
  }

  function push(line: Line, countsAsUnread: boolean): void {
    const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 60;
    lines.push(line);
    if (lines.length > MAX_LINES) lines = lines.slice(-MAX_LINES);
    list.append(node(line));
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
