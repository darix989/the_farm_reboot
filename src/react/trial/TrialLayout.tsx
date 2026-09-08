import React from 'react';
import cn from 'classnames';
import { useDebateLogStore } from '../../store/debateLogStore';
import { DEBATE_LOG_PANEL_ID } from './components/DebateLogToggleButton';
import { uiColor } from '../uiColor';
import styles from './TrialLayout.module.scss';

export interface TrialLayoutProps {
  stage: React.ReactNode;
  feedback: React.ReactNode;
  wizard: React.ReactNode;
  interactive: React.ReactNode;
  /** Shown in the Debate Log's cell while the log is collapsed. */
  debateLogRecap: React.ReactNode;
}

/**
 * Trial overlay over the Phaser canvas:
 * - Top row: character stage across the full stage width (pointer-events pass through).
 * - Top-right: the Debate Log, painting over the stage when expanded — or the recap chip
 *   when collapsed (`debateLogStore`).
 * - Bottom row: Wizard on the left 60%, Interactive on the right 40%.
 *
 * Two columns: left 60% (3fr), right 40% (2fr), two equal-height rows.
 */
const TrialLayout: React.FC<TrialLayoutProps> = ({
  stage,
  feedback,
  wizard,
  interactive,
  debateLogRecap,
}) => {
  // The layout owns the branch so the grid stays the single source of truth for which cell
  // holds what. Collapsing *unmounts* the log rather than hiding it: `display: none` zeroes
  // `getBoundingClientRect`, which would leave `FeedbackPanel`'s auto-scroll measuring
  // garbage and never re-running, so re-expanding would park the log at the top instead of
  // the active round. A fresh mount runs that effect with no previous index and scrolls to
  // the current round.
  const isDebateLogExpanded = useDebateLogStore((s) => s.isExpanded);

  return (
    <div className={styles.trialLayoutGrid}>
      <div className={styles.trialGameHole}>{stage}</div>

      {/* Debate Log: top row, right column (40% width), over the full-width game hole */}
      {isDebateLogExpanded ? (
        <div
          id={DEBATE_LOG_PANEL_ID}
          className={cn(styles.trialPanel, styles.trialFeedbackPanel)}
          style={{ backgroundColor: uiColor.surfaceTrialPanel }}
        >
          <div className={styles.trialPanelInner}>{feedback}</div>
        </div>
      ) : (
        <div className={styles.trialDebateLogRecapCell}>{debateLogRecap}</div>
      )}

      {/* Wizard: bottom row, left column (60% width) */}
      <div
        className={cn(styles.trialPanel, styles.trialWizardPanel)}
        style={{ backgroundColor: uiColor.surfaceTrialPanel }}
      >
        <div className={styles.trialPanelInner}>{wizard}</div>
      </div>

      {/* Interactive: bottom row, right column (40% width) */}
      <div
        className={cn(styles.trialPanel, styles.trialInteractivePanel)}
        style={{ backgroundColor: uiColor.surfaceTrialPanel }}
      >
        <div className={styles.trialPanelInner}>{interactive}</div>
      </div>
    </div>
  );
};

export default TrialLayout;
