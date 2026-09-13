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
 * `sourceScale * surfaceMultiplier`, chosen so the donkey lands at roughly 140px tall on the
 * farm (next to the 56px placeholder NPCs) and roughly 300px tall in the 1920x540 Trial hole.
 * The donkey was the player when they were fit; Rue wears the raccoon now, which is why the
 * raccoon carries a farm-only `MANUAL_ADJUST` below. That preserves the designed size
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
 * Farm-only lift on every animal except Rue. Her raccoon already carries a 1.5 farm
 * adjust so she reads as the protagonist; without this the rest of the cast looks like
 * it is standing at her feet. Trial is left alone — the podium composition is already fit.
 */
const FARM_NPC_SCALE = 1.2;

/**
 * Per-animal fudge factor applied on top of the ratio-derived scale, for the rare case
 * where the source ratio still doesn't read right once actually seen in this world. A bare
 * number adjusts both surfaces; `{ farm, trial }` adjusts them independently, which the
 * raccoon needs because it is the one animal that shows a *different pose* per surface.
 * Defaults to 1 (no adjustment) for every animal and surface not listed.
 */
const MANUAL_ADJUST: Partial<Record<AnimalSpriteId, number | { farm?: number; trial?: number }>> = {
  /**
   * The sheep's export canvas is by far the cast's smallest, so the source ratio nets her out
   * mid-sized on paper and *small* on screen — next to Rue on a farm road she read as a lamb
   * at his feet rather than an animal he is talking to. 1.68 is 2.1x the 0.8 she used to be
   * on the farm surfaces: a full tripling overshot, reading bigger than the donkey.
   *
   * `trial` keeps the old 0.8: the podium is a fixed 540px hole a cast of three has to fit
   * in, and that composition is already fit — this is a field-scale problem, not a staging one.
   */
  'white-sheep-1': { farm: 1.68, trial: 0.8 },
  /**
   * The two multipliers above were fit so *the player* lands at ~140px on the farm, back when
   * the player was the donkey. Rue is the raccoon now, and the raccoon is the cast's smallest
   * and widest animal: unadjusted its farm crouch renders 135x56, i.e. exactly as tall as the
   * 56px placeholder NPC boxes it is supposed to be the protagonist among.
   *
   * Matching the donkey's old 140px height is not the fix — at 2.4:1 the crouch would come out
   * 336px wide. 1.5 splits the difference at roughly 202x85: unmistakably the biggest thing
   * moving on the farm, without a footprint wider than the barn door. `FARM_NPC_SCALE` does
   * not apply to her, so NPCs grow without her growing with them.
   *
   * `trial` stays at 1. There Rue sits up (`idleTrial`), a taller and much narrower pose, and
   * that is the pose the existing trial multiplier was already staging Tobias in.
   */
  raccoon: { farm: 1.5 },
};

function adjustFor(id: AnimalSpriteId, surface: 'farm' | 'trial'): number {
  const adjust = MANUAL_ADJUST[id];
  let listed = 1;
  if (typeof adjust === 'number') listed = adjust;
  else if (adjust !== undefined) listed = adjust[surface] ?? 1;
  if (surface === 'farm' && id !== 'raccoon') return listed * FARM_NPC_SCALE;
  return listed;
}

export const ANIMAL_STAGING: Record<AnimalSpriteId, AnimalStagingScale> = Object.fromEntries(
  (Object.keys(SOURCE_SCALE) as AnimalSpriteId[]).map((id) => [
    id,
    {
      farmScale: SOURCE_SCALE[id] * FARM_MULTIPLIER * adjustFor(id, 'farm'),
      trialScale: SOURCE_SCALE[id] * TRIAL_MULTIPLIER * adjustFor(id, 'trial'),
    },
  ]),
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
