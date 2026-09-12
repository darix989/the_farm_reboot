import { describe, expect, it } from 'vitest';
import { stackLayers } from './sideSceneLayerStack';
import type { SideSceneLayer } from '../../types/sideScene';

/**
 * The kit's real measured fixtures (native height / opaque-from-row), from the
 * asset-analysis pass in the plan. Far -> near, matching `STANDARD_FARM_LAYERS`.
 */
const FIXTURE_LAYERS: SideSceneLayer[] = [
  { asset: 'bg/far-hills', nativeHeight: 102, opaqueFromRow: 31, parallax: 0.15 },
  { asset: 'bg/midground-fields-large', nativeHeight: 204, opaqueFromRow: 48, parallax: 0.35 },
  { asset: 'bg/near-grass', nativeHeight: 227, opaqueFromRow: 22, parallax: 0.65 },
  { asset: 'bg/road', nativeHeight: 238, opaqueFromRow: 0, parallax: 1 },
  { asset: 'bg/front-grass', nativeHeight: 126, opaqueFromRow: 31, parallax: 1 },
];

const SCALE = 0.8543;
const FIRST_TOP = 400;

describe('stackLayers', () => {
  it('closes every consecutive pair with no gap', () => {
    const placed = stackLayers(FIXTURE_LAYERS, { scale: SCALE, firstTop: FIRST_TOP });
    for (let i = 1; i < placed.length; i += 1) {
      const seam = placed[i].top + placed[i].opaqueFromRow * SCALE;
      expect(seam).toBeCloseTo(placed[i - 1].bottom, 1);
    }
  });

  it('places tops in strictly increasing order', () => {
    const placed = stackLayers(FIXTURE_LAYERS, { scale: SCALE, firstTop: FIRST_TOP });
    for (let i = 1; i < placed.length; i += 1) {
      expect(placed[i].top).toBeGreaterThan(placed[i - 1].top);
    }
  });

  it('matches the plan-derived numbers for firstTop=400, scale=0.8543', () => {
    const placed = stackLayers(FIXTURE_LAYERS, { scale: SCALE, firstTop: FIRST_TOP });
    const [farHills, midground, nearGrass, road, frontGrass] = placed;

    expect(farHills.top).toBeCloseTo(400.0, 1);
    expect(farHills.bottom).toBeCloseTo(487.1, 1);
    expect(midground.top).toBeCloseTo(446.1, 1);
    expect(midground.bottom).toBeCloseTo(620.4, 1);
    expect(nearGrass.top).toBeCloseTo(601.6, 1);
    expect(nearGrass.bottom).toBeCloseTo(795.5, 1);
    expect(road.top).toBeCloseTo(795.5, 1);
    expect(road.bottom).toBeCloseTo(998.9, 1);
    expect(frontGrass.top).toBeCloseTo(972.4, 1);
  });

  it('lands the last band bottom within 1075-1085', () => {
    const placed = stackLayers(FIXTURE_LAYERS, { scale: SCALE, firstTop: FIRST_TOP });
    const last = placed[placed.length - 1];
    expect(last.bottom).toBeGreaterThanOrEqual(1075);
    expect(last.bottom).toBeLessThanOrEqual(1085);
  });
});
