import type { Labels } from '../../data/labels';
import { scenarioRequirements, type DebateScenarioKey } from '../../data/levels';
import { characterById } from '../../data/characters';
import { farmTalkBeats, farmTalkSlotKey, type FarmTalkBeat } from '../../data/farmTalk';
import { farmNpcById } from '../../data/farmMap';
import { completedLessonsFor, type TutorialLesson } from '../../data/tutorialLessons';
import type { DialogFlagId } from '../../data/dialogFlags';
import { useProgressStore } from '../../store/progressStore';
import {
  conditionContextSnapshot,
  isConditionMet,
  type GameCondition,
} from '../../utils/gameConditions';

/**
 * What an animal has to say right now.
 *
 * Each animal owns an ordered list of encounters; they offer the first one the
 * player has not finished. Once the list is exhausted they fall back to a closing
 * conversation. Beats come from `farmTalk.ts`; the slot key is the animal's id
 * plus how far down its list we are (`hetty1`, `cass2`, `bramDone`).
 */
export interface FarmDialogueState {
  npcId: string;
  nameLabel: Labels;
  /** Identity of this conversation so the beat index resets when the slot changes. */
  slotKey: string;
  beats: FarmTalkBeat[];
  /** The encounter to launch, or null when this animal is done with you. */
  scenario: DebateScenarioKey | null;
  /**
   * `scenario`'s unlock requirements, passed through unevaluated.
   *
   * The animal offers their next *unfinished* encounter and never skips ahead to a later one
   * just because this one is locked — the ladder is ordered, so jumping a rung would hand the
   * player a conversation that assumes something they have not been told yet.
   *
   * Evaluation is left to the caller so it can happen inside React's subscription: a gate that
   * opens while the dialogue is on screen should un-grey the button, and a snapshot taken here
   * would be stale.
   */
  scenarioRequires: readonly GameCondition[];
  /**
   * Set when the last beat of this farm talk finishes revealing. Only greeters with
   * `talkStages[].completesFlag` use this — Dot is the one that needs it.
   */
  completesFlag?: DialogFlagId;
  /** Lessons this animal has already taught, for the replay menu. Empty for everyone but Bram. */
  lessons: readonly TutorialLesson[];
}

export function farmDialogueFor(npcId: string): FarmDialogueState | null {
  const npc = farmNpcById(npcId);
  const visual = characterById(npcId);
  if (!npc || !visual) return null;

  let next: DebateScenarioKey | null = null;
  let suffix: string;
  let completesFlag: DialogFlagId | undefined;

  if (npc.scenarios.length > 0) {
    next = useProgressStore.getState().nextScenarioFor(npc.scenarios);
    const index = next ? npc.scenarios.indexOf(next) + 1 : 0;
    suffix = next ? String(index) : 'Done';
  } else if (npc.talkStages?.length) {
    const ctx = conditionContextSnapshot();
    const stage = npc.talkStages.find((entry) => !isConditionMet(entry.until, ctx));
    suffix = stage?.suffix ?? 'Done';
    completesFlag = stage?.completesFlag;
  } else {
    suffix = 'Done';
  }

  return {
    npcId: npc.id,
    nameLabel: visual.nameLabel,
    slotKey: farmTalkSlotKey(npc.id, suffix),
    beats: farmTalkBeats(npc.id, suffix),
    scenario: next,
    scenarioRequires: next ? scenarioRequirements(next) : [],
    completesFlag,
    lessons: completedLessonsFor(npc.id, useProgressStore.getState().completedScenarios),
  };
}

/**
 * The requirements standing between the player and their next encounter with this animal.
 *
 * Lets the overworld prompt badge a locked animal before the player commits to a conversation,
 * without building the whole dialogue state for every animal that wanders into range.
 */
export function farmNpcRequirements(npcId: string): readonly GameCondition[] {
  const npc = farmNpcById(npcId);
  if (!npc) return [];
  const next = useProgressStore.getState().nextScenarioFor(npc.scenarios);
  return next ? scenarioRequirements(next) : [];
}
