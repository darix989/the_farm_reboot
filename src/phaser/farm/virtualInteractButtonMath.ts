import { STAGE_DESIGN_HEIGHT, STAGE_DESIGN_WIDTH } from '../../utils/constants';

/** Geometry for the touch-only Farm action control, opposite the movement stick. */
export const INTERACT_BUTTON_RADIUS = 80;
export const INTERACT_BUTTON_ACTIVATION_RADIUS = 104;
export const INTERACT_BUTTON_SAFE_MARGIN = 48;

export const INTERACT_BUTTON_CENTER = {
  x: STAGE_DESIGN_WIDTH - INTERACT_BUTTON_RADIUS - INTERACT_BUTTON_SAFE_MARGIN,
  y: STAGE_DESIGN_HEIGHT - INTERACT_BUTTON_RADIUS - INTERACT_BUTTON_SAFE_MARGIN,
} as const;

/** Whether a stage-space pointer can activate the Farm interaction control. */
export function isInsideInteractButton(x: number, y: number): boolean {
  return (
    Math.hypot(x - INTERACT_BUTTON_CENTER.x, y - INTERACT_BUTTON_CENTER.y) <=
    INTERACT_BUTTON_ACTIVATION_RADIUS
  );
}
