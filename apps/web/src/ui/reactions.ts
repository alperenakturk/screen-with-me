import { REACTION_PAGES, type ClientMessage, type Member, type Sticker } from '@swm/shared/protocol';
import { fileToSticker } from '@swm/shared/sticker-file';
import { el } from '../dom.ts';
import { t, type I18nKey } from '../i18n.ts';
import { load, save } from '../storage.ts';
import { avatarNode } from './avatar.ts';

/** Ekranda aynı anda en fazla bu kadar tepki kartı. */
const MAX_CARDS = 5;
/** Kart ekranda bu kadar kalır (aynı kişi aynı tepkiyi yinelerse süre yenilenir). */
const CARD_MS = 3200;
/** Bir tepkiden sonra butonlar kısa süre bekler: art arda basıp ekranı doldurmasın. */
const COOLDOWN_MS = 1100;
/** Bir sayfada en fazla 8 öğe; özel emoji sayfalarında sonuncusu "+". */
const PER_PAGE = 8;
/** Kendi özel emojilerim (tarayıcıda saklanır, girdiğim her odaya yüklenir). */
const MY_STICKERS_KEY = 'myStickers';
const MAX_MY_STICKERS = 12;

type Item = { emoji: string } | { sticker: string } | { add: true };

/**
 * Tepkiler. Alttaki çubuk: üç emoji sayfası + özel emoji (GIF/resim) sayfaları; ▲▼ ya da
 * tekerlek sayfa değiştirir, 1–8 tuşları o sayfanın öğeleri. Gelen tepkiler ekranın ortasında
 * uçuşmaz: videonun sol altında avatar + isim + emoji kartı olarak kısa süre durur; aynı kişinin
 * aynı tepkisi yeni kart açmaz, "×2" olur.
 */
export function createReactions(root: HTMLElement, send: (message: ClientMessage) => void) {
  // Biri video altında, biri tam ekran kontrollerinde olmak üzere birden fazla emoji çubuğu olabilir.
  const bars = root.querySelectorAll<HTMLElement>('.reaction-bar');
  const layer = root.querySelector<HTMLElement>('#reactions-layer')!;
  const stickers = new Map<string, string>();
  let page = 0;
  let coolUntil = 0;
  const fileInput = el('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/gif', hidden: '' }) as HTMLInputElement;
  root.append(fileInput);

  function pages(): Item[][] {
    const list: Item[][] = REACTION_PAGES.map((p) => p.map((emoji) => ({ emoji })));
    const ids = [...stickers.keys()];
    // Özel emoji sayfaları: 7 tane + "+"; hiç yoksa sadece "+".
    for (let i = 0; i === 0 || i < ids.length; i += PER_PAGE - 1) {
      list.push([...ids.slice(i, i + PER_PAGE - 1).map((sticker) => ({ sticker })), { add: true }]);
    }
    return list;
  }

  function turn(step: number): void {
    const count = pages().length;
    page = (page + step + count) % count;
    draw();
  }

  function fire(item: Item): void {
    if ('add' in item) {
      fileInput.click();
      return;
    }
    if (Date.now() < coolUntil) return;
    coolUntil = Date.now() + COOLDOWN_MS;
    send('emoji' in item ? { t: 'react', emoji: item.emoji as never } : { t: 'react', sticker: item.sticker });
    for (const bar of bars) {
      bar.classList.add('cooling');
      setTimeout(() => bar.classList.remove('cooling'), COOLDOWN_MS);
    }
  }

  function draw(): void {
    const all = pages();
    if (page >= all.length) page = 0;
    for (const bar of bars) {
      const buttons = all[page]!.map((item, i) => {
        const title = 'add' in item ? t('stickerAdd') : `${t('react')} (${i + 1})`;
        const content = 'emoji' in item ? item.emoji : 'sticker' in item ? el('img', { src: stickers.get(item.sticker) ?? '', alt: '' }) : '+';
        const button = el('button', { type: 'button', class: 'add' in item ? 'reaction-btn add' : 'reaction-btn', title, 'aria-label': title }, content);
        button.addEventListener('click', () => fire(item));
        return button;
      });
      const up = el('button', { type: 'button', class: 'reaction-page', title: t('moreReactions'), 'aria-label': t('moreReactions') }, '▲');
      const down = el('button', { type: 'button', class: 'reaction-page', title: t('moreReactions'), 'aria-label': t('moreReactions') }, '▼');
      up.addEventListener('click', () => turn(-1));
      down.addEventListener('click', () => turn(1));
      bar.replaceChildren(...buttons, el('span', { class: 'reaction-pager' }, up, down));
    }
  }

  for (const bar of bars) {
    bar.addEventListener('wheel', (event) => {
      event.preventDefault();
      turn(event.deltaY > 0 ? 1 : -1);
    }, { passive: false });
  }
  draw();

  // Özel emoji ekle: dosyayı küçült (GIF olduğu gibi), sakla, odaya yolla.
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    try {
      const data = await fileToSticker(file);
      const mine = myStickers().filter((d) => d !== data);
      save(MY_STICKERS_KEY, JSON.stringify([...mine, data].slice(-MAX_MY_STICKERS)));
      send({ t: 'sticker-add', data });
    } catch (error) {
      const code = error instanceof Error && ['type', 'too_big'].includes(error.message) ? error.message : 'broken';
      alert(t(`stickerError.${code}` as I18nKey));
    }
  });

  // Klavye: 1–8 o anki sayfanın öğeleri (yazı yazarken değil). Tam ekranda ve normalde çalışır.
  document.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey || isTyping(event.target)) return;
    const n = Number(event.key);
    if (!Number.isInteger(n) || n < 1 || n > 8) return;
    const item = pages()[page]?.[n - 1];
    if (!item || 'add' in item) return;
    event.preventDefault();
    fire(item);
  });

  return {
    /** Gelen tepki: sol altta avatar + isim + emoji/özel emoji kartı. */
    show(by: Member, emoji?: string, sticker?: string): void {
      const key = `${by.id}|${emoji ?? sticker}`;
      const existing = layer.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"]`);
      if (existing) {
        const count = Number(existing.dataset.count ?? '1') + 1;
        existing.dataset.count = String(count);
        existing.querySelector('.r-count')!.textContent = `×${count}`;
        existing.classList.remove('bump');
        void existing.offsetWidth;
        existing.classList.add('bump');
        restart(existing);
        return;
      }
      let content: HTMLElement;
      if (sticker) {
        const data = stickers.get(sticker);
        if (!data) return;
        content = el('img', { class: 'r-sticker', src: data, alt: '' });
      } else {
        content = el('span', { class: 'r-emoji' }, emoji ?? '');
      }
      while (layer.childElementCount >= MAX_CARDS) layer.firstElementChild?.remove();
      const card = el('div', { class: 'r-card', 'data-key': key, 'data-count': '1' }, avatarNode(by.avatar, 'r-avatar'), el('span', { class: 'r-name' }, by.name), content, el('span', { class: 'r-count' }));
      layer.append(card);
      restart(card);
    },
    /** Odaya özel emoji eklendi (girişte de odadakiler tek tek gelir). */
    addSticker(sticker: Sticker): void {
      stickers.set(sticker.id, sticker.data);
      draw();
    },
    /** Odaya girince: kendi özel emojilerimi bu odaya da yükle. */
    registerMine(): void {
      for (const data of myStickers()) send({ t: 'sticker-add', data });
    },
    /** Yeni odaya bağlanınca (yeniden bağlanma) eski odanın özel emojileri temizlenir. */
    clearStickers(): void {
      stickers.clear();
      draw();
    },
    relabel(): void {
      draw();
    },
  };
}

function restart(card: HTMLElement): void {
  const old = Number(card.dataset.timer ?? '0');
  if (old) clearTimeout(old);
  const timer = window.setTimeout(() => {
    card.classList.add('leaving');
    card.addEventListener('animationend', () => card.remove(), { once: true });
    setTimeout(() => card.remove(), 600);
  }, CARD_MS);
  card.dataset.timer = String(timer);
}

function myStickers(): string[] {
  try {
    const list = JSON.parse(load(MY_STICKERS_KEY) ?? '[]') as unknown;
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** Klavye kısayolları yazı alanlarında çalışmasın. */
export function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}
