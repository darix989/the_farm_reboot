import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { DebateScenarioJson, LogicalFallacy, Sentence } from '../../types/debateEntities';
import logicalFallaciesData from '../../data/logicalFallacies.json';
import TrialLayout from '../trial/TrialLayout';
import { useTrialRoundWorkflow } from '../hooks/useTrialRoundWorkflow';
import RoundAnalysisModal, {
  type AnalysisTarget,
} from '../trial/roundAnalysisModal/RoundAnalysisModal';
import type {
  FallacyGuessSession,
  GuessPayload,
  GuessRecord,
} from '../trial/utils/fallacyGuessTypes';
import { DEFAULT_MAX_ANALYSIS_ATTEMPTS } from '../trial/utils/fallacyGuessTypes';
import {
  computeMissedPairs,
  guessMultisetFromPicks,
  hasCorrectPairOverlap,
  isSessionTerminal,
  multisetsEqual,
  truthMultisetFromSentences,
  guessStateFromAttempts,
} from '../trial/utils/fallacyGuessUtils';
import FeedbackPanel from '../trial/panels/FeedbackPanel';
import WizardPanel from '../trial/panels/WizardPanel';
import InteractivePanel from '../trial/panels/InteractivePanel';
import RoundRecapModal from '../trial/roundRecapModal/RoundRecapModal';
import { getSpeakerName } from '../trial/utils/trialHelpers';

interface TrialUIProps {
  debate: DebateScenarioJson;
}

const TrialUI: React.FC<TrialUIProps> = ({ debate }) => {
  const [fallacyGuesses, setFallacyGuesses] = useState<Map<number, FallacyGuessSession>>(new Map());
  const [revealedLockedOptionIds, setRevealedLockedOptionIds] = useState<Set<string>>(
    () => new Set(),
  );
  const wf = useTrialRoundWorkflow(debate, fallacyGuesses, revealedLockedOptionIds);

  useEffect(() => {
    setRevealedLockedOptionIds(new Set());
  }, [wf.currentPlayerRound?.id]);

  useEffect(() => {
    if (wf.gamePhase === 'round_recap') setAnalysisTarget(null);
  }, [wf.gamePhase]);
  const allFallacies = logicalFallaciesData.logicalFallacies as LogicalFallacy[];
  const fallacyById = useMemo(
    () => new Map(allFallacies.map((fallacy) => [fallacy.id, fallacy])),
    [allFallacies],
  );

  // -----------------------------------------------------------------------
  // Modal + fallacy-guess state
  // -----------------------------------------------------------------------
  const [analysisTarget, setAnalysisTarget] = useState<AnalysisTarget | null>(null);

  const currentPlayerRoundNumber = useMemo(() => {
    if (
      wf.gamePhase === 'player_choosing' ||
      wf.gamePhase === 'player_confirming' ||
      wf.gamePhase === 'npc_responding'
    ) {
      return wf.currentRound?.roundNumber ?? null;
    }
    return null;
  }, [wf.gamePhase, wf.currentRound]);

  const analysisStatementTargetId = useMemo(() => {
    if (!analysisTarget || analysisTarget.kind === 'player') return null;
    return analysisTarget.kind === 'npc' ? analysisTarget.round.id : analysisTarget.statement.id;
  }, [analysisTarget]);

  const activeSession = useMemo((): FallacyGuessSession | null => {
    if (!analysisStatementTargetId) return null;
    for (const sess of fallacyGuesses.values()) {
      if (sess.npcRoundId === analysisStatementTargetId) return sess;
    }
    return null;
  }, [analysisStatementTargetId, fallacyGuesses]);

  const canGuess = useMemo(() => {
    if (currentPlayerRoundNumber === null || !analysisStatementTargetId) return false;
    const sess = fallacyGuesses.get(currentPlayerRoundNumber);
    if (!sess) return true;
    if (sess.npcRoundId !== analysisStatementTargetId) return true;
    if (isSessionTerminal(sess)) return false;
    return sess.attempts.length < sess.maxAttempts;
  }, [currentPlayerRoundNumber, analysisStatementTargetId, fallacyGuesses]);

  const getNpcGuessState = useCallback(
    (npcRoundId: string): 'correct' | 'partial' | 'wrong' | null => {
      for (const sess of fallacyGuesses.values()) {
        if (sess.npcRoundId !== npcRoundId) continue;
        return guessStateFromAttempts(sess.attempts);
      }
      return null;
    },
    [fallacyGuesses],
  );

  const handleGuess = (payload: GuessPayload) => {
    if (!analysisTarget || analysisTarget.kind === 'player') return;
    if (currentPlayerRoundNumber === null) return;

    const sentences: Sentence[] =
      analysisTarget.kind === 'npc'
        ? analysisTarget.round.statement.sentences
        : analysisTarget.statement.sentences;
    const targetId =
      analysisTarget.kind === 'npc' ? analysisTarget.round.id : analysisTarget.statement.id;

    let record: GuessRecord;

    if (payload.type === 'no_fallacies') {
      const correct = sentences.every((s) => s.logicalFallacies.length === 0);
      const seen = new Set<string>();
      const actualFallacies = sentences
        .flatMap((s) => s.logicalFallacies)
        .map((f) => fallacyById.get(f.id))
        .filter((f): f is LogicalFallacy => {
          if (!f) return false;
          if (seen.has(f.id)) return false;
          seen.add(f.id);
          return true;
        });
      record = {
        kind: 'no_fallacies',
        npcRoundId: targetId,
        correct,
        actualFallacies,
      };
    } else {
      const picks = payload.picks;
      if (picks.length === 0) return;

      const truth = truthMultisetFromSentences(sentences);
      const guess = guessMultisetFromPicks(picks);
      const missedPairs = computeMissedPairs(sentences, truth, guess, fallacyById);

      let outcome: 'perfect' | 'partial' | 'none';
      if (multisetsEqual(truth, guess)) {
        outcome = 'perfect';
      } else if (hasCorrectPairOverlap(truth, guess)) {
        outcome = 'partial';
      } else {
        outcome = 'none';
      }

      record = {
        kind: 'multi',
        npcRoundId: targetId,
        picks,
        outcome,
        missedPairs,
      };
    }

    setFallacyGuesses((prev) => {
      const next = new Map(prev);
      const existing = prev.get(currentPlayerRoundNumber);
      let session: FallacyGuessSession;

      if (!existing || existing.npcRoundId !== targetId) {
        session = {
          npcRoundId: targetId,
          maxAttempts: DEFAULT_MAX_ANALYSIS_ATTEMPTS,
          attempts: [record],
        };
      } else {
        session = {
          ...existing,
          attempts: [...existing.attempts, record],
        };
      }
      next.set(currentPlayerRoundNumber, session);
      return next;
    });
  };

  // -----------------------------------------------------------------------
  // Footer action state
  // -----------------------------------------------------------------------
  const interactiveFooter = useMemo(() => {
    let submitLabel = 'Continue';
    let submitDisabled = true;
    let onSubmit: (() => void) | undefined;

    switch (wf.gamePhase) {
      case 'npc_speaking':
      case 'npc_responding':
        submitLabel = 'Continue';
        submitDisabled = false;
        onSubmit = () => wf.dispatch({ type: 'continue' });
        break;
      case 'player_confirming':
        submitLabel = 'Confirm';
        submitDisabled = false;
        onSubmit = () => wf.dispatch({ type: 'confirm_option' });
        break;
      default:
        submitDisabled = true;
    }

    return { submitLabel, submitDisabled, onSubmit };
  }, [wf.gamePhase, wf.dispatch]);

  const modalSpeakerName = useMemo(() => {
    if (!analysisTarget) return '';
    if (analysisTarget.kind === 'npc')
      return getSpeakerName(debate, analysisTarget.round.speakerId);
    if (analysisTarget.kind === 'opponent_prompt' || analysisTarget.kind === 'opponent_response')
      return getSpeakerName(debate, analysisTarget.statement.speakerId);
    return '';
  }, [analysisTarget, debate]);

  const revealLockedOption = useCallback((optionId: string) => {
    setRevealedLockedOptionIds((prev) => new Set(prev).add(optionId));
  }, []);

  return (
    <div style={{ height: '100%', minHeight: 0, width: '100%' }}>
      <TrialLayout
        feedback={
          <FeedbackPanel
            wf={wf}
            debate={debate}
            fallacyGuesses={fallacyGuesses}
            revealedLockedOptionIds={revealedLockedOptionIds}
            onOpenAnalysis={setAnalysisTarget}
            getNpcGuessState={getNpcGuessState}
          />
        }
        wizard={<WizardPanel wizardMessage={wf.wizardMessage} />}
        interactive={
          <InteractivePanel
            key={debate.id}
            wf={wf}
            debate={debate}
            fallacyGuesses={fallacyGuesses}
            revealedLockedOptionIds={revealedLockedOptionIds}
            onRevealLockedOption={revealLockedOption}
            interactiveFooter={interactiveFooter}
            onOpenAnalysis={setAnalysisTarget}
            getNpcGuessState={getNpcGuessState}
          />
        }
      />
      {analysisTarget && (
        <RoundAnalysisModal
          target={analysisTarget}
          allFallacies={allFallacies}
          fallacyById={fallacyById}
          speakerName={modalSpeakerName}
          canGuess={canGuess}
          guessSession={activeSession}
          onGuess={handleGuess}
          onClose={() => setAnalysisTarget(null)}
        />
      )}
      {wf.gamePhase === 'round_recap' && (
        <RoundRecapModal
          debate={debate}
          wf={wf}
          fallacyGuesses={fallacyGuesses}
          revealedLockedOptionIds={revealedLockedOptionIds}
          onClose={() => wf.dispatch({ type: 'continue' })}
        />
      )}
    </div>
  );
};

export default TrialUI;
