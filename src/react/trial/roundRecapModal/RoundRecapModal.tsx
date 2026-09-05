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
  qualityColor,
  qualityLabel,
  recapText,
  statementText,
  statementTypeLabel,
} from '../utils/trialHelpers';
import type { ResolvedMechanics } from '../utils/scenarioMechanics';
import { ModeratorOpinionInline } from '../utils/ModeratorOpinionInline';
import cn from 'classnames';
import shared from '../trialShared.module.scss';
import styles from './RoundRecapModal.module.scss';
import getLabel from '../../../data/labels';

type Wf = ReturnType<typeof useTrialRoundWorkflow>;

/**
 * A recap paragraph is clamped to two lines (`RECAP_SUMMARY_MAX_LINES`) only when it is
 * showing an authored summary. Scenarios that have none fall back to the spoken line, and
 * clamping that would hide half of what was said.
 */
function recapBodyClass(block: { isSummary: boolean } | null): string {
  return cn(styles.recapBody, block?.isSummary && styles.recapSummaryBody);
}

interface RoundRecapModalProps {
  debate: DebateScenarioJson;
  wf: Wf;
  fallacyGuesses: Map<number, FallacyGuessSession>;
  revealedLockedOptionIds: Set<string>;
  onClose: () => void;
  /** Scenario mode flags — gate the impact row and the choice assessment block. */
  mechanics: ResolvedMechanics;
}

const RoundRecapModal: React.FC<RoundRecapModalProps> = ({
  debate,
  wf,
  fallacyGuesses,
  revealedLockedOptionIds,
  onClose,
  mechanics,
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
    if (!chosen) return recapText(undefined, '');
    const showRealCopy =
      !chosen.unlockCondition ||
      (isPlayerOptionUnlocked(chosen, fallacyGuesses) && revealedLockedOptionIds.has(chosen.id));
    const spoken = statementText(resolvedOptionSentences(chosen, showRealCopy));
    // `summary` paraphrases the *unlocked* line, so a still-locked option keeps showing
    // its placeholder copy rather than leaking what the real line says.
    return recapText(showRealCopy ? chosen.summary : undefined, spoken);
  }, [chosen, fallacyGuesses, revealedLockedOptionIds]);

  const responseSpeaker = wf.activeOpponentResponse
    ? getSpeakerName(debate, wf.activeOpponentResponse.statement.speakerId)
    : '';

  const responseBody = wf.activeOpponentResponse
    ? recapText(
        wf.activeOpponentResponse.statement.summary,
        statementText(wf.activeOpponentResponse.statement.sentences),
      )
    : null;

  const currentPlayerRound = round?.kind === 'player' ? round : null;
  const opponentPromptStatement = currentPlayerRound?.opponentPrompt;
  const crossfirePromptSpeaker = opponentPromptStatement
    ? getSpeakerName(debate, opponentPromptStatement.speakerId)
    : '';
  const crossfirePromptBody = opponentPromptStatement
    ? recapText(opponentPromptStatement.summary, statementText(opponentPromptStatement.sentences))
    : null;

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
    round && round.kind === 'npc'
      ? recapText(round.statement.summary, statementText(round.statement.sentences))
      : null;

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

  const playerRecapContributionLabel =
    recap?.kind === 'player'
      ? recap.round.opponentPrompt
        ? getLabel('roundRecapYourAnswer')
        : recap.round.opponentResponses
          ? getLabel('roundRecapYourQuestion')
          : getLabel('yourStatement')
      : getLabel('yourStatement');

  const opponentReplyRecapLabel =
    recap?.kind === 'player' && recap.round.opponentResponses && responseSpeaker
      ? getLabel('responds', { replacements: { name: responseSpeaker } })
      : responseSpeaker
        ? getLabel('opponentResponseHeading', { replacements: { name: responseSpeaker } })
        : '';

  /**
   * The coach's verdict on the line just spoken. With `analysisEnabled: false` the
   * option's `reason` is otherwise unreachable, so speaking-only scenarios would give
   * the player no feedback at all.
   */
  const choiceAssessment =
    mechanics.revealChoiceAssessment && round?.kind === 'player' && chosen
      ? { quality: chosen.quality, reason: chosen.reason }
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
                <>
                  {opponentPromptStatement ? (
                    <div className={styles.recapSection}>
                      <p className={styles.recapSectionLabel}>
                        {getLabel('debaterQuestion', {
                          replacements: { name: crossfirePromptSpeaker },
                        })}
                      </p>
                      <p className={recapBodyClass(crossfirePromptBody)}>
                        {crossfirePromptBody?.text}
                      </p>
                    </div>
                  ) : null}
                  <div className={styles.recapSection}>
                    <p className={styles.recapSectionLabel}>{playerRecapContributionLabel}</p>
                    <p className={recapBodyClass(choicePreview)}>{choicePreview.text}</p>
                  </div>
                </>
              ) : (
                <div className={styles.recapSection}>
                  <p className={styles.recapSectionLabel}>
                    {getLabel('wizardDetailSpeaks', {
                      replacements: { name: npcSpeakerName },
                    })}
                  </p>
                  <p className={recapBodyClass(npcStatementBody)}>{npcStatementBody?.text}</p>
                </div>
              )}

              {recap.kind === 'player' && responseBody?.text && opponentReplyRecapLabel ? (
                <div className={styles.recapSection}>
                  <p className={styles.recapSectionLabel}>{opponentReplyRecapLabel}</p>
                  <p className={recapBodyClass(responseBody)}>{responseBody.text}</p>
                </div>
              ) : null}

              {choiceAssessment ? (
                <div className={styles.recapSection}>
                  <p className={styles.recapSectionLabel}>{getLabel('assessment')}</p>
                  <p
                    className={styles.recapBody}
                    style={{
                      color: qualityColor(choiceAssessment.quality, mechanics.targetQuality),
                    }}
                  >
                    {qualityLabel(choiceAssessment.quality)}
                  </p>
                  {choiceAssessment.reason ? (
                    <p className={styles.recapBody}>{choiceAssessment.reason}</p>
                  ) : null}
                </div>
              ) : null}

              {mechanics.showModeratorOpinion ? (
                <div className={styles.recapSection} data-tutorial-recap-section="main">
                  <div className={styles.recapScoreRow}>
                    <div className={styles.recapScoreColumn}>
                      <p className={styles.recapSectionLabel}>{getLabel('activeRoundImpact')}</p>
                      <p className={cn(styles.recapBody, styles.recapScoreEmoji)}>
                        <span aria-label={activeRoundImpactAriaLabel}>
                          <span aria-hidden="true">
                            {moderatorOpinionEmoji(recap.lastCompleted.impact)}
                          </span>
                        </span>
                      </p>
                    </div>
                    <div className={styles.recapScoreColumn}>
                      <p className={styles.recapSectionLabel}>{getLabel('overallScore')}</p>
                      <p className={cn(styles.recapBody, styles.recapScoreEmoji)}>
                        <ModeratorOpinionInline score={wf.totalScore} />
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
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
