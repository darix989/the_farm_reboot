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
    talking: {
      file: 'fox-talking.png',
      frameWidth: 512,
      frameHeight: 512,
      frameCount: 25,
      frameRate: 13,
      cols: 5,
      fit: { x: 0.25, y: 0.3008, width: 0.502, height: 0.3867 },
      quality: {
        loopPop: 0.26,
        heightSwing: 3,
        driftX: 0.3,
        churnMean: 0.45,
        churnPeak: 1.53,
        churnPeakIndex: 14,
        warnings: [
          'frame 14 churns 3.4x the clip average (over 2.5x) — zoom in on frames 13-14 for a mouth interior or pupil being redrawn',
        ],
      },
      reviewNotes: [
        'REJECTED — glitchy, regenerate. The frame-14 churn warning was correct and an earlier note here wrongly dismissed it as the mouth closing. Measured per frame: the white of the eye ramps 0 -> 298 -> 71 px across the 25 frames (swing 211% of its mean), so the eyelid aperture is redrawn every frame rather than held; and an invented tooth pops on and off (83, 82, 66, 1, 1, 3, 33, 36, 3, 37, 2, 4, 1, 2, 56, 94, 112, 116, 116, 120, 36, 17...), which the reference forbids since its mouth is closed.',
      ],
    },
  },
};
