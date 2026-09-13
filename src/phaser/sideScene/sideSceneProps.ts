/**
 * Places `SidePropSpec[]` and `SideFenceRun[]`, and owns the depth model both (and the
 * debug walker) resolve against.
 *
 * `Farm.ts`'s `setDepth(y)` convention doesn't transfer: the ground plane's `y` only
 * spans ~837-999, so a plain `setDepth(y)` can never place anything *behind* a backdrop
 * band (every backdrop depth would have to be negative and every ground `y` is
 * positive) — which blocks "barn tucked behind the midground hills," something this kit
 * is clearly built for. Each spec instead names a `band`, and depth resolves to a large
 * fixed offset per band (so bands never interleave) plus a tiny per-`y` nudge (so props
 * within the same band still sort correctly against each other and against the walker).
 */
import type { Scene } from 'phaser';
import { sideSceneTextureKey } from './sideSceneAssets';
import { buildFenceRun } from './sideSceneFence';
import type { SideFenceRun, SidePropBand, SidePropSpec } from '../../types/sideScene';

export const BAND_DEPTH: Record<SidePropBand, number> = {
  backdrop: -1000,
  ground: 0,
  /** Above every ground-plane depth — what makes the front-grass occluder trick work. */
  front: 1000,
};

export function resolveBandDepth(band: SidePropBand, y: number): number {
  return BAND_DEPTH[band] + y * 0.001;
}

export function placeProps(scene: Scene, props: readonly SidePropSpec[], sceneScale: number): void {
  props.forEach((prop) => {
    scene.add
      .image(prop.x, prop.y, sideSceneTextureKey(prop.asset))
      .setOrigin(0.5, 1)
      .setScale(sceneScale * (prop.scale ?? 1))
      .setFlipX(prop.flipX ?? false)
      .setDepth(resolveBandDepth(prop.band, prop.y));
  });
}

/**
 * Fence pieces sit in the `'ground'` band at the run's own anchor `y` (the near-grass /
 * road seam) — above the walker's road-band `y` by construction, so a fence sorts
 * behind whoever is walking without a special case.
 */
export function placeFences(scene: Scene, fences: readonly SideFenceRun[]): void {
  fences.forEach((fence) => {
    buildFenceRun(fence).forEach((placement) => {
      // A run piece is placed at its own left edge so consecutive pieces abut exactly
      // at the tiling pitch (see `buildFenceRun`); a gate is centred on its gap.
      const originX = placement.kind === 'piece' ? 0 : 0.5;
      scene.add
        .image(placement.x, placement.y, sideSceneTextureKey(placement.asset))
        .setOrigin(originX, 1)
        .setScale(placement.scale)
        .setDepth(resolveBandDepth('ground', placement.y));
    });
  });
}
