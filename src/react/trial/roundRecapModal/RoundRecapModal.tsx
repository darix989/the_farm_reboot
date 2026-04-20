import React, { useMemo } from 'react';
import type { DebateScenarioJson } from '../../../types/debateEntities';
import type { useTrialRoundWorkflow } from '../../hooks/useTrialRoundWorkflow';
import type { FallacyGuessSession } from '../utils/fallacyGuessTypes';
import ScrollFadeContainer from '../components/ScrollFadeContainer';
import TrialTextButton from '../components/TrialTextButton';
import { isPlayerOptionUnlocked, resolvedOptionSentences } from '../utils/optionUnlock';
import {
  debateTotalScoreBounds,
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

  const totalScoreBounds = useMemo(() => debateTotalScoreBounds(debate), [debate]);

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

  const roundHeading =
    round && round.kind === 'player'
      ? getLabel('roundHeadingWithStatementType', {
          replacements: {
            roundNumber: round.roundNumber,
            statementType: statementTypeLabel(round.type),
          },
        })
      : getLabel('roundRecap');

  const recap =
    round && round.kind === 'player' && chosen && lastCompleted
      ? { round, chosen, lastCompleted }
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
              <div className={styles.recapSection}>
                <p className={styles.recapSectionLabel}>{getLabel('yourStatement')}</p>
                <p className={styles.recapBody}>{choicePreview}</p>
              </div>

              {responseBody ? (
                <div className={styles.recapSection}>
                  <p className={styles.recapSectionLabel}>
                    {getLabel('opponentResponseHeading', {
                      replacements: { name: responseSpeaker },
                    })}
                  </p>
                  <p className={styles.recapBody}>{responseBody}</p>
                </div>
              ) : null}

              <div className={styles.recapSection}>
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
                  <ModeratorOpinionInline
                    score={wf.totalScore}
                    min={totalScoreBounds.min}
                    max={totalScoreBounds.max}
                  />
                </p>
              </div>
            </>
          ) : (
            <p className={styles.recapBody}>{getLabel('roundComplete')}</p>
          )}
        </ScrollFadeContainer>

        <div className={styles.recapFooter}>
          <TrialTextButton onClick={onClose}>{getLabel('continue')}</TrialTextButton>
        </div>
      </div>
    </div>
  );
};

export default RoundRecapModal;
