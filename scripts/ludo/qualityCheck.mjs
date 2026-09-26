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
 * **`edgeMargin`** — the closest the character comes to any of the four cell edges, in pixels.
 * A body that touches the edge of its cell has been cut off by it, and the stage will show the
 * cut.
 *
 * **`flatCut`** — the longest run of fully opaque pixels on the outermost row or column of the
 * character's box, in any frame. This catches the cut that `edgeMargin` cannot see: the
 * generator only draws inside the reference canvas it was given, which lands well inside the
 * 512px cell, so a head that swings past it is sliced along a straight line ~130px in from the
 * edge. The seagull's first Hydra `angry` lost the tip of its beak that way at 126px of margin.
 * A drawn outline is anti-aliased at its extremes and never scores above 9px on the shipped
 * cast (the bull's horn tip); that slice scored 24px.
 *
 * **`churn`** (generated clips only — see `CROP_QUALITY_THRESHOLDS`) — the mean difference
 * between *consecutive* frames, and the
 * worst such pair. `loopPop` compares frame 0 to frame N-1 and is therefore completely blind
 * to a mouth interior or a pupil that is redrawn differently in every single frame: the clip
 * can return exactly to its start and still strobe for the whole two seconds in between. That
 * defect is a minor artifact on a 300px body sprite and the loudest thing in the clip on a
 * portrait, where the mouth fills a fifth of the frame — so faces measure it and bodies do
 * not. `churnPeakIndex` names the frame pair to zoom into, which automates the "crop the head
 * from a handful of frames and lay them side by side" step SKILL.md rule 7 asks for by hand.
 */
import sharp from 'sharp';
import { alphaBounds, frameAt } from './normalize.mjs';

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
  /** Pixels between the character and the nearest cell edge; at or below this it is cut off. */
  edgeMargin: 2,
  /** Opaque run on the box's outermost row/column; the shipped cast tops out at 9px. */
  flatCut: 16,
};

/** A pixel this opaque on the very edge of the box is a hard cut, not an anti-aliased outline. */
const CUT_ALPHA = 250;

/**
 * Longest run of `CUT_ALPHA` pixels along each outermost row and column of `box`, with the side
 * it was found on. Anti-aliasing keeps a drawn outline's extremes translucent; a slice is
 * opaque edge to edge.
 */
function flatCutOf({ data, width }, box) {
  const alpha = (x, y) => data[(y * width + x) * 4 + 3];
  const longestRun = (length, at) => {
    let best = 0;
    let current = 0;
    for (let k = 0; k < length; k++) {
      current = at(k) >= CUT_ALPHA ? current + 1 : 0;
      if (current > best) best = current;
    }
    return best;
  };
  const right = box.x + box.width - 1;
  const bottom = box.y + box.height - 1;
  const sides = {
    left: longestRun(box.height, (k) => alpha(box.x, box.y + k)),
    right: longestRun(box.height, (k) => alpha(right, box.y + k)),
    top: longestRun(box.width, (k) => alpha(box.x + k, box.y)),
    bottom: longestRun(box.width, (k) => alpha(box.x + k, bottom)),
  };
  const side = Object.keys(sides).reduce((a, b) => (sides[b] > sides[a] ? b : a));
  return { run: sides[side], side };
}

/**
 * The gates for a **cropped** portrait, which is a different measurement problem again.
 *
 * These replaced a set calibrated for *generated* headshots, and the change is not a tweak —
 * three of those four gates were measuring the wrong thing once portraits became crops of the
 * body clips, and fired on 4 of the fox's 5 emotions. A review page full of warnings nobody
 * should act on trains people to ignore warnings.
 *
 * - **`loopPop` 2%, unchanged.** A seam is a seam. The body clip's loop carries straight
 *   through into the crop, so a portrait can still pop on every repeat.
 * - **`heightSwing` dropped.** At 8% this was the automatic detector for the *generator having
 *   zoomed* — the one failure a generated face clip must not have. A crop cannot zoom: the rect
 *   is fixed and the cell is contain-fitted. What height swing now measures is the animal's own
 *   jaw opening and head tilt, which is the motion the portrait exists to show.
 * - **`driftX` loosened to 6% of the cell.** The head is pinned by the aligner rather than by a
 *   prompt, so `summarizeAlignment` in `cropFace.mjs` is the sharper signal — it reports what
 *   the aligner actually did. This stays as a backstop for a gross slide.
 * - **`churn` dropped.** It exists to catch a mouth interior or pupil *redrawn differently in
 *   every frame*, which is impossible in a crop: the pixels are the same drawn art, moved. What
 *   it detects here is the mouth opening, i.e. the clip working. It flagged four fox crops.
 *
 * Keeping churn would also have been actively misleading, because it has a known blind spot —
 * it compares consecutive frames, so it caught nothing at all on the worst generated clip,
 * whose eye closed over six frames.
 */
export const CROP_QUALITY_THRESHOLDS = {
  loopPop: 2,
  /** Fraction of `frameWidth`, resolved against the actual grid. */
  driftXRatio: 0.06,
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
 * every existing caller is unchanged) or `CROP_QUALITY_THRESHOLDS` for portraits. A set may
 * omit a gate to disable it.
 */
export async function measureClipQuality(sheetBuffer, grid, thresholds = QUALITY_THRESHOLDS) {
  const wantsChurn = thresholds.churnPeakRatio != null;

  const heights = [];
  const centres = [];
  const churn = [];
  let first = null;
  let last = null;
  let previous = null;
  let edgeMargin = Infinity;
  let edgeFrame = -1;
  let flatCut = { run: 0, side: null, frame: -1 };

  // One pass over the grid. Each cell is decoded once and then used for every metric that
  // needs it — bounds for height/drift/edges, raw pixels for the loop seam and for churn
  // against the frame before it. Decoding a 512px cell twice was measurable on a 25-frame sheet.
  for (let i = 0; i < grid.frameCount; i++) {
    const png = await frameAt(sheetBuffer, i, grid);
    const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

    const box = alphaBounds({ data, width: info.width, height: info.height });
    if (box) {
      heights.push(box.height);
      centres.push(box.x + box.width / 2);

      const margin = Math.min(
        box.x,
        box.y,
        info.width - (box.x + box.width),
        info.height - (box.y + box.height),
      );
      if (margin < edgeMargin) {
        edgeMargin = margin;
        edgeFrame = i;
      }
      const cut = flatCutOf({ data, width: info.width }, box);
      if (cut.run > flatCut.run) flatCut = { ...cut, frame: i };
    }

    if (i === 0) first = data;
    if (i === grid.frameCount - 1) last = data;
    if (wantsChurn && previous) churn.push(meanDifference(previous, data));
    previous = data;
  }

  const loopPop = first && last ? meanDifference(first, last) : 0;

  const span = (values) => (values.length ? Math.max(...values) - Math.min(...values) : 0);
  const heightSwing = heights.length ? (span(heights) / Math.max(...heights)) * 100 : 0;
  const driftX = span(centres) / 2;

  // Absolute px for bodies, a fraction of the cell for crops — see CROP_QUALITY_THRESHOLDS.
  // A threshold set may omit a gate entirely to disable it; `Infinity` rather than `undefined`
  // so the comparison is a deliberate never-fires rather than a NaN that happens to be falsy.
  const driftGate =
    thresholds.driftX ?? (thresholds.driftXRatio != null ? thresholds.driftXRatio * grid.frameWidth : Infinity);
  const heightGate = thresholds.heightSwing ?? Infinity;

  const warnings = [];
  if (loopPop > thresholds.loopPop) {
    warnings.push(
      `loop seam ${loopPop.toFixed(2)}% (over ${thresholds.loopPop}%) — it will visibly jump on every repeat`,
    );
  }
  if (heightSwing > heightGate) {
    warnings.push(
      `height swing ${heightSwing.toFixed(0)}% (over ${heightGate}%) — check it is motion, not the character changing pose`,
    );
  }
  if (driftX > driftGate) {
    warnings.push(
      `horizontal drift ±${driftX.toFixed(0)}px (over ${driftGate.toFixed(0)}px) — it will look unmoored in a fixed stage slot`,
    );
  }

  // Crops omit both gates: a portrait is cut out of the body on purpose.
  if (thresholds.edgeMargin != null && edgeMargin <= thresholds.edgeMargin) {
    warnings.push(
      `touches the cell edge in frame ${edgeFrame} (${edgeMargin}px margin) — it is cut off by the cell`,
    );
  }
  if (thresholds.flatCut != null && flatCut.run >= thresholds.flatCut) {
    warnings.push(
      `flat cut on the ${flatCut.side} edge in frame ${flatCut.frame} (${flatCut.run}px opaque run, ` +
        `limit ${thresholds.flatCut}px) — part of the character leaves the generator's canvas and is sliced off`,
    );
  }

  const measured = {
    loopPop: Number(loopPop.toFixed(2)),
    heightSwing: Number(heightSwing.toFixed(1)),
    driftX: Number(driftX.toFixed(1)),
  };
  if (thresholds.edgeMargin != null) {
    measured.edgeMargin = Number.isFinite(edgeMargin) ? edgeMargin : null;
    measured.flatCut = flatCut.run;
  }

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
