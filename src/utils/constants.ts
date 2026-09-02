export const PHASER_PARENT_ID = 'phaser-parent';

/** 16:9 stage logical size (matches Phaser scale config); used to scale root `rem` with the stage. */
export const STAGE_DESIGN_WIDTH = 1920;
export const STAGE_DESIGN_HEIGHT = 1080;

/** Browser `rem` at full design width (Tailwind default scale assumes ~16px root). */
export const STAGE_REM_BASE_PX = 16;

/**
 * Root font scales as `(width / STAGE_DESIGN_WIDTH) ** STAGE_REM_SCALE_POWER`.
 * Power > 1 pulls text down faster when the stage is narrower than design width.
 */
export const STAGE_REM_SCALE_POWER = 1.28;

/** Clamp root `font-size` so UI stays usable on tiny / huge windows. */
export const STAGE_REM_MIN_PX = 5;
export const STAGE_REM_MAX_PX = 28;
/**
 * The Trial layout's game hole, in 1920x1080 stage coords — where the Phaser `Trial`
 * scene draws its animated cast, behind the now-transparent `.trialGameHole` React cell.
 *
 * DERIVED FROM `TrialLayout.module.scss`: grid-template-columns `3fr 2fr` (3/5 * 1920 = 1152)
 * and grid-template-rows `repeat(2, 1fr)` (1/2 * 1080 = 540). Change both together, or use
 * `DEBUG_TRIAL_STAGE` in `Trial.ts` to check they still agree.
 */
export const TRIAL_STAGE_HOLE = { x: 0, y: 0, width: 1152, height: 540 } as const;
