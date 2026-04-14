import React from 'react';

/** Solid dark gray so panels read clearly over the Phaser canvas. */
const TRIAL_PANEL_BG = '#3a3a3a';

export interface TrialLayoutProps {
  feedback: React.ReactNode;
  wizard: React.ReactNode;
  interactive: React.ReactNode;
}

/**
 * Trial overlay over the Phaser canvas:
 * - Top-left quarter: empty (pointer-events pass through to Phaser).
 * - Top row, right half: Feedback (top area only to the right of the game hole).
 * - Bottom row: Wizard 1/3 width, Interactive 2/3 width.
 *
 * Uses a 6-column × 2-row grid so halves and thirds line up with the viewport.
 */
const TrialLayout: React.FC<TrialLayoutProps> = ({ feedback, wizard, interactive }) => {
  return (
    <div className="trial-layout-grid">
      {/* Top-left quarter: game hole (cols 1–3 = 50% width, row 1 = top 50% height) */}
      <div
        className="trial-game-hole"
        aria-hidden
      />

      {/* Feedback: top row, right 50% (cols 4–6) */}
      <div
        className="trial-panel trial-feedback-panel"
        style={{ backgroundColor: TRIAL_PANEL_BG }}
      >
        <div className="trial-panel-inner">
          {feedback}
        </div>
      </div>

      {/* Wizard: bottom row, left third (cols 1–2 of 6) */}
      <div
        className="trial-panel trial-wizard-panel"
        style={{ backgroundColor: TRIAL_PANEL_BG }}
      >
        <div className="trial-panel-inner">
          {wizard}
        </div>
      </div>

      {/* Interactive: bottom row, right two-thirds (cols 3–6 of 6) */}
      <div
        className="trial-panel trial-interactive-panel"
        style={{ backgroundColor: TRIAL_PANEL_BG }}
      >
        <div className="trial-panel-inner">
          {interactive}
        </div>
      </div>
    </div>
  );
};

export default TrialLayout;
