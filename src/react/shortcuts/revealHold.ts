/**
 * Pure hold-state for Shift-to-reveal. A stuck-key (hold, alt-tab, release
 * outside the page) must never latch the overlay forever — blur / hidden /
 * modifier chords all force the flag off.
 *
 * Uses `event.key === 'Shift'` rather than `event.code`, so both physical
 * Shifts count and the rule is layout-proof.
 */

export type RevealHoldEvent =
  | {
      type: 'keydown';
      key: string;
      repeat: boolean;
      shiftKey: boolean;
      metaKey: boolean;
      ctrlKey: boolean;
      altKey: boolean;
    }
  | {
      type: 'keyup';
      key: string;
      shiftKey: boolean;
    }
  | { type: 'blur' }
  | { type: 'hidden' };

export function nextRevealHeld(current: boolean, event: RevealHoldEvent): boolean {
  switch (event.type) {
    case 'blur':
    case 'hidden':
      return false;
    case 'keyup':
      if (event.key === 'Shift' || !event.shiftKey) return false;
      return current;
    case 'keydown':
      if (event.repeat) return current;
      if (event.metaKey || event.ctrlKey || event.altKey) return false;
      if (event.key === 'Shift') return true;
      if (!event.shiftKey) return false;
      return current;
  }
}
