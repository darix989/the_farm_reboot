import type { PlayerOption, Sentence } from '../../../types/debateEntities';
import {
  areConditionsMet,
  conditionContextSnapshot,
  type ConditionContext,
} from '../../../utils/gameConditions';

/** Subset of GuessRecord needed for unlock checks (structurally compatible with GuessRecord). */
export type GuessRecordForUnlock =
  | {
      kind: 'multi';
      npcRoundId: string;
      picks: { sentenceId: string; fallacyId: string }[];
    }
  | { kind: 'no_fallacies'; npcRoundId: string };

/** Structurally compatible with FallacyGuessSession for unlock checks. */
export type GuessSessionForUnlock = {
  attempts: GuessRecordForUnlock[];
};

/**
 * Whether this option is behind any lock at all — an in-debate `unlockCondition`, requirements
 * from the wider game, or both.
 *
 * Every "is the placeholder copy still showing?" decision goes through here. Before there was
 * only one kind of lock, and call sites tested `!!option.unlockCondition` directly; a
 * cross-encounter unlock would then render as permanently unlocked in the panel that forgot.
 */
export function isOptionGated(option: PlayerOption): boolean {
  return !!option.unlockCondition || !!option.unlockConditions?.length;
}

/**
 * @param conditions Context for `option.unlockConditions`. React callers should pass the
 *   subscribed context from `useConditionContext()`: without it this reads the stores directly,
 *   which is correct but invisible to React, so a component would not re-render when a
 *   condition flips. Imperative callers (the workflow reducer) can safely omit it.
 */
export function isPlayerOptionUnlocked(
  option: PlayerOption,
  fallacyGuesses: Map<number, GuessSessionForUnlock>,
  conditions?: ConditionContext,
): boolean {
  // ANDed with the in-debate condition below: "you were told about this" and "you caught her
  // doing it just now" are different requirements and an option may want both.
  if (option.unlockConditions?.length) {
    if (!areConditionsMet(option.unlockConditions, conditions ?? conditionContextSnapshot())) {
      return false;
    }
  }

  const cond = option.unlockCondition;
  if (!cond) return true;

  for (const session of fallacyGuesses.values()) {
    for (const record of session.attempts) {
      if (record.kind !== 'multi') continue;
      if (record.npcRoundId !== cond.npcRoundId) continue;
      const hasPair = record.picks.some(
        (p) => p.sentenceId === cond.sentenceId && p.fallacyId === cond.fallacyId,
      );
      if (hasPair) return true;
    }
  }
  return false;
}

export function resolvedOptionSentences(option: PlayerOption, unlocked: boolean): Sentence[] {
  if (isOptionGated(option) && unlocked && option.unlockedSentences?.length) {
    return option.unlockedSentences;
  }
  return option.sentences;
}

export function optionFirstLine(option: PlayerOption, unlocked: boolean): string {
  const s = resolvedOptionSentences(option, unlocked);
  return s[0]?.text ?? '';
}
