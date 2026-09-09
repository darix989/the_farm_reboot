import { farmNpcById } from '../data/farmMap';
import { scenarioRequirements } from '../data/levels';
import { completedLessonsFor } from '../data/tutorialLessons';
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
 * inside the conversation carries the reason. `gateTalk` is for the rare animal who should
 * not speak at all until the player is ready (Hetty, and now Bram and Cass on the on-ramp).
 *
 * Two animals are never silenced. A finished one (`nextScenarioFor` empty), because the Done
 * conversation is always allowed; and a teacher who has already taught something, because the
 * lesson replay menu lives inside the conversation. Bram's next lesson can sit locked behind a
 * fallacy he does not teach, and going quiet for that whole stretch would take his replays with
 * him — the Talk button carrying the reason is the better answer.
 */
export function farmNpcTalkLocked(
  npcId: string,
  ctx: ConditionContext = conditionContextSnapshot(),
): boolean {
  const npc = farmNpcById(npcId);
  if (!npc?.gateTalk) return false;
  const { nextScenarioFor, completedScenarios } = useProgressStore.getState();
  const next = nextScenarioFor(npc.scenarios);
  if (!next) return false;
  if (completedLessonsFor(npcId, completedScenarios).length > 0) return false;
  return !areConditionsMet(scenarioRequirements(next), ctx);
}
