/**
 * Pass/warn/unknown for a generated emotion clip, using the numbers stored on the sheet.
 *
 * The three metric gates match `scripts/ludo/qualityCheck.mjs`. Two more gallery-only
 * gates sit on top: frame count (16-frame clips look like stop-motion next to a 25-frame
 * neighbour), and `reviewNotes` on the sheet (a human mark that the numbers missed).
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
import type { AnimalSpriteId } from '../../data/characters';

export type ClipQualityStatus = 'pass' | 'warn' | 'unknown' | 'none';

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
 * Animal-level rollup over the five emotions. Green only when every emotion is `pass`.
 * Warn beats unknown beats missing art.
 */
export function animalEmotionQualityStatus(animalId: AnimalSpriteId): ClipQualityStatus {
  const textureKey = animalSetup(animalId).textureKey;
  const statuses = ANIMAL_EMOTIONS.map((emotion) =>
    emotionClipQualityStatus(emotionSheet(textureKey, emotion)),
  );
  if (statuses.every((status) => status === 'pass')) return 'pass';
  if (statuses.some((status) => status === 'warn')) return 'warn';
  if (statuses.some((status) => status === 'unknown')) return 'unknown';
  return 'none';
}
