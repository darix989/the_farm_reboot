import React from 'react';
import cn from 'classnames';
import { uiColor } from '../uiColor';
import styles from './TrialLayout.module.scss';

export interface TrialLayoutProps {
  feedback: React.ReactNode;
  wizard: React.ReactNode;
  interactive: React.ReactNode;
}

/**
 * Trial overlay over the Phaser canvas:
 * - Top-left: empty game hole (pointer-events pass through to Phaser).
 * - Top-right: Debate Log beside the game hole.
 * - Bottom row: Wizard under the hole, Interactive under the log.
 *
 * Two columns: left 60% (3fr), right 40% (2fr), two equal-height rows.
 */
const TrialLayout: React.FC<TrialLayoutProps> = ({ feedback, wizard, interactive }) => {
  return (
    <div className={styles.trialLayoutGrid}>
      {/* Top-left: game hole (60% column width, top 50% height) */}
      <div className={styles.trialGameHole} aria-hidden />

      {/* Debate Log: top row, right column (40% width) */}
      <div
        className={cn(styles.trialPanel, styles.trialFeedbackPanel)}
        style={{ backgroundColor: uiColor.surfaceTrialPanel }}
      >
        <div className={styles.trialPanelInner}>{feedback}</div>
      </div>

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
