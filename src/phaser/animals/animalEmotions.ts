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
  /**
   * Approving: won over, weight settling, a slow satisfied nod.
   *
   * Authored for the moderator status indicator rather than the stage — see the note below.
   */
  'approving',
  /**
   * `talking` again, but with the body and head **locked still** so only the face moves.
   *
   * A portrait source, not a stage posture — see the "still variants" note below. Playing it on
   * the Trial stage is not wrong, just pointless: at 300px a motionless animal reads as an idle
   * loop, which is exactly why every other entry here names a posture instead.
   */
  'talking_still',
] as const;

/**
 * ## `approving` exists for a still frame, not for the stage
 *
 * The debate's moderator status used to be three text emoji (😊 / 😐 / 😠) sitting next to a cast
 * of hand-drawn animals — the one place in the trial UI where the art stopped. Duchess the owl
 * *is* the moderator, so `approving` was generated to give her a pleased face: nothing in the
 * vocabulary was one, and her existing clips only covered a glare and a level neutral.
 *
 * It is therefore the second entry here (after `talking_still`) that names something other than
 * a stage posture, and for the opposite reason: `talking_still` takes motion *out* of a posture
 * for the portrait crop, while `approving` is a posture nobody plays at 300px. Nothing in
 * `activeEmotionForWorkflow` derives it — the status indicator picks its frames directly. Playing
 * it on stage is not wrong (a convinced listener nodding is a real beat), just currently unused.
 *
 * It ended up carrying **all three** of Duchess's status states rather than one, which is
 * the better design for her and was not the plan. Its 25 frames open the owl's eyes from
 * nearly shut to fully round, so three frames of this one clip give three apertures of an
 * otherwise identical head — the eyes are the only thing that changes, and "how much bright
 * yellow is left" is a single monotonic quantity a player can read at ~1.6em. Cass's fox
 * stills do the opposite on purpose: three portraits (`sneaky` / `doubtful` / `angry`),
 * because no single fox clip opens along one axis that way. See `moderatorOpinionFace()` in
 * `src/react/trial/utils/trialHelpers.ts`.
 *
 * ## Still variants (`<emotion>_still`)
 *
 * These exist because the two registers want opposite things from the same clip, and until now
 * one clip served both.
 *
 * Every `talking` prompt in the manifest asks for "head bobbing gently in time with speech",
 * deliberately: at 300px a bobbing head is *what reads as talking*, and a motionless one reads
 * as idle. But `scripts/ludo/cropFace.mjs` cuts dialogue portraits out of these same clips, and
 * a portrait wants the opposite — the face held still in its box with only the mouth and eyes
 * moving. Human review of the first cropped portraits put it plainly: glitch-free, but obviously
 * not authored for a head-only crop, because the face translates. It was translating because the
 * prompt asked it to.
 *
 * A `_still` variant asks for the same emotion with the travel taken out. The cropper prefers
 * `<emotion>_still` as its source when one has been promoted and falls back to `<emotion>`
 * otherwise, so it is an *optional* per-animal upgrade rather than a migration: an animal
 * without one keeps the portrait it already had. The stage keeps using the bobbing original —
 * nothing derives a `_still` emotion in `activeEmotionForWorkflow`, and nothing should.
 *
 * ### It does not deliver the stillness it asks for
 *
 * Measured on the first one (`donkey-grey/talking_still`), and worth knowing before generating
 * more. Change per frame in the skull-and-ears band of the finished portrait — a band that
 * carries no speech animation, so anything moving in it is pose change the aligner cannot
 * remove:
 *
 * | portrait cut from | skull+ears change/frame | crop loop seam |
 * |---|---|---|
 * | `talking` (bobbing) | 1.07% | 4.15% — fails the 2% gate |
 * | `talking_still` | **2.54%** | **0.56%** — passes |
 *
 * So the prompt made the head *twice as unstable*, not stiller: with the body pinned the
 * generator moved the head instead, and added a ~22px lateral slide the bobbing clip did not
 * have. For context the shipped cast runs 0.53% (owl) to 2.12% (white-sheep-1), so the still
 * variant is the wobbliest portrait in the game.
 *
 * It shipped anyway, for a reason that has nothing to do with its name: the fresh generation
 * **fixed the loop seam**. `donkey-grey`'s body clips carry the cast's worst seams, cropping
 * amplifies them ~4x, and that — not the head bob — was what kept Rue text-only. A clean loop
 * with a wobbly head beats a visible jump every two seconds.
 *
 * Do not generate the remaining four still variants expecting a stiller head. If stillness is
 * the goal, the lever is the cropper (narrow the alignment template to the facial region), not
 * the prompt.
 */

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
  /**
   * Mean and worst difference between *consecutive* frames. Present only on clips promoted
   * while the generated face register existed; nothing measures it today.
   *
   * It was built to catch a mouth interior or pupil redrawn differently in every frame, which
   * `loopPop` cannot see because it only compares the first frame to the last. That defect
   * belonged to *generated* headshots and cannot occur in a crop, where the pixels are the same
   * drawn art moved — so `CROP_QUALITY_THRESHOLDS` drops the gate. Worth knowing it also has a
   * blind spot: comparing consecutive frames, it reported nothing at all on the worst generated
   * clip, whose eye closed slowly over six frames. It catches pops, not ramps.
   */
  churnMean?: number;
  churnPeak?: number;
  churnPeakIndex?: number;
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
  /**
   * Human review notes. Survive `--remeasure` (which rewrites `quality`) and turn the
   * gallery badge to warn even when the numeric gates are clean.
   */
  reviewNotes?: readonly string[];
}
