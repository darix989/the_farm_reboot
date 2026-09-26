import { describe, expect, it } from 'vitest';
import { isCurrentEmotionFrameCount } from './animalEmotions';

describe('isCurrentEmotionFrameCount', () => {
  it('accepts the Blitz default and the Hydra retry frame counts', () => {
    expect(isCurrentEmotionFrameCount(25)).toBe(true);
    expect(isCurrentEmotionFrameCount(36)).toBe(true);
  });

  it('flags the old 16-frame generation and anything else as stale', () => {
    expect(isCurrentEmotionFrameCount(16)).toBe(false);
    expect(isCurrentEmotionFrameCount(49)).toBe(false);
  });
});
