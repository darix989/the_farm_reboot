/**
 * The cast's dialogue portraits — the second, face-only animation register.
 *
 * ## Portraits are crops of the body clips
 *
 * `animalEmotions.ts` opens by explaining that a Trial sprite is ~300px tall, so its face is
 * 50-80px, so every emotion has to be a whole-body posture. A dialogue box asks the opposite
 * question: the posture is out of frame and the face is the whole performance.
 *
 * This file used to answer that by *generating* headshots, and to argue at length that a
 * portrait could not be cropped out of a body clip — "the head is 90-110px of real pixels…
 * blown up to a 112px portrait on a 2x display that is mush". **That was wrong**, and wrong in
 * a specific way worth recording: it measured the head against a 512px generator target rather
 * than against the 112px a portrait actually ships at. Heads run ~100-150px, so a crop
 * *downscales* into the box at 1x and upscales ~1.2-2.2x at 2x DPR, which flat vector art with
 * heavy outlines survives.
 *
 * Generating them instead failed three times for 12 credits — the eyelid aperture swung 165%,
 * 196% and 458% across the clip and two attempts invented teeth the reference does not have —
 * because the endpoint reframes its input and redraws the head from scratch every frame rather
 * than animating the pixels it was given. The body art holds its features still where the
 * generator would not, because it was animating posture and left the face alone. So the
 * portraits are cut locally, for free: see `scripts/ludo/cropFace.mjs` and the `$faceComment`
 * block in `scripts/ludo/emotion-manifest.json`.
 *
 * ## The known limitation
 *
 * Human review of the shipped crops: they are glitch-free — no strobing eye, no flickering
 * tooth, none of the defects generation produced — but it is **obvious they were not authored
 * for a head-only crop**. A portrait wants the face to hold still and only the mouth and eyes
 * to move; here the face translates slightly, because the source is animating the whole animal
 * and the head travels as part of that performance. The aligner removes most of it, not all.
 *
 * Accepted for now rather than fixed. If it needs improving, the next thing to try is narrowing
 * the alignment template from the whole rigid upper head (skull, ears and eye) to just the
 * facial region: when the head *rotates*, the best translation-only match is a compromise that
 * leaves the face offset, so matching on what the viewer actually looks at would pin that and
 * let the ears drift instead. Sub-pixel refinement and a small rotation search would take the
 * rest. The structural answer is that head travel *is* part of a posture animation, so a
 * portrait cut from one will always inherit some of it.
 *
 * ## Why this module has no `phaser` import
 *
 * Face clips are played by React, in the DOM, by `AnimalFace.tsx` — not by Phaser. A portrait
 * lives inside a DOM dialogue box that draws *over* the canvas, so rendering it in Phaser
 * would put it underneath the box it belongs in, and would need a second camera or a
 * transparent hole cut in the overlay to fix. Stepping a CSS `background-position` is what
 * the asset pipeline's own review page already does, and it costs nothing.
 *
 * This file sits in `src/phaser/animals/` anyway, for the same reason `animalEmotions.ts`
 * gives for doing so: everything the cast knows about itself lives here, and splitting the
 * face taxonomy away from the sheets it names would be the worse trade.
 */
import type { AnimalSpriteId } from '../../data/characters';
import type { AnimalEmotion, EmotionQuality } from './animalEmotions';
import { FACE_SHEETS } from './faceSheets.generated';

/** Directory the promoted face sheets live in, relative to the Vite base (`./`). */
export const FACE_ASSET_PATH = 'assets/characters/faces';

/** Side of the portrait box, in CSS px. Mirrored as `FACE_PREVIEW_PX` in the pipeline. */
export const FACE_BOX_PX = 112;

/**
 * How much of the portrait box the head fills.
 *
 * A runtime constant rather than a promoted measurement, deliberately: re-framing the whole
 * cast 8% tighter is an edit to this line, with nothing to re-promote. Mirrored
 * as `FACE_BOX_FILL` in `scripts/ludo/normalize.mjs`, which the review page uses so that what
 * is approved there is framed exactly as it ships.
 */
export const FACE_BOX_FILL = 0.92;

/**
 * Metadata for one promoted portrait. Written by
 * `npm run sprites:emotions -- --faces --promote`, which crops rather than generates.
 *
 * Not an `EmotionSheet`, and not interchangeable with one. A body sheet carries `scale` and a
 * feet origin because it is planted on a floor line at atlas scale beside its castmates; a
 * face sheet carries `cols` and `fit` because it is centred in a box of its own. Three of the
 * body sheet's fields would be structurally present and semantically wrong here, and
 * `applyEmotionStaging` would accept one without complaint and render it 3x too small.
 */
export interface FaceSheet {
  /** Bare filename inside `FACE_ASSET_PATH`. */
  file: string;
  frameWidth: number;
  frameHeight: number;
  /** Total frames to play; the grid's trailing cells may be blank when cols*rows > this. */
  frameCount: number;
  frameRate?: number;
  /**
   * Grid columns — the one field faces need and bodies do not.
   *
   * Phaser addresses spritesheet frames by index and works the grid out from the texture
   * itself. Stepping a CSS `background-position` has to turn a frame index back into a
   * `(col, row)` pair by hand, so the column count has to be recorded. It is not derivable
   * from the image at runtime without loading and measuring it.
   */
  cols: number;
  /**
   * The head's union alpha bounding box across every frame, as fractions of one cell.
   *
   * **Derived from the authored crop rect, not measured from the art.** All five emotions of an
   * animal therefore share one `fit`, which is the point: measuring it back out of the pixels
   * made it differ per emotion (an open snarl reaches further than a shut mouth), and
   * `faceBoxTransform` turned that into a 3% head-size difference between two beats of the same
   * conversation. Since it is arithmetic, `--faces --remeasure` needs neither the pixels nor
   * the atlases. See `fitForRect` in `scripts/ludo/cropFace.mjs`.
   */
  fit: { x: number; y: number; width: number; height: number };
  /**
   * Pipeline measurements. `CROP_QUALITY_THRESHOLDS` drops the generated register's `churn`
   * and `heightSwing` gates — churn catches an interior redrawn every frame, which cannot
   * happen when the pixels are the same art moved, and height swing was a "the generator
   * zoomed" alarm that a fixed crop rect makes meaningless.
   */
  quality?: EmotionQuality;
  /** Human review notes, same contract as `EmotionSheet.reviewNotes`. */
  reviewNotes?: readonly string[];
}

/** The face clip for one pairing, or null when no art has been promoted for it. */
export function faceSheet(
  animalId: AnimalSpriteId | null,
  emotion: AnimalEmotion,
): FaceSheet | null {
  if (!animalId) return null;
  return FACE_SHEETS[animalId]?.[emotion] ?? null;
}

/**
 * The clip to actually play for a pairing, falling back to `talking` before giving up.
 *
 * This is what lets the register ship one animal at a time: `donkey-grey` has no portraits at
 * all (its body clips carry the cast's worst loop seams, which cropping amplifies ~4x), so Rue
 * stays text-only while everyone else has all five. Callers never have to check — the same
 * discipline `AnimalAnimator.playEmotion()` follows when it falls back to `playAlert()`.
 */
export function resolvedFaceSheet(
  animalId: AnimalSpriteId | null,
  emotion: AnimalEmotion,
): FaceSheet | null {
  return faceSheet(animalId, emotion) ?? faceSheet(animalId, 'talking');
}

/** Whether this animal has any face art at all. */
export function hasFaceArt(animalId: AnimalSpriteId | null): boolean {
  return animalId != null && Object.keys(FACE_SHEETS[animalId] ?? {}).length > 0;
}

/** Emotions this animal has portrait art for, in vocabulary order. */
export function generatedFaceEmotions(animalId: AnimalSpriteId): AnimalEmotion[] {
  return Object.keys(FACE_SHEETS[animalId] ?? {}) as AnimalEmotion[];
}

/**
 * URL for a face sheet.
 *
 * Relative, with no leading slash, because `vite/config.*.mjs` set `base: './'` and every
 * Phaser load already uses a relative `assets/...` path. A leading `/` works in dev and
 * silently 404s on any sub-path deploy.
 */
export function faceSheetUrl(file: string): string {
  return `${FACE_ASSET_PATH}/${file}`;
}

/**
 * The transform that centres a face clip's head inside a `size`-px box.
 *
 * Mirror of `faceBoxTransform` in `scripts/ludo/normalize.mjs` — kept in lockstep so the
 * offline review page frames a portrait identically to the game. A contact sheet that stages
 * clips its own way is worse than no contact sheet; it is why `applyEmotionStaging` is shared
 * between the Trial and the gallery rather than reimplemented in each.
 *
 * Scales off `max(headWidth, headHeight)` so a non-square head box — all of them, since the
 * crops are not square and are contain-fitted into a square cell — is fitted without
 * distortion. Apply as `transform: translate(x, y) scale(z)` with `transform-origin: 0 0` on
 * an element sized `frameWidth x frameHeight`.
 */
export function faceBoxTransform(
  sheet: FaceSheet,
  size: number = FACE_BOX_PX,
  fill: number = FACE_BOX_FILL,
): { z: number; x: number; y: number } {
  const headWidth = sheet.fit.width * sheet.frameWidth;
  const headHeight = sheet.fit.height * sheet.frameHeight;
  const z = (size * fill) / Math.max(headWidth, headHeight);
  const centreX = (sheet.fit.x + sheet.fit.width / 2) * sheet.frameWidth;
  const centreY = (sheet.fit.y + sheet.fit.height / 2) * sheet.frameHeight;
  return { z, x: size / 2 - centreX * z, y: size / 2 - centreY * z };
}

/** `background-position` for one frame of a face sheet. */
export function faceFramePosition(sheet: FaceSheet, frame: number): string {
  const col = frame % sheet.cols;
  const row = Math.floor(frame / sheet.cols);
  return `${-col * sheet.frameWidth}px ${-row * sheet.frameHeight}px`;
}

/**
 * Warms the HTTP cache for an animal's portraits.
 *
 * A dialogue box opens in one frame; a 200KB sheet does not decode in one frame, so without
 * this the first portrait of a conversation pops in a beat late. `new Image()` is enough —
 * the CSS `url()` that follows hits the same cache entry.
 */
export function preloadFaceSheets(animalId: AnimalSpriteId | null): void {
  if (!animalId || typeof Image === 'undefined') return;
  for (const emotion of generatedFaceEmotions(animalId)) {
    const sheet = faceSheet(animalId, emotion);
    if (sheet) new Image().src = faceSheetUrl(sheet.file);
  }
}
