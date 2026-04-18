import type { LogicalFallacy } from '../../types/debateEntities';

export const DEFAULT_MAX_ANALYSIS_ATTEMPTS = 3;

export type GuessPayload =
  | { type: 'picks'; picks: { sentenceId: string; fallacyId: string }[] }
  | { type: 'no_fallacies' };

export type GuessRecord =
  | {
      kind: 'multi';
      npcRoundId: string;
      picks: { sentenceId: string; fallacyId: string }[];
      outcome: 'perfect' | 'partial' | 'none';
      missedPairs: { sentenceId: string; fallacy: LogicalFallacy }[];
    }
  | {
      kind: 'no_fallacies';
      npcRoundId: string;
      correct: boolean;
      actualFallacies: LogicalFallacy[];
    };

export type FallacyGuessSession = {
  npcRoundId: string;
  maxAttempts: number;
  attempts: GuessRecord[];
};
