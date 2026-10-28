import { describe, expect, it } from 'vitest';
import { stripGifMetadata } from './sticker-file.ts';

const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0));
const text = (bytes: Uint8Array) => String.fromCharCode(...bytes);

/** A 1×1 GIF with a loop block, a comment, an XMP block, a frame and junk after the trailer. */
function sampleGif(): Uint8Array {
  return Uint8Array.from([
    ...ascii('GIF89a'),
    1, 0, 1, 0, 0x80, 0, 0, // 1×1, global colour table of 2 entries
    0, 0, 0, 255, 255, 255,
    0x21, 0xff, 11, ...ascii('NETSCAPE2.0'), 3, 1, 0, 0, 0, // loop forever
    0x21, 0xfe, 5, ...ascii('hello'), 0, // comment
    0x21, 0xff, 11, ...ascii('XMP DataXMP'), 4, ...ascii('abcd'), 0, // XMP
    0x21, 0xf9, 4, 0, 10, 0, 0, 0, // frame timing
    0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 2, 0x44, 0x01, 0, // image
    0x3b,
    ...ascii('junk'),
  ]);
}

describe('stripGifMetadata', () => {
  it('drops comments, XMP and trailing data but keeps the loop, timing and frames', () => {
    const out = stripGifMetadata(sampleGif());
    const s = text(out);
    expect(s).not.toContain('hello');
    expect(s).not.toContain('XMP');
    expect(s).not.toContain('junk');
    expect(s).toContain('NETSCAPE2.0');
    expect(s.startsWith('GIF89a')).toBe(true);
    expect(out.at(-1)).toBe(0x3b);
    // Frame timing block and the image block survive byte for byte.
    expect(s).toContain(text(Uint8Array.from([0x21, 0xf9, 4, 0, 10, 0, 0, 0])));
    expect(s).toContain(text(Uint8Array.from([0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 2, 0x44, 0x01, 0])));
  });

  it('is unchanged for a GIF without extras', () => {
    const once = stripGifMetadata(sampleGif());
    expect(stripGifMetadata(once)).toEqual(once);
  });

  it('rejects files that are not complete GIFs', () => {
    expect(() => stripGifMetadata(Uint8Array.from(ascii('PNG not a gif')))).toThrow();
    expect(() => stripGifMetadata(sampleGif().subarray(0, 40))).toThrow();
  });
});
