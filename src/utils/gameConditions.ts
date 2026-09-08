/**
 * One requirement, evaluated against everything the player has done anywhere in the game.
 *
 * Two features are built on this and they share the vocabulary deliberately:
 *
 * - **Encounter gates** (`ScenarioEntry.requires`) — by default an animal will talk to you,
 *   but the button that starts their encounter stays disabled until the conditions are met.
 *   `FarmNpc.gateTalk` is the exception: the conversation itself stays closed.
 * - **Cross-encounter option unlocks** (`PlayerOption.unlockConditions`) — a debate choice that
 *   only appears because of something that happened in a *different* conversation. The older
 *   `PlayerOption.unlockCondition` still handles the in-debate case (spot a fallacy here, unlock
 *   a reply here) and is unchanged; this is the same idea with the whole game in scope.
 *
 * Lives in `utils/` rather than `react/` because the Phaser layer evaluates it too. Evaluation
 * is pure over a {@link ConditionContext} snapshot so React can subscribe to the underlying
 * stores and re-render, rather than reading `getState()` mid-render and going stale.
 */
import type { LogicalFallacyId } from '../types/debateEntities';
import type { DebateScenarioKey } from '../data/levels';
import { logicalFallacyLabel } from '../data/fallacyCatalog';
import { dialogFlagById, type DialogFlagId } from '../data/dialogFlags';
import { useCodexStore, type SpottedFallacy } from '../store/codexStore';
import { useProgressStore } from '../store/progressStore';
import getLabel from '../data/labels';

export type GameCondition =
  /** The player can name this fallacy — they were taught it somewhere. */
  | { kind: 'fallacy_known'; fallacyId: LogicalFallacyId }
  /**
   * The player has correctly tagged this fallacy in a real statement. Optionally scoped to one
   * encounter; unscoped means anywhere.
   */
  | { kind: 'fallacy_spotted'; fallacyId: LogicalFallacyId; scenarioKey?: DebateScenarioKey }
  /** The player has finished this encounter, however well or badly it went. */
  | { kind: 'encounter_completed'; scenarioKey: DebateScenarioKey }
  /** A named thing has happened to the player. See `src/data/dialogFlags.ts`. */
  | { kind: 'dialog_flag'; flagId: DialogFlagId };

/** Everything {@link isConditionMet} is allowed to look at. */
export interface ConditionContext {
  knownFallacies: readonly LogicalFallacyId[];
  spottedFallacies: readonly SpottedFallacy[];
  dialogFlags: readonly DialogFlagId[];
  completedScenarios: readonly DebateScenarioKey[];
}

/**
 * Reads the current context straight off the stores.
 *
 * For imperative callers (Phaser scenes, event handlers, reducers). React render paths should
 * use `useConditionContext()` instead, which subscribes.
 */
export function conditionContextSnapshot(): ConditionContext {
  const codex = useCodexStore.getState();
  return {
    knownFallacies: codex.knownFallacies,
    spottedFallacies: codex.spottedFallacies,
    dialogFlags: codex.dialogFlags,
    completedScenarios: useProgressStore.getState().completedScenarios,
  };
}

export function isConditionMet(condition: GameCondition, ctx: ConditionContext): boolean {
  switch (condition.kind) {
    case 'fallacy_known':
      return ctx.knownFallacies.includes(condition.fallacyId);
    case 'fallacy_spotted':
      return ctx.spottedFallacies.some(
        (spot) =>
          spot.fallacyId === condition.fallacyId &&
          (!condition.scenarioKey || spot.scenarioKey === condition.scenarioKey),
      );
    case 'encounter_completed':
      return ctx.completedScenarios.includes(condition.scenarioKey);
    case 'dialog_flag':
      return ctx.dialogFlags.includes(condition.flagId);
  }
}

/** An absent or empty list is met — a scenario with no `requires` is never gated. */
export function areConditionsMet(
  conditions: readonly GameCondition[] | undefined,
  ctx: ConditionContext,
): boolean {
  if (!conditions || conditions.length === 0) return true;
  return conditions.every((condition) => isConditionMet(condition, ctx));
}

/** The conditions still outstanding, in author order, so the UI can say what is missing. */
export function unmetConditions(
  conditions: readonly GameCondition[] | undefined,
  ctx: ConditionContext,
): GameCondition[] {
  if (!conditions) return [];
  return conditions.filter((condition) => !isConditionMet(condition, ctx));
}

/**
 * One short requirement phrase, e.g. "Know the Ad Hominem fallacy".
 *
 * Deliberately says what to do, not what is missing, so a list of these reads as directions
 * rather than as a list of failures. `encounter_completed` is the vague one — it can only name
 * the encounter by key, which is not player-facing — so prefer a `dialog_flag` when the gate is
 * really "this conversation happened": a flag carries authored copy.
 */
export function conditionHint(condition: GameCondition): string {
  switch (condition.kind) {
    case 'fallacy_known':
      return getLabel('conditionHintFallacyKnown', {
        replacements: { fallacy: logicalFallacyLabel(condition.fallacyId) },
      });
    case 'fallacy_spotted':
      return getLabel('conditionHintFallacySpotted', {
        replacements: { fallacy: logicalFallacyLabel(condition.fallacyId) },
      });
    case 'encounter_completed':
      return getLabel('conditionHintEncounterCompleted');
    case 'dialog_flag': {
      const flag = dialogFlagById(condition.flagId);
      return flag ? getLabel(flag.titleLabel) : getLabel('conditionHintEncounterCompleted');
    }
  }
}

/** The hints for everything outstanding, joined into one sentence for a lock tooltip. */
export function unmetConditionsHint(
  conditions: readonly GameCondition[] | undefined,
  ctx: ConditionContext,
): string | null {
  const unmet = unmetConditions(conditions, ctx);
  if (unmet.length === 0) return null;
  return getLabel('encounterLockedHint', {
    replacements: { requirements: unmet.map(conditionHint).join(getLabel('listSeparator')) },
  });
}
