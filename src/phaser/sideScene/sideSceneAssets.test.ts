import { describe, expect, it } from 'vitest';
import { sideSceneAssetIds, validateSideSceneDescriptor } from './sideSceneAssets';
import type { SideSceneDescriptor, SideSceneId } from '../../types/sideScene';

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
  npcs: [{ characterId: 'hetty', x: 700 }],
  portals: [
    { id: 'west', side: 'left' },
    {
      id: 'east',
      side: 'right',
      to: { scene: 'hettysBarn', portal: 'back', label: 'farmSidePortalBarn' },
    },
    { id: 'barn-gate', side: 'back', x: 500 },
  ],
};

const OTHER_DESCRIPTOR: SideSceneDescriptor = {
  ...BASE_DESCRIPTOR,
  id: 'hettysBarn',
  portals: [
    {
      id: 'back',
      side: 'back',
      x: 300,
      to: { scene: 'greenMeadowsRoad', portal: 'east', label: 'farmSidePortalBackToRoad' },
    },
  ],
};

const REGISTRY: Readonly<Record<SideSceneId, SideSceneDescriptor>> = {
  greenMeadowsRoad: BASE_DESCRIPTOR,
  hettysBarn: OTHER_DESCRIPTOR,
  gateLane: OTHER_DESCRIPTOR,
  eastOrchard: OTHER_DESCRIPTOR,
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
  it('passes a well-formed, symmetrically-linked descriptor', () => {
    expect(validateSideSceneDescriptor(BASE_DESCRIPTOR, REGISTRY)).toEqual([]);
  });

  it('flags a fence gap outside its own run', () => {
    const bad: SideSceneDescriptor = {
      ...BASE_DESCRIPTOR,
      fences: [{ y: 796, fromX: 0, toX: 100, gaps: [{ x: 500, gate: 'open' }] }],
    };
    expect(validateSideSceneDescriptor(bad, REGISTRY)).toHaveLength(1);
  });

  it('flags a back portal x outside the scene width', () => {
    const bad: SideSceneDescriptor = {
      ...BASE_DESCRIPTOR,
      portals: [{ id: 'oops', side: 'back', x: 99999 }],
    };
    expect(validateSideSceneDescriptor(bad, REGISTRY)).toHaveLength(1);
  });

  it('flags a scene with no portals at all', () => {
    const bad: SideSceneDescriptor = { ...BASE_DESCRIPTOR, portals: [] };
    expect(validateSideSceneDescriptor(bad, REGISTRY)).toHaveLength(1);
  });

  it('flags duplicate portal ids within one scene', () => {
    const bad: SideSceneDescriptor = {
      ...BASE_DESCRIPTOR,
      portals: [
        { id: 'west', side: 'left' },
        { id: 'west', side: 'right' },
      ],
    };
    expect(validateSideSceneDescriptor(bad, REGISTRY)).toHaveLength(1);
  });

  it('flags a portal targeting an unregistered scene', () => {
    const bad: SideSceneDescriptor = {
      ...BASE_DESCRIPTOR,
      portals: [
        {
          id: 'west',
          side: 'left',
          to: { scene: 'nowhere' as SideSceneId, portal: 'x', label: 'farmSidePortalBarn' },
        },
      ],
    };
    expect(validateSideSceneDescriptor(bad, REGISTRY)).toHaveLength(1);
  });

  it('flags a portal targeting a portal id that does not exist on the target scene', () => {
    const bad: SideSceneDescriptor = {
      ...BASE_DESCRIPTOR,
      portals: [
        {
          id: 'west',
          side: 'left',
          to: { scene: 'hettysBarn', portal: 'does-not-exist', label: 'farmSidePortalBarn' },
        },
      ],
    };
    expect(validateSideSceneDescriptor(bad, REGISTRY)).toHaveLength(1);
  });

  it('flags a one-way link — the target portal does not point back', () => {
    const oneWayTarget: SideSceneDescriptor = {
      ...OTHER_DESCRIPTOR,
      portals: [{ id: 'back', side: 'back', x: 300 }],
    };
    const registry: Readonly<Record<SideSceneId, SideSceneDescriptor>> = {
      ...REGISTRY,
      hettysBarn: oneWayTarget,
    };
    const bad: SideSceneDescriptor = {
      ...BASE_DESCRIPTOR,
      portals: [
        {
          id: 'east',
          side: 'right',
          to: { scene: 'hettysBarn', portal: 'back', label: 'farmSidePortalBarn' },
        },
      ],
    };
    expect(validateSideSceneDescriptor(bad, registry)).toHaveLength(1);
  });
});
