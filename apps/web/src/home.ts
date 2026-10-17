import { ROOM_ID_PATTERN } from '@wb/shared/protocol';
import { translate } from './i18n.ts';

// Karışan harfler (l/1, o/0) yok; linki sesli okurken bile hata olmasın.
const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';

export function newRoomId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

/** "https://site/r/abc123", "site/r/abc123" veya sadece "abc123" kabul edilir. */
export function extractRoomId(input: string): string | null {
  const text = input.trim();
  const fromPath = text.match(/\/r\/([^/?#\s]+)/)?.[1];
  const id = fromPath ?? text;
  return ROOM_ID_PATTERN.test(id) ? id : null;
}

export function renderHome(app: HTMLElement): void {
  app.innerHTML = `
    <section class="hero">
      <h1>Watch Birlikte</h1>
      <p class="tagline" data-i18n="tagline"></p>
      <button id="create" type="button" class="btn primary big" data-i18n="createRoom"></button>
      <div class="divider"><span data-i18n="or"></span></div>
      <form id="join" class="row">
        <input id="join-input" data-i18n-placeholder="joinPlaceholder" autocomplete="off" />
        <button class="btn" data-i18n="join"></button>
      </form>
      <p id="join-error" class="error" data-i18n="invalidRoom" hidden></p>
    </section>
  `;
  translate(app);

  app.querySelector('#create')!.addEventListener('click', () => {
    location.assign(`/r/${newRoomId()}`);
  });

  const form = app.querySelector<HTMLFormElement>('#join')!;
  const input = app.querySelector<HTMLInputElement>('#join-input')!;
  const error = app.querySelector<HTMLElement>('#join-error')!;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const id = extractRoomId(input.value);
    error.hidden = id !== null;
    if (id !== null) location.assign(`/r/${id}`);
  });
}
