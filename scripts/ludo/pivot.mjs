/**
 * The strict "one pivot per animal" guard.
 *
 * Every animation of an animal must draw its rest pose in the same place at the same size,
 * or the character visibly jumps when one animation cuts to the next. Frame 0 of every
 * generated clip is the reference pose, so where frame 0 lands on stage is that clip's pivot:
 * all clips of an animal must agree on it.
 *
 * Never make a clip's motion fit its cell by moving that clip's pivot. If a motion leaves the
 * cell, reposition (or, after asking, enlarge) every sheet of the animal together. See
 * "One pivot per animal" in `.claude/skills/animal-emotion-sprites/SKILL.md`.
 */
import sharp from 'sharp';
import { boundsOf, frameAt } from './normalize.mjs';

/** Stage units (atlas-canvas pixels). Rounding the recorded origin to 4 dp costs ~0.1. */
export const PIVOT_TOLERANCE = { x: 1.5, feet: 1.5, heightRatio: 0.01 };

/**
 * Where a clip's rest frame lands relative to the sprite anchor, in stage units: the centre
 * of its box (`x`), the bottom of its box (`feet`) and its height. Pure arithmetic, so it is
 * unit-tested on its own.
 */
export function restPlacement(box, { scale, originX, originY, frameWidth, frameHeight }) {
  return {
    x: (box.x + box.width / 2 - originX * frameWidth) * scale,
    feet: (box.y + box.height - originY * frameHeight) * scale,
    height: box.height * scale,
  };
}

/**
 * Compares placements of one animal's clips. Returns a description of each disagreement, or
 * an empty array when every clip shares the pivot.
 */
export function pivotDisagreements(placements, tolerance = PIVOT_TOLERANCE) {
  const entries = Object.entries(placements);
  if (entries.length < 2) return [];
  const spread = (key) => {
    const values = entries.map(([, p]) => p[key]);
    return Math.max(...values) - Math.min(...values);
  };
  const heights = entries.map(([, p]) => p.height);
  const heightRatio = Math.max(...heights) / Math.min(...heights) - 1;
  const list = (key) =>
    entries.map(([emotion, p]) => `${emotion} ${p[key].toFixed(1)}`).join(', ');

  const problems = [];
  if (spread('x') > tolerance.x)
    problems.push(`horizontal pivot differs by ${spread('x').toFixed(1)} (${list('x')})`);
  if (spread('feet') > tolerance.feet)
    problems.push(`feet line differs by ${spread('feet').toFixed(1)} (${list('feet')})`);
  if (heightRatio > tolerance.heightRatio)
    problems.push(
      `rest height differs by ${(heightRatio * 100).toFixed(1)}% (${list('height')})`,
    );
  return problems;
}

/**
 * Measures every recorded body clip of `animalId` and throws when they do not share a pivot.
 * `readBuffer(file)` returns a shipped sheet's bytes.
 */
export async function assertOnePivot(animalId, clips, readBuffer) {
  const placements = {};
  for (const [emotion, clip] of Object.entries(clips)) {
    const buffer = await readBuffer(clip.file);
    const box = await boundsOf(
      await frameAt(buffer, 0, {
        cols: clip.cols ?? Math.round((await sharp(buffer).metadata()).width / clip.frameWidth),
        frameWidth: clip.frameWidth,
        frameHeight: clip.frameHeight,
      }),
    );
    if (box) placements[emotion] = restPlacement(box, clip);
  }
  const problems = pivotDisagreements(placements);
  if (problems.length > 0) {
    throw new Error(
      `${animalId}: its animations do not share one pivot, so it would jump when switching ` +
        `between them:\n  - ${problems.join('\n  - ')}\n` +
        `Never fix this on a single sheet. Re-run --remeasure --animal ${animalId} so every ` +
        `clip is anchored on its rest frame; if a motion leaves the cell, reposition or ` +
        `(after asking) enlarge every sheet of the animal together.`,
    );
  }
}

