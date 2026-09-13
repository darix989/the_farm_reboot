import { beforeEach, describe, expect, it } from 'vitest';
import { DEBATES } from '../data/levels';
import { useCodexStore } from '../store/codexStore';
import { useProgressStore } from '../store/progressStore';
import { shouldQueueFollowUp } from './encounterRewards';

describe('shouldQueueFollowUp', () => {
  beforeEach(() => {
    useProgressStore.getState().resetProgress();
    useCodexStore.getState().resetCodex();
  });

  it('queues a farm follow-up when leaving a Trial back to Farm or FarmSide', () => {
    const key = '030_bram_teaches_dialog';
    const scenario = DEBATES[key];
    expect(shouldQueueFollowUp(key, scenario, 'Farm')).toBe(true);
    expect(shouldQueueFollowUp(key, scenario, 'FarmSide')).toBe(true);
  });

  it('does not queue when the Trial was launched from the menu', () => {
    const key = '030_bram_teaches_dialog';
    const scenario = DEBATES[key];
    expect(shouldQueueFollowUp(key, scenario, 'MainMenu')).toBe(false);
  });
});
