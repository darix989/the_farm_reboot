import { describe, expect, it } from 'vitest';
import { interactionPromptPosition } from './interactionPromptPosition';

describe('interactionPromptPosition', () => {
  const layout = {
    stageWidth: 960,
    stageHeight: 540,
    promptWidth: 200,
    promptHeight: 50,
  };

  it('maps Phaser design coordinates into the scaled stage', () => {
    expect(interactionPromptPosition({ x: 960, y: 540 }, layout)).toEqual({
      left: '480px',
      top: '270px',
    });
  });

  it('keeps prompts fully visible at either horizontal edge', () => {
    expect(interactionPromptPosition({ x: 0, y: 540 }, layout).left).toBe('116px');
    expect(interactionPromptPosition({ x: 1920, y: 540 }, layout).left).toBe('844px');
  });

  it('keeps prompts fully visible at the vertical edges', () => {
    expect(interactionPromptPosition({ x: 960, y: 0 }, layout).top).toBe('66px');
    expect(interactionPromptPosition({ x: 960, y: 1080 }, layout).top).toBe('524px');
  });

  it('centres a prompt that is wider than the available stage', () => {
    expect(
      interactionPromptPosition({ x: 0, y: 540 }, { ...layout, stageWidth: 180, promptWidth: 200 })
        .left,
    ).toBe('90px');
  });
});
