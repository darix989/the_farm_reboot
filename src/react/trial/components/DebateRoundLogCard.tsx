import React, { useId } from 'react';
import cn from 'classnames';
import type { DebateScenarioJson, PlayerOption } from '../../../types/debateEntities';
import type { useTrialRoundWorkflow } from '../../hooks/useTrialRoundWorkflow';
import type { AnalysisTarget } from '../roundAnalysisModal/RoundAnalysisModal';
import type { FallacyGuessSession } from '../utils/fallacyGuessTypes';
import AnalyzeButton from './AnalyzeButton';
import {
  getSpeakerName,
  qualityColor,
  qualityLabel,
  scoreColor,
  sideDisplayLabel,
  sideForRoundHeader,
  sideForStatementSpeaker,
  statementText,
  statementTypeLabel,
} from '../utils/trialHelpers';
import { isPlayerOptionUnlocked, resolvedOptionSentences } from '../utils/optionUnlock';
import styles from '../panels/TrialPanels.module.scss';
import { uiColor } from '../../uiColor';

type Wf = ReturnType<typeof useTrialRoundWorkflow>;

interface DebateRoundLogCardProps {
  debate: DebateScenarioJson;
  round: DebateScenarioJson['rounds'][number];
  roundIndex: number;
  wf: Wf;
  fallacyGuesses: Map<number, FallacyGuessSession>;
  revealedLockedOptionIds: Set<string>;
  /** When set, overrides default expand (active = expanded, else minimized). */
  expandOverride: boolean | undefined;
  onExpandToggle: () => void;
  getNpcGuessState: (npcRoundId: string) => 'correct' | 'partial' | 'wrong' | null;
  onOpenAnalysis: (target: AnalysisTarget) => void;
}

function showRealPlayerOptionCopy(
  opt: PlayerOption,
  fallacyGuesses: Map<number, FallacyGuessSession>,
  revealedLockedOptionIds: Set<string>,
): boolean {
  const guessUnlocked = !opt.unlockCondition || isPlayerOptionUnlocked(opt, fallacyGuesses);
  return !opt.unlockCondition || (guessUnlocked && revealedLockedOptionIds.has(opt.id));
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
  fallacyGuesses,
  revealedLockedOptionIds,
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

  const stackedSideLabel =
    round.kind === 'player'
      ? `${sideDisplayLabel(headerSide).toUpperCase()} · YOU`
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
    status === 'active' ? 'active' : status === 'upcoming' ? 'upcoming' : 'completed';

  const showPromptAnalyze = round.kind === 'player' && !!round.opponentPrompt && showOpponentPrompt;

  const showResponseAnalyze = round.kind === 'player' && !!displayResponse && showOpponentResponse;

  /** Hide quality / score until this player round is over (advanced or debate finished). */
  const playerRoundEndedForLog =
    roundIndex < wf.currentRoundIndex ||
    wf.gamePhase === 'debate_complete' ||
    (isThisPlayerRound && wf.gamePhase === 'round_recap');

  const impactLine =
    round.kind === 'player' && chosenOption && playerRoundEndedForLog && completedForRound ? (
      <>
        <span style={{ color: qualityColor(chosenOption.quality) }}>
          {qualityLabel(chosenOption.quality)}
        </span>{' '}
        <span style={{ color: scoreColor(completedForRound.impact) }}>
          ({completedForRound.impact > 0 ? '+' : ''}
          {completedForRound.impact})
        </span>
      </>
    ) : null;

  const optionUnlocked =
    chosenOption && round.kind === 'player'
      ? showRealPlayerOptionCopy(chosenOption, fallacyGuesses, revealedLockedOptionIds)
      : false;

  const playerBodyText =
    chosenOption && round.kind === 'player'
      ? statementText(resolvedOptionSentences(chosenOption, optionUnlocked))
      : '';

  const roundNumDisplay = String(round.roundNumber).padStart(2, '0');

  return (
    <div className={styles.debateLogRound} data-debate-log-round-index={roundIndex}>
      <div className={styles.debateLogRoundHeader}>
        <div className={styles.debateLogRoundLead}>
          <div className={styles.debateLogRoundNumber} aria-label={`Round ${round.roundNumber}`}>
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
            onClick={onExpandToggle}
            title={
              isUpcoming
                ? 'Not available until this round starts'
                : effectiveExpanded
                  ? 'Minimize'
                  : 'Expand'
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
                    <div className={styles.debateLogAnalyzeGroup} aria-label="Analyze statement">
                      <AnalyzeButton
                        guessState={getNpcGuessState(round.id)}
                        title="Analyze this statement"
                        onClick={() => onOpenAnalysis({ kind: 'npc', round })}
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
                      Round {round.roundNumber} —{' '}
                      {`${getSpeakerName(debate, round.opponentPrompt.speakerId)}'s question`}
                    </p>
                    {showPromptAnalyze && (
                      <div className={styles.debateLogAnalyzeGroup} aria-label="Analyze question">
                        <AnalyzeButton
                          guessState={getNpcGuessState(round.opponentPrompt.id)}
                          title="Analyze this question"
                          onClick={() =>
                            onOpenAnalysis({
                              kind: 'opponent_prompt',
                              statement: round.opponentPrompt!,
                              playerRound: round,
                            })
                          }
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
                      Round {completedForRound?.roundNumber ?? round.roundNumber} — You
                      {impactLine != null ? <> — {impactLine}</> : null}
                    </p>
                    <div className={styles.debateLogAnalyzeGroup} aria-label="Analyze your line">
                      <AnalyzeButton
                        guessState={getNpcGuessState(chosenOption.id)}
                        title="Analyze this statement"
                        onClick={() =>
                          onOpenAnalysis({
                            kind: 'player',
                            round,
                            chosenOption: chosenOption!,
                          })
                        }
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
                      Round {completedForRound?.roundNumber ?? round.roundNumber} —{' '}
                      {getSpeakerName(debate, displayResponse.statement.speakerId)} responds
                    </p>
                    {showResponseAnalyze && (
                      <div className={styles.debateLogAnalyzeGroup} aria-label="Analyze response">
                        <AnalyzeButton
                          guessState={getNpcGuessState(displayResponse.statement.id)}
                          title="Analyze this response"
                          onClick={() =>
                            onOpenAnalysis({
                              kind: 'opponent_response',
                              statement: displayResponse.statement,
                              playerRound: round,
                            })
                          }
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
          This round has not started yet.
        </p>
      )}
    </div>
  );
};

export default DebateRoundLogCard;
