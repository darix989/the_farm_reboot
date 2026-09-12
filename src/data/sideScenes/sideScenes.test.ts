/**
 * The data test every new scene has to pass before it ships: every registered descriptor
 * validates clean (no fence gap outside its run, no dangling or one-way portal), and the
 * whole registry's combined farm-kit footprint stays inside budget.
 */
import { describe, expect, it } from 'vitest';
import { SIDE_SCENES } from './index';
import {
  sideSceneAssetIds,
  validateSideSceneDescriptor,
} from '../../phaser/sideScene/sideSceneAssets';
import { FARM_KIT_ASSETS } from '../../phaser/sideScene/farmKit.generated';
import { resolveDefaultSpawn } from '../../phaser/sideScene/sideSceneRoad';
import { PORTAL_INTERACT_RADIUS } from '../../phaser/sideScene/sideSceneInteractions';

/** Same 400px talk radius `FarmSide` uses — close enough to count as "beside". */
const INTERACT_RADIUS_NPC = 400;

describe('SIDE_SCENES', () => {
  it('every registered scene validates clean', () => {
    Object.values(SIDE_SCENES).forEach((descriptor) => {
      expect(validateSideSceneDescriptor(descriptor, SIDE_SCENES)).toEqual([]);
    });
  });

  /**
   * Pinned so a new scene that reaches for a farm-kit asset none of its siblings use
   * gets caught here rather than as a surprise loading-overlay flash in play: every hop
   * between the four registered scenes is supposed to be a warm hop, on the strength of
   * the three new scenes being authored strictly from ids `greenMeadowsRoad` already
   * loads. The budget has headroom above the measured total for exactly the kind of
   * small variation (a different flower, one more tree) authoring a scene involves —
   * not for a whole new backdrop band or prop category.
   */
  it('stays within the decoded farm-kit texture budget across every registered scene', () => {
    const BYTES_PER_PIXEL = 4;
    // Measured total across all four registered scenes is ~40MB (they share
    // `greenMeadowsRoad`'s own asset ids, so the union barely grows past its ~40MB-resident
    // baseline) — 45MB leaves headroom for the odd extra flower or tree variant an author
    // reaches for, without silently absorbing a whole new backdrop band or prop category.
    const BUDGET_BYTES = 45 * 1024 * 1024;

    const ids = new Set<string>();
    Object.values(SIDE_SCENES).forEach((descriptor) => {
      sideSceneAssetIds(descriptor).forEach((id) => ids.add(id));
    });

    const totalBytes = [...ids].reduce((sum, id) => {
      const asset = FARM_KIT_ASSETS[id as keyof typeof FARM_KIT_ASSETS];
      return sum + asset.fileWidth * asset.fileHeight * BYTES_PER_PIXEL;
    }, 0);

    expect(totalBytes).toBeLessThanOrEqual(BUDGET_BYTES);
  });

  it('places each Level 1 character once: Hetty in the barn, Cass on the road by the gate', () => {
    const byId: Record<string, string[]> = {};
    Object.values(SIDE_SCENES).forEach((descriptor) => {
      descriptor.npcs.forEach((npc) => {
        (byId[npc.characterId] ??= []).push(descriptor.id);
      });
    });
    expect(byId.hetty).toEqual(['hettysBarn']);
    expect(byId.cass).toEqual(['greenMeadowsRoad']);
    expect(byId.dot).toEqual(['greenMeadowsRoad']);
    expect(byId.bram).toEqual(['gateLane']);
    expect(byId.duchess).toEqual(['eastOrchard']);
    expect(byId.tobias).toEqual(['eastOrchard']);
  });

  it('stands Dot and the first-visit spawn west of the barn door, clear of its interact radius', () => {
    const road = SIDE_SCENES.greenMeadowsRoad;
    const dot = road.npcs.find((npc) => npc.characterId === 'dot');
    const barn = road.portals.find((portal) => portal.id === 'barn-door');
    expect(dot).toBeDefined();
    expect(barn?.x).toBeDefined();
    const spawn = resolveDefaultSpawn(road);
    expect(barn!.x! - dot!.x).toBeGreaterThan(PORTAL_INTERACT_RADIUS);
    expect(barn!.x! - spawn.x).toBeGreaterThan(PORTAL_INTERACT_RADIUS);
    expect(Math.abs(spawn.x - dot!.x)).toBeLessThan(INTERACT_RADIUS_NPC);
    expect(spawn.facing).toBe('right');
    expect(dot!.facing).toBe('left');
  });
});
