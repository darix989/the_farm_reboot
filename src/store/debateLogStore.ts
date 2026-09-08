import { create } from 'zustand';

/**
 * Whether the Trial screen's Debate Log is expanded (the full panel over the right 3fr of
 * the stage) or collapsed to its recap chip in the top-right corner.
 *
 * A store rather than `useState` in `TrialUI` because the tutorial layer has to expand the
 * log **synchronously, before the overlay renders**: `TutorialOverlay` resolves a step's
 * highlight target exactly once per step and gives up when the element is absent (no retry,
 * no observer). Setting React state from an effect would mount the panel one commit too
 * late, and every debate-log tutorial step would silently lose its spotlight. Same reasoning
 * as `trialStageStore` — a store has a current value callers outside React can set and read
 * synchronously.
 *
 * Collapsed is the default: a debate opens on the full-width cast, and the player expands
 * the log when they want it.
 */
interface DebateLogStore {
  isExpanded: boolean;
  setExpanded: (next: boolean) => void;
  toggleExpanded: () => void;
  /** Called when `TrialUI` (re)mounts, so a fresh encounter never inherits an open log. */
  resetDebateLog: () => void;
}

export const useDebateLogStore = create<DebateLogStore>((set) => ({
  isExpanded: false,

  // No-op when unchanged, so a repeated `setExpanded(true)` from consecutive tutorial
  // steps does not re-render the whole Trial overlay.
  setExpanded: (next) => set((s) => (s.isExpanded === next ? s : { ...s, isExpanded: next })),

  toggleExpanded: () => set((s) => ({ ...s, isExpanded: !s.isExpanded })),

  resetDebateLog: () => set({ isExpanded: false }),
}));
