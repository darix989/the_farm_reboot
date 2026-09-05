/**
 * The cast's dialogue portraits — the second, face-only animation register.
 *
 * ## Why these exist separately from the emotion clips
 *
 * `animalEmotions.ts` opens by explaining that a Trial sprite is ~300px tall, so its face is
 * 50-80px, so every emotion has to be a whole-body posture. That reasoning is sound and it is
 * exactly why the body clips cannot be reused here: a dialogue box shows one character at
 * conversational distance, where the posture is out of frame and the face is the entire
 * performance. The two registers answer opposite questions about the same animal.
 *
 * Nor can a portrait be cropped out of a body clip. A promoted emotion sheet is a grid of
 * 512px cells holding the whole animal, so the head is 90-110px of real pixels — measured on
 * `fox-talking` and `raccoon-talking`. Blown up to a 112px portrait on a 2x display that is
 * mush. The headshots are generated instead, from a crop of the same *un-trimmed atlas
 * reference frame* the body clips start from (754x544 for the fox, 1173x946 for the raccoon),
 * which has the resolution to spare. See `extractFaceCrop` in `scripts/ludo/referenceFrame.mjs`
 * and the `$faceComment` block in `scripts/ludo/emotion-manifest.json`.
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
 * cast 8% tighter is an edit to this line, with no credits spent and no re-promote. Mirrored
 * as `FACE_BOX_FILL` in `scripts/ludo/normalize.mjs`, which the review page uses so that what
 * is approved there is framed exactly as it ships.
 */
export const FACE_BOX_FILL = 0.92;

/**
 * Metadata for one promoted face clip. Written by
 * `npm run sprites:emotions -- --faces --promote`.
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
   * Union rather than per-frame for the same reason the body pipeline uses a union box: a
   * per-frame centre would make the head twitch inside its own portrait, which is the exact
   * defect a stable anchor exists to prevent. Measured at promote time from the sheet alone —
   * unlike a body clip, a portrait needs no atlas frame to be measured against, so
   * `--faces --remeasure` can re-derive this forever without touching the atlases.
   */
  fit: { x: number; y: number; width: number; height: number };
  /** Pipeline measurements, including the face-only `churn*` flicker numbers. */
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
 * This is what lets the register ship one emotion at a time: an animal with only `talking`
 * art still gets a real portrait on every line, and its other four emotions light up as they
 * are generated. Callers never have to check — the same discipline
 * `AnimalAnimator.playEmotion()` follows when it falls back to `playAlert()`.
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

/** Emotions this animal has face art for, in vocabulary order. */
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
 * crops are not square and the generator pads them into a square cell — is fitted without
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
