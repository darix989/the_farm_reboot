/**
 * Opens farm overlay tutorials declared in `src/data/farmTutorials.ts`.
 *
 * Unlike `useScenarioTutorials` (debate bus), these fire when `GameCondition`s
 * become met on the farm: no talk open, overlay not already showing, and the
 * entry is not in `progressStore.completedTutorials`. Completing the overlay
 * writes that id so a reload does not replay it.
 *
 * A pending Trial follow-up wins: a `farm_talk` pointer must open first, and a
 * `tutorial` follow-up is opened here so its `onComplete` can write deferred dialog flags.
 */

import { useEffect } from 'react';
import { farmTutorialById, FARM_TUTORIALS } from '../../data/farmTutorials';
import { DEBATES } from '../../data/levels';
import { useFarmStore } from '../../store/farmStore';
import { useProgressStore } from '../../store/progressStore';
import { useTutorialStore } from '../../store/tutorialStore';
import { applyEncounterDialogFlags } from '../../utils/encounterRewards';
import { areConditionsMet } from '../../utils/gameConditions';
import { useConditionContext } from './useGameConditions';

export function useFarmTutorials(): void {
  const talkingToNpcId = useFarmStore((s) => s.talkingToNpcId);
  const pendingFollowUp = useFarmStore((s) => s.pendingFollowUp);
  const completedTutorials = useProgressStore((s) => s.completedTutorials);
  const ctx = useConditionContext();

  useEffect(() => {
    if (talkingToNpcId) return;

    const tutorialStore = useTutorialStore.getState();
    if (tutorialStore.isOpen) return;

    if (pendingFollowUp?.kind === 'farm_talk') return;

    if (pendingFollowUp?.kind === 'tutorial') {
      const entry = farmTutorialById(pendingFollowUp.tutorialId);
      if (!entry) {
        const scenario = DEBATES[pendingFollowUp.scenarioKey];
        if (scenario) applyEncounterDialogFlags(scenario);
        useFarmStore.getState().setPendingFollowUp(null);
        return;
      }
      tutorialStore.openTutorial({
        id: entry.id,
        steps: entry.tutorial.steps,
        onComplete: () => {
          const scenario = DEBATES[pendingFollowUp.scenarioKey];
          if (scenario) applyEncounterDialogFlags(scenario);
          useProgressStore.getState().markTutorialCompleted(entry.id);
          useFarmStore.getState().setPendingFollowUp(null);
        },
      });
      return;
    }

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
  }, [talkingToNpcId, pendingFollowUp, completedTutorials, ctx]);
}
