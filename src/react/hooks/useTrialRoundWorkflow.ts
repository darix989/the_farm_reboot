import { useCallback, useMemo, useRef, useState } from 'react';
import type {
  DebateScenarioJson,
  NpcRoundEntry,
  OpponentResponse,
  PlayerOption,
  PlayerRoundEntry,
  RoundEntry,
  Statement,
} from '../../types/debateEntities';
import {
  isPlayerOptionUnlocked,
  resolvedOptionSentences,
  type GuessSessionForUnlock,
} from '../trial/utils/optionUnlock';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type GamePhase =
  | 'debate_intro' // read scenario introduction; Continue opens summary then starts round 1
  | 'npc_speaking' // player reads NPC statement, clicks Continue
  | 'player_choosing' // player sees 3 options
  | 'player_confirming' // player reviews chosen option, can go Back or Confirm
  | 'npc_responding' // NPC response matched to the chosen option (crossfire)
  | 'round_recap' // summary modal; dismiss advances to next round
  | 'debate_complete';

export interface CompletedRound {
  roundId: string;
  roundNumber: number;
  optionId: string;
  impact: number;
}

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

interface WorkflowSnapshot {
  gamePhase: GamePhase;
  currentRoundIndex: number;
  selectedOptionId: string | null;
  completedRounds: CompletedRound[];
  totalScore: number;
}

interface WorkflowState extends WorkflowSnapshot {
  past: WorkflowSnapshot[];
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

type Action =
  | { type: 'continue' }
  | { type: 'select_option'; optionId: string }
  | { type: 'confirm_option' }
  | { type: 'undo' };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function snapshotState(state: WorkflowState): WorkflowSnapshot {
  return {
    gamePhase: state.gamePhase,
    currentRoundIndex: state.currentRoundIndex,
    selectedOptionId: state.selectedOptionId,
    completedRounds: [...state.completedRounds],
    totalScore: state.totalScore,
  };
}

function pushHistory(state: WorkflowState): WorkflowSnapshot[] {
  return [...state.past, snapshotState(state)];
}

function initialPhaseForRound(round: RoundEntry): GamePhase {
  return round.kind === 'npc' ? 'npc_speaking' : 'player_choosing';
}

function scenarioHasIntroduction(scenario: DebateScenarioJson): boolean {
  return Boolean(scenario.introduction?.trim());
}

function createInitialState(scenario: DebateScenarioJson): WorkflowState {
  const firstRound = scenario.rounds[0];
  const gamePhase: GamePhase = scenarioHasIntroduction(scenario)
    ? 'debate_intro'
    : firstRound
      ? initialPhaseForRound(firstRound)
      : 'debate_complete';
  return {
    gamePhase,
    currentRoundIndex: 0,
    selectedOptionId: null,
    completedRounds: [],
    totalScore: 0,
    past: [],
  };
}

function advanceToNextRound(
  state: WorkflowState,
  scenario: DebateScenarioJson,
  completedRounds: CompletedRound[],
  totalScore: number,
): WorkflowState {
  const nextIndex = state.currentRoundIndex + 1;
  const nextRound = scenario.rounds[nextIndex];
  if (!nextRound) {
    return {
      ...state,
      past: pushHistory(state),
      gamePhase: 'debate_complete',
      currentRoundIndex: nextIndex,
      selectedOptionId: null,
      completedRounds,
      totalScore,
    };
  }
  return {
    ...state,
    past: pushHistory(state),
    gamePhase: initialPhaseForRound(nextRound),
    currentRoundIndex: nextIndex,
    selectedOptionId: null,
    completedRounds,
    totalScore,
  };
}

function reduceWorkflow(
  state: WorkflowState,
  action: Action,
  scenario: DebateScenarioJson,
  fallacyGuesses: Map<number, GuessSessionForUnlock>,
  revealedLockedOptionIds: Set<string>,
): WorkflowState {
  if (action.type === 'undo') {
    if (state.past.length === 0) return state;
    const restored = state.past[state.past.length - 1]!;
    return { ...restored, past: state.past.slice(0, -1) };
  }

  if (state.gamePhase === 'debate_complete') return state;

  // --- Debate intro: UI shows summary modal then dispatches Continue (no undo snapshot) ---
  if (state.gamePhase === 'debate_intro') {
    if (action.type !== 'continue') return state;
    const firstRound = scenario.rounds[0];
    if (!firstRound) {
      return {
        ...state,
        gamePhase: 'debate_complete',
        currentRoundIndex: 0,
        selectedOptionId: null,
      };
    }
    return {
      ...state,
      gamePhase: initialPhaseForRound(firstRound),
      currentRoundIndex: 0,
      selectedOptionId: null,
    };
  }

  const currentRound = scenario.rounds[state.currentRoundIndex];
  if (!currentRound) return state;

  // --- NPC speaking: player clicks Continue to advance ---
  if (state.gamePhase === 'npc_speaking') {
    if (action.type !== 'continue') return state;
    return advanceToNextRound(state, scenario, state.completedRounds, state.totalScore);
  }

  // --- Player choosing: player selects one of the 3 options ---
  if (state.gamePhase === 'player_choosing') {
    if (action.type !== 'select_option') return state;
    if (currentRound.kind !== 'player') return state;
    const valid = currentRound.options.some((o) => o.id === action.optionId);
    if (!valid) return state;
    const opt = currentRound.options.find((o) => o.id === action.optionId);
    if (opt && !isPlayerOptionUnlocked(opt, fallacyGuesses)) return state;
    if (
      opt?.unlockCondition &&
      isPlayerOptionUnlocked(opt, fallacyGuesses) &&
      !revealedLockedOptionIds.has(opt.id)
    ) {
      return state;
    }
    return {
      ...state,
      past: pushHistory(state),
      gamePhase: 'player_confirming',
      selectedOptionId: action.optionId,
    };
  }

  // --- Player confirming: player can go back (undo) or confirm ---
  if (state.gamePhase === 'player_confirming') {
    if (action.type !== 'confirm_option') return state;
    if (currentRound.kind !== 'player' || !state.selectedOptionId) return state;

    const option = currentRound.options.find((o) => o.id === state.selectedOptionId);
    if (!option) return state;

    const newCompleted: CompletedRound[] = [
      ...state.completedRounds,
      {
        roundId: currentRound.id,
        roundNumber: currentRound.roundNumber,
        optionId: option.id,
        impact: option.impact,
      },
    ];
    const newScore = state.totalScore + option.impact;

    // If the round has opponentResponses, show the matched one before advancing
    if (currentRound.opponentResponses) {
      const response = currentRound.opponentResponses.find(
        (r) => r.forOptionId === state.selectedOptionId,
      );
      if (response) {
        return {
          ...state,
          past: pushHistory(state),
          gamePhase: 'npc_responding',
          completedRounds: newCompleted,
          totalScore: newScore,
        };
      }
    }

    // No NPC response: show round recap before advancing
    return {
      ...state,
      past: pushHistory(state),
      gamePhase: 'round_recap',
      completedRounds: newCompleted,
      totalScore: newScore,
    };
  }

  // --- NPC responding: player clicks Continue after seeing NPC reply ---
  if (state.gamePhase === 'npc_responding') {
    if (action.type !== 'continue') return state;
    return {
      ...state,
      past: pushHistory(state),
      gamePhase: 'round_recap',
    };
  }

  // --- Round recap: dismiss modal (Continue) advances ---
  if (state.gamePhase === 'round_recap') {
    if (action.type !== 'continue') return state;
    return advanceToNextRound(state, scenario, state.completedRounds, state.totalScore);
  }

  return state;
}

// ---------------------------------------------------------------------------
// Selectors / derived data helpers
// ---------------------------------------------------------------------------

export function statementTitle(st: Statement): string {
  const first = st.sentences[0]?.text ?? st.id;
  return first.length > 80 ? `${first.slice(0, 77)}…` : first;
}

export function optionTitle(
  opt: PlayerOption,
  fallacyGuesses?: Map<number, GuessSessionForUnlock>,
  revealedLockedOptionIds?: Set<string>,
): string {
  const guessUnlocked =
    !opt.unlockCondition || isPlayerOptionUnlocked(opt, fallacyGuesses ?? new Map());
  const showRealCopy =
    !opt.unlockCondition ||
    (guessUnlocked &&
      (revealedLockedOptionIds === undefined || revealedLockedOptionIds.has(opt.id)));
  const first = resolvedOptionSentences(opt, showRealCopy)[0]?.text ?? opt.id;
  return first.length > 80 ? `${first.slice(0, 77)}…` : first;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTrialRoundWorkflow(
  scenario: DebateScenarioJson,
  fallacyGuesses: Map<number, GuessSessionForUnlock> = new Map(),
  revealedLockedOptionIds: Set<string> = new Set(),
) {
  const scenarioRef = useRef(scenario);
  scenarioRef.current = scenario;

  const fallacyGuessesRef = useRef(fallacyGuesses);
  fallacyGuessesRef.current = fallacyGuesses;

  const revealedLockedOptionIdsRef = useRef(revealedLockedOptionIds);
  revealedLockedOptionIdsRef.current = revealedLockedOptionIds;

  const [state, setState] = useState<WorkflowState>(() => createInitialState(scenario));

  const dispatch = useCallback((action: Action) => {
    setState((prev) =>
      reduceWorkflow(
        prev,
        action,
        scenarioRef.current,
        fallacyGuessesRef.current,
        revealedLockedOptionIdsRef.current,
      ),
    );
  }, []);

  const undo = useCallback(() => dispatch({ type: 'undo' }), [dispatch]);

  const currentRound = scenario.rounds[state.currentRoundIndex] ?? null;

  const currentNpcRound = useMemo(
    (): NpcRoundEntry | null =>
      currentRound?.kind === 'npc' ? (currentRound as NpcRoundEntry) : null,
    [currentRound],
  );

  const currentPlayerRound = useMemo(
    (): PlayerRoundEntry | null =>
      currentRound?.kind === 'player' ? (currentRound as PlayerRoundEntry) : null,
    [currentRound],
  );

  const selectedOption = useMemo((): PlayerOption | null => {
    if (!currentPlayerRound || !state.selectedOptionId) return null;
    return currentPlayerRound.options.find((o) => o.id === state.selectedOptionId) ?? null;
  }, [currentPlayerRound, state.selectedOptionId]);

  const activeOpponentResponse = useMemo((): OpponentResponse | null => {
    if (
      (state.gamePhase !== 'npc_responding' && state.gamePhase !== 'round_recap') ||
      !currentPlayerRound ||
      !state.selectedOptionId
    ) {
      return null;
    }
    return (
      currentPlayerRound.opponentResponses?.find((r) => r.forOptionId === state.selectedOptionId) ??
      null
    );
  }, [state.gamePhase, currentPlayerRound, state.selectedOptionId]);

  // Back is only meaningful in player_confirming: the previous snapshot is always
  // player_choosing for the same round, so undo can never jump to a different round.
  const canUndo = state.gamePhase === 'player_confirming' && state.past.length > 0;

  const opponentName = useMemo(() => {
    const npcRound = scenario.rounds.find((r) => r.kind === 'npc') as NpcRoundEntry | undefined;
    const id = npcRound?.speakerId ?? 'opponent';
    return scenario.characters?.[id] ?? id.charAt(0).toUpperCase() + id.slice(1);
  }, [scenario]);

  const wizardMessage = useMemo((): string => {
    if (state.gamePhase === 'debate_complete') return 'The debate is finished.';
    if (state.gamePhase === 'debate_intro') {
      return "We're about to play a debate. Read the introduction, and once you are ready, click Continue.";
    }
    if (!currentRound) return '';

    const roundLabel = `Round ${currentRound.roundNumber} — ${currentRound.type.replace(/_/g, ' ')}`;

    switch (state.gamePhase) {
      case 'npc_speaking':
        return `${roundLabel}. Read ${opponentName}'s statement, then click Continue.`;
      case 'player_choosing':
        if (currentPlayerRound?.opponentPrompt) {
          return `${roundLabel}. ${opponentName} has asked a question. Choose your response.`;
        }
        return `${roundLabel}. Choose your statement.`;
      case 'player_confirming':
        return 'Review your choice below. Go back to change it, or confirm to lock it in.';
      case 'npc_responding':
        return `${opponentName} responds to your statement. Read it, then continue.`;
      case 'round_recap':
        return 'Review the round summary, then close the dialog to continue.';
      default:
        return '';
    }
  }, [state.gamePhase, currentRound, currentPlayerRound, opponentName]);

  const totalRounds = scenario.rounds.length;
  const playerRounds = scenario.rounds.filter((r) => r.kind === 'player');
  const maxPossibleScore = playerRounds.reduce((sum, r) => {
    if (r.kind !== 'player') return sum;
    const best = Math.max(...r.options.map((o) => o.impact));
    return sum + best;
  }, 0);

  const optionTitleWithUnlock = useCallback(
    (opt: PlayerOption) =>
      optionTitle(opt, fallacyGuessesRef.current, revealedLockedOptionIdsRef.current),
    [],
  );

  return {
    scenario,
    gamePhase: state.gamePhase,
    currentRoundIndex: state.currentRoundIndex,
    totalRounds,
    currentRound,
    currentNpcRound,
    currentPlayerRound,
    selectedOption,
    activeOpponentResponse,
    completedRounds: state.completedRounds,
    totalScore: state.totalScore,
    maxPossibleScore,
    canUndo,
    wizardMessage,
    dispatch,
    undo,
    statementTitle,
    optionTitle: optionTitleWithUnlock,
  };
}
