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
> = {};
