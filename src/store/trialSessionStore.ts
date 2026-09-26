import { create } from 'zustand';
import { useCodexStore, type CodexProgressSnapshot } from './codexStore';

interface TrialSessionStore {
  snapshot: CodexProgressSnapshot | null;
  begin: () => void;
  complete: () => void;
  abandon: () => void;
}

/**
 * The debate UI is intentionally component-local, but a player can abandon it through the
 * global menu. Keep the persistent Codex baseline here so that exit can restore it.
 */
export const useTrialSessionStore = create<TrialSessionStore>((set, get) => ({
  snapshot: null,
  begin: () => set({ snapshot: useCodexStore.getState().snapshotProgress() }),
  complete: () => set({ snapshot: null }),
  abandon: () => {
    const snapshot = get().snapshot;
    if (snapshot) useCodexStore.getState().restoreProgress(snapshot);
    set({ snapshot: null });
  },
}));
