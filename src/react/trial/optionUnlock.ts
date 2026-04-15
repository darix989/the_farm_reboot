import type { PlayerOption, Sentence } from '../../types/debateEntities';

/** Subset of GuessRecord needed for unlock checks (structurally compatible with RoundAnalysisModal's GuessRecord). */
export type GuessRecordForUnlock =
  | {
      kind: 'multi';
      npcRoundId: string;
      picks: { sentenceId: string; fallacyId: string }[];
    }
  | { kind: 'no_fallacies'; npcRoundId: string };

export function isPlayerOptionUnlocked(
  option: PlayerOption,
  fallacyGuesses: Map<number, GuessRecordForUnlock>,
): boolean {
  const cond = option.unlockCondition;
  if (!cond) return true;

  for (const record of fallacyGuesses.values()) {
    if (record.kind !== 'multi') continue;
    if (record.npcRoundId !== cond.npcRoundId) continue;
    const hasPair = record.picks.some(
      (p) => p.sentenceId === cond.sentenceId && p.fallacyId === cond.fallacyId,
    );
    if (hasPair) return true;
  }
  return false;
}

export function resolvedOptionSentences(option: PlayerOption, unlocked: boolean): Sentence[] {
  if (option.unlockCondition && unlocked && option.unlockedSentences?.length) {
    return option.unlockedSentences;
  }
  return option.sentences;
}

export function optionFirstLine(option: PlayerOption, unlocked: boolean): string {
  const s = resolvedOptionSentences(option, unlocked);
  return s[0]?.text ?? '';
}
