import { farmNpcById } from '../data/farmMap';
import { scenarioRequirements } from '../data/levels';
import { useProgressStore } from '../store/progressStore';
import {
  areConditionsMet,
  conditionContextSnapshot,
  type ConditionContext,
} from './gameConditions';

/**
 * Whether this animal's *conversation* is closed until their next encounter unlocks.
 *
 * Distinct from the encounter gate: most animals still talk when locked, and the Talk button
 * inside the conversation carries the reason. `gateTalk` is for the rare animal (Hetty) who
 * should not speak at all until the player is ready to hear her.
 *
 * A finished animal (`nextScenarioFor` empty) is never silenced — the Done conversation is
 * always allowed.
 */
export function farmNpcTalkLocked(
  npcId: string,
  ctx: ConditionContext = conditionContextSnapshot(),
): boolean {
  const npc = farmNpcById(npcId);
  if (!npc?.gateTalk) return false;
  const next = useProgressStore.getState().nextScenarioFor(npc.scenarios);
  if (!next) return false;
  return !areConditionsMet(scenarioRequirements(next), ctx);
}
