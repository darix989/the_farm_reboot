import { describe, expect, it } from 'vitest';
import { isOpenCodexShortcut } from './codexShortcut';

function keyboardEvent(overrides: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return {
    code: 'Tab',
    shiftKey: false,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    repeat: false,
    ...overrides,
  } as KeyboardEvent;
}

describe('isOpenCodexShortcut', () => {
  it('accepts an unmodified Tab press', () => {
    expect(isOpenCodexShortcut(keyboardEvent())).toBe(true);
  });

  it('leaves reverse focus traversal and modifier chords alone', () => {
    expect(isOpenCodexShortcut(keyboardEvent({ shiftKey: true }))).toBe(false);
    expect(isOpenCodexShortcut(keyboardEvent({ ctrlKey: true }))).toBe(false);
  });

  it('ignores held-key repeats and other keys', () => {
    expect(isOpenCodexShortcut(keyboardEvent({ repeat: true }))).toBe(false);
    expect(isOpenCodexShortcut(keyboardEvent({ code: 'Enter' }))).toBe(false);
  });
});
