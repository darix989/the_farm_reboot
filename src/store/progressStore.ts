import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEBATES, type DebateScenarioKey } from '../data/levels';
import { isFarmTutorialId, type FarmTutorialId } from '../data/farmTutorials';

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
  /** Farm overlay tutorials the player has finished. See `src/data/farmTutorials.ts`. */
  completedTutorials: FarmTutorialId[];
  /** True once the farm has opened the intro (or the player already had progress). */
  level1Started: boolean;
  markCompleted: (key: DebateScenarioKey) => void;
  markTutorialCompleted: (id: FarmTutorialId) => void;
  markLevel1Started: () => void;
  isCompleted: (key: DebateScenarioKey) => boolean;
  isTutorialCompleted: (id: FarmTutorialId) => boolean;
  /** First scenario in `keys` not yet completed, or null when the animal is done. */
  nextScenarioFor: (keys: readonly DebateScenarioKey[]) => DebateScenarioKey | null;
  resetProgress: () => void;
}

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set, get) => ({
      completedScenarios: [],
      completedTutorials: [],
      level1Started: false,

      markCompleted: (key) =>
        set((s) =>
          s.completedScenarios.includes(key)
            ? s
            : { ...s, completedScenarios: [...s.completedScenarios, key] },
        ),

      markTutorialCompleted: (id) =>
        set((s) =>
          s.completedTutorials.includes(id)
            ? s
            : { ...s, completedTutorials: [...s.completedTutorials, id] },
        ),

      markLevel1Started: () => set((s) => (s.level1Started ? s : { ...s, level1Started: true })),

      isCompleted: (key) => get().completedScenarios.includes(key),

      isTutorialCompleted: (id) => get().completedTutorials.includes(id),

      nextScenarioFor: (keys) => keys.find((k) => !get().isCompleted(k)) ?? null,

      resetProgress: () =>
        set({ completedScenarios: [], completedTutorials: [], level1Started: false }),
    }),
    {
      name: 'the-farm-progress',
      version: 7,
      /**
       * Saved data outlives the code that wrote it. A stale entry naming a scenario
       * that no longer exists must not break the farm, so anything unrecognised is
       * dropped on load rather than trusted.
       *
       * v1–v2 treated any completed encounter as "Level 1 started", which skipped Dot's
       * greeting for anyone who had already played. v3 only trusts the explicit flag.
       *
       * v4 is the Level 1 rewrite. Two scenario keys were renamed and a rung was inserted,
       * so `merge` would silently drop the renamed pair and leave a part-played save sitting
       * between rungs that no longer follow each other. The level is different content now;
       * the honest migration is to start it again.
       *
       * v5 is Bram's mechanics lessons and the feature-unlock on-ramp. The level now starts
       * with Dot then Bram, not Cass, so a part-played save sits between rungs that no
       * longer follow each other.
       *
       * v6 trims Level 1 from eleven rungs to eight: five encounters left the ladder, two
       * arrived, and every animal's offer order changed. Same reasoning again — a part-played
       * save is sitting in a sequence that no longer exists. Bump `codexStore` alongside this
       * one; the feature unlocks live over there.
       *
       * v7 adds `completedTutorials` for farm overlay tutorials. Existing v6 saves keep their
       * encounters; the new field starts empty so the Field Notes intro can still fire.
       */
      migrate: (persisted, fromVersion) => {
        const saved = (persisted ?? {}) as Record<string, unknown>;
        if (fromVersion < 6) {
          return {
            ...saved,
            completedScenarios: [],
            completedTutorials: [],
            level1Started: false,
          };
        }
        if (fromVersion < 7) {
          return { ...saved, completedTutorials: [] };
        }
        return saved;
      },
      merge: (persisted, current) => {
        const saved = persisted as Partial<ProgressStore> | undefined;
        const raw = saved?.completedScenarios;
        const clean = Array.isArray(raw)
          ? raw.filter((k): k is DebateScenarioKey => typeof k === 'string' && k in DEBATES)
          : [];
        const tutorials = Array.isArray(saved?.completedTutorials)
          ? saved.completedTutorials
              .filter(isFarmTutorialId)
              .filter((id, i, all) => all.indexOf(id) === i)
          : [];
        return {
          ...current,
          completedScenarios: clean,
          completedTutorials: tutorials,
          level1Started: saved?.level1Started === true,
        };
      },
    },
  ),
);
