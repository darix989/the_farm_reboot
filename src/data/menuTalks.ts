/**
 * Main-menu catalog of farm talks. One entry per `FARM_TALK` slot so the Dialogs
 * section can jump onto that NPC's road and force that conversation, ignoring
 * current progress. `menuTalks.test.ts` keeps this list in lockstep with `FARM_TALK`.
 */
import type { Labels } from './labels';
import { SIDE_SCENES } from './sideScenes';
import type { SideSceneId } from '../types/sideScene';
import { clampToRoad } from '../phaser/sideScene/sideSceneRoad';
import { SIDE_NPC_INTERACT_RADIUS } from '../phaser/sideScene/sideSceneInteractions';
import type { SideSceneResume } from '../store/gameStore';

export interface MenuTalkEntry {
  slotKey: string;
  npcId: string;
  titleLabel: Labels;
  sceneId: SideSceneId;
}

export interface MenuTalkGroup {
  id: string;
  headingLabel: Labels;
  entries: readonly MenuTalkEntry[];
}

const NPC_SCENE: Record<string, SideSceneId> = Object.fromEntries(
  Object.values(SIDE_SCENES).flatMap((scene) =>
    scene.npcs.map((npc) => [npc.characterId, scene.id] as const),
  ),
);

function sceneIdForNpc(npcId: string): SideSceneId {
  const sceneId = NPC_SCENE[npcId];
  if (!sceneId) {
    throw new Error(`No side scene hosts "${npcId}"`);
  }
  return sceneId;
}

function talk(slotKey: string, npcId: string, titleLabel: Labels): MenuTalkEntry {
  return { slotKey, npcId, titleLabel, sceneId: sceneIdForNpc(npcId) };
}

export const MENU_TALK_GROUPS: readonly MenuTalkGroup[] = [
  {
    id: 'dot',
    headingLabel: 'farmNpcDot',
    entries: [
      talk('dot1', 'dot', 'menuTalkDot1'),
      talk('dot2', 'dot', 'menuTalkDot2'),
      talk('dot3', 'dot', 'menuTalkDot3'),
      talk('dot4', 'dot', 'menuTalkDot4'),
      talk('dot5', 'dot', 'menuTalkDot5'),
      talk('dot6', 'dot', 'menuTalkDot6'),
      talk('dot7', 'dot', 'menuTalkDot7'),
      talk('dotDone', 'dot', 'menuTalkDotDone'),
    ],
  },
  {
    id: 'bram',
    headingLabel: 'farmNpcBram',
    entries: [
      talk('bram1', 'bram', 'menuTalkBram1'),
      talk('bram2', 'bram', 'menuTalkBram2'),
      talk('bram3', 'bram', 'menuTalkBram3'),
      talk('bramMeet', 'bram', 'menuTalkBramMeet'),
      talk('bramDone', 'bram', 'menuTalkBramDone'),
    ],
  },
  {
    id: 'cass',
    headingLabel: 'farmNpcCass',
    entries: [
      talk('cass1', 'cass', 'menuTalkCass1'),
      talk('cass2', 'cass', 'menuTalkCass2'),
      talk('cassMeet', 'cass', 'menuTalkCassMeet'),
      talk('cassDone', 'cass', 'menuTalkCassDone'),
    ],
  },
  {
    id: 'hetty',
    headingLabel: 'farmNpcHetty',
    entries: [
      talk('hetty1', 'hetty', 'menuTalkHetty1'),
      talk('hetty2', 'hetty', 'menuTalkHetty2'),
      talk('hettyMeet', 'hetty', 'menuTalkHettyMeet'),
      talk('hettyDone', 'hetty', 'menuTalkHettyDone'),
    ],
  },
  {
    id: 'duchess',
    headingLabel: 'farmNpcDuchess',
    entries: [
      talk('duchess1', 'duchess', 'menuTalkDuchess1'),
      talk('duchessMeet', 'duchess', 'menuTalkDuchessMeet'),
      talk('duchessDone', 'duchess', 'menuTalkDuchessDone'),
    ],
  },
  {
    id: 'tobias',
    headingLabel: 'farmNpcTobias',
    entries: [
      talk('tobias1', 'tobias', 'menuTalkTobias1'),
      talk('tobiasDone', 'tobias', 'menuTalkTobiasDone'),
    ],
  },
  {
    id: 'bella',
    headingLabel: 'farmNpcBella',
    entries: [
      talk('bella1', 'bella', 'menuTalkBella1'),
      talk('bellaDone', 'bella', 'menuTalkBellaDone'),
    ],
  },
  {
    id: 'pip',
    headingLabel: 'farmNpcPip',
    entries: [talk('pipDone', 'pip', 'menuTalkPipDone')],
  },
  {
    id: 'followUps',
    headingLabel: 'mainMenuFollowUps',
    entries: [
      talk('followUp:030_bram_teaches_dialog', 'bram', 'menuTalkFollowUpBramRounds'),
      talk('followUp:020_cass_teaches_ad_hominem', 'cass', 'menuTalkFollowUpCassAdHominem'),
      talk('followUp:021_hetty_ad_hominem_barrage', 'hetty', 'menuTalkFollowUpHettyBarrage'),
      talk(
        'followUp:023_cass_teaches_appeal_to_popularity',
        'cass',
        'menuTalkFollowUpCassPopularity',
      ),
      talk('followUp:010_gossip_trough_hetty', 'hetty', 'menuTalkFollowUpHettyGrate'),
      talk('followUp:032_bram_teaches_unlocks', 'bram', 'menuTalkFollowUpBramUnlocks'),
      talk('followUp:014_skirmish_bram_fenceline', 'bram', 'menuTalkFollowUpBramSkirmish'),
      talk('followUp:015_tobias_vs_rue', 'duchess', 'menuTalkFollowUpDuchessBoss'),
    ],
  },
];

/** Gap from the NPC so Rue faces them without overlapping, still inside interact range. */
export const MENU_TALK_SPAWN_GAP = Math.min(280, SIDE_NPC_INTERACT_RADIUS - 40);

/** Pose used when a Dialogs-section jump boots `FarmSide` onto a specific speaker. */
export function resumeBesideNpc(npcId: string, sceneId: SideSceneId): SideSceneResume {
  const scene = SIDE_SCENES[sceneId];
  const npc = scene.npcs.find((entry) => entry.characterId === npcId);
  const midY = (scene.road.top + scene.road.bottom) / 2;
  if (!npc) {
    return {
      sceneId,
      x: Math.max(0, Math.min(scene.width, scene.playerSpawn?.x ?? scene.width / 2)),
      y: clampToRoad(scene.playerSpawn?.y ?? midY, scene.road),
      facing: scene.playerSpawn?.facing ?? 'right',
    };
  }

  const npcFacing = npc.facing ?? 'left';
  const x = npcFacing === 'left' ? npc.x - MENU_TALK_SPAWN_GAP : npc.x + MENU_TALK_SPAWN_GAP;
  return {
    sceneId,
    x: Math.max(0, Math.min(scene.width, x)),
    y: clampToRoad(npc.y ?? midY, scene.road),
    facing: npcFacing === 'left' ? 'right' : 'left',
  };
}
