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
 *
 * **`churn`** (face clips only) — the mean difference between *consecutive* frames, and the
 * worst such pair. `loopPop` compares frame 0 to frame N-1 and is therefore completely blind
 * to a mouth interior or a pupil that is redrawn differently in every single frame: the clip
 * can return exactly to its start and still strobe for the whole two seconds in between. That
 * defect is a minor artifact on a 300px body sprite and the loudest thing in the clip on a
 * portrait, where the mouth fills a fifth of the frame — so faces measure it and bodies do
 * not. `churnPeakIndex` names the frame pair to zoom into, which automates the "crop the head
 * from a handful of frames and lay them side by side" step SKILL.md rule 7 asks for by hand.
 */
import sharp from 'sharp';
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
 * The same gates recalibrated for a headshot, which is a different measurement problem.
 *
 * `loopPop` is unchanged — a seam is a seam. The other two are much tighter:
 *
 * - `heightSwing` 20% → **8%**. On a body clip a wandering height is a head dipping, which is
 *   the motion you asked for. Inside a fixed portrait box it is the generator *zooming*, which
 *   is the one failure a face clip must not have — so this doubles as the automatic detector
 *   for the framing rule (F2 in the manifest's `$faceComment`) having been ignored.
 * - `driftX` becomes a **ratio of the frame width** rather than an absolute pixel count. Face
 *   cells are smaller than body cells, so the body's flat 20px would quietly tolerate an 8%
 *   slide on a 256px cell — a head visibly sliding out of its box.
 */
export const FACE_QUALITY_THRESHOLDS = {
  loopPop: 2,
  heightSwing: 8,
  /** Fraction of `frameWidth`, resolved against the actual grid. */
  driftXRatio: 0.04,
  /** Flag the worst consecutive-frame pair once it is this many times the mean. */
  churnPeakRatio: 2.5,
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

/**
 * Returns `{ loopPop, heightSwing, driftX, warnings }` for one generated clip, plus
 * `{ churnMean, churnPeak, churnPeakIndex }` when the threshold set asks for churn.
 *
 * `grid` is the `{ cols, frameWidth, frameHeight, frameCount }` the generator reported.
 * `thresholds` selects the gate set — `QUALITY_THRESHOLDS` for body clips (the default, so
 * every existing caller is unchanged) or `FACE_QUALITY_THRESHOLDS` for headshots.
 */
export async function measureClipQuality(sheetBuffer, grid, thresholds = QUALITY_THRESHOLDS) {
  const wantsChurn = thresholds.churnPeakRatio != null;

  const heights = [];
  const centres = [];
  const churn = [];
  let first = null;
  let last = null;
  let previous = null;

  // One pass over the grid. Each cell is decoded once and then used for every metric that
  // needs it — bounds for height/drift, raw pixels for the loop seam and for churn against
  // the frame before it. Decoding a 512px cell twice was measurable on a 25-frame sheet.
  for (let i = 0; i < grid.frameCount; i++) {
    const png = await frameAt(sheetBuffer, i, grid);

    const box = await boundsOf(png);
    if (box) {
      heights.push(box.height);
      centres.push(box.x + box.width / 2);
    }

    if (i === 0 || i === grid.frameCount - 1 || wantsChurn) {
      const raw = await sharp(png).ensureAlpha().raw().toBuffer();
      if (i === 0) first = raw;
      if (i === grid.frameCount - 1) last = raw;
      if (wantsChurn && previous) churn.push(meanDifference(previous, raw));
      previous = raw;
    }
  }

  const loopPop = first && last ? meanDifference(first, last) : 0;

  const span = (values) => (values.length ? Math.max(...values) - Math.min(...values) : 0);
  const heightSwing = heights.length ? (span(heights) / Math.max(...heights)) * 100 : 0;
  const driftX = span(centres) / 2;

  // Absolute px for bodies, a fraction of the cell for faces — see FACE_QUALITY_THRESHOLDS.
  const driftGate = thresholds.driftX ?? thresholds.driftXRatio * grid.frameWidth;

  const warnings = [];
  if (loopPop > thresholds.loopPop) {
    warnings.push(
      `loop seam ${loopPop.toFixed(2)}% (over ${thresholds.loopPop}%) — it will visibly jump on every repeat`,
    );
  }
  if (heightSwing > thresholds.heightSwing) {
    warnings.push(
      `height swing ${heightSwing.toFixed(0)}% (over ${thresholds.heightSwing}%) — check it is motion, not the character changing pose`,
    );
  }
  if (driftX > driftGate) {
    warnings.push(
      `horizontal drift ±${driftX.toFixed(0)}px (over ${driftGate.toFixed(0)}px) — it will look unmoored in a fixed stage slot`,
    );
  }

  const measured = {
    loopPop: Number(loopPop.toFixed(2)),
    heightSwing: Number(heightSwing.toFixed(1)),
    driftX: Number(driftX.toFixed(1)),
  };

  if (wantsChurn && churn.length > 0) {
    const churnMean = churn.reduce((sum, value) => sum + value, 0) / churn.length;
    const churnPeak = Math.max(...churn);
    // +1 because churn[i] compares frame i to frame i+1, and the frame worth looking at is
    // the one that changed.
    const churnPeakIndex = churn.indexOf(churnPeak) + 1;
    if (churnMean > 0 && churnPeak > churnMean * thresholds.churnPeakRatio) {
      warnings.push(
        `frame ${churnPeakIndex} churns ${(churnPeak / churnMean).toFixed(1)}x the clip average ` +
          `(over ${thresholds.churnPeakRatio}x) — zoom in on frames ${churnPeakIndex - 1}-${churnPeakIndex} ` +
          `for a mouth interior or pupil being redrawn`,
      );
    }
    measured.churnMean = Number(churnMean.toFixed(2));
    measured.churnPeak = Number(churnPeak.toFixed(2));
    measured.churnPeakIndex = churnPeakIndex;
  }

  return { ...measured, warnings };
}
