/**
 * Builds the parallax band stack (sky + backdrop bands + road + front-grass occluder)
 * and updates it once per frame from the scene's own locally-computed `scrollX`.
 *
 * Two different recipes, not one, because `parallax === 1` (the road) has to be
 * pixel-locked to world coordinates for whatever stands on it, while every band behind
 * it can be a cheap viewport-pinned fill:
 *
 * - **`parallax < 1`**: `scrollFactor(0)`, sized to the band's own screen height (not
 *   the full viewport — a `TileSprite`'s internal fill canvas is real GPU + CPU memory,
 *   and every band here is a few hundred px tall). `tilePositionX` is driven from the
 *   scene's own `scrollX`, divided by `tileScaleX` — `tilePositionX` is measured in
 *   unscaled source pixels but multiplied by `tileScaleX` at render time, so skipping
 *   the division scrolls every band at the wrong rate.
 * - **`parallax === 1`** (road, front-grass): an ordinary **world-space** `TileSprite`,
 *   `scrollFactor(1)`, `tilePositionX` never touched, re-snapped to a whole tile
 *   boundary once per frame instead: `x = floor((scrollX - P) / P) * P`. That makes it
 *   pixel-locked to world coordinates by construction, with no per-frame `scrollX` math
 *   tied to the camera at all, and no one-frame lag against the walker.
 *
 * Front grass is the **last** entry in `descriptor.layers` by convention (see
 * `STANDARD_FARM_LAYERS`) and gets `BAND_DEPTH.front` instead of the road's depth —
 * that fixed depth, above every ground-plane object, is what makes "grass passes in
 * front of the walker's feet" work.
 */
import type { Scene } from 'phaser';
import { FARM_KIT_ASSETS } from './farmKit.generated';
import { sideSceneTextureKey } from './sideSceneAssets';
import { stackLayers } from './sideSceneLayerStack';
import { BAND_DEPTH } from './sideSceneProps';
import type { PlacedLayer, SideSceneDescriptor } from '../../types/sideScene';

const VIEWPORT_WIDTH = 1920;
const VIEWPORT_HEIGHT = 1080;
const SKY_DEPTH = BAND_DEPTH.backdrop - 100;
/** Above every backdrop band, below every ground-plane object — the road surface
 *  itself, not whatever stands on it. */
const ROAD_DEPTH = BAND_DEPTH.ground - 1;

export interface SideSceneLayers {
  /** Call once per frame with the scene's own locally-computed `scrollX`. */
  update(scrollX: number): void;
}

export interface BuiltSideSceneLayers {
  placed: PlacedLayer[];
  layers: SideSceneLayers;
}

export function buildSideSceneLayers(
  scene: Scene,
  descriptor: SideSceneDescriptor,
): BuiltSideSceneLayers {
  const placed = stackLayers(descriptor.layers, descriptor);

  scene.add
    .image(0, 0, sideSceneTextureKey('bg/sky'))
    .setOrigin(0, 0)
    .setDisplaySize(VIEWPORT_WIDTH, VIEWPORT_HEIGHT)
    .setScrollFactor(0)
    .setDepth(SKY_DEPTH);

  const backdrops: { sprite: Phaser.GameObjects.TileSprite; parallax: number }[] = [];
  const worldBands: { sprite: Phaser.GameObjects.TileSprite; tileWidthPx: number }[] = [];

  placed.forEach((layer, index) => {
    const key = sideSceneTextureKey(layer.asset);
    const height = layer.bottom - layer.top;

    if (layer.parallax >= 1) {
      const isFrontGrass = index === placed.length - 1;
      const tileWidthPx = FARM_KIT_ASSETS[layer.asset].width * descriptor.scale;
      const width = VIEWPORT_WIDTH + 2 * tileWidthPx;
      const sprite = scene.add
        .tileSprite(0, layer.top, width, height, key)
        .setOrigin(0, 0)
        .setScrollFactor(1)
        .setTileScale(descriptor.scale, descriptor.scale)
        .setDepth(isFrontGrass ? BAND_DEPTH.front : ROAD_DEPTH);
      worldBands.push({ sprite, tileWidthPx });
      return;
    }

    const sprite = scene.add
      .tileSprite(0, layer.top, VIEWPORT_WIDTH, height, key)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setTileScale(descriptor.scale, descriptor.scale)
      .setDepth(BAND_DEPTH.backdrop + index);
    backdrops.push({ sprite, parallax: layer.parallax });
  });

  const update = (scrollX: number) => {
    backdrops.forEach(({ sprite, parallax }) => {
      sprite.tilePositionX = (scrollX * parallax) / descriptor.scale;
    });
    worldBands.forEach(({ sprite, tileWidthPx }) => {
      sprite.x = Math.floor((scrollX - tileWidthPx) / tileWidthPx) * tileWidthPx;
    });
  };

  return { placed, layers: { update } };
}
