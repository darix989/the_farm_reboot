import { create } from 'zustand';

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
  setActiveSpeaker: (id: string | null) => void;
  /** Clears the speaker, so a fresh Trial entry never opens on a stale reaction. */
  resetStage: () => void;
}

export const useTrialStageStore = create<TrialStageStore>((set) => ({
  activeSpeakerId: null,

  // No-op when unchanged (mirrors `farmStore.setNearbyNpc`), so a TrialUI re-render never
  // restarts an animation that is already correct.
  setActiveSpeaker: (id) =>
    set((s) => (s.activeSpeakerId === id ? s : { ...s, activeSpeakerId: id })),

  resetStage: () => set({ activeSpeakerId: null }),
}));
