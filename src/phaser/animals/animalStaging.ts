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
import { ANIMAL_DESCRIPTORS } from './animalDescriptors';

export interface AnimalStagingScale {
  farmScale: number;
  trialScale: number;
}

/** `the_farm/src/phaser/utils/animalDescriptors.ts`'s `CharacterInfo.scale`. */
const SOURCE_SCALE: Record<AnimalSpriteId, number> = {
  'donkey-grey': 0.7,
  owl: 0.4,
  raccoon: 0.4,
  fox: 0.6,
  'white-sheep-1': 1.0,
  'brown-wolf': 0.7,
  cow: 1.0,
  'cow-female-001': 1.3,
  dog: 0.6,
  mouse: 0.35,
  pig: 1.0,
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

/**
 * Whether this animal's source art faces left. Every atlas except the mouse does; the mouse
 * faces right (`isFlipped` on its descriptor). Facing logic in Farm / Trial / the gallery
 * has to consult this rather than assuming the whole cast matches.
 */
export function animalArtFacesLeft(id: AnimalSpriteId): boolean {
  return ANIMAL_DESCRIPTORS[id].isFlipped !== true;
}

/**
 * TexturePacker's `anchor` is the frame centre, not the feet. Phaser copies it onto the
 * sprite on every `setFrame` when `customPivot` is set, which undoes the feet origin the
 * moment an animation starts. Only the dog atlas exports these (idle is `{x:0.5,y:0.5}`);
 * a no-op on every other animal. Must run against the whole texture, not the current frame
 * — the next clip frame would just turn it back on.
 */
function ignoreTexturePackerAnchors(texture: Phaser.Textures.Texture): void {
  texture.getFrameNames().forEach((name) => {
    texture.get(name).customPivot = false;
  });
}

/**
 * Pins a sprite's origin at the current frame's visible feet, not the export-canvas bottom.
 *
 * TexturePacker trims transparent pixels but Phaser still sizes the sprite to `sourceSize`
 * (`frame.realWidth` / `realHeight`). `setOrigin(0.5, 1)` therefore lands on empty padding
 * below every animal except the owl, whose canvas already reached the feet. Using the
 * current frame's trim (`frame.y + frame.cutHeight`) keeps each clip on the floor even when
 * its export canvas differs from the rest pose (the dog's sit loop is a different size
 * from its idle). A per-frame origin inside one clip would bounce as the box changed shape,
 * so callers apply this once when a clip starts, not every frame.
 *
 * Call after the sprite has a frame (Farm, Trial and the gallery all do) and before
 * attaching an `AnimalAnimator`, so `captureStaging` records the feet origin. Returns the
 * sprite so it can sit in a `add.sprite(…).setScale(…)` chain.
 */
export function applyAtlasFeetOrigin(sprite: Phaser.GameObjects.Sprite): Phaser.GameObjects.Sprite {
  ignoreTexturePackerAnchors(sprite.texture);
  const frame = sprite.frame;
  if (!frame || frame.realHeight <= 0) {
    return sprite.setOrigin(0.5, 1);
  }
  return sprite.setOrigin(0.5, (frame.y + frame.cutHeight) / frame.realHeight);
}

/**
 * Visible (trimmed) width of the current frame, in display pixels. `sprite.displayWidth` is
 * the untrimmed canvas, which is 25–100% wider than the animal and blows a contact shadow
 * out past the body.
 */
export function atlasTrimmedDisplayWidth(sprite: Phaser.GameObjects.Sprite): number {
  return sprite.frame.cutWidth * Math.abs(sprite.scaleX);
}
