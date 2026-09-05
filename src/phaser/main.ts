import { AnimalGallery } from './scenes/AnimalGallery';
import { Boot } from './scenes/Boot';
import { Farm } from './scenes/Farm';
import { GameOver } from './scenes/GameOver';
import { Game as MainGame } from './scenes/Game';
import { MainMenu } from './scenes/MainMenu';
import { Trial } from './scenes/Trial';
import { AUTO, Game } from 'phaser';
import { Preloader } from './scenes/Preloader';
import { PHASER_PARENT_ID, STAGE_DESIGN_HEIGHT, STAGE_DESIGN_WIDTH } from '../utils/constants';

//  Find out more information about the Game Config at:
//  https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config: Phaser.Types.Core.GameConfig = {
  type: AUTO,
  // width: 1024,
  // height: 768,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: PHASER_PARENT_ID,
    width: STAGE_DESIGN_WIDTH,
    height: STAGE_DESIGN_HEIGHT,
    // width: 1024,
    // height: 768,
  },
  parent: 'game-container',
  backgroundColor: '#028af8',
  // Top-down overworld: Arcade with no gravity, used for player/solid collision
  // and NPC proximity. Every scene shares one physics world; the debate scenes
  // simply never create bodies.
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  // The Farm camera follows the player, so snap draws to whole pixels to stop
  // sub-pixel shimmer on the generated textures.
  render: { roundPixels: true },
  scene: [Boot, Preloader, MainMenu, Farm, MainGame, Trial, AnimalGallery, GameOver],
};

const StartGame = (parent: string) => {
  return new Game({ ...config, parent });
};

export default StartGame;
