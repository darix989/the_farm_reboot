import { STAGE_DESIGN_HEIGHT } from '../../utils/constants';

export const JOYSTICK_BASE_RADIUS = 80;
export const JOYSTICK_DRAG_RADIUS = 78;
export const JOYSTICK_ACTIVATION_RADIUS = 104;
export const JOYSTICK_SAFE_MARGIN = 48;
export const JOYSTICK_DEAD_ZONE = 0.15;

export const JOYSTICK_CENTER = {
  x: JOYSTICK_BASE_RADIUS + JOYSTICK_SAFE_MARGIN,
  y: STAGE_DESIGN_HEIGHT - JOYSTICK_BASE_RADIUS - JOYSTICK_SAFE_MARGIN,
} as const;

export interface JoystickDrag {
  thumb: { x: number; y: number };
  vector: { x: number; y: number };
}

export function isInsideJoystick(x: number, y: number): boolean {
  return Math.hypot(x - JOYSTICK_CENTER.x, y - JOYSTICK_CENTER.y) <= JOYSTICK_ACTIVATION_RADIUS;
}

/** Resolve a stage-space touch into a clamped thumb position and analogue movement vector. */
export function resolveJoystickDrag(x: number, y: number): JoystickDrag {
  const dx = x - JOYSTICK_CENTER.x;
  const dy = y - JOYSTICK_CENTER.y;
  const distance = Math.hypot(dx, dy);
  const clampedDistance = Math.min(distance, JOYSTICK_DRAG_RADIUS);
  const scale = distance === 0 ? 0 : clampedDistance / distance;
  const strength = clampedDistance / JOYSTICK_DRAG_RADIUS;

  return {
    thumb: {
      x: JOYSTICK_CENTER.x + dx * scale,
      y: JOYSTICK_CENTER.y + dy * scale,
    },
    vector:
      strength < JOYSTICK_DEAD_ZONE
        ? { x: 0, y: 0 }
        : {
            x: distance === 0 ? 0 : (dx / distance) * strength,
            y: distance === 0 ? 0 : (dy / distance) * strength,
          },
  };
}
