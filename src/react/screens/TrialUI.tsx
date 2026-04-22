import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTutorialStore } from '../../store/tutorialStore';
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
import WizardPanel, { type WizardPanelDetail } from '../trial/panels/WizardPanel';
import InteractivePanel from '../trial/panels/InteractivePanel';
import RoundRecapModal from '../trial/roundRecapModal/RoundRecapModal';
import IntroSummaryModal from '../trial/introSummaryModal/IntroSummaryModal';
import {
  getSpeakerName,
  moderatorOpinionPlainText,
  statementText,
} from '../trial/utils/trialHelpers';
import { isPlayerOptionUnlocked, resolvedOptionSentences } from '../trial/utils/optionUnlock';
import {
  debateEventBus,
  useDebateEvent,
  type AnalysisTargetKind,
} from '../trial/utils/debateEventBus';
import { useScenarioTutorials } from '../hooks/useScenarioTutorials';
import getLabel from '../../data/labels';

interface TrialUIProps {
  debate: DebateScenarioJson;
}

const TrialUI: React.FC<TrialUIProps> = ({ debate }) => {
  const [fallacyGuesses, setFallacyGuesses] = useState<Map<number, FallacyGuessSession>>(new Map());
  const [revealedLockedOptionIds, setRevealedLockedOptionIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [introSummaryOpen, setIntroSummaryOpen] = useState(false);
  const wf = useTrialRoundWorkflow(debate, fallacyGuesses, revealedLockedOptionIds);

  // Opens scenario-defined tutorial overlays in response to bus events,
  // including the onboarding overlay wired to `introduction:start`.
  useScenarioTutorials(debate.tutorials);

  // While any tutorial overlay is visible, we gate the `debate_intro` Continue
  // button and hide the intro body in the wizard panel — the same treatment the
  // legacy `introTutorial` field used to get.
  const isTutorialOpen = useTutorialStore((s) => s.isOpen);

  useEffect(() => {
    setIntroSummaryOpen(false);
    useTutorialStore.getState().resetTutorial();
  }, [debate.id]);

  // Emit `introduction:start` once per scenario when we enter `debate_intro`.
  // `useScenarioTutorials` listens for this and opens any tutorial entry whose
  // `trigger.event === 'introduction:start'` matches.
  useEffect(() => {
    if (wf.gamePhase !== 'debate_intro') return;
    debateEventBus.emit('introduction:start', { debateId: debate.id });
  }, [wf.gamePhase, debate.id]);

  useEffect(() => {
    setRevealedLockedOptionIds(new Set());
  }, [wf.currentPlayerRound?.id]);

  const allFallacies = logicalFallaciesData.logicalFallacies as LogicalFallacy[];
  const fallacyById = useMemo(
    () => new Map(allFallacies.map((fallacy) => [fallacy.id, fallacy])),
    [allFallacies],
  );

  // -----------------------------------------------------------------------
  // Modal + fallacy-guess state
  // -----------------------------------------------------------------------
  const [analysisTarget, setAnalysisTarget] = useState<AnalysisTarget | null>(null);

  /**
   * Map key for in-progress fallacy sessions. Matches `currentRound.roundNumber` whenever the
   * player can react to the debate (including `npc_speaking`, so analysis opens as soon as the
   * opponent line appears in the log — not only after advancing the round).
   */
  const fallacyGuessBucketRoundNumber = useMemo(() => {
    if (
      wf.gamePhase === 'npc_speaking' ||
      wf.gamePhase === 'player_choosing' ||
      wf.gamePhase === 'player_confirming' ||
      wf.gamePhase === 'npc_responding' ||
      wf.gamePhase === 'round_recap'
    ) {
      return wf.currentRound?.roundNumber ?? null;
    }
    return null;
  }, [wf.gamePhase, wf.currentRound]);

  const analysisStatementTargetId = useMemo(() => {
    if (!analysisTarget) return null;
    if (analysisTarget.kind === 'player') return analysisTarget.chosenOption.id;
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
    if (fallacyGuessBucketRoundNumber === null || !analysisStatementTargetId) return false;

    if (
      wf.gamePhase === 'npc_speaking' &&
      wf.currentNpcRound &&
      analysisTarget &&
      analysisTarget.kind === 'npc' &&
      analysisTarget.round.id !== wf.currentNpcRound.id
    ) {
      return false;
    }

    const sess = fallacyGuesses.get(fallacyGuessBucketRoundNumber);
    if (!sess) return true;
    if (sess.npcRoundId !== analysisStatementTargetId) return true;
    if (isSessionTerminal(sess)) return false;
    return sess.attempts.length < sess.maxAttempts;
  }, [
    fallacyGuessBucketRoundNumber,
    analysisStatementTargetId,
    analysisTarget,
    wf.gamePhase,
    wf.currentNpcRound,
    fallacyGuesses,
  ]);

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
    if (!analysisTarget) return;
    if (fallacyGuessBucketRoundNumber === null) return;

    if (analysisTarget.kind !== 'player') {
      if (
        wf.gamePhase === 'npc_speaking' &&
        wf.currentNpcRound &&
        analysisTarget.kind === 'npc' &&
        analysisTarget.round.id !== wf.currentNpcRound.id
      ) {
        return;
      }
    }

    let sentences: Sentence[];
    let targetId: string;
    if (analysisTarget.kind === 'player') {
      sentences = resolvedOptionSentences(analysisTarget.chosenOption, true);
      targetId = analysisTarget.chosenOption.id;
    } else if (analysisTarget.kind === 'npc') {
      sentences = analysisTarget.round.statement.sentences;
      targetId = analysisTarget.round.id;
    } else {
      sentences = analysisTarget.statement.sentences;
      targetId = analysisTarget.statement.id;
    }

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
      const existing = prev.get(fallacyGuessBucketRoundNumber);
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
      next.set(fallacyGuessBucketRoundNumber, session);

      // ---- Fire analysis:* events for this guess attempt --------------------
      const targetKind: AnalysisTargetKind = analysisTarget.kind;
      const roundNumberForEvent =
        analysisTarget.kind === 'opponent_prompt' || analysisTarget.kind === 'opponent_response'
          ? analysisTarget.playerRound.roundNumber
          : analysisTarget.round.roundNumber;

      debateEventBus.emit('analysis:guess_submitted', {
        targetId,
        targetKind,
        roundNumber: roundNumberForEvent,
        payload,
      });

      const attemptsUsed = session.attempts.length;
      const maxAttempts = session.maxAttempts;
      const outcomePayload = {
        targetId,
        targetKind,
        roundNumber: roundNumberForEvent,
        record,
        attemptsUsed,
        maxAttempts,
      };

      const isCorrect =
        record.kind === 'no_fallacies' ? record.correct : record.outcome === 'perfect';
      const isPartial = record.kind === 'multi' && record.outcome === 'partial';

      if (isCorrect) {
        debateEventBus.emit('analysis:guess_correct', outcomePayload);
      } else if (isPartial) {
        debateEventBus.emit('analysis:guess_partially_correct', outcomePayload);
      } else {
        debateEventBus.emit('analysis:guess_incorrect', outcomePayload);
      }

      // Terminal success (correct) doesn't count as "max attempts reached" — only emit
      // when the player exhausted attempts without landing a perfect / correct guess.
      if (!isCorrect && attemptsUsed >= maxAttempts) {
        debateEventBus.emit('analysis:guess_max_attempts_reached', {
          targetId,
          targetKind,
          roundNumber: roundNumberForEvent,
          attemptsUsed,
          maxAttempts,
        });
      }

      return next;
    });
  };

  // -----------------------------------------------------------------------
  // Footer action state
  // -----------------------------------------------------------------------
  const interactiveFooter = useMemo(() => {
    let submitLabel = getLabel('continue');
    let submitDisabled = true;
    let onSubmit: (() => void) | undefined;

    const currentRoundNumber = wf.currentRound?.roundNumber ?? null;

    switch (wf.gamePhase) {
      case 'debate_intro': {
        const introGated = isTutorialOpen;
        submitLabel = getLabel('continue');
        submitDisabled = introGated;
        onSubmit = introGated
          ? undefined
          : () => {
              debateEventBus.emit('interactive:continue', {
                fromPhase: 'debate_intro',
                roundNumber: null,
              });
              setIntroSummaryOpen(true);
            };
        break;
      }
      case 'npc_speaking':
      case 'npc_responding':
        submitLabel = getLabel('continue');
        submitDisabled = false;
        onSubmit = () => {
          debateEventBus.emit('interactive:continue', {
            fromPhase: wf.gamePhase,
            roundNumber: currentRoundNumber,
          });
          wf.dispatch({ type: 'continue' });
        };
        break;
      case 'player_choosing':
        submitLabel = getLabel('continue');
        submitDisabled = !wf.selectedOption;
        onSubmit = () => {
          const option = wf.selectedOption;
          const round = wf.currentPlayerRound;
          if (option && round) {
            debateEventBus.emit('interactive:confirm', {
              roundNumber: round.roundNumber,
              roundId: round.id,
              optionId: option.id,
            });
          }
          wf.dispatch({ type: 'confirm_option' });
        };
        break;
      case 'player_confirming':
        submitLabel = getLabel('confirm');
        submitDisabled = false;
        onSubmit = () => {
          const option = wf.selectedOption;
          const round = wf.currentPlayerRound;
          if (option && round) {
            debateEventBus.emit('interactive:confirm', {
              roundNumber: round.roundNumber,
              roundId: round.id,
              optionId: option.id,
            });
          }
          wf.dispatch({ type: 'confirm_option' });
        };
        break;
      default:
        submitDisabled = true;
    }

    return { submitLabel, submitDisabled, onSubmit };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- wf.gamePhase + wf.dispatch cover footer behavior; setIntroSummaryOpen is stable
  }, [
    wf.gamePhase,
    wf.dispatch,
    wf.selectedOption,
    wf.currentRound,
    wf.currentPlayerRound,
    isTutorialOpen,
  ]);

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

  const wizardDetail = useMemo((): WizardPanelDetail | null => {
    switch (wf.gamePhase) {
      case 'debate_intro': {
        const intro = debate.introduction?.trim();
        if (!intro) return null;
        if (isTutorialOpen) {
          return null;
        }
        return { title: getLabel('wizardDetailIntroduction'), body: intro };
      }
      case 'npc_speaking': {
        const npc = wf.currentNpcRound;
        if (!npc) return null;
        return {
          title: getLabel('wizardDetailSpeaks', {
            replacements: {
              name: getSpeakerName(debate, npc.speakerId),
            },
          }),
          body: statementText(npc.statement.sentences),
        };
      }
      case 'player_choosing': {
        const opt = wf.selectedOption;
        if (!opt) return null;
        const showResolved = !opt.unlockCondition || isPlayerOptionUnlocked(opt, fallacyGuesses);
        return {
          title: getLabel('wizardDetailSelectedStatement'),
          body: statementText(resolvedOptionSentences(opt, showResolved)),
        };
      }
      case 'player_confirming': {
        const opt = wf.selectedOption;
        if (!opt) return null;
        const showResolved = !opt.unlockCondition || isPlayerOptionUnlocked(opt, fallacyGuesses);
        return {
          title: getLabel('wizardDetailYourChoice'),
          body: statementText(resolvedOptionSentences(opt, showResolved)),
        };
      }
      case 'npc_responding': {
        const response = wf.activeOpponentResponse;
        const playerRound = wf.currentPlayerRound;
        if (!response || !playerRound) return null;
        return {
          title: getLabel('wizardDetailResponse', {
            replacements: {
              name: getSpeakerName(debate, response.statement.speakerId),
            },
          }),
          body: statementText(response.statement.sentences),
        };
      }
      case 'round_recap': {
        const response = wf.activeOpponentResponse;
        const playerRound = wf.currentPlayerRound;
        if (response && playerRound) {
          return {
            title: getLabel('wizardDetailResponse', {
              replacements: {
                name: getSpeakerName(debate, response.statement.speakerId),
              },
            }),
            body: statementText(response.statement.sentences),
          };
        }
        return {
          title: getLabel('roundRecap'),
          body: getLabel('wizardDetailRoundRecapBody'),
        };
      }
      case 'debate_complete':
        return {
          title: getLabel('debateFinished'),
          body: moderatorOpinionPlainText(wf.totalScore),
        };
      default:
        return null;
    }
  }, [
    wf.gamePhase,
    wf.currentNpcRound,
    wf.selectedOption,
    wf.activeOpponentResponse,
    wf.currentPlayerRound,
    wf.totalScore,
    debate,
    fallacyGuesses,
    isTutorialOpen,
  ]);

  return (
    <div style={{ height: '100%', minHeight: 0, width: '100%' }}>
      <TrialLayout
        feedback={
          <FeedbackPanel
            wf={wf}
            debate={debate}
            onOpenAnalysis={setAnalysisTarget}
            getNpcGuessState={getNpcGuessState}
          />
        }
        wizard={<WizardPanel wizardMessage={wf.wizardMessage} detail={wizardDetail} />}
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
          availableLogicalFallacies={debate.availableLogicalFallacies}
          fallacyById={fallacyById}
          speakerName={modalSpeakerName}
          canGuess={canGuess}
          guessSession={activeSession}
          onGuess={handleGuess}
          onClose={() => setAnalysisTarget(null)}
        />
      )}
      {introSummaryOpen && wf.gamePhase === 'debate_intro' && (
        <IntroSummaryModal
          debate={debate}
          onClose={() => {
            setIntroSummaryOpen(false);
            wf.dispatch({ type: 'continue' });
          }}
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
