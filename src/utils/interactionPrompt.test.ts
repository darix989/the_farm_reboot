import { describe, expect, it } from 'vitest';
import { DEFAULT_INTERACTION_PROMPT_LIFT, resolveInteractionPromptLift } from './interactionPrompt';

describe('resolveInteractionPromptLift', () => {
  it('uses an entity override when authored', () => {
    expect(resolveInteractionPromptLift(275)).toBe(275);
  });

  it('falls back when an entity has no override', () => {
    expect(resolveInteractionPromptLift()).toBe(DEFAULT_INTERACTION_PROMPT_LIFT);
  });
});
