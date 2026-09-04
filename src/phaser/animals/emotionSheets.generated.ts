/**
 * GENERATED FILE — do not edit by hand.
 *
 * Written by `npm run sprites:emotions -- --promote`. Lists the emotion clips that actually
 * exist on disk under `public/assets/characters/emotions/`; regenerate rather than editing,
 * or the next promote will overwrite your change.
 *
 * A committed generated module rather than a JSON file fetched at runtime, for two reasons:
 * Phaser's loader would need a second pass (read the index, then queue the sheets it names),
 * and a TS module gets the animal ids and emotion names type-checked against
 * `AnimalSpriteId` / `AnimalEmotion` at build time instead of failing silently at runtime.
 *
 * Empty is a valid state: every consumer falls back to the base `idle`/`alert` behaviour for
 * an animal or emotion that has no entry here.
 */
import type { AnimalSpriteId } from '../../data/characters';
import type { AnimalEmotion, EmotionSheet } from './animalEmotions';

export const EMOTION_SHEETS: Partial<
  Record<AnimalSpriteId, Partial<Record<AnimalEmotion, EmotionSheet>>>
> = {};
