/** @vitest-environment happy-dom */

import { describe, expect, it } from 'vitest';
import type { PlayerOption, Sentence } from '../../../types/debateEntities';
import type { ConditionContext } from '../../../utils/gameConditions';
import {
  isOptionGated,
  isPlayerOptionUnlocked,
  optionFirstLine,
  optionLockHint,
  optionLockNeedsAnalyzePulse,
  optionLockPhase,
  resolvedOptionSentences,
  type GuessSessionForUnlock,
} from './optionUnlock';

const emptyCtx: ConditionContext = {
  knownFallacies: [],
  spottedFallacies: [],
  dialogFlags: [],
  unlockedFeatures: [],
  completedScenarios: [],
  completedTutorials: [],
};

function sentence(id: string, text: string): Sentence {
  return { id, text, logicalFallacies: [] };
}

function makeOption(overrides: Partial<PlayerOption> & Pick<PlayerOption, 'id'>): PlayerOption {
  return {
    quality: 'effective',
    impact: 10,
    sentences: [sentence('locked', 'Placeholder.')],
    ...overrides,
  };
}

const gatedByTag = makeOption({
  id: 'opt-tag',
  unlockCondition: {
    npcRoundId: 'npc-1',
    sentenceId: 'sent-1',
    fallacyId: 'ad-hominem',
  },
  unlockedSentences: [sentence('open', 'The real line.')],
});

const gatedByGame = makeOption({
  id: 'opt-game',
  unlockConditions: [{ kind: 'dialog_flag', flagId: 'cass-named-ad-hominem' }],
  unlockedSentences: [sentence('open', 'I heard Cass name it.')],
});

function guessesWithPair(): Map<number, GuessSessionForUnlock> {
  return new Map([
    [
      1,
      {
        attempts: [
          {
            kind: 'multi',
            npcRoundId: 'npc-1',
            picks: [{ sentenceId: 'sent-1', fallacyId: 'ad-hominem' }],
          },
        ],
      },
    ],
  ]);
}

describe('isOptionGated', () => {
  it('is true when either lock field is set', () => {
    expect(isOptionGated(makeOption({ id: 'plain' }))).toBe(false);
    expect(isOptionGated(gatedByTag)).toBe(true);
    expect(isOptionGated(gatedByGame)).toBe(true);
  });
});

describe('isPlayerOptionUnlocked', () => {
  it('unlocks an in-debate tag only when the matching pair is guessed', () => {
    expect(isPlayerOptionUnlocked(gatedByTag, new Map(), emptyCtx)).toBe(false);
    expect(isPlayerOptionUnlocked(gatedByTag, guessesWithPair(), emptyCtx)).toBe(true);

    const wrongPair = new Map<number, GuessSessionForUnlock>([
      [
        1,
        {
          attempts: [
            {
              kind: 'multi',
              npcRoundId: 'npc-1',
              picks: [{ sentenceId: 'sent-1', fallacyId: 'straw-man' }],
            },
          ],
        },
      ],
    ]);
    expect(isPlayerOptionUnlocked(gatedByTag, wrongPair, emptyCtx)).toBe(false);
  });

  it('ANDs a cross-encounter condition with the in-debate tag', () => {
    const both = makeOption({
      id: 'opt-both',
      unlockCondition: gatedByTag.unlockCondition,
      unlockConditions: gatedByGame.unlockConditions,
    });
    const flagged: ConditionContext = { ...emptyCtx, dialogFlags: ['cass-named-ad-hominem'] };
    expect(isPlayerOptionUnlocked(both, guessesWithPair(), emptyCtx)).toBe(false);
    expect(isPlayerOptionUnlocked(both, new Map(), flagged)).toBe(false);
    expect(isPlayerOptionUnlocked(both, guessesWithPair(), flagged)).toBe(true);
  });
});

describe('optionLockPhase', () => {
  it('walks ungated → shut → ready → opened', () => {
    expect(optionLockPhase(makeOption({ id: 'plain' }), new Map(), false, emptyCtx)).toBe(
      'ungated',
    );
    expect(optionLockPhase(gatedByTag, new Map(), false, emptyCtx)).toBe('shut');
    expect(optionLockPhase(gatedByTag, guessesWithPair(), false, emptyCtx)).toBe('ready');
    expect(optionLockPhase(gatedByTag, guessesWithPair(), true, emptyCtx)).toBe('opened');
  });
});

describe('optionLockHint / optionLockNeedsAnalyzePulse', () => {
  it('points at Analyze for a shut in-debate lock, and at the game gate otherwise', () => {
    expect(optionLockHint(gatedByTag, 'shut', new Map(), emptyCtx)).toMatch(/magnifying glass/i);
    expect(optionLockNeedsAnalyzePulse(gatedByTag, 'shut', emptyCtx)).toBe(true);

    const gameHint = optionLockHint(gatedByGame, 'shut', new Map(), emptyCtx);
    expect(gameHint).toContain('let Cass name the trick for you');
    expect(optionLockNeedsAnalyzePulse(gatedByGame, 'shut', emptyCtx)).toBe(false);
  });

  it('tells the player they tagged the wrong pair after an attempt', () => {
    const miss = new Map<number, GuessSessionForUnlock>([
      [
        1,
        {
          attempts: [
            {
              kind: 'multi',
              npcRoundId: 'npc-1',
              picks: [{ sentenceId: 'sent-1', fallacyId: 'straw-man' }],
            },
          ],
        },
      ],
    ]);
    expect(optionLockHint(gatedByTag, 'shut', miss, emptyCtx)).toMatch(/not the one/i);
  });
});

describe('resolvedOptionSentences / optionFirstLine', () => {
  it('swaps in unlockedSentences only once the gate is open', () => {
    expect(resolvedOptionSentences(gatedByTag, false)[0]?.text).toBe('Placeholder.');
    expect(resolvedOptionSentences(gatedByTag, true)[0]?.text).toBe('The real line.');
    expect(optionFirstLine(gatedByTag, true)).toBe('The real line.');
    expect(optionFirstLine(makeOption({ id: 'plain' }), true)).toBe('Placeholder.');
  });
});
