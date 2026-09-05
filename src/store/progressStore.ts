import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEBATES, type DebateScenarioKey } from '../data/levels';

/**
 * Which encounters the player has finished.
 *
 * Needed even for a single sitting: Cass and Bram each own two encounters, so an
 * animal has to know which one to offer next. Persisted to `localStorage` so it
 * survives a reload.
 *
 * This is the repo's first use of zustand's `persist` middleware.
 */
interface ProgressStore {
  completedScenarios: DebateScenarioKey[];
  markCompleted: (key: DebateScenarioKey) => void;
  isCompleted: (key: DebateScenarioKey) => boolean;
  /** First scenario in `keys` not yet completed, or null when the animal is done. */
  nextScenarioFor: (keys: readonly DebateScenarioKey[]) => DebateScenarioKey | null;
  resetProgress: () => void;
}

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set, get) => ({
      completedScenarios: [],

      markCompleted: (key) =>
        set((s) =>
          s.completedScenarios.includes(key)
            ? s
            : { ...s, completedScenarios: [...s.completedScenarios, key] },
        ),

      isCompleted: (key) => get().completedScenarios.includes(key),

      nextScenarioFor: (keys) => keys.find((k) => !get().isCompleted(k)) ?? null,

      resetProgress: () => set({ completedScenarios: [] }),
    }),
    {
      name: 'the-farm-progress',
      version: 1,
      /**
       * Saved data outlives the code that wrote it. A stale entry naming a scenario
       * that no longer exists must not break the farm, so anything unrecognised is
       * dropped on load rather than trusted.
       */
      merge: (persisted, current) => {
        const saved = (persisted as Partial<ProgressStore> | undefined)?.completedScenarios;
        const clean = Array.isArray(saved)
          ? saved.filter((k): k is DebateScenarioKey => typeof k === 'string' && k in DEBATES)
          : [];
        return { ...current, completedScenarios: clean };
      },
    },
  ),
);
