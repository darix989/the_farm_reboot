import { describe, expect, it } from 'vitest';
import {
  KEY_BINDINGS,
  ariaKeyShortcutsFor,
  keycapForCode,
  type ShortcutAction,
} from './keyBindings';

describe('KEY_BINDINGS', () => {
  const actions = Object.keys(KEY_BINDINGS) as ShortcutAction[];

  it('keeps displayCode inside codes for every action', () => {
    for (const action of actions) {
      const binding = KEY_BINDINGS[action];
      expect(binding.codes, action).toContain(binding.displayCode);
    }
  });

  it('never renders a raw KeyX-style code on a keycap', () => {
    for (const action of actions) {
      const glyph = keycapForCode(KEY_BINDINGS[action].displayCode);
      expect(glyph, action).not.toMatch(/^Key/);
      expect(glyph, action).not.toMatch(/^Digit/);
    }
  });
});

describe('keycapForCode', () => {
  it('strips Key and Digit prefixes', () => {
    expect(keycapForCode('KeyZ')).toBe('Z');
    expect(keycapForCode('Digit1')).toBe('1');
  });

  it('uses word forms and arrows, not obscure glyphs', () => {
    expect(keycapForCode('Space')).toBe('Space');
    expect(keycapForCode('Enter')).toBe('Enter');
    expect(keycapForCode('Tab')).toBe('Tab');
    expect(keycapForCode('Escape')).toBe('Esc');
    expect(keycapForCode('Shift')).toBe('Shift');
    expect(keycapForCode('ArrowUp')).toBe('↑');
    expect(keycapForCode('ArrowDown')).toBe('↓');
    expect(keycapForCode('ArrowLeft')).toBe('←');
    expect(keycapForCode('ArrowRight')).toBe('→');
  });

  it('returns unknown codes unchanged', () => {
    expect(keycapForCode('F6')).toBe('F6');
  });
});

describe('ariaKeyShortcutsFor', () => {
  it('lists each binding in order and appends extras once', () => {
    expect(ariaKeyShortcutsFor('farmInteract')).toBe('Space E Enter');
    expect(ariaKeyShortcutsFor('trialContinue', ['KeyE', 'Space'])).toBe('Space Enter D E');
  });
});
