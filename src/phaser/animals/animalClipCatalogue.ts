/**
 * One flat list of everything a given animal can actually play, atlas clips and generated
 * emotion clips together.
 *
 * The two families are loaded and keyed completely differently (see
 * `animalEmotionAnimations.ts`), which is right for the engine and wrong for anyone trying to
 * *look* at them: a reviewer wants "what can this animal do", not "which loader owns it". So
 * this is the one place the two are reconciled, and the gallery scene is its consumer.
 *
 * It also lists emotions the animal has **no art for yet** (`available: false`). That is
 * deliberate and is most of the point — with a cast generated one animal at a time, the gap
 * between the vocabulary and the art is the thing you need to see.
 */
import { ANIMAL_DESCRIPTORS } from './animalDescriptors';
import { animalAnimKey, animalSetup } from './animalAnimations';
import {
  ANIMAL_EMOTIONS,
  EMOTION_FRAME_RATE,
  type AnimalEmotion,
  type EmotionQuality,
} from './animalEmotions';
import { emotionAnimKey, emotionSheet } from './animalEmotionAnimations';
import { emotionFallback } from './emotionFallbacks';
import { faceSheet, type FaceSheet } from './animalFaces';
import {
  emotionClipQualityStatus,
  faceClipQualityStatus,
  type ClipQualityStatus,
} from './emotionQuality';
import type { AnimalSpriteId } from '../../data/characters';

/** `emotion` clips are generated; `base` clips came with the source art. */
export type AnimalClipKind = 'emotion' | 'base';

export interface AnimalClip {
  /** Logical name — `'idle'`, `'sneaky'`. Unique per animal across both kinds. */
  name: string;
  kind: AnimalClipKind;
  /** Phaser animation key, or `null` when there is no art (emotions only). */
  animKey: string | null;
  /** False only for an emotion in `ANIMAL_EMOTIONS` that has not been generated yet. */
  available: boolean;
  frameCount: number;
  frameRate: number;
  /** True for the animal's resting pose, which the gallery opens on. */
  isRest: boolean;
  /** Emotion clips only. Base atlas clips have no generated quality. */
  qualityStatus?: ClipQualityStatus;
  /** Present when the promoted record stored measurements for this emotion. */
  quality?: EmotionQuality;
  /** Human review notes from the promoted record; also force a warn badge. */
  reviewNotes?: readonly string[];
}

/**
 * Every clip for one animal: emotions first (in `ANIMAL_EMOTIONS` order, missing art
 * included), then the atlas animations in descriptor order.
 *
 * Emotions lead because they are the ones under active review; the atlas clips below them are
 * the fixed reference you compare against.
 */
export function animalClips(animalId: AnimalSpriteId): AnimalClip[] {
  const setup = animalSetup(animalId);
  // Variants share the base animal's texture and animation keys, so the catalogue has to be
  // built against `textureKey` rather than the id the caller happened to pass.
  const textureKey = setup.textureKey;
  const descriptor = ANIMAL_DESCRIPTORS[textureKey];

  const fallback = emotionFallback(textureKey);
  const fallbackAnimation = fallback
    ? descriptor.baseAnimations.find((animation) => animation.name === fallback.baseAnimationName)
    : undefined;

  const emotions: AnimalClip[] = ANIMAL_EMOTIONS.map((emotion: AnimalEmotion) => {
    const sheet = emotionSheet(textureKey, emotion);
    // A generated sheet always wins; the fallback only fills a gap it leaves, so promoting one
    // emotion at a time retires this animal's placeholder entries one at a time too.
    if (!sheet && fallbackAnimation) {
      return {
        name: emotion,
        kind: 'emotion',
        animKey: animalAnimKey(textureKey, fallbackAnimation.name),
        available: true,
        frameCount: fallbackAnimation.endFrameIndex - (fallbackAnimation.startFrameIndex ?? 0) + 1,
        frameRate: fallbackAnimation.frameRate ?? 12,
        isRest: false,
        qualityStatus: 'placeholder',
        reviewNotes: [fallback!.note],
      };
    }
    return {
      name: emotion,
      kind: 'emotion',
      animKey: sheet ? emotionAnimKey(textureKey, emotion) : null,
      available: Boolean(sheet),
      frameCount: sheet?.frameCount ?? 0,
      frameRate: sheet?.frameRate ?? EMOTION_FRAME_RATE,
      isRest: false,
      qualityStatus: emotionClipQualityStatus(sheet),
      quality: sheet?.quality,
      reviewNotes: sheet?.reviewNotes,
    };
  });

  const base: AnimalClip[] = descriptor.baseAnimations.map((animation) => {
    const animKey = animalAnimKey(textureKey, animation.name);
    return {
      name: animation.name,
      kind: 'base',
      animKey,
      available: true,
      // `endFrameIndex` is inclusive and `startFrameIndex` defaults to 0 — see
      // `AnimalAnimation`. Getting this wrong here only mislabels the UI, but the same
      // off-by-one in `ensureAnimalAnimations` would drop a frame from every clip.
      frameCount: animation.endFrameIndex - (animation.startFrameIndex ?? 0) + 1,
      frameRate: animation.frameRate ?? 12,
      isRest: animKey === setup.restAnimKey,
    };
  });

  return [...emotions, ...base];
}

/** The clip the gallery should open on: the animal's resting pose, else its first clip. */
export function defaultClip(animalId: AnimalSpriteId): AnimalClip | null {
  const clips = animalClips(animalId);
  return clips.find((clip) => clip.isRest) ?? clips.find((clip) => clip.available) ?? null;
}

/**
 * One emotion's dialogue portrait — the second register, listed separately.
 *
 * Not an `AnimalClip`, and deliberately not folded into `animalClips()`: a portrait shares its
 * *name* with the body clip it was cut from, so one flat list would have two `talking` entries
 * per animal, and everything that finds a clip by name (`AnimalGallery.findClip`, the store's
 * `carryClipOver`) would pick whichever came first. They are also played by completely
 * different machinery — Phaser owns the body sprite, React steps a portrait in the DOM — so
 * there is no consumer that wants them interleaved.
 */
export interface AnimalFaceClip {
  emotion: AnimalEmotion;
  /** The promoted sheet, or null when no portrait has been cropped for this pairing. */
  sheet: FaceSheet | null;
  available: boolean;
  frameCount: number;
  frameRate: number;
  qualityStatus: ClipQualityStatus;
  quality?: EmotionQuality;
  reviewNotes?: readonly string[];
}

/**
 * Every emotion's portrait for one animal, in vocabulary order, **including the ones with no
 * art** — same rule and same reason as the emotion half of `animalClips()`.
 *
 * Two traps, both of which produce a plausible-looking wrong answer rather than an error:
 *
 * - **Keyed by `animalId`, not `textureKey`.** `EMOTION_SHEETS` is per-texture because variants
 *   share a Phaser atlas; `FACE_SHEETS` is per-id because a crop rect is authored per animal
 *   and `white-sheep-1` has its own entry. Routing this through `animalSetup().textureKey`, as
 *   the emotion branch above must, would ask for a sheet under the wrong key.
 * - **`faceSheet`, never `resolvedFaceSheet`.** The `talking` fallback is right in game, where
 *   a missing portrait should degrade quietly, and wrong in a review tool, which must never
 *   show one clip under another clip's label.
 */
export function animalFaceClips(animalId: AnimalSpriteId): AnimalFaceClip[] {
  return ANIMAL_EMOTIONS.map((emotion: AnimalEmotion) => {
    const sheet = faceSheet(animalId, emotion);
    return {
      emotion,
      sheet,
      available: Boolean(sheet),
      frameCount: sheet?.frameCount ?? 0,
      frameRate: sheet?.frameRate ?? EMOTION_FRAME_RATE,
      qualityStatus: faceClipQualityStatus(sheet),
      quality: sheet?.quality,
      reviewNotes: sheet?.reviewNotes,
    };
  });
}
