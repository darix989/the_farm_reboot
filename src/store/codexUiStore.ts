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
export type CodexSection = 'known' | 'spotted' | 'dialogs';

interface CodexUiStore {
  isOpen: boolean;
  section: CodexSection;
  openCodex: (section?: CodexSection) => void;
  closeCodex: () => void;
  setSection: (section: CodexSection) => void;
}

export const useCodexUiStore = create<CodexUiStore>((set) => ({
  isOpen: false,
  section: 'known',

  openCodex: (section) => set((s) => ({ isOpen: true, section: section ?? s.section })),
  closeCodex: () => set({ isOpen: false }),
  setSection: (section) => set({ section }),
}));
