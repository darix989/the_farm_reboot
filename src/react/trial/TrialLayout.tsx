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
 * - Top-left quarter: empty (pointer-events pass through to Phaser).
 * - Top row, right half: Debate Log (top area only to the right of the game hole).
 * - Bottom row: Wizard 1/3 width, Interactive 2/3 width.
 *
 * Uses a 6-column × 2-row grid so halves and thirds line up with the viewport.
 */
const TrialLayout: React.FC<TrialLayoutProps> = ({ feedback, wizard, interactive }) => {
  return (
    <div className={styles.trialLayoutGrid}>
      {/* Top-left quarter: game hole (cols 1–3 = 50% width, row 1 = top 50% height) */}
      <div className={styles.trialGameHole} aria-hidden />

      {/* Debate Log: top row, right 50% (cols 4–6) */}
      <div
        className={cn(styles.trialPanel, styles.trialFeedbackPanel)}
        style={{ backgroundColor: uiColor.surfaceTrialPanel }}
      >
        <div className={styles.trialPanelInner}>{feedback}</div>
      </div>

      {/* Wizard: bottom row, left third (cols 1–2 of 6) */}
      <div
        className={cn(styles.trialPanel, styles.trialWizardPanel)}
        style={{ backgroundColor: uiColor.surfaceTrialPanel }}
      >
        <div className={styles.trialPanelInner}>{wizard}</div>
      </div>

      {/* Interactive: bottom row, right two-thirds (cols 3–6 of 6) */}
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
