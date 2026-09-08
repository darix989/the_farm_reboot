/**
 * Cuts dialogue portraits out of the body emotion clips.
 *
 * ## Why the portraits are crops and not generated art
 *
 * The face register used to be generated: a head crop of the atlas idle frame went to Ludo's
 * `sprite/animate` and came back as a headshot loop. That failed three times on the same
 * defect and cost 12 credits with nothing usable — the eyelid aperture swung 165%, 196% and
 * 458% across the clip in the three attempts, and two of them invented teeth the reference
 * does not have. The cause is structural, not a prompt problem: the endpoint reframes its
 * input (a head submitted at a 485x363 bounding box came back at 257x192), so it is not
 * animating the pixels it was given, it is redrawing the head smaller from scratch in every
 * frame. Nothing you can write in a prompt makes a redrawn eye match the one before it.
 *
 * The body clips already hold the cast talking, doubting, snarling and thinking, and their
 * faces are *stable* — the same drawn eye is reused frame to frame, because the generator was
 * animating posture and left the face alone. Cropping the head out of those is free,
 * deterministic, and reuses art that is already reviewed and shipped.
 *
 * ## What it costs
 *
 * Resolution. A body is normalized to 175-268px of a 512 cell, so a head is ~100-140px of real
 * pixels. That *downscales* into the 112px portrait box, but on a 2x display the box is 224
 * device px and the head is upscaled ~1.7x. Judged at 224px the outlines, eye and mouth all
 * hold — the art is flat vector with heavy strokes, which resamples well — but a portrait is
 * softer than a natively-rendered one would be. Soft and correct beat crisp and glitching.
 *
 * ## One rect and one template per animal
 *
 * Both are taken from the animal's `talking` clip and reused for all five emotions, rather
 * than measured per clip. If each emotion resolved its own rect against its own union box, the
 * head would come out a different size in each portrait and would jump when a dialogue beat
 * changed speaker emotion — the same defect the union-box rule in `normalize.mjs` exists to
 * prevent, one level up. Aligning every clip to one canonical template also means the five
 * portraits of an animal are framed identically by construction.
 */
import sharp from 'sharp';
import { sheetBounds } from './normalize.mjs';

/**
 * Side of the square cell a cropped portrait is written into.
 *
 * 256 rather than the ~130px the crop natively is: pre-upscaling with `lanczos3` here beats
 * leaving the browser to do it with a cheap kernel at 2x DPR, and a uniform cell means every
 * animal's portrait presents the runtime with the same shape whatever its head measured.
 * Larger would be wasted bytes — there is no more detail in the source to recover.
 */
export const CROP_CELL_SIZE = 256;

/**
 * How far the aligner will look for the head, in source pixels.
 *
 * The fox's head bobs 30px over its talking clip and the matcher wanted offsets up to
 * (-16, +22), and `thinking` saturated a 32px window outright, so
 * this is 48. `summarizeAlignment` reports saturation against it, which is the check that
 * says whether the window was actually big enough rather than assuming it.
 */
export const ALIGN_SEARCH_RADIUS = 48;

/**
 * Fraction of the head rect used as the alignment template, measured from the top.
 *
 * The skull, ears and eye are rigid; the mouth is the thing the clip is *for*. Matching on the
 * whole head would make an open mouth fight the alignment and pull the frame down, so the
 * bottom 45% — where the muzzle and jaw live — is excluded from the score.
 */
const TEMPLATE_TOP_FRACTION = 0.55;

/** Stride the template is sampled at. Every other pixel is plenty to lock onto flat vector art. */
const MATCH_STRIDE = 2;

/** Reads every cell of a sheet once, as raw RGBA, so the matcher can work in memory. */
async function readCells(sheetBuffer, grid) {
  const cells = [];
  for (let i = 0; i < grid.frameCount; i++) {
    const { data, info } = await sharp(sheetBuffer)
      .extract({
        left: (i % grid.cols) * grid.frameWidth,
        top: Math.floor(i / grid.cols) * grid.frameHeight,
        width: grid.frameWidth,
        height: grid.frameHeight,
      })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    cells.push({ data, width: info.width, height: info.height });
  }
  return cells;
}

/**
 * Resolves a `headCrop` rect — fractions of the character's union box — to a pixel rect,
 * clamped to the cell.
 *
 * Fractions of the union box rather than of the cell so the number transfers: bodies sit at
 * different offsets inside their cells, and measured against the character's own box the rect
 * means "the leading half of the silhouette, top 69% down" for every animal. Values outside 0..1 are expected and useful — negative `x`/`y` reach into the
 * transparent margin so an ear or muzzle is not cropped hard against its own outline, and the
 * owl's front view is wider than its body box.
 */
export function resolveHeadRect(union, headCrop, cellWidth, cellHeight) {
  const left = Math.max(0, Math.round(union.x + headCrop.x * union.width));
  const top = Math.max(0, Math.round(union.y + headCrop.y * union.height));
  const right = Math.min(cellWidth, Math.round(union.x + (headCrop.x + headCrop.w) * union.width));
  const bottom = Math.min(
    cellHeight,
    Math.round(union.y + (headCrop.y + headCrop.h) * union.height),
  );

  const rect = { left, top, width: right - left, height: bottom - top };
  if (rect.width <= 0 || rect.height <= 0) {
    throw new Error(
      `headCrop ${JSON.stringify(headCrop)} resolves to an empty rect on a ` +
        `${cellWidth}x${cellHeight} cell (union box ${union.width}x${union.height})`,
    );
  }
  return rect;
}

/**
 * The canonical head rect and alignment template for one animal, taken from its `talking` clip.
 *
 * Returned as plain data so the caller can hand the same template to every other emotion of
 * that animal — which is the point, and the reason this is separate from `alignFrames`.
 */
export async function buildHeadTemplate(talkingSheet, grid, headCrop) {
  const union = await sheetBounds(talkingSheet, grid);
  if (!union) throw new Error('Body clip is fully transparent — nothing to crop a head from');

  const rect = resolveHeadRect(union, headCrop, grid.frameWidth, grid.frameHeight);
  const cells = await readCells(talkingSheet, grid);
  const templateHeight = Math.max(1, Math.round(rect.height * TEMPLATE_TOP_FRACTION));

  // Frame 0 is the canonical pose: the clip loops back to it, and it is the frame closest to
  // the atlas idle the whole register is drawn from.
  const source = cells[0];
  const pixels = [];
  for (let y = 0; y < templateHeight; y += MATCH_STRIDE) {
    for (let x = 0; x < rect.width; x += MATCH_STRIDE) {
      const i = ((rect.top + y) * source.width + (rect.left + x)) * 4;
      pixels.push({ dx: x, dy: y, r: source.data[i], g: source.data[i + 1], b: source.data[i + 2], a: source.data[i + 3] });
    }
  }

  return { rect, union, template: { pixels, width: rect.width, height: templateHeight } };
}

/**
 * Per-frame `{dx, dy}` that puts the template's head where it sits in the template frame.
 *
 * Sum of absolute differences over RGBA, which is crude and exactly right for this: the art is
 * flat colour with hard outlines, so the true offset is a sharp minimum rather than a shallow
 * basin, and there is no sub-pixel answer worth finding because the source pixels are the
 * source pixels.
 *
 * **Coarse-to-fine**, because brute force does not scale. A 48px radius is 97x97 offsets, and
 * at ~2000 sampled template pixels that is 19M comparisons per frame — around three minutes to
 * crop the 30-clip cast, which is too slow to iterate a head box against. Scanning every
 * `COARSE_STEP`th offset first and then refining around the winner is ~15x fewer comparisons
 * and finds the same offsets: verified against the brute-force result on all five fox clips.
 *
 * The coarse pass is safe here for the same reason the metric is crude — a head is a large
 * block of flat colour, so the SAD surface is smooth at 4px granularity. It would not be safe
 * on noisy or high-frequency art.
 */
const COARSE_STEP = 4;
const REFINE_RADIUS = COARSE_STEP - 1;

/**
 * How far the head may move between consecutive frames.
 *
 * Frame 0 is searched over the whole window; every frame after it is searched only near where
 * the head was in the frame before. Without this the matcher tracked smoothly and then snapped
 * to a completely different offset mid-clip — `-13,21` to `13,-25` on `white-sheep-1/angry`,
 * `25,-17` to `-6,10` on `donkey-grey/angry`. A sign flip like that is not a head moving, it is
 * a symmetric feature somewhere else in the frame scoring better: a sheep's body wool looks
 * much like its head wool, and SAD has no idea which one it is supposed to be following.
 *
 * Constraining the *search* while still scoring against the fixed canonical template gets both
 * properties — the appearance reference never drifts, and the trajectory cannot teleport. 20px
 * because the largest legitimate single-frame move measured on a clean clip is 14 (fox/talking)
 * and `donkey-grey` runs at 8fps, so its head covers twice the ground per frame.
 */
const TRACK_RADIUS = 20;

function scoreOffset(cell, template, rect, dx, dy, ceiling) {
  let score = 0;
  for (let p = 0; p < template.pixels.length; p++) {
    const t = template.pixels[p];
    const x = rect.left + t.dx + dx;
    const y = rect.top + t.dy + dy;
    // Outside the cell scores as fully different, which pushes the match back inside rather
    // than letting it drift off the edge for free.
    if (x < 0 || y < 0 || x >= cell.width || y >= cell.height) {
      score += 1020;
      continue;
    }
    const i = (y * cell.width + x) * 4;
    score +=
      Math.abs(t.r - cell.data[i]) +
      Math.abs(t.g - cell.data[i + 1]) +
      Math.abs(t.b - cell.data[i + 2]) +
      Math.abs(t.a - cell.data[i + 3]);
    if (score >= ceiling) return score;
  }
  return score;
}

export async function alignFrames(sheetBuffer, grid, { rect, template }) {
  const cells = await readCells(sheetBuffer, grid);
  const offsets = [];

  for (const cell of cells) {
    const previous = offsets[offsets.length - 1];
    // Frame 0 has nothing to follow, so it searches everything; the rest track.
    const centre = previous ?? { dx: 0, dy: 0 };
    const reach = previous ? TRACK_RADIUS : ALIGN_SEARCH_RADIUS;
    const lo = (c) => Math.max(c - reach, -ALIGN_SEARCH_RADIUS);
    const hi = (c) => Math.min(c + reach, ALIGN_SEARCH_RADIUS);

    let best = { dx: centre.dx, dy: centre.dy, score: Infinity };

    for (let dy = lo(centre.dy); dy <= hi(centre.dy); dy += COARSE_STEP) {
      for (let dx = lo(centre.dx); dx <= hi(centre.dx); dx += COARSE_STEP) {
        const score = scoreOffset(cell, template, rect, dx, dy, best.score);
        if (score < best.score) best = { dx, dy, score };
      }
    }

    const coarse = best;
    for (let dy = coarse.dy - REFINE_RADIUS; dy <= coarse.dy + REFINE_RADIUS; dy++) {
      for (let dx = coarse.dx - REFINE_RADIUS; dx <= coarse.dx + REFINE_RADIUS; dx++) {
        if (dx < lo(centre.dx) || dx > hi(centre.dx) || dy < lo(centre.dy) || dy > hi(centre.dy)) continue;
        const score = scoreOffset(cell, template, rect, dx, dy, best.score);
        if (score < best.score) best = { dx, dy, score };
      }
    }

    offsets.push({ dx: best.dx, dy: best.dy });
  }

  return offsets;
}

/**
 * The `fit` box a cropped sheet has, derived from the authored rect rather than measured.
 *
 * `measureFaceNormalization` measures the *art's* union alpha box, which is right for a
 * generated clip — nobody knows where in the cell the generator put the head, so you have to
 * look. A crop is the opposite: we chose the rect, so the answer is arithmetic, and measuring
 * it back out of the pixels actively does harm. Different emotions have different silhouette
 * extents inside the same rect (an open snarl reaches further than a shut mouth), so a measured
 * `fit` came out 0.914 wide for `fox/talking` and 0.887 for `fox/thinking` — which
 * `faceBoxTransform` then turns into a 3% head-size difference and a 1.5px shift between two
 * beats of the same conversation. That is precisely the jump the one-rect-per-animal rule
 * exists to prevent, reintroduced one layer down.
 *
 * Derived this way, all five emotions of an animal share one `fit` by construction, and the
 * portrait box frames exactly the rect a human approved on the review page — no more, no less.
 * It also means `--remeasure` needs neither pixels nor an atlas: the recorded `headRect` and
 * the cell size are the whole input.
 */
export function fitForRect(rect, cellSize = CROP_CELL_SIZE) {
  const scale = cellSize / Math.max(rect.width, rect.height);
  const drawnWidth = rect.width * scale;
  const drawnHeight = rect.height * scale;
  const round = (value) => Number(value.toFixed(4));
  return {
    x: round((cellSize - drawnWidth) / 2 / cellSize),
    y: round((cellSize - drawnHeight) / 2 / cellSize),
    width: round(drawnWidth / cellSize),
    height: round(drawnHeight / cellSize),
  };
}

/**
 * Cuts the aligned head out of every frame and assembles a portrait sheet.
 *
 * Keeps the source's column count so the grid shape — and therefore `cols` in the record, which
 * the CSS `background-position` step depends on — is inherited rather than invented. Cells are
 * contain-fitted onto a transparent square, which is what makes a non-square head rect safe.
 */
export async function cropFaceSheet(sheetBuffer, grid, rect, offsets, cellSize = CROP_CELL_SIZE) {
  const rows = Math.ceil(grid.frameCount / grid.cols);
  const composites = [];

  for (let i = 0; i < grid.frameCount; i++) {
    const { dx, dy } = offsets[i];
    // Clamp so a frame whose match ran to the edge of the window still yields a full rect
    // rather than throwing inside sharp.
    const left = Math.min(
      Math.max(0, (i % grid.cols) * grid.frameWidth + rect.left + dx),
      (i % grid.cols) * grid.frameWidth + grid.frameWidth - rect.width,
    );
    const top = Math.min(
      Math.max(0, Math.floor(i / grid.cols) * grid.frameHeight + rect.top + dy),
      Math.floor(i / grid.cols) * grid.frameHeight + grid.frameHeight - rect.height,
    );

    const cell = await sharp(sheetBuffer)
      .extract({ left, top, width: rect.width, height: rect.height })
      .resize({
        width: cellSize,
        height: cellSize,
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        kernel: 'lanczos3',
      })
      .png()
      .toBuffer();

    composites.push({
      input: cell,
      left: (i % grid.cols) * cellSize,
      top: Math.floor(i / grid.cols) * cellSize,
    });
  }

  const buffer = await sharp({
    create: {
      width: grid.cols * cellSize,
      height: rows * cellSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    // Palettised, which is a 4x saving that costs nothing visible: a straight lossless write
    // of a 1280px sheet is ~1.8MB, and 30 of those is 55MB of portraits for a browser game.
    // Quantising to a palette takes it to ~430KB with a mean error of 2/255 across the visible
    // pixels and essentially none in alpha — flat vector art has few colours, so almost all of
    // the palette goes on antialiased edges.
    //
    // Lossy WebP would halve it again, and is deliberately not used: the outlines are doing all
    // the work at 112px and ringing around a hard black stroke is exactly what lossy codecs do
    // worst. The `.png` extension here is also honest, unlike the body clips, which are WebP
    // under a `.png` name — see the note in SKILL.md.
    .png({ palette: true, compressionLevel: 9, effort: 10 })
    .toBuffer();

  return {
    buffer,
    cols: grid.cols,
    rows,
    frameWidth: cellSize,
    frameHeight: cellSize,
    fit: fitForRect(rect, cellSize),
  };
}

/**
 * Whether the aligner actually locked on, from the offsets themselves.
 *
 * This replaces two attempts at measuring residual drift from pixels, both of which
 * over-reported because they could not tell motion from misalignment. Measuring the whole
 * silhouette counted an opening jaw as drift (`talking` reported 24px of "drift" that was
 * entirely mouth); restricting it to the rigid band still counted a deliberate ear flick and
 * the head tilt in `angry`. Both numbers were real measurements of the wrong thing.
 *
 * The offsets are exact and free — they are what the matcher decided — and they fail in two
 * legible ways. **Saturation** of the whole search window means the head travels further over
 * the clip than the crop can follow. **Saturation of the per-frame track window** means it
 * moves faster than the tracker follows and the crop lags briefly — common on `donkey-grey`,
 * which runs at 8fps and so covers twice the ground per frame. A jump short of that cap but
 * over 16px is the interesting case: faster than any clean clip measured (the most a clean one
 * moved in a frame is 14, on `fox/talking`), so the matcher may have locked onto the wrong
 * feature.
 */
export function summarizeAlignment(offsets, searchRadius = ALIGN_SEARCH_RADIUS) {
  // TRACK_RADIUS is the per-frame cap, so a jump equal to it means the head was moving faster
  // than the tracker was allowed to follow — a different failure from a lost lock, and one the
  // message has to name correctly or it sends the reader looking for the wrong thing.
  const magnitudes = offsets.map((o) => Math.max(Math.abs(o.dx), Math.abs(o.dy)));
  const jumps = offsets
    .slice(1)
    .map((o, i) => Math.max(Math.abs(o.dx - offsets[i].dx), Math.abs(o.dy - offsets[i].dy)));

  const maxOffset = Math.max(...magnitudes);
  const maxJump = jumps.length > 0 ? Math.max(...jumps) : 0;
  const warnings = [];
  if (maxOffset >= searchRadius) {
    warnings.push(
      `alignment saturated at ${maxOffset}px of a ${searchRadius}px window — the head moves ` +
        `further than the crop can follow; widen ALIGN_SEARCH_RADIUS or retune the box`,
    );
  }
  if (maxJump >= TRACK_RADIUS) {
    warnings.push(
      `alignment hit its ${TRACK_RADIUS}px per-frame limit — the head moves faster than the ` +
        `tracker follows, so it lags for a frame or two; check the clip before promoting`,
    );
  } else if (maxJump > 16) {
    warnings.push(
      `alignment jumps ${maxJump}px between consecutive frames — faster than any clean clip ` +
        `measured, so the matcher may have locked onto the wrong feature`,
    );
  }
  return { maxOffset, maxJump, warnings };
}
