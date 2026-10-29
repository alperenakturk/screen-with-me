import type { Member } from '@swm/shared/protocol';
import { el } from '../dom.ts';
import { t } from '../i18n.ts';
import { avatarNode } from './avatar.ts';

/** Shorts görünümünde gösterilen en fazla kişi (iki yana bölünür); fazlası "+N" olur. */
const MAX_SEATS = 6;
/** Mesaj baloncuğu bu kadar görünür kalır (ms). */
const BUBBLE_MS = 6000;
/** Koltuktan uçan emoji (CSS seat-fly ile aynı süre). */
const FLY_MS = 2200;
/** Bir koltukta aynı anda en fazla bu kadar uçan emoji. */
const MAX_FLIES = 4;

/**
 * Shorts görünümündeki "Oturma odası": arkadaşlar videonun iki yanında oturur. Yazılan mesaj yazanın
 * avatarından baloncuk olarak çıkar, attığı emoji kendi avatarından yükselir. Sohbet geçmişi ve sıra
 * oda görünümünde kalır; burada ekran temiz.
 */
export function createSeats(left: HTMLElement, right: HTMLElement) {
  let members: Member[] = [];
  let myId: string | null = null;
  /** Ekranda koltuğu olan kişiler (üye ID'si → koltuk). */
  const seats = new Map<string, HTMLElement>();
  let more: HTMLElement | null = null;
  /**
   * Cameras in the seats (0.9.90.9, owner's idea): in the Shorts view a person's camera shows inside their avatar
   * circle instead of tiles. The video elements are kept between redraws (no flicker); mine is mirrored.
   */
  let cams = new Map<string, MediaStream>();
  const camVideos = new Map<string, HTMLVideoElement>();
  function placeCams(): void {
    for (const [id, video] of camVideos) {
      if (!cams.has(id)) {
        video.remove();
        camVideos.delete(id);
      }
    }
    for (const [id, seat] of seats) {
      const stream = cams.get(id);
      const av = seat.querySelector<HTMLElement>('.seat-av');
      if (!stream || !av) continue;
      let video = camVideos.get(id);
      if (!video) {
        video = el('video', { class: 'seat-cam', autoplay: '', playsinline: '', 'aria-hidden': 'true' }) as HTMLVideoElement;
        video.muted = true;
        camVideos.set(id, video);
      }
      if (video.srcObject !== stream) video.srcObject = stream;
      video.classList.toggle('mine', id === myId);
      if (video.parentElement !== av) {
        av.prepend(video);
        void video.play().catch(() => {});
      }
    }
    for (const [id, seat] of seats) seat.classList.toggle('has-cam', cams.has(id));
  }
  /** Açık baloncuklar: kişi listesi değişip koltuklar yeniden çizilince kaybolmasınlar. */
  const bubbles = new Map<string, { text: string; until: number; timer: number }>();

  function seatFor(member: Member): HTMLElement {
    const name = member.id === myId ? `${member.name} (${t('you')})` : member.name;
    const seat = el(
      'div',
      { class: member.id === myId ? 'seat me' : 'seat' },
      el('div', { class: 'seat-who' }, el('span', { class: 'seat-av' }, avatarNode(member.avatar, 'seat-pic')), el('span', { class: 'seat-name' }, name)),
    );
    const open = bubbles.get(member.id);
    if (open && open.until > Date.now()) seat.append(bubbleNode(open.text));
    return seat;
  }

  function bubbleNode(text: string): HTMLElement {
    return el('div', { class: 'seat-bubble', role: 'status' }, text);
  }

  function render(): void {
    // Ben hep ilk koltukta (solda en üstte); diğerleri odaya giriş sırasıyla, sırayla sol/sağ.
    const ordered = [...members].sort((a, b) => Number(b.id === myId) - Number(a.id === myId));
    const shown = ordered.slice(0, MAX_SEATS);
    const extra = ordered.length - shown.length;
    seats.clear();
    const l: HTMLElement[] = [];
    const r: HTMLElement[] = [];
    shown.forEach((member, i) => {
      const seat = seatFor(member);
      seats.set(member.id, seat);
      (i % 2 === 0 ? l : r).push(seat);
    });
    more = null;
    if (extra > 0) {
      more = el('div', { class: 'seat more' }, el('div', { class: 'seat-who' }, el('span', { class: 'seat-av' }, `+${extra}`), el('span', { class: 'seat-name' }, t('shorts.more', { n: extra }))));
      r.push(more);
    }
    left.replaceChildren(...l);
    right.replaceChildren(...r);
    placeCams();
  }

  return {
    setMembers(next: Member[], me: string | null): void {
      members = next;
      myId = me;
      render();
    },
    render,
    setCams(next: Map<string, MediaStream>, me: string | null): void {
      cams = next;
      myId = me;
      placeCams();
    },
    /** Mesaj: yazanın koltuğunda baloncuk (koltuğu yoksa "+N"de, adıyla). */
    say(by: Member, text: string): void {
      const seat = seats.get(by.id);
      const target = seat ?? more;
      if (!target) return;
      const shown = seat ? text : `${by.name}: ${text}`;
      const key = seat ? by.id : '+';
      const old = bubbles.get(key);
      if (old) clearTimeout(old.timer);
      target.querySelector('.seat-bubble')?.remove();
      target.append(bubbleNode(shown));
      const timer = window.setTimeout(() => {
        bubbles.delete(key);
        // Koltuklar bu arada yeniden çizilmiş olabilir: güncel koltuğa bak.
        (key === '+' ? more : seats.get(key))?.querySelector('.seat-bubble')?.remove();
      }, BUBBLE_MS);
      bubbles.set(key, { text: shown, until: Date.now() + BUBBLE_MS, timer });
    },
    /** Emoji kişinin avatarından yükselir. Koltuğu yoksa false (o zaman videonun üstünde uçar). */
    react(by: Member, content: HTMLElement): boolean {
      const av = seats.get(by.id)?.querySelector<HTMLElement>('.seat-av');
      if (!av) return false;
      while (av.querySelectorAll('.seat-fly').length >= MAX_FLIES) av.querySelector('.seat-fly')?.remove();
      const fly = el('span', { class: 'seat-fly' }, content);
      fly.style.setProperty('--drift', `${Math.round((Math.random() - 0.5) * 40)}px`);
      av.append(fly);
      setTimeout(() => fly.remove(), FLY_MS + 100);
      return true;
    },
  };
}
