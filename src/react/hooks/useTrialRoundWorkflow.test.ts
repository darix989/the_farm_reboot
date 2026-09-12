/** @vitest-environment happy-dom */

import { describe, expect, it } from 'vitest';
import type {
  DebateScenarioJson,
  NpcRoundEntry,
  PlayerOption,
  PlayerRoundEntry,
  Sentence,
} from '../../types/debateEntities';
import type { ConditionContext } from '../../utils/gameConditions';
import {
  createInitialState,
  reduceWorkflow,
  type WorkflowAction,
  type WorkflowState,
} from './useTrialRoundWorkflow';
import type { GuessSessionForUnlock } from '../trial/utils/optionUnlock';

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

function option(id: string, impact: number, extra: Partial<PlayerOption> = {}): PlayerOption {
  return {
    id,
    quality: impact > 0 ? 'effective' : impact < 0 ? 'logical_fallacy' : 'ineffective',
    impact,
    sentences: [sentence(id, id)],
    ...extra,
  };
}

const npcRound: NpcRoundEntry = {
  kind: 'npc',
  id: 'npc-1',
  roundNumber: 1,
  type: 'opening_constructive',
  speakerId: 'cass',
  impact: -8,
  statement: {
    id: 'st-npc',
    speakerId: 'cass',
    type: 'opening_constructive',
    sentences: [sentence('n1', 'Cass opens.')],
  },
};

function playerRound(extra: Partial<PlayerRoundEntry> = {}): PlayerRoundEntry {
  return {
    kind: 'player',
    id: 'pl-1',
    roundNumber: 2,
    type: 'rebuttal',
    options: [option('opt-a', 20), option('opt-b', 0), option('opt-c', -10)],
    ...extra,
  };
}

function scenario(overrides: Partial<DebateScenarioJson> = {}): DebateScenarioJson {
  return {
    id: 'fixture',
    playerSide: 'opposition',
    introduction: 'The floor is open.',
    logicalFallacies: [],
    availableLogicalFallacies: [],
    rounds: [npcRound, playerRound()],
    ...overrides,
  };
}

function step(
  state: WorkflowState,
  action: WorkflowAction,
  debate: DebateScenarioJson,
  guesses: Map<number, GuessSessionForUnlock> = new Map(),
  revealed: Set<string> = new Set(),
  conditions: ConditionContext = emptyCtx,
): WorkflowState {
  return reduceWorkflow(state, action, debate, guesses, revealed, conditions);
}

describe('createInitialState', () => {
  it('starts on the intro when one is authored, otherwise the first round', () => {
    expect(createInitialState(scenario()).gamePhase).toBe('debate_intro');
    expect(createInitialState(scenario({ introduction: undefined })).gamePhase).toBe(
      'npc_speaking',
    );
  });

  it('opens on the moderator when a spoken opening is authored and there is no intro', () => {
    const debate = scenario({
      introduction: undefined,
      moderatorOpening: {
        id: 'open',
        sentences: [sentence('m1', 'The floor is yours.')],
      },
    });
    expect(createInitialState(debate).gamePhase).toBe('moderator_speaking');
  });
});

describe('reduceWorkflow', () => {
  it('walks intro → npc recap → player choice → speaking → recap → complete', () => {
    const debate = scenario();
    let state = createInitialState(debate);

    state = step(state, { type: 'continue' }, debate);
    expect(state.gamePhase).toBe('npc_speaking');

    state = step(state, { type: 'continue' }, debate);
    expect(state.gamePhase).toBe('round_recap');
    expect(state.totalScore).toBe(-8);
    expect(state.completedRounds).toHaveLength(1);

    state = step(state, { type: 'continue' }, debate);
    expect(state.gamePhase).toBe('player_choosing');

    const rejected = step(state, { type: 'select_option', optionId: 'nope' }, debate);
    expect(rejected.selectedOptionId).toBeNull();

    state = step(state, { type: 'select_option', optionId: 'opt-a' }, debate);
    expect(state.selectedOptionId).toBe('opt-a');

    state = step(state, { type: 'unselect_option' }, debate);
    expect(state.selectedOptionId).toBeNull();

    state = step(state, { type: 'select_option', optionId: 'opt-a' }, debate);
    state = step(state, { type: 'confirm_option' }, debate);
    expect(state.gamePhase).toBe('player_speaking');
    expect(state.totalScore).toBe(12);
    expect(state.completedRounds[state.completedRounds.length - 1]?.optionId).toBe('opt-a');
    expect(state.completedRounds[state.completedRounds.length - 1]?.impact).toBe(20);

    const undone = step(state, { type: 'undo' }, debate);
    expect(undone.gamePhase).toBe('player_choosing');
    expect(undone.selectedOptionId).toBe('opt-a');
    expect(undone.totalScore).toBe(-8);

    state = step(state, { type: 'continue' }, debate);
    expect(state.gamePhase).toBe('round_recap');

    state = step(state, { type: 'continue' }, debate);
    expect(state.gamePhase).toBe('debate_complete');
    expect(step(state, { type: 'continue' }, debate)).toBe(state);
  });

  it('skips the recap when the scenario turns it off', () => {
    const debate = scenario({
      introduction: undefined,
      mechanics: { showRoundRecap: false },
    });
    let state = createInitialState(debate);
    expect(state.gamePhase).toBe('npc_speaking');
    state = step(state, { type: 'continue' }, debate);
    expect(state.gamePhase).toBe('player_choosing');
    expect(state.totalScore).toBe(-8);
  });

  it('shows the matched NPC reply after the player line when opponentResponses exist', () => {
    const debate = scenario({
      introduction: undefined,
      rounds: [
        playerRound({
          roundNumber: 1,
          opponentResponses: [
            {
              forOptionId: 'opt-a',
              impact: -5,
              statement: {
                id: 'r-a',
                speakerId: 'cass',
                type: 'crossfire',
                sentences: [sentence('ra', 'Cass answers A.')],
              },
            },
            {
              forOptionId: 'opt-b',
              impact: 0,
              statement: {
                id: 'r-b',
                speakerId: 'cass',
                type: 'crossfire',
                sentences: [sentence('rb', 'Cass answers B.')],
              },
            },
            {
              forOptionId: 'opt-c',
              impact: 4,
              statement: {
                id: 'r-c',
                speakerId: 'cass',
                type: 'crossfire',
                sentences: [sentence('rc', 'Cass answers C.')],
              },
            },
          ],
        }),
      ],
    });
    let state = createInitialState(debate);
    state = step(state, { type: 'select_option', optionId: 'opt-a' }, debate);
    state = step(state, { type: 'confirm_option' }, debate);
    expect(state.gamePhase).toBe('player_speaking');
    expect(state.totalScore).toBe(15);

    state = step(state, { type: 'continue' }, debate);
    expect(state.gamePhase).toBe('npc_responding');
    state = step(state, { type: 'continue' }, debate);
    expect(state.gamePhase).toBe('round_recap');
  });

  it('ignores a gated option until it is unlocked and revealed', () => {
    const gated = option('opt-a', 20, {
      unlockCondition: { npcRoundId: 'npc-1', sentenceId: 'sent-1', fallacyId: 'ad-hominem' },
    });
    const debate = scenario({
      introduction: undefined,
      rounds: [
        playerRound({ roundNumber: 1, options: [gated, option('opt-b', 0), option('opt-c', -10)] }),
      ],
    });
    const state = createInitialState(debate);
    expect(state.gamePhase).toBe('player_choosing');

    const stillShut = step(state, { type: 'select_option', optionId: 'opt-a' }, debate);
    expect(stillShut.selectedOptionId).toBeNull();

    const guesses = new Map<number, GuessSessionForUnlock>([
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
    const ready = step(state, { type: 'select_option', optionId: 'opt-a' }, debate, guesses);
    expect(ready.selectedOptionId).toBeNull();

    const opened = step(
      state,
      { type: 'select_option', optionId: 'opt-a' },
      debate,
      guesses,
      new Set(['opt-a']),
    );
    expect(opened.selectedOptionId).toBe('opt-a');
  });
});
