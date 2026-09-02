import type { Labels } from '../../data/labels';
import type { DebateScenarioKey } from '../../data/levels';
import { characterById } from '../../data/characters';
import { farmNpcById } from '../../data/farmMap';
import { useProgressStore } from '../../store/progressStore';

/**
 * What an animal has to say right now.
 *
 * Each animal owns an ordered list of encounters; they offer the first one the
 * player has not finished. Once the list is exhausted they fall back to a closing
 * line. The dialogue key is derived from the animal's id and how far down its list
 * we are, so adding an encounter means adding one label, not editing this file.
 */
export interface FarmDialogueState {
  npcId: string;
  nameLabel: Labels;
  messageLabel: Labels;
  /** The encounter to launch, or null when this animal is done with you. */
  scenario: DebateScenarioKey | null;
}

function capitalize(id: string): string {
  return id.charAt(0).toUpperCase() + id.slice(1);
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
    messageLabel: `farmDialog${capitalize(npc.id)}${suffix}` as Labels,
    scenario: next,
  };
}
