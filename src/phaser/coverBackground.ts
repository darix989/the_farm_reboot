import { GameObjects, Scene } from 'phaser';
import { STAGE_DESIGN_HEIGHT, STAGE_DESIGN_WIDTH } from '../utils/constants';

/**
 * Full-stage backdrop, scaled to cover 1920×1080 without letterboxing.
 *
 * Phaser images are centred on their origin (0.5 by default). Placing one at the
 * stage corner — the leftover template coords — parks most of the art off-canvas.
 */
export function addCoverBackground(scene: Scene, textureKey: string): GameObjects.Image {
  const image = scene.add.image(STAGE_DESIGN_WIDTH / 2, STAGE_DESIGN_HEIGHT / 2, textureKey);
  const scale = Math.max(STAGE_DESIGN_WIDTH / image.width, STAGE_DESIGN_HEIGHT / image.height);
  return image.setScale(scale).setDepth(-1000);
}
