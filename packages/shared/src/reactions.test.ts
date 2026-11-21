import { describe, expect, it } from 'vitest';
import { HANDS_PAGE, HAND_REACTIONS, REACTION_PAGES, SKIN_TONES, isReaction, parseClientMessage } from './protocol';

// Card EMO1: the hands page and its skin tones.
describe('hand reactions', () => {
  it('is its own page of eight', () => {
    expect(REACTION_PAGES[HANDS_PAGE]).toEqual(HAND_REACTIONS);
    expect(HAND_REACTIONS).toHaveLength(8);
  });
  it('takes every hand in every skin tone', () => {
    for (const hand of HAND_REACTIONS) for (const tone of SKIN_TONES) expect(isReaction(hand + tone)).toBe(true);
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
