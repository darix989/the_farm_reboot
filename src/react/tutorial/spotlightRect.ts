import type { DebateTutorialArea } from '../../types/debateEntities';

/** Viewport pixel rect (same space as `DOMRect` from `getBoundingClientRect()`). */
export type TutorialSpotlightRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Stage's measured rect in viewport pixels. Shape is compatible with `DOMRect`,
 * so callers can pass `el.getBoundingClientRect()` directly — but for reactive
 * UI prefer `useStageRect()`, which produces a snapshot that updates on every
 * known cause of stage layout change (resize, fullscreen, orientation, …).
 */
export type StageRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export const STAGE_ELEMENT_ID = 'app-stage-16x9';

/** Default when a step omits `spotlight` in JSON — entire `#app-stage-16x9`. */
export const FULL_STAGE_SPOTLIGHT_RATIOS: DebateTutorialArea = {
  x: 0,
  y: 0,
  width: 1,
  height: 1,
};

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/** Keeps spotlight inside the stage unit square; trims size if it overflows. */
export function clampSpotlightRatios(spec: DebateTutorialArea): DebateTutorialArea {
  const x = clamp01(spec.x);
  const y = clamp01(spec.y);
  let width = clamp01(spec.width);
  let height = clamp01(spec.height);
  if (x + width > 1) width = Math.max(0, 1 - x);
  if (y + height > 1) height = Math.max(0, 1 - y);
  return { x, y, width, height };
}

const RATIO_EPS = 1e-3;

/** True when the spotlight is the whole stage (e.g. JSON omitted `spotlight`). Shutters only cover letterboxing, so the stage stays a click-through “hole”. */
export function isFullStageSpotlight(spec: DebateTutorialArea | undefined | null): boolean {
  const r = clampSpotlightRatios(spec ?? FULL_STAGE_SPOTLIGHT_RATIOS);
  return (
    r.x <= RATIO_EPS && r.y <= RATIO_EPS && r.width >= 1 - RATIO_EPS && r.height >= 1 - RATIO_EPS
  );
}

/** True when the resolved hole covers the viewport (shutter panes collapse to zero thickness). */
export function spotlightCoversEntireViewport(
  spotlight: TutorialSpotlightRect,
  vw: number,
  vh: number,
): boolean {
  if (vw <= 0 || vh <= 0) return false;
  const eps = 0.5;
  return (
    spotlight.x <= eps &&
    spotlight.y <= eps &&
    spotlight.x + spotlight.width >= vw - eps &&
    spotlight.y + spotlight.height >= vh - eps
  );
}

/**
 * Converts stage-normalized spotlight ratios to viewport pixels for fixed
 * overlays. Pure: pass in the stage's measured rect (typically from
 * `useStageRect()`) and the function deterministically produces the viewport
 * pixel rect, including the letterbox offset baked into `stageRect.left/top`.
 *
 * Callers that have a "stage not laid out yet" case should pass a
 * viewport-sized fallback (`{ left: 0, top: 0, width: vw, height: vh }`) so
 * the resulting spotlight covers the screen — that trips
 * `spotlightCoversEntireViewport` downstream and the overlay degrades to
 * "no hole, click blocker only" instead of NaN / zero-sized output.
 */
export function resolveStageSpotlightToViewport(
  spec: DebateTutorialArea | undefined | null,
  stageRect: StageRect,
): TutorialSpotlightRect {
  const r = clampSpotlightRatios(spec ?? FULL_STAGE_SPOTLIGHT_RATIOS);
  return {
    x: stageRect.left + r.x * stageRect.width,
    y: stageRect.top + r.y * stageRect.height,
    width: r.width * stageRect.width,
    height: r.height * stageRect.height,
  };
}
