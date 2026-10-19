// Kullanıcının seçtiği dosyayı özel emojiye çevirir (tarayıcıda; site ve eklenti kullanır).
// Resimler 160 px'e küçültülüp webp yapılır (birkaç KB). GIF'ler animasyon bozulmasın diye
// olduğu gibi kalır; o yüzden boyut sınırı GIF'lerde önemli.

import { STICKER_MAX_CHARS, isStickerData } from './protocol.ts';

const MAX_SIDE = 160;

export type StickerError = 'type' | 'too_big' | 'broken';

export async function fileToSticker(file: File): Promise<string> {
  if (file.type === 'image/gif') {
    const data = await readAsDataUrl(file);
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
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  let data = canvas.toDataURL('image/webp', 0.85);
  // webp desteklemeyen tarayıcı png verir; ikisi de geçerli.
  if (!isStickerData(data)) data = canvas.toDataURL('image/png');
  const tooBig = data.length > STICKER_MAX_CHARS;
  if (!isStickerData(data)) throw stickerError(tooBig ? 'too_big' : 'broken');
  return data;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(stickerError('broken'));
    reader.readAsDataURL(file);
  });
}

function stickerError(code: StickerError): Error {
  const error = new Error(code);
  error.name = 'StickerError';
  return error;
}
