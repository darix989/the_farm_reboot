import React, { useMemo } from 'react';
import type { DebateScenarioJson } from '../../../types/debateEntities';
import type { useTrialRoundWorkflow } from '../../hooks/useTrialRoundWorkflow';
import type { FallacyGuessSession } from '../utils/fallacyGuessTypes';
import ScrollFadeContainer from '../components/ScrollFadeContainer';
import { isPlayerOptionUnlocked, resolvedOptionSentences } from '../utils/optionUnlock';
import {
  getSpeakerName,
  qualityColor,
  qualityLabel,
  statementText,
  statementTypeLabel,
} from '../utils/trialHelpers';
import { ModeratorOpinionInline } from '../utils/ModeratorOpinionInline';
import shared from '../trialShared.module.scss';
import cn from 'classnames';
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
      ? getLabel('roundHeadingWithStatementType', false, {
          roundNumber: round.roundNumber,
          statementType: statementTypeLabel(round.type),
        })
      : getLabel('roundRecap');

  const recap =
    round && round.kind === 'player' && chosen && lastCompleted
      ? { round, chosen, lastCompleted }
      : null;

  return (
    <div
      className={styles.recapOverlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={styles.recapBox}
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
                <p className={styles.recapBody} style={{ marginTop: '0.75rem' }}>
                  <span style={{ color: qualityColor(recap.chosen.quality) }}>
                    {qualityLabel(recap.chosen.quality)}
                  </span>
                  {' · '}
                  <span>
                    <ModeratorOpinionInline score={recap.lastCompleted.impact} />
                    {getLabel('thisRound')}
                  </span>
                </p>
              </div>

              {responseBody ? (
                <div className={styles.recapSection}>
                  <p className={styles.recapSectionLabel}>
                    {getLabel('opponentResponseHeading', false, { name: responseSpeaker })}
                  </p>
                  <p className={styles.recapBody}>{responseBody}</p>
                </div>
              ) : null}

              <div className={styles.recapSection}>
                <p className={styles.recapSectionLabel}>{getLabel('score')}</p>
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
          <button
            type="button"
            className={cn(shared.trialFooterBtn, styles.recapPrimaryBtn)}
            onClick={onClose}
          >
            {getLabel('continue')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoundRecapModal;
