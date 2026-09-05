import { Scene } from 'phaser';
import { reportBootProgress } from '../bootProgress';

export class Preloader extends Scene {
  constructor() {
    super('Preloader');
  }

  init() {
    //  We loaded this image in our Boot Scene, so we can display it here.
    //  Centred on the 1920x1080 stage (see `STAGE_DESIGN_WIDTH/HEIGHT`), not the
    //  template's original 1024x768.
    this.add.image(960, 540, 'background');

    //  The progress bar itself is React's (`GameLoadingScreen`), drawn over this backdrop.
    //  It is the same overlay that gates the menu until the game is genuinely ready, so
    //  there is exactly one loading UI and it cannot disagree with the gate.
  }

  preload() {
    reportBootProgress(this, 'Preloader');

    //  Shared chrome only. Character atlases and emotion sheets are queued by the scene
    //  that uses them (`animalPacks.ts`) so the menu does not wait on ~22 MB of art.
    this.load.setPath('assets');

    this.load.image('logo', 'logo.png');
    this.load.image('star', 'star.png');
  }

  create() {
    //  Move to the MainMenu. Its `current-scene-ready` emit is what flips the game to
    //  ready and lets the React overlay become interactive — see `gameStore`. Animal
    //  animations are registered later, in the scene that just loaded their pack.
    this.scene.start('MainMenu');
  }
}
