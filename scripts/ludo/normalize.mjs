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
 * the atlas canvas, and `Trial` anchors it with `setOrigin(0.5, 1)` on the assumption that
 * the character's feet are near the canvas bottom. Neither holds for a generated cell, so
 * playing one unchanged renders the animal at the wrong size, floating off the floor line.
 *
 * ## The fix
 *
 * Measure both — the character's alpha bounding box in the reference frame, and its union
 * bounding box across every frame of the generated sheet — and derive:
 *
 *   - `scale`:   multiplier on the staging scale that makes the character the same height it
 *                is in the atlas art.
 *   - `originX`, `originY`: the origin that puts the sprite's anchor in the same place
 *                relative to the character that `(0.5, 1)` puts it in the atlas frame.
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

async function boundsOf(buffer) {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return alphaBounds({ data, width: info.width, height: info.height });
}

/** Union of the character's box across every cell of the grid that holds a frame. */
async function sheetBounds(sheetBuffer, { cols, frameWidth, frameHeight, frameCount }) {
  let union = null;

  for (let i = 0; i < frameCount; i++) {
    const cell = await sharp(sheetBuffer)
      .extract({
        left: (i % cols) * frameWidth,
        top: Math.floor(i / cols) * frameHeight,
        width: frameWidth,
        height: frameHeight,
      })
      .png()
      .toBuffer();

    const box = await boundsOf(cell);
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

  // Where `setOrigin(0.5, 1)` sits relative to the character in the atlas frame, in reference
  // pixels: horizontally off its centre, vertically below its feet.
  const anchorOffsetX = referenceMeta.width * 0.5 - (reference.x + reference.width / 2);
  const anchorOffsetY = referenceMeta.height - (reference.y + reference.height);

  // Convert that offset into generated-frame pixels, then express it as an origin fraction.
  const toSheetPixels = sheet.height / reference.height;
  const anchorX = sheet.x + sheet.width / 2 + anchorOffsetX * toSheetPixels;
  const anchorY = sheet.y + sheet.height + anchorOffsetY * toSheetPixels;

  return {
    scale: Number(scale.toFixed(4)),
    originX: Number((anchorX / grid.frameWidth).toFixed(4)),
    originY: Number((anchorY / grid.frameHeight).toFixed(4)),
    measured: { reference, sheet, referenceCanvas: { width: referenceMeta.width, height: referenceMeta.height } },
  };
}
