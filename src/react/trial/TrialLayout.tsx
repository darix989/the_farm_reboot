import React from 'react';

/** Solid dark gray so panels read clearly over the Phaser canvas (Tailwind `neutral-900` was too close to black). */
const TRIAL_PANEL_BG = '#3a3a3a';

export interface TrialLayoutProps {
  feedback: React.ReactNode;
  wizard: React.ReactNode;
  interactive: React.ReactNode;
}

/**
 * Trial overlay over the Phaser canvas:
 * - Top-left quarter: empty (pointer-events pass through to Phaser).
 * - Top row, right half: Feedback (plan: top area only to the right of the game hole).
 * - Bottom row: Wizard 1/3 width, Interactive 2/3 width.
 *
 * Uses a 6-column × 2-row grid so halves and thirds line up with the viewport.
 */
const TrialLayout: React.FC<TrialLayoutProps> = ({ feedback, wizard, interactive }) => {
  return (
    <div className="grid h-full min-h-0 w-full grid-cols-6 grid-rows-2 items-stretch pointer-events-none">
      {/* Top-left quarter: game hole (cols 1–3 = 50% width, row 1 = top 50% height) */}
      <div
        className="col-span-3 row-start-1 min-h-0 pointer-events-none"
        aria-hidden
      />

      {/* Feedback: top row, right 50% (cols 4–6); aligns with “except TL quarter” */}
      <div
        className="col-span-3 row-start-1 box-border flex h-full min-h-0 min-w-0 flex-col rounded-lg border-2 border-white/35 p-5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] pointer-events-auto md:p-6"
        style={{ backgroundColor: TRIAL_PANEL_BG }}
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col rounded-md border border-white/20 bg-black/25 p-4 md:p-5">
          {feedback}
        </div>
      </div>

      {/* Wizard: bottom row, left third (cols 1–2 of 6) */}
      <div
        className="col-span-2 row-start-2 box-border flex h-full min-h-0 min-w-0 flex-col rounded-lg border-2 border-white/35 p-5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] pointer-events-auto md:p-6"
        style={{ backgroundColor: TRIAL_PANEL_BG }}
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col rounded-md border border-white/20 bg-black/25 p-4 md:p-5">
          {wizard}
        </div>
      </div>

      {/* Interactive: bottom row, right two-thirds (cols 3–6 of 6) */}
      <div
        className="col-span-4 row-start-2 box-border flex h-full min-h-0 min-w-0 flex-col rounded-lg border-2 border-white/35 p-5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] pointer-events-auto md:p-6"
        style={{ backgroundColor: TRIAL_PANEL_BG }}
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col rounded-md border border-white/20 bg-black/25 p-4 md:p-5">
          {interactive}
        </div>
      </div>
    </div>
  );
};

export default TrialLayout;
