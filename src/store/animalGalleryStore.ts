/**
 * Handoff between the animation gallery's React controls and its Phaser scene.
 *
 * Same shape and the same reasoning as `trialStageStore`: React owns the buttons, Phaser owns
 * the sprite, and they meet at a store rather than an `EventBus` because `AnimalGallery.create()`
 * runs before `AnimalGalleryUI` mounts and needs a current value to read synchronously — an
 * event has no replay.
 */
import { create } from 'zustand';
import { animalClips, defaultClip } from '../phaser/animals/animalClipCatalogue';
import { ANIMAL_SPRITE_IDS } from '../phaser/animals/animalDescriptors';
import type { AnimalEmotion } from '../phaser/animals/animalEmotions';
import type { AnimalSpriteId } from '../data/characters';

const FIRST_ANIMAL = ANIMAL_SPRITE_IDS[0]!;

interface AnimalGalleryStore {
  animalId: AnimalSpriteId;
  /** Logical clip name from `animalClips()`, or null for the bare rest frame. */
  clipName: string | null;
  /**
   * Which dialogue portrait to blow up on the stage, or null for none.
   *
   * A second, independent selection rather than another value of `clipName`, because the two
   * registers are two answers to the same question: a portrait is cut from the body clip of
   * the same name, so you review them side by side. Sharing one field would make looking at
   * `fox/angry`'s portrait stop the body clip it was cut from.
   *
   * Null by default. The scene never reads this field, and it is not in the diff `AnimalGallery`
   * acts on, so writing it cannot disturb the sprite.
   */
  faceEmotion: AnimalEmotion | null;
  /**
   * Crossfade through transparent when switching clip, instead of cutting.
   *
   * On by default because a cut between an atlas clip and a generated one also cuts between
   * two different canvases — the sprite's scale and origin change on the same frame (see
   * `EmotionSheet.scale`), which reads as a pop. The fade hides it. Turning this off is how
   * you check whether a switch that looks fine actually *is* fine, so it has to be a toggle
   * rather than a fixed choice.
   */
  smoothTransitions: boolean;

  /** Switching animal carries the current clip over where it exists — see `carryClipOver`. */
  setAnimal: (animalId: AnimalSpriteId) => void;
  setClip: (clipName: string | null) => void;
  /** Selecting the emotion already showing clears it — the preview is a toggle. */
  setFaceEmotion: (emotion: AnimalEmotion | null) => void;
  setSmoothTransitions: (smooth: boolean) => void;
  /** Leaves the gallery on its opening state, so re-entering never resumes mid-review. */
  resetGallery: () => void;
}

function openingClip(animalId: AnimalSpriteId): string | null {
  return defaultClip(animalId)?.name ?? null;
}

/**
 * The clip to show after switching animal: the one already selected if the new animal has a
 * clip by that name, otherwise its rest pose.
 *
 * Carrying the selection over is the whole point of putting the cast in one screen — the
 * question a reviewer actually has is "how does *this* emotion read on each animal", and
 * resetting to idle on every switch makes them re-click it six times to find out.
 *
 * Emotion names exist for every animal (`animalClips` lists the whole `ANIMAL_EMOTIONS`
 * vocabulary, flagging the ones with no art yet), so an emotion selection is sticky right
 * across the cast and lands on the "no art yet" state where the art is missing — the same
 * thing selecting it directly does. Base animations are per-animal, so carrying `buck` from
 * the donkey to the fox falls back to the fox's rest pose rather than showing nothing.
 */
function carryClipOver(animalId: AnimalSpriteId, clipName: string | null): string | null {
  if (!clipName) return openingClip(animalId);
  const carried = animalClips(animalId).some((clip) => clip.name === clipName);
  return carried ? clipName : openingClip(animalId);
}

export const useAnimalGalleryStore = create<AnimalGalleryStore>((set) => ({
  animalId: FIRST_ANIMAL,
  clipName: openingClip(FIRST_ANIMAL),
  faceEmotion: null,
  smoothTransitions: true,

  // `faceEmotion` rides across untouched, for the reason `carryClipOver` gives: emotion names
  // exist for every animal, so the selection stays put the whole way round the cast and lands
  // on "no portrait yet" where none was cropped — which is the comparison you came for.
  setAnimal: (animalId) =>
    set((s) =>
      s.animalId === animalId
        ? s
        : { ...s, animalId, clipName: carryClipOver(animalId, s.clipName) },
    ),

  // No-op when unchanged, so a re-render never restarts a clip that is already playing.
  setClip: (clipName) => set((s) => (s.clipName === clipName ? s : { ...s, clipName })),

  setFaceEmotion: (emotion) =>
    set((s) => ({ ...s, faceEmotion: s.faceEmotion === emotion ? null : emotion })),

  setSmoothTransitions: (smoothTransitions) => set({ smoothTransitions }),

  resetGallery: () =>
    set({
      animalId: FIRST_ANIMAL,
      clipName: openingClip(FIRST_ANIMAL),
      faceEmotion: null,
      smoothTransitions: true,
    }),
}));
