import type { DebateTutorialArea } from '../../types/debateEntities';
import {
  TutorialModalAnchor,
  TutorialModalPosition,
  TutorialModalPreset,
  TutorialModalSize,
  type TutorialModalExplicitSpec,
  type TutorialModalPlacementSpec,
  type TutorialModalPresetSpec,
  type TutorialModalSpec,
} from '../../types/tutorialModalLayout';
import { clampSpotlightRatios } from './spotlightRect';

const STAGE_MARGIN_X = 0.04;
const STAGE_MARGIN_Y = 0.04;

/** Minimum width/height for readable tutorial copy (see tutorial AGENTS.md). */
export const TUTORIAL_MODAL_SIZE_RATIOS: Record<
  TutorialModalSize,
  { width: number; height: number }
> = {
  [TutorialModalSize.Small]: { width: 0.34, height: 0.38 },
  [TutorialModalSize.Medium]: { width: 0.4, height: 0.42 },
  [TutorialModalSize.Large]: { width: 0.52, height: 0.55 },
};

const PRESET_PLACEMENT: Record<
  TutorialModalPreset,
  Pick<TutorialModalPlacementSpec, 'size' | 'position'> & { pivot: TutorialModalAnchor }
> = {
  [TutorialModalPreset.AnalysisSentencesSelection]: {
    size: TutorialModalSize.Small,
    position: TutorialModalPosition.CenterLeft,
    pivot: TutorialModalAnchor.Center,
  },
  [TutorialModalPreset.AnalysisFallacySelection]: {
    size: TutorialModalSize.Small,
    position: TutorialModalPosition.CenterRight,
    pivot: TutorialModalAnchor.Center,
  },
  [TutorialModalPreset.AnalysisSubmit]: {
    size: TutorialModalSize.Small,
    position: TutorialModalPosition.BottomCenter,
    pivot: TutorialModalAnchor.Center,
  },
  [TutorialModalPreset.AnalysisExit]: {
    size: TutorialModalSize.Small,
    position: TutorialModalPosition.TopRight,
    pivot: TutorialModalAnchor.Center,
  },
};

const PRESET_VALUES = new Set<string>(Object.values(TutorialModalPreset));
const SIZE_VALUES = new Set<string>(Object.values(TutorialModalSize));
const POSITION_VALUES = new Set<string>(Object.values(TutorialModalPosition));

function warnInvalidModalSpec(message: string): void {
  if (import.meta.env.DEV) {
    console.warn(`[tutorial modal] ${message}`);
  }
}

function isPresetKey(v: unknown): v is TutorialModalPreset {
  return typeof v === 'string' && PRESET_VALUES.has(v);
}

function isSizeKey(v: unknown): v is TutorialModalSize {
  return typeof v === 'string' && SIZE_VALUES.has(v);
}

function isPositionKey(v: unknown): v is TutorialModalPosition {
  return typeof v === 'string' && POSITION_VALUES.has(v);
}

/** Anchor (ax, ay) in stage space for center pivot — cell centers inside the inset frame. */
function placementAnchor(
  position: TutorialModalPosition,
  mx: number,
  my: number,
): {
  ax: number;
  ay: number;
} {
  const rw = 1 - 2 * mx;
  const rh = 1 - 2 * my;
  const col = (k: 0 | 1 | 2) => mx + (rw * (k + 0.5)) / 3;
  const row = (k: 0 | 1 | 2) => my + (rh * (k + 0.5)) / 3;

  switch (position) {
    case TutorialModalPosition.TopLeft:
      return { ax: col(0), ay: row(0) };
    case TutorialModalPosition.TopCenter:
      return { ax: col(1), ay: row(0) };
    case TutorialModalPosition.TopRight:
      return { ax: col(2), ay: row(0) };
    case TutorialModalPosition.CenterLeft:
      return { ax: col(0), ay: row(1) };
    case TutorialModalPosition.Center:
      return { ax: col(1), ay: row(1) };
    case TutorialModalPosition.CenterRight:
      return { ax: col(2), ay: row(1) };
    case TutorialModalPosition.BottomLeft:
      return { ax: col(0), ay: row(2) };
    case TutorialModalPosition.BottomCenter:
      return { ax: col(1), ay: row(2) };
    case TutorialModalPosition.BottomRight:
      return { ax: col(2), ay: row(2) };
    default: {
      const _exhaustive: never = position;
      return _exhaustive;
    }
  }
}

/** Top-left of the modal for placement mode. */
function placementTopLeft(
  position: TutorialModalPosition,
  w: number,
  h: number,
  pivot: TutorialModalAnchor,
  mx: number,
  my: number,
): { x: number; y: number } {
  const rw = 1 - 2 * mx;
  const rh = 1 - 2 * my;

  if (pivot === TutorialModalAnchor.Center) {
    const { ax, ay } = placementAnchor(position, mx, my);
    return { x: ax - w / 2, y: ay - h / 2 };
  }

  const cx = (band: 0 | 1 | 2) => mx + (rw - w) * (band / 2);
  const cy = (band: 0 | 1 | 2) => my + (rh - h) * (band / 2);

  switch (position) {
    case TutorialModalPosition.TopLeft:
      return { x: mx, y: my };
    case TutorialModalPosition.TopCenter:
      return { x: cx(1), y: my };
    case TutorialModalPosition.TopRight:
      return { x: 1 - mx - w, y: my };
    case TutorialModalPosition.CenterLeft:
      return { x: mx, y: cy(1) };
    case TutorialModalPosition.Center:
      return { x: cx(1), y: cy(1) };
    case TutorialModalPosition.CenterRight:
      return { x: 1 - mx - w, y: cy(1) };
    case TutorialModalPosition.BottomLeft:
      return { x: mx, y: 1 - my - h };
    case TutorialModalPosition.BottomCenter:
      return { x: cx(1), y: 1 - my - h };
    case TutorialModalPosition.BottomRight:
      return { x: 1 - mx - w, y: 1 - my - h };
    default: {
      const _exhaustive: never = position;
      return _exhaustive;
    }
  }
}

function normalizePlacement(spec: TutorialModalPlacementSpec): DebateTutorialArea | null {
  const pivot = spec.pivot ?? TutorialModalAnchor.Center;
  const { width: w, height: h } = TUTORIAL_MODAL_SIZE_RATIOS[spec.size];
  const { x, y } = placementTopLeft(spec.position, w, h, pivot, STAGE_MARGIN_X, STAGE_MARGIN_Y);
  return clampSpotlightRatios({ x, y, width: w, height: h });
}

function normalizeExplicit(spec: TutorialModalExplicitSpec): DebateTutorialArea | null {
  const { x, y, width: w, height: h } = spec;
  if (![x, y, w, h].every((n) => typeof n === 'number' && Number.isFinite(n))) {
    warnInvalidModalSpec(
      'Invalid explicit modal ratios (non-finite numbers); modal layout skipped.',
    );
    return null;
  }
  if (w <= 0 || h <= 0) {
    warnInvalidModalSpec('Explicit modal width/height must be positive; modal layout skipped.');
    return null;
  }
  const pivot = spec.pivot ?? TutorialModalAnchor.TopLeft;
  const tlX = pivot === TutorialModalAnchor.Center ? x - w / 2 : x;
  const tlY = pivot === TutorialModalAnchor.Center ? y - h / 2 : y;
  return clampSpotlightRatios({ x: tlX, y: tlY, width: w, height: h });
}

function normalizePreset(spec: TutorialModalPresetSpec): DebateTutorialArea | null {
  if (!isPresetKey(spec.preset)) {
    warnInvalidModalSpec(`Unknown modal preset "${String(spec.preset)}"; modal layout skipped.`);
    return null;
  }
  const base = PRESET_PLACEMENT[spec.preset];
  const pivot = spec.pivot ?? base.pivot;
  return normalizePlacement({ size: base.size, position: base.position, pivot });
}

/**
 * Resolves any authoring {@link TutorialModalSpec} to a top-left {@link DebateTutorialArea}
 * in stage space (ready for {@link resolveStageSpotlightToViewport}).
 */
export function normalizeTutorialModalSpecToArea(
  spec: TutorialModalSpec,
): DebateTutorialArea | null {
  if ('preset' in spec && spec.preset !== undefined) {
    if (isPresetKey(spec.preset)) {
      return normalizePreset(spec as TutorialModalPresetSpec);
    }
    warnInvalidModalSpec(
      `Unknown modal preset "${String(spec.preset)}"; trying other layout keys.`,
    );
  }
  if ('size' in spec && 'position' in spec) {
    if (isSizeKey(spec.size) && isPositionKey(spec.position)) {
      return normalizePlacement(spec as TutorialModalPlacementSpec);
    }
    warnInvalidModalSpec('Invalid placement `size` or `position`; modal layout skipped.');
    return null;
  }
  if ('x' in spec && 'y' in spec && 'width' in spec && 'height' in spec) {
    return normalizeExplicit(spec as TutorialModalExplicitSpec);
  }
  warnInvalidModalSpec('Unrecognized modal spec shape; modal layout skipped.');
  return null;
}

export type TutorialModalDevOverride = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  pivot?: TutorialModalAnchor;
};

function devOverrideIsFullRect(dev: TutorialModalDevOverride): boolean {
  return (
    dev.x !== undefined &&
    dev.y !== undefined &&
    dev.width !== undefined &&
    dev.height !== undefined &&
    [dev.x, dev.y, dev.width, dev.height].every((n) => Number.isFinite(n))
  );
}

function isExplicitModalSpec(spec: TutorialModalSpec): spec is TutorialModalExplicitSpec {
  return (
    'x' in spec &&
    'y' in spec &&
    'width' in spec &&
    'height' in spec &&
    !('preset' in spec) &&
    !('size' in spec && 'position' in spec)
  );
}

/**
 * Merges optional devtools / window overrides into the step spec.
 * Supplying all of x, y, width, height replaces any preset/placement with an explicit rect.
 */
export function mergeTutorialModalSpecWithDevOverride(
  spec: TutorialModalSpec | undefined,
  dev: TutorialModalDevOverride | undefined,
): TutorialModalSpec | undefined {
  if (!spec && !dev) return undefined;
  if (dev && devOverrideIsFullRect(dev)) {
    return {
      x: dev.x!,
      y: dev.y!,
      width: dev.width!,
      height: dev.height!,
      pivot: dev.pivot ?? (spec && 'pivot' in spec ? spec.pivot : undefined),
    };
  }
  if (!spec) return undefined;
  if (!dev) return spec;

  if (isExplicitModalSpec(spec)) {
    return {
      ...spec,
      x: dev.x ?? spec.x,
      y: dev.y ?? spec.y,
      width: dev.width ?? spec.width,
      height: dev.height ?? spec.height,
      pivot: dev.pivot ?? spec.pivot,
    };
  }

  return {
    ...spec,
    pivot: dev.pivot ?? ('pivot' in spec ? spec.pivot : undefined),
  } as TutorialModalSpec;
}
