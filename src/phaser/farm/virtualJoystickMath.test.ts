import { describe, expect, it } from 'vitest';
import {
  isInsideJoystick,
  JOYSTICK_ACTIVATION_RADIUS,
  JOYSTICK_CENTER,
  JOYSTICK_DEAD_ZONE,
  JOYSTICK_DRAG_RADIUS,
  resolveJoystickDrag,
} from './virtualJoystickMath';

describe('virtual joystick geometry', () => {
  it('accepts starts in the control and rejects starts beyond its activation area', () => {
    expect(isInsideJoystick(JOYSTICK_CENTER.x, JOYSTICK_CENTER.y)).toBe(true);
    expect(
      isInsideJoystick(JOYSTICK_CENTER.x + JOYSTICK_ACTIVATION_RADIUS + 1, JOYSTICK_CENTER.y),
    ).toBe(false);
  });

  it('returns a centered, stopped control at the origin and inside the dead zone', () => {
    expect(resolveJoystickDrag(JOYSTICK_CENTER.x, JOYSTICK_CENTER.y)).toEqual({
      thumb: JOYSTICK_CENTER,
      vector: { x: 0, y: 0 },
    });

    const insideDeadZone = JOYSTICK_DRAG_RADIUS * (JOYSTICK_DEAD_ZONE / 2);
    expect(
      resolveJoystickDrag(JOYSTICK_CENTER.x + insideDeadZone, JOYSTICK_CENTER.y).vector,
    ).toEqual({ x: 0, y: 0 });
  });

  it('keeps cardinal drag strength analogue', () => {
    const drag = resolveJoystickDrag(
      JOYSTICK_CENTER.x + JOYSTICK_DRAG_RADIUS / 2,
      JOYSTICK_CENTER.y,
    );
    expect(drag.vector.x).toBeCloseTo(0.5);
    expect(drag.vector.y).toBeCloseTo(0);
  });

  it('normalizes a full diagonal without making it faster than a cardinal', () => {
    const drag = resolveJoystickDrag(
      JOYSTICK_CENTER.x + JOYSTICK_DRAG_RADIUS,
      JOYSTICK_CENTER.y + JOYSTICK_DRAG_RADIUS,
    );
    expect(Math.hypot(drag.vector.x, drag.vector.y)).toBeCloseTo(1);
    expect(drag.vector.x).toBeCloseTo(Math.SQRT1_2);
    expect(drag.vector.y).toBeCloseTo(Math.SQRT1_2);
  });

  it('clamps the thumb and vector when the drag leaves the base', () => {
    const drag = resolveJoystickDrag(JOYSTICK_CENTER.x - 1000, JOYSTICK_CENTER.y);
    expect(drag.thumb.x).toBeCloseTo(JOYSTICK_CENTER.x - JOYSTICK_DRAG_RADIUS);
    expect(drag.thumb.y).toBeCloseTo(JOYSTICK_CENTER.y);
    expect(drag.vector).toEqual({ x: -1, y: 0 });
  });
});
