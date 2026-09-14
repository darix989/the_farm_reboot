import { describe, expect, it } from 'vitest';
import { shouldShowShortcutHint, type ShortcutHintContext } from './shortcutHintVisibility';

const shown: ShortcutHintContext = {
  isTouch: false,
  currentScene: 'Farm',
  isTraveling: false,
  isCodexOpen: false,
  isTutorialOpen: false,
  isRevealed: false,
};

describe('shouldShowShortcutHint', () => {
  it('shows on Farm, FarmSide and Trial', () => {
    expect(shouldShowShortcutHint(shown)).toBe(true);
    expect(shouldShowShortcutHint({ ...shown, currentScene: 'FarmSide' })).toBe(true);
    expect(shouldShowShortcutHint({ ...shown, currentScene: 'Trial' })).toBe(true);
  });

  it('hides on the main menu and other out-of-scope scenes', () => {
    expect(shouldShowShortcutHint({ ...shown, currentScene: 'MainMenu' })).toBe(false);
    expect(shouldShowShortcutHint({ ...shown, currentScene: 'AnimalGallery' })).toBe(false);
  });

  it('hides on touch, travel, Codex, tutorial, and while revealed', () => {
    expect(shouldShowShortcutHint({ ...shown, isTouch: true })).toBe(false);
    expect(shouldShowShortcutHint({ ...shown, isTraveling: true })).toBe(false);
    expect(shouldShowShortcutHint({ ...shown, isCodexOpen: true })).toBe(false);
    expect(shouldShowShortcutHint({ ...shown, isTutorialOpen: true })).toBe(false);
    expect(shouldShowShortcutHint({ ...shown, isRevealed: true })).toBe(false);
  });
});
