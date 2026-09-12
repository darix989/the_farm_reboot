import { describe, expect, it } from 'vitest';
import { sideSceneAssetIds, validateSideSceneDescriptor } from './sideSceneAssets';
import type { SideSceneDescriptor } from '../../types/sideScene';

const BASE_DESCRIPTOR: SideSceneDescriptor = {
  id: 'greenMeadowsRoad',
  width: 4000,
  scale: 0.8543,
  firstTop: 400,
  road: { top: 837, bottom: 999 },
  layers: [
    { asset: 'bg/far-hills', nativeHeight: 102, opaqueFromRow: 31, parallax: 0.15 },
    { asset: 'bg/road', nativeHeight: 238, opaqueFromRow: 0, parallax: 1 },
  ],
  props: [
    { asset: 'props/red-barn', x: 500, y: 837, band: 'ground' },
    { asset: 'props/red-barn', x: 900, y: 837, band: 'ground' },
  ],
  fences: [
    {
      y: 796,
      fromX: 0,
      toX: 2000,
      gaps: [{ x: 500, gate: 'open' }],
    },
  ],
  npcs: [{ characterId: 'hetty', x: 700, talkSuffix: 'Side' }],
  portals: [
    { id: 'west', side: 'left' },
    { id: 'east', side: 'right' },
    { id: 'barn-gate', side: 'back', x: 500 },
  ],
};

describe('sideSceneAssetIds', () => {
  it('is deduped and covers layers, props and fences', () => {
    const ids = sideSceneAssetIds(BASE_DESCRIPTOR);
    expect(ids).toContain('bg/far-hills');
    expect(ids).toContain('bg/road');
    expect(ids).toContain('props/red-barn');
    expect(ids).toContain('fence/repeating-piece');
    expect(ids).toContain('fence/gate-open');
    expect(ids.filter((id) => id === 'props/red-barn')).toHaveLength(1);
  });
});

describe('validateSideSceneDescriptor', () => {
  it('passes a well-formed descriptor', () => {
    expect(validateSideSceneDescriptor(BASE_DESCRIPTOR)).toEqual([]);
  });

  it('flags a fence gap outside its own run', () => {
    const bad: SideSceneDescriptor = {
      ...BASE_DESCRIPTOR,
      fences: [{ y: 796, fromX: 0, toX: 100, gaps: [{ x: 500, gate: 'open' }] }],
    };
    expect(validateSideSceneDescriptor(bad)).toHaveLength(1);
  });

  it('flags a back portal x outside the scene width', () => {
    const bad: SideSceneDescriptor = {
      ...BASE_DESCRIPTOR,
      portals: [{ id: 'oops', side: 'back', x: 99999 }],
    };
    expect(validateSideSceneDescriptor(bad)).toHaveLength(1);
  });
});
