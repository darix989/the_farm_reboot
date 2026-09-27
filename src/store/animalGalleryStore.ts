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
   * The focused clip — a logical name from `animalClips()` — or null when nothing is focused,
   * which is the gallery's opening state: the scene then plays every clip in turn, on a loop.
   * The only field the scene reads besides `animalId`; the dialogue portrait on the stage
   * follows it too, so a portrait always plays beside the body clip it was cut from.
   */
  clipName: string | null;
  /**
   * The clip the unfocused cycle is on right now, or null while a clip is focused. Written by
   * the scene, like `loadingAnimalId`, so the panel can point at what is playing.
   */
  cyclingClipName: string | null;
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
  /** A base clip's button: focuses it, or clears the focus when it is already focused. */
  toggleClip: (clipName: string) => void;
  /**
   * An emotion button: focuses the emotion at the remembered part when it is phased, or
   * clears the focus when any part of that emotion is already focused.
   */
  toggleEmotion: (emotion: string) => void;
  /** The part switch: remembers the part and re-resolves the current emotion under it. */
  setPart: (part: EmotionPart) => void;
  setLoadingAnimal: (animalId: AnimalSpriteId | null) => void;
  setCyclingClip: (clipName: string | null) => void;
  /** Leaves the gallery on its opening state, so re-entering never resumes mid-review. */
  resetGallery: () => void;
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
 * donkey to the fox drops the focus and lets the fox cycle through its own clips. No focus
 * stays no focus.
 */
export function carryClipOver(
  animalId: AnimalSpriteId,
  clipName: string | null,
  part: EmotionPart,
): string | null {
  if (!clipName) return null;
  const clips = animalClips(animalId);
  const emotion = clipEmotion(clipName);
  if (isEmotionName(emotion)) return emotionClipName(clips, emotion, part);
  return clips.some((clip) => clip.name === clipName) ? clipName : null;
}

export const useAnimalGalleryStore = create<AnimalGalleryStore>((set) => ({
  animalId: FIRST_ANIMAL,
  clipName: null,
  cyclingClipName: null,
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

  toggleClip: (clipName) =>
    set((s) => ({ ...s, clipName: s.clipName === clipName ? null : clipName })),

  toggleEmotion: (emotion) =>
    set((s) => {
      const focused = s.clipName !== null && clipEmotion(s.clipName) === emotion;
      return {
        ...s,
        clipName: focused ? null : emotionClipName(animalClips(s.animalId), emotion, s.part),
      };
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

  setCyclingClip: (cyclingClipName) =>
    set((s) => (s.cyclingClipName === cyclingClipName ? s : { ...s, cyclingClipName })),

  resetGallery: () =>
    set({
      animalId: FIRST_ANIMAL,
      clipName: null,
      cyclingClipName: null,
      part: DEFAULT_PART,
      loadingAnimalId: null,
    }),
}));
