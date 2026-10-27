import { CHAT_MAX_LENGTH, cleanChatText, type ChatMessage, type ClientMessage } from '@swm/shared/protocol';
import { el } from '../dom.ts';
import { avatarNode } from './avatar.ts';
import { t } from '../i18n.ts';
import { load, save } from '../storage.ts';

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
      el('div', { class: 'chat-body' }, ...(cont ? [] : [meta]), el('p', { class: 'chat-text' }, message.text)),
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
