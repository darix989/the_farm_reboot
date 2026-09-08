import React from 'react';
import cn from 'classnames';
import { useDebateLogStore } from '../../store/debateLogStore';
import { DEBATE_LOG_PANEL_ID } from './components/DebateLogToggleButton';
import { uiColor } from '../uiColor';
import styles from './TrialLayout.module.scss';

export interface TrialLayoutProps {
  stage: React.ReactNode;
  wizard: React.ReactNode;
  interactive: React.ReactNode;
  /**
   * Debate Log panel + collapsed recap chip. Grouped so callers cannot pass one without
   * the other. Omit entirely for a farm talk — the top-right cell is not rendered and
   * the farm shows through.
   */
  log?: { panel: React.ReactNode; recap: React.ReactNode };
}

/**
 * Overlay over the Phaser canvas, shared by debates and farm talks:
 * - Top row: character stage (or the farm) across the full stage width (pointer-events pass through).
 * - Top-right: the Debate Log, painting over the stage when expanded — or the recap chip
 *   when collapsed (`debateLogStore`). Omitted when `log` is not passed.
 * - Bottom row: Dialog on the left 70%, Actions on the right 30%.
 *
 * Two columns: left 70% (7fr), right 30% (3fr), two equal-height rows.
 */
const TrialLayout: React.FC<TrialLayoutProps> = ({ stage, wizard, interactive, log }) => {
  // The layout owns the branch so the grid stays the single source of truth for which cell
  // holds what. Collapsing *unmounts* the log rather than hiding it: `display: none` zeroes
  // `getBoundingClientRect`, which would leave `FeedbackPanel`'s auto-scroll measuring
  // garbage and never re-running, so re-expanding would park the log at the top instead of
  // the active round. A fresh mount runs that effect with no previous index and scrolls to
  // the current round.
  //
  // The hook is unconditional (hooks rule). Its value is ignored when `log` is absent —
  // `isExpanded` is module-global and is not reset on the farm, so a talk after an expanded
  // debate would otherwise still paint the top-right cell.
  const isDebateLogExpanded = useDebateLogStore((s) => s.isExpanded);

  return (
    <div className={styles.trialLayoutGrid}>
      <div className={styles.trialGameHole}>{stage}</div>

      {log ? (
        isDebateLogExpanded ? (
          <div
            id={DEBATE_LOG_PANEL_ID}
            className={cn(styles.trialPanel, styles.trialFeedbackPanel)}
            style={{ backgroundColor: uiColor.surfaceTrialPanel }}
          >
            <div className={styles.trialPanelInner}>{log.panel}</div>
          </div>
        ) : (
          <div className={styles.trialDebateLogRecapCell}>{log.recap}</div>
        )
      ) : null}

      {/* Dialog: bottom row, left column (70% width) */}
      <div
        className={cn(styles.trialPanel, styles.trialWizardPanel)}
        style={{ backgroundColor: uiColor.surfaceTrialPanel }}
      >
        <div className={styles.trialPanelInner}>{wizard}</div>
      </div>

      {/* Actions: bottom row, right column (30% width) */}
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
