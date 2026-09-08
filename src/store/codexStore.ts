import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LogicalFallacyId } from '../types/debateEntities';
import { isCatalogedFallacyId } from '../data/fallacyCatalog';
import { isDialogFlagId, type DialogFlagId } from '../data/dialogFlags';
import { DEBATES, type DebateScenarioKey } from '../data/levels';

/**
 * What the player has *learned*, as opposed to what they have *played*.
 *
 * `progressStore` answers "which encounters are finished", which is enough to pick an animal's
 * next conversation but says nothing about whether the player can name a fallacy or has seen a
 * particular thing happen. Gates need that, and so does the Codex, which is a readable view of
 * exactly this store. Persisted alongside `progressStore` under its own key so the two can
 * migrate independently.
 */

/**
 * One correctly tagged (sentence, fallacy) pair.
 *
 * Deliberately stores ids, not prose: the sentence text is resolved out of `DEBATES` at render
 * time. Saved data outlives the code that wrote it, and a copy of a line that has since been
 * rewritten is worse than no copy at all.
 */
export interface SpottedFallacy {
  fallacyId: LogicalFallacyId;
  scenarioKey: DebateScenarioKey;
  /** The analysis target the sentence belongs to (an `NpcRoundEntry.id` or a statement id). */
  statementId: string;
  sentenceId: string;
}

interface CodexStore {
  /** Fallacies the player can name. Starts empty — nothing is known until it is taught. */
  knownFallacies: LogicalFallacyId[];
  spottedFallacies: SpottedFallacy[];
  dialogFlags: DialogFlagId[];

  learnFallacy: (id: LogicalFallacyId) => void;
  /**
   * Records a correct tag, and marks the fallacy known.
   *
   * Spotting one in the wild is strictly more than being told it exists, so a player who has
   * done the harder thing should never be gated on the easier one — which is what would happen
   * if a tutorial that teaches by spotting forgot to also declare `teachesFallacies`.
   */
  recordSpottedFallacy: (entry: SpottedFallacy) => void;
  setDialogFlag: (id: DialogFlagId) => void;

  knowsFallacy: (id: LogicalFallacyId) => boolean;
  /** Scoped to one encounter when `scenarioKey` is given, anywhere in the game otherwise. */
  hasSpottedFallacy: (id: LogicalFallacyId, scenarioKey?: DebateScenarioKey) => boolean;
  hasDialogFlag: (id: DialogFlagId) => boolean;

  resetCodex: () => void;
}

function sameSpot(a: SpottedFallacy, b: SpottedFallacy): boolean {
  return (
    a.fallacyId === b.fallacyId &&
    a.scenarioKey === b.scenarioKey &&
    a.statementId === b.statementId &&
    a.sentenceId === b.sentenceId
  );
}

export const useCodexStore = create<CodexStore>()(
  persist(
    (set, get) => ({
      knownFallacies: [],
      spottedFallacies: [],
      dialogFlags: [],

      learnFallacy: (id) =>
        set((s) =>
          s.knownFallacies.includes(id) ? s : { ...s, knownFallacies: [...s.knownFallacies, id] },
        ),

      recordSpottedFallacy: (entry) =>
        set((s) => {
          const alreadySpotted = s.spottedFallacies.some((e) => sameSpot(e, entry));
          const alreadyKnown = s.knownFallacies.includes(entry.fallacyId);
          if (alreadySpotted && alreadyKnown) return s;
          return {
            ...s,
            spottedFallacies: alreadySpotted ? s.spottedFallacies : [...s.spottedFallacies, entry],
            knownFallacies: alreadyKnown
              ? s.knownFallacies
              : [...s.knownFallacies, entry.fallacyId],
          };
        }),

      setDialogFlag: (id) =>
        set((s) =>
          s.dialogFlags.includes(id) ? s : { ...s, dialogFlags: [...s.dialogFlags, id] },
        ),

      knowsFallacy: (id) => get().knownFallacies.includes(id),

      hasSpottedFallacy: (id, scenarioKey) =>
        get().spottedFallacies.some(
          (e) => e.fallacyId === id && (!scenarioKey || e.scenarioKey === scenarioKey),
        ),

      hasDialogFlag: (id) => get().dialogFlags.includes(id),

      resetCodex: () => set({ knownFallacies: [], spottedFallacies: [], dialogFlags: [] }),
    }),
    {
      name: 'the-farm-codex',
      version: 1,
      /**
       * Same contract as `progressStore`: a save naming a fallacy, encounter or flag that no
       * longer exists must not break the farm, so anything unrecognised is dropped rather than
       * trusted. A dropped entry can only ever *re-lock* content, never open it.
       */
      merge: (persisted, current) => {
        const saved = persisted as Partial<CodexStore> | undefined;

        const knownFallacies = (Array.isArray(saved?.knownFallacies) ? saved.knownFallacies : [])
          .filter(isCatalogedFallacyId)
          .filter((id, i, all) => all.indexOf(id) === i);

        const spottedFallacies = (
          Array.isArray(saved?.spottedFallacies) ? saved.spottedFallacies : []
        ).filter(
          (e): e is SpottedFallacy =>
            !!e &&
            typeof e === 'object' &&
            isCatalogedFallacyId((e as SpottedFallacy).fallacyId) &&
            typeof (e as SpottedFallacy).scenarioKey === 'string' &&
            (e as SpottedFallacy).scenarioKey in DEBATES &&
            typeof (e as SpottedFallacy).statementId === 'string' &&
            typeof (e as SpottedFallacy).sentenceId === 'string',
        );

        const dialogFlags = (Array.isArray(saved?.dialogFlags) ? saved.dialogFlags : [])
          .filter(isDialogFlagId)
          .filter((id, i, all) => all.indexOf(id) === i);

        return { ...current, knownFallacies, spottedFallacies, dialogFlags };
      },
    },
  ),
);
