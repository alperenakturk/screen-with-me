import { CHAT_MAX_LENGTH, cleanChatText, type ChatMessage, type ClientMessage } from '@swm/shared/protocol';
import { el, rememberOpen } from '../dom.ts';
import { t } from '../i18n.ts';
import { load, save } from '../storage.ts';

/** Basit sohbet paneli. Kapalıyken gelen mesajlar rozet olarak sayılır. */
export function createChatPanel(root: HTMLElement, send: (message: ClientMessage) => void, myId: () => string | null) {
  const panel = root.querySelector<HTMLDetailsElement>('#chat-panel')!;
  const list = root.querySelector<HTMLUListElement>('#chat-list')!;
  const badge = root.querySelector<HTMLElement>('#chat-badge')!;
  const form = root.querySelector<HTMLFormElement>('#chat-form')!;
  const input = root.querySelector<HTMLInputElement>('#chat-input')!;
  input.maxLength = CHAT_MAX_LENGTH;
  let messages: ChatMessage[] = [];
  let unread = 0;

  rememberOpen(panel, 'panel:chat', load, save);
  panel.addEventListener('toggle', () => {
    if (panel.open) {
      unread = 0;
      renderBadge();
      scrollToEnd();
      input.focus();
    }
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = cleanChatText(input.value);
    if (text === null) return;
    send({ t: 'chat', text });
    input.value = '';
  });

  function renderBadge(): void {
    badge.hidden = unread === 0;
    badge.textContent = unread > 9 ? '9+' : String(unread);
  }

  function scrollToEnd(): void {
    list.scrollTop = list.scrollHeight;
  }

  function line(message: ChatMessage): HTMLLIElement {
    const mine = message.by.id === myId();
    const time = new Date(message.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return el(
      'li',
      { class: mine ? 'chat-line me' : 'chat-line' },
      el('span', { class: 'chat-name' }, message.by.name),
      el('time', { class: 'muted' }, time),
      el('p', { class: 'chat-text' }, message.text),
    );
  }

  function render(): void {
    list.replaceChildren(...(messages.length ? messages.map(line) : [el('li', { class: 'muted small' }, t('chatEmpty'))]));
    scrollToEnd();
  }

  return {
    set(next: ChatMessage[]): void {
      messages = next;
      render();
    },
    add(message: ChatMessage): void {
      const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 40;
      messages = [...messages, message].slice(-50);
      if (messages.length === 1) list.replaceChildren();
      list.append(line(message));
      if (list.children.length > 50) list.firstElementChild?.remove();
      if (atBottom || message.by.id === myId()) scrollToEnd();
      if (!panel.open && message.by.id !== myId()) {
        unread++;
        renderBadge();
      }
    },
    render,
  };
}
