import { useCallback, useMemo, useReducer } from 'react';
import type { Evidence, Fact, Side, Statement, Target } from '../../types/debateEntities';
import {
  PLACEHOLDER_FACTS,
  PLACEHOLDER_FINAL_OPTIONS,
  PLACEHOLDER_LOGICAL_FALLACIES,
  PLACEHOLDER_OPPOSITION_PAST,
  PLACEHOLDER_PROPOSITION_PAST,
} from './placeholderDebate';

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

interface WorkflowState extends WorkflowCore {
  past: WorkflowCore[];
}

function statementsForSide(side: Side): Statement[] {
  return side === 'proposition' ? PLACEHOLDER_PROPOSITION_PAST : PLACEHOLDER_OPPOSITION_PAST;
}

function getStatement(side: Side, statementId: string): Statement | undefined {
  return statementsForSide(side).find((s) => s.id === statementId);
}

function getFact(factId: string): Fact | undefined {
  return PLACEHOLDER_FACTS.find((f) => f.id === factId);
}

function cloneCore(core: WorkflowCore): WorkflowCore {
  return JSON.parse(JSON.stringify(core)) as WorkflowCore;
}

function snapshotWorkflow(state: WorkflowState): WorkflowCore {
  return cloneCore({
    step: state.step,
    roundKind: state.roundKind,
    target: state.target,
    evidences: state.evidences,
    roundComplete: state.roundComplete,
    finalChoiceId: state.finalChoiceId,
  });
}

function initialCore(): WorkflowCore {
  return {
    step: { kind: 'round_kind' },
    roundKind: null,
    target: null,
    evidences: [],
    roundComplete: false,
    finalChoiceId: null,
  };
}

const initialState: WorkflowState = {
  ...initialCore(),
  past: [],
};

type Action =
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

function pushHistory(state: WorkflowState): WorkflowState['past'] {
  return [...state.past, snapshotWorkflow(state)];
}

function reducer(state: WorkflowState, action: Action): WorkflowState {
  if (action.type === 'undo') {
    if (state.past.length === 0) return state;
    const restored = state.past[state.past.length - 1];
    return { ...cloneCore(restored), past: state.past.slice(0, -1) };
  }

  switch (action.type) {
    case 'select_round': {
      if (state.step.kind !== 'round_kind') return state;
      return {
        ...state,
        past: pushHistory(state),
        roundKind: action.value,
        step: { kind: 'target_side' },
      };
    }
    case 'select_target_side': {
      if (state.step.kind !== 'target_side') return state;
      return {
        ...state,
        past: pushHistory(state),
        step: { kind: 'target_statements', side: action.side },
      };
    }
    case 'select_target_statement': {
      if (state.step.kind !== 'target_statements') return state;
      if (!getStatement(state.step.side, action.statementId)) return state;
      return {
        ...state,
        past: pushHistory(state),
        step: {
          kind: 'target_sentences',
          side: state.step.side,
          statementId: action.statementId,
        },
      };
    }
    case 'select_target_sentence': {
      if (state.step.kind !== 'target_sentences') return state;
      const st = getStatement(state.step.side, state.step.statementId);
      if (!st || !st.sentences.some((s) => s.id === action.sentenceId)) return state;
      const newTarget: Target = {
        type: 'sentence',
        sourceId: st.id,
        sentenceId: action.sentenceId,
      };
      return {
        ...state,
        past: pushHistory(state),
        target: newTarget,
        step: { kind: 'evidence_category' },
      };
    }
    case 'select_evidence_category': {
      if (state.step.kind !== 'evidence_category') return state;
      const past = pushHistory(state);
      switch (action.category) {
        case 'proposition':
          return {
            ...state,
            past,
            step: { kind: 'evidence_statements', side: 'proposition' },
          };
        case 'opposition':
          return {
            ...state,
            past,
            step: { kind: 'evidence_statements', side: 'opposition' },
          };
        case 'facts':
          return {
            ...state,
            past,
            step: { kind: 'evidence_facts' },
          };
        case 'logical_fallacies':
          return {
            ...state,
            past,
            step: { kind: 'evidence_fallacies' },
          };
      }
    }
    case 'select_evidence_statement': {
      if (state.step.kind !== 'evidence_statements') return state;
      if (!getStatement(state.step.side, action.statementId)) return state;
      return {
        ...state,
        past: pushHistory(state),
        step: {
          kind: 'evidence_sentences',
          side: state.step.side,
          statementId: action.statementId,
        },
      };
    }
    case 'select_evidence_sentence': {
      if (state.step.kind !== 'evidence_sentences') return state;
      const st = getStatement(state.step.side, state.step.statementId);
      if (!st || !st.sentences.some((s) => s.id === action.sentenceId)) return state;
      const ev: Evidence = {
        type: 'sentence',
        sourceId: st.id,
        sentenceId: action.sentenceId,
      };
      return {
        ...state,
        past: pushHistory(state),
        evidences: [...state.evidences, ev],
        step: { kind: 'evidence_category' },
      };
    }
    case 'select_evidence_fact': {
      if (state.step.kind !== 'evidence_facts') return state;
      if (!getFact(action.factId)) return state;
      return {
        ...state,
        past: pushHistory(state),
        step: { kind: 'evidence_fact_sentences', factId: action.factId },
      };
    }
    case 'select_evidence_fact_sentence': {
      if (state.step.kind !== 'evidence_fact_sentences') return state;
      const fact = getFact(state.step.factId);
      if (!fact || !fact.sentences.some((s) => s.id === action.sentenceId)) return state;
      const ev: Evidence = {
        type: 'sentence',
        sourceId: fact.id,
        sentenceId: action.sentenceId,
      };
      return {
        ...state,
        past: pushHistory(state),
        evidences: [...state.evidences, ev],
        step: { kind: 'evidence_category' },
      };
    }
    case 'select_evidence_fallacy': {
      if (state.step.kind !== 'evidence_fallacies') return state;
      if (!PLACEHOLDER_LOGICAL_FALLACIES.some((f) => f.id === action.fallacyId)) return state;
      const ev: Evidence = {
        type: 'logical_fallacy',
        logicalFallacyId: action.fallacyId,
      };
      return {
        ...state,
        past: pushHistory(state),
        evidences: [...state.evidences, ev],
        step: { kind: 'evidence_category' },
      };
    }
    case 'submit_evidences': {
      if (state.step.kind !== 'evidence_category' || state.evidences.length < 1) return state;
      return {
        ...state,
        past: pushHistory(state),
        step: { kind: 'final_statements' },
      };
    }
    case 'select_final': {
      if (state.step.kind !== 'final_statements') return state;
      if (!PLACEHOLDER_FINAL_OPTIONS.some((s) => s.id === action.statementId)) return state;
      return {
        ...state,
        past: pushHistory(state),
        finalChoiceId: action.statementId,
        step: { kind: 'round_complete' },
        roundComplete: true,
      };
    }
    default:
      return state;
  }
}

function sentenceLabel(sourceId: string, sentenceId: string): string {
  for (const side of ['proposition', 'opposition'] as const) {
    const st = getStatement(side, sourceId);
    if (st) {
      const sent = st.sentences.find((s) => s.id === sentenceId);
      if (sent) return sent.text;
    }
  }
  for (const fact of PLACEHOLDER_FACTS) {
    if (fact.id === sourceId) {
      const sent = fact.sentences.find((s) => s.id === sentenceId);
      if (sent) return sent.text;
    }
  }
  return sentenceId;
}

function statementTitle(st: Statement): string {
  const first = st.sentences[0]?.text ?? st.id;
  return first.length > 80 ? `${first.slice(0, 77)}…` : first;
}

export function useTrialRoundWorkflow() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const canUndo = state.past.length > 0;

  const wizardMessage = useMemo(() => {
    switch (state.step.kind) {
      case 'round_kind':
        return 'Select Crossfire or Rebuttal for this round.';
      case 'target_side':
        return 'Choose a target side: Proposition or Opposition.';
      case 'target_statements':
        return `Pick a statement from the ${state.step.side} side.`;
      case 'target_sentences':
        return 'Select the sentence you are targeting.';
      case 'evidence_category':
        return 'Select one or more evidences. Pick a category, then complete a selection. Submit when done.';
      case 'evidence_statements':
        return `Choose a ${state.step.side} statement to cite as evidence.`;
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
        return 'Round complete.';
      default:
        return '';
    }
  }, [state.step]);

  const targetSummary = useMemo(() => {
    if (!state.target || state.target.type !== 'sentence') return null;
    return sentenceLabel(state.target.sourceId, state.target.sentenceId);
  }, [state.target]);

  const evidenceSummaries = useMemo(() => {
    return state.evidences.map((ev, i) => {
      if (ev.type === 'logical_fallacy') {
        const f = PLACEHOLDER_LOGICAL_FALLACIES.find((x) => x.id === ev.logicalFallacyId);
        return { key: `${i}-${ev.logicalFallacyId}`, text: f?.label ?? ev.logicalFallacyId };
      }
      return {
        key: `${i}-${ev.sourceId}-${ev.sentenceId}`,
        text: sentenceLabel(ev.sourceId, ev.sentenceId),
      };
    });
  }, [state.evidences]);

  const finalChoice = useMemo((): Statement | null => {
    if (!state.finalChoiceId) return null;
    return PLACEHOLDER_FINAL_OPTIONS.find((s) => s.id === state.finalChoiceId) ?? null;
  }, [state.finalChoiceId]);

  const canSubmitEvidences =
    state.step.kind === 'evidence_category' && state.evidences.length >= 1;

  const undo = useCallback(() => dispatch({ type: 'undo' }), []);

  return {
    step: state.step,
    roundKind: state.roundKind,
    target: state.target,
    targetSummary,
    evidences: state.evidences,
    evidenceSummaries,
    roundComplete: state.roundComplete,
    finalChoice,
    wizardMessage,
    canUndo,
    undo,
    canSubmitEvidences,
    dispatch,
    statementsForSide,
    getStatement,
    getFact,
    logicalFallacies: PLACEHOLDER_LOGICAL_FALLACIES,
    facts: PLACEHOLDER_FACTS,
    finalOptions: PLACEHOLDER_FINAL_OPTIONS,
    statementTitle,
  };
}
