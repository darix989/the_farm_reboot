/**
 * Sequential farm-talk beats, keyed by `{npcId}{suffix}` (`hetty1`, `cassDone`)
 * or `followUp:{scenarioKey}` for the pointer talk after a Trial.
 *
 * The suffix is the animal's next unfinished scenario index (`1`, `2`, …), a
 * `talkStages` suffix (`dot1`, `dot2`), `Meet` when their next encounter is still
 * locked and you have never finished one with them, or `Done` when the list is empty.
 * A missing row falls back to the single `farmDialog<Npc><suffix>` label so a new animal
 * is never silent.
 */
import type { AnimalEmotion } from '../phaser/animals/animalEmotions';
import { PLAYER_CHARACTER_ID } from './characters';
import type { DebateScenarioKey } from './levels';
import type { Labels } from './labels';

export interface FarmTalkBeat {
  speakerId: string;
  textLabel: Labels;
  /**
   * Register for the speaker's dialogue portrait. Optional: `talking` — what `FarmDialogue`
   * falls back to — is the honest reading of an ordinary line, so this is set only where a
   * beat is pointedly something else, the way `Statement.emotion` overrides the debate's
   * derivation. Hetty and Tobias get `sneaky` on the beat where the friendliness is doing
   * work; Cass gets `doubtful` sizing Rue up; Bram gets `thinking`, which is his whole
   * character.
   */
  emotion?: AnimalEmotion;
}

const RUE = PLAYER_CHARACTER_ID;

export const FARM_TALK: Readonly<Record<string, readonly FarmTalkBeat[]>> = {
  hetty1: [
    { speakerId: 'hetty', textLabel: 'farmDialogHetty1a' },
    { speakerId: RUE, textLabel: 'farmDialogHetty1b' },
    { speakerId: 'hetty', textLabel: 'farmDialogHetty1c', emotion: 'sneaky' },
  ],
  hetty2: [
    { speakerId: 'hetty', textLabel: 'farmDialogHetty2a' },
    { speakerId: RUE, textLabel: 'farmDialogHetty2b' },
    { speakerId: 'hetty', textLabel: 'farmDialogHetty2c' },
  ],
  hettyDone: [
    { speakerId: 'hetty', textLabel: 'farmDialogHettyDoneA' },
    { speakerId: 'hetty', textLabel: 'farmDialogHettyDoneB' },
  ],
  hettyMeet: [
    { speakerId: 'hetty', textLabel: 'farmDialogHettyMeetA' },
    { speakerId: RUE, textLabel: 'farmDialogHettyMeetB' },
    { speakerId: 'hetty', textLabel: 'farmDialogHettyMeetC' },
  ],
  cass1: [
    { speakerId: 'cass', textLabel: 'farmDialogCass1a' },
    { speakerId: RUE, textLabel: 'farmDialogCass1b' },
    { speakerId: 'cass', textLabel: 'farmDialogCass1c', emotion: 'doubtful' },
  ],
  cass2: [
    { speakerId: 'cass', textLabel: 'farmDialogCass2a' },
    { speakerId: RUE, textLabel: 'farmDialogCass2b' },
    { speakerId: 'cass', textLabel: 'farmDialogCass2c' },
  ],
  cassDone: [
    { speakerId: 'cass', textLabel: 'farmDialogCassDoneA' },
    { speakerId: 'cass', textLabel: 'farmDialogCassDoneB' },
  ],
  cassMeet: [
    { speakerId: 'cass', textLabel: 'farmDialogCassMeetA' },
    { speakerId: RUE, textLabel: 'farmDialogCassMeetB' },
    { speakerId: 'cass', textLabel: 'farmDialogCassMeetC', emotion: 'doubtful' },
  ],
  // Rue asks first — Dot sent him — and only then does Bram say what he does all day and
  // offer the lesson. He is the one animal on this farm who volunteers nothing unprompted.
  bram1: [
    { speakerId: RUE, textLabel: 'farmDialogBram1a' },
    { speakerId: 'bram', textLabel: 'farmDialogBram1b', emotion: 'doubtful' },
    { speakerId: RUE, textLabel: 'farmDialogBram1c' },
    { speakerId: 'bram', textLabel: 'farmDialogBram1d' },
    { speakerId: RUE, textLabel: 'farmDialogBram1e' },
    { speakerId: 'bram', textLabel: 'farmDialogBram1f', emotion: 'thinking' },
    { speakerId: RUE, textLabel: 'farmDialogBram1g' },
    { speakerId: 'bram', textLabel: 'farmDialogBram1h' },
  ],
  bram2: [
    { speakerId: 'bram', textLabel: 'farmDialogBram2a' },
    { speakerId: RUE, textLabel: 'farmDialogBram2b' },
    { speakerId: 'bram', textLabel: 'farmDialogBram2c', emotion: 'thinking' },
  ],
  bram3: [
    { speakerId: 'bram', textLabel: 'farmDialogBram3a' },
    { speakerId: RUE, textLabel: 'farmDialogBram3b' },
    { speakerId: 'bram', textLabel: 'farmDialogBram3c', emotion: 'thinking' },
  ],
  bram4: [
    { speakerId: 'bram', textLabel: 'farmDialogBram4a' },
    { speakerId: RUE, textLabel: 'farmDialogBram4b' },
    { speakerId: 'bram', textLabel: 'farmDialogBram4c', emotion: 'doubtful' },
  ],
  bramDone: [
    { speakerId: 'bram', textLabel: 'farmDialogBramDoneA' },
    { speakerId: 'bram', textLabel: 'farmDialogBramDoneB' },
  ],
  bramMeet: [
    { speakerId: 'bram', textLabel: 'farmDialogBramMeetA', emotion: 'thinking' },
    { speakerId: RUE, textLabel: 'farmDialogBramMeetB' },
    { speakerId: 'bram', textLabel: 'farmDialogBramMeetC' },
  ],
  duchess1: [
    { speakerId: 'duchess', textLabel: 'farmDialogDuchess1a' },
    { speakerId: RUE, textLabel: 'farmDialogDuchess1b' },
    { speakerId: 'duchess', textLabel: 'farmDialogDuchess1c', emotion: 'doubtful' },
    { speakerId: RUE, textLabel: 'farmDialogDuchess1d' },
    { speakerId: 'duchess', textLabel: 'farmDialogDuchess1e' },
  ],
  duchessDone: [
    { speakerId: 'duchess', textLabel: 'farmDialogDuchessDoneA' },
    { speakerId: 'duchess', textLabel: 'farmDialogDuchessDoneB' },
  ],
  duchessMeet: [
    { speakerId: 'duchess', textLabel: 'farmDialogDuchessMeetA' },
    { speakerId: RUE, textLabel: 'farmDialogDuchessMeetB' },
    { speakerId: 'duchess', textLabel: 'farmDialogDuchessMeetC', emotion: 'doubtful' },
  ],
  tobias1: [
    { speakerId: 'tobias', textLabel: 'farmDialogTobias1a' },
    { speakerId: RUE, textLabel: 'farmDialogTobias1b' },
    { speakerId: 'tobias', textLabel: 'farmDialogTobias1c', emotion: 'sneaky' },
  ],
  tobiasDone: [
    { speakerId: 'tobias', textLabel: 'farmDialogTobiasDoneA' },
    { speakerId: 'tobias', textLabel: 'farmDialogTobiasDoneB' },
  ],
  // The level opener, and the only conversation that starts on its own. It takes its time:
  // Dot asks after Rue before she gets to the motion, and Rue volunteers for the floor
  // himself — the goals she hands over afterwards are the rules that come with having done so.
  dot1: [
    { speakerId: 'dot', textLabel: 'farmDialogDot1a' },
    { speakerId: RUE, textLabel: 'farmDialogDot1b' },
    { speakerId: 'dot', textLabel: 'farmDialogDot1c' },
    { speakerId: RUE, textLabel: 'farmDialogDot1d' },
    { speakerId: 'dot', textLabel: 'farmDialogDot1e', emotion: 'doubtful' },
    { speakerId: RUE, textLabel: 'farmDialogDot1f' },
    { speakerId: 'dot', textLabel: 'farmDialogDot1g' },
    { speakerId: RUE, textLabel: 'farmDialogDot1h' },
    { speakerId: 'dot', textLabel: 'farmDialogDot1i' },
    { speakerId: RUE, textLabel: 'farmDialogDot1j' },
    { speakerId: 'dot', textLabel: 'farmDialogDot1k', emotion: 'thinking' },
    { speakerId: RUE, textLabel: 'farmDialogDot1l' },
    { speakerId: 'dot', textLabel: 'farmDialogDot1m' },
    { speakerId: 'dot', textLabel: 'farmDialogDot1n' },
    { speakerId: RUE, textLabel: 'farmDialogDot1o' },
    { speakerId: 'dot', textLabel: 'farmDialogDot1p' },
  ],
  dot2: [
    { speakerId: 'dot', textLabel: 'farmDialogDot2a' },
    { speakerId: RUE, textLabel: 'farmDialogDot2b' },
    { speakerId: 'dot', textLabel: 'farmDialogDot2c' },
  ],
  dot3: [
    { speakerId: 'dot', textLabel: 'farmDialogDot3a' },
    { speakerId: RUE, textLabel: 'farmDialogDot3b' },
    { speakerId: 'dot', textLabel: 'farmDialogDot3c' },
  ],
  dot4: [
    { speakerId: 'dot', textLabel: 'farmDialogDot4a' },
    { speakerId: RUE, textLabel: 'farmDialogDot4b' },
    { speakerId: 'dot', textLabel: 'farmDialogDot4c' },
  ],
  dot5: [
    { speakerId: 'dot', textLabel: 'farmDialogDot5a' },
    { speakerId: RUE, textLabel: 'farmDialogDot5b' },
    { speakerId: 'dot', textLabel: 'farmDialogDot5c' },
  ],
  dot6: [
    { speakerId: 'dot', textLabel: 'farmDialogDot6a' },
    { speakerId: RUE, textLabel: 'farmDialogDot6b' },
    { speakerId: 'dot', textLabel: 'farmDialogDot6c', emotion: 'thinking' },
  ],
  dot7: [
    { speakerId: 'dot', textLabel: 'farmDialogDot7a' },
    { speakerId: RUE, textLabel: 'farmDialogDot7b' },
    { speakerId: 'dot', textLabel: 'farmDialogDot7c' },
  ],
  dotDone: [
    { speakerId: 'dot', textLabel: 'farmDialogDotDoneA' },
    { speakerId: 'dot', textLabel: 'farmDialogDotDoneB' },
  ],
  // Post-Trial pointers. Leave-only; they must not reuse the next offer slot or the player
  // would start Cass's popularity talk after Bram's crossfire, when Next is Cass for Ad Hominem.
  'followUp:030_bram_teaches_dialog': [
    { speakerId: 'bram', textLabel: 'farmDialogFollowUpBramRoundsA', emotion: 'thinking' },
    { speakerId: RUE, textLabel: 'farmDialogFollowUpBramRoundsB' },
    { speakerId: 'bram', textLabel: 'farmDialogFollowUpBramRoundsC' },
  ],
  'followUp:031_bram_teaches_crossfire': [
    { speakerId: 'bram', textLabel: 'farmDialogFollowUpBramCrossfireA', emotion: 'thinking' },
    { speakerId: RUE, textLabel: 'farmDialogFollowUpBramCrossfireB' },
    { speakerId: 'bram', textLabel: 'farmDialogFollowUpBramCrossfireC' },
  ],
  'followUp:020_cass_teaches_ad_hominem': [
    { speakerId: 'cass', textLabel: 'farmDialogFollowUpCassAdHominemA' },
    { speakerId: RUE, textLabel: 'farmDialogFollowUpCassAdHominemB' },
    { speakerId: 'cass', textLabel: 'farmDialogFollowUpCassAdHominemC', emotion: 'doubtful' },
  ],
  'followUp:021_hetty_ad_hominem_barrage': [
    { speakerId: 'hetty', textLabel: 'farmDialogFollowUpHettyBarrageA' },
    { speakerId: RUE, textLabel: 'farmDialogFollowUpHettyBarrageB' },
    { speakerId: 'hetty', textLabel: 'farmDialogFollowUpHettyBarrageC' },
  ],
  'followUp:023_cass_teaches_appeal_to_popularity': [
    { speakerId: 'cass', textLabel: 'farmDialogFollowUpCassPopularityA' },
    { speakerId: RUE, textLabel: 'farmDialogFollowUpCassPopularityB' },
    { speakerId: 'cass', textLabel: 'farmDialogFollowUpCassPopularityC' },
  ],
  'followUp:010_gossip_trough_hetty': [
    { speakerId: 'hetty', textLabel: 'farmDialogFollowUpHettyGrateA' },
    { speakerId: RUE, textLabel: 'farmDialogFollowUpHettyGrateB' },
    { speakerId: 'hetty', textLabel: 'farmDialogFollowUpHettyGrateC' },
  ],
  'followUp:032_bram_teaches_unlocks': [
    { speakerId: 'bram', textLabel: 'farmDialogFollowUpBramUnlocksA', emotion: 'thinking' },
    { speakerId: RUE, textLabel: 'farmDialogFollowUpBramUnlocksB' },
    { speakerId: 'bram', textLabel: 'farmDialogFollowUpBramUnlocksC' },
  ],
  'followUp:014_skirmish_bram_fenceline': [
    { speakerId: 'bram', textLabel: 'farmDialogFollowUpBramSkirmishA', emotion: 'doubtful' },
    { speakerId: RUE, textLabel: 'farmDialogFollowUpBramSkirmishB' },
    { speakerId: 'bram', textLabel: 'farmDialogFollowUpBramSkirmishC' },
  ],
  'followUp:015_tobias_vs_rue': [
    { speakerId: 'duchess', textLabel: 'farmDialogFollowUpDuchessBossA' },
    { speakerId: RUE, textLabel: 'farmDialogFollowUpDuchessBossB' },
    { speakerId: 'duchess', textLabel: 'farmDialogFollowUpDuchessBossC', emotion: 'doubtful' },
  ],
};

function capitalize(id: string): string {
  return id.charAt(0).toUpperCase() + id.slice(1);
}

export function farmTalkSlotKey(npcId: string, suffix: string): string {
  return `${npcId}${suffix}`;
}

export function farmFollowUpSlotKey(scenarioKey: DebateScenarioKey): string {
  return `followUp:${scenarioKey}`;
}

export function farmTalkBeats(npcId: string, suffix: string): FarmTalkBeat[] {
  const authored = FARM_TALK[farmTalkSlotKey(npcId, suffix)];
  if (authored && authored.length > 0) return [...authored];
  const fallback = `farmDialog${capitalize(npcId)}${suffix}` as Labels;
  return [{ speakerId: npcId, textLabel: fallback }];
}

export function farmFollowUpBeats(scenarioKey: DebateScenarioKey, npcId: string): FarmTalkBeat[] {
  const authored = FARM_TALK[farmFollowUpSlotKey(scenarioKey)];
  if (authored && authored.length > 0) return [...authored];
  const fallback = `farmDialog${capitalize(npcId)}Done` as Labels;
  return [{ speakerId: npcId, textLabel: fallback }];
}
