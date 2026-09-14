import { describe, expect, it } from 'vitest';
import { nextRevealHeld, type RevealHoldEvent } from './revealHold';

function keydown(
  overrides: Partial<Extract<RevealHoldEvent, { type: 'keydown' }>> = {},
): RevealHoldEvent {
  return {
    type: 'keydown',
    key: 'Shift',
    repeat: false,
    shiftKey: true,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    ...overrides,
  };
}

function keyup(
  overrides: Partial<Extract<RevealHoldEvent, { type: 'keyup' }>> = {},
): RevealHoldEvent {
  return {
    type: 'keyup',
    key: 'Shift',
    shiftKey: false,
    ...overrides,
  };
}

describe('nextRevealHeld', () => {
  it('turns on for an unmodified Shift keydown', () => {
    expect(nextRevealHeld(false, keydown())).toBe(true);
  });

  it('ignores keydown autorepeat so it does not rewrite the store', () => {
    expect(nextRevealHeld(true, keydown({ repeat: true }))).toBe(true);
    expect(nextRevealHeld(false, keydown({ repeat: true }))).toBe(false);
  });

  it('turns off when a non-Shift keydown proves Shift is up', () => {
    expect(nextRevealHeld(true, keydown({ key: 'z', shiftKey: false }))).toBe(false);
  });

  it('stays on for a non-Shift keydown while Shift is still held', () => {
    expect(nextRevealHeld(true, keydown({ key: 'z', shiftKey: true }))).toBe(true);
  });

  it('turns off for meta/ctrl/alt chords that swallow later keyups on macOS', () => {
    expect(nextRevealHeld(true, keydown({ metaKey: true }))).toBe(false);
    expect(nextRevealHeld(true, keydown({ ctrlKey: true }))).toBe(false);
    expect(nextRevealHeld(true, keydown({ altKey: true }))).toBe(false);
  });

  it('turns off on Shift keyup', () => {
    expect(nextRevealHeld(true, keyup())).toBe(false);
  });

  it('turns off on a non-Shift keyup that proves Shift is up', () => {
    expect(nextRevealHeld(true, keyup({ key: 'z', shiftKey: false }))).toBe(false);
  });

  it('stays on for a non-Shift keyup while Shift is still held', () => {
    expect(nextRevealHeld(true, keyup({ key: 'z', shiftKey: true }))).toBe(true);
  });

  it('turns off on blur and hidden so a release outside the page cannot latch', () => {
    expect(nextRevealHeld(true, { type: 'blur' })).toBe(false);
    expect(nextRevealHeld(true, { type: 'hidden' })).toBe(false);
  });
});
