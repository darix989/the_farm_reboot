import { create } from 'zustand';

/**
 * Whether Shift is currently held for the shortcut-reveal overlay.
 *
 * Session-scoped and unpersisted: a held-key flag must never survive a reload.
 * Modelled on `codexUiStore` — a Zustand store rather than context (no selectors
 * there) or a module emitter (that would be a hand-rolled `useSyncExternalStore`).
 */
interface ShortcutRevealStore {
  isRevealed: boolean;
  setRevealed: (isRevealed: boolean) => void;
}

export const useShortcutRevealStore = create<ShortcutRevealStore>((set) => ({
  isRevealed: false,
  setRevealed: (isRevealed) => set((s) => (s.isRevealed === isRevealed ? s : { isRevealed })),
}));
