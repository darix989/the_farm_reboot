import { beforeEach, describe, expect, it } from 'vitest';
import { useProgressStore } from './progressStore';

describe('farm-side movement hint progress', () => {
  beforeEach(() => {
    useProgressStore.getState().resetProgress();
    useProgressStore.getState().restoreFarmSideMoveHint();
  });

  it('stays dismissed through a progress reset until a new game restores it', () => {
    useProgressStore.getState().dismissFarmSideMoveHint();
    expect(useProgressStore.getState().farmSideMoveHintDismissed).toBe(true);

    useProgressStore.getState().resetProgress();
    expect(useProgressStore.getState().farmSideMoveHintDismissed).toBe(true);

    useProgressStore.getState().restoreFarmSideMoveHint();
    expect(useProgressStore.getState().farmSideMoveHintDismissed).toBe(false);
  });
});
