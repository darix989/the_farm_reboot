import React, { useCallback, useMemo, useState } from 'react';
import type { DebateScenarioJson, LogicalFallacy, Sentence } from '../types/debateEntities';
import logicalFallaciesData from '../data/logicalFallacies.json';
import TrialLayout from './trial/TrialLayout';
import { useTrialRoundWorkflow } from './trial/useTrialRoundWorkflow';
import RoundAnalysisModal, {
  type AnalysisTarget,
  type GuessPayload,
  type GuessRecord,
} from './trial/RoundAnalysisModal';
import FeedbackPanel from './trial/FeedbackPanel';
import WizardPanel from './trial/WizardPanel';
import InteractivePanel from './trial/InteractivePanel';
import { getSpeakerName } from './trial/utils/trialHelpers';

interface TrialUIProps {
  debate: DebateScenarioJson;
}

function pairKey(sentenceId: string, fallacyId: string): string {
  return `${sentenceId}\u001f${fallacyId}`;
}

function incrementPairCount(m: Map<string, number>, sentenceId: string, fallacyId: string) {
  const k = pairKey(sentenceId, fallacyId);
  m.set(k, (m.get(k) ?? 0) + 1);
}

function truthMultisetFromSentences(sentences: Sentence[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const s of sentences) {
    for (const f of s.logicalFallacies) {
      incrementPairCount(m, s.id, f.id);
    }
  }
  return m;
}

function guessMultisetFromPicks(
  picks: { sentenceId: string; fallacyId: string }[],
): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of picks) {
    incrementPairCount(m, p.sentenceId, p.fallacyId);
  }
  return m;
}

function multisetsEqual(a: Map<string, number>, b: Map<string, number>): boolean {
  if (a.size !== b.size) return false;
  for (const [k, v] of a) {
    if ((b.get(k) ?? 0) !== v) return false;
  }
  return true;
}

function hasCorrectPairOverlap(truth: Map<string, number>, guess: Map<string, number>): boolean {
  for (const [k, tv] of truth) {
    const gv = guess.get(k) ?? 0;
    if (tv > 0 && gv > 0) return true;
  }
  return false;
}

function computeMissedPairs(
  sentences: Sentence[],
  truth: Map<string, number>,
  guess: Map<string, number>,
  fallacyById: Map<string, LogicalFallacy>,
): { sentenceId: string; fallacy: LogicalFallacy }[] {
  const missed: { sentenceId: string; fallacy: LogicalFallacy }[] = [];
  const sentenceById = new Map(sentences.map((s) => [s.id, s]));
  for (const [k, tCount] of truth) {
    const gCount = guess.get(k) ?? 0;
    const missedCount = tCount - Math.min(tCount, gCount);
    if (missedCount <= 0) continue;
    const sep = k.indexOf('\u001f');
    if (sep < 0) continue;
    const sentenceId = k.slice(0, sep);
    const fallacyId = k.slice(sep + 1);
    const sentence = sentenceById.get(sentenceId);
    const hasFallacyInSentence = sentence?.logicalFallacies.some((x) => x.id === fallacyId);
    const f = fallacyById.get(fallacyId);
    if (!hasFallacyInSentence || !f) continue;
    for (let i = 0; i < missedCount; i++) {
      missed.push({ sentenceId, fallacy: f });
    }
  }
  return missed;
}

const TrialUI: React.FC<TrialUIProps> = ({ debate }) => {
  const wf = useTrialRoundWorkflow(debate);
  const allFallacies = logicalFallaciesData.logicalFallacies as LogicalFallacy[];
  const fallacyById = useMemo(
    () => new Map(allFallacies.map((fallacy) => [fallacy.id, fallacy])),
    [allFallacies],
  );

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
    (npcRoundId: string): 'correct' | 'partial' | 'wrong' | null => {
      for (const record of fallacyGuesses.values()) {
        if (record.npcRoundId !== npcRoundId) continue;
        if (record.kind === 'no_fallacies') return record.correct ? 'correct' : 'wrong';
        if (record.outcome === 'perfect') return 'correct';
        if (record.outcome === 'partial') return 'partial';
        return 'wrong';
      }
      return null;
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

  const handleGuess = (payload: GuessPayload) => {
    if (!analysisTarget || analysisTarget.kind === 'player') return;
    if (currentPlayerRoundNumber === null) return;

    const sentences =
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
          allFallacies={allFallacies}
          fallacyById={fallacyById}
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
