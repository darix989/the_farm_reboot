import { Scene } from 'phaser';

import { reportBootProgress } from '../bootProgress';

export class Boot extends Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    //  The Boot Scene is typically used to load in any assets you require for your Preloader, such as a game logo or background.
    //  The smaller the file size of the assets, the better, as the Boot Scene itself has no preloader.

    //  Nothing is drawn yet at this point, so the React boot screen is the only thing the
    //  player can see — feed it this phase's progress too, or the bar sits at 0 for the
    //  whole background fetch.
    reportBootProgress(this, 'Boot');

    this.load.image('background', 'assets/bg.png');
  }

  create() {
    this.scene.start('Preloader');
  }
}
