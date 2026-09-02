import { Scene } from 'phaser';
import { loadAnimalAtlases } from '../animals/animalAtlases';
import { ensureAnimalAnimations } from '../animals/animalAnimations';

export class Preloader extends Scene {
  constructor() {
    super('Preloader');
  }

  init() {
    //  We loaded this image in our Boot Scene, so we can display it here.
    //  Centred on the 1920x1080 stage (see `STAGE_DESIGN_WIDTH/HEIGHT`), not the
    //  template's original 1024x768 — the atlas load below makes this bar load-bearing.
    this.add.image(960, 540, 'background');

    //  A simple progress bar. This is the outline of the bar.
    this.add.rectangle(960, 540, 468, 32).setStrokeStyle(1, 0xffffff);

    //  This is the progress bar itself. It will increase in size from the left based on the % of progress.
    const bar = this.add.rectangle(960 - 230, 540, 4, 28, 0xffffff);

    //  Use the 'progress' event emitted by the LoaderPlugin to update the loading bar
    this.load.on('progress', (progress: number) => {
      //  Update the progress bar (our bar is 464px wide, so 100% = 464px)
      bar.width = 4 + 460 * progress;
    });
  }

  preload() {
    //  Load the assets for the game - Replace with your own assets
    this.load.setPath('assets');

    this.load.image('logo', 'logo.png');
    this.load.image('star', 'star.png');

    loadAnimalAtlases(this);
  }

  create() {
    //  Animation keys are global to the game, so these are built once here rather than
    //  per-scene — Farm and Trial both need them, and building on every scene entry
    //  would re-register every key each time (the source prototype's documented bug).
    ensureAnimalAnimations(this);

    //  Move to the MainMenu. You could also swap this for a Scene Transition, such as a camera fade.
    this.scene.start('MainMenu');
  }
}
