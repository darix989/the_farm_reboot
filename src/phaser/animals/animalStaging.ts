/**
 * Per-surface render scale and facing for the placeholder animal cast.
 *
 * NOT the source repo's `CharacterInfo.scale` (0.4-1.0), which was tuned against a Tiled
 * world at camera zoom 0.6-0.85. These target roughly 140px tall on the farm (placeholder
 * NPCs are 56px) and roughly 340px tall in the 1152x540 Trial hole — but capped by width
 * too (220px farm, 320px trial before `TRIAL_SCALE_BY_CAST_SIZE`), whichever is smaller.
 *
 * The scale is NOT derived from each atlas's `sourceSize` (the untrimmed export canvas) —
 * that canvas is shared across every animation of a character, so a crouching idle pose
 * (raccoon) or a wing-spreading one (owl) can occupy a very different fraction of it.
 * Instead this is measured from each character's actual *idle* rest frame's visible pixel
 * bounds (`spriteSourceSize` in the descriptor JSON) — what you actually see standing in
 * the world.
 *
 * The width cap exists because height-only normalising was tried first and broke down for
 * the raccoon: its idle is a wide all-fours crouch (896x373, a ~2.4:1 aspect ratio versus
 * ~1:1-1.3:1 for the others), so matching its height to the rest made it render nearly as
 * wide as an entire Trial stage slot and overlap its neighbours. Capping width too costs
 * the raccoon (and, at the tighter Trial cap, several others) some height versus the other
 * animals, but nothing overlaps. Recompute both from the measured `(width, height)` pairs
 * in `docs/characters-and-animations.md` if a target changes.
 */
import type { AnimalSpriteId } from '../../data/characters';

export interface AnimalStagingScale {
  farmScale: number;
  trialScale: number;
}

export const ANIMAL_STAGING: Record<AnimalSpriteId, AnimalStagingScale> = {
  'donkey-grey': { farmScale: 0.264, trialScale: 0.57 }, // idle rest frame visible 561x531
  owl: { farmScale: 0.239, trialScale: 0.579 }, // idle rest frame visible 448x587
  raccoon: { farmScale: 0.246, trialScale: 0.357 }, // idle rest frame visible 896x373 (wide crouch)
  fox: { farmScale: 0.358, trialScale: 0.535 }, // idle rest frame visible 598x391
  'white-sheep-1': { farmScale: 0.524, trialScale: 1.029 }, // idle rest frame visible 311x267
  'brown-wolf': { farmScale: 0.299, trialScale: 0.543 }, // idle rest frame visible 589x468
};

/** A cast of three needs to be smaller than a cast of one or two to fit the hole. */
export const TRIAL_SCALE_BY_CAST_SIZE: Record<number, number> = { 1: 1.1, 2: 1, 3: 0.85 };

/** Verified by eye against the source atlases: every ported animal faces left. */
export const ANIMAL_ART_FACES_LEFT = true;
