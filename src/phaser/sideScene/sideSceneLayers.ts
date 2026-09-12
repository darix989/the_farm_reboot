/**
 * Builds the parallax band stack (sky + backdrop bands + road + front-grass occluder)
 * and updates it once per frame from the scene's own locally-computed `scrollX`.
 *
 * Every band uses the same recipe: `scrollFactor(0, 1)`, sized to the band's own screen
 * height (not the full viewport — a `TileSprite`'s internal canvas is real GPU + CPU
 * memory, and every band here is a few hundred px tall), with `tilePositionX` driven
 * from the scene's own `scrollX` each frame — divided by `tileScaleX`, since
 * `tilePositionX` is measured in unscaled source pixels but multiplied by `tileScaleX`
 * at render time; skipping that division scrolls every band at the wrong rate.
 *
 * Only the **x** scroll factor is 0: a band's own `y` is a world coordinate, and leaving
 * `scrollFactorY` at 1 is what lets the talk camera tilt down onto two animals without the
 * ground sliding out from under them (`sideSceneCamera.ts`). While the camera sits at
 * `scrollY === 0` — everything but a talk — that is identical to pinning it, which is why
 * iteration 1 could not tell the difference. The sky is the one thing still pinned on both
 * axes: it has no world position to be right about.
 *
 * `parallax` ranges from 0 (pinned, doesn't scroll at all) to 1 (the road: scrolls
 * exactly as fast as the camera, i.e. pixel-locked to world coordinates). An earlier
 * version gave `parallax === 1` bands a different, "world-space" recipe instead,
 * re-snapping the sprite's own `x` to a tile boundary every frame — that is the
 * textbook fix for the one-frame lag `camera.scrollX` has if you read it back out of
 * the camera in `update()` (Phaser assigns it during its own render pass, *after*
 * `update()` runs). This scene never reads it back: `FarmSide` computes `scrollX`
 * itself once per frame and both assigns it to `cam.scrollX` and passes it here, so
 * every band already reads the same same-tick value — there is no lag to work around.
 * The re-snapping recipe was worse besides being unnecessary: its tile-boundary math
 * used the band's *native* content width, not the power-of-two width the file was
 * padded to (`build-farm-kit-manifest.mjs`), which is the period `TileSprite` actually
 * repeats at — a mismatch that made the road's texture jump a few pixels out of phase
 * exactly when the snap point was crossed.
 *
 * Under the last band goes a flat **ground fill**, in the exact colour the front-grass art
 * ends on. The stack is built to fill the stage and no further, which is all a free-roaming
 * camera can see — but a talk camera aims down at the road and pushes in, and without the
 * fill the bottom of the stage would be bare canvas under the front grass for the length of
 * that move (see `sideSceneCamera.ts`).
 *
 * Front grass is the **last** entry in `descriptor.layers` by convention (see
 * `STANDARD_FARM_LAYERS`) and gets `BAND_DEPTH.front` instead of the road's depth —
 * that fixed depth, above every ground-plane object, is what makes "grass passes in
 * front of the walker's feet" work.
 */
import type { Scene } from 'phaser';
import { sideSceneTextureKey } from './sideSceneAssets';
import { stackLayers } from './sideSceneLayerStack';
import { BAND_DEPTH } from './sideSceneProps';
import type { PlacedLayer, SideSceneDescriptor } from '../../types/sideScene';

const VIEWPORT_WIDTH = 1920;
const VIEWPORT_HEIGHT = 1080;
const SKY_DEPTH = BAND_DEPTH.backdrop - 100;
/**
 * The colour every column of `bg/front-grass`'s bottom rows is (sampled off the art), so the
 * fill under it is seamless, and how far down it runs — comfortably past anything the talk
 * camera can aim at.
 */
const GROUND_FILL_COLOR = 0x75ab2b;
const GROUND_FILL_DEPTH = 900;
/**
 * How far up into the front-grass band the fill starts, covering the band's own last row.
 * A `TileSprite`'s bottom edge samples across the texture's wrap, which on these bands
 * blends the grass into the transparent padding above it and lets a one-pixel line of sky
 * through — invisible at zoom 1, a hairline across the stage once a talk pushes in.
 */
const GROUND_FILL_OVERLAP = 3;
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
  /** World y the ground stops being painted at — what the camera may not look past. */
  groundBottom: number;
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

  const bands: { sprite: Phaser.GameObjects.TileSprite; parallax: number }[] = [];

  placed.forEach((layer, index) => {
    const key = sideSceneTextureKey(layer.asset);
    const height = layer.bottom - layer.top;
    const isFrontGrass = index === placed.length - 1;
    const depth =
      layer.parallax >= 1
        ? isFrontGrass
          ? BAND_DEPTH.front
          : ROAD_DEPTH
        : BAND_DEPTH.backdrop + index;

    const sprite = scene.add
      .tileSprite(0, layer.top, VIEWPORT_WIDTH, height, key)
      .setOrigin(0, 0)
      .setScrollFactor(0, 1)
      .setTileScale(descriptor.scale, descriptor.scale)
      .setDepth(depth);
    bands.push({ sprite, parallax: layer.parallax });
  });

  const lastBand = placed[placed.length - 1];
  const groundBottom = lastBand.bottom + GROUND_FILL_DEPTH;
  scene.add
    .rectangle(
      0,
      lastBand.bottom - GROUND_FILL_OVERLAP,
      VIEWPORT_WIDTH,
      GROUND_FILL_DEPTH + GROUND_FILL_OVERLAP,
      GROUND_FILL_COLOR,
    )
    .setOrigin(0, 0)
    .setScrollFactor(0, 1)
    .setDepth(BAND_DEPTH.front);

  const update = (scrollX: number) => {
    bands.forEach(({ sprite, parallax }) => {
      sprite.tilePositionX = (scrollX * parallax) / descriptor.scale;
    });
  };

  return { placed, groundBottom, layers: { update } };
}
