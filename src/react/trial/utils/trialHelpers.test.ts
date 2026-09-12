import { describe, expect, it } from 'vitest';
import {
  PLAYER_OPTION_IMPACT_ABS_MAX,
  type DebateScenarioJson,
} from '../../../types/debateEntities';
import {
  activeRoundNumber,
  debateTotalScoreBounds,
  emotionFromStatement,
  firstNpcSpeakerId,
  getSpeakerName,
  getStartingInsightPoints,
  opponentSide,
  recapText,
  revealChunks,
  shuffleCopyDeterministic,
  splitIntoSentences,
  statementTypeLabel,
} from './trialHelpers';

const debate: DebateScenarioJson = {
  id: 'fixture',
  playerSide: 'opposition',
  characters: { cass: 'Cass' },
  logicalFallacies: [],
  availableLogicalFallacies: [],
  rounds: [
    {
      kind: 'npc',
      id: 'npc-1',
      roundNumber: 1,
      type: 'opening_constructive',
      speakerId: 'cass',
      impact: 0,
      statement: {
        id: 'st',
        speakerId: 'cass',
        type: 'opening_constructive',
        sentences: [{ id: 's1', text: 'Hello.', logicalFallacies: [] }],
      },
    },
    {
      kind: 'player',
      id: 'pl-1',
      roundNumber: 2,
      type: 'rebuttal',
      options: [
        {
          id: 'a',
          quality: 'effective',
          impact: 10,
          sentences: [{ id: 'a', text: 'A', logicalFallacies: [] }],
        },
        {
          id: 'b',
          quality: 'ineffective',
          impact: 0,
          sentences: [{ id: 'b', text: 'B', logicalFallacies: [] }],
        },
        {
          id: 'c',
          quality: 'logical_fallacy',
          impact: -10,
          sentences: [{ id: 'c', text: 'C', logicalFallacies: [] }],
        },
      ],
    },
  ],
};

describe('getSpeakerName / getStartingInsightPoints', () => {
  it('uses the characters map, then capitalises the id', () => {
    expect(getSpeakerName(debate, 'cass')).toBe('Cass');
    expect(getSpeakerName(debate, 'rue')).toBe('Rue');
  });

  it('floors a non-negative starting Insight balance and rejects junk', () => {
    expect(getStartingInsightPoints(debate)).toBe(0);
    expect(getStartingInsightPoints({ ...debate, startingInsightPoints: 3.9 })).toBe(3);
    expect(getStartingInsightPoints({ ...debate, startingInsightPoints: -1 })).toBe(0);
    expect(getStartingInsightPoints({ ...debate, startingInsightPoints: Number.NaN })).toBe(0);
  });
});

describe('revealChunks / splitIntoSentences', () => {
  it('maps authored sentences 1:1 and drops blanks', () => {
    expect(
      revealChunks([
        { id: 'a', text: 'First.', logicalFallacies: [] },
        { id: 'b', text: '  ', logicalFallacies: [] },
        { id: 'c', text: 'Third.', logicalFallacies: [] },
      ]),
    ).toEqual(['First.', 'Third.']);
  });

  it('folds a short trailing fragment into the previous prose chunk', () => {
    const chunks = splitIntoSentences(
      'The pond is going muddy. Loudly. Everyone who arrived later can walk half a mile.',
    );
    expect(chunks.length).toBe(2);
    expect(chunks[0]).toContain('Loudly.');
  });
});

describe('recapText / activeRoundNumber / sides', () => {
  it('prefers an authored summary and otherwise keeps the spoken line', () => {
    expect(recapText('  Stakes.  ', 'The long spoken line.')).toEqual({
      text: 'Stakes.',
      isSummary: true,
    });
    expect(recapText(undefined, 'The long spoken line.')).toEqual({
      text: 'The long spoken line.',
      isSummary: false,
    });
  });

  it('clamps the 1-based round past the last index', () => {
    expect(activeRoundNumber(0, 2)).toBe(1);
    expect(activeRoundNumber(4, 2)).toBe(2);
    expect(activeRoundNumber(0, 0)).toBeNull();
  });

  it('flips sides and names the first NPC as the opponent', () => {
    expect(opponentSide('opposition')).toBe('proposition');
    expect(opponentSide('proposition')).toBe('opposition');
    expect(firstNpcSpeakerId(debate)).toBe('cass');
    expect(statementTypeLabel('opening_constructive')).toMatch(/opening/i);
  });
});

describe('debateTotalScoreBounds / shuffleCopyDeterministic / emotionFromStatement', () => {
  it('caps the gauge at ±50 per player round', () => {
    expect(debateTotalScoreBounds(debate)).toEqual({
      min: -PLAYER_OPTION_IMPACT_ABS_MAX,
      max: PLAYER_OPTION_IMPACT_ABS_MAX,
    });
  });

  it('shuffles stably for the same playthrough key', () => {
    const items = ['a', 'b', 'c', 'd'];
    expect(shuffleCopyDeterministic(items, 'run-1', 'pl-1')).toEqual(
      shuffleCopyDeterministic(items, 'run-1', 'pl-1'),
    );
    expect(shuffleCopyDeterministic(items, 'run-1', 'pl-1')).not.toEqual(
      shuffleCopyDeterministic(items, 'run-2', 'pl-1'),
    );
  });

  it('derives sneaky from a line that hides a fallacy, unless authored', () => {
    expect(
      emotionFromStatement({
        id: 'st',
        speakerId: 'cass',
        type: 'opening_constructive',
        sentences: [
          {
            id: 's',
            text: 'Dirty.',
            logicalFallacies: [{ id: 'ad-hominem', explanation: '' }],
          },
        ],
      }),
    ).toBe('sneaky');
    expect(
      emotionFromStatement({
        id: 'st',
        speakerId: 'cass',
        type: 'crossfire',
        sentences: [{ id: 's', text: 'Fair question?', logicalFallacies: [] }],
      }),
    ).toBe('doubtful');
    expect(
      emotionFromStatement({
        id: 'st',
        speakerId: 'cass',
        type: 'opening_constructive',
        emotion: 'angry',
        sentences: [
          {
            id: 's',
            text: 'Dirty.',
            logicalFallacies: [{ id: 'ad-hominem', explanation: '' }],
          },
        ],
      }),
    ).toBe('angry');
  });
});
