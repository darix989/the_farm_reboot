import React, { useId } from 'react';
import cn from 'classnames';
import type { useTrialRoundWorkflow } from '../../hooks/useTrialRoundWorkflow';
import styles from '../panels/TrialPanels.module.scss';
import { uiColor } from '../../uiColor';
import getLabel from '../../../data/labels';

type Wf = ReturnType<typeof useTrialRoundWorkflow>;

export const INTRO_DEBATE_LOG_CARD_ID = '__intro';

type IntroStatus = 'active' | 'completed';

function introStatus(wf: Wf): IntroStatus {
  return wf.gamePhase === 'debate_intro' ? 'active' : 'completed';
}

interface IntroDebateLogCardProps {
  wf: Wf;
  introductionText: string;
  expandOverride: boolean | undefined;
  onExpandToggle: () => void;
}

/**
 * Debate log row for the scenario introduction — same shell as {@link DebateRoundLogCard}
 * (round number 00, Moderator / Introduction labels, status + expand only).
 */
const IntroDebateLogCard: React.FC<IntroDebateLogCardProps> = ({
  wf,
  introductionText,
  expandOverride,
  onExpandToggle,
}) => {
  const bodyId = useId();
  const status = introStatus(wf);
  const defaultExpanded = status === 'active';
  const effectiveExpanded = expandOverride ?? defaultExpanded;

  const statusLabel = status === 'active' ? getLabel('statusActive') : getLabel('statusCompleted');

  return (
    <div className={styles.debateLogRound} data-debate-log-intro>
      <div className={styles.debateLogRoundHeader}>
        <div className={styles.debateLogRoundLead}>
          <div className={styles.debateLogRoundNumber} aria-label={getLabel('introduction')}>
            00
          </div>
          <div className={styles.debateLogRoundStack}>
            <div
              className={`${styles.debateLogRoundSideLine} ${styles.debateLogRoundSideLineModerator}`}
            >
              {getLabel('moderator')}
            </div>
            <div className={styles.debateLogRoundTypeLine}>{getLabel('introduction')}</div>
          </div>
        </div>

        <div className={styles.debateLogRoundHeaderEnd}>
          <span
            className={cn(
              status === 'active' && styles.debateLogStatusActive,
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
            aria-expanded={effectiveExpanded}
            aria-controls={bodyId}
            onClick={onExpandToggle}
            title={effectiveExpanded ? getLabel('minimize') : getLabel('expand')}
          >
            {effectiveExpanded ? '▼' : '▶'}
          </button>
        </div>
      </div>

      <div
        className={cn(
          styles.debateLogRoundBodyShell,
          effectiveExpanded && styles.debateLogRoundBodyShellExpanded,
        )}
      >
        <div className={styles.debateLogRoundBodyInner} aria-hidden={!effectiveExpanded}>
          <div id={bodyId} className={styles.debateLogRoundBody}>
            <div className={styles.debateLogStatementBlock}>
              <p style={{ marginTop: 0, color: uiColor.textMuted }}>{introductionText}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntroDebateLogCard;
