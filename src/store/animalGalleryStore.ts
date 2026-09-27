/**
 * Handoff between the animation gallery's React controls and its Phaser scene.
 *
 * Same shape and the same reasoning as `trialStageStore`: React owns the buttons, Phaser owns
 * the sprite, and they meet at a store rather than an `EventBus` because `AnimalGallery.create()`
 * runs before `AnimalGalleryUI` mounts and needs a current value to read synchronously — an
 * event has no replay.
 */
import { create } from 'zustand';
import {
  animalClips,
  clipEmotion,
  defaultClip,
  emotionClipName,
  type EmotionPart,
} from '../phaser/animals/animalClipCatalogue';
import { ANIMAL_EMOTIONS } from '../phaser/animals/animalEmotions';
import { ANIMAL_SPRITE_IDS } from '../phaser/animals/animalDescriptors';
import type { AnimalSpriteId } from '../data/characters';

const FIRST_ANIMAL = ANIMAL_SPRITE_IDS[0]!;
const DEFAULT_PART: EmotionPart = 'sequence';

interface AnimalGalleryStore {
  animalId: AnimalSpriteId;
  /**
   * Logical clip name from `animalClips()`, or null for the bare rest frame. The only field
   * the scene reads besides `animalId`; the dialogue portrait on the stage follows it too, so
   * a portrait always plays beside the body clip it was cut from.
   */
  clipName: string | null;
  /**
   * Which part of a phased emotion to play. A preference that outlives the clip: it is
   * remembered while an unphased emotion or a base clip is showing, and applied again the
   * next time a phased emotion is picked — on this animal or another.
   */
  part: EmotionPart;
  /**
   * The animal whose art the scene is fetching, or null once it is on stage. Written by the
   * scene — the one field that flows Phaser → React — so the panel can say why the stage is
   * empty rather than leaving it blank while a first pick downloads.
   */
  loadingAnimalId: AnimalSpriteId | null;

  /** Switching animal carries the current clip over where it exists — see `carryClipOver`. */
  setAnimal: (animalId: AnimalSpriteId) => void;
  /** Base clips, and anything else addressed by exact name. */
  setClip: (clipName: string | null) => void;
  /** An emotion button: resolves to the remembered part when the emotion is phased. */
  selectEmotion: (emotion: string) => void;
  /** The part switch: remembers the part and re-resolves the current emotion under it. */
  setPart: (part: EmotionPart) => void;
  setLoadingAnimal: (animalId: AnimalSpriteId | null) => void;
  /** Leaves the gallery on its opening state, so re-entering never resumes mid-review. */
  resetGallery: () => void;
}

function openingClip(animalId: AnimalSpriteId): string | null {
  return defaultClip(animalId)?.name ?? null;
}

function isEmotionName(name: string): boolean {
  return (ANIMAL_EMOTIONS as readonly string[]).includes(name);
}

/**
 * The clip to show after switching animal.
 *
 * Carrying the selection over is the whole point of putting the cast in one screen — the
 * question a reviewer actually has is "how does *this* emotion read on each animal", and
 * resetting to idle on every switch makes them re-click it six times to find out.
 *
 * Emotions are carried by emotion rather than by exact name, because phasing is per animal:
 * `angry@loop` on the sheep lands on plain `angry` on the fox, and back on the sheep it lands
 * on whichever part is remembered. Base animations are per-animal, so carrying `buck` from the
 * donkey to the fox falls back to the fox's rest pose rather than showing nothing.
 */
export function carryClipOver(
  animalId: AnimalSpriteId,
  clipName: string | null,
  part: EmotionPart,
): string | null {
  if (!clipName) return openingClip(animalId);
  const clips = animalClips(animalId);
  const emotion = clipEmotion(clipName);
  if (isEmotionName(emotion)) return emotionClipName(clips, emotion, part);
  return clips.some((clip) => clip.name === clipName) ? clipName : openingClip(animalId);
}

export const useAnimalGalleryStore = create<AnimalGalleryStore>((set) => ({
  animalId: FIRST_ANIMAL,
  clipName: openingClip(FIRST_ANIMAL),
  part: DEFAULT_PART,
  loadingAnimalId: null,

  setAnimal: (animalId) =>
    set((s) =>
      s.animalId === animalId
        ? s
        : { ...s, animalId, clipName: carryClipOver(animalId, s.clipName, s.part) },
    ),

  // No-op when unchanged, so a re-render never restarts a clip that is already playing.
  setClip: (clipName) => set((s) => (s.clipName === clipName ? s : { ...s, clipName })),

  selectEmotion: (emotion) =>
    set((s) => {
      const clipName = emotionClipName(animalClips(s.animalId), emotion, s.part);
      return s.clipName === clipName ? s : { ...s, clipName };
    }),

  setPart: (part) =>
    set((s) => {
      const emotion = s.clipName ? clipEmotion(s.clipName) : null;
      const clipName =
        emotion && isEmotionName(emotion)
          ? emotionClipName(animalClips(s.animalId), emotion, part)
          : s.clipName;
      return s.part === part && s.clipName === clipName ? s : { ...s, part, clipName };
    }),

  setLoadingAnimal: (loadingAnimalId) => set({ loadingAnimalId }),

  resetGallery: () =>
    set({
      animalId: FIRST_ANIMAL,
      clipName: openingClip(FIRST_ANIMAL),
      part: DEFAULT_PART,
      loadingAnimalId: null,
    }),
}));
