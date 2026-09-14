/**
 * The data test every new farm talk has to pass before it ships on the menu:
 * every `FARM_TALK` slot is listed once, and each jump lands on the road that
 * actually hosts that speaker.
 */
import { describe, expect, it } from 'vitest';
import { FARM_TALK } from './farmTalk';
import { SIDE_SCENES } from './sideScenes';
import { MENU_TALK_GROUPS, MENU_TALK_SPAWN_GAP, resumeBesideNpc } from './menuTalks';
import { SIDE_NPC_INTERACT_RADIUS } from '../phaser/sideScene/sideSceneInteractions';

describe('MENU_TALK_GROUPS', () => {
  it('lists every authored farm-talk slot exactly once', () => {
    const listed = MENU_TALK_GROUPS.flatMap((group) => group.entries.map((entry) => entry.slotKey));
    expect([...listed].sort()).toEqual(Object.keys(FARM_TALK).sort());
    expect(new Set(listed).size).toBe(listed.length);
  });

  it('points each talk at the side scene that hosts its speaker', () => {
    MENU_TALK_GROUPS.forEach((group) => {
      group.entries.forEach((entry) => {
        const scene = SIDE_SCENES[entry.sceneId];
        expect(scene.npcs.some((npc) => npc.characterId === entry.npcId)).toBe(true);
      });
    });
  });

  it('stands Rue beside Dot, facing her, inside interact range', () => {
    const resume = resumeBesideNpc('dot', 'greenMeadowsRoad');
    const dot = SIDE_SCENES.greenMeadowsRoad.npcs.find((npc) => npc.characterId === 'dot');
    expect(dot).toBeDefined();
    expect(resume.facing).toBe('right');
    expect(dot!.facing ?? 'left').toBe('left');
    expect(resume.x).toBe(dot!.x - MENU_TALK_SPAWN_GAP);
    expect(Math.abs(resume.x - dot!.x)).toBeLessThan(SIDE_NPC_INTERACT_RADIUS);
  });
});
