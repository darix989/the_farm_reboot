/**
 * Cuts one frame out of a ported TexturePacker multiatlas and rebuilds it as a standalone
 * transparent PNG, for use as a generator reference image.
 *
 * This is the step that keeps generated emotions on-model. Ludo's own guidance is that "the
 * most reliable way to keep a set of sprites on-model is to start every animation from a
 * still image you already trust" — so every clip starts from a frame of the character's
 * *existing, shipped* idle loop rather than from a text description of it.
 *
 * The un-trimming matters. TexturePacker frames are trimmed: `frame` is the packed rect,
 * `spriteSourceSize` is where that rect sat inside the original export canvas, and
 * `sourceSize` is that canvas. Handing the generator the trimmed rect alone hands it a
 * sprite cropped hard against its own outline, and it composes the animation as if the
 * character filled the frame — legs and ears end up clipped. Pasting the rect back at its
 * original offset restores the framing the art was drawn with.
 */
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import sharp from 'sharp';
import { boundsOf } from './normalize.mjs';

const ATLAS_DIR = 'public/assets/characters';

/** Locates a frame by filename across a multiatlas's pages. */
function findFrame(atlas, frameName) {
  for (const texture of atlas.textures) {
    const frame = texture.frames.find((f) => f.filename === frameName);
    if (frame) return { frame, image: texture.image };
  }
  return null;
}

/**
 * Returns `{ buffer, width, height }` for one atlas frame as an untrimmed PNG.
 *
 * `animalId` is both the atlas key and its JSON filename; `frameName` is the exact
 * `filename` field from the atlas (the owl's are foldered, e.g.
 * `__owl_no_tail_idle_awake/__owl_no_tail_idle_awake_0.png`).
 */
export async function extractReferenceFrame(animalId, frameName) {
  const atlasPath = join(ATLAS_DIR, `${animalId}.json`);
  const atlas = JSON.parse(await readFile(atlasPath, 'utf8'));

  const hit = findFrame(atlas, frameName);
  if (!hit) {
    const available = atlas.textures
      .flatMap((t) => t.frames.map((f) => f.filename))
      .slice(0, 5)
      .join(', ');
    throw new Error(
      `Frame "${frameName}" is not in ${atlasPath}. First few frames there: ${available}…`,
    );
  }

  const { frame, image } = hit;
  // `textures[].image` is the authority on the page filename, not the animal id — the two
  // disagree for at least one ported animal (see docs/characters-and-animations.md §2).
  const pagePath = join(dirname(atlasPath), image);
  const page = sharp(await readFile(pagePath));

  const trimmed = await page
    .extract({
      left: frame.frame.x,
      top: frame.frame.y,
      width: frame.frame.w,
      height: frame.frame.h,
    })
    .png()
    .toBuffer();

  // Untrimmed frames have no `spriteSourceSize` offset to restore, but the field is present
  // either way in these atlases; defaulting keeps this honest for a hand-written one.
  const canvasWidth = frame.sourceSize?.w ?? frame.frame.w;
  const canvasHeight = frame.sourceSize?.h ?? frame.frame.h;
  const offsetX = frame.spriteSourceSize?.x ?? 0;
  const offsetY = frame.spriteSourceSize?.y ?? 0;

  const buffer = await sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: trimmed, left: offsetX, top: offsetY }])
    .png()
    .toBuffer();

  return { buffer, width: canvasWidth, height: canvasHeight };
}

/**
 * Side of the square canvas a face crop is fitted onto before it is handed to the generator.
 *
 * Square because the API returns square cells whatever it is given, and a non-square input
 * invites it to re-compose the framing to fill one. 512 because that is the cell size the
 * sprite endpoint has actually been returning (see `frame_size` in references/ludo-api.md),
 * so the crop is neither thrown away nor asked to carry detail the output cannot hold.
 */
export const FACE_INPUT_SIZE = 512;

/**
 * Cuts the head out of an un-trimmed reference frame and fits it onto a transparent square,
 * for use as a face clip's generator reference image.
 *
 * ## Why the box is authored against the alpha bounds, not the canvas
 *
 * Export canvases across the ported cast differ by 2.5x (the pig's is 447x314, the raccoon's
 * 1173x946) and the character sits at a different offset inside each one. A canvas-relative
 * rect would therefore have to be re-derived from scratch per animal and would silently
 * break if a reference frame were ever swapped for another pose. Measured against the
 * character's own alpha box — the same box `normalize.mjs` already computes — the numbers
 * mean something transferable: "the leading 57% of the silhouette, top 69% down".
 *
 * ## Why it is upscaled rather than sent at native size
 *
 * A head is a fraction of its export canvas, so crops range from ~350px (raccoon, dog) down
 * to ~130px (sheep, pig). Handing the generator a 130px image and asking for a 512px clip
 * makes it invent the missing detail, which drifts off-model. `lanczos3` to a fixed square
 * first means every animal presents the generator with the same problem, and the source art
 * is flat vector with heavy outlines, which resamples cleanly.
 *
 * `faceBox` is `{ x, y, w, h }` in fractions of the alpha box. Values outside 0..1 are fine
 * and useful — negative `x`/`y` includes air ahead of the muzzle or above the ears — because
 * the resolved rect is clamped to the canvas.
 *
 * Returns the fitted square plus the resolved pixel rect, which the review page prints so
 * an under-resolved crop is visible before any credits are spent.
 */
export async function extractFaceCrop(referenceBuffer, faceBox, size = FACE_INPUT_SIZE) {
  const bounds = await boundsOf(referenceBuffer);
  if (!bounds) throw new Error('Reference frame is fully transparent — nothing to crop a face from');

  const { width: canvasWidth, height: canvasHeight } = await sharp(referenceBuffer).metadata();

  const left = Math.max(0, Math.round(bounds.x + faceBox.x * bounds.width));
  const top = Math.max(0, Math.round(bounds.y + faceBox.y * bounds.height));
  const right = Math.min(canvasWidth, Math.round(bounds.x + (faceBox.x + faceBox.w) * bounds.width));
  const bottom = Math.min(canvasHeight, Math.round(bounds.y + (faceBox.y + faceBox.h) * bounds.height));

  const crop = { left, top, width: right - left, height: bottom - top };
  if (crop.width <= 0 || crop.height <= 0) {
    throw new Error(
      `Face box ${JSON.stringify(faceBox)} resolves to an empty rect on a ` +
        `${canvasWidth}x${canvasHeight} canvas (alpha box ${bounds.width}x${bounds.height})`,
    );
  }

  const buffer = await sharp(referenceBuffer)
    .extract(crop)
    .resize({
      width: size,
      height: size,
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: 'lanczos3',
    })
    .png()
    .toBuffer();

  return { buffer, width: size, height: size, crop, referenceBounds: bounds };
}

/**
 * The reference frame with a crop rect stroked over it, on a light checkerboard.
 *
 * This is the picture the face-box authoring loop is actually judged on: `face.png` shows what
 * the generator will see, but only this shows *what was left out* — an ear clipped by the top
 * edge or a rect that has slid onto the shoulder is obvious here and invisible in the crop.
 * Free to produce, so `--faces --dry-run` always writes it.
 */
export async function strokeRectPreview(referenceBuffer, rect) {
  const { width, height } = await sharp(referenceBuffer).metadata();
  const overlay = Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">` +
      `<rect x="${rect.left}" y="${rect.top}" width="${rect.width}" height="${rect.height}" ` +
      `fill="none" stroke="#ff00aa" stroke-width="${Math.max(2, Math.round(width / 200))}" />` +
      `</svg>`,
  );
  return sharp({
    create: { width, height, channels: 4, background: { r: 244, g: 244, b: 246, alpha: 1 } },
  })
    .composite([{ input: referenceBuffer }, { input: overlay }])
    .png()
    .toBuffer();
}

/** `data:` URI form, which is what both sprite endpoints accept for `initial_image`. */
export function toDataUri(buffer) {
  return `data:image/png;base64,${buffer.toString('base64')}`;
}
