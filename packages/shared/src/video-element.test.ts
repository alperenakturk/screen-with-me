import { describe, expect, it } from 'vitest';
import { scoreVideo, type VideoInfo } from './video-element.ts';

const video = (patch: Partial<VideoInfo>): VideoInfo => ({
  width: 1280,
  height: 720,
  duration: 5400,
  playing: false,
  visible: true,
  ...patch,
});

describe('scoreVideo', () => {
  it('ignores hidden and tiny videos', () => {
    expect(scoreVideo(video({ visible: false }))).toBe(0);
    expect(scoreVideo(video({ width: 160, height: 90 }))).toBe(0);
  });

  it('prefers the long film over a short ad of the same size', () => {
    const film = scoreVideo(video({ duration: 5400 }));
    const ad = scoreVideo(video({ duration: 30, playing: true }));
    expect(film).toBeGreaterThan(ad);
  });

  it('prefers a bigger player, and a playing one when otherwise equal', () => {
    expect(scoreVideo(video({ width: 1920, height: 1080 }))).toBeGreaterThan(scoreVideo(video({})));
    expect(scoreVideo(video({ playing: true }))).toBeGreaterThan(scoreVideo(video({})));
  });

  it('still counts a video whose length is not known yet', () => {
    expect(scoreVideo(video({ duration: Number.NaN }))).toBeGreaterThan(0);
  });
});
