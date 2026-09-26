import { describe, expect, it } from 'vitest';
import {
  INTERACT_BUTTON_ACTIVATION_RADIUS,
  INTERACT_BUTTON_CENTER,
  isInsideInteractButton,
} from './virtualInteractButtonMath';

describe('virtual interact button geometry', () => {
  it('accepts taps in its bottom-right target and rejects taps beyond it', () => {
    expect(isInsideInteractButton(INTERACT_BUTTON_CENTER.x, INTERACT_BUTTON_CENTER.y)).toBe(true);
    expect(
      isInsideInteractButton(
        INTERACT_BUTTON_CENTER.x + INTERACT_BUTTON_ACTIVATION_RADIUS + 1,
        INTERACT_BUTTON_CENTER.y,
      ),
    ).toBe(false);
  });
});
