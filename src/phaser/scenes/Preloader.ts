import { Scene } from 'phaser';
import { reportBootProgress } from '../bootProgress';
import { addCoverBackground } from '../coverBackground';

export class Preloader extends Scene {
  constructor() {
    super('Preloader');
  }

  init() {
    //  Loaded in Boot. Cover-scaled so a 16:9 painting fills the stage; the React
    //  loading overlay sits on top of it.
    addCoverBackground(this, 'background');

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
