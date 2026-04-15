import React, { useCallback, useMemo, useState } from 'react';
import type { DebateScenarioJson } from '../types/debateEntities';
import TrialLayout from './trial/TrialLayout';
import { useTrialRoundWorkflow } from './trial/useTrialRoundWorkflow';
import RoundAnalysisModal, {
  type AnalysisTarget,
  type GuessRecord,
  NO_FALLACIES_ID,
} from './trial/RoundAnalysisModal';
import FeedbackPanel from './trial/FeedbackPanel';
import WizardPanel from './trial/WizardPanel';
import InteractivePanel from './trial/InteractivePanel';
import { getSpeakerName } from './trial/utils/trialHelpers';

interface TrialUIProps {
  debate: DebateScenarioJson;
}

const TrialUI: React.FC<TrialUIProps> = ({ debate }) => {
  const wf = useTrialRoundWorkflow(debate);

  // -----------------------------------------------------------------------
  // Modal + fallacy-guess state
  // -----------------------------------------------------------------------
  const [analysisTarget, setAnalysisTarget] = useState<AnalysisTarget | null>(null);
  const [fallacyGuesses, setFallacyGuesses] = useState<Map<number, GuessRecord>>(new Map());

  // The round number for which the player can still submit a guess.
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

  const canGuess =
    currentPlayerRoundNumber !== null && !fallacyGuesses.has(currentPlayerRoundNumber);

  const getNpcGuessState = useCallback(
    (npcRoundId: string): 'correct' | 'wrong' | null => {
      let hasWrong = false;
      for (const record of fallacyGuesses.values()) {
        if (record.npcRoundId !== npcRoundId) continue;
        if (record.correct) return 'correct';
        hasWrong = true;
      }
      return hasWrong ? 'wrong' : null;
    },
    [fallacyGuesses],
  );

  const activeGuess = useMemo((): GuessRecord | null => {
    if (!analysisTarget || analysisTarget.kind === 'player') return null;
    const targetId =
      analysisTarget.kind === 'npc' ? analysisTarget.round.id : analysisTarget.statement.id;
    for (const [, record] of fallacyGuesses) {
      if (record.npcRoundId === targetId) return record;
    }
    return null;
  }, [analysisTarget, fallacyGuesses]);

  const handleGuess = (sentenceId: string, fallacyId: string) => {
    if (!analysisTarget || analysisTarget.kind === 'player') return;
    if (currentPlayerRoundNumber === null) return;

    const sentences =
      analysisTarget.kind === 'npc'
        ? analysisTarget.round.statement.sentences
        : analysisTarget.statement.sentences;
    const targetId =
      analysisTarget.kind === 'npc' ? analysisTarget.round.id : analysisTarget.statement.id;

    let record: GuessRecord;

    if (fallacyId === NO_FALLACIES_ID) {
      const correct = sentences.every((s) => s.logicalFallacies.length === 0);
      const seen = new Set<string>();
      const allFallacies = sentences
        .flatMap((s) => s.logicalFallacies)
        .filter((f) => {
          if (seen.has(f.id)) return false;
          seen.add(f.id);
          return true;
        });
      record = {
        npcRoundId: targetId,
        sentenceId: '',
        fallacyId: NO_FALLACIES_ID,
        correct,
        actualFallacies: allFallacies,
      };
    } else {
      const sentence = sentences.find((s) => s.id === sentenceId);
      if (!sentence) return;
      const correct = sentence.logicalFallacies.some((f) => f.id === fallacyId);
      record = {
        npcRoundId: targetId,
        sentenceId,
        fallacyId,
        correct,
        actualFallacies: sentence.logicalFallacies,
      };
    }

    setFallacyGuesses((prev) => new Map(prev).set(currentPlayerRoundNumber, record));
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

  return (
    <div style={{ height: '100%', minHeight: 0, width: '100%' }}>
      <TrialLayout
        feedback={
          <FeedbackPanel
            wf={wf}
            debate={debate}
            fallacyGuesses={fallacyGuesses}
            onOpenAnalysis={setAnalysisTarget}
            getNpcGuessState={getNpcGuessState}
          />
        }
        wizard={<WizardPanel wizardMessage={wf.wizardMessage} />}
        interactive={
          <InteractivePanel
            wf={wf}
            debate={debate}
            fallacyGuesses={fallacyGuesses}
            interactiveFooter={interactiveFooter}
            onOpenAnalysis={setAnalysisTarget}
            getNpcGuessState={getNpcGuessState}
          />
        }
      />
      {analysisTarget && (
        <RoundAnalysisModal
          target={analysisTarget}
          allFallacies={debate.logicalFallacies}
          speakerName={modalSpeakerName}
          canGuess={canGuess}
          existingGuess={activeGuess}
          onGuess={handleGuess}
          onClose={() => setAnalysisTarget(null)}
        />
      )}
    </div>
  );
};

export default TrialUI;
