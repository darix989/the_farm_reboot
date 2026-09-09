import { useMemo } from 'react';
import { useCodexStore } from '../../store/codexStore';
import { useProgressStore } from '../../store/progressStore';
import {
  areConditionsMet,
  unmetConditions,
  unmetConditionsHint,
  type ConditionContext,
  type GameCondition,
} from '../../utils/gameConditions';

/**
 * The React-side counterpart to `conditionContextSnapshot()`.
 *
 * Each slice is selected on its own rather than assembled in the selector: zustand v5 bails out
 * of a re-render by comparing the selected value, so returning a fresh `{...}` from the selector
 * would re-render on every store write anywhere in the app. The stores replace these arrays only
 * when their contents actually change, so selecting them individually and memoising the object
 * gives a stable context that still updates the moment a gate opens.
 */
export function useConditionContext(): ConditionContext {
  const knownFallacies = useCodexStore((s) => s.knownFallacies);
  const spottedFallacies = useCodexStore((s) => s.spottedFallacies);
  const dialogFlags = useCodexStore((s) => s.dialogFlags);
  const completedScenarios = useProgressStore((s) => s.completedScenarios);

  return useMemo(
    () => ({ knownFallacies, spottedFallacies, dialogFlags, completedScenarios }),
    [knownFallacies, spottedFallacies, dialogFlags, completedScenarios],
  );
}

export function useConditionsMet(conditions: readonly GameCondition[] | undefined): boolean {
  const ctx = useConditionContext();
  return areConditionsMet(conditions, ctx);
}

export function useUnmetConditions(
  conditions: readonly GameCondition[] | undefined,
): GameCondition[] {
  const ctx = useConditionContext();
  return unmetConditions(conditions, ctx);
}

/** One sentence naming everything still outstanding, or `null` when nothing is. */
export function useUnmetConditionsHint(
  conditions: readonly GameCondition[] | undefined,
): string | null {
  const ctx = useConditionContext();
  return unmetConditionsHint(conditions, ctx);
}
