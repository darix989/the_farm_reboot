import { describe, expect, it } from 'vitest';
import {
  ANALYZE_CODE,
  BACK_CODE,
  CONTINUE_CODES,
  OPTION_CODES,
  SKIP_CODE,
  shouldIgnoreActionShortcut,
} from './trialActionShortcuts';

function keyboardEvent(overrides: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return {
    repeat: false,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    code: 'KeyZ',
    ...overrides,
  } as KeyboardEvent;
}

describe('trialActionShortcuts registry', () => {
  it('derives continue / analyze / back / option codes from KEY_BINDINGS', () => {
    expect(CONTINUE_CODES).toEqual(['Space', 'Enter', 'KeyD']);
    expect(ANALYZE_CODE).toBe('KeyA');
    expect(BACK_CODE).toBe('KeyS');
    expect(SKIP_CODE).toBe('KeyF');
    expect(OPTION_CODES).toEqual(['KeyZ', 'KeyX', 'KeyC']);
  });
});

describe('shouldIgnoreActionShortcut', () => {
  it('suppresses shortcuts while Shift is held so reveal cannot commit a choice', () => {
    expect(shouldIgnoreActionShortcut(keyboardEvent({ shiftKey: true }))).toBe(true);
    expect(shouldIgnoreActionShortcut(keyboardEvent())).toBe(false);
  });

  it('still ignores repeats and non-Shift modifier chords', () => {
    expect(shouldIgnoreActionShortcut(keyboardEvent({ repeat: true }))).toBe(true);
    expect(shouldIgnoreActionShortcut(keyboardEvent({ metaKey: true }))).toBe(true);
    expect(shouldIgnoreActionShortcut(keyboardEvent({ ctrlKey: true }))).toBe(true);
    expect(shouldIgnoreActionShortcut(keyboardEvent({ altKey: true }))).toBe(true);
  });
});
