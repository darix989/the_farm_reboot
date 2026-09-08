/**
 * GENERATED FILE — do not edit by hand.
 *
 * Written by `npm run sprites:emotions -- --faces --promote`. Lists the headshot clips that
 * actually exist on disk under `public/assets/characters/faces/`; regenerate rather than
 * editing, or the next promote will overwrite your change.
 *
 * The face register's counterpart to `emotionSheets.generated.ts`, and deliberately a
 * separate module rather than a second export from it: the two are promoted independently
 * from independent records, and a face sheet is not a drop-in for a body sheet — it carries
 * `cols` and `fit` where a body clip carries `scale` and a feet origin, because one is
 * centred in a DOM portrait box and the other is planted on a Phaser floor line. Separate
 * types make handing one to the other's code a compile error rather than a sprite rendered
 * 3x too small.
 *
 * Empty is a valid state: a character with no entry here simply shows no portrait, exactly as
 * an animal with no emotion clip falls back to its idle loop.
 */
import type { AnimalSpriteId } from '../../data/characters';
import type { AnimalEmotion } from './animalEmotions';
import type { FaceSheet } from './animalFaces';

export const FACE_SHEETS: Partial<
  Record<AnimalSpriteId, Partial<Record<AnimalEmotion, FaceSheet>>>
> = {
  fox: {
    angry: {
      file: 'fox-angry.png',
      frameWidth: 256,
      frameHeight: 256,
      frameCount: 25,
      frameRate: 13,
      cols: 5,
      fit: { x: 0, y: 0.0455, width: 1, height: 0.9091 },
      quality: {
        loopPop: 0.91,
        heightSwing: 6.4,
        driftX: 6,
        warnings: [],
      },
    },
    doubtful: {
      file: 'fox-doubtful.png',
      frameWidth: 256,
      frameHeight: 256,
      frameCount: 25,
      frameRate: 13,
      cols: 5,
      fit: { x: 0, y: 0.0455, width: 1, height: 0.9091 },
      quality: {
        loopPop: 0.68,
        heightSwing: 8.5,
        driftX: 2,
        warnings: [],
      },
    },
    sneaky: {
      file: 'fox-sneaky.png',
      frameWidth: 256,
      frameHeight: 256,
      frameCount: 25,
      frameRate: 13,
      cols: 5,
      fit: { x: 0, y: 0.0455, width: 1, height: 0.9091 },
      quality: {
        loopPop: 0.9,
        heightSwing: 13,
        driftX: 10.8,
        warnings: [],
      },
    },
    talking: {
      file: 'fox-talking.png',
      frameWidth: 256,
      frameHeight: 256,
      frameCount: 25,
      frameRate: 13,
      cols: 5,
      fit: { x: 0, y: 0.0455, width: 1, height: 0.9091 },
      quality: {
        loopPop: 0.93,
        heightSwing: 10.8,
        driftX: 3.8,
        warnings: [],
      },
    },
    thinking: {
      file: 'fox-thinking.png',
      frameWidth: 256,
      frameHeight: 256,
      frameCount: 25,
      frameRate: 13,
      cols: 5,
      fit: { x: 0, y: 0.0455, width: 1, height: 0.9091 },
      quality: {
        loopPop: 0.73,
        heightSwing: 16.4,
        driftX: 9.8,
        warnings: [],
      },
    },
  },
};
