/**
 * Canonical keyboard bindings for in-game CTAs.
 *
 * Engine-agnostic on purpose: Phaser scenes and React overlays both read this
 * file, so it must not import either. `event.code` values are the contract.
 *
 * Copy policy: keycap glyphs are a data transform of a physical key, not prose,
 * so they bypass `getLabel`. Every *sentence* that mentions a key still goes
 * through `getLabel` with the glyph injected as a `{key}` replacement.
 */

export type ShortcutAction =
  | 'farmInteract'
  | 'codexOpen'
  | 'trialOptionA'
  | 'trialOptionB'
  | 'trialOptionC'
  | 'trialAnalyze'
  | 'trialBack'
  | 'trialContinue'
  | 'farmTalkSkip';

export interface KeyBinding {
  /** Every `event.code` that fires this action, primary first. */
  readonly codes: readonly string[];
  /** The single code drawn on the revealed keycap. Invariant: ∈ codes. */
  readonly displayCode: string;
}

export const KEY_BINDINGS: Record<ShortcutAction, KeyBinding> = {
  farmInteract: { codes: ['Space', 'KeyE', 'Enter'], displayCode: 'KeyE' },
  codexOpen: { codes: ['Tab'], displayCode: 'Tab' },
  trialOptionA: { codes: ['KeyZ'], displayCode: 'KeyZ' },
  trialOptionB: { codes: ['KeyX'], displayCode: 'KeyX' },
  trialOptionC: { codes: ['KeyC'], displayCode: 'KeyC' },
  trialAnalyze: { codes: ['KeyA'], displayCode: 'KeyA' },
  trialBack: { codes: ['KeyS'], displayCode: 'KeyS' },
  trialContinue: { codes: ['Space', 'Enter', 'KeyD'], displayCode: 'KeyD' },
  farmTalkSkip: { codes: ['KeyF'], displayCode: 'KeyF' },
};

/** Option A / B / C in visual order — Z / X / C. */
export const OPTION_SHORTCUT_ACTIONS = [
  'trialOptionA',
  'trialOptionB',
  'trialOptionC',
] as const satisfies readonly ShortcutAction[];

const WORD_KEYCAPS: Record<string, string> = {
  Space: 'Space',
  Enter: 'Enter',
  Tab: 'Tab',
  Escape: 'Esc',
  Shift: 'Shift',
  ShiftLeft: 'Shift',
  ShiftRight: 'Shift',
};

const ARROW_KEYCAPS: Record<string, string> = {
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
};

/** Readable keycap for a KeyboardEvent `code` (or `'Shift'` for the hint). */
export function keycapForCode(code: string): string {
  const word = WORD_KEYCAPS[code];
  if (word) return word;
  const arrow = ARROW_KEYCAPS[code];
  if (arrow) return arrow;
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return code;
}

/** Space-delimited `aria-keyshortcuts` value for an action, extras appended. */
export function ariaKeyShortcutsFor(action: ShortcutAction, extra: readonly string[] = []): string {
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const code of [...KEY_BINDINGS[action].codes, ...extra]) {
    if (seen.has(code)) continue;
    seen.add(code);
    labels.push(keycapForCode(code));
  }
  return labels.join(' ');
}
