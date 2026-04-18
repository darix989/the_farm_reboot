import React, { useId } from 'react';
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
        : isThisPlayerRound &&
            wf.selectedOption &&
            (wf.gamePhase === 'player_confirming' || wf.gamePhase === 'npc_responding')
          ? wf.selectedOption
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
          wf.gamePhase === 'npc_responding')));

  const showPlayerStatement =
    round.kind === 'player' &&
    chosenOption &&
    (roundIndex < wf.currentRoundIndex ||
      wf.gamePhase === 'debate_complete' ||
      (isThisPlayerRound &&
        (wf.gamePhase === 'player_confirming' || wf.gamePhase === 'npc_responding')));

  const responseForCompleted =
    round.kind === 'player' && completedForRound && round.opponentResponses
      ? (round.opponentResponses.find((r) => r.forOptionId === completedForRound.optionId) ?? null)
      : null;

  const showOpponentResponse =
    round.kind === 'player' &&
    (responseForCompleted ||
      (isThisPlayerRound && wf.gamePhase === 'npc_responding' && wf.activeOpponentResponse));

  const activeResponse =
    isThisPlayerRound && wf.gamePhase === 'npc_responding' ? wf.activeOpponentResponse : null;
  const displayResponse = activeResponse ?? responseForCompleted;

  const statusLabel =
    status === 'active' ? 'active' : status === 'upcoming' ? 'upcoming' : 'completed';

  const analyzeNpc =
    round.kind === 'npc' && !isUpcoming ? (
      <AnalyzeButton
        key="npc"
        guessState={getNpcGuessState(round.id)}
        onClick={() => onOpenAnalysis({ kind: 'npc', round })}
      />
    ) : null;

  const promptAnalyze =
    round.kind === 'player' && round.opponentPrompt && showOpponentPrompt && !isUpcoming ? (
      <AnalyzeButton
        key="prompt"
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
    ) : null;

  const playerAnalyze =
    round.kind === 'player' && chosenOption && showPlayerStatement ? (
      <AnalyzeButton
        key="player"
        onClick={() =>
          onOpenAnalysis({
            kind: 'player',
            round,
            chosenOption: chosenOption!,
          })
        }
      />
    ) : null;

  const responseAnalyze =
    round.kind === 'player' && displayResponse && showOpponentResponse && !isUpcoming ? (
      <AnalyzeButton
        key="response"
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
    ) : null;

  const analyzeRow = [analyzeNpc, promptAnalyze, playerAnalyze, responseAnalyze].filter(
    Boolean,
  ) as React.ReactElement[];

  const impactLine =
    round.kind === 'player' && chosenOption ? (
      completedForRound ? (
        <>
          <span style={{ color: qualityColor(chosenOption.quality) }}>
            {qualityLabel(chosenOption.quality)}
          </span>{' '}
          <span style={{ color: scoreColor(completedForRound.impact) }}>
            ({completedForRound.impact > 0 ? '+' : ''}
            {completedForRound.impact})
          </span>
        </>
      ) : (
        <span style={{ color: qualityColor(chosenOption.quality) }}>
          {qualityLabel(chosenOption.quality)}
        </span>
      )
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
    <div className={styles.debateLogRound}>
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
          {analyzeRow.length > 0 && (
            <div className={styles.debateLogAnalyzeGroup} aria-label="Analyze statements">
              {analyzeRow}
            </div>
          )}
          <span
            className={
              status === 'active'
                ? styles.debateLogStatusActive
                : status === 'upcoming'
                  ? styles.debateLogStatusUpcoming
                  : styles.debateLogStatusCompleted
            }
          >
            {statusLabel}
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

      {effectiveExpanded && !isUpcoming && (
        <div id={bodyId} className={styles.debateLogRoundBody}>
          {round.kind === 'npc' && (
            <div className={styles.debateLogStatementBlock}>
              <p style={{ color: uiColor.textCaption }}>
                {getSpeakerName(debate, round.speakerId)} —{' '}
                {sideDisplayLabel(sideForStatementSpeaker(debate, round.speakerId))}
              </p>
              <p style={{ marginTop: '0.25rem', color: uiColor.textMuted }}>
                {statementText(round.statement.sentences)}
              </p>
            </div>
          )}

          {round.kind === 'player' && showOpponentPrompt && round.opponentPrompt && (
            <div className={styles.debateLogStatementBlock}>
              <p style={{ color: uiColor.textCaption }}>
                Round {round.roundNumber} —{' '}
                {`${getSpeakerName(debate, round.opponentPrompt.speakerId)}'s question`}
              </p>
              <p style={{ marginTop: '0.25rem', color: uiColor.textMuted }}>
                {statementText(round.opponentPrompt.sentences)}
              </p>
            </div>
          )}

          {round.kind === 'player' && showPlayerStatement && chosenOption && (
            <div className={styles.debateLogStatementBlock}>
              <p style={{ color: uiColor.textCaption }}>
                Round {completedForRound?.roundNumber ?? round.roundNumber} — You — {impactLine}
              </p>
              <p style={{ marginTop: '0.25rem', color: uiColor.textMuted }}>{playerBodyText}</p>
            </div>
          )}

          {round.kind === 'player' && showOpponentResponse && displayResponse && (
            <div className={styles.debateLogStatementBlock}>
              <p style={{ color: uiColor.textCaption }}>
                Round {completedForRound?.roundNumber ?? round.roundNumber} —{' '}
                {getSpeakerName(debate, displayResponse.statement.speakerId)} responds
              </p>
              <p style={{ marginTop: '0.25rem', color: uiColor.textMuted }}>
                {statementText(displayResponse.statement.sentences)}
              </p>
            </div>
          )}
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
