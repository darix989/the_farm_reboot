/**
 * Data shapes for a lateral side-scrolling farm scene, authored under
 * `src/data/sideScenes/`. See `docs/farm_side_scenes.md` for how to author one.
 *
 * `SideSceneLayer`/`PlacedLayer` back the parallax band stack (`sideSceneLayerStack.ts`);
 * `SidePropSpec`/`SideFenceRun`/`SidePortalSpec` are placed by `sideSceneProps.ts` /
 * `sideSceneFence.ts` / `sideSceneRoad.ts`. Everything here is plain data — no Phaser value
 * import, so descriptor modules stay importable under the Vitest `phaser` stub.
 */
import type { FarmKitAssetId } from '../phaser/sideScene/farmKit.generated';
import type { SideSceneId } from '../data/sideScenes';

export type { SideSceneId };

/**
 * One band in the parallax stack, ordered far -> near in `SideSceneDescriptor.layers`.
 * Placement is computed, never authored directly — see `stackLayers`.
 */
export interface SideSceneLayer {
  asset: FarmKitAssetId;
  /** Content height in native (pre-POT-padding) pixels — `FARM_KIT_ASSETS[asset].height`. */
  nativeHeight: number;
  /**
   * First native row (top-down) where every column of the band is opaque — where the
   * band's silhouette stops being jagged and becomes a solid fill. Measured once per
   * asset (see the plan's asset-analysis table); 0 for a band that is a solid rect
   * from its very first row.
   */
  opaqueFromRow: number;
  /** 0 = pinned to the viewport (sky), 1 = the ground plane (the road). */
  parallax: number;
}

/** A `SideSceneLayer` after `stackLayers` has placed it. Not authored by hand. */
export interface PlacedLayer extends SideSceneLayer {
  top: number;
  bottom: number;
}

export type SidePropBand = 'backdrop' | 'ground' | 'front';

export interface SidePropSpec {
  asset: FarmKitAssetId;
  /** World x. */
  x: number;
  /** World y of the ground-contact point (props are placed with `setOrigin(0.5, 1)`). */
  y: number;
  /** Multiplies the scene's `scale`. Default 1. */
  scale?: number;
  flipX?: boolean;
  /** Resolves depth — see `sideSceneProps.ts`. */
  band: SidePropBand;
}

export interface SideFenceGap {
  x: number;
  width?: number;
  gate?: 'open' | 'closed' | 'complete' | 'none';
}

export interface SideFenceRun {
  /** World y the fence's feet sit on — the near-grass/road seam, not derived. */
  y: number;
  fromX: number;
  toX: number;
  scale?: number;
  gaps: readonly SideFenceGap[];
}

export type SidePortalSide = 'left' | 'right' | 'back' | 'front';

export interface SidePortalSpec {
  id: string;
  side: SidePortalSide;
  /** Required for 'back' / 'front'; derived from scene width for 'left' / 'right'. */
  x?: number;
  /** Authored now, unused until iteration 2. */
  to?: { scene: SideSceneId; portal: string };
}

export interface SideSceneDescriptor {
  id: SideSceneId;
  /** World width in px. */
  width: number;
  /** The one scale multiplier every band, prop and fence run derives from. */
  scale: number;
  /** Horizon placement in screen px — the top of the first (farthest) layer. */
  firstTop: number;
  /**
   * The walkable dirt band, in world y — `road.top`'s visual band starts with a grass
   * fringe painted on (not cut out), so this is narrower than the placed road layer's
   * own `[top, bottom]`. Pinned once by hand against the placed layer stack; the
   * `sideSceneLayerStack.test.ts` fixture checks the two stay in agreement.
   */
  road: { top: number; bottom: number };
  /** Ordered far -> near; stacked via `stackLayers`. */
  layers: readonly SideSceneLayer[];
  props: readonly SidePropSpec[];
  fences: readonly SideFenceRun[];
  portals: readonly SidePortalSpec[];
}
