/**
 * The emotional register a staged animal can play, and how a debate round picks one.
 *
 * The ported cast only knows two states — `idle` and `alert` (see `AnimalAnimator`) — which
 * is enough for a background herd but not for a debate: every speaker "reacts" identically
 * no matter whether they are conceding a point, sneering at one, or slipping a fallacy past
 * the player. These emotions are the vocabulary that fixes that.
 *
 * The list is deliberately small and *readable at stage scale*. A Trial sprite is ~300px
 * tall (`animalStaging.ts`), so its face is 50-80px: nothing subtler than a whole-body
 * posture change survives the downscale. Each entry below therefore names a posture, not an
 * expression — see `scripts/ludo/emotion-manifest.json`, where each one becomes a motion
 * prompt phrased in exactly those terms.
 *
 * This module is deliberately free of any `phaser` import even though it sits under
 * `src/phaser/`: `AnimalEmotion` is shared vocabulary — the debate scenarios author it, the
 * React overlay derives it, `trialStageStore` carries it and only then does Phaser play it.
 * It lives here anyway because everything else the cast knows about itself lives here, and
 * splitting the taxonomy away from the sheets it names would be the worse trade.
 *
 * Art for these is generated, not hand-drawn — `scripts/generate-emotion-sprites.mjs`
 * animates a trusted rest frame from each animal's existing atlas via the Ludo.ai API, so
 * the character stays on-model. An animal with no generated clip for an emotion simply
 * falls back to `idle`/`alert`, so this list can grow ahead of the art.
 */

/** Order is authoring order only; nothing depends on the index. */
export const ANIMAL_EMOTIONS = [
  /** Neutral delivery. The default whenever a character holds the floor. */
  'talking',
  /** Doubtful / skeptical: weight back, head tilted away from the speaker. */
  'doubtful',
  /** Angry: weight forward, head low and squared at the target. */
  'angry',
  /** Thinking: still, head down and turned slightly off-axis. */
  'thinking',
  /** Sneaky, "sus": low and conspiratorial, glancing sideways mid-line. */
  'sneaky',
] as const;

export type AnimalEmotion = (typeof ANIMAL_EMOTIONS)[number];

export function isAnimalEmotion(value: string): value is AnimalEmotion {
  return (ANIMAL_EMOTIONS as readonly string[]).includes(value);
}

/**
 * Frame rate for generated emotion clips. Matches the ported atlases' default (12) so an
 * emotion clip and an `idle` loop read as the same character moving at the same tempo — a
 * generated clip running visibly faster than the hand-authored idle is the most obvious
 * "these came from different places" tell.
 */
export const EMOTION_FRAME_RATE = 12;

/**
 * Manifest default `frames`. Older promoted clips shipped 16 frames at 8fps; those are the
 * choppy generation. The gallery treats anything other than this count as a quality warn.
 */
export const CURRENT_EMOTION_FRAME_COUNT = 25;

/**
 * Numeric gates from `scripts/ludo/qualityCheck.mjs`. Duplicated here so the gallery can
 * classify a clip without importing the Node pipeline. Keep them in lockstep.
 */
export const EMOTION_QUALITY_THRESHOLDS = {
  /** Below ~1% the seam is invisible; by 3% it reads as a stutter every loop. */
  loopPop: 2,
  /** Beyond this the union-box scale noticeably under-sizes the character. */
  heightSwing: 20,
  /** In frame pixels, half the total wander. */
  driftX: 20,
} as const;

/** Pipeline measurements written into a promoted clip when they were recorded. */
export interface EmotionQuality {
  loopPop: number;
  heightSwing: number;
  driftX: number;
  warnings: readonly string[];
}

/**
 * Metadata for one generated clip. Uniform-grid spritesheets (`load.spritesheet`), NOT the
 * trimmed TexturePacker multiatlases the base animations use: Ludo returns a fixed grid,
 * and repacking it into an atlas would buy nothing — the frames are already uniform, and
 * two loaders side by side is less code than a repack step in the asset pipeline.
 */
export interface EmotionSheet {
  /** Bare filename inside `EMOTION_ASSET_PATH` — the loader supplies the directory. */
  file: string;
  frameWidth: number;
  frameHeight: number;
  /** Total frames to play; the grid's trailing cells may be blank when cols*rows > this. */
  frameCount: number;
  frameRate?: number;
  /**
   * Multiplier on the sprite's staged scale while this clip plays.
   *
   * A generated cell is not the atlas canvas: the character sits at whatever size the
   * generator chose inside a small square, while `ANIMAL_STAGING` was tuned against the
   * export canvas of the original art. Without this the animal changes size the moment it
   * reacts. Measured at promote time by comparing the character's alpha bounding box in the
   * clip against the same box in the atlas frame it was generated from — see
   * `scripts/ludo/normalize.mjs`.
   */
  scale: number;
  /**
   * Origin to use while this clip plays, replacing the staged atlas feet origin.
   *
   * Same cause as `scale`: the character's feet are not at the bottom of a generated cell, so
   * a bottom-anchored sprite floats above the stage floor. These put the anchor at the
   * character's feet — the same place `applyAtlasFeetOrigin` pins it on an atlas frame.
   */
  originX: number;
  originY: number;
  /**
   * Pipeline measurements, written at promote/reindex when the promoted record has them.
   * Absent on clips promoted before quality was stored.
   */
  quality?: EmotionQuality;
}
