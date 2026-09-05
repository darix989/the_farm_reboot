import { Scene } from 'phaser';
import { loadAnimalAtlases } from '../animals/animalAtlases';
import { ensureAnimalAnimations } from '../animals/animalAnimations';
import {
  ensureAnimalEmotionAnimations,
  loadAnimalEmotionSheets,
} from '../animals/animalEmotionAnimations';
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

    //  Load the assets for the game - Replace with your own assets
    this.load.setPath('assets');

    this.load.image('logo', 'logo.png');
    this.load.image('star', 'star.png');

    loadAnimalAtlases(this);
    loadAnimalEmotionSheets(this);
  }

  create() {
    //  Animation keys are global to the game, so these are built once here rather than
    //  per-scene — Farm and Trial both need them, and building on every scene entry
    //  would re-register every key each time (the source prototype's documented bug).
    ensureAnimalAnimations(this);
    ensureAnimalEmotionAnimations(this);

    //  Move to the MainMenu. Its `current-scene-ready` emit is what flips the game to
    //  ready and lets the React overlay become interactive — see `gameStore`.
    this.scene.start('MainMenu');
  }
}
