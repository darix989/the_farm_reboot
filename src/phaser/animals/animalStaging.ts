/**
 * Per-surface render scale and facing for the placeholder animal cast.
 *
 * NOT the source repo's `CharacterInfo.scale` (0.4-1.0), which was tuned against a Tiled
 * world at camera zoom 0.6-0.85. These target roughly 150px tall on the farm (placeholder
 * NPCs are 56px) and roughly 380px tall in the 1152x540 Trial hole, derived from each
 * atlas's measured max frame `sourceSize`. Tune by eye — this is a first pass.
 */
import type { AnimalSpriteId } from '../../data/characters';

export interface AnimalStagingScale {
  farmScale: number;
  trialScale: number;
}

export const ANIMAL_STAGING: Record<AnimalSpriteId, AnimalStagingScale> = {
  'donkey-grey': { farmScale: 0.22, trialScale: 0.54 }, // source scale 0.7, max frame 784x702
  owl: { farmScale: 0.25, trialScale: 0.63 }, // source scale 0.4, max frame 906x601
  raccoon: { farmScale: 0.16, trialScale: 0.4 }, // source scale 0.4, max frame 1173x946
  fox: { farmScale: 0.28, trialScale: 0.7 }, // source scale 0.6, max frame 754x544
  'white-sheep-1': { farmScale: 0.42, trialScale: 1.05 }, // source scale 1.0, max frame 419x363
  'brown-wolf': { farmScale: 0.22, trialScale: 0.54 }, // source scale 0.7, max frame 836x703
};

/** A cast of three needs to be smaller than a cast of one or two to fit the hole. */
export const TRIAL_SCALE_BY_CAST_SIZE: Record<number, number> = { 1: 1.1, 2: 1, 3: 0.85 };

/** Verified by eye against the source atlases: every ported animal faces left. */
export const ANIMAL_ART_FACES_LEFT = true;
