import { describe, expect, it } from 'vitest';
import {
  clampToRoad,
  EDGE_SPAWN_INSET,
  resolveEntrySpawn,
  resolvePortal,
  roadDepthScale,
} from './sideSceneRoad';
import type { SideSceneDescriptor } from '../../types/sideScene';

const ROAD: SideSceneDescriptor['road'] = { top: 837, bottom: 999 };
const DESCRIPTOR: Pick<SideSceneDescriptor, 'width' | 'road'> = { width: 7680, road: ROAD };

const FULL_DESCRIPTOR: SideSceneDescriptor = {
  id: 'greenMeadowsRoad',
  width: 7680,
  scale: 0.8543,
  firstTop: 400,
  road: ROAD,
  layers: [],
  props: [],
  fences: [],
  npcs: [],
  portals: [
    { id: 'west', side: 'left' },
    { id: 'barn-door', side: 'back', x: 1260 },
    { id: 'gate', side: 'back', x: 3800 },
    { id: 'far-back', side: 'back', x: 5000 },
    { id: 'east', side: 'right' },
  ],
};

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

describe('resolveEntrySpawn', () => {
  it('spawns inset from the left edge, facing right, for a left portal', () => {
    const spawn = resolveEntrySpawn(FULL_DESCRIPTOR, 'west');
    expect(spawn.x).toBe(EDGE_SPAWN_INSET);
    expect(spawn.facing).toBe('right');
  });

  it('spawns inset from the right edge, facing left, for a right portal', () => {
    const spawn = resolveEntrySpawn(FULL_DESCRIPTOR, 'east');
    expect(spawn.x).toBe(FULL_DESCRIPTOR.width - EDGE_SPAWN_INSET);
    expect(spawn.facing).toBe('left');
  });

  it("spawns at a back portal's own x, a little downstage of mid-road", () => {
    const spawn = resolveEntrySpawn(FULL_DESCRIPTOR, 'barn-door');
    expect(spawn.x).toBe(1260);
    const mid = (ROAD.top + ROAD.bottom) / 2;
    expect(spawn.y).toBeGreaterThan(mid);
    expect(spawn.y).toBeLessThanOrEqual(ROAD.bottom);
  });

  it('faces the longer stretch of road from a back portal', () => {
    // barn-door (x=1260, width=7680) has much more road to its east than its west.
    expect(resolveEntrySpawn(FULL_DESCRIPTOR, 'barn-door').facing).toBe('right');
    // far-back (x=5000, width=7680) has more road to its west than its east.
    expect(resolveEntrySpawn(FULL_DESCRIPTOR, 'far-back').facing).toBe('left');
  });

  it('falls back to the first portal when the entry id is unknown or absent', () => {
    expect(resolveEntrySpawn(FULL_DESCRIPTOR).x).toBe(EDGE_SPAWN_INSET);
    expect(resolveEntrySpawn(FULL_DESCRIPTOR, 'no-such-portal').x).toBe(EDGE_SPAWN_INSET);
  });

  it('centre-spawns rather than throwing when a scene has no portals yet', () => {
    const empty: SideSceneDescriptor = { ...FULL_DESCRIPTOR, portals: [] };
    const spawn = resolveEntrySpawn(empty);
    expect(spawn.x).toBe(empty.width / 2);
    expect(spawn.y).toBe((ROAD.top + ROAD.bottom) / 2);
  });
});
