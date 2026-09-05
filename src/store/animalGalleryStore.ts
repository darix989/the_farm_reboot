/**
 * Handoff between the animation gallery's React controls and its Phaser scene.
 *
 * Same shape and the same reasoning as `trialStageStore`: React owns the buttons, Phaser owns
 * the sprite, and they meet at a store rather than an `EventBus` because `AnimalGallery.create()`
 * runs before `AnimalGalleryUI` mounts and needs a current value to read synchronously — an
 * event has no replay.
 */
import { create } from 'zustand';
import { defaultClip } from '../phaser/animals/animalClipCatalogue';
import { ANIMAL_SPRITE_IDS } from '../phaser/animals/animalDescriptors';
import type { AnimalSpriteId } from '../data/characters';

const FIRST_ANIMAL = ANIMAL_SPRITE_IDS[0]!;

interface AnimalGalleryStore {
  animalId: AnimalSpriteId;
  /** Logical clip name from `animalClips()`, or null for the bare rest frame. */
  clipName: string | null;
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

  /** Switching animal resets the clip to that animal's rest pose — clip names are per-animal. */
  setAnimal: (animalId: AnimalSpriteId) => void;
  setClip: (clipName: string | null) => void;
  setSmoothTransitions: (smooth: boolean) => void;
  /** Leaves the gallery on its opening state, so re-entering never resumes mid-review. */
  resetGallery: () => void;
}

function openingClip(animalId: AnimalSpriteId): string | null {
  return defaultClip(animalId)?.name ?? null;
}

export const useAnimalGalleryStore = create<AnimalGalleryStore>((set) => ({
  animalId: FIRST_ANIMAL,
  clipName: openingClip(FIRST_ANIMAL),
  smoothTransitions: true,

  setAnimal: (animalId) =>
    set((s) => (s.animalId === animalId ? s : { ...s, animalId, clipName: openingClip(animalId) })),

  // No-op when unchanged, so a re-render never restarts a clip that is already playing.
  setClip: (clipName) => set((s) => (s.clipName === clipName ? s : { ...s, clipName })),

  setSmoothTransitions: (smoothTransitions) => set({ smoothTransitions }),

  resetGallery: () =>
    set({ animalId: FIRST_ANIMAL, clipName: openingClip(FIRST_ANIMAL), smoothTransitions: true }),
}));
