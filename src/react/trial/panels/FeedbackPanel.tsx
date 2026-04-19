import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { DebateScenarioJson } from '../../../types/debateEntities';
import type { useTrialRoundWorkflow } from '../../hooks/useTrialRoundWorkflow';
import type { AnalysisTarget } from '../roundAnalysisModal/RoundAnalysisModal';
import ScrollFadeContainer from '../components/ScrollFadeContainer';
import DebateRoundLogCard from '../components/DebateRoundLogCard';
import IntroDebateLogCard, { INTRO_DEBATE_LOG_CARD_ID } from '../components/IntroDebateLogCard';
import { ModeratorOpinionInline } from '../utils/ModeratorOpinionInline';
import { debateTotalScoreBounds } from '../utils/trialHelpers';
import styles from './TrialPanels.module.scss';
import { uiColor } from '../../uiColor';
import getLabel from '../../../data/labels';

interface FeedbackPanelProps {
  wf: ReturnType<typeof useTrialRoundWorkflow>;
  debate: DebateScenarioJson;
  onOpenAnalysis: (target: AnalysisTarget) => void;
  getNpcGuessState: (npcRoundId: string) => 'correct' | 'partial' | 'wrong' | null;
}

/** Match `grid-template-rows` transition on `.debateLogRoundBodyShell` (+ small buffer). */
const DEBATE_LOG_BODY_TRANSITION_MS = 480;

/**
 * Leaving `debate_intro` does not change `currentRoundIndex` (still 0), but the intro card and
 * round 1 both animate; scrolling immediately measures wrong heights — wait longer than a normal
 * round-only transition.
 */
const DEBATE_LOG_LEAVE_INTRO_SCROLL_MS = 720;

function roundExpandedDefault(
  roundIndex: number,
  gamePhase: ReturnType<typeof useTrialRoundWorkflow>['gamePhase'],
  currentRoundIndex: number,
): boolean {
  if (gamePhase === 'debate_intro') return false;
  if (gamePhase === 'debate_complete') return false;
  if (roundIndex > currentRoundIndex) return false;
  if (roundIndex === currentRoundIndex) return true;
  return false;
}

const FeedbackPanel: React.FC<FeedbackPanelProps> = ({
  wf,
  debate,
  onOpenAnalysis,
  getNpcGuessState,
}) => {
  const feedbackScrollRef = useRef<HTMLDivElement>(null);
  const [expandOverrideByRoundId, setExpandOverrideByRoundId] = useState<
    Partial<Record<string, boolean>>
  >({});
  const prevRoundIndexRef = useRef(wf.currentRoundIndex);
  const prevScrollRoundIndexRef = useRef<number | null>(null);
  const prevGamePhaseRef = useRef<ReturnType<typeof useTrialRoundWorkflow>['gamePhase'] | null>(
    null,
  );
  const totalScoreBounds = useMemo(() => debateTotalScoreBounds(debate), [debate]);

  useEffect(() => {
    const container = feedbackScrollRef.current;
    if (!container) return;

    const n = wf.scenario.rounds.length;

    const prevIndex = prevScrollRoundIndexRef.current;
    const currIndex = wf.currentRoundIndex;
    const prevPhase = prevGamePhaseRef.current;
    /** After a round change, cards animate shrink/expand; wait before measuring. */
    const indexChanged = prevIndex !== null && prevIndex !== currIndex;
    /** `currentRoundIndex` often stays 0 when intro ends; still need a delay for layout. */
    const leavingIntro = prevPhase === 'debate_intro' && wf.gamePhase !== 'debate_intro';
    let delayMs = 0;
    if (indexChanged) delayMs = DEBATE_LOG_BODY_TRANSITION_MS;
    if (leavingIntro) delayMs = Math.max(delayMs, DEBATE_LOG_LEAVE_INTRO_SCROLL_MS);

    const scrollToIntro = () => {
      const introEl = container.querySelector<HTMLElement>('[data-debate-log-intro]');
      if (!introEl) {
        container.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      const padding = 12;
      const cRect = container.getBoundingClientRect();
      const chRect = introEl.getBoundingClientRect();
      const scrollDelta = chRect.top - cRect.top - padding;
      if (Math.abs(scrollDelta) < 4) return;
      container.scrollBy({ top: scrollDelta, behavior: 'smooth' });
    };

    const scrollToTarget = () => {
      if (wf.gamePhase === 'debate_intro' && wf.scenario.introduction?.trim()) {
        scrollToIntro();
        return;
      }
      if (n === 0) return;

      const targetIndex =
        wf.gamePhase === 'debate_complete' && currIndex >= n ? n - 1 : Math.min(currIndex, n - 1);

      const child = container.querySelector<HTMLElement>(
        `[data-debate-log-round-index="${targetIndex}"]`,
      );
      if (!child) return;

      const padding = 12;
      const cRect = container.getBoundingClientRect();
      const chRect = child.getBoundingClientRect();
      const scrollDelta = chRect.top - cRect.top - padding;
      if (Math.abs(scrollDelta) < 4) return;
      container.scrollBy({ top: scrollDelta, behavior: 'smooth' });
    };

    const tid = window.setTimeout(() => {
      requestAnimationFrame(scrollToTarget);
    }, delayMs);

    prevScrollRoundIndexRef.current = currIndex;
    prevGamePhaseRef.current = wf.gamePhase;

    return () => window.clearTimeout(tid);
  }, [wf.currentRoundIndex, wf.gamePhase, wf.scenario.introduction, wf.scenario.rounds.length]);

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
        <h2 className={styles.trialPanelHeading}>{getLabel('debateLog')}</h2>
        <p
          className={styles.trialDebateLogTitleScore}
          style={{ margin: 0, color: uiColor.textBody }}
        >
          <ModeratorOpinionInline
            score={wf.totalScore}
            min={totalScoreBounds.min}
            max={totalScoreBounds.max}
          />
        </p>
      </div>

      <ScrollFadeContainer scrollRef={feedbackScrollRef} className={styles.trialFeedbackScroll}>
        <div className={styles.debateLogRoundList}>
          {wf.scenario.introduction?.trim() && (
            <IntroDebateLogCard
              wf={wf}
              introductionText={wf.scenario.introduction.trim()}
              expandOverride={expandOverrideByRoundId[INTRO_DEBATE_LOG_CARD_ID]}
              onExpandToggle={() => {
                setExpandOverrideByRoundId((prev) => {
                  const o = prev[INTRO_DEBATE_LOG_CARD_ID];
                  const def = wf.gamePhase === 'debate_intro';
                  const current = o ?? def;
                  return { ...prev, [INTRO_DEBATE_LOG_CARD_ID]: !current };
                });
              }}
            />
          )}
          {wf.scenario.rounds.map((round, roundIndex) => {
            const expandOverride = expandOverrideByRoundId[round.id];

            return (
              <DebateRoundLogCard
                key={round.id}
                debate={debate}
                round={round}
                roundIndex={roundIndex}
                wf={wf}
                expandOverride={expandOverride}
                onExpandToggle={() => {
                  if (wf.gamePhase === 'debate_intro') return;
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
