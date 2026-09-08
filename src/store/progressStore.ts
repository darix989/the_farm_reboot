import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEBATES, type DebateScenarioKey } from '../data/levels';

/**
 * Which encounters the player has finished, and whether they have opened Level 1.
 *
 * Needed even for a single sitting: Cass and Bram each own two encounters, so an
 * animal has to know which one to offer next. `level1Started` is what stops Dot's
 * greeting from firing every time the farm loads. Persisted to `localStorage` so
 * both survive a reload.
 *
 * This is the repo's first use of zustand's `persist` middleware.
 */
interface ProgressStore {
  completedScenarios: DebateScenarioKey[];
  /** True once the farm has opened the intro (or the player already had progress). */
  level1Started: boolean;
  markCompleted: (key: DebateScenarioKey) => void;
  markLevel1Started: () => void;
  isCompleted: (key: DebateScenarioKey) => boolean;
  /** First scenario in `keys` not yet completed, or null when the animal is done. */
  nextScenarioFor: (keys: readonly DebateScenarioKey[]) => DebateScenarioKey | null;
  resetProgress: () => void;
}

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set, get) => ({
      completedScenarios: [],
      level1Started: false,

      markCompleted: (key) =>
        set((s) =>
          s.completedScenarios.includes(key)
            ? s
            : { ...s, completedScenarios: [...s.completedScenarios, key] },
        ),

      markLevel1Started: () => set((s) => (s.level1Started ? s : { ...s, level1Started: true })),

      isCompleted: (key) => get().completedScenarios.includes(key),

      nextScenarioFor: (keys) => keys.find((k) => !get().isCompleted(k)) ?? null,

      resetProgress: () => set({ completedScenarios: [], level1Started: false }),
    }),
    {
      name: 'the-farm-progress',
      version: 3,
      /**
       * Saved data outlives the code that wrote it. A stale entry naming a scenario
       * that no longer exists must not break the farm, so anything unrecognised is
       * dropped on load rather than trusted.
       *
       * v1–v2 treated any completed encounter as "Level 1 started", which skipped Dot's
       * greeting for anyone who had already played. v3 only trusts the explicit flag.
       */
      migrate: (persisted, fromVersion) => {
        const saved = (persisted ?? {}) as Record<string, unknown>;
        if (fromVersion < 3) {
          return { ...saved, level1Started: false };
        }
        return saved;
      },
      merge: (persisted, current) => {
        const saved = persisted as Partial<ProgressStore> | undefined;
        const raw = saved?.completedScenarios;
        const clean = Array.isArray(raw)
          ? raw.filter((k): k is DebateScenarioKey => typeof k === 'string' && k in DEBATES)
          : [];
        return {
          ...current,
          completedScenarios: clean,
          level1Started: saved?.level1Started === true,
        };
      },
    },
  ),
);
