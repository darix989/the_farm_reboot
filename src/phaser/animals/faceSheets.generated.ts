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
        'frame 14 churn is the mouth closing, not the flicker defect the warning looks for — checked frames 12-15 and the full sheet: the interior is one consistent dark patch whenever it is open, framing and head size hold throughout',
      ],
    },
  },
};
