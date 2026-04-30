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

/** Minimum gap from the stage edge to the modal box (placement + top-left pivot). */
const STAGE_MARGIN_X = 0.082;
const STAGE_MARGIN_Y = 0.05;
const STAGE_MARGIN_SMALL_X = 0.005;
const STAGE_MARGIN_TIGHT_X = 0.04;
const STAGE_MARGIN_TIGHT_Y = 0.06;

/**
 * Extra inset applied only when computing the 3×3 anchor lattice for **center** pivot,
 * so cell centers (and thus whole modals) sit farther from the physical edges than the
 * raw margin alone would allow.
 */
const PLACEMENT_ANCHOR_GUTTER_X = 0.048;
const PLACEMENT_ANCHOR_GUTTER_Y = 0.048;
const PLACEMENT_ANCHOR_GUTTER_SMALL_X = -0.016;
const PLACEMENT_ANCHOR_GUTTER_TIGHT_X = -0.1;
const PLACEMENT_ANCHOR_GUTTER_TIGHT_Y = 0.032;

/** Minimum width/height for readable tutorial copy (see tutorial AGENTS.md). */
export const TUTORIAL_MODAL_SIZE_RATIOS: Record<
  TutorialModalSize,
  { width: number; height: number }
> = {
  [TutorialModalSize.SmallTight]: { width: 0.2, height: 0.36 },
  [TutorialModalSize.SmallTightTall]: { width: 0.2, height: 0.65 },
  [TutorialModalSize.Small]: { width: 0.34, height: 0.38 },
  [TutorialModalSize.Medium]: { width: 0.4, height: 0.42 },
  [TutorialModalSize.Large]: { width: 0.52, height: 0.55 },
};

type TutorialModalPlacementSizeConfig = {
  marginX: number;
  marginY: number;
  gutterX: number;
  gutterY: number;
};

const TUTORIAL_MODAL_SIZE_PLACEMENT_CONFIG: Record<
  TutorialModalSize,
  TutorialModalPlacementSizeConfig
> = {
  [TutorialModalSize.SmallTight]: {
    marginX: STAGE_MARGIN_TIGHT_X,
    marginY: STAGE_MARGIN_TIGHT_Y,
    gutterX: PLACEMENT_ANCHOR_GUTTER_TIGHT_X,
    gutterY: PLACEMENT_ANCHOR_GUTTER_TIGHT_Y,
  },
  [TutorialModalSize.SmallTightTall]: {
    marginX: STAGE_MARGIN_TIGHT_X,
    marginY: STAGE_MARGIN_TIGHT_Y,
    gutterX: PLACEMENT_ANCHOR_GUTTER_TIGHT_X,
    gutterY: PLACEMENT_ANCHOR_GUTTER_TIGHT_Y,
  },
  [TutorialModalSize.Small]: {
    marginX: STAGE_MARGIN_SMALL_X,
    marginY: STAGE_MARGIN_Y,
    gutterX: PLACEMENT_ANCHOR_GUTTER_SMALL_X,
    gutterY: PLACEMENT_ANCHOR_GUTTER_Y,
  },
  [TutorialModalSize.Medium]: {
    marginX: STAGE_MARGIN_X,
    marginY: STAGE_MARGIN_Y,
    gutterX: PLACEMENT_ANCHOR_GUTTER_X,
    gutterY: PLACEMENT_ANCHOR_GUTTER_Y,
  },
  [TutorialModalSize.Large]: {
    marginX: STAGE_MARGIN_X,
    marginY: STAGE_MARGIN_Y,
    gutterX: PLACEMENT_ANCHOR_GUTTER_X,
    gutterY: PLACEMENT_ANCHOR_GUTTER_Y,
  },
};

const PRESET_PLACEMENT: Record<
  TutorialModalPreset,
  Pick<TutorialModalPlacementSpec, 'size' | 'position'> & { pivot: TutorialModalAnchor }
> = {
  [TutorialModalPreset.AnalysisSentencesSelection]: {
    size: TutorialModalSize.Small,
    position: TutorialModalPosition.CenterRight,
    pivot: TutorialModalAnchor.Center,
  },
  [TutorialModalPreset.AnalysisFallacySelection]: {
    size: TutorialModalSize.Medium,
    position: TutorialModalPosition.CenterLeft,
    pivot: TutorialModalAnchor.Center,
  },
  [TutorialModalPreset.AnalysisSubmit]: {
    size: TutorialModalSize.Medium,
    position: TutorialModalPosition.BottomLeft,
    pivot: TutorialModalAnchor.Center,
  },
  [TutorialModalPreset.AnalysisExit]: {
    size: TutorialModalSize.Medium,
    position: TutorialModalPosition.BottomRight,
    pivot: TutorialModalAnchor.Center,
  },
};

const PRESET_VALUES = new Set<string>(Object.values(TutorialModalPreset));
const SIZE_VALUES = new Set<string>(Object.values(TutorialModalSize));
const POSITION_VALUES = new Set<string>(Object.values(TutorialModalPosition));

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Ensures the modal always keeps a minimum inset from stage edges.
 * If the modal is larger than the available safe frame, it is shrunk to fit.
 */
function enforceModalEdgeInsets(
  area: DebateTutorialArea,
  marginX: number,
  marginY: number,
): DebateTutorialArea {
  const safeX = clamp(marginX, 0, 0.5);
  const safeY = clamp(marginY, 0, 0.5);
  const maxWidth = Math.max(0, 1 - 2 * safeX);
  const maxHeight = Math.max(0, 1 - 2 * safeY);
  const width = clamp(area.width, 0, maxWidth);
  const height = clamp(area.height, 0, maxHeight);
  const minX = safeX;
  const maxX = Math.max(minX, 1 - safeX - width);
  const minY = safeY;
  const maxY = Math.max(minY, 1 - safeY - height);
  const x = clamp(area.x, minX, maxX);
  const y = clamp(area.y, minY, maxY);
  return { x, y, width, height };
}

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

/** Anchor (ax, ay) in stage space for center pivot — cell centers inside a doubly inset frame. */
function placementAnchor(
  position: TutorialModalPosition,
  mx: number,
  my: number,
  gutterX: number,
  gutterY: number,
): {
  ax: number;
  ay: number;
} {
  const gx0 = mx + gutterX;
  const gx1 = 1 - mx - gutterX;
  const gy0 = my + gutterY;
  const gy1 = 1 - my - gutterY;
  const spanX = Math.max(0, gx1 - gx0);
  const spanY = Math.max(0, gy1 - gy0);
  const col = (k: 0 | 1 | 2) => gx0 + (spanX * (k + 0.5)) / 3;
  const row = (k: 0 | 1 | 2) => gy0 + (spanY * (k + 0.5)) / 3;

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
  gutterX: number,
  gutterY: number,
): { x: number; y: number } {
  const rw = 1 - 2 * mx;
  const rh = 1 - 2 * my;

  if (pivot === TutorialModalAnchor.Center) {
    const { ax, ay } = placementAnchor(position, mx, my, gutterX, gutterY);
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
  const sizePlacement = TUTORIAL_MODAL_SIZE_PLACEMENT_CONFIG[spec.size];
  const { marginX, marginY, gutterX, gutterY } = sizePlacement;
  const { x, y } = placementTopLeft(spec.position, w, h, pivot, marginX, marginY, gutterX, gutterY);
  return enforceModalEdgeInsets(
    clampSpotlightRatios({ x, y, width: w, height: h }),
    marginX,
    marginY,
  );
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
  return enforceModalEdgeInsets(
    clampSpotlightRatios({ x: tlX, y: tlY, width: w, height: h }),
    STAGE_MARGIN_X,
    STAGE_MARGIN_Y,
  );
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
