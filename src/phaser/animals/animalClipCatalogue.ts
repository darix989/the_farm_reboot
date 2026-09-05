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
import { ANIMAL_EMOTIONS, EMOTION_FRAME_RATE, type AnimalEmotion } from './animalEmotions';
import { emotionAnimKey, emotionSheet } from './animalEmotionAnimations';
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

  const emotions: AnimalClip[] = ANIMAL_EMOTIONS.map((emotion: AnimalEmotion) => {
    const sheet = emotionSheet(textureKey, emotion);
    return {
      name: emotion,
      kind: 'emotion',
      animKey: sheet ? emotionAnimKey(textureKey, emotion) : null,
      available: Boolean(sheet),
      frameCount: sheet?.frameCount ?? 0,
      frameRate: sheet?.frameRate ?? EMOTION_FRAME_RATE,
      isRest: false,
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
