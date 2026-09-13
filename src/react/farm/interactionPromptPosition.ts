import { STAGE_DESIGN_HEIGHT, STAGE_DESIGN_WIDTH } from '../../utils/constants';

/** Converts Phaser design coordinates into the responsive React stage's coordinate space. */
export function interactionPromptPosition(anchor: { x: number; y: number }): {
  left: string;
  top: string;
} {
  return {
    left: `${(anchor.x / STAGE_DESIGN_WIDTH) * 100}%`,
    top: `${(anchor.y / STAGE_DESIGN_HEIGHT) * 100}%`,
  };
}
