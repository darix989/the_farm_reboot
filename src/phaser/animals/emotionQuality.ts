/**
 * Pass/warn/unknown for a clip in either animation register, using the numbers stored on its
 * sheet.
 *
 * The metric gates match `scripts/ludo/qualityCheck.mjs`, which keeps a separate threshold set
 * per register — so this file does too, one classifier each, rather than one function with a
 * flag. Two more gallery-only gates sit on top of both: frame count (16-frame clips look like
 * stop-motion next to a 25-frame neighbour), and `reviewNotes` on the sheet (a human mark that
 * the numbers missed).
 */
import {
  ANIMAL_EMOTIONS,
  CURRENT_EMOTION_FRAME_COUNT,
  EMOTION_QUALITY_THRESHOLDS,
  type EmotionQuality,
  type EmotionSheet,
} from './animalEmotions';
import { animalSetup } from './animalAnimations';
import { emotionSheet } from './animalEmotionAnimations';
import { emotionFallback } from './emotionFallbacks';
import { FACE_QUALITY_THRESHOLDS, type FaceSheet } from './animalFaces';
import type { AnimalSpriteId } from '../../data/characters';

/** `placeholder` is a documented stand-in (`emotionFallback`), not a defect — kept out of the
 *  `warn` bucket so reviewers can tell "known, temporary substitution" from "generated but
 *  needs a second look" at a glance. */
export type ClipQualityStatus = 'pass' | 'warn' | 'unknown' | 'none' | 'placeholder';

function metricsOverThreshold(quality: EmotionQuality): boolean {
  return (
    quality.loopPop > EMOTION_QUALITY_THRESHOLDS.loopPop ||
    quality.heightSwing > EMOTION_QUALITY_THRESHOLDS.heightSwing ||
    quality.driftX > EMOTION_QUALITY_THRESHOLDS.driftX ||
    quality.warnings.length > 0
  );
}

/** Classify one generated sheet. `null` means the emotion has no art yet. */
export function emotionClipQualityStatus(sheet: EmotionSheet | null): ClipQualityStatus {
  if (!sheet) return 'none';
  const noted = (sheet.reviewNotes?.length ?? 0) > 0;
  if (noted) return 'warn';
  if (!sheet.quality) return 'unknown';
  const stale = sheet.frameCount !== CURRENT_EMOTION_FRAME_COUNT;
  if (stale || metricsOverThreshold(sheet.quality)) return 'warn';
  return 'pass';
}

/**
 * Classify one cropped portrait. `null` means the emotion has no portrait yet.
 *
 * Same shape as the body classifier, different gates — see `FACE_QUALITY_THRESHOLDS` for why
 * `heightSwing` is not one of them here even though every face sheet still records it. `driftX`
 * is stored in cell pixels, so the ratio has to be resolved against this sheet's own
 * `frameWidth` rather than compared to a constant.
 */
export function faceClipQualityStatus(sheet: FaceSheet | null): ClipQualityStatus {
  if (!sheet) return 'none';
  if ((sheet.reviewNotes?.length ?? 0) > 0) return 'warn';
  if (!sheet.quality) return 'unknown';
  const stale = sheet.frameCount !== CURRENT_EMOTION_FRAME_COUNT;
  const tripped =
    sheet.quality.loopPop > FACE_QUALITY_THRESHOLDS.loopPop ||
    sheet.quality.driftX > sheet.frameWidth * FACE_QUALITY_THRESHOLDS.driftXRatio ||
    sheet.quality.warnings.length > 0;
  return stale || tripped ? 'warn' : 'pass';
}

/**
 * Animal-level rollup over the five emotions. Green only when every emotion is `pass`.
 * Warn beats placeholder beats unknown beats missing art — a real quality problem should
 * never be masked by an animal that also happens to be running on fallback clips.
 */
export function animalEmotionQualityStatus(animalId: AnimalSpriteId): ClipQualityStatus {
  const textureKey = animalSetup(animalId).textureKey;
  const fallback = emotionFallback(textureKey);
  const statuses = ANIMAL_EMOTIONS.map((emotion) => {
    const sheet = emotionSheet(textureKey, emotion);
    if (!sheet && fallback) return 'placeholder';
    return emotionClipQualityStatus(sheet);
  });
  if (statuses.every((status) => status === 'pass')) return 'pass';
  if (statuses.some((status) => status === 'warn')) return 'warn';
  if (statuses.some((status) => status === 'placeholder')) return 'placeholder';
  if (statuses.some((status) => status === 'unknown')) return 'unknown';
  return 'none';
}
