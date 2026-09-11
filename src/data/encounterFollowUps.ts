/**
 * What happens after the player Leaves a finished Trial, when they came from the farm.
 *
 * A farm talk auto-opens on the animal they just left and points at the next stop.
 * A tutorial opens the matching farm overlay instead. Dialog flags from
 * `setsDialogFlags` wait until that follow-up is heard, so Field Notes Next does
 * not move until the player has been told where to go.
 *
 * Main-menu Leave, and a replay whose flags are already set, skip this and apply
 * flags in the same write as the rest of the rewards. See
 * `src/utils/encounterRewards.ts`.
 */
import type { DebateScenarioKey } from './levels';
import type { FarmTutorialId } from './farmTutorials';

export type EncounterFollowUp =
  | { kind: 'farm_talk'; npcId: string }
  | { kind: 'tutorial'; tutorialId: FarmTutorialId };

/** Queued across the Trial → Farm scene switch. `resetFarmUi` must not clear this. */
export type PendingFollowUp = EncounterFollowUp & { scenarioKey: DebateScenarioKey };

export const ENCOUNTER_FOLLOW_UPS: Partial<Record<DebateScenarioKey, EncounterFollowUp>> = {
  '030_bram_teaches_dialog': { kind: 'farm_talk', npcId: 'bram' },
  '020_cass_teaches_ad_hominem': { kind: 'farm_talk', npcId: 'cass' },
  '021_hetty_ad_hominem_barrage': { kind: 'farm_talk', npcId: 'hetty' },
  '023_cass_teaches_appeal_to_popularity': { kind: 'farm_talk', npcId: 'cass' },
  '010_gossip_trough_hetty': { kind: 'farm_talk', npcId: 'hetty' },
  '032_bram_teaches_unlocks': { kind: 'farm_talk', npcId: 'bram' },
  '014_skirmish_bram_fenceline': { kind: 'farm_talk', npcId: 'bram' },
  '015_tobias_vs_rue': { kind: 'farm_talk', npcId: 'duchess' },
};

export function encounterFollowUpFor(key: DebateScenarioKey): EncounterFollowUp | undefined {
  return ENCOUNTER_FOLLOW_UPS[key];
}
