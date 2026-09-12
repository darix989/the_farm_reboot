import { describe, expect, it } from 'vitest';
import { clampToRoad, resolvePortal, roadDepthScale } from './sideSceneRoad';
import type { SideSceneDescriptor } from '../../types/sideScene';

const ROAD: SideSceneDescriptor['road'] = { top: 837, bottom: 999 };
const DESCRIPTOR: Pick<SideSceneDescriptor, 'width' | 'road'> = { width: 7680, road: ROAD };

describe('clampToRoad', () => {
  it('keeps a point inside the road band', () => {
    expect(clampToRoad(500, ROAD)).toBe(ROAD.top);
    expect(clampToRoad(1200, ROAD)).toBe(ROAD.bottom);
    expect(clampToRoad(900, ROAD)).toBe(900);
  });
});

describe('roadDepthScale', () => {
  it('is monotonically non-decreasing from top to bottom', () => {
    let previous = -Infinity;
    for (let y = ROAD.top; y <= ROAD.bottom; y += 10) {
      const scale = roadDepthScale(y, ROAD);
      expect(scale).toBeGreaterThanOrEqual(previous);
      previous = scale;
    }
  });

  it('is 1 at the bottom of the band', () => {
    expect(roadDepthScale(ROAD.bottom, ROAD)).toBe(1);
  });
});

describe('resolvePortal', () => {
  it('resolves left to x=0 and right to x=width', () => {
    expect(resolvePortal({ id: 'west', side: 'left' }, DESCRIPTOR).x).toBe(0);
    expect(resolvePortal({ id: 'east', side: 'right' }, DESCRIPTOR).x).toBe(DESCRIPTOR.width);
  });

  it('resolves back/front to the authored x', () => {
    expect(resolvePortal({ id: 'gate', side: 'back', x: 3000 }, DESCRIPTOR).x).toBe(3000);
  });

  it('throws for a back/front portal missing x', () => {
    expect(() => resolvePortal({ id: 'gate', side: 'back' }, DESCRIPTOR)).toThrow();
  });
});
