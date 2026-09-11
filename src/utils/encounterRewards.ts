import type { DebateScenarioJson } from '../types/debateEntities';
import { encounterFollowUpFor } from '../data/encounterFollowUps';
import { DEBATES, type DebateScenarioKey } from '../data/levels';
import { useProgressStore } from '../store/progressStore';
import { useCodexStore } from '../store/codexStore';

export interface ApplyEncounterRewardsOptions {
  /**
   * Hold `setsDialogFlags` for a farm follow-up to write when its last beat settles.
   * Completion, taught fallacies, and feature unlocks still land immediately.
   */
  deferDialogFlags?: boolean;
}

/**
 * Everything a finished encounter grants, applied in one place.
 *
 * Marking the scenario complete used to be the whole story, and `TrialUI` did it inline. Now an
 * encounter can also teach a fallacy, set a dialog flag, or unlock a feature, and those have
 * to land together: a gate that reads "you know Ad Hominem and you have talked to Hetty"
 * would be inconsistent for a frame if the two were written from different call sites.
 *
 * Dialog flags can be deferred when a farm follow-up will point at the next stop — Field Notes
 * Next keys off those flags, and it should not move until the pointer has been heard. See
 * `src/data/encounterFollowUps.ts`.
 *
 * Idempotent, because it is wired to the player leaving a finished encounter — which they can do
 * again on a replay.
 */
export function applyEncounterRewards(
  scenarioKey: DebateScenarioKey,
  scenario: DebateScenarioJson,
  options?: ApplyEncounterRewardsOptions,
): void {
  useProgressStore.getState().markCompleted(scenarioKey);

  const codex = useCodexStore.getState();
  scenario.teachesFallacies?.forEach((fallacyId) => codex.learnFallacy(fallacyId));
  if (!options?.deferDialogFlags) {
    applyEncounterDialogFlags(scenario);
  }
  scenario.unlocksFeatures?.forEach((featureId) => codex.unlockFeature(featureId));
}

/** The dialog flags an encounter pays out, written when the follow-up is heard (or on Leave). */
export function applyEncounterDialogFlags(scenario: DebateScenarioJson): void {
  const codex = useCodexStore.getState();
  scenario.setsDialogFlags?.forEach((flagId) => codex.setDialogFlag(flagId));
}

/**
 * Leave should queue a follow-up instead of writing dialog flags now: returning to the farm,
 * an authored follow-up exists, and either this is the first completion or the flags never
 * landed (a crash mid-pointer).
 */
export function shouldQueueFollowUp(
  scenarioKey: DebateScenarioKey,
  scenario: DebateScenarioJson,
  returnSceneKey: string,
): boolean {
  if (returnSceneKey !== 'Farm') return false;
  if (!encounterFollowUpFor(scenarioKey)) return false;
  const alreadyDone = useProgressStore.getState().completedScenarios.includes(scenarioKey);
  const flags = scenario.setsDialogFlags ?? [];
  const flagsPending = flags.some((flagId) => !useCodexStore.getState().hasDialogFlag(flagId));
  if (!alreadyDone) return true;
  return flagsPending;
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
