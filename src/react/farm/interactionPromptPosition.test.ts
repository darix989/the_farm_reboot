import { describe, expect, it } from 'vitest';
import { interactionPromptPosition } from './interactionPromptPosition';

describe('interactionPromptPosition', () => {
  it('maps Phaser design coordinates to stage-relative CSS coordinates', () => {
    expect(interactionPromptPosition({ x: 960, y: 540 })).toEqual({
      left: '50%',
      top: '50%',
    });
  });
});
