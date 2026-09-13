/**
 * Places a `SideSceneLayer[]` (ordered far -> near) into screen-space `top`/`bottom`
 * bands with no gaps and no guesswork.
 *
 * Given each band's native `height` and `opaqueFromRow` (see `SideSceneLayer`), and a
 * single scale `s` applied to everything:
 *
 *   top[0]    = firstTop
 *   top[i]    = bottom[i-1] - opaqueFromRow[i] * s          for i > 0
 *   bottom[i] = top[i] + nativeHeight[i] * s
 *
 * This guarantees `top[i] + opaqueFromRow[i] * s == bottom[i-1]` — band i's solid fill
 * starts exactly where band i-1 ends, regardless of how jagged either band's silhouette
 * is. Pure and side-effect free so it can be unit-tested against the kit's real measured
 * fixtures without booting Phaser.
 */
import type { PlacedLayer, SideSceneLayer } from '../../types/sideScene';

export interface StackLayersOptions {
  scale: number;
  firstTop: number;
}

export function stackLayers(
  layers: readonly SideSceneLayer[],
  { scale, firstTop }: StackLayersOptions,
): PlacedLayer[] {
  const placed: PlacedLayer[] = [];

  layers.forEach((layer, i) => {
    const top = i === 0 ? firstTop : placed[i - 1].bottom - layer.opaqueFromRow * scale;
    const bottom = top + layer.nativeHeight * scale;
    placed.push({ ...layer, top, bottom });
  });

  return placed;
}
