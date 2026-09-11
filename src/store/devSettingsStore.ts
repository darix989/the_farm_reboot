/**
 * Developer-facing UI prefs that must survive a reload and must *not* ride on
 * `progressStore`. Reset Progress wipes player save data; a skip-dialog toggle
 * used to author talks should still be there afterwards.
 *
 * Persisted to `localStorage` under `the-farm-dev-settings`. The skip button
 * defaults on in `npm run dev` and off in a production build; once the player
 * (or author) has toggled it, that choice wins.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const DEFAULT_SHOW_FARM_TALK_SKIP = import.meta.env.DEV;

interface DevSettingsStore {
  /** When true, farm talks show a fourth action-row button that jumps to the last beat. */
  showFarmTalkSkip: boolean;
  setShowFarmTalkSkip: (value: boolean) => void;
  toggleFarmTalkSkip: () => void;
}

export const useDevSettingsStore = create<DevSettingsStore>()(
  persist(
    (set) => ({
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
          showFarmTalkSkip:
            typeof saved?.showFarmTalkSkip === 'boolean'
              ? saved.showFarmTalkSkip
              : current.showFarmTalkSkip,
        };
      },
    },
  ),
);
