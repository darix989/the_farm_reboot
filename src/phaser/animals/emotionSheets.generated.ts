/**
 * GENERATED FILE — do not edit by hand.
 *
 * Written by `npm run sprites:emotions -- --promote`. Lists the emotion clips that actually
 * exist on disk under `public/assets/characters/emotions/`; regenerate rather than editing,
 * or the next promote will overwrite your change.
 *
 * A committed generated module rather than a JSON file fetched at runtime, for two reasons:
 * Phaser's loader would need a second pass (read the index, then queue the sheets it names),
 * and a TS module gets the animal ids and emotion names type-checked against
 * `AnimalSpriteId` / `AnimalEmotion` at build time instead of failing silently at runtime.
 *
 * Empty is a valid state: every consumer falls back to the base `idle`/`alert` behaviour for
 * an animal or emotion that has no entry here.
 */
import type { AnimalSpriteId } from '../../data/characters';
import type { AnimalEmotion, EmotionSheet } from './animalEmotions';

export const EMOTION_SHEETS: Partial<
  Record<AnimalSpriteId, Partial<Record<AnimalEmotion, EmotionSheet>>>
> = {
  'donkey-grey': {
    angry: {
      file: 'donkey-grey-angry.png',
      frameWidth: 512,
      frameHeight: 512,
      frameCount: 16,
      frameRate: 12,
      scale: 2.0584,
      originX: 0.5384,
      originY: 0.7933,
    },
    doubtful: {
      file: 'donkey-grey-doubtful.png',
      frameWidth: 512,
      frameHeight: 512,
      frameCount: 16,
      frameRate: 12,
      scale: 2.0268,
      originX: 0.5332,
      originY: 0.7922,
    },
    sneaky: {
      file: 'donkey-grey-sneaky.png',
      frameWidth: 512,
      frameHeight: 512,
      frameCount: 16,
      frameRate: 12,
      scale: 2.177,
      originX: 0.5266,
      originY: 0.7884,
    },
    talking: {
      file: 'donkey-grey-talking.png',
      frameWidth: 512,
      frameHeight: 512,
      frameCount: 16,
      frameRate: 12,
      scale: 2.1331,
      originX: 0.5361,
      originY: 0.7894,
    },
    thinking: {
      file: 'donkey-grey-thinking.png',
      frameWidth: 512,
      frameHeight: 512,
      frameCount: 16,
      frameRate: 12,
      scale: 2.0584,
      originX: 0.5257,
      originY: 0.7933,
    },
  },
  owl: {
    angry: {
      file: 'owl-angry.png',
      frameWidth: 512,
      frameHeight: 512,
      frameCount: 16,
      frameRate: 12,
      scale: 2.1241,
      originX: 0.5009,
      originY: 0.75,
    },
    doubtful: {
      file: 'owl-doubtful.png',
      frameWidth: 512,
      frameHeight: 512,
      frameCount: 16,
      frameRate: 12,
      scale: 2.1476,
      originX: 0.4931,
      originY: 0.75,
    },
    sneaky: {
      file: 'owl-sneaky.png',
      frameWidth: 512,
      frameHeight: 512,
      frameCount: 16,
      frameRate: 12,
      scale: 2.2045,
      originX: 0.4999,
      originY: 0.75,
    },
    talking: {
      file: 'owl-talking.png',
      frameWidth: 512,
      frameHeight: 512,
      frameCount: 16,
      frameRate: 12,
      scale: 2.1962,
      originX: 0.5009,
      originY: 0.75,
    },
    thinking: {
      file: 'owl-thinking.png',
      frameWidth: 512,
      frameHeight: 512,
      frameCount: 16,
      frameRate: 12,
      scale: 2.2299,
      originX: 0.4901,
      originY: 0.752,
    },
  },
};
