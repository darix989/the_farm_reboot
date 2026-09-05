/**
 * Movement input for the overworld: arrows, WASD and the touch joystick all
 * collapse into one direction vector, so the scene has a single movement path.
 */
import type { VirtualJoystick } from './VirtualJoystick';

export interface FarmKeys {
  cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  wasd: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
  interact: Phaser.Input.Keyboard.Key[];
}

export function createFarmKeys(scene: Phaser.Scene): FarmKeys | null {
  const kb = scene.input.keyboard;
  if (!kb) return null;
  const K = Phaser.Input.Keyboard.KeyCodes;
  return {
    cursors: kb.createCursorKeys(),
    wasd: {
      up: kb.addKey(K.W),
      down: kb.addKey(K.S),
      left: kb.addKey(K.A),
      right: kb.addKey(K.D),
    },
    // Space and E both talk; Enter too, since it is the obvious key to try.
    interact: [kb.addKey(K.SPACE), kb.addKey(K.E), kb.addKey(K.ENTER)],
  };
}

/**
 * Direction the player wants to move, normalised to length <= 1 so diagonals are
 * not faster than cardinals.
 */
export function movementVector(
  keys: FarmKeys | null,
  joystick: VirtualJoystick | null,
  out: Phaser.Math.Vector2,
): Phaser.Math.Vector2 {
  out.set(0, 0);

  if (keys) {
    if (keys.cursors.left.isDown || keys.wasd.left.isDown) out.x -= 1;
    if (keys.cursors.right.isDown || keys.wasd.right.isDown) out.x += 1;
    if (keys.cursors.up.isDown || keys.wasd.up.isDown) out.y -= 1;
    if (keys.cursors.down.isDown || keys.wasd.down.isDown) out.y += 1;
  }

  if (out.x === 0 && out.y === 0 && joystick) {
    const j = joystick.getVector();
    out.set(j.x, j.y);
  }

  // Keyboard gives (±1, ±1) on a diagonal — length 1.41 — so clamp. The joystick
  // is already <= 1 and must keep its analogue magnitude, hence `limit` not `normalize`.
  return out.limit(1);
}
