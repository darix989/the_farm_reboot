/**
 * Developer-facing UI prefs that must survive a reload and must *not* ride on
 * `progressStore`. Reset Progress wipes player save data; a skip-dialog toggle
 * used to author talks should still be there afterwards.
 *
 * Persisted to `localStorage` under `the-farm-dev-settings`. Dev Mode is
 * deliberately off in every build, so a player never lands on authoring
 * shortcuts by accident. Existing authoring preferences keep their old
 * development-build defaults once Dev Mode is enabled.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const DEFAULT_SHOW_FARM_TALK_SKIP = import.meta.env.DEV;

interface DevSettingsStore {
  /** Reveals the authoring launcher and related shortcuts. Off by default. */
  devMode: boolean;
  setDevMode: (value: boolean) => void;
  toggleDevMode: () => void;
  /** When true, farm talks show a fourth action-row button that jumps to the last beat. */
  showFarmTalkSkip: boolean;
  setShowFarmTalkSkip: (value: boolean) => void;
  toggleFarmTalkSkip: () => void;
}

export const useDevSettingsStore = create<DevSettingsStore>()(
  persist(
    (set) => ({
      devMode: false,
      setDevMode: (value) => set({ devMode: value }),
      toggleDevMode: () => set((s) => ({ devMode: !s.devMode })),
      showFarmTalkSkip: DEFAULT_SHOW_FARM_TALK_SKIP,
      setShowFarmTalkSkip: (value) => set({ showFarmTalkSkip: value }),
      toggleFarmTalkSkip: () => set((s) => ({ showFarmTalkSkip: !s.showFarmTalkSkip })),
    }),
    {
      name: 'the-farm-dev-settings',
      version: 1,
      merge: (persisted, current) => {
        const saved = persisted as Partial<DevSettingsStore> | undefined;
        return {
          ...current,
          devMode: typeof saved?.devMode === 'boolean' ? saved.devMode : current.devMode,
          showFarmTalkSkip:
            typeof saved?.showFarmTalkSkip === 'boolean'
              ? saved.showFarmTalkSkip
              : current.showFarmTalkSkip,
        };
      },
    },
  ),
);
