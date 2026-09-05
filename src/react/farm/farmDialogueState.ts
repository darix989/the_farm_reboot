import type { Labels } from '../../data/labels';
import type { DebateScenarioKey } from '../../data/levels';
import { characterById } from '../../data/characters';
import { farmTalkBeats, farmTalkSlotKey, type FarmTalkBeat } from '../../data/farmTalk';
import { farmNpcById } from '../../data/farmMap';
import { useProgressStore } from '../../store/progressStore';

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
}

export function farmDialogueFor(npcId: string): FarmDialogueState | null {
  const npc = farmNpcById(npcId);
  const visual = characterById(npcId);
  if (!npc || !visual) return null;

  const next = useProgressStore.getState().nextScenarioFor(npc.scenarios);
  const index = next ? npc.scenarios.indexOf(next) + 1 : 0;
  const suffix = next ? String(index) : 'Done';

  return {
    npcId: npc.id,
    nameLabel: visual.nameLabel,
    slotKey: farmTalkSlotKey(npc.id, suffix),
    beats: farmTalkBeats(npc.id, suffix),
    scenario: next,
  };
}
