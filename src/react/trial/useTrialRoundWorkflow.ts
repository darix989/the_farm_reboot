import { useCallback, useMemo, useRef, useState } from 'react';
import type {
  AssembledStatement,
  DebateScenarioJson,
  Evidence,
  Fact,
  PlayerOpeningStatement,
  Side,
  Statement,
  Target,
} from '../../types/debateEntities';

export type GamePhase = 'constructive_opponent' | 'assembly' | 'debate_complete';

export type ConstructiveStep =
  | { kind: 'choose_player_constructive' }
  | { kind: 'constructive_summary' };

export type RoundKind = 'crossfire' | 'rebuttal';

export type EvidenceCategory = 'proposition' | 'opposition' | 'facts' | 'logical_fallacies';

export type Step =
  | { kind: 'round_kind' }
  | { kind: 'target_side' }
  | { kind: 'target_statements'; side: Side }
  | { kind: 'target_sentences'; side: Side; statementId: string }
  | { kind: 'evidence_category' }
  | { kind: 'evidence_statements'; side: Side }
  | { kind: 'evidence_sentences'; side: Side; statementId: string }
  | { kind: 'evidence_facts' }
  | { kind: 'evidence_fact_sentences'; factId: string }
  | { kind: 'evidence_fallacies' }
  | { kind: 'final_statements' }
  | { kind: 'round_complete' };

export interface WorkflowCore {
  step: Step;
  roundKind: RoundKind | null;
  target: Target | null;
  evidences: Evidence[];
  roundComplete: boolean;
  finalChoiceId: string | null;
}

export interface WorkflowSnapshot {
  gamePhase: GamePhase;
  constructiveStep: ConstructiveStep;
  /** Opposition flow: opponent opening fixed by RNG before the player picks a constructive. */
  randomOpponentOpeningId: string | null;
  chosenOpponentOpeningId: string | null;
  chosenPlayerConstructive: PlayerOpeningStatement | null;
  /** Statements on the player’s debate side that have occurred this game (constructive + past finals). */
  playerStatementHistory: Statement[];
  /** Opponent statements that have occurred (used opening + scripted rebuttals as rounds advance). */
  opponentStatementHistory: Statement[];
  assemblyRoundIndex: number;
  assembly: WorkflowCore;
}

interface WorkflowState extends WorkflowSnapshot {
  past: WorkflowSnapshot[];
}

export function assemblyRoundIdGroups(scenario: DebateScenarioJson): readonly (readonly string[])[] {
  if (scenario.playerAssemblyRounds && scenario.playerAssemblyRounds.length > 0) {
    return scenario.playerAssemblyRounds;
  }
  return [scenario.assembledStatements.map((a) => a.id)];
}

export function assembledToStatement(a: AssembledStatement): Statement {
  return {
    id: a.id,
    speakerId: 'player',
    sentences: a.sentences.map((s) => ({ ...s })),
  };
}

function finalsForRound(scenario: DebateScenarioJson, assemblyRoundIndex: number): Statement[] {
  const groups = assemblyRoundIdGroups(scenario);
  const ids = new Set(groups[assemblyRoundIndex] ?? []);
  return scenario.assembledStatements.filter((a) => ids.has(a.id)).map(assembledToStatement);
}

interface StatementPools {
  player: Statement[];
  opponent: Statement[];
}

function statementsForSideFromPools(pools: StatementPools, side: Side): Statement[] {
  return side === 'opposition' ? pools.opponent : pools.player;
}

function getStatementFromPools(
  pools: StatementPools,
  side: Side,
  statementId: string,
): Statement | undefined {
  return statementsForSideFromPools(pools, side).find((s) => s.id === statementId);
}

function poolsFromState(state: WorkflowState): StatementPools {
  return {
    player: state.playerStatementHistory,
    opponent: state.opponentStatementHistory,
  };
}

function cloneStatementList(list: Statement[]): Statement[] {
  return JSON.parse(JSON.stringify(list)) as Statement[];
}

/** After a completed assembly round: append player final + optional opponent rebuttal for this round index. */
function appendRoundStatementHistory(
  state: WorkflowState,
  scenario: DebateScenarioJson,
): Pick<WorkflowState, 'playerStatementHistory' | 'opponentStatementHistory'> {
  const id = state.assembly.finalChoiceId;
  if (!id) {
    return {
      playerStatementHistory: state.playerStatementHistory,
      opponentStatementHistory: state.opponentStatementHistory,
    };
  }
  const assembled = scenario.assembledStatements.find((x) => x.id === id);
  if (!assembled) {
    return {
      playerStatementHistory: state.playerStatementHistory,
      opponentStatementHistory: state.opponentStatementHistory,
    };
  }
  const playerStatementHistory = [...state.playerStatementHistory, assembledToStatement(assembled)];
  const rebuttal = scenario.oppositionRebuttalStatements?.[state.assemblyRoundIndex];
  const opponentStatementHistory =
    rebuttal != null
      ? [...state.opponentStatementHistory, JSON.parse(JSON.stringify(rebuttal)) as Statement]
      : state.opponentStatementHistory;
  return { playerStatementHistory, opponentStatementHistory };
}

function getFact(scenario: DebateScenarioJson, factId: string): Fact | undefined {
  return scenario.facts.find((f) => f.id === factId);
}

function cloneCore(core: WorkflowCore): WorkflowCore {
  return JSON.parse(JSON.stringify(core)) as WorkflowCore;
}

function snapshotState(state: WorkflowState): WorkflowSnapshot {
  return {
    gamePhase: state.gamePhase,
    constructiveStep: state.constructiveStep,
    randomOpponentOpeningId: state.randomOpponentOpeningId,
    chosenOpponentOpeningId: state.chosenOpponentOpeningId,
    chosenPlayerConstructive: state.chosenPlayerConstructive
      ? (JSON.parse(JSON.stringify(state.chosenPlayerConstructive)) as PlayerOpeningStatement)
      : null,
    playerStatementHistory: cloneStatementList(state.playerStatementHistory),
    opponentStatementHistory: cloneStatementList(state.opponentStatementHistory),
    assemblyRoundIndex: state.assemblyRoundIndex,
    assembly: cloneCore(state.assembly),
  };
}

function initialAssemblyCore(): WorkflowCore {
  return {
    step: { kind: 'round_kind' },
    roundKind: null,
    target: null,
    evidences: [],
    roundComplete: false,
    finalChoiceId: null,
  };
}

function pickRandomOpponentOpeningId(scenario: DebateScenarioJson): string {
  const openings = scenario.opponentOpening;
  const i = Math.floor(Math.random() * openings.length);
  return openings[i]!.id;
}

function createInitialWorkflowState(scenario: DebateScenarioJson): WorkflowState {
  const randomOpp =
    scenario.playerSide === 'opposition' ? pickRandomOpponentOpeningId(scenario) : null;
  return {
    gamePhase: 'constructive_opponent',
    constructiveStep: { kind: 'choose_player_constructive' },
    randomOpponentOpeningId: randomOpp,
    chosenOpponentOpeningId: null,
    chosenPlayerConstructive: null,
    playerStatementHistory: [],
    opponentStatementHistory: [],
    assemblyRoundIndex: 0,
    assembly: initialAssemblyCore(),
    past: [],
  };
}

type Action =
  | { type: 'select_player_constructive'; statementId: string }
  | { type: 'continue_after_constructive' }
  | { type: 'continue_after_round_complete' }
  | { type: 'select_round'; value: RoundKind }
  | { type: 'select_target_side'; side: Side }
  | { type: 'select_target_statement'; statementId: string }
  | { type: 'select_target_sentence'; sentenceId: string }
  | { type: 'select_evidence_category'; category: EvidenceCategory }
  | { type: 'select_evidence_statement'; statementId: string }
  | { type: 'select_evidence_sentence'; sentenceId: string }
  | { type: 'select_evidence_fact'; factId: string }
  | { type: 'select_evidence_fact_sentence'; sentenceId: string }
  | { type: 'select_evidence_fallacy'; fallacyId: string }
  | { type: 'submit_evidences' }
  | { type: 'select_final'; statementId: string }
  | { type: 'undo' };

function pushHistory(state: WorkflowState): WorkflowSnapshot[] {
  return [...state.past, snapshotState(state)];
}

function reduceWorkflow(state: WorkflowState, action: Action, scenario: DebateScenarioJson): WorkflowState {
  if (action.type === 'undo') {
    if (state.past.length === 0) return state;
    const restored = state.past[state.past.length - 1];
    return {
      ...restored,
      chosenPlayerConstructive: restored.chosenPlayerConstructive
        ? (JSON.parse(JSON.stringify(restored.chosenPlayerConstructive)) as PlayerOpeningStatement)
        : null,
      playerStatementHistory: cloneStatementList(restored.playerStatementHistory),
      opponentStatementHistory: cloneStatementList(restored.opponentStatementHistory),
      past: state.past.slice(0, -1),
    };
  }

  if (state.gamePhase === 'constructive_opponent') {
    switch (action.type) {
      case 'select_player_constructive': {
        if (state.constructiveStep.kind !== 'choose_player_constructive') return state;
        const pc = scenario.playerConstructiveOpenings.find((p) => p.id === action.statementId);
        if (!pc || !pc.triggerOpeningStatementId) return state;
        const oppId = scenario.opponentOpening.find((o) => o.id === pc.triggerOpeningStatementId)?.id;
        if (!oppId) return state;

        if (scenario.playerSide === 'proposition') {
          return {
            ...state,
            past: pushHistory(state),
            chosenOpponentOpeningId: oppId,
            chosenPlayerConstructive: JSON.parse(JSON.stringify(pc)) as PlayerOpeningStatement,
            constructiveStep: { kind: 'constructive_summary' },
          };
        }

        if (state.randomOpponentOpeningId !== oppId) return state;
        return {
          ...state,
          past: pushHistory(state),
          chosenOpponentOpeningId: state.randomOpponentOpeningId,
          chosenPlayerConstructive: JSON.parse(JSON.stringify(pc)) as PlayerOpeningStatement,
          constructiveStep: { kind: 'constructive_summary' },
        };
      }
      case 'continue_after_constructive': {
        if (state.constructiveStep.kind !== 'constructive_summary' || !state.chosenPlayerConstructive) {
          return state;
        }
        const oppOpening = scenario.opponentOpening.find((o) => o.id === state.chosenOpponentOpeningId);
        if (!oppOpening) return state;
        const playerStatementHistory: Statement[] = [
          JSON.parse(JSON.stringify(state.chosenPlayerConstructive)) as PlayerOpeningStatement,
        ];
        const opponentStatementHistory: Statement[] = [
          JSON.parse(JSON.stringify(oppOpening)) as Statement,
        ];
        return {
          ...state,
          past: pushHistory(state),
          gamePhase: 'assembly',
          playerStatementHistory,
          opponentStatementHistory,
          assembly: initialAssemblyCore(),
        };
      }
      default:
        return state;
    }
  }

  if (state.gamePhase === 'debate_complete') {
    return state;
  }

  // assembly phase
  const a = state.assembly;
  const pools = poolsFromState(state);

  switch (action.type) {
    case 'continue_after_round_complete': {
      if (a.step.kind !== 'round_complete') return state;
      const { playerStatementHistory, opponentStatementHistory } = appendRoundStatementHistory(
        state,
        scenario,
      );
      const n = assemblyRoundIdGroups(scenario).length;
      if (state.assemblyRoundIndex + 1 < n) {
        return {
          ...state,
          past: [],
          playerStatementHistory,
          opponentStatementHistory,
          assemblyRoundIndex: state.assemblyRoundIndex + 1,
          assembly: initialAssemblyCore(),
        };
      }
      return {
        ...state,
        past: pushHistory(state),
        playerStatementHistory,
        opponentStatementHistory,
        gamePhase: 'debate_complete',
      };
    }
    case 'select_round': {
      if (a.step.kind !== 'round_kind') return state;
      return {
        ...state,
        past: pushHistory(state),
        assembly: {
          ...a,
          roundKind: action.value,
          step: { kind: 'target_side' },
        },
      };
    }
    case 'select_target_side': {
      if (a.step.kind !== 'target_side') return state;
      return {
        ...state,
        past: pushHistory(state),
        assembly: {
          ...a,
          step: { kind: 'target_statements', side: action.side },
        },
      };
    }
    case 'select_target_statement': {
      if (a.step.kind !== 'target_statements') return state;
      if (!getStatementFromPools(pools, a.step.side, action.statementId)) return state;
      return {
        ...state,
        past: pushHistory(state),
        assembly: {
          ...a,
          step: {
            kind: 'target_sentences',
            side: a.step.side,
            statementId: action.statementId,
          },
        },
      };
    }
    case 'select_target_sentence': {
      if (a.step.kind !== 'target_sentences') return state;
      const st = getStatementFromPools(pools, a.step.side, a.step.statementId);
      if (!st || !st.sentences.some((s) => s.id === action.sentenceId)) return state;
      const newTarget: Target = {
        type: 'sentence',
        sourceId: st.id,
        sentenceId: action.sentenceId,
      };
      return {
        ...state,
        past: pushHistory(state),
        assembly: {
          ...a,
          target: newTarget,
          step: { kind: 'evidence_category' },
        },
      };
    }
    case 'select_evidence_category': {
      if (a.step.kind !== 'evidence_category') return state;
      const past = pushHistory(state);
      switch (action.category) {
        case 'proposition':
          return {
            ...state,
            past,
            assembly: {
              ...a,
              step: { kind: 'evidence_statements', side: 'proposition' },
            },
          };
        case 'opposition':
          return {
            ...state,
            past,
            assembly: {
              ...a,
              step: { kind: 'evidence_statements', side: 'opposition' },
            },
          };
        case 'facts':
          return {
            ...state,
            past,
            assembly: {
              ...a,
              step: { kind: 'evidence_facts' },
            },
          };
        case 'logical_fallacies':
          return {
            ...state,
            past,
            assembly: {
              ...a,
              step: { kind: 'evidence_fallacies' },
            },
          };
      }
    }
    case 'select_evidence_statement': {
      if (a.step.kind !== 'evidence_statements') return state;
      if (!getStatementFromPools(pools, a.step.side, action.statementId)) return state;
      return {
        ...state,
        past: pushHistory(state),
        assembly: {
          ...a,
          step: {
            kind: 'evidence_sentences',
            side: a.step.side,
            statementId: action.statementId,
          },
        },
      };
    }
    case 'select_evidence_sentence': {
      if (a.step.kind !== 'evidence_sentences') return state;
      const st = getStatementFromPools(pools, a.step.side, a.step.statementId);
      if (!st || !st.sentences.some((s) => s.id === action.sentenceId)) return state;
      const ev: Evidence = {
        type: 'sentence',
        sourceId: st.id,
        sentenceId: action.sentenceId,
      };
      return {
        ...state,
        past: pushHistory(state),
        assembly: {
          ...a,
          evidences: [...a.evidences, ev],
          step: { kind: 'evidence_category' },
        },
      };
    }
    case 'select_evidence_fact': {
      if (a.step.kind !== 'evidence_facts') return state;
      if (!getFact(scenario, action.factId)) return state;
      return {
        ...state,
        past: pushHistory(state),
        assembly: {
          ...a,
          step: { kind: 'evidence_fact_sentences', factId: action.factId },
        },
      };
    }
    case 'select_evidence_fact_sentence': {
      if (a.step.kind !== 'evidence_fact_sentences') return state;
      const fact = getFact(scenario, a.step.factId);
      if (!fact || !fact.sentences.some((s) => s.id === action.sentenceId)) return state;
      const ev: Evidence = {
        type: 'sentence',
        sourceId: fact.id,
        sentenceId: action.sentenceId,
      };
      return {
        ...state,
        past: pushHistory(state),
        assembly: {
          ...a,
          evidences: [...a.evidences, ev],
          step: { kind: 'evidence_category' },
        },
      };
    }
    case 'select_evidence_fallacy': {
      if (a.step.kind !== 'evidence_fallacies') return state;
      if (!scenario.logicalFallacies.some((f) => f.id === action.fallacyId)) return state;
      const ev: Evidence = {
        type: 'logical_fallacy',
        logicalFallacyId: action.fallacyId,
      };
      return {
        ...state,
        past: pushHistory(state),
        assembly: {
          ...a,
          evidences: [...a.evidences, ev],
          step: { kind: 'evidence_category' },
        },
      };
    }
    case 'submit_evidences': {
      if (a.step.kind !== 'evidence_category' || a.evidences.length < 1) return state;
      return {
        ...state,
        past: pushHistory(state),
        assembly: {
          ...a,
          step: { kind: 'final_statements' },
        },
      };
    }
    case 'select_final': {
      if (a.step.kind !== 'final_statements') return state;
      const finals = finalsForRound(scenario, state.assemblyRoundIndex);
      if (!finals.some((s) => s.id === action.statementId)) return state;
      return {
        ...state,
        past: pushHistory(state),
        assembly: {
          ...a,
          finalChoiceId: action.statementId,
          step: { kind: 'round_complete' },
          roundComplete: true,
        },
      };
    }
    default:
      return state;
  }
}

function sentenceLabel(
  scenario: DebateScenarioJson,
  pools: StatementPools,
  sourceId: string,
  sentenceId: string,
): string {
  for (const side of ['proposition', 'opposition'] as const) {
    const st = getStatementFromPools(pools, side, sourceId);
    if (st) {
      const sent = st.sentences.find((s) => s.id === sentenceId);
      if (sent) return sent.text;
    }
  }
  for (const fact of scenario.facts) {
    if (fact.id === sourceId) {
      const sent = fact.sentences.find((s) => s.id === sentenceId);
      if (sent) return sent.text;
    }
  }
  return sentenceId;
}

export function statementTitle(st: Statement): string {
  const first = st.sentences[0]?.text ?? st.id;
  return first.length > 80 ? `${first.slice(0, 77)}…` : first;
}

export function useTrialRoundWorkflow(scenario: DebateScenarioJson) {
  const scenarioRef = useRef(scenario);
  scenarioRef.current = scenario;

  const [state, setState] = useState<WorkflowState>(() => createInitialWorkflowState(scenario));

  const dispatch = useCallback((action: Action) => {
    setState((prev) => reduceWorkflow(prev, action, scenarioRef.current));
  }, []);

  const canUndo = state.past.length > 0;

  const assemblyRoundCount = assemblyRoundIdGroups(scenario).length;
  const hasMoreAssemblyRoundsAfterComplete =
    state.gamePhase === 'assembly' &&
    state.assembly.step.kind === 'round_complete' &&
    state.assemblyRoundIndex + 1 < assemblyRoundCount;

  const wizardMessage = useMemo(() => {
    if (state.gamePhase === 'constructive_opponent') {
      if (state.constructiveStep.kind === 'choose_player_constructive') {
        if (scenario.playerSide === 'proposition') {
          return 'Choose your constructive opening. The matching opponent line will be set for this debate.';
        }
        return "Your opponent's opening was drawn at random (see Feedback). Choose your constructive response.";
      }
      return 'Review both opening lines. Continue when ready for the assembly round.';
    }
    if (state.gamePhase === 'debate_complete') {
      return 'Debate complete.';
    }
    const step = state.assembly.step;
    switch (step.kind) {
      case 'round_kind':
        return 'Select Crossfire or Rebuttal for this round.';
      case 'target_side':
        return 'Choose a target side: Proposition or Opposition.';
      case 'target_statements':
        return `Pick a statement from the ${step.side} side.`;
      case 'target_sentences':
        return 'Select the sentence you are targeting.';
      case 'evidence_category':
        return 'Select one or more evidences. Pick a category, then complete a selection. Submit when done.';
      case 'evidence_statements':
        return `Choose a ${step.side} statement to cite as evidence.`;
      case 'evidence_sentences':
        return 'Pick the sentence that supports your evidence.';
      case 'evidence_facts':
        return 'Choose a fact, then pick a sentence from it.';
      case 'evidence_fact_sentences':
        return 'Select a sentence from this fact.';
      case 'evidence_fallacies':
        return 'Select a logical fallacy as evidence.';
      case 'final_statements':
        return 'Choose one closing statement to end the round.';
      case 'round_complete':
        return hasMoreAssemblyRoundsAfterComplete
          ? 'Round complete. Continue to the next assembly round.'
          : 'Round complete. Continue to finish the debate.';
      default:
        return '';
    }
  }, [
    state.gamePhase,
    state.constructiveStep,
    state.assembly.step,
    hasMoreAssemblyRoundsAfterComplete,
    scenario.playerSide,
  ]);

  const playerConstructiveChoices = useMemo((): PlayerOpeningStatement[] => {
    if (scenario.playerSide === 'opposition' && state.randomOpponentOpeningId) {
      return scenario.playerConstructiveOpenings.filter(
        (p) => p.triggerOpeningStatementId === state.randomOpponentOpeningId,
      );
    }
    return [...scenario.playerConstructiveOpenings];
  }, [scenario.playerConstructiveOpenings, scenario.playerSide, state.randomOpponentOpeningId]);

  const statementPools = useMemo(
    (): StatementPools => ({
      player: state.playerStatementHistory,
      opponent: state.opponentStatementHistory,
    }),
    [state.playerStatementHistory, state.opponentStatementHistory],
  );

  const targetSummary = useMemo(() => {
    const t = state.assembly.target;
    if (!t || t.type !== 'sentence') return null;
    return sentenceLabel(scenario, statementPools, t.sourceId, t.sentenceId);
  }, [state.assembly.target, scenario, statementPools]);

  const evidenceSummaries = useMemo(() => {
    return state.assembly.evidences.map((ev, i) => {
      if (ev.type === 'logical_fallacy') {
        const f = scenario.logicalFallacies.find((x) => x.id === ev.logicalFallacyId);
        return { key: `${i}-${ev.logicalFallacyId}`, text: f?.label ?? ev.logicalFallacyId };
      }
      return {
        key: `${i}-${ev.sourceId}-${ev.sentenceId}`,
        text: sentenceLabel(scenario, statementPools, ev.sourceId, ev.sentenceId),
      };
    });
  }, [state.assembly.evidences, scenario, statementPools]);

  const finalChoice = useMemo((): Statement | null => {
    const id = state.assembly.finalChoiceId;
    if (!id) return null;
    const assembled = scenario.assembledStatements.find((x) => x.id === id);
    return assembled ? assembledToStatement(assembled) : null;
  }, [state.assembly.finalChoiceId, scenario.assembledStatements]);

  const finalAssembledChoice = useMemo((): AssembledStatement | null => {
    const id = state.assembly.finalChoiceId;
    if (!id) return null;
    return scenario.assembledStatements.find((x) => x.id === id) ?? null;
  }, [state.assembly.finalChoiceId, scenario.assembledStatements]);

  const finalOptions = useMemo(
    () => finalsForRound(scenario, state.assemblyRoundIndex),
    [scenario, state.assemblyRoundIndex],
  );

  const canSubmitEvidences =
    state.gamePhase === 'assembly' &&
    state.assembly.step.kind === 'evidence_category' &&
    state.assembly.evidences.length >= 1;

  const undo = useCallback(() => dispatch({ type: 'undo' }), [dispatch]);

  const statementsForSideCb = useCallback(
    (side: Side) => statementsForSideFromPools(statementPools, side),
    [statementPools],
  );

  const getStatementCb = useCallback(
    (side: Side, statementId: string) => getStatementFromPools(statementPools, side, statementId),
    [statementPools],
  );

  const getFactCb = useCallback((factId: string) => getFact(scenario, factId), [scenario]);

  return {
    scenario,
    gamePhase: state.gamePhase,
    constructiveStep: state.constructiveStep,
    randomOpponentOpeningId: state.randomOpponentOpeningId,
    playerConstructiveChoices,
    chosenOpponentOpeningId: state.chosenOpponentOpeningId,
    chosenPlayerConstructive: state.chosenPlayerConstructive,
    playerStatementHistory: state.playerStatementHistory,
    opponentStatementHistory: state.opponentStatementHistory,
    assemblyRoundIndex: state.assemblyRoundIndex,
    assemblyRoundCount,
    isDebateComplete: state.gamePhase === 'debate_complete',
    hasMoreAssemblyRoundsAfterComplete,
    step: state.assembly.step,
    roundKind: state.assembly.roundKind,
    target: state.assembly.target,
    targetSummary,
    evidences: state.assembly.evidences,
    evidenceSummaries,
    roundComplete: state.assembly.roundComplete,
    finalChoice,
    finalAssembledChoice,
    wizardMessage,
    canUndo,
    undo,
    canSubmitEvidences,
    dispatch,
    statementsForSide: statementsForSideCb,
    getStatement: getStatementCb,
    getFact: getFactCb,
    logicalFallacies: scenario.logicalFallacies,
    facts: scenario.facts,
    finalOptions,
    statementTitle,
  };
}
