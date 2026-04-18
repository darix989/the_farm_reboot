import React, { useEffect, useRef, useState } from 'react';
import type { DebateScenarioJson } from '../../../types/debateEntities';
import type { useTrialRoundWorkflow } from '../../hooks/useTrialRoundWorkflow';
import type { AnalysisTarget } from '../roundAnalysisModal/RoundAnalysisModal';
import type { FallacyGuessSession } from '../utils/fallacyGuessTypes';
import ScrollFadeContainer from '../components/ScrollFadeContainer';
import DebateRoundLogCard from '../components/DebateRoundLogCard';
import { scoreColor } from '../utils/trialHelpers';
import styles from './TrialPanels.module.scss';
import shared from '../trialShared.module.scss';
import { uiFont } from '../../uiFont';
import { uiColor } from '../../uiColor';

interface FeedbackPanelProps {
  wf: ReturnType<typeof useTrialRoundWorkflow>;
  debate: DebateScenarioJson;
  fallacyGuesses: Map<number, FallacyGuessSession>;
  revealedLockedOptionIds: Set<string>;
  onOpenAnalysis: (target: AnalysisTarget) => void;
  getNpcGuessState: (npcRoundId: string) => 'correct' | 'partial' | 'wrong' | null;
}

function roundExpandedDefault(
  roundIndex: number,
  gamePhase: ReturnType<typeof useTrialRoundWorkflow>['gamePhase'],
  currentRoundIndex: number,
): boolean {
  if (gamePhase === 'debate_complete') return false;
  if (roundIndex > currentRoundIndex) return false;
  if (roundIndex === currentRoundIndex) return true;
  return false;
}

const FeedbackPanel: React.FC<FeedbackPanelProps> = ({
  wf,
  debate,
  fallacyGuesses,
  revealedLockedOptionIds,
  onOpenAnalysis,
  getNpcGuessState,
}) => {
  const feedbackScrollRef = useRef<HTMLDivElement>(null);
  const [expandOverrideByRoundId, setExpandOverrideByRoundId] = useState<
    Partial<Record<string, boolean>>
  >({});
  const prevRoundIndexRef = useRef(wf.currentRoundIndex);

  useEffect(() => {
    const el = feedbackScrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [wf.currentRoundIndex]);

  useEffect(() => {
    if (wf.currentRoundIndex === prevRoundIndexRef.current) return;
    const previousIndex = prevRoundIndexRef.current;
    prevRoundIndexRef.current = wf.currentRoundIndex;
    const leftRound = wf.scenario.rounds[previousIndex];
    if (!leftRound) return;
    setExpandOverrideByRoundId((prev) => {
      const next = { ...prev };
      delete next[leftRound.id];
      return next;
    });
  }, [wf.currentRoundIndex, wf.scenario.rounds]);

  return (
    <div className={styles.trialPanelContent}>
      <div className={styles.trialAreaTitle}>
        <h2 className={styles.trialPanelHeading}>Debate Log</h2>
      </div>

      <ScrollFadeContainer scrollRef={feedbackScrollRef} className={styles.trialFeedbackScroll}>
        {wf.scenario.introduction && (
          <div
            className={shared.trialSectionBox}
            style={{ fontSize: uiFont.body, lineHeight: 1.375, color: uiColor.textSecondary }}
          >
            <p style={{ color: uiColor.textHint }}>Introduction</p>
            <p style={{ marginTop: '0.5rem', color: uiColor.textEmphasis }}>
              {wf.scenario.introduction}
            </p>
          </div>
        )}

        <div className={shared.trialSectionBox}>
          <p style={{ fontSize: uiFont.body, lineHeight: 1.375, color: uiColor.textBody }}>
            <span style={{ color: uiColor.textHint }}>Score </span>
            <span style={{ color: scoreColor(wf.totalScore) }}>
              {wf.totalScore > 0 ? '+' : ''}
              {wf.totalScore}
            </span>
            <span
              style={{
                marginLeft: '0.75rem',
                fontSize: uiFont.subtitle,
                color: uiColor.textDisabled,
              }}
            >
              / {wf.maxPossibleScore}
            </span>
          </p>
        </div>

        <div className={styles.debateLogRoundList}>
          {wf.scenario.rounds.map((round, roundIndex) => {
            const expandOverride = expandOverrideByRoundId[round.id];

            return (
              <DebateRoundLogCard
                key={round.id}
                debate={debate}
                round={round}
                roundIndex={roundIndex}
                wf={wf}
                fallacyGuesses={fallacyGuesses}
                revealedLockedOptionIds={revealedLockedOptionIds}
                expandOverride={expandOverride}
                onExpandToggle={() => {
                  const isUpcoming =
                    wf.gamePhase !== 'debate_complete' && roundIndex > wf.currentRoundIndex;
                  if (isUpcoming) return;
                  setExpandOverrideByRoundId((prev) => {
                    const o = prev[round.id];
                    const def = roundExpandedDefault(
                      roundIndex,
                      wf.gamePhase,
                      wf.currentRoundIndex,
                    );
                    const current = o ?? def;
                    return { ...prev, [round.id]: !current };
                  });
                }}
                getNpcGuessState={getNpcGuessState}
                onOpenAnalysis={onOpenAnalysis}
              />
            );
          })}
        </div>
      </ScrollFadeContainer>
    </div>
  );
};

export default FeedbackPanel;
