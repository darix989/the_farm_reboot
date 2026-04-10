export const PHASER_PARENT_ID = "phaser-parent";

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