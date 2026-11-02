import { load, save } from '../storage.ts';

/**
 * Sizes of the pictures in the phone's camera row (0.9.92.8, owner: "small / medium / large did nothing on the
 * phone"). Chosen in the person sheet (ui/voice.ts), drawn by ui/phone-room.ts; kept per member in this browser.
 */
export type PhoneCamSize = 'small' | 'medium' | 'large';

const KEY = 'phCamSizes';

function all(): Record<string, PhoneCamSize> {
  try {
    const value: unknown = JSON.parse(load(KEY) ?? '{}');
    return value && typeof value === 'object' ? (value as Record<string, PhoneCamSize>) : {};
  } catch {
    return {};
  }
}

export function phoneCamSize(member: string): PhoneCamSize {
  const size = all()[member];
  return size === 'small' || size === 'large' ? size : 'medium';
}

export function setPhoneCamSize(member: string, size: PhoneCamSize): void {
  const sizes = all();
  sizes[member] = size;
  // Only the newest 30 people.
  const keys = Object.keys(sizes);
  for (const old of keys.slice(0, Math.max(0, keys.length - 30))) delete sizes[old];
  save(KEY, JSON.stringify(sizes));
  dispatchEvent(new CustomEvent('swm-phcam-size', { detail: { member, size } }));
}
