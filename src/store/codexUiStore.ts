import { create } from 'zustand';

/**
 * Whether the Field Notes overlay is open, and which section it is showing.
 *
 * Kept apart from `codexStore` on purpose: that store is `persist`ed, and reloading the game
 * into an open panel is not state worth restoring. Splitting the two is cheaper than teaching
 * the persisted store to `partialize` a UI flag out of every write.
 *
 * The overlay is not a Phaser scene — it mounts globally from `ReactApp`, next to
 * `TutorialOverlay` — so it can open over the main menu and over the farm without a scene
 * switch, which would otherwise tear down the overworld just to read a list.
 */
export type CodexSection = 'next' | 'known' | 'spotted' | 'dialogs';

interface CodexUiStore {
  isOpen: boolean;
  section: CodexSection;
  /**
   * Unread notice ids whose farm-HUD burst has already played this session.
   * Not persisted: a reload may pulse once more, the lingering cue is what survives.
   */
  animatedNoticeIds: string[];
  openCodex: (section?: CodexSection) => void;
  closeCodex: () => void;
  setSection: (section: CodexSection) => void;
  markNoticesAnimated: (ids: readonly string[]) => void;
  resetAnimatedNotices: () => void;
}

export const useCodexUiStore = create<CodexUiStore>((set) => ({
  isOpen: false,
  section: 'next',
  animatedNoticeIds: [],

  openCodex: (section) => set((s) => ({ isOpen: true, section: section ?? s.section })),
  closeCodex: () => set({ isOpen: false }),
  setSection: (section) => set({ section }),
  markNoticesAnimated: (ids) =>
    set((s) => {
      let changed = false;
      const next = [...s.animatedNoticeIds];
      for (const id of ids) {
        if (next.includes(id)) continue;
        next.push(id);
        changed = true;
      }
      return changed ? { animatedNoticeIds: next } : s;
    }),
  resetAnimatedNotices: () => set({ animatedNoticeIds: [] }),
}));
