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
   * gets caught here rather than as a surprise loading-overlay flash in play.
   * `hettysBarn` and `gateLane` stay warm hops off `greenMeadowsRoad`; `eastOrchard`
   * and `oldPond` pay a one-time fetch for the pond art and the water band. The budget
   * has headroom above the measured total for small variation (a different flower, one
   * more tree) — not for a whole extra backdrop category on top of the water band.
   */
  it('stays within the decoded farm-kit texture budget across every registered scene', () => {
    const BYTES_PER_PIXEL = 4;
    // Measured total across the five registered scenes is ~42MB (they share most of
    // `greenMeadowsRoad`'s asset ids; `bg/near-muddy-water` is the new ~2MB resident
    // cost) — 45MB still leaves a little headroom for an extra flower or tree variant.
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

  it('places each Level 1 character once: Hetty at the pond, Cass on the road by the gate', () => {
    const byId: Record<string, string[]> = {};
    Object.values(SIDE_SCENES).forEach((descriptor) => {
      descriptor.npcs.forEach((npc) => {
        (byId[npc.characterId] ??= []).push(descriptor.id);
      });
    });
    expect(byId.hetty).toEqual(['oldPond']);
    expect(byId.bella).toEqual(['hettysBarn']);
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

  it('stands the orchard pond portal clear of Duchess and Tobias, and Hetty clear of the return', () => {
    const orchard = SIDE_SCENES.eastOrchard;
    const pond = orchard.portals.find((portal) => portal.id === 'pond');
    const tobias = orchard.npcs.find((npc) => npc.characterId === 'tobias');
    const duchess = orchard.npcs.find((npc) => npc.characterId === 'duchess');
    expect(pond?.x).toBeDefined();
    expect(tobias).toBeDefined();
    expect(duchess).toBeDefined();
    expect(Math.abs(pond!.x! - tobias!.x)).toBeGreaterThan(INTERACT_RADIUS_NPC);
    expect(Math.abs(pond!.x! - duchess!.x)).toBeGreaterThan(INTERACT_RADIUS_NPC);

    const shore = SIDE_SCENES.oldPond;
    const hetty = shore.npcs.find((npc) => npc.characterId === 'hetty');
    const orchardReturn = shore.portals.find((portal) => portal.id === 'orchard');
    const spawn = resolveDefaultSpawn(shore);
    expect(hetty).toBeDefined();
    expect(orchardReturn?.x).toBeDefined();
    expect(Math.abs(hetty!.x - orchardReturn!.x!)).toBeGreaterThan(INTERACT_RADIUS_NPC);
    expect(Math.abs(spawn.x - orchardReturn!.x!)).toBeGreaterThan(PORTAL_INTERACT_RADIUS);
    expect(Math.abs(spawn.x - hetty!.x)).toBeLessThan(INTERACT_RADIUS_NPC);
    expect(spawn.facing).toBe('right');
    expect(hetty!.facing).toBe('left');
  });
});
