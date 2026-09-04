/**
 * Per-surface render scale and facing for the placeholder animal cast.
 *
 * Two things were tried before this and both looked wrong:
 *
 * 1. The source repo's own `CharacterInfo.scale` (donkey-grey 0.7, owl 0.4, raccoon 0.4,
 *    fox 0.6, white-sheep-1 1.0, brown-wolf 0.7) directly. It was tuned against a Tiled
 *    world with 256px tiles and a Trial camera that zooms between 0.6 and 0.85 — none of
 *    which this repo has, so the absolute numbers don't transfer.
 * 2. Normalising every animal to the *same apparent height*, ignoring the source scale
 *    entirely. This actively fought the art: a real raccoon is small and a real donkey is
 *    not, and the source scale already encodes that — donkey-grey/brown-wolf (0.7) are
 *    the two biggest animals, white-sheep-1 (1.0) is nominally "biggest" but has by far the
 *    smallest export canvas so nets out mid-sized, owl/raccoon (0.4) are the smallest.
 *    Forcing the raccoon's low, wide crouching idle pose up to donkey height made it nearly
 *    as wide as an entire Trial stage slot and overlap its neighbours there.
 *
 * So: **keep the source's relative scale ratios** (they are the actual art direction) and
 * apply one flat multiplier per surface — `farmScale` / `trialScale` below are
 * `sourceScale * surfaceMultiplier`, chosen so the donkey (the player, the most-seen
 * animal) lands at roughly 140px tall on the farm (next to the 56px placeholder NPCs) and
 * roughly 300px tall in the 1152x540 Trial hole. That preserves the designed size
 * hierarchy — donkey/wolf biggest, sheep mid-sized, fox/owl smaller, raccoon smallest and
 * widest — while fitting this repo's very different pixel budget.
 *
 * Recomputing: `docs/characters-and-animations.md` has each animal's measured idle rest
 * frame's visible size (`spriteSourceSize` in the descriptor JSON, not the shared
 * `sourceSize` export canvas — that's often much bigger than what's actually drawn, e.g.
 * the raccoon's idle crouch fills only ~40% of its canvas height). Multiply that by the
 * source scale to get the "as designed" apparent size, then pick one multiplier so the
 * donkey lands at the target height and apply it to every animal's source scale.
 */
import type { AnimalSpriteId } from '../../data/characters';

export interface AnimalStagingScale {
  farmScale: number;
  trialScale: number;
}

/** `the_farm/src/phaser/utils/animalDescriptors.ts`'s `CharacterInfo.scale` for these six. */
const SOURCE_SCALE: Record<AnimalSpriteId, number> = {
  'donkey-grey': 0.7,
  owl: 0.4,
  raccoon: 0.4,
  fox: 0.6,
  'white-sheep-1': 1.0,
  'brown-wolf': 0.7,
};

const FARM_MULTIPLIER = 0.377; // donkey-grey -> ~140px tall next to the 56px placeholder NPCs
const TRIAL_MULTIPLIER = 0.807; // donkey-grey -> ~300px tall in the 540px-tall Trial hole

/**
 * Per-animal fudge factor applied on top of the ratio-derived scale, for the rare case
 * where the source ratio still doesn't read right once actually seen in this world.
 * Defaults to 1 (no adjustment) for every animal not listed.
 */
const MANUAL_ADJUST: Partial<Record<AnimalSpriteId, number>> = {
  'white-sheep-1': 0.8, // read a little large next to the rest of the cast; shrunk 20%
};

export const ANIMAL_STAGING: Record<AnimalSpriteId, AnimalStagingScale> = Object.fromEntries(
  (Object.keys(SOURCE_SCALE) as AnimalSpriteId[]).map((id) => {
    const adjust = MANUAL_ADJUST[id] ?? 1;
    return [
      id,
      {
        farmScale: SOURCE_SCALE[id] * FARM_MULTIPLIER * adjust,
        trialScale: SOURCE_SCALE[id] * TRIAL_MULTIPLIER * adjust,
      },
    ];
  }),
) as Record<AnimalSpriteId, AnimalStagingScale>;

/** A cast of three needs to be smaller than a cast of one or two to fit the hole. */
export const TRIAL_SCALE_BY_CAST_SIZE: Record<number, number> = { 1: 1.1, 2: 1, 3: 0.85 };

/** Verified by eye against the source atlases: every ported animal faces left. */
export const ANIMAL_ART_FACES_LEFT = true;
