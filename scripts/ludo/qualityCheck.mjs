/**
 * Numeric quality gates for a generated clip, so review is not purely "does this look ok".
 *
 * Both metrics here were derived from real failures on the first generated cast, and each one
 * catches something that is genuinely hard to see in a single loop but obvious once the clip
 * is in the game:
 *
 * **`loopPop`** — how different the last frame is from the first, as a percentage. A looping
 * clip should return to where it started; when it does not, the seam shows as a jump on every
 * repeat. Ludo's `loop: true` is a hint the generator can miss: the first `sneaky` clip read
 * "crouched low" as an instruction to lie the donkey down and never stood it back up, scoring
 * 5.88%. Pinning `final_image` (the manifest's `closeLoop`) took it to 0.22%.
 *
 * **`heightSwing`** — how much the character's height varies across the clip, as a percentage
 * of its tallest frame. This one matters because of how clips are staged: `normalize.mjs`
 * derives one scale from the *union* bounding box, so a character whose height wanders renders
 * smaller than the atlas art for most of the clip. Some swing is legitimate (a head dipping),
 * which is why this warns rather than blocks.
 *
 * **`driftX`** — how far the character's centre wanders horizontally. The stage slot is fixed,
 * so a clip that slides is a clip that will look unmoored next to its neighbours.
 */
import { boundsOf, frameAt } from './normalize.mjs';

/**
 * Above these, print a warning. They are thresholds for *attention*, not rejection — the call
 * is still the reviewer's, and a clip can be over one of these and still be the right clip.
 */
export const QUALITY_THRESHOLDS = {
  /** Below ~1% the seam is invisible; by 3% it reads as a stutter every loop. */
  loopPop: 2,
  /** Beyond this the union-box scale noticeably under-sizes the character. */
  heightSwing: 20,
  /** In frame pixels, half the total wander. */
  driftX: 20,
};

/**
 * Mean per-pixel difference between two raw RGBA buffers of equal size, as a percentage.
 *
 * Red and alpha only, not all four channels: alpha catches a silhouette that moved, red
 * catches a recoloured or reshaped body, and the pair is enough to rank clips against each
 * other. Comparing all channels would change the absolute numbers but not the ordering, and
 * the thresholds above are calibrated to this measure.
 */
function meanDifference(a, b) {
  let total = 0;
  for (let i = 0; i < a.length; i += 4) {
    total += Math.abs(a[i] - b[i]) + Math.abs(a[i + 3] - b[i + 3]);
  }
  return total / (a.length / 4) / 510 * 100;
}

async function rawFrame(sheetBuffer, index, grid) {
  const png = await frameAt(sheetBuffer, index, grid);
  const { default: sharp } = await import('sharp');
  return sharp(png).ensureAlpha().raw().toBuffer();
}

/**
 * Returns `{ loopPop, heightSwing, driftX, warnings }` for one generated clip.
 *
 * `grid` is the `{ cols, frameWidth, frameHeight, frameCount }` the generator reported.
 */
export async function measureClipQuality(sheetBuffer, grid) {
  const first = await rawFrame(sheetBuffer, 0, grid);
  const last = await rawFrame(sheetBuffer, grid.frameCount - 1, grid);
  const loopPop = meanDifference(first, last);

  const heights = [];
  const centres = [];
  for (let i = 0; i < grid.frameCount; i++) {
    const box = await boundsOf(await frameAt(sheetBuffer, i, grid));
    if (!box) continue;
    heights.push(box.height);
    centres.push(box.x + box.width / 2);
  }

  const span = (values) => (values.length ? Math.max(...values) - Math.min(...values) : 0);
  const heightSwing = heights.length ? (span(heights) / Math.max(...heights)) * 100 : 0;
  const driftX = span(centres) / 2;

  const warnings = [];
  if (loopPop > QUALITY_THRESHOLDS.loopPop) {
    warnings.push(
      `loop seam ${loopPop.toFixed(2)}% (over ${QUALITY_THRESHOLDS.loopPop}%) — it will visibly jump on every repeat`,
    );
  }
  if (heightSwing > QUALITY_THRESHOLDS.heightSwing) {
    warnings.push(
      `height swing ${heightSwing.toFixed(0)}% (over ${QUALITY_THRESHOLDS.heightSwing}%) — check it is motion, not the character changing pose`,
    );
  }
  if (driftX > QUALITY_THRESHOLDS.driftX) {
    warnings.push(
      `horizontal drift ±${driftX.toFixed(0)}px (over ${QUALITY_THRESHOLDS.driftX}px) — it will look unmoored in a fixed stage slot`,
    );
  }

  return {
    loopPop: Number(loopPop.toFixed(2)),
    heightSwing: Number(heightSwing.toFixed(1)),
    driftX: Number(driftX.toFixed(1)),
    warnings,
  };
}
