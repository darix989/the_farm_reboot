import type { DebateScenarioJson } from '../types/debateEntities';
import { DEBATES, type DebateScenarioKey } from '../data/levels';
import { useProgressStore } from '../store/progressStore';
import { useCodexStore } from '../store/codexStore';

/**
 * Everything a finished encounter grants, applied in one place.
 *
 * Marking the scenario complete used to be the whole story, and `TrialUI` did it inline. Now an
 * encounter can also teach a fallacy, set a dialog flag, or unlock a feature, and those have
 * to land together: a gate that reads "you know Ad Hominem and you have talked to Hetty"
 * would be inconsistent for a frame if the two were written from different call sites.
 *
 * Idempotent, because it is wired to the player leaving a finished encounter — which they can do
 * again on a replay.
 */
export function applyEncounterRewards(
  scenarioKey: DebateScenarioKey,
  scenario: DebateScenarioJson,
): void {
  useProgressStore.getState().markCompleted(scenarioKey);

  const codex = useCodexStore.getState();
  scenario.teachesFallacies?.forEach((fallacyId) => codex.learnFallacy(fallacyId));
  scenario.setsDialogFlags?.forEach((flagId) => codex.setDialogFlag(flagId));
  scenario.unlocksFeatures?.forEach((featureId) => codex.unlockFeature(featureId));
}

/**
 * Same thing when only the key is to hand.
 *
 * The scenario key and `scenario.id` are documented to differ (`'level1-boss-pond-motion'` vs
 * `'015_tobias_vs_rue'`), and `DEBATES` is keyed by the former — so this looks the content up
 * rather than letting a caller guess.
 */
export function applyEncounterRewardsByKey(scenarioKey: DebateScenarioKey): void {
  const scenario = DEBATES[scenarioKey];
  if (!scenario) return;
  applyEncounterRewards(scenarioKey, scenario);
}
