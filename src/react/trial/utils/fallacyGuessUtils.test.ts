import { describe, expect, it } from 'vitest';
import type { LogicalFallacy, Sentence } from '../../../types/debateEntities';
import type { GuessRecord } from './fallacyGuessTypes';
import {
  computeExtraPairs,
  computeMissedPairs,
  correctIntersectionMultiset,
  guessMultisetFromPicks,
  guessStateForRecord,
  guessStateFromAttempts,
  hasCorrectPairOverlap,
  isExtrasOnlyPartial,
  isGuessTerminal,
  isSessionTerminal,
  pairKey,
  pinnedMultisetFromAttempts,
  shouldRevealFullSolution,
  spottedFallacies,
  truthMultisetFromSentences,
  multisetsEqual,
} from './fallacyGuessUtils';

const adHominem: LogicalFallacy = {
  id: 'ad-hominem',
  type: 'emotional',
  label: 'Ad Hominem',
  description: 'Attack the person.',
};
const strawMan: LogicalFallacy = {
  id: 'straw-man',
  type: 'emotional',
  label: 'Straw Man',
  description: 'Misrepresent the claim.',
};

const fallacyById = new Map<string, LogicalFallacy>([
  [adHominem.id, adHominem],
  [strawMan.id, strawMan],
]);

function sentence(id: string, ...fallacies: LogicalFallacy[]): Sentence {
  return {
    id,
    text: id,
    logicalFallacies: fallacies.map((f) => ({ id: f.id, explanation: '' })),
  };
}

const statements: Sentence[] = [
  sentence('s1', adHominem),
  sentence('s2', strawMan),
  sentence('s3'),
];

describe('multisets', () => {
  it('builds a truth multiset from authored sentences', () => {
    const truth = truthMultisetFromSentences(statements);
    expect(truth.get(pairKey('s1', 'ad-hominem'))).toBe(1);
    expect(truth.get(pairKey('s2', 'straw-man'))).toBe(1);
    expect(truth.size).toBe(2);
  });

  it('treats identical pair lists as equal and overlapping', () => {
    const truth = truthMultisetFromSentences(statements);
    const perfect = guessMultisetFromPicks([
      { sentenceId: 's1', fallacyId: 'ad-hominem' },
      { sentenceId: 's2', fallacyId: 'straw-man' },
    ]);
    const partial = guessMultisetFromPicks([{ sentenceId: 's1', fallacyId: 'ad-hominem' }]);
    const miss = guessMultisetFromPicks([{ sentenceId: 's3', fallacyId: 'ad-hominem' }]);

    expect(multisetsEqual(truth, perfect)).toBe(true);
    expect(hasCorrectPairOverlap(truth, partial)).toBe(true);
    expect(hasCorrectPairOverlap(truth, miss)).toBe(false);
    expect(correctIntersectionMultiset(truth, partial).size).toBe(1);
  });

  it('lists missed pairs that are still in the statement', () => {
    const truth = truthMultisetFromSentences(statements);
    const guess = guessMultisetFromPicks([{ sentenceId: 's1', fallacyId: 'ad-hominem' }]);
    const missed = computeMissedPairs(statements, truth, guess, fallacyById);
    expect(missed).toEqual([{ sentenceId: 's2', fallacy: strawMan }]);
  });

  it('lists extra tags that are not in the truth', () => {
    const truth = truthMultisetFromSentences(statements);
    const guess = guessMultisetFromPicks([
      { sentenceId: 's1', fallacyId: 'ad-hominem' },
      { sentenceId: 's2', fallacyId: 'straw-man' },
      { sentenceId: 's3', fallacyId: 'ad-hominem' },
    ]);
    expect(computeExtraPairs(truth, guess, fallacyById)).toEqual([
      { sentenceId: 's3', fallacy: adHominem },
    ]);
  });
});

describe('session terminal state', () => {
  const perfect: GuessRecord = {
    kind: 'multi',
    npcRoundId: 'npc-1',
    picks: [{ sentenceId: 's1', fallacyId: 'ad-hominem' }],
    outcome: 'perfect',
    missedPairs: [],
  };
  const partial: GuessRecord = {
    kind: 'multi',
    npcRoundId: 'npc-1',
    picks: [{ sentenceId: 's1', fallacyId: 'ad-hominem' }],
    outcome: 'partial',
    missedPairs: [{ sentenceId: 's2', fallacy: strawMan }],
  };
  const extrasOnly: GuessRecord = {
    kind: 'multi',
    npcRoundId: 'npc-1',
    picks: [
      { sentenceId: 's1', fallacyId: 'ad-hominem' },
      { sentenceId: 's2', fallacyId: 'straw-man' },
      { sentenceId: 's3', fallacyId: 'ad-hominem' },
    ],
    outcome: 'partial',
    missedPairs: [],
  };
  const none: GuessRecord = {
    kind: 'multi',
    npcRoundId: 'npc-1',
    picks: [{ sentenceId: 's3', fallacyId: 'ad-hominem' }],
    outcome: 'none',
    missedPairs: [
      { sentenceId: 's1', fallacy: adHominem },
      { sentenceId: 's2', fallacy: strawMan },
    ],
  };

  it('ends a session on a perfect multi guess or a correct no-fallacies call', () => {
    expect(isGuessTerminal(perfect)).toBe(true);
    expect(isGuessTerminal(partial)).toBe(false);
    expect(isGuessTerminal(extrasOnly)).toBe(false);
    expect(isExtrasOnlyPartial(extrasOnly)).toBe(true);
    expect(isExtrasOnlyPartial(partial)).toBe(false);
    expect(isExtrasOnlyPartial(perfect)).toBe(false);
    expect(
      isGuessTerminal({
        kind: 'no_fallacies',
        npcRoundId: 'npc-1',
        correct: true,
        actualFallacies: [],
      }),
    ).toBe(true);
    expect(
      isGuessTerminal({
        kind: 'no_fallacies',
        npcRoundId: 'npc-1',
        correct: false,
        actualFallacies: [adHominem],
      }),
    ).toBe(false);
  });

  it('reveals the solution only after the last failed attempt', () => {
    expect(shouldRevealFullSolution({ maxAttempts: 3, attempts: [none, none] })).toBe(false);
    expect(shouldRevealFullSolution({ maxAttempts: 3, attempts: [none, none, none] })).toBe(true);
    expect(shouldRevealFullSolution({ maxAttempts: 3, attempts: [none, none, perfect] })).toBe(
      false,
    );
    expect(isSessionTerminal({ attempts: [partial, perfect] })).toBe(true);
  });

  it('promotes the best badge across attempts', () => {
    expect(guessStateForRecord(perfect)).toBe('correct');
    expect(guessStateForRecord(partial)).toBe('partial');
    expect(guessStateForRecord(extrasOnly)).toBe('extras');
    expect(guessStateFromAttempts([])).toBeNull();
    expect(guessStateFromAttempts([none, partial])).toBe('partial');
    expect(guessStateFromAttempts([none, extrasOnly])).toBe('extras');
    expect(guessStateFromAttempts([partial, extrasOnly])).toBe('extras');
    expect(guessStateFromAttempts([extrasOnly, partial, none])).toBe('extras');
    expect(guessStateFromAttempts([none, extrasOnly, perfect])).toBe('correct');
    expect(guessStateFromAttempts([none, perfect])).toBe('correct');
  });
});

describe('spottedFallacies', () => {
  it('returns distinct correctly tagged fallacies in statement order', () => {
    const truth = truthMultisetFromSentences(statements);
    const attempts: GuessRecord[] = [
      {
        kind: 'multi',
        npcRoundId: 'npc-1',
        picks: [{ sentenceId: 's2', fallacyId: 'straw-man' }],
        outcome: 'partial',
        missedPairs: [{ sentenceId: 's1', fallacy: adHominem }],
      },
    ];
    expect(pinnedMultisetFromAttempts(truth, attempts).get(pairKey('s2', 'straw-man'))).toBe(1);
    const spotted = spottedFallacies(
      statements,
      { npcRoundId: 'npc-1', maxAttempts: 3, attempts },
      fallacyById,
    );
    expect(spotted.map((f) => f.id)).toEqual(['straw-man']);
    expect(spottedFallacies(statements, undefined, fallacyById)).toEqual([]);
  });
});
