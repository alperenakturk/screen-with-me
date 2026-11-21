import { describe, expect, it } from 'vitest';
import { HANDS_PAGE, HAND_PAGES, HAND_REACTIONS, REACTION_PAGES, SKIN_TONES, handInTone, isReaction, parseClientMessage } from './protocol';

// Card EMO1: the hands page and its skin tones.
describe('hand reactions', () => {
  it('is two pages of eight, no hand twice', () => {
    expect(REACTION_PAGES.slice(HANDS_PAGE, HANDS_PAGE + 2)).toEqual(HAND_PAGES);
    expect(HAND_PAGES.every((p) => p.length === 8)).toBe(true);
    expect(new Set(HAND_REACTIONS).size).toBe(16);
  });
  it('takes every hand in every skin tone', () => {
    for (const hand of HAND_REACTIONS) for (const tone of SKIN_TONES) expect(isReaction(handInTone(hand, tone))).toBe(true);
    expect(handInTone('✌️', '\u{1F3FD}')).toBe('✌\u{1F3FD}');
  });
  it('passes a toned hand through the server\'s check', () => {
    expect(parseClientMessage(JSON.stringify({ t: 'react', emoji: '🫶\u{1F3FE}' }))).toEqual({ t: 'react', emoji: '🫶\u{1F3FE}' });
    expect(parseClientMessage(JSON.stringify({ t: 'react', emoji: '😂\u{1F3FE}' }))).toBeNull();
  });
  it('refuses a tone on a face, two tones, or a tone alone', () => {
    expect(isReaction('😂\u{1F3FD}')).toBe(false);
    expect(isReaction('👍\u{1F3FB}\u{1F3FB}')).toBe(false);
    expect(isReaction('\u{1F3FB}')).toBe(false);
  });
});
