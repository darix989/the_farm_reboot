import { KEY_BINDINGS } from '../../../data/keyBindings';

/** Footer Continue / Confirm / Leave — plus D as the dedicated proceed key. */
export const CONTINUE_CODES: readonly string[] = KEY_BINDINGS.trialContinue.codes;

export const ANALYZE_CODE = KEY_BINDINGS.trialAnalyze.displayCode;
export const BACK_CODE = KEY_BINDINGS.trialBack.displayCode;

/** Visual option A / B / C, in that order. */
export const OPTION_CODES = [
  KEY_BINDINGS.trialOptionA.displayCode,
  KEY_BINDINGS.trialOptionB.displayCode,
  KEY_BINDINGS.trialOptionC.displayCode,
] as const;

export function isContinueCode(code: string, extraCodes: readonly string[] = []): boolean {
  return CONTINUE_CODES.includes(code) || extraCodes.includes(code);
}

export function optionIndexForCode(code: string): number | null {
  const index = (OPTION_CODES as readonly string[]).indexOf(code);
  return index === -1 ? null : index;
}

function eventTargetElement(event: KeyboardEvent): HTMLElement | null {
  return event.target as HTMLElement | null;
}

/** Focused control whose own Space / Enter activation we must not steal. */
export function isNativeActivateTarget(event: KeyboardEvent): boolean {
  return !!eventTargetElement(event)?.closest(
    'button, a, input, textarea, select, [contenteditable]',
  );
}

/** A real text field — letter keys should type here, not fire action shortcuts. */
export function isTextFieldTarget(event: KeyboardEvent): boolean {
  return !!eventTargetElement(event)?.closest('input, textarea, select, [contenteditable]');
}

/**
 * Repeat, a modifier chord (including Shift — reveal mode must not commit a
 * choice), or a target that should keep the key: focused buttons/links for
 * Space / Enter (native activation), text fields for letter keys.
 */
export function shouldIgnoreActionShortcut(event: KeyboardEvent): boolean {
  if (event.repeat || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
    return true;
  }
  if (event.code === 'Space' || event.code === 'Enter') {
    return isNativeActivateTarget(event);
  }
  return isTextFieldTarget(event);
}

export { OPTION_SHORTCUT_ACTIONS } from '../../../data/keyBindings';
