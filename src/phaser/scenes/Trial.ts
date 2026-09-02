import { EventBus } from '../EventBus';
import { Scene } from 'phaser';

/**
 * Backdrop for the debate overlay. Characters are React (`CharacterStage` in the
 * Trial game hole); this scene only fills uncovered pixels with a quiet colour
 * matching `--ui-color-bg-soft`.
 */
export class Trial extends Scene {
  camera: Phaser.Cameras.Scene2D.Camera;

  constructor() {
    super('Trial');
  }

  create() {
    this.camera = this.cameras.main;
    this.camera.setBackgroundColor(0x1a1a1a);

    EventBus.emit('current-scene-ready', this);
  }

  gameOver() {
    this.scene.start('GameOver');
  }
}
