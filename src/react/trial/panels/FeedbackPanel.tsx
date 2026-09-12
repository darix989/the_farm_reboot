import React, { useEffect, useRef, useState } from 'react';
import type { DebateScenarioJson, LogicalFallacy, Sentence } from '../../../types/debateEntities';
import type { useTrialRoundWorkflow } from '../../hooks/useTrialRoundWorkflow';
import type { AnalysisTarget } from '../roundAnalysisModal/RoundAnalysisModal';
import type { AnalysisGuessState } from '../utils/fallacyGuessTypes';
import ScrollFadeContainer from '../components/ScrollFadeContainer';
import DebateRoundLogCard from '../components/DebateRoundLogCard';
import DebateLogToggleButton from '../components/DebateLogToggleButton';
import IntroDebateLogCard, { INTRO_DEBATE_LOG_CARD_ID } from '../components/IntroDebateLogCard';
import ModeratorOpeningLogCard, {
  MODERATOR_OPENING_LOG_CARD_ID,
} from '../components/ModeratorOpeningLogCard';
import { ModeratorOpinionInline } from '../utils/ModeratorOpinionInline';
import { activeRoundNumber } from '../utils/trialHelpers';
import { encounterLabels, type ResolvedMechanics } from '../utils/scenarioMechanics';
import { debateModeratorId, scenarioHasModeratorOpening } from '../../../data/debateCast';
import styles from './TrialPanels.module.scss';
import shared from '../trialShared.module.scss';
import { uiColor } from '../../uiColor';
import getLabel from '../../../data/labels';

interface FeedbackPanelProps {
  wf: ReturnType<typeof useTrialRoundWorkflow>;
  debate: DebateScenarioJson;
  insightPoints: number;
  onOpenAnalysis: (target: AnalysisTarget) => void;
  getNpcGuessState: (npcRoundId: string) => AnalysisGuessState | null;
  /** Fallacies correctly spotted so far in one statement, for its icon badge. */
  getSpottedFallacies: (statementId: string, sentences: Sentence[]) => LogicalFallacy[];
  /** Opens `FallacyInfoModal` describing one fallacy — passed down to each icon. */
  onOpenFallacyInfo: (fallacy: LogicalFallacy) => void;
  /** Scenario mode flags — gate the header strip and the per-round analyze buttons. */
  mechanics: ResolvedMechanics;
}

/** Match `grid-template-rows` transition on `.debateLogRoundBodyShell` (+ small buffer). */
const DEBATE_LOG_BODY_TRANSITION_MS = 480;

/**
 * Leaving `debate_intro` or `moderator_speaking` does not change `currentRoundIndex`
 * (still 0), but the next card gains its body and a card the player opened may still be
 * animating; scrolling immediately measures wrong heights — wait longer than a normal
 * round-only transition.
 */
const DEBATE_LOG_LEAVE_INTRO_SCROLL_MS = 720;

const FeedbackPanel: React.FC<FeedbackPanelProps> = ({
  wf,
  debate,
  insightPoints,
  onOpenAnalysis,
  getNpcGuessState,
  getSpottedFallacies,
  onOpenFallacyInfo,
  mechanics,
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
    const leavingModerator =
      prevPhase === 'moderator_speaking' && wf.gamePhase !== 'moderator_speaking';
    let delayMs = 0;
    if (indexChanged) delayMs = DEBATE_LOG_BODY_TRANSITION_MS;
    if (leavingIntro || leavingModerator) {
      delayMs = Math.max(delayMs, DEBATE_LOG_LEAVE_INTRO_SCROLL_MS);
    }

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

    const scrollToModeratorOpening = () => {
      const el = container.querySelector<HTMLElement>('[data-debate-log-moderator-opening]');
      if (!el) {
        scrollToIntro();
        return;
      }
      const padding = 12;
      const cRect = container.getBoundingClientRect();
      const chRect = el.getBoundingClientRect();
      const scrollDelta = chRect.top - cRect.top - padding;
      if (Math.abs(scrollDelta) < 4) return;
      container.scrollBy({ top: scrollDelta, behavior: 'smooth' });
    };

    const scrollToTarget = () => {
      if (wf.gamePhase === 'debate_intro' && wf.scenario.introduction?.trim()) {
        scrollToIntro();
        return;
      }
      if (wf.gamePhase === 'moderator_speaking') {
        scrollToModeratorOpening();
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
        <h2 className={styles.trialPanelHeading}>{getLabel(encounterLabels(debate).logTitle)}</h2>
        <div className={styles.trialAreaTitleEnd}>
          <p
            className={styles.trialDebateLogTitleScore}
            style={{ margin: 0, color: uiColor.textBody }}
          >
            <ModeratorOpinionInline
              score={wf.totalScore}
              insightPoints={mechanics.showInsightPoints ? insightPoints : undefined}
              showOpinion={mechanics.showModeratorOpinion}
              opinionClassName={shared.moderatorStatusFaceTutorialHook}
              opinionTutorialData="data-tutorial-debate-log-moderator-score"
              characterId={debateModeratorId(debate)}
              deferGlowUntilRecapClose={mechanics.showRoundRecap}
            />
          </p>
          <DebateLogToggleButton
            debate={debate}
            roundNumber={activeRoundNumber(wf.currentRoundIndex, wf.totalRounds)}
          />
        </div>
      </div>

      <ScrollFadeContainer
        scrollRef={feedbackScrollRef}
        className={styles.trialFeedbackScroll}
        // Stable hook for tutorial `artificialInteractions` that target the
        // debate log scroll container (e.g. `debate_log:scroll_to_top`).
        scrollElementDataKey="debateLogScroll"
      >
        <div className={styles.debateLogRoundList} data-tutorial-panel="debate_log">
          {wf.scenario.introduction?.trim() && (
            <IntroDebateLogCard
              wf={wf}
              introductionText={wf.scenario.introduction.trim()}
              expandOverride={expandOverrideByRoundId[INTRO_DEBATE_LOG_CARD_ID]}
              onExpandToggle={() => {
                setExpandOverrideByRoundId((prev) => {
                  // Mirrors `IntroDebateLogCard`: shrunk until the player opens it.
                  const current = prev[INTRO_DEBATE_LOG_CARD_ID] ?? false;
                  return { ...prev, [INTRO_DEBATE_LOG_CARD_ID]: !current };
                });
              }}
            />
          )}
          {scenarioHasModeratorOpening(wf.scenario) && (
            <ModeratorOpeningLogCard
              wf={wf}
              debate={debate}
              expandOverride={expandOverrideByRoundId[MODERATOR_OPENING_LOG_CARD_ID]}
              onExpandToggle={() => {
                setExpandOverrideByRoundId((prev) => {
                  const current = prev[MODERATOR_OPENING_LOG_CARD_ID] ?? false;
                  return { ...prev, [MODERATOR_OPENING_LOG_CARD_ID]: !current };
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
                  if (wf.gamePhase === 'debate_intro' || wf.gamePhase === 'moderator_speaking') {
                    return;
                  }
                  const isUpcoming =
                    wf.gamePhase !== 'debate_complete' && roundIndex > wf.currentRoundIndex;
                  if (isUpcoming) return;
                  setExpandOverrideByRoundId((prev) => {
                    // Mirrors `DebateRoundLogCard`: every round card defaults to shrunk.
                    const current = prev[round.id] ?? false;
                    return { ...prev, [round.id]: !current };
                  });
                }}
                getNpcGuessState={getNpcGuessState}
                getSpottedFallacies={getSpottedFallacies}
                onOpenFallacyInfo={onOpenFallacyInfo}
                onOpenAnalysis={onOpenAnalysis}
                mechanics={mechanics}
              />
            );
          })}
        </div>
      </ScrollFadeContainer>
    </div>
  );
};

export default FeedbackPanel;
