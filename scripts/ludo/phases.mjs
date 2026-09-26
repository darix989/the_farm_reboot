/**
 * Phased emotions: an ease-in, a held loop and an ease-out, generated on top of an emotion's
 * already-shipped main clip.
 *
 * ## Why phases exist
 *
 * A plain emotion clip starts at the rest pose, peaks and comes back to rest, and the game
 * loops it. That is right for an emotion that breathes around rest (`talking`) and wrong for a
 * *state* whose peak has to hold while the character keeps the floor: the sheep's angry glare
 * visibly drained away and snapped back on every repeat. A phased emotion enters through `in`,
 * holds on `loop` for as long as it lasts, and leaves through `out`. The runtime rules are in
 * `src/phaser/animals/emotionTransitions.ts`; the authoring workflow is in the
 * `animal-emotion-sprites` skill.
 *
 * ## Where each phase comes from
 *
 * - `in` is **free**: the leading frames of the main clip, cut by metadata (`startFrame` +
 *   `frameCount` on the same file). Pick the last frame at the emotion's peak.
 * - `loop` and `out` are **generated**, with both endpoints taken from cells of the main clip
 *   itself (`"main:23"`), never from the atlas frame. That keeps every phase in the main clip's
 *   own canvas and framing: `loop` starts and ends on the frame `in` ends on; `out` starts
 *   there and ends on main frame 0, which is the rest pose *in that framing*. Handing Ludo the
 *   419×363 atlas canvas as one end and a 512px cell as the other would ask it to interpolate
 *   between two different pictures of the animal.
 *
 * ## Why phase normalization is anchored, not measured
 *
 * A main clip's scale/origin come from its union box against the atlas (`measureNormalization`).
 * Measuring each phase that way would give each its own union box — the loop's is the angry
 * pose only — and so a slightly different scale, which is a visible size pop at every join.
 * Instead a phase inherits the main clip's normalization, corrected so its first frame lands
 * exactly where the main frame it was generated from lands on stage. Ludo's
 * `margin_ratio_mode: auto` is free to reframe its input, and this absorbs that too.
 */
import sharp from 'sharp';
import { alphaBounds, frameAt } from './normalize.mjs';
import { meanDifference, measureClipQuality, QUALITY_THRESHOLDS } from './qualityCheck.mjs';

export const PHASES = ['in', 'loop', 'out'];

/** Same gate as a loop seam: a phase join is a seam between two sheets. Mirrors `seam` in TS. */
export const SEAM_THRESHOLD = QUALITY_THRESHOLDS.loopPop;

/**
 * `"main:23"`, `"main:last"`, `"loop:last"` → which shipped sheet and which frame of it.
 *
 * `loop:` exists for the ease-out. Generating it from `main:23` (the frame the loop was itself
 * generated from) leaves it starting on a *similar* drawing to the one the loop really ends on
 * — Ludo re-renders its input — and that difference shows as a small shift at the join.
 * `loop:last` hands it the exact cell it will follow, so the loop must be promoted first.
 */
export function parseEndpoint(spec, frameCounts) {
  const match = /^(main|loop):(\d+|last)$/.exec(spec ?? '');
  if (!match) {
    throw new Error(`Phase endpoint "${spec}" must be "<main|loop>:<frame>" or "<main|loop>:last"`);
  }
  const source = match[1];
  const count = frameCounts[source];
  if (count == null) throw new Error(`Phase endpoint "${spec}": no promoted ${source} clip`);
  const index = match[2] === 'last' ? count - 1 : Number(match[2]);
  if (index >= count)
    throw new Error(`Phase endpoint "${spec}" is past the ${source}'s ${count} frames`);
  return { source, index };
}

/**
 * One cell of a shipped sheet as a standalone PNG — what a phase job sends as an endpoint.
 * `sources` maps `main` / `loop` to `{ buffer, sheet }`.
 */
export async function endpointFrame(sources, spec) {
  const { source, index } = parseEndpoint(spec, frameCountsOf(sources));
  const { buffer, sheet } = sources[source];
  return frameAt(buffer, index, await gridOf(buffer, sheet));
}

function frameCountsOf(sources) {
  return Object.fromEntries(Object.entries(sources).map(([k, v]) => [k, v.sheet.frameCount]));
}

/** The grid of a promoted sheet. Column count is derived: the record stores cell size only. */
export async function gridOf(sheetBuffer, sheet) {
  const { width } = await sharp(sheetBuffer).metadata();
  return {
    cols: Math.round(width / sheet.frameWidth),
    frameWidth: sheet.frameWidth,
    frameHeight: sheet.frameHeight,
    frameCount: sheet.frameCount,
  };
}

async function rawFrame(sheetBuffer, index, grid) {
  const { data, info } = await sharp(await frameAt(sheetBuffer, index, grid))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/**
 * Scale/origin for a phase so its frame `phaseFrame` is drawn exactly where the main clip's
 * frame `anchorFrame` is drawn. Matches height (the cast is sized vertically, as in
 * `measureNormalization`), the feet line and the horizontal centre.
 *
 * Stage position of cell pixel x is `(x - originX * frameWidth) * scale` from the sprite's
 * anchor; solving that for equal box height, bottom and centre gives the three lines below.
 */
export async function measureSeamNormalization({
  mainBuffer,
  mainGrid,
  mainNorm,
  anchorFrame,
  phaseBuffer,
  phaseGrid,
  phaseFrame = 0,
}) {
  const anchor = alphaBounds(await rawFrame(mainBuffer, anchorFrame, mainGrid));
  const phase = alphaBounds(await rawFrame(phaseBuffer, phaseFrame, phaseGrid));
  if (!anchor || !phase) throw new Error('Seam frame is fully transparent');

  const scale = (mainNorm.scale * anchor.height) / phase.height;
  const ratio = mainNorm.scale / scale;
  const anchorBottom = anchor.y + anchor.height - mainNorm.originY * mainGrid.frameHeight;
  const anchorCentre = anchor.x + anchor.width / 2 - mainNorm.originX * mainGrid.frameWidth;
  const originY = (phase.y + phase.height - anchorBottom * ratio) / phaseGrid.frameHeight;
  const originX = (phase.x + phase.width / 2 - anchorCentre * ratio) / phaseGrid.frameWidth;

  return {
    scale: Number(scale.toFixed(4)),
    originX: Number(originX.toFixed(4)),
    originY: Number(originY.toFixed(4)),
    measured: { anchor, phase },
  };
}

/**
 * Difference between two frames *as they are drawn on stage* — each through its own sheet's
 * scale/origin — in `loopPop` units. `b` is resampled (nearest) into `a`'s cell, so two
 * phases in different framings are compared like for like instead of pixel-for-pixel.
 */
export async function seamDifference(a, b) {
  const pa = await rawFrame(a.buffer, a.frame, a.grid);
  const pb = await rawFrame(b.buffer, b.frame, b.grid);
  const k = a.norm.scale / b.norm.scale;
  const mapped = Buffer.alloc(pa.data.length);
  const axo = a.norm.originX * pa.width;
  const ayo = a.norm.originY * pa.height;
  const bxo = b.norm.originX * pb.width;
  const byo = b.norm.originY * pb.height;
  for (let v = 0; v < pa.height; v++) {
    const y = Math.round(byo + (v - ayo) * k);
    if (y < 0 || y >= pb.height) continue;
    for (let u = 0; u < pa.width; u++) {
      const x = Math.round(bxo + (u - axo) * k);
      if (x < 0 || x >= pb.width) continue;
      const from = (y * pb.width + x) * 4;
      pb.data.copy(mapped, (v * pa.width + u) * 4, from, from + 4);
    }
  }
  return Number(meanDifference(pa.data, mapped).toFixed(2));
}

const normOf = (sheet) => ({ scale: sheet.scale, originX: sheet.originX, originY: sheet.originY });

/**
 * Completes an emotion's `phases` record from shipped files: derives `in` from the main clip,
 * anchors each generated phase's scale/origin to the main frame it started from, measures each
 * phase's own quality and every join between them. Shared by `--promote` and `--remeasure`,
 * so the numbers can never depend on which command wrote them.
 *
 * `inRange` is `{ startFrame, endFrame }` (inclusive) or null for no ease-in. `readBuffer`
 * loads a shipped sheet by filename.
 */
export async function measurePhases({ main, mainBuffer, phases, inRange, readBuffer }) {
  const mainGrid = await gridOf(mainBuffer, main);
  const result = {};
  const frames = {};

  if (inRange) {
    const startFrame = inRange.startFrame ?? 0;
    const frameCount = inRange.endFrame - startFrame + 1;
    if (frameCount < 1 || inRange.endFrame >= main.frameCount) {
      throw new Error(`Ease-in range ${startFrame}–${inRange.endFrame} does not fit the main clip`);
    }
    result.in = {
      file: main.file,
      frameWidth: main.frameWidth,
      frameHeight: main.frameHeight,
      startFrame,
      frameCount,
      frameRate: main.frameRate,
      ...normOf(main),
      quality: stripLoopSeam(
        await measureClipQuality(mainBuffer, { ...mainGrid, startFrame, frameCount }),
      ),
    };
    frames.in = {
      buffer: mainBuffer,
      grid: mainGrid,
      norm: normOf(main),
      first: startFrame,
      last: inRange.endFrame,
    };
  }

  // Loop before out: an ease-out generated from `loop:…` is anchored to the loop's own frame,
  // through the loop's already-anchored normalization.
  const anchors = {
    main: { buffer: mainBuffer, grid: mainGrid, norm: normOf(main), frameCount: main.frameCount },
  };
  for (const phase of ['loop', 'out']) {
    const sheet = phases?.[phase];
    if (!sheet) continue;
    const buffer = await readBuffer(sheet.file);
    const grid = await gridOf(buffer, sheet);
    const { source, index } = parseEndpoint(
      sheet.initial,
      Object.fromEntries(Object.entries(anchors).map(([k, v]) => [k, v.frameCount])),
    );
    const anchor = anchors[source];
    const norm = await measureSeamNormalization({
      mainBuffer: anchor.buffer,
      mainGrid: anchor.grid,
      mainNorm: anchor.norm,
      anchorFrame: index,
      phaseBuffer: buffer,
      phaseGrid: grid,
    });
    const quality = await measureClipQuality(buffer, grid);
    const { measured: _measured, ...geometry } = norm;
    result[phase] = {
      ...sheet,
      ...geometry,
      quality: phase === 'loop' ? quality : stripLoopSeam(quality),
    };
    frames[phase] = { buffer, grid, norm: geometry, first: 0, last: sheet.frameCount - 1 };
    anchors[phase] = { buffer, grid, norm: geometry, frameCount: sheet.frameCount };
  }

  if (!result.loop) throw new Error(`${main.file}: a phased emotion needs a promoted loop`);

  // Joins in playback order: in → loop → out → rest (main frame 0).
  const rest = { buffer: mainBuffer, grid: mainGrid, norm: normOf(main), first: 0, last: 0 };
  const order = ['in', 'loop', 'out'].filter((phase) => frames[phase]);
  const joins = order.map((phase, i) => [phase, order[i + 1] ?? (phase === 'out' ? 'rest' : null)]);
  for (const [from, to] of joins) {
    if (!to) continue;
    const a = frames[from];
    const b = to === 'rest' ? rest : frames[to];
    const seam = await seamDifference(
      { buffer: a.buffer, grid: a.grid, norm: a.norm, frame: a.last },
      { buffer: b.buffer, grid: b.grid, norm: b.norm, frame: b.first },
    );
    setSeam(result[from].quality, 'seamOut', seam, to);
    if (to !== 'rest') setSeam(result[to].quality, 'seamIn', seam, from);
  }

  return result;
}

function setSeam(quality, field, value, other) {
  quality[field] = value;
  if (value > SEAM_THRESHOLD) {
    quality.warnings = [
      ...quality.warnings,
      `seam ${field === 'seamIn' ? 'from' : 'into'} ${other} ${value}% (over ${SEAM_THRESHOLD}%) — it will visibly jump at the join`,
    ];
  }
}

/** An ease is not a loop: its first and last frames are meant to differ. */
function stripLoopSeam(quality) {
  return { ...quality, warnings: quality.warnings.filter((w) => !w.startsWith('loop seam')) };
}
