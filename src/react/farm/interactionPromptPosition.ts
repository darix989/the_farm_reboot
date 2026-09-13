import { STAGE_DESIGN_HEIGHT, STAGE_DESIGN_WIDTH } from '../../utils/constants';

const EDGE_MARGIN_PX = 16;

export interface InteractionPromptLayout {
  stageWidth: number;
  stageHeight: number;
  promptWidth: number;
  promptHeight: number;
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return (min + max) / 2;
  return Math.min(Math.max(value, min), max);
}

/**
 * Converts Phaser design coordinates into CSS pixels and keeps the whole prompt on-stage.
 * The prompt's CSS transform anchors its bottom centre to this point, so horizontal bounds
 * reserve half its width while the top bound reserves its full height.
 */
export function interactionPromptPosition(
  anchor: { x: number; y: number },
  layout: InteractionPromptLayout,
): {
  left: string;
  top: string;
} {
  const targetX = (anchor.x / STAGE_DESIGN_WIDTH) * layout.stageWidth;
  const targetY = (anchor.y / STAGE_DESIGN_HEIGHT) * layout.stageHeight;
  const minX = layout.promptWidth / 2 + EDGE_MARGIN_PX;
  const maxX = layout.stageWidth - layout.promptWidth / 2 - EDGE_MARGIN_PX;
  const minY = layout.promptHeight + EDGE_MARGIN_PX;
  const maxY = layout.stageHeight - EDGE_MARGIN_PX;

  return {
    left: `${clamp(targetX, minX, maxX)}px`,
    top: `${clamp(targetY, minY, maxY)}px`,
  };
}
