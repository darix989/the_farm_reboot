import type { DebateTutorialSpotlightJson } from '../../types/debateEntities';

/** Viewport pixel rect (same space as `DOMRect` from `getBoundingClientRect()`). */
export type TutorialSpotlightRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const STAGE_ELEMENT_ID = 'app-stage-16x9';

/** Default when a step omits `spotlight` in JSON — entire `#app-stage-16x9`. */
export const FULL_STAGE_SPOTLIGHT_RATIOS: DebateTutorialSpotlightJson = {
  x: 0,
  y: 0,
  width: 1,
  height: 1,
};

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/** Keeps spotlight inside the stage unit square; trims size if it overflows. */
export function clampSpotlightRatios(
  spec: DebateTutorialSpotlightJson,
): DebateTutorialSpotlightJson {
  const x = clamp01(spec.x);
  const y = clamp01(spec.y);
  let width = clamp01(spec.width);
  let height = clamp01(spec.height);
  if (x + width > 1) width = Math.max(0, 1 - x);
  if (y + height > 1) height = Math.max(0, 1 - y);
  return { x, y, width, height };
}

/**
 * Converts stage-normalized spotlight ratios to viewport pixels for fixed overlays.
 * Uses the stage element’s current `getBoundingClientRect()` (letterbox-safe).
 */
export function resolveStageSpotlightToViewport(
  spec: DebateTutorialSpotlightJson | undefined | null,
): TutorialSpotlightRect {
  const el = document.getElementById(STAGE_ELEMENT_ID);
  const s = el?.getBoundingClientRect();
  if (!s || s.width <= 0 || s.height <= 0) {
    return { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };
  }
  const r = clampSpotlightRatios(spec ?? FULL_STAGE_SPOTLIGHT_RATIOS);
  return {
    x: s.left + r.x * s.width,
    y: s.top + r.y * s.height,
    width: r.width * s.width,
    height: r.height * s.height,
  };
}
