import React, { useEffect, useRef } from 'react';
import type { DebateScenarioJson } from '../../types/debateEntities';
import type { useTrialRoundWorkflow } from './useTrialRoundWorkflow';
import type { AnalysisTarget, GuessRecord } from './RoundAnalysisModal';
import ScrollFadeContainer from './components/ScrollFadeContainer';
import HistoryEntry from './components/HistoryEntry';
import AnalyzeButton from './components/AnalyzeButton';
import {
  getSpeakerName,
  statementText,
  qualityColor,
  qualityLabel,
  scoreColor,
} from './utils/trialHelpers';
import { optionFirstLine } from './optionUnlock';
import styles from './TrialUI.module.scss';
import shared from './trialShared.module.scss';
import { uiFont } from '../uiFont';

interface FeedbackPanelProps {
  wf: ReturnType<typeof useTrialRoundWorkflow>;
  debate: DebateScenarioJson;
  fallacyGuesses: Map<number, GuessRecord>;
  onOpenAnalysis: (target: AnalysisTarget) => void;
  getNpcGuessState: (npcRoundId: string) => 'correct' | 'partial' | 'wrong' | null;
}

const FeedbackPanel: React.FC<FeedbackPanelProps> = ({
  wf,
  debate,
  fallacyGuesses,
  onOpenAnalysis,
  getNpcGuessState,
}) => {
  const feedbackScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = feedbackScrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [wf.currentRoundIndex]);

  return (
    <div className={styles.trialPanelContent}>
      <div className={styles.trialAreaTitle}>
        <h2 className={styles.trialPanelHeading}>Feedback</h2>
      </div>

      <ScrollFadeContainer scrollRef={feedbackScrollRef} className={styles.trialFeedbackScroll}>
        {wf.scenario.introduction && (
          <div
            className={shared.trialSectionBox}
            style={{ fontSize: uiFont.body, lineHeight: 1.375, color: 'rgba(255,255,255,0.80)' }}
          >
            <p style={{ color: 'rgba(255,255,255,0.50)' }}>Introduction</p>
            <p style={{ marginTop: '0.5rem', color: 'rgba(255,255,255,0.90)' }}>
              {wf.scenario.introduction}
            </p>
          </div>
        )}

        {wf.gamePhase !== 'debate_complete' && wf.currentRound && (
          <div className={shared.trialSectionBox}>
            <p
              style={{ fontSize: uiFont.body, lineHeight: 1.375, color: 'rgba(255,255,255,0.85)' }}
            >
              <span style={{ color: 'rgba(255,255,255,0.50)' }}>Round </span>
              <span style={{ color: 'rgba(255,255,255,0.90)' }}>
                {wf.currentRound.roundNumber} / {wf.totalRounds}
              </span>
              <span
                style={{
                  marginLeft: '1rem',
                  textTransform: 'capitalize',
                  color: 'rgba(255,255,255,0.50)',
                  fontSize: uiFont.body,
                }}
              >
                {wf.currentRound.type.replace(/_/g, ' ')}
              </span>
            </p>
          </div>
        )}

        <div className={shared.trialSectionBox}>
          <p style={{ fontSize: uiFont.body, lineHeight: 1.375, color: 'rgba(255,255,255,0.85)' }}>
            <span style={{ color: 'rgba(255,255,255,0.50)' }}>Score </span>
            <span style={{ color: scoreColor(wf.totalScore) }}>
              {wf.totalScore > 0 ? '+' : ''}
              {wf.totalScore}
            </span>
            <span
              style={{
                marginLeft: '0.75rem',
                fontSize: uiFont.subtitle,
                color: 'rgba(255,255,255,0.35)',
              }}
            >
              / {wf.maxPossibleScore}
            </span>
          </p>
        </div>

        {wf.currentRoundIndex > 0 && (
          <div
            className={shared.trialSectionBox}
            style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
          >
            <p style={{ color: 'rgba(255,255,255,0.50)' }}>History</p>

            {wf.scenario.rounds.slice(0, wf.currentRoundIndex).map((round) => {
              if (round.kind === 'npc') {
                return (
                  <HistoryEntry
                    key={round.id}
                    label={`Round ${round.roundNumber} — ${getSpeakerName(debate, round.speakerId)}`}
                    text={statementText(round.statement.sentences)}
                    analyzeButton={
                      <AnalyzeButton
                        guessState={getNpcGuessState(round.id)}
                        onClick={() => onOpenAnalysis({ kind: 'npc', round })}
                      />
                    }
                  />
                );
              }

              const cr = wf.completedRounds.find((c) => c.roundId === round.id);
              if (!cr) return null;
              const opt = round.options.find((o) => o.id === cr.optionId);
              if (!opt) return null;
              const response = round.opponentResponses?.find((r) => r.forOptionId === cr.optionId);

              return (
                <React.Fragment key={round.id}>
                  {round.opponentPrompt && (
                    <HistoryEntry
                      label={`Round ${round.roundNumber} — ${getSpeakerName(debate, round.opponentPrompt.speakerId)}'s question`}
                      text={statementText(round.opponentPrompt.sentences)}
                      analyzeButton={
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
                      }
                    />
                  )}

                  <HistoryEntry
                    label={
                      <>
                        Round {cr.roundNumber} — You —{' '}
                        <span style={{ color: qualityColor(opt.quality) }}>
                          {qualityLabel(opt.quality)}
                        </span>{' '}
                        <span style={{ color: scoreColor(cr.impact) }}>
                          ({cr.impact > 0 ? '+' : ''}
                          {cr.impact})
                        </span>
                      </>
                    }
                    text={optionFirstLine(opt, true)}
                    analyzeButton={
                      <AnalyzeButton
                        onClick={() =>
                          onOpenAnalysis({
                            kind: 'player',
                            round,
                            chosenOption: opt,
                          })
                        }
                      />
                    }
                  />

                  {response && (
                    <HistoryEntry
                      label={`Round ${cr.roundNumber} — ${getSpeakerName(debate, response.statement.speakerId)} responds`}
                      text={statementText(response.statement.sentences)}
                      analyzeButton={
                        <AnalyzeButton
                          guessState={getNpcGuessState(response.statement.id)}
                          title="Analyze this response"
                          onClick={() =>
                            onOpenAnalysis({
                              kind: 'opponent_response',
                              statement: response.statement,
                              playerRound: round,
                            })
                          }
                        />
                      }
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}

        {/* Live crossfire question — visible while the player is acting on the round */}
        {wf.currentPlayerRound?.opponentPrompt &&
          (wf.gamePhase === 'player_choosing' ||
            wf.gamePhase === 'player_confirming' ||
            wf.gamePhase === 'npc_responding') && (
            <div
              className={shared.trialSectionBox}
              style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
            >
              <HistoryEntry
                label={`Round ${wf.currentPlayerRound.roundNumber} — ${getSpeakerName(debate, wf.currentPlayerRound.opponentPrompt.speakerId)}'s question`}
                text={statementText(wf.currentPlayerRound.opponentPrompt.sentences)}
                analyzeButton={
                  <AnalyzeButton
                    guessState={getNpcGuessState(wf.currentPlayerRound.opponentPrompt.id)}
                    title="Analyze this question"
                    onClick={() =>
                      onOpenAnalysis({
                        kind: 'opponent_prompt',
                        statement: wf.currentPlayerRound!.opponentPrompt!,
                        playerRound: wf.currentPlayerRound!,
                      })
                    }
                  />
                }
              />
            </div>
          )}
      </ScrollFadeContainer>
    </div>
  );
};

export default FeedbackPanel;
