import React, { useEffect, useMemo } from 'react';
import type { DebateScenarioJson } from '../../../types/debateEntities';
import type { useTrialRoundWorkflow } from '../../hooks/useTrialRoundWorkflow';
import type { FallacyGuessSession } from '../utils/fallacyGuessTypes';
import ScrollFadeContainer from '../components/ScrollFadeContainer';
import TrialTextButton from '../components/TrialTextButton';
import {
  canRunTutorialTargetAction,
  notifyTutorialTargetAction,
} from '../../tutorial/tutorialInteractionGuard';
import { debateEventBus } from '../utils/debateEventBus';
import { isPlayerOptionUnlocked, resolvedOptionSentences } from '../utils/optionUnlock';
import {
  getSpeakerName,
  moderatorOpinionEmoji,
  statementText,
  statementTypeLabel,
} from '../utils/trialHelpers';
import { ModeratorOpinionInline } from '../utils/ModeratorOpinionInline';
import cn from 'classnames';
import shared from '../trialShared.module.scss';
import styles from './RoundRecapModal.module.scss';
import getLabel from '../../../data/labels';

type Wf = ReturnType<typeof useTrialRoundWorkflow>;

interface RoundRecapModalProps {
  debate: DebateScenarioJson;
  wf: Wf;
  fallacyGuesses: Map<number, FallacyGuessSession>;
  revealedLockedOptionIds: Set<string>;
  onClose: () => void;
}

const RoundRecapModal: React.FC<RoundRecapModalProps> = ({
  debate,
  wf,
  fallacyGuesses,
  revealedLockedOptionIds,
  onClose,
}) => {
  const round = wf.currentRound;
  const chosen = wf.selectedOption;
  const lastCompleted = wf.completedRounds[wf.completedRounds.length - 1] ?? null;

  // Fire `round:recap:open` once when the modal mounts, `round:recap:close` on unmount.
  // Using mount / unmount (driven by TrialUI's `gamePhase === 'round_recap'` gate) keeps the
  // open/close pair balanced even if the player closes via the backdrop, the X button, or
  // Continue — all routes unmount the component.
  useEffect(() => {
    if (!round) return;
    const payload = { roundNumber: round.roundNumber, roundId: round.id };
    debateEventBus.emit('round:recap:open', payload);
    return () => {
      debateEventBus.emit('round:recap:close', payload);
    };
    // Open/close must fire exactly once per mount lifecycle of this specific recap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round?.id]);

  const choicePreview = useMemo(() => {
    if (!chosen) return '';
    const showRealCopy =
      !chosen.unlockCondition ||
      (isPlayerOptionUnlocked(chosen, fallacyGuesses) && revealedLockedOptionIds.has(chosen.id));
    return statementText(resolvedOptionSentences(chosen, showRealCopy));
  }, [chosen, fallacyGuesses, revealedLockedOptionIds]);

  const responseSpeaker = wf.activeOpponentResponse
    ? getSpeakerName(debate, wf.activeOpponentResponse.statement.speakerId)
    : '';

  const responseBody = wf.activeOpponentResponse
    ? statementText(wf.activeOpponentResponse.statement.sentences)
    : '';

  const roundHeading = round
    ? getLabel('roundHeadingWithStatementType', {
        replacements: {
          roundNumber: round.roundNumber,
          statementType: statementTypeLabel(round.type),
        },
      })
    : getLabel('roundRecap');

  // NPC round body: speaker name + statement text shown in place of "Your statement".
  const npcSpeakerName =
    round && round.kind === 'npc' ? getSpeakerName(debate, round.speakerId) : '';
  const npcStatementBody =
    round && round.kind === 'npc' ? statementText(round.statement.sentences) : '';

  // `recap` describes a completed round we can render impact for. Both player and NPC
  // rounds qualify now; the modal opens after every round (introduction excluded).
  const recap =
    round && lastCompleted
      ? round.kind === 'player' && chosen
        ? { kind: 'player' as const, round, chosen, lastCompleted }
        : round.kind === 'npc'
          ? { kind: 'npc' as const, round, lastCompleted }
          : null
      : null;

  const activeRoundImpactAriaLabel = recap
    ? `${getLabel('activeRoundImpact')}: ${
        recap.lastCompleted.impact > 0 ? '+' : ''
      }${recap.lastCompleted.impact}`
    : '';

  return (
    <div
      className={styles.recapOverlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cn(shared.trialModalFontScope, styles.recapBox)}
        role="dialog"
        aria-modal="true"
        aria-labelledby="round-recap-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.recapHeader}>
          <div>
            <h2 id="round-recap-title" className={styles.recapTitle}>
              {getLabel('roundRecap')}
            </h2>
            <p className={styles.recapSubtitle}>{roundHeading}</p>
          </div>
          <button
            type="button"
            className={styles.recapCloseBtn}
            onClick={onClose}
            aria-label={getLabel('close')}
          >
            ✕
          </button>
        </div>

        <ScrollFadeContainer isModal className={styles.recapContent}>
          {recap ? (
            <>
              {recap.kind === 'player' ? (
                <div className={styles.recapSection}>
                  <p className={styles.recapSectionLabel}>{getLabel('yourStatement')}</p>
                  <p className={styles.recapBody}>{choicePreview}</p>
                </div>
              ) : (
                <div className={styles.recapSection}>
                  <p className={styles.recapSectionLabel}>
                    {getLabel('wizardDetailSpeaks', {
                      replacements: { name: npcSpeakerName },
                    })}
                  </p>
                  <p className={styles.recapBody}>{npcStatementBody}</p>
                </div>
              )}

              {recap.kind === 'player' && responseBody ? (
                <div className={styles.recapSection}>
                  <p className={styles.recapSectionLabel}>
                    {getLabel('opponentResponseHeading', {
                      replacements: { name: responseSpeaker },
                    })}
                  </p>
                  <p className={styles.recapBody}>{responseBody}</p>
                </div>
              ) : null}

              <div className={styles.recapSection} data-tutorial-recap-section="main">
                <p className={styles.recapSectionLabel}>{getLabel('activeRoundImpact')}</p>
                <p className={styles.recapBody}>
                  <span aria-label={activeRoundImpactAriaLabel}>
                    <span aria-hidden="true">
                      {moderatorOpinionEmoji(recap.lastCompleted.impact)}
                    </span>
                  </span>
                </p>
                <p className={styles.recapSectionLabel} style={{ marginTop: '1rem' }}>
                  {getLabel('overallScore')}
                </p>
                <p className={styles.recapBody}>
                  <ModeratorOpinionInline score={wf.totalScore} />
                </p>
              </div>
            </>
          ) : (
            <p className={styles.recapBody}>{getLabel('roundComplete')}</p>
          )}
        </ScrollFadeContainer>

        <div className={styles.recapFooter}>
          <TrialTextButton
            onClick={() => {
              const target = { kind: 'round_recap_action', action: 'continue' } as const;
              // Block dismissal while a tutorial step is open unless the step has
              // `interactionMode: 'target_only'` and targets this Continue button.
              // A missing `interactionMode` field falls back to `'modal_only'` (see
              // `tutorialStore.openTutorial` / `canRunTargetAction`), so an authored
              // step without the field also blocks the click.
              if (!canRunTutorialTargetAction(target)) return;
              onClose();
              notifyTutorialTargetAction(target);
            }}
            data-tutorial-round-recap-action="continue"
          >
            {getLabel('continue')}
          </TrialTextButton>
        </div>
      </div>
    </div>
  );
};

export default RoundRecapModal;
