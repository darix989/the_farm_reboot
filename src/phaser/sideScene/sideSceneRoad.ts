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

/** How far inside the world edge an edge spawn (`left`/`right`) lands — what the scene
 *  hardcoded (`resolvePortal(portals[0]).x + 120`) before entry spawns became data-driven. */
export const EDGE_SPAWN_INSET = 120;

/** How far downstage of the road's own mid-line a `back`/`front` entry spawns — enough
 *  that the player reads as standing a step clear of the door, not on top of it. */
const PORTAL_SPAWN_DOWNSTAGE_PX = 40;

export interface EntrySpawn {
  x: number;
  y: number;
  facing: 'left' | 'right';
}

/**
 * Where the player lands entering `descriptor` through `entryPortalId` — or the scene's
 * first-authored portal when `entryPortalId` is absent or names no portal in this scene,
 * the same fallback the scene's own hardcoded spawn used to be. An empty `portals` list
 * centre-spawns rather than throwing: a scene still being authored should still preview.
 */
/**
 * Where Rue stands when the scene is entered from the menu (no portal, no saved pose).
 * An authored `playerSpawn` wins; otherwise the first portal, same as a hop with no id.
 */
export function resolveDefaultSpawn(descriptor: SideSceneDescriptor): EntrySpawn {
  const spawn = descriptor.playerSpawn;
  if (!spawn) return resolveEntrySpawn(descriptor);
  const midY = (descriptor.road.top + descriptor.road.bottom) / 2;
  return {
    x: Math.max(0, Math.min(descriptor.width, spawn.x)),
    y: clampToRoad(spawn.y ?? midY, descriptor.road),
    facing: spawn.facing ?? 'right',
  };
}

export function resolveEntrySpawn(
  descriptor: SideSceneDescriptor,
  entryPortalId?: string,
): EntrySpawn {
  if (descriptor.portals.length === 0) {
    return {
      x: descriptor.width / 2,
      y: (descriptor.road.top + descriptor.road.bottom) / 2,
      facing: 'right',
    };
  }

  const portal =
    descriptor.portals.find((candidate) => candidate.id === entryPortalId) ?? descriptor.portals[0];
  const { x, y: midY } = resolvePortal(portal, descriptor);

  switch (portal.side) {
    case 'left':
      return { x: EDGE_SPAWN_INSET, y: midY, facing: 'right' };
    case 'right':
      return { x: descriptor.width - EDGE_SPAWN_INSET, y: midY, facing: 'left' };
    default: {
      // Face whichever stretch of road is longer from here, the same instinct a
      // "which way do I go" spawn should give the player.
      const facing: 'left' | 'right' = x <= descriptor.width / 2 ? 'right' : 'left';
      return { x, y: clampToRoad(midY + PORTAL_SPAWN_DOWNSTAGE_PX, descriptor.road), facing };
    }
  }
}
