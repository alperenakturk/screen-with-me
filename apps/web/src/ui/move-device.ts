// "📲 Move to another device" (CARDS.md "Move my things to another device"): sends this browser's game saves, saved
// rooms, emoji collection and default name / avatar to another browser once, through a short-lived 6-digit code (the
// server's `MoveLink` relays it and stores nothing). The old device shows the code and a QR (`/#move=<code>`), the new
// one types or scans it; the old device must press "Send" before anything leaves it. The new device merges
// (`mergeMove`: games keep the save that got further, lists are joined). A lazy chunk with its own texts.

import './move-device.css';
import { MOVE_CODE, MOVE_KEYS, decodeMove, encodeMove, mergeMove, packMove, type MoveKey } from '@swm/shared/move';
import { qrSvg } from '@swm/shared/qr';
import { el } from '../dom.ts';
import { lang } from '../i18n.ts';
import { load, save } from '../storage.ts';

const TEXT = {
  en: {
    title: '📲 Move to another device',
    intro: 'Your game progress, saved rooms, emoji collection and name go to your other browser once. Nothing is kept on our server.',
    send: 'Send from this device',
    get: 'Receive on this device',
    codeIs: 'Scan the QR code with the other device, or open any room on {site} there: profile picture → 📲 Move → Receive, and type this code:',
    waiting: 'Waiting for the other device… (the code works for 10 minutes)',
    asking: 'A device typed your code. Send your things to it?',
    yes: 'Send',
    no: 'No',
    sent: 'Done ✓ Your things are on the other device.',
    refusedHere: 'Not sent.',
    typeCode: 'The 6-digit code the other device shows',
    go: 'Get my things',
    askSent: 'Asked. Press “Send” on the other device…',
    none: 'No device shows this code (it may have run out). Make a new one there.',
    busy: 'Someone else is already using this code.',
    refused: 'The other device said no.',
    taken: 'That code was just taken. Try again.',
    expired: 'The code ran out. Make a new one.',
    failed: 'Could not connect. Check the connection and try again.',
    bad: 'What arrived could not be read.',
    moved: 'Moved: {list}. Reload the page to see everything.',
    nothing: 'Arrived, but this device already had everything (or more).',
    reload: '⟳ Reload',
    close: 'Close',
    'key.snackBar': 'Snack Bar',
    'key.windowGarden': 'Window Garden',
    'key.fiveFrames': 'Five Frames',
    'key.savedRooms': 'saved rooms',
    'key.stickerCollection': 'emoji collection',
    'key.name': 'name',
    'key.avatar': 'avatar',
  },
  tr: {
    title: '📲 Başka cihaza taşı',
    intro: 'Oyunlardaki ilerlemen, kayıtlı odaların, emoji koleksiyonun ve adın diğer tarayıcına bir kez gider. Sunucumuzda hiçbir şey kalmaz.',
    send: 'Bu cihazdan gönder',
    get: 'Bu cihaza al',
    codeIs: 'Diğer cihazla QR kodu okut ya da orada {site} üzerinde herhangi bir oda aç: profil resmi → 📲 Taşı → Al, ve bu kodu yaz:',
    waiting: 'Diğer cihaz bekleniyor… (kod 10 dakika geçerli)',
    asking: 'Bir cihaz kodunu yazdı. Eşyalarını ona gönderelim mi?',
    yes: 'Gönder',
    no: 'Hayır',
    sent: 'Tamam ✓ Eşyaların diğer cihazda.',
    refusedHere: 'Gönderilmedi.',
    typeCode: 'Diğer cihazın gösterdiği 6 haneli kod',
    go: 'Eşyalarımı al',
    askSent: 'Soruldu. Diğer cihazda “Gönder”e bas…',
    none: 'Bu kodu gösteren bir cihaz yok (süresi dolmuş olabilir). Orada yeni bir kod al.',
    busy: 'Bu kodu şu an başkası kullanıyor.',
    refused: 'Diğer cihaz hayır dedi.',
    taken: 'Bu kod az önce alındı. Tekrar dene.',
    expired: 'Kodun süresi doldu. Yeni bir kod al.',
    failed: 'Bağlanılamadı. Bağlantını kontrol edip tekrar dene.',
    bad: 'Gelen veri okunamadı.',
    moved: 'Taşındı: {list}. Hepsini görmek için sayfayı yenile.',
    nothing: 'Geldi ama bu cihazda hepsi (ya da daha fazlası) zaten vardı.',
    reload: '⟳ Yenile',
    close: 'Kapat',
    'key.snackBar': 'Büfe',
    'key.windowGarden': 'Pencere Bahçesi',
    'key.fiveFrames': 'Beş Kare',
    'key.savedRooms': 'kayıtlı odalar',
    'key.stickerCollection': 'emoji koleksiyonu',
    'key.name': 'ad',
    'key.avatar': 'avatar',
  },
} as const;
type TextKey = keyof (typeof TEXT)['en'];
function t(key: TextKey, values: Record<string, string | number> = {}): string {
  const table: Record<string, string> = lang() === 'tr' ? TEXT.tr : TEXT.en;
  return (table[key] ?? TEXT.en[key]).replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ''));
}

const socketUrl = (code: string, role: 'send' | 'get') =>
  `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/move/${code}/ws?role=${role}`;
const newCode = () => String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0]! % 900000));
const get = (key: MoveKey) => load(key);

/** Opens the dialog; `code` (from `/#move=<code>`) starts on "Receive" with it filled in. */
export function openMoveDialog(code?: string): void {
  document.querySelector('.move-backdrop')?.remove();
  let socket: WebSocket | null = null;
  const body = el('div', { class: 'move-body' });
  const closeButton = el('button', { type: 'button', class: 'btn', 'data-move': 'close' }, t('close'));
  const dialog = el(
    'div',
    { class: 'confirm-dialog card move-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('title') },
    el('h3', {}, t('title')),
    el('p', { class: 'muted small' }, t('intro')),
    body,
    el('div', { class: 'confirm-actions' }, closeButton),
  );
  const backdrop = el('div', { class: 'dialog-backdrop move-backdrop' }, dialog);
  const finish = () => {
    socket?.close();
    socket = null;
    backdrop.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') finish();
  };
  document.addEventListener('keydown', onKey);
  closeButton.addEventListener('click', finish);
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) finish();
  });
  document.body.append(backdrop);

  const status = (text: string, cls = '') => el('p', { class: `move-status ${cls}`, role: 'status' }, text);

  function choose(): void {
    const send = el('button', { type: 'button', class: 'btn primary', 'data-move': 'send' }, t('send'));
    const receive = el('button', { type: 'button', class: 'btn', 'data-move': 'get' }, t('get'));
    send.addEventListener('click', startSend);
    receive.addEventListener('click', () => startGet());
    body.replaceChildren(el('div', { class: 'move-choice' }, send, receive));
  }

  function open(url: string, onMessage: (m: Record<string, unknown>) => void, onClose: (code: number) => void): void {
    socket?.close();
    const ws = new WebSocket(url);
    socket = ws;
    ws.addEventListener('message', (event) => {
      try {
        onMessage(JSON.parse(String(event.data)) as Record<string, unknown>);
      } catch {
        // Not ours.
      }
    });
    ws.addEventListener('close', (event) => {
      if (socket === ws) {
        socket = null;
        onClose(event.code);
      }
    });
  }

  function startSend(): void {
    const code = newCode();
    const link = `${location.origin}/#move=${code}`;
    const qr = el('div', { class: 'move-qr', 'aria-hidden': 'true' });
    // Our own QR encoder's SVG (the link is our own address, never user text).
    qr.innerHTML = qrSvg(link);
    const line = status(t('waiting'));
    const actions = el('div', { class: 'move-actions' });
    body.replaceChildren(
      el('p', { class: 'small' }, t('codeIs', { site: location.host })),
      el('div', { class: 'move-code', 'data-move-code': code }, code),
      qr,
      line,
      actions,
    );
    let done = false;
    open(
      socketUrl(code, 'send'),
      (m) => {
        if (m.t === 'asking') {
          line.textContent = t('asking');
          const yes = el('button', { type: 'button', class: 'btn primary', 'data-move': 'yes' }, t('yes'));
          const no = el('button', { type: 'button', class: 'btn', 'data-move': 'no' }, t('no'));
          yes.addEventListener('click', () => {
            socket?.send(JSON.stringify({ t: 'send', data: encodeMove(packMove(get)) }));
            actions.replaceChildren();
          });
          no.addEventListener('click', () => {
            socket?.send(JSON.stringify({ t: 'refuse' }));
            actions.replaceChildren();
            line.textContent = t('refusedHere');
          });
          actions.replaceChildren(no, yes);
        } else if (m.t === 'sent') {
          done = true;
          line.textContent = t('sent');
          line.classList.add('ok');
          qr.remove();
        } else if (m.t === 'taken') {
          line.textContent = t('taken');
        }
      },
      (closeCode) => {
        if (done) return;
        actions.replaceChildren();
        if (closeCode === 4010) line.textContent = t('expired');
        else if (closeCode !== 4009 && line.textContent !== t('refusedHere')) line.textContent = t('failed');
      },
    );
  }

  function startGet(prefill = ''): void {
    const input = el('input', { class: 'move-input', inputmode: 'numeric', maxlength: '6', autocomplete: 'one-time-code', 'aria-label': t('typeCode'), placeholder: '123456' });
    input.value = prefill;
    const go = el('button', { type: 'button', class: 'btn primary', 'data-move': 'go' }, t('go'));
    const line = status('');
    const form = el('div', { class: 'move-form' }, input, go);
    body.replaceChildren(el('p', { class: 'small' }, t('typeCode')), form, line);
    const ask = () => {
      const code = input.value.replace(/\D/g, '');
      if (!MOVE_CODE.test(code)) return input.focus();
      go.disabled = true;
      line.textContent = '…';
      let finished = false;
      open(
        socketUrl(code, 'get'),
        (m) => {
          if (m.t === 'waiting') line.textContent = t('askSent');
          else if (m.t === 'none' || m.t === 'busy' || m.t === 'refused') {
            // The end of this try: another code can be typed at once.
            line.textContent = t(m.t === 'none' ? 'none' : m.t === 'busy' ? 'busy' : 'refused');
            go.disabled = false;
          } else if (m.t === 'blob') {
            finished = true;
            const blob = decodeMove(m.data);
            if (!blob) {
              line.textContent = t('bad');
              return;
            }
            const out = mergeMove(get, blob);
            const keys = MOVE_KEYS.filter((k) => out[k] !== undefined);
            for (const key of keys) save(key, out[key]!);
            if (!keys.length) {
              line.textContent = t('nothing');
              return;
            }
            line.textContent = t('moved', { list: keys.map((k) => t(`key.${k}` as TextKey)).join(', ') });
            line.classList.add('ok');
            const reload = el('button', { type: 'button', class: 'btn primary', 'data-move': 'reload' }, t('reload'));
            reload.addEventListener('click', () => location.reload());
            form.replaceChildren(reload);
          }
        },
        () => {
          if (!finished) go.disabled = false;
          if (!finished && line.textContent === '…') line.textContent = t('failed');
        },
      );
    };
    go.addEventListener('click', ask);
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') ask();
    });
    input.focus();
    if (MOVE_CODE.test(prefill)) ask();
  }

  if (code && MOVE_CODE.test(code)) startGet(code);
  else choose();
}
