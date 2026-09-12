/**
 * The road band: clamping a point onto it, the pseudo-depth scale ramp across it, and
 * resolving a portal's world rect. Pure — no Phaser value import — so this is where
 * the "one entrance, one or more exits, walking on the road only" contract is unit
 * tested without booting a scene.
 */
import type { SidePortalSpec, SideSceneDescriptor } from '../../types/sideScene';

/** Clamps `y` into `road`'s walkable band. */
export function clampToRoad(y: number, road: SideSceneDescriptor['road']): number {
  return Math.max(road.top, Math.min(road.bottom, y));
}

/**
 * Pseudo-depth scale for standing at `y` within `road`: 1 at the bottom (nearest the
 * camera), shrinking toward `minScale` at the top (farthest down the road).
 */
export function roadDepthScale(
  y: number,
  road: SideSceneDescriptor['road'],
  minScale = 0.85,
): number {
  const span = road.bottom - road.top;
  if (span <= 0) return 1;
  const t = (clampToRoad(y, road) - road.top) / span;
  return minScale + (1 - minScale) * t;
}

export interface PortalRect {
  x: number;
  y: number;
}

/** Where a portal sits in world space. `left`/`right` derive from scene width. */
export function resolvePortal(
  portal: SidePortalSpec,
  descriptor: Pick<SideSceneDescriptor, 'width' | 'road'>,
): PortalRect {
  const y = (descriptor.road.top + descriptor.road.bottom) / 2;
  switch (portal.side) {
    case 'left':
      return { x: 0, y };
    case 'right':
      return { x: descriptor.width, y };
    case 'back':
    case 'front':
      if (portal.x === undefined) {
        throw new Error(`Portal "${portal.id}" (${portal.side}) requires an x.`);
      }
      return { x: portal.x, y };
    default:
      throw new Error(`Unknown portal side: ${portal.side as string}`);
  }
}
