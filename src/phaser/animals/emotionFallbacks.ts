/**
 * Temporary body-clip substitutes for animals with no generated emotion art.
 *
 * A generated emotion clip (`emotionSheets.generated.ts`) and this table are mutually
 * exclusive per pairing: `AnimalAnimator.playEmotion()` and `animalClips()` both check the
 * generated sheet first and only consult this table when there is none, so promoting real art
 * for an animal (or a single emotion) silently retires its entry here — nothing to delete by
 * hand.
 *
 * Deliberately not the same mechanism as `AnimalDescriptor.alert` even where the two happen to
 * agree today (cow's `alert` is also the eating loop): `alert` is a general "something got its
 * attention" reaction that is free to change for unrelated reasons, while an emotion fallback
 * is a specific, documented stand-in that must keep pointing at the same clip regardless of
 * what `alert` becomes. Keying this off the animation name directly is what makes the
 * substitution deliberate rather than a coincidence two unrelated fields happen to share.
 */
import type { AnimalSpriteId } from '../../data/characters';

export interface EmotionFallback {
  /** Name of an existing `baseAnimations` entry on this animal's descriptor, looped for every
   *  emotion in `ANIMAL_EMOTIONS` until real clips are generated. */
  baseAnimationName: string;
  /** Shown under the clip in the Animation Gallery and folded into its quality tooltip — say
   *  what is standing in for what, so the placeholder explains itself without this file open. */
  note: string;
}

const EMOTION_FALLBACKS: Partial<Record<AnimalSpriteId, EmotionFallback>> = {
  // The atlas ships a full body-animation set (see `animalDescriptors.ts`'s `COW`) but no
  // emotion clips have been generated yet — see the `animal-emotion-sprites` skill for cost.
  // Until then, every emotion reuses the grazing loop: it is the animal's strongest and most
  // legible motion, and already doubles as its `alert` reaction.
  cow: {
    baseAnimationName: 'eating',
    note: 'Placeholder: reusing the "eating" animation for every emotion until dedicated clips are generated.',
  },
};

/** The fallback clip for this animal, or null when it has generated art (or no fallback). */
export function emotionFallback(animalId: AnimalSpriteId): EmotionFallback | null {
  return EMOTION_FALLBACKS[animalId] ?? null;
}
