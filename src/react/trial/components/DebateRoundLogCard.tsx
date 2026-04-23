import React, { useId } from 'react';
import cn from 'classnames';
import type { DebateScenarioJson } from '../../../types/debateEntities';
import type { useTrialRoundWorkflow } from '../../hooks/useTrialRoundWorkflow';
import type { AnalysisTarget } from '../roundAnalysisModal/RoundAnalysisModal';
import AnalyzeButton from './AnalyzeButton';
import {
  getSpeakerName,
  MODERATOR_OPINION_LABEL,
  moderatorOpinionEmoji,
  sideDisplayLabel,
  sideForRoundHeader,
  sideForStatementSpeaker,
  statementText,
  statementTypeLabel,
} from '../utils/trialHelpers';
import { resolvedOptionSentences } from '../utils/optionUnlock';
import { debateEventBus } from '../utils/debateEventBus';
import styles from '../panels/TrialPanels.module.scss';
import { uiColor } from '../../uiColor';
import getLabel from '../../../data/labels';

type Wf = ReturnType<typeof useTrialRoundWorkflow>;

interface DebateRoundLogCardProps {
  debate: DebateScenarioJson;
  round: DebateScenarioJson['rounds'][number];
  roundIndex: number;
  wf: Wf;
  /** When set, overrides default expand (active = expanded, else minimized). */
  expandOverride: boolean | undefined;
  onExpandToggle: () => void;
  getNpcGuessState: (npcRoundId: string) => 'correct' | 'partial' | 'wrong' | null;
  onOpenAnalysis: (target: AnalysisTarget) => void;
}

type DebateRoundStatus = 'active' | 'upcoming' | 'completed';

function roundStatus(
  roundIndex: number,
  gamePhase: Wf['gamePhase'],
  currentRoundIndex: number,
): DebateRoundStatus {
  if (gamePhase === 'debate_complete') return 'completed';
  if (gamePhase === 'debate_intro') return 'upcoming';
  if (roundIndex === currentRoundIndex) return 'active';
  if (roundIndex > currentRoundIndex) return 'upcoming';
  return 'completed';
}

const DebateRoundLogCard: React.FC<DebateRoundLogCardProps> = ({
  debate,
  round,
  roundIndex,
  wf,
  expandOverride,
  onExpandToggle,
  getNpcGuessState,
  onOpenAnalysis,
}) => {
  const bodyId = useId();
  const status = roundStatus(roundIndex, wf.gamePhase, wf.currentRoundIndex);
  const isUpcoming = status === 'upcoming';

  const defaultExpanded = status === 'active';
  const effectiveExpanded = isUpcoming ? false : (expandOverride ?? defaultExpanded);

  const headerSide = sideForRoundHeader(debate, round);
  const sideLineClass =
    headerSide === 'proposition'
      ? styles.debateLogRoundSideLineProp
      : styles.debateLogRoundSideLineOpp;

  /** "· YOU" only when this player round opens with the player's line (not NPC-led crossfire). */
  const showSideYouOnRoundBadge = round.kind === 'player' && !round.opponentPrompt;

  const stackedSideLabel =
    round.kind === 'player'
      ? `${sideDisplayLabel(headerSide).toUpperCase()}${showSideYouOnRoundBadge ? getLabel('sideYouSuffix') : ''}`
      : sideDisplayLabel(headerSide).toUpperCase();

  const isThisPlayerRound = wf.currentPlayerRound?.id === round.id && round.kind === 'player';

  const completedForRound = wf.completedRounds.find((c) => c.roundId === round.id);

  const chosenOption =
    round.kind === 'player'
      ? completedForRound
        ? (round.options.find((o) => o.id === completedForRound.optionId) ?? null)
        : null
      : null;

  const showOpponentPrompt =
    round.kind === 'player' &&
    round.opponentPrompt &&
    (roundIndex < wf.currentRoundIndex ||
      wf.gamePhase === 'debate_complete' ||
      (isThisPlayerRound &&
        (wf.gamePhase === 'player_choosing' ||
          wf.gamePhase === 'player_confirming' ||
          wf.gamePhase === 'npc_responding' ||
          wf.gamePhase === 'round_recap')));

  const showPlayerStatement =
    round.kind === 'player' &&
    chosenOption &&
    (roundIndex < wf.currentRoundIndex ||
      wf.gamePhase === 'debate_complete' ||
      (isThisPlayerRound && (wf.gamePhase === 'npc_responding' || wf.gamePhase === 'round_recap')));

  const responseForCompleted =
    round.kind === 'player' && completedForRound && round.opponentResponses
      ? (round.opponentResponses.find((r) => r.forOptionId === completedForRound.optionId) ?? null)
      : null;

  const showOpponentResponse =
    round.kind === 'player' &&
    (responseForCompleted ||
      (isThisPlayerRound &&
        (wf.gamePhase === 'npc_responding' || wf.gamePhase === 'round_recap') &&
        wf.activeOpponentResponse));

  const activeResponse =
    isThisPlayerRound && (wf.gamePhase === 'npc_responding' || wf.gamePhase === 'round_recap')
      ? wf.activeOpponentResponse
      : null;
  const displayResponse = activeResponse ?? responseForCompleted;

  const statusLabel =
    status === 'active'
      ? getLabel('statusActive')
      : status === 'upcoming'
        ? getLabel('statusUpcoming')
        : getLabel('statusCompleted');

  const showPromptAnalyze = round.kind === 'player' && !!round.opponentPrompt && showOpponentPrompt;

  const showResponseAnalyze = round.kind === 'player' && !!displayResponse && showOpponentResponse;

  /** Hide impact emoji until this player round is over (advanced or debate finished). */
  const playerRoundEndedForLog =
    roundIndex < wf.currentRoundIndex ||
    wf.gamePhase === 'debate_complete' ||
    (isThisPlayerRound && wf.gamePhase === 'round_recap');

  const impactEmojiLine =
    round.kind === 'player' && chosenOption && playerRoundEndedForLog && completedForRound ? (
      <span
        aria-label={`${MODERATOR_OPINION_LABEL}: ${
          completedForRound.impact > 0 ? '+' : ''
        }${completedForRound.impact}`}
      >
        <span aria-hidden="true">{moderatorOpinionEmoji(completedForRound.impact)}</span>
      </span>
    ) : null;

  const playerBodyText =
    chosenOption && round.kind === 'player'
      ? statementText(resolvedOptionSentences(chosenOption, true))
      : '';

  const roundNumDisplay = String(round.roundNumber).padStart(2, '0');

  return (
    <div className={styles.debateLogRound} data-debate-log-round-index={roundIndex}>
      <div className={styles.debateLogRoundHeader}>
        <div className={styles.debateLogRoundLead}>
          <div
            className={styles.debateLogRoundNumber}
            aria-label={getLabel('roundAria', {
              replacements: { roundNumber: round.roundNumber },
            })}
          >
            {roundNumDisplay}
          </div>
          <div className={styles.debateLogRoundStack}>
            <div className={`${styles.debateLogRoundSideLine} ${sideLineClass}`}>
              {stackedSideLabel}
            </div>
            <div className={styles.debateLogRoundTypeLine}>{statementTypeLabel(round.type)}</div>
          </div>
        </div>

        <div className={styles.debateLogRoundHeaderEnd}>
          <span
            className={cn(
              status === 'active' && styles.debateLogStatusActive,
              status === 'upcoming' && styles.debateLogStatusUpcoming,
              status === 'completed' && styles.debateLogStatusCompleted,
            )}
          >
            <span className={cn(status === 'active' && styles.debateLogStatusActivePulse)}>
              {statusLabel}
            </span>
          </span>
          <button
            type="button"
            className={styles.debateLogExpandBtn}
            aria-expanded={!isUpcoming && effectiveExpanded}
            aria-controls={bodyId}
            disabled={isUpcoming}
            data-debate-log-toggle-expand-round-id={round.id}
            onClick={() => {
              // `effectiveExpanded` reflects the state before the toggle fires, so the
              // event we emit is the *intended transition*: if it is currently expanded
              // the click will shrink it, and vice versa.
              if (!isUpcoming) {
                debateEventBus.emit(
                  effectiveExpanded ? 'debate_log:round:shrink' : 'debate_log:round:expand',
                  { roundNumber: round.roundNumber, roundId: round.id },
                );
              }
              onExpandToggle();
            }}
            title={
              isUpcoming
                ? getLabel('notAvailableUntilRoundStarts')
                : effectiveExpanded
                  ? getLabel('minimize')
                  : getLabel('expand')
            }
          >
            {effectiveExpanded && !isUpcoming ? '▼' : '▶'}
          </button>
        </div>
      </div>

      {!isUpcoming && (
        <div
          className={cn(
            styles.debateLogRoundBodyShell,
            effectiveExpanded && styles.debateLogRoundBodyShellExpanded,
          )}
        >
          <div className={styles.debateLogRoundBodyInner} aria-hidden={!effectiveExpanded}>
            <div id={bodyId} className={styles.debateLogRoundBody}>
              {round.kind === 'npc' && (
                <div className={styles.debateLogStatementBlock}>
                  <div className={styles.debateLogStatementHeaderRow}>
                    <p style={{ color: uiColor.textCaption, margin: 0 }}>
                      {getSpeakerName(debate, round.speakerId)} —{' '}
                      {sideDisplayLabel(sideForStatementSpeaker(debate, round.speakerId))}
                    </p>
                    <div
                      className={styles.debateLogAnalyzeGroup}
                      aria-label={getLabel('analyzeStatementGroupAria')}
                    >
                      <AnalyzeButton
                        guessState={getNpcGuessState(round.id)}
                        title={getLabel('analyzeThisStatement')}
                        dataRoundId={round.id}
                        onClick={() => {
                          debateEventBus.emit('debate_log:round:analyze', {
                            roundNumber: round.roundNumber,
                            roundId: round.id,
                          });
                          onOpenAnalysis({ kind: 'npc', round });
                        }}
                      />
                    </div>
                  </div>
                  <p style={{ marginTop: '0.25rem', color: uiColor.textMuted }}>
                    {statementText(round.statement.sentences)}
                  </p>
                </div>
              )}

              {round.kind === 'player' && showOpponentPrompt && round.opponentPrompt && (
                <div className={styles.debateLogStatementBlock}>
                  <div className={styles.debateLogStatementHeaderRow}>
                    <p style={{ color: uiColor.textCaption, margin: 0 }}>
                      {getLabel('roundHeader', {
                        replacements: { roundNumber: round.roundNumber },
                      })}
                      {getLabel('debaterQuestion', {
                        replacements: {
                          name: getSpeakerName(debate, round.opponentPrompt.speakerId),
                        },
                      })}
                    </p>
                    {showPromptAnalyze && (
                      <div
                        className={styles.debateLogAnalyzeGroup}
                        aria-label={getLabel('analyzeQuestionGroupAria')}
                      >
                        <AnalyzeButton
                          guessState={getNpcGuessState(round.opponentPrompt.id)}
                          title={getLabel('analyzeThisQuestion')}
                          dataRoundId={round.id}
                          onClick={() => {
                            debateEventBus.emit('debate_log:round:analyze', {
                              roundNumber: round.roundNumber,
                              roundId: round.id,
                            });
                            onOpenAnalysis({
                              kind: 'opponent_prompt',
                              statement: round.opponentPrompt!,
                              playerRound: round,
                            });
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <p style={{ marginTop: '0.25rem', color: uiColor.textMuted }}>
                    {statementText(round.opponentPrompt.sentences)}
                  </p>
                </div>
              )}

              {round.kind === 'player' && showPlayerStatement && chosenOption && (
                <div className={styles.debateLogStatementBlock}>
                  <div className={styles.debateLogStatementHeaderRow}>
                    <p style={{ color: uiColor.textCaption, margin: 0 }}>
                      {getLabel('roundHeader', {
                        replacements: {
                          roundNumber: completedForRound?.roundNumber ?? round.roundNumber,
                        },
                      })}
                      {getLabel('you')}
                      {impactEmojiLine != null ? <> — {impactEmojiLine}</> : null}
                    </p>
                    <div
                      className={styles.debateLogAnalyzeGroup}
                      aria-label={getLabel('analyzeYourLineGroupAria')}
                    >
                      <AnalyzeButton
                        guessState={getNpcGuessState(chosenOption.id)}
                        title={getLabel('analyzeThisStatement')}
                        dataRoundId={round.id}
                        onClick={() => {
                          debateEventBus.emit('debate_log:round:analyze', {
                            roundNumber: round.roundNumber,
                            roundId: round.id,
                          });
                          onOpenAnalysis({
                            kind: 'player',
                            round,
                            chosenOption: chosenOption!,
                          });
                        }}
                      />
                    </div>
                  </div>
                  <p style={{ marginTop: '0.25rem', color: uiColor.textMuted }}>{playerBodyText}</p>
                </div>
              )}

              {round.kind === 'player' && showOpponentResponse && displayResponse && (
                <div className={styles.debateLogStatementBlock}>
                  <div className={styles.debateLogStatementHeaderRow}>
                    <p style={{ color: uiColor.textCaption, margin: 0 }}>
                      {getLabel('roundHeader', {
                        replacements: {
                          roundNumber: completedForRound?.roundNumber ?? round.roundNumber,
                        },
                      })}
                      {getLabel('responds', {
                        replacements: {
                          name: getSpeakerName(debate, displayResponse.statement.speakerId),
                        },
                      })}
                    </p>
                    {showResponseAnalyze && (
                      <div
                        className={styles.debateLogAnalyzeGroup}
                        aria-label={getLabel('analyzeResponseGroupAria')}
                      >
                        <AnalyzeButton
                          guessState={getNpcGuessState(displayResponse.statement.id)}
                          title={getLabel('analyzeThisResponse')}
                          dataRoundId={round.id}
                          onClick={() => {
                            debateEventBus.emit('debate_log:round:analyze', {
                              roundNumber: round.roundNumber,
                              roundId: round.id,
                            });
                            onOpenAnalysis({
                              kind: 'opponent_response',
                              statement: displayResponse.statement,
                              playerRound: round,
                            });
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <p style={{ marginTop: '0.25rem', color: uiColor.textMuted }}>
                    {statementText(displayResponse.statement.sentences)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isUpcoming && (
        <p className={styles.debateLogMinPreview} style={{ color: uiColor.textHint }}>
          {getLabel('roundNotStartedYet')}
        </p>
      )}
    </div>
  );
};

export default DebateRoundLogCard;
