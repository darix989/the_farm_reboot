import { Scene } from 'phaser';

import { EventBus } from '../EventBus';
import { addCoverBackground } from '../coverBackground';

export class MainMenu extends Scene {
  constructor() {
    super('MainMenu');
  }

  create() {
    this.cameras.main.setBackgroundColor(0x1a2a1e);
    addCoverBackground(this, 'background');

    EventBus.emit('current-scene-ready', this);
  }

  /** Kept for BoilerPlateUI's template wiring; the live overlay never calls this. */
  changeScene() {
    this.scene.start('Game');
  }

  /** Kept for BoilerPlateUI's template wiring. The Phaser logo is gone. */
  moveLogo(_vueCallback: ({ x, y }: { x: number; y: number }) => void) {
    // no-op
  }
}
