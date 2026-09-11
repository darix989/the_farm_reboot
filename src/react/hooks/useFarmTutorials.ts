/**
 * Opens farm overlay tutorials declared in `src/data/farmTutorials.ts`.
 *
 * Unlike `useScenarioTutorials` (debate bus), these fire when `GameCondition`s
 * become met on the farm: no talk open, overlay not already showing, and the
 * entry is not in `progressStore.completedTutorials`. Completing the overlay
 * writes that id so a reload does not replay it.
 */

import { useEffect } from 'react';
import { FARM_TUTORIALS } from '../../data/farmTutorials';
import { useFarmStore } from '../../store/farmStore';
import { useProgressStore } from '../../store/progressStore';
import { useTutorialStore } from '../../store/tutorialStore';
import { areConditionsMet } from '../../utils/gameConditions';
import { useConditionContext } from './useGameConditions';

export function useFarmTutorials(): void {
  const talkingToNpcId = useFarmStore((s) => s.talkingToNpcId);
  const completedTutorials = useProgressStore((s) => s.completedTutorials);
  const ctx = useConditionContext();

  useEffect(() => {
    if (talkingToNpcId) return;

    const tutorialStore = useTutorialStore.getState();
    if (tutorialStore.isOpen) return;

    for (const entry of FARM_TUTORIALS) {
      if (completedTutorials.includes(entry.id)) continue;
      if (!areConditionsMet(entry.triggerWhen, ctx)) continue;

      tutorialStore.openTutorial({
        id: entry.id,
        steps: entry.tutorial.steps,
        onComplete: () => useProgressStore.getState().markTutorialCompleted(entry.id),
      });
      return;
    }
  }, [talkingToNpcId, completedTutorials, ctx]);
}
