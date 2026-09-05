/**
 * Measures how a generated spritesheet has to be scaled and anchored to drop into a slot
 * staged for the original atlas art.
 *
 * ## The problem this solves
 *
 * A ported atlas frame and a generated frame are not comparable canvases. Rue's idle frame is
 * a 784x702 export canvas with the donkey filling most of it; a generated clip is a grid of
 * (say) 256x256 cells with the donkey somewhere inside, at whatever size and offset the
 * generator chose. `ANIMAL_STAGING` scales the sprite on the assumption that the frame *is*
 * the atlas canvas. Staging used to also assume feet sat at the canvas bottom
 * (`setOrigin(0.5, 1)`); that was only true of the owl, so Farm shadows and the Trial floor
 * floated below everyone else. Atlas sprites now pin originY at the rest-frame trim
 * (`applyAtlasFeetOrigin`). A generated cell matches neither atlas scale nor that feet
 * origin, so playing one unchanged renders the animal at the wrong size, off the floor line.
 *
 * ## The fix
 *
 * Measure both — the character's alpha bounding box in the reference frame, and its union
 * bounding box across every frame of the generated sheet — and derive:
 *
 *   - `scale`:   multiplier on the staging scale that makes the character the same height it
 *                is in the atlas art.
 *   - `originX`, `originY`: the origin that puts the sprite's anchor at the character's
 *                feet — the same place `applyAtlasFeetOrigin` pins it on an atlas frame.
 *                `originX` still matches the atlas canvas centre (walk cycles were authored
 *                around it); `originY` is the bottom of the generated union box.
 *
 * The union box (not per-frame) is deliberate: a per-frame origin would make the character
 * twitch as the box changed shape between frames. One box for the clip means the character
 * moves within a stable anchor, which is what an animation is.
 *
 * Doing this at promote time keeps the runtime dumb — `AnimalAnimator` applies two numbers it
 * is handed and never measures anything — and keeps the shipped PNGs small, which asking the
 * generator for atlas-sized frames would not.
 */
import sharp from 'sharp';

/** Alpha at or below this counts as background. Generated edges are soft, so not zero. */
const ALPHA_THRESHOLD = 8;

/**
 * Tight bounding box of the non-transparent pixels in a raw RGBA buffer, or null when the
 * image is fully transparent.
 */
function alphaBounds({ data, width, height }) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] <= ALPHA_THRESHOLD) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < 0) return null;
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

export async function boundsOf(buffer) {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return alphaBounds({ data, width: info.width, height: info.height });
}

/** One cell of the grid, as a standalone PNG. Shared with the quality check. */
export async function frameAt(sheetBuffer, index, { cols, frameWidth, frameHeight }) {
  return sharp(sheetBuffer)
    .extract({
      left: (index % cols) * frameWidth,
      top: Math.floor(index / cols) * frameHeight,
      width: frameWidth,
      height: frameHeight,
    })
    .png()
    .toBuffer();
}

/** Union of the character's box across every cell of the grid that holds a frame. */
export async function sheetBounds(sheetBuffer, grid) {
  let union = null;

  for (let i = 0; i < grid.frameCount; i++) {
    const box = await boundsOf(await frameAt(sheetBuffer, i, grid));
    if (!box) continue;
    union = union
      ? {
          x: Math.min(union.x, box.x),
          y: Math.min(union.y, box.y),
          width: Math.max(union.x + union.width, box.x + box.width) - Math.min(union.x, box.x),
          height: Math.max(union.y + union.height, box.y + box.height) - Math.min(union.y, box.y),
        }
      : box;
  }

  return union;
}

/**
 * Returns `{ scale, originX, originY }` for one generated clip, plus the measurements they
 * came from so a surprising number can be traced back to a picture rather than guessed at.
 *
 * `referenceBuffer` is the untrimmed atlas frame the clip was generated from — the same image
 * the base animation renders, which is what makes the two directly comparable.
 */
export async function measureNormalization(sheetBuffer, referenceBuffer, grid) {
  const reference = await boundsOf(referenceBuffer);
  if (!reference) throw new Error('Reference frame is fully transparent');

  const sheet = await sheetBounds(sheetBuffer, grid);
  if (!sheet) throw new Error('Generated spritesheet is fully transparent');

  const referenceMeta = await sharp(referenceBuffer).metadata();

  // Match the character's height. Height rather than width because the cast is staged on a
  // floor line and sized against each other vertically (see `animalStaging.ts`); a clip that
  // gestures sideways would otherwise be shrunk by its own gesture.
  const scale = reference.height / sheet.height;

  // Atlas staging pins originX at the canvas centre (walk cycles were authored around it)
  // and originY at the visible feet (`applyAtlasFeetOrigin`). Copy that onto the generated
  // cell: horizontally off the character's centre by the same canvas-centre offset,
  // vertically at the bottom of the union box — no extra pad below the feet.
  const anchorOffsetX = referenceMeta.width * 0.5 - (reference.x + reference.width / 2);
  const toSheetPixels = sheet.height / reference.height;
  const anchorX = sheet.x + sheet.width / 2 + anchorOffsetX * toSheetPixels;
  const anchorY = sheet.y + sheet.height;

  return {
    scale: Number(scale.toFixed(4)),
    originX: Number((anchorX / grid.frameWidth).toFixed(4)),
    originY: Number((anchorY / grid.frameHeight).toFixed(4)),
    measured: { reference, sheet, referenceCanvas: { width: referenceMeta.width, height: referenceMeta.height } },
  };
}

// ---------------------------------------------------------------------------
// faces
// ---------------------------------------------------------------------------

/**
 * How much of the portrait box the head fills. A runtime/review constant, not a shipped
 * measurement, so re-framing the whole cast 8% tighter is a one-line edit with no credits
 * spent and no re-promote. Mirrored in `src/phaser/animals/animalFaces.ts`.
 */
export const FACE_BOX_FILL = 0.92;

/**
 * Measures how a generated *face* clip has to be placed inside a square portrait box.
 *
 * The body measurement above answers "how big is this character and where are its feet",
 * because a body clip is staged on a floor line at atlas scale next to other animals. None of
 * that means anything for a portrait: there is no floor, no neighbour to be sized against,
 * and no atlas frame to match — a dialogue portrait just has to sit centred in its box at a
 * consistent size, whatever the generator chose to do with the cell.
 *
 * So this ships the union head box as fractions of one cell and nothing else. Note what it
 * does *not* need: the reference frame. `measureNormalization` has to re-extract the atlas
 * frame to know what height to match, which is why `--remeasure` reaches back into the
 * atlases; a face clip is self-describing, so `--faces --remeasure` needs only the shipped
 * PNG and can never drift because an atlas was repacked.
 *
 * Union across every frame, not per-frame, for the same reason the body pipeline uses it: a
 * per-frame centre would make the head twitch inside its own box, which is precisely the
 * defect a stable anchor exists to prevent.
 */
export async function measureFaceNormalization(sheetBuffer, grid) {
  const union = await sheetBounds(sheetBuffer, grid);
  if (!union) throw new Error('Generated face spritesheet is fully transparent');

  const round = (value) => Number(value.toFixed(4));
  return {
    fit: {
      x: round(union.x / grid.frameWidth),
      y: round(union.y / grid.frameHeight),
      width: round(union.width / grid.frameWidth),
      height: round(union.height / grid.frameHeight),
    },
    measured: { union, cell: { width: grid.frameWidth, height: grid.frameHeight } },
  };
}

/**
 * Turns a face clip's `fit` box into the transform that centres the head in a `size`-px box.
 *
 * Exported from the pipeline and mirrored in `animalFaces.ts` so the review page and the game
 * frame a portrait *identically*. A contact sheet that stages clips its own way is worse than
 * no contact sheet — it is the reason `applyEmotionStaging` is shared between the Trial and
 * the gallery rather than reimplemented in each.
 *
 * Uses `max(headW, headH)` so a non-square head box (every one of them: the crops are not
 * square and the generator pads them to a square cell) is fitted without distortion.
 * Apply as `transform: translate(x, y) scale(z)` with `transform-origin: 0 0` on a
 * `frameWidth x frameHeight` element.
 */
export function faceBoxTransform(fit, frameWidth, frameHeight, size, fill = FACE_BOX_FILL) {
  const headWidth = fit.width * frameWidth;
  const headHeight = fit.height * frameHeight;
  const z = (size * fill) / Math.max(headWidth, headHeight);
  const centreX = (fit.x + fit.width / 2) * frameWidth;
  const centreY = (fit.y + fit.height / 2) * frameHeight;
  return { z, x: size / 2 - centreX * z, y: size / 2 - centreY * z };
}
