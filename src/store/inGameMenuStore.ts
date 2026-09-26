import { create } from 'zustand';

export type InGameMenuView = 'closed' | 'menu' | 'exit_confirm';

interface InGameMenuStore {
  view: InGameMenuView;
  openMenu: () => void;
  showExitConfirmation: () => void;
  cancelExit: () => void;
  closeMenu: () => void;
}

/** Transient menu state. A reload always returns directly to the running scene. */
export const useInGameMenuStore = create<InGameMenuStore>((set) => ({
  view: 'closed',
  openMenu: () => set({ view: 'menu' }),
  showExitConfirmation: () => set({ view: 'exit_confirm' }),
  cancelExit: () => set({ view: 'menu' }),
  closeMenu: () => set({ view: 'closed' }),
}));
