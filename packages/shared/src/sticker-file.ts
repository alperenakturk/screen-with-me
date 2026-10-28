// Kullanıcının seçtiği dosyayı özel emojiye çevirir (tarayıcıda; site ve eklenti kullanır).
// Resimler 160 px'e küçültülüp webp yapılır (birkaç KB). GIF'ler animasyon bozulmasın diye
// olduğu gibi kalır; o yüzden boyut sınırı GIF'lerde önemli.

import { STICKER_MAX_CHARS, isStickerData } from './protocol.ts';

const MAX_SIDE = 160;

export type StickerError = 'type' | 'too_big' | 'broken';

export async function fileToSticker(file: File): Promise<string> {
  return prepareImage(file, [{ side: MAX_SIDE, quality: 0.85 }]);
}

/**
 * A picture for chat (0.9.88): photos are scaled to at most 1024 px WebP (smaller and lower quality until it fits the
 * limit); drawing on a canvas also drops EXIF/GPS. GIFs stay animated, without their metadata.
 */
export async function fileToChatImage(file: File): Promise<string> {
  return prepareImage(file, [
    { side: 1024, quality: 0.8 },
    { side: 800, quality: 0.72 },
    { side: 640, quality: 0.65 },
    { side: 480, quality: 0.6 },
  ]);
}

async function prepareImage(file: File, steps: Array<{ side: number; quality: number }>): Promise<string> {
  if (file.type === 'image/gif') {
    let gif: Uint8Array;
    try {
      gif = stripGifMetadata(new Uint8Array(await file.arrayBuffer()));
    } catch {
      throw stickerError('broken');
    }
    const data = `data:image/gif;base64,${toBase64(gif)}`;
    if (data.length > STICKER_MAX_CHARS) throw stickerError('too_big');
    if (!isStickerData(data)) throw stickerError('broken');
    return data;
  }
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw stickerError('type');
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw stickerError('broken');
  }
  let tooBig = false;
  try {
    for (const { side, quality } of steps) {
      const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      let data = canvas.toDataURL('image/webp', quality);
      // webp desteklemeyen tarayıcı png verir; ikisi de geçerli.
      if (!data.startsWith('data:image/webp')) data = canvas.toDataURL('image/png');
      tooBig = data.length > STICKER_MAX_CHARS;
      if (isStickerData(data)) return data;
    }
  } finally {
    bitmap.close();
  }
  throw stickerError(tooBig ? 'too_big' : 'broken');
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

/** Application extensions a GIF needs to keep (animation loop count). Everything else of that kind is dropped. */
const GIF_LOOP_APPS = ['NETSCAPE2.0', 'ANIMEXTS1.0'];

/**
 * Copies a GIF without its hidden extras (security review 1, O4): comment blocks and application blocks such as XMP
 * or ICC profiles can carry names, software, paths or dates. Frames, colours, timing and the loop count stay. Throws
 * on a file that isn't a well-formed GIF. Anything after the trailer is dropped too.
 */
export function stripGifMetadata(input: Uint8Array): Uint8Array {
  const fail = (): never => {
    throw new Error('bad gif');
  };
  const header = String.fromCharCode(...input.subarray(0, 6));
  if (header !== 'GIF87a' && header !== 'GIF89a') fail();
  const out: number[] = [];
  const copy = (from: number, to: number) => {
    if (to > input.length) fail();
    for (let i = from; i < to; i++) out.push(input[i]!);
  };
  /** End of the data sub-blocks starting at `at` (each: length byte + bytes; a zero length ends them). */
  const subBlocksEnd = (at: number): number => {
    let i = at;
    for (;;) {
      if (i >= input.length) fail();
      const size = input[i]!;
      i += 1 + size;
      if (size === 0) return i;
    }
  };
  // Header + logical screen descriptor (+ global colour table).
  if (input.length < 13) fail();
  let pos = 13;
  if (input[10]! & 0x80) pos += 3 * 2 ** ((input[10]! & 0x07) + 1);
  copy(0, pos);
  for (;;) {
    if (pos >= input.length) fail();
    const kind = input[pos]!;
    if (kind === 0x3b) {
      out.push(0x3b);
      return Uint8Array.from(out);
    }
    if (kind === 0x2c) {
      // Image descriptor (10 bytes), local colour table, LZW code size, image data.
      if (pos + 10 > input.length) fail();
      let end = pos + 10;
      if (input[pos + 9]! & 0x80) end += 3 * 2 ** ((input[pos + 9]! & 0x07) + 1);
      end = subBlocksEnd(end + 1);
      copy(pos, end);
      pos = end;
      continue;
    }
    if (kind !== 0x21 || pos + 2 > input.length) fail();
    const label = input[pos + 1]!;
    const end = subBlocksEnd(pos + 2);
    let keep = label === 0xf9 || label === 0x01;
    if (label === 0xff) {
      const size = input[pos + 2]!;
      const app = String.fromCharCode(...input.subarray(pos + 3, pos + 3 + Math.min(size, 11)));
      keep = GIF_LOOP_APPS.includes(app);
    }
    if (keep) copy(pos, end);
    pos = end;
  }
}

function stickerError(code: StickerError): Error {
  const error = new Error(code);
  error.name = 'StickerError';
  return error;
}
