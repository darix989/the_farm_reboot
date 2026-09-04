import { create } from 'zustand';
import type { AnimalEmotion } from '../phaser/animals/animalEmotions';

/**
 * Handoff between the Trial React UI and the Phaser `Trial` scene's animated cast.
 *
 * React knows who is currently speaking (`activeSpeakerIdForWorkflow`, driven by the round
 * workflow); Phaser owns the sprites that need to react to it. Mirrors how `farmStore`
 * already bridges the Farm scene and its dialogue UI — see `docs/farm_overworld.md`:
 * "Phaser owns simulation. React owns UI. They meet at a zustand store, never directly."
 *
 * A store rather than an `EventBus` event: `Trial.create()` runs before `TrialUI` mounts
 * (React only learns the scene exists from the `current-scene-ready` EventBus emit at the
 * end of `create()`), and an event has no replay — the scene would have nothing to read at
 * build time. A store has a current value it can read synchronously in `create()`.
 */
interface TrialStageStore {
  /** Speaker id from `activeSpeakerIdForWorkflow`, or null (intro / recap / complete). */
  activeSpeakerId: string | null;
  /**
   * How that speaker is delivering the line, from `activeEmotionForWorkflow`. Null when
   * nobody holds the floor, or when the emotion could not be derived — the scene then plays
   * its generic reaction, which is what it did before emotions existed.
   */
  activeEmotion: AnimalEmotion | null;
  /**
   * One setter for both fields, deliberately: they are derived from the same workflow
   * snapshot, and two setters would let a render land the new speaker with the previous
   * line's emotion for a frame — a wolf that snarls someone else's line.
   */
  setActiveSpeaker: (id: string | null, emotion: AnimalEmotion | null) => void;
  /** Clears the speaker, so a fresh Trial entry never opens on a stale reaction. */
  resetStage: () => void;
}

export const useTrialStageStore = create<TrialStageStore>((set) => ({
  activeSpeakerId: null,
  activeEmotion: null,

  // No-op when unchanged (mirrors `farmStore.setNearbyNpc`), so a TrialUI re-render never
  // restarts an animation that is already correct.
  setActiveSpeaker: (id, emotion) =>
    set((s) =>
      s.activeSpeakerId === id && s.activeEmotion === emotion
        ? s
        : { ...s, activeSpeakerId: id, activeEmotion: emotion },
    ),

  resetStage: () => set({ activeSpeakerId: null, activeEmotion: null }),
}));
